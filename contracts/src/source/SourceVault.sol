// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SourceVault
 * @notice Source Chain Gateway deployed on Ethereum / Sepolia / Base.
 * @dev Emits deterministic cryptographic receipts for repayments, collateral pledges, and invoice settlements.
 * Receipts from this contract are submitted to Creditcoin's Block Prover Precompile (0x0FD2)
 * for trustless attestation without centralized oracles.
 */
contract SourceVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Structured event signatures verified by Attestcoin precompile on Creditcoin
    bytes32 public constant REPAYMENT_EVENT_SIG = keccak256("RepaymentLogged(address,uint256,address,uint256,uint256,bytes32)");
    bytes32 public constant COLLATERAL_EVENT_SIG = keccak256("CollateralPledged(address,address,uint256,uint256,uint256)");
    bytes32 public constant INVOICE_EVENT_SIG = keccak256("InvoiceSettled(address,address,uint256,address,uint256,uint256)");

    event RepaymentLogged(
        address indexed borrower,
        uint256 indexed loanId,
        address token,
        uint256 amount,
        uint256 timestamp,
        bytes32 metadataHash
    );

    event CollateralPledged(
        address indexed borrower,
        address indexed token,
        uint256 amount,
        uint256 timestamp,
        uint256 targetChainId
    );

    event InvoiceSettled(
        address indexed payer,
        address indexed vendor,
        uint256 indexed invoiceId,
        address token,
        uint256 amount,
        uint256 timestamp
    );

    mapping(address => bool) public supportedTokens;
    uint256 public totalRepaymentsVolume;
    uint256 public totalInvoicesSettled;

    constructor() Ownable(msg.sender) {}

    function setTokenSupport(address token, bool isSupported) external onlyOwner {
        supportedTokens[token] = isSupported;
    }

    /**
     * @notice Execute a repayment on the source chain.
     * @dev Generates an on-chain event receipt that the Attestcoin SDK uses to build Merkle proofs for Creditcoin.
     */
    function recordRepayment(
        uint256 loanId,
        address token,
        uint256 amount,
        bytes32 metadataHash
    ) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        if (supportedTokens[token]) {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        totalRepaymentsVolume += amount;

        emit RepaymentLogged(
            msg.sender,
            loanId,
            token,
            amount,
            block.timestamp,
            metadataHash
        );
    }

    /**
     * @notice Pledge collateral or settle an external invoice for cross-chain credit verification.
     */
    function settleInvoice(
        address vendor,
        uint256 invoiceId,
        address token,
        uint256 amount
    ) external nonReentrant {
        require(amount > 0, "Amount > 0");
        if (supportedTokens[token]) {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        totalInvoicesSettled += amount;

        emit InvoiceSettled(
            msg.sender,
            vendor,
            invoiceId,
            token,
            amount,
            block.timestamp
        );
    }

    /**
     * @notice Lock assets as source chain collateral.
     */
    function pledgeCollateral(
        address token,
        uint256 amount,
        uint256 targetCreditcoinChainId
    ) external nonReentrant {
        require(amount > 0, "Amount > 0");
        if (supportedTokens[token]) {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        emit CollateralPledged(
            msg.sender,
            token,
            amount,
            block.timestamp,
            targetCreditcoinChainId
        );
    }
}
