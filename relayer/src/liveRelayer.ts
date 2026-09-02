import { ethers } from "ethers";
import { CanonicalProofPipeline } from "./canonicalProofPipeline";
import { CONFIG } from "./config";

const HUB_ABI = [
  "function verifyAndProcessCanonicalProof(uint64 chainKey, uint64 height, bytes encodedTransaction, (bytes32,(bytes32,bool)[]) merkleProof, (bytes32,bytes32[]) continuityProof) external returns (bool)",
  "function getCreditProfile(address borrower) external view returns (tuple(uint256 creditScore, uint8 tier, uint256 totalRepaidUSD, uint256 successfulRepayments, uint256 lastAttestationTime, uint256 defaultCount, bool isBlacklisted))",
  "event CrossChainProofVerified(bytes32 indexed txHash, uint256 indexed sourceChainId, address indexed borrower, uint8 actionType, uint256 amount, uint256 newCreditScore, uint8 newTier)"
];

export async function runLiveRelayer() {
  if (!CONFIG.RELAYER_PRIVATE_KEY) {
    throw new Error(
      "RELAYER_PRIVATE_KEY is not set. Copy relayer/.env.example to relayer/.env and configure it."
    );
  }

  console.log("==========================================================================");
  console.log("🌐 Credence Canonical Relayer (Attestcoin OOB stack)");
  console.log(`📡 Sepolia Source RPC:     ${CONFIG.SEPOLIA_RPC}`);
  console.log(`📡 Creditcoin Target RPC:  ${CONFIG.CREDITCOIN_RPC}`);
  console.log(`🏛️ Creditcoin Hub:         ${CONFIG.CREDITCOIN_HUB_ADDRESS}`);
  console.log(`🛠️ Proof Builder API:      ${CONFIG.PROOF_GEN_API_URL}`);
  console.log("==========================================================================");

  const sepoliaProvider = new ethers.JsonRpcProvider(CONFIG.SEPOLIA_RPC);
  const creditcoinProvider = new ethers.JsonRpcProvider(CONFIG.CREDITCOIN_RPC);
  const relayerSigner = new ethers.Wallet(CONFIG.RELAYER_PRIVATE_KEY, creditcoinProvider);
  const hub = new ethers.Contract(CONFIG.CREDITCOIN_HUB_ADDRESS, HUB_ABI, relayerSigner);

  const pipeline = new CanonicalProofPipeline(CONFIG.SEPOLIA_RPC);

  const SOURCE_VAULT_ABI = [
    "event RepaymentLogged(address indexed borrower, uint256 indexed loanId, address token, uint256 amount, uint256 timestamp, bytes32 metadataHash)"
  ];
  const sourceVault = new ethers.Contract(
    CONFIG.SOURCE_VAULT_ADDRESS,
    SOURCE_VAULT_ABI,
    sepoliaProvider
  );

  console.log("👀 Listening for RepaymentLogged events on Sepolia...");

  sourceVault.on("RepaymentLogged", async (borrower, loanId, token, amount, timestamp, meta, event: any) => {
    try {
      const txHash: string = event.log.transactionHash;
      console.log(`\n🔔 Repayment detected on Sepolia! tx ${txHash}`);

      // 1-3: ChainInfo attestation wait + OOB proof generation
      const proof = await pipeline.build(txHash);

      // 4: Submit canonical args → Hub → Block Prover precompile 0x0FD2
      console.log(`🚀 Submitting canonical proof to xCredenceHub…`);
      // Fully trustless: Hub decodes RepaymentLogged args from the proven bytes.
      const tx = await hub.verifyAndProcessCanonicalProof(
        proof.chainKey,
        proof.height,
        proof.encodedTransaction,
        [proof.merkleProof.blockDigest, proof.merkleProof.siblings],
        [proof.continuityProof.anchor, proof.continuityProof.hashes],
        { gasLimit: 1_500_000 }
      );
      const receipt = await tx.wait();
      console.log(`   ✅ Verified & scored in Creditcoin block ${receipt.blockNumber} (tx ${tx.hash})`);

      // Show updated profile
      const profile = await hub.getCreditProfile(proof.borrower);
      console.log(
        `   📈 ${proof.borrower}: score ${profile.creditScore}, tier ${profile.tier}`
      );
    } catch (err: any) {
      console.error(`❌ Relayer error:`, err?.message ?? err);
    }
  });
}

if (require.main === module) {
  runLiveRelayer().catch(console.error);
}
