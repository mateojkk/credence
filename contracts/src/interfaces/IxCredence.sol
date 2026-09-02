// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IxCredence
 * @notice Core data structures, enums, and interfaces for the xCredence protocol.
 */
interface IxCredence {
    enum CreditTier {
        UNVERIFIED, // 0: 50% max LTV (overcollateralized default)
        BRONZE,     // 1: 65% max LTV (basic repayment history verified)
        SILVER,     // 2: 75% max LTV (consistent cross-chain volume)
        GOLD,       // 3: 85% max LTV (high volume & multi-chain tenure)
        PLATINUM    // 4: 90% max LTV (elite credit standing, undercollateralized)
    }

    enum CrossChainActionType {
        DEPOSIT_COLLATERAL,
        LOAN_REPAYMENT,
        INVOICE_SETTLEMENT,
        HEALTH_ATTESTATION,
        LIQUIDATION_TRIGGER
    }

    struct AttestedCreditProfile {
        uint256 creditScore;        // FICO-like score: 300 to 850
        CreditTier tier;             // Active credit tier
        uint256 totalRepaidUSD;      // Total cumulative verified repayments in USD (18 decimals)
        uint256 successfulRepayments;// Count of verified on-time repayments
        uint256 lastAttestationTime; // Timestamp of latest proof verification
        uint256 defaultCount;        // Count of liquidations / missed obligations
        bool isBlacklisted;          // Fraud protection flag
    }

    struct CrossChainProofPayload {
        uint256 sourceChainId;
        uint256 blockNumber;
        bytes32 blockHash;
        bytes32 txHash;
        address borrower;
        CrossChainActionType actionType;
        uint256 amount;              // Amount involved (USD/Token 18 dec)
        uint256 timestamp;
        bytes rawProof;              // Cryptographic proof submitted to 0x0FD2
    }

    struct LoanPosition {
        uint256 loanId;
        address borrower;
        address collateralToken;
        uint256 collateralAmount;
        address borrowToken;
        uint256 principalAmount;
        uint256 totalOwed;           // Principal + accrued interest
        uint256 interestRateBps;     // Base rate minus credit score discount (e.g. 500 = 5%)
        uint256 borrowedAt;
        uint256 dueDate;
        CreditTier tierAtBorrow;
        bool isSettled;
        bool isLiquidated;
    }

    // Events
    event CrossChainProofVerified(
        bytes32 indexed txHash,
        uint256 indexed sourceChainId,
        address indexed borrower,
        CrossChainActionType actionType,
        uint256 amount,
        uint256 newCreditScore,
        CreditTier newTier
    );

    event CreditScoreUpdated(
        address indexed borrower,
        uint256 previousScore,
        uint256 newScore,
        CreditTier tier
    );

    event LoanOriginated(
        uint256 indexed loanId,
        address indexed borrower,
        address borrowToken,
        uint256 principalAmount,
        address collateralToken,
        uint256 collateralAmount,
        uint256 ltvBps,
        uint256 interestRateBps,
        uint256 dueDate
    );

    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amountRepaid,
        bool fullyRepaid
    );

    event PositionLiquidated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed liquidator,
        uint256 debtCovered,
        uint256 collateralSeized,
        bytes32 proofRef
    );

    event RiskSentinelAlert(
        address indexed borrower,
        uint256 indexed sourceChainId,
        uint256 healthFactorBps,
        string riskMessage
    );
}
