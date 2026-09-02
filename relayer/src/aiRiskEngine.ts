import { ethers } from "ethers";
import { CONFIG } from "./config";

const SENTINEL_ABI = [
  "function emitRiskTelemetry(address borrower, uint256 sourceChainId, uint256 healthFactorBps, string calldata riskMessage) external",
  "function executeAutonomousLiquidation(uint256 loanId, bytes32 proofRef, uint256 healthFactorBps) external",
  "function liquidationThresholdBps() external view returns (uint256)",
  "function authorizedAgents(address agent) external view returns (bool)",
  "event RiskSentinelAlert(address indexed borrower, uint256 indexed sourceChainId, uint256 healthFactorBps, string riskMessage)"
];

const LENDING_POOL_ABI = [
  "function loanCount() external view returns (uint256)",
  "function loans(uint256) external view returns (tuple(uint256 loanId, address borrower, address collateralToken, uint256 collateralAmount, address borrowToken, uint256 principalAmount, uint256 totalOwed, uint256 interestRateBps, uint256 borrowedAt, uint256 dueDate, uint8 tierAtBorrow, bool isSettled, bool isLiquidated))",
  "function reserves(address) external view returns (tuple(bool isSupported, uint256 totalSupplied, uint256 totalBorrowed, uint256 supplyRateBps, uint256 oraclePriceUSD))"
];

export interface PositionRiskReport {
  loanId: number;
  borrower: string;
  collateralUSD: number;
  debtUSD: number;
  healthFactor: number;
  riskStatus: "HEALTHY" | "WATCHLIST" | "CRITICAL" | "LIQUIDATABLE";
  aiConfidence: number;
}

export class AIRiskSentinelEngine {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private sentinelContract: ethers.Contract;
  private poolContract: ethers.Contract;
  private agentAuthorizedCache: boolean | null = null;

  constructor() {
    if (!CONFIG.RELAYER_PRIVATE_KEY) {
      throw new Error(
        "RELAYER_PRIVATE_KEY is not set. Copy relayer/.env.example to relayer/.env and configure it."
      );
    }
    this.provider = new ethers.JsonRpcProvider(CONFIG.CREDITCOIN_RPC);
    this.wallet = new ethers.Wallet(CONFIG.RELAYER_PRIVATE_KEY, this.provider);
    this.sentinelContract = new ethers.Contract(CONFIG.AI_SENTINEL_ADDRESS, SENTINEL_ABI, this.wallet);
    this.poolContract = new ethers.Contract(CONFIG.CREDITCOIN_POOL_ADDRESS, LENDING_POOL_ABI, this.wallet);
  }

  /**
   * Checks whether the relayer wallet is an authorized AI Sentinel agent.
   * Result is cached — authorization only changes via owner tx.
   */
  public async isAgentAuthorized(): Promise<boolean> {
    if (this.agentAuthorizedCache === null) {
      let authorized = false;
      try {
        authorized = await this.sentinelContract.authorizedAgents(this.wallet.address);
      } catch {
        authorized = false;
      }
      this.agentAuthorizedCache = authorized;
      if (!authorized) {
        console.warn(
          `[AI Sentinel] Wallet ${this.wallet.address} is NOT an authorized agent — running in monitor-only mode ` +
          `(no telemetry broadcasts or autonomous liquidations). Owner must call setAgentAuthorization first.`
        );
      }
    }
    return this.agentAuthorizedCache;
  }

  /**
   * Reads the live oracle price (18-dec USD) for a reserve asset from the lending pool.
   */
  private async getOraclePriceUSD(token: string): Promise<number> {
    const reserve = await this.poolContract.reserves(token);
    return Number(ethers.formatEther(reserve.oraclePriceUSD));
  }

  /**
   * AI Risk Evaluation Model: Computes multi-factor risk score.
   */
  public evaluatePositionRisk(
    collateralUSD: number,
    debtUSD: number,
    volatilityIndex: number = 0.25,
    tenureDays: number = 14
  ): { healthFactor: number; status: "HEALTHY" | "WATCHLIST" | "CRITICAL" | "LIQUIDATABLE"; confidence: number } {
    if (debtUSD <= 0) {
      return { healthFactor: 99.0, status: "HEALTHY", confidence: 0.99 };
    }

    // Base Health Factor = CollateralUSD / DebtUSD
    const rawHF = collateralUSD / debtUSD;

    // AI volatility-adjusted risk discount
    const volatilityDiscount = 1 - volatilityIndex * 0.15;
    const adjustedHF = rawHF * volatilityDiscount;

    let status: "HEALTHY" | "WATCHLIST" | "CRITICAL" | "LIQUIDATABLE" = "HEALTHY";
    if (adjustedHF < 1.02) {
      status = "LIQUIDATABLE";
    } else if (adjustedHF < 1.15) {
      status = "CRITICAL";
    } else if (adjustedHF < 1.30) {
      status = "WATCHLIST";
    }

    const confidence = Math.min(0.98, 0.85 + tenureDays * 0.005);

    return {
      healthFactor: parseFloat(adjustedHF.toFixed(3)),
      status,
      confidence: parseFloat(confidence.toFixed(2)),
    };
  }

  /**
   * Scans every active loan in xCredenceLendingPool, prices it against live oracle
   * reserves, and dispatches on-chain risk telemetry / autonomous liquidations for
   * at-risk borrowers (requires authorized-agent status).
   */
  public async scanAndProtect(): Promise<PositionRiskReport[]> {
    console.log("[AI Sentinel] Executing autonomous risk analysis across cross-chain positions...");

    const authorized = await this.isAgentAuthorized();
    const reports: PositionRiskReport[] = [];

    let loanCount = 0;
    try {
      loanCount = Number(await this.poolContract.loanCount());
    } catch (err: any) {
      console.error(`[AI Sentinel] Failed to read loan count from pool:`, err.message || err);
      return reports;
    }

    if (loanCount === 0) {
      console.log("[AI Sentinel] No loans originated yet — nothing to monitor.");
      return reports;
    }

    let thresholdBps = 10500n;
    try {
      thresholdBps = await this.sentinelContract.liquidationThresholdBps();
    } catch {
      // Fall back to protocol default (1.05 HF)
    }

    for (let i = 1; i <= loanCount; i++) {
      try {
        const loan = await this.poolContract.loans(i);
        if (loan.isSettled || loan.isLiquidated) continue;

        const [collPrice, borrowPrice] = await Promise.all([
          this.getOraclePriceUSD(loan.collateralToken),
          this.getOraclePriceUSD(loan.borrowToken),
        ]);

        const collateralUSD = Number(ethers.formatEther(loan.collateralAmount)) * collPrice;
        const debtUSD = Number(ethers.formatEther(loan.totalOwed)) * borrowPrice;
        const tenureDays = Math.max(
          0,
          Math.floor((Date.now() / 1000 - Number(loan.borrowedAt)) / 86400)
        );

        const { healthFactor, status, confidence } = this.evaluatePositionRisk(
          collateralUSD,
          debtUSD,
          CONFIG.VOLATILITY_INDEX,
          tenureDays
        );

        reports.push({
          loanId: Number(loan.loanId),
          borrower: loan.borrower,
          collateralUSD: parseFloat(collateralUSD.toFixed(2)),
          debtUSD: parseFloat(debtUSD.toFixed(2)),
          healthFactor,
          riskStatus: status,
          aiConfidence: confidence,
        });

        if (status === "HEALTHY") continue;
        if (!authorized) continue;

        const healthFactorBps = BigInt(Math.round(healthFactor * 10000));

        // Broadcast immutable risk telemetry through AIRiskSentinel
        const message =
          status === "LIQUIDATABLE"
            ? `AUTONOMOUS RISK ACTION: HF ${healthFactor} breached liquidation band (loan #${loan.loanId})`
            : `Volatility-adjusted margin warning: HF ${healthFactor} (${status}, loan #${loan.loanId})`;

        try {
          const tx = await this.sentinelContract.emitRiskTelemetry(
            loan.borrower,
            CONFIG.CREDITCOIN_CHAIN_ID,
            healthFactorBps,
            message
          );
          await tx.wait();
          console.log(`[AI Sentinel] ⚠️ Telemetry broadcast for loan #${loan.loanId} (tx ${tx.hash})`);
        } catch (err: any) {
          console.error(`[AI Sentinel] Telemetry broadcast failed for loan #${loan.loanId}:`, err.message || err);
        }

        // Autonomous liquidation — gated behind explicit config flag AND on-chain threshold
        if (
          status === "LIQUIDATABLE" &&
          CONFIG.AUTO_LIQUIDATE &&
          healthFactorBps < thresholdBps
        ) {
          const proofRef = ethers.solidityPackedKeccak256(
            ["uint256", "uint256"],
            [loan.loanId, Math.floor(Date.now() / 1000)]
          );
          try {
            const liqTx = await this.sentinelContract.executeAutonomousLiquidation(
              loan.loanId,
              proofRef,
              healthFactorBps
            );
            const receipt = await liqTx.wait();
            console.log(
              `[AI Sentinel] 🔥 Autonomous liquidation executed for loan #${loan.loanId} in block ${receipt.blockNumber}`
            );
          } catch (err: any) {
            console.error(`[AI Sentinel] Autonomous liquidation failed for loan #${loan.loanId}:`, err.message || err);
          }
        }
      } catch (err: any) {
        console.error(`[AI Sentinel] Error evaluating loan #${i}:`, err.message || err);
      }
    }

    const atRisk = reports.filter((r) => r.riskStatus !== "HEALTHY").length;
    console.log(`[AI Sentinel] Scan complete: ${reports.length} active position(s), ${atRisk} at risk.`);

    return reports;
  }

  public async startSentinelDaemon() {
    console.log("===============================================================");
    console.log("🤖 Credence Autonomous AI Risk Sentinel Agent Active");
    console.log("🧠 Model: Bayesian Multi-Chain Volatility & Liquidation Oracle");
    console.log("🛡️ Monitoring Chain: Creditcoin Testnet (102031)");
    console.log(`🏛️ Pool: ${CONFIG.CREDITCOIN_POOL_ADDRESS}`);
    console.log(`⚙️ Auto-Liquidation: ${CONFIG.AUTO_LIQUIDATE ? "ENABLED" : "disabled (monitor-only)"}`);
    console.log("===============================================================");

    await this.isAgentAuthorized();

    setInterval(async () => {
      await this.scanAndProtect().catch(console.error);
    }, CONFIG.RISK_EVAL_INTERVAL_MS);
  }
}

if (require.main === module) {
  const engine = new AIRiskSentinelEngine();
  engine.startSentinelDaemon().catch(console.error);
}
