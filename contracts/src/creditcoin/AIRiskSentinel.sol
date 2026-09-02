// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IxCredence.sol";
import "./xCredenceHub.sol";
import "./xCredenceLendingPool.sol";

/**
 * @title AIRiskSentinel
 * @notice Autonomous AI Risk & Cross-Chain Liquidation Coordinator on Creditcoin.
 * @dev Ingests cryptographically attested health proofs and autonomous AI risk metrics
 * to trigger automated risk mitigations, dynamic margin adjustments, and liquidations.
 */
contract AIRiskSentinel is IxCredence, Ownable, ReentrancyGuard {
    xCredenceHub public creditHub;
    xCredenceLendingPool public lendingPool;

    // Authorized AI Sentinel agent nodes (e.g., decentralized offchain risk evaluators)
    mapping(address => bool) public authorizedAgents;

    // Minimum health factor before liquidation in basis points (10000 = 1.00 HF)
    uint256 public liquidationThresholdBps = 10500; // 1.05 HF

    // Anomaly tracking
    uint256 public totalAlertsDispatched;
    uint256 public totalAutomatedLiquidations;

    modifier onlyAuthorizedAgent() {
        require(authorizedAgents[msg.sender] || msg.sender == owner(), "Unauthorized AI Sentinel Agent");
        _;
    }

    constructor(address _hub, address _pool) Ownable(msg.sender) {
        creditHub = xCredenceHub(_hub);
        lendingPool = xCredenceLendingPool(_pool);
        authorizedAgents[msg.sender] = true;
    }

    function setAgentAuthorization(address agent, bool isAuthorized) external onlyOwner {
        authorizedAgents[agent] = isAuthorized;
    }

    function setLiquidationThreshold(uint256 thresholdBps) external onlyOwner {
        liquidationThresholdBps = thresholdBps;
    }

    /**
     * @notice Broadcasts an AI Sentinel risk telemetry alert across the network.
     */
    function emitRiskTelemetry(
        address borrower,
        uint256 sourceChainId,
        uint256 healthFactorBps,
        string calldata riskMessage
    ) external onlyAuthorizedAgent {
        totalAlertsDispatched++;
        emit RiskSentinelAlert(borrower, sourceChainId, healthFactorBps, riskMessage);
    }

    /**
     * @notice Autonomous AI execution of liquidation triggered by cross-chain risk proof.
     */
    function executeAutonomousLiquidation(
        uint256 loanId,
        bytes32 proofRef,
        uint256 healthFactorBps
    ) external onlyAuthorizedAgent nonReentrant {
        require(healthFactorBps < liquidationThresholdBps, "Health factor above liquidation threshold");

        totalAutomatedLiquidations++;

        // Execute liquidation on the lending pool
        lendingPool.liquidate(loanId, proofRef);
    }
}
