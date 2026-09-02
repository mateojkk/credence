// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IBlockProver.sol";
import "../interfaces/INativeQueryVerifier.sol";
import "../libraries/EvmV1Decoder.sol";
import "../interfaces/IChainInfo.sol";
import "../interfaces/IxCredence.sol";

/**
 * @title xCredenceHub
 * @notice Central Settlement & Verifiable Credit Scoring Hub on Creditcoin.
 * @dev Connects directly to Creditcoin's Block Prover Precompile (0x0FD2) to verify
 * cross-chain Merkle inclusion proofs without centralized oracles.
 */
contract xCredenceHub is IxCredence, Ownable, ReentrancyGuard {
    // Default native precompile addresses on Creditcoin
    address public constant DEFAULT_BLOCK_PROVER = address(0x0FD2);
    address public constant DEFAULT_CHAIN_INFO = address(0x0FD3);

    INativeQueryVerifier public blockProver;
    IChainInfo public chainInfo;

    /// @notice keccak256("RepaymentLogged(address,uint256,address,uint256,uint256,bytes32)")
    bytes32 public constant REPAYMENT_EVENT_SIG = 0xf3b02d61a97c8c0dccffdb7d1d7a0cedb07b7ec2312aa5df3cb76c11d7471f66;
    address public lendingPool;
    address public aiRiskSentinel;

    // Credit profile tracking per borrower
    mapping(address => AttestedCreditProfile) public creditProfiles;

    // Replay attack prevention: hash(sourceChainId, txHash) => isProcessed
    mapping(bytes32 => bool) public processedAttestations;

    // Supported source chains (e.g. Sepolia: 11155111, Ethereum: 1, Base: 8453)
    mapping(uint256 => bool) public supportedSourceChains;

    // Source vault contracts registered on external chains
    mapping(uint256 => mapping(address => bool)) public authorizedSourceVaults;

    // Statistics
    uint256 public totalVerifiedVolumeUSD;
    uint256 public totalProofsVerified;
    uint256 public totalProfilesCreated;

    modifier onlyLendingPoolOrSentinel() {
        require(
            msg.sender == lendingPool || msg.sender == aiRiskSentinel || msg.sender == owner(),
            "Unauthorized caller"
        );
        _;
    }

    constructor(address _customProver) Ownable(msg.sender) {
        if (_customProver != address(0)) {
            blockProver = INativeQueryVerifier(_customProver);
        } else {
            blockProver = INativeQueryVerifier(DEFAULT_BLOCK_PROVER);
        }
        chainInfo = IChainInfo(DEFAULT_CHAIN_INFO);

        // Pre-authorize standard EVM testnet & mainnet source chains
        supportedSourceChains[11155111] = true; // Sepolia
        supportedSourceChains[1] = true;        // Ethereum Mainnet
        supportedSourceChains[84532] = true;    // Base Sepolia
        supportedSourceChains[31337] = true;    // Local Hardhat
    }

    function setBlockProver(address _prover) external onlyOwner {
        require(_prover != address(0), "Invalid prover");
        blockProver = INativeQueryVerifier(_prover);
    }

    function setChainInfo(address _chainInfo) external onlyOwner {
        require(_chainInfo != address(0), "Invalid chainInfo");
        chainInfo = IChainInfo(_chainInfo);
    }

    function setLendingPool(address _lendingPool) external onlyOwner {
        require(_lendingPool != address(0), "Invalid pool");
        lendingPool = _lendingPool;
    }

    function setAIRiskSentinel(address _sentinel) external onlyOwner {
        require(_sentinel != address(0), "Invalid sentinel");
        aiRiskSentinel = _sentinel;
    }

    function setSourceChainSupport(uint256 chainId, bool isSupported) external onlyOwner {
        supportedSourceChains[chainId] = isSupported;
    }

    function setAuthorizedSourceVault(uint256 chainId, address vault, bool authorized) external onlyOwner {
        authorizedSourceVaults[chainId][vault] = authorized;
    }

    /**
     * @notice Fully trustless Attestcoin flow: verifies the source transaction
     *         natively, then extracts RepaymentLogged args from the proven bytes
     *         on-chain via EvmV1Decoder. No trusted relayer fields.
     */
    function verifyAndProcessCanonicalProof(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external nonReentrant returns (bool success) {
        // 1) Gate on precompile 0x0FD3: the source block must be attested now.
        IChainInfo.AttestationBounds memory bounds =
            chainInfo.get_attestation_bounds(chainKey, height);
        require(bounds.isAttested, "Source block not attested on Creditcoin");

        // 2) Native cryptographic verification via precompile 0x0FD2.
        bool verified =
            blockProver.verify(chainKey, height, encodedTransaction, merkleProof, continuityProof);
        require(verified, "Canonical verification failed");

        // 3) Replay protection per official ASC pattern: key = chainKey | height | txIndex.
        uint256 txIndex = _calculateTransactionIndex(merkleProof.siblings);
        bytes32 txKey;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, chainKey)
            mstore(add(ptr, 32), shl(192, height))
            mstore(add(ptr, 40), txIndex)
            txKey := keccak256(ptr, 72)
        }
        require(!processedAttestations[txKey], "Proof already processed");
        processedAttestations[txKey] = true;

        // 4) Trustless content validation: tx succeeded + carries RepaymentLogged.
        uint8 txType = EvmV1Decoder.getTransactionType(encodedTransaction);
        require(EvmV1Decoder.isValidTransactionType(txType), "Unsupported transaction type");

        EvmV1Decoder.ReceiptFields memory receipt =
            EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        require(receipt.receiptStatus == 1, "Source transaction did not succeed");

        EvmV1Decoder.LogEntry[] memory repaymentLogs =
            EvmV1Decoder.getLogsByEventSignature(receipt, REPAYMENT_EVENT_SIG);
        require(repaymentLogs.length > 0, "No RepaymentLogged event found");

        // topics: [sig, borrower (indexed), loanId (indexed)]
        // data:   (token, amount, timestamp, metadataHash)
        address borrower = address(uint160(uint256(repaymentLogs[0].topics[1])));
        (, uint256 amountUSD, , ) =
            abi.decode(repaymentLogs[0].data, (address, uint256, uint256, bytes32));
        require(borrower != address(0), "Invalid borrower in proven event");
        require(amountUSD > 0, "Invalid amount in proven event");

        // 5) Score update from proven facts only.
        _applyAttestationToProfile(borrower, CrossChainActionType.LOAN_REPAYMENT, amountUSD);
        totalVerifiedVolumeUSD += amountUSD;
        totalProofsVerified++;

        AttestedCreditProfile memory profile = creditProfiles[borrower];
        emit CrossChainProofVerified(
            txKey,
            chainKey,
            borrower,
            CrossChainActionType.LOAN_REPAYMENT,
            amountUSD,
            profile.creditScore,
            profile.tier
        );
        return true;
    }

    /// @notice Derives the tx tree index from Merkle sibling directions (official ASC pattern).
    function _calculateTransactionIndex(
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings
    ) internal pure returns (uint256 index) {
        for (uint256 i; i < siblings.length; ++i) {
            if (!siblings[i].isLeft) index |= 1 << i;
        }
    }

    /**
     * @notice Internal function to recalculate the Attested Credit Score (xCS).
     * @dev Algorithmic model factoring cumulative repayment volume, successful transaction count, and default penalties.
     */
    function _applyAttestationToProfile(
        address borrower,
        CrossChainActionType actionType,
        uint256 amountUSD
    ) internal {
        AttestedCreditProfile storage profile = creditProfiles[borrower];

        if (profile.creditScore == 0) {
            // Initial base score for new profile
            profile.creditScore = 500;
            profile.tier = CreditTier.UNVERIFIED;
            totalProfilesCreated++;
        }

        uint256 prevScore = profile.creditScore;

        if (actionType == CrossChainActionType.LOAN_REPAYMENT || actionType == CrossChainActionType.INVOICE_SETTLEMENT) {
            profile.totalRepaidUSD += amountUSD;
            profile.successfulRepayments += 1;
            profile.lastAttestationTime = block.timestamp;

            // Score escalation formula:
            // Base score (500) + Volume Factor + Frequency Factor - Default Penalty
            uint256 volumePoints = (profile.totalRepaidUSD / 1000 ether) * 15; // 15 pts per $1,000 repaid
            if (volumePoints > 200) volumePoints = 200;

            uint256 frequencyPoints = profile.successfulRepayments * 10; // 10 pts per successful tx
            if (frequencyPoints > 150) frequencyPoints = 150;

            uint256 penaltyPoints = profile.defaultCount * 120; // -120 pts per default

            uint256 calculatedScore = 500 + volumePoints + frequencyPoints;
            if (calculatedScore > penaltyPoints) {
                calculatedScore -= penaltyPoints;
            } else {
                calculatedScore = 300;
            }

            // Cap between 300 and 850 (FICO standard)
            if (calculatedScore > 850) calculatedScore = 850;
            if (calculatedScore < 300) calculatedScore = 300;

            profile.creditScore = calculatedScore;
        } else if (actionType == CrossChainActionType.LIQUIDATION_TRIGGER) {
            profile.defaultCount += 1;
            if (profile.creditScore > 120) {
                profile.creditScore -= 120;
            } else {
                profile.creditScore = 300;
            }
        }

        // Determine tier based on new score
        profile.tier = _calculateTier(profile.creditScore);

        emit CreditScoreUpdated(borrower, prevScore, profile.creditScore, profile.tier);
    }

    /**
     * @notice Computes tier and maximum allowed Loan-to-Value (LTV) in basis points.
     */
    function _calculateTier(uint256 score) internal pure returns (CreditTier) {
        if (score >= 780) return CreditTier.PLATINUM; // 90% LTV
        if (score >= 720) return CreditTier.GOLD;     // 85% LTV
        if (score >= 650) return CreditTier.SILVER;   // 75% LTV
        if (score >= 550) return CreditTier.BRONZE;   // 65% LTV
        return CreditTier.UNVERIFIED;                 // 50% LTV
    }

    /**
     * @notice Returns maximum LTV in basis points (10000 = 100%) for a borrower.
     */
    function getMaxLTVBps(address borrower) external view returns (uint256) {
        AttestedCreditProfile memory profile = creditProfiles[borrower];
        if (profile.isBlacklisted) return 0;

        CreditTier tier = profile.creditScore == 0 ? CreditTier.UNVERIFIED : profile.tier;

        if (tier == CreditTier.PLATINUM) return 9000; // 90%
        if (tier == CreditTier.GOLD)     return 8500; // 85%
        if (tier == CreditTier.SILVER)   return 7500; // 75%
        if (tier == CreditTier.BRONZE)   return 6500; // 65%
        return 5000;                                 // 50%
    }

    /**
     * @notice Returns the interest rate discount in basis points based on credit score.
     */
    function getInterestDiscountBps(address borrower) external view returns (uint256) {
        AttestedCreditProfile memory profile = creditProfiles[borrower];
        if (profile.creditScore >= 780) return 300; // 3% discount
        if (profile.creditScore >= 720) return 200; // 2% discount
        if (profile.creditScore >= 650) return 100; // 1% discount
        return 0;
    }

    function recordLiquidationPenalty(address borrower) external onlyLendingPoolOrSentinel {
        _applyAttestationToProfile(borrower, CrossChainActionType.LIQUIDATION_TRIGGER, 0);
    }

    function getCreditProfile(address borrower) external view returns (AttestedCreditProfile memory) {
        AttestedCreditProfile memory profile = creditProfiles[borrower];
        if (profile.creditScore == 0) {
            profile.creditScore = 500;
            profile.tier = CreditTier.UNVERIFIED;
        }
        return profile;
    }
}
