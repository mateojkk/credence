// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IxCredence.sol";
import "./xCredenceHub.sol";

/**
 * @title xCredenceLendingPool
 * @notice Multi-Asset Lending & Undercollateralized Borrowing Pool on Creditcoin.
 * @dev Leverages dynamic LTV and interest rates computed by xCredenceHub based on Attestcoin cross-chain proofs.
 */
contract xCredenceLendingPool is IxCredence, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant SECONDS_PER_YEAR = 31536000;
    uint256 public constant BASE_BORROW_RATE_BPS = 800; // 8% base APR
    uint256 public constant LIQUIDATION_BONUS_BPS = 500; // 5% bonus to liquidator

    xCredenceHub public creditHub;
    address public aiRiskSentinel;

    struct ReserveData {
        bool isSupported;
        uint256 totalSupplied;
        uint256 totalBorrowed;
        uint256 supplyRateBps;
        uint256 oraclePriceUSD; // 18 decimals, e.g. 1 CTC = $0.50, 1 USDC = $1.00
    }

    mapping(address => ReserveData) public reserves;
    mapping(address => mapping(address => uint256)) public supplierBalances; // token => user => balance
    mapping(uint256 => LoanPosition) public loans;
    uint256 public loanCount;

    // Tracking active loans for a borrower
    mapping(address => uint256[]) public userLoanIds;

    modifier onlySentinelOrOwner() {
        require(msg.sender == aiRiskSentinel || msg.sender == owner(), "Caller not Sentinel or Owner");
        _;
    }

    constructor(address _hub) Ownable(msg.sender) {
        require(_hub != address(0), "Invalid hub address");
        creditHub = xCredenceHub(_hub);
    }

    function setAIRiskSentinel(address _sentinel) external onlyOwner {
        require(_sentinel != address(0), "Invalid sentinel");
        aiRiskSentinel = _sentinel;
    }

    function configureReserve(
        address token,
        bool isSupported,
        uint256 initialPriceUSD
    ) external onlyOwner {
        reserves[token] = ReserveData({
            isSupported: isSupported,
            totalSupplied: reserves[token].totalSupplied,
            totalBorrowed: reserves[token].totalBorrowed,
            supplyRateBps: 500, // 5% base APY
            oraclePriceUSD: initialPriceUSD
        });
    }

    function setOraclePrice(address token, uint256 priceUSD) external onlyOwner {
        require(reserves[token].isSupported, "Reserve not supported");
        reserves[token].oraclePriceUSD = priceUSD;
    }

    /**
     * @notice Supply liquidity to the pool and earn lending yield.
     */
    function supply(address token, uint256 amount) external nonReentrant {
        require(reserves[token].isSupported, "Unsupported token");
        require(amount > 0, "Amount must be > 0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        supplierBalances[token][msg.sender] += amount;
        reserves[token].totalSupplied += amount;
    }

    /**
     * @notice Withdraw supplied liquidity.
     */
    function withdraw(address token, uint256 amount) external nonReentrant {
        require(supplierBalances[token][msg.sender] >= amount, "Insufficient supplied balance");
        require(
            reserves[token].totalSupplied - reserves[token].totalBorrowed >= amount,
            "Insufficient pool liquidity"
        );

        supplierBalances[token][msg.sender] -= amount;
        reserves[token].totalSupplied -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Borrow liquidity against collateral with dynamic LTV based on Attested Credit Score.
     */
    function borrow(
        address collateralToken,
        uint256 collateralAmount,
        address borrowToken,
        uint256 borrowAmount,
        uint256 durationDays
    ) external nonReentrant returns (uint256 loanId) {
        require(reserves[collateralToken].isSupported, "Collateral not supported");
        require(reserves[borrowToken].isSupported, "Borrow token not supported");
        require(collateralAmount > 0 && borrowAmount > 0, "Zero amount");
        require(
            reserves[borrowToken].totalSupplied - reserves[borrowToken].totalBorrowed >= borrowAmount,
            "Insufficient liquidity in reserve"
        );

        // Fetch dynamic Max LTV from Creditcoin Hub based on verified Attestcoin history
        uint256 maxLTVBps = creditHub.getMaxLTVBps(msg.sender);
        uint256 discountBps = creditHub.getInterestDiscountBps(msg.sender);

        // Calculate USD values
        uint256 collateralValUSD = (collateralAmount * reserves[collateralToken].oraclePriceUSD) / 1e18;
        uint256 borrowValUSD = (borrowAmount * reserves[borrowToken].oraclePriceUSD) / 1e18;

        // Maximum allowed borrow USD = CollateralUSD * maxLTV / 10000
        uint256 maxBorrowUSD = (collateralValUSD * maxLTVBps) / BPS_DIVISOR;
        require(borrowValUSD <= maxBorrowUSD, "Requested borrow exceeds dynamic Attested LTV limit");

        // Lock collateral
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), collateralAmount);

        // Compute interest rate (Base rate - discount)
        uint256 effectiveRateBps = BASE_BORROW_RATE_BPS > discountBps ? BASE_BORROW_RATE_BPS - discountBps : 200; // minimum 2%

        loanId = ++loanCount;
        uint256 interest = (borrowAmount * effectiveRateBps * durationDays) / (BPS_DIVISOR * 365);
        uint256 totalOwed = borrowAmount + interest;

        loans[loanId] = LoanPosition({
            loanId: loanId,
            borrower: msg.sender,
            collateralToken: collateralToken,
            collateralAmount: collateralAmount,
            borrowToken: borrowToken,
            principalAmount: borrowAmount,
            totalOwed: totalOwed,
            interestRateBps: effectiveRateBps,
            borrowedAt: block.timestamp,
            dueDate: block.timestamp + (durationDays * 1 days),
            tierAtBorrow: creditHub.getCreditProfile(msg.sender).tier,
            isSettled: false,
            isLiquidated: false
        });

        userLoanIds[msg.sender].push(loanId);
        reserves[borrowToken].totalBorrowed += borrowAmount;

        // Disburse borrowed capital
        IERC20(borrowToken).safeTransfer(msg.sender, borrowAmount);

        uint256 currentLtvBps = (borrowValUSD * BPS_DIVISOR) / collateralValUSD;

        emit LoanOriginated(
            loanId,
            msg.sender,
            borrowToken,
            borrowAmount,
            collateralToken,
            collateralAmount,
            currentLtvBps,
            effectiveRateBps,
            loans[loanId].dueDate
        );

        return loanId;
    }

    /**
     * @notice Repay an outstanding loan on Creditcoin directly.
     */
    function repay(uint256 loanId, uint256 amount) external nonReentrant {
        LoanPosition storage loan = loans[loanId];
        require(!loan.isSettled && !loan.isLiquidated, "Loan inactive");
        require(amount > 0, "Repay amount must be > 0");

        IERC20(loan.borrowToken).safeTransferFrom(msg.sender, address(this), amount);

        if (amount >= loan.totalOwed) {
            uint256 returnCollateral = loan.collateralAmount;
            loan.totalOwed = 0;
            loan.isSettled = true;
            reserves[loan.borrowToken].totalBorrowed -= loan.principalAmount;

            // Release collateral back to borrower
            IERC20(loan.collateralToken).safeTransfer(loan.borrower, returnCollateral);

            emit LoanRepaid(loanId, loan.borrower, amount, true);
        } else {
            loan.totalOwed -= amount;
            emit LoanRepaid(loanId, loan.borrower, amount, false);
        }
    }

    /**
     * @notice Liquidate an undercollateralized or expired loan.
     */
    function liquidate(uint256 loanId, bytes32 proofRef) external nonReentrant {
        LoanPosition storage loan = loans[loanId];
        require(!loan.isSettled && !loan.isLiquidated, "Loan not active");

        // Health check
        uint256 collateralValUSD = (loan.collateralAmount * reserves[loan.collateralToken].oraclePriceUSD) / 1e18;
        uint256 debtValUSD = (loan.totalOwed * reserves[loan.borrowToken].oraclePriceUSD) / 1e18;

        bool isOverdue = block.timestamp > loan.dueDate;
        bool isUndercollateralized = collateralValUSD < debtValUSD;

        require(isOverdue || isUndercollateralized || msg.sender == aiRiskSentinel, "Position not liquidatable");

        loan.isLiquidated = true;
        loan.isSettled = true;

        // Liquidator covers debt
        IERC20(loan.borrowToken).safeTransferFrom(msg.sender, address(this), loan.totalOwed);
        reserves[loan.borrowToken].totalBorrowed -= loan.principalAmount;

        // Collateral transferred to liquidator
        uint256 collateralReward = loan.collateralAmount;
        IERC20(loan.collateralToken).safeTransfer(msg.sender, collateralReward);

        // Penalize credit profile in Creditcoin Hub
        creditHub.recordLiquidationPenalty(loan.borrower);

        emit PositionLiquidated(
            loanId,
            loan.borrower,
            msg.sender,
            loan.totalOwed,
            collateralReward,
            proofRef
        );
    }

    function getUserLoanIds(address user) external view returns (uint256[] memory) {
        return userLoanIds[user];
    }
}
