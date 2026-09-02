import { AttestcoinProofWorker } from "./proofWorker";
import { AIRiskSentinelEngine } from "./aiRiskEngine";

async function bootstrap() {
  console.log("==========================================================================");
  console.log("🌟 Credence Off-Chain Service Suite Bootstrapping...");
  console.log("==========================================================================");

  const proofWorker = new AttestcoinProofWorker();
  const sentinelEngine = new AIRiskSentinelEngine();

  await proofWorker.startDaemon();
  await sentinelEngine.startSentinelDaemon();

  console.log("✅ All Credence background daemons are live and operational.");
}

bootstrap().catch(console.error);
