/**
 * One-shot end-to-end proof run:
 *   1. Fires a real recordRepayment() on Sepolia SourceVault (needs Sepolia gas)
 *   2. Waits ChainInfo attestation on Creditcoin (precompile 0x0FD3)
 *   3. Fetches real Merkle + continuity proofs (Proof Builder API)
 *   4. Submits canonical proof → Hub verifies via precompile 0x0FD2 → scores
 *
 * Run: cd relayer && npm run e2e
 */
import { ethers } from "ethers";
import { CanonicalProofPipeline } from "./canonicalProofPipeline";
import { CONFIG } from "./config";

const SOURCE_VAULT_ABI = [
  "function recordRepayment(uint256 loanId, address token, uint256 amount, bytes32 metadataHash) external"
];

const HUB_ABI = [
  "function verifyAndProcessCanonicalProof(uint64 chainKey, uint64 height, bytes encodedTransaction, (bytes32,(bytes32,bool)[]) merkleProof, (bytes32,bytes32[]) continuityProof) external returns (bool)",
  "function getCreditProfile(address borrower) external view returns (tuple(uint256 creditScore, uint8 tier, uint256 totalRepaidUSD, uint256 successfulRepayments, uint256 lastAttestationTime, uint256 defaultCount, bool isBlacklisted))",
  "function totalProofsVerified() external view returns (uint256)"
];

async function main() {
  if (!CONFIG.RELAYER_PRIVATE_KEY) {
    throw new Error("Set RELAYER_PRIVATE_KEY in relayer/.env");
  }

  const sepolia = new ethers.JsonRpcProvider(CONFIG.SEPOLIA_RPC);
  const creditcoin = new ethers.JsonRpcProvider(CONFIG.CREDITCOIN_RPC);
  const sepWallet = new ethers.Wallet(CONFIG.RELAYER_PRIVATE_KEY, sepolia);
  const ccWallet = new ethers.Wallet(CONFIG.RELAYER_PRIVATE_KEY, creditcoin);

  console.log("===================================================================");
  console.log("🧪 Credence end-to-end live proof run");
  console.log(`👤 Wallet:      ${sepWallet.address}`);
  console.log(`🏛️ SourceVault: ${CONFIG.SOURCE_VAULT_ADDRESS} (Sepolia)`);
  console.log(`🏛️ Hub:         ${CONFIG.CREDITCOIN_HUB_ADDRESS} (Creditcoin)`);
  console.log("===================================================================");

  // 0. Gas check on Sepolia
  const balance = await sepolia.getBalance(sepWallet.address);
  console.log(`⛽ Sepolia ETH: ${ethers.formatEther(balance)}`);
  if (balance < ethers.parseEther("0.0005")) {
    throw new Error(
      "Insufficient Sepolia ETH. Fund this address via a faucet " +
        "(Google Cloud Web3 faucet / Alchemy) and rerun."
    );
  }

  const vault = new ethers.Contract(CONFIG.SOURCE_VAULT_ADDRESS, SOURCE_VAULT_ABI, sepWallet);
  const hub = new ethers.Contract(CONFIG.CREDITCOIN_HUB_ADDRESS, HUB_ABI, ccWallet);

  const profileBefore = await hub.getCreditProfile(ccWallet.address);
  console.log(
    `📊 Score before: ${profileBefore.creditScore} (${profileBefore.successfulRepayments} clean repays)`
  );

  // 1. Fire a real repayment event on Sepolia.
  //    token = ZeroAddress → vault skips transfer, emits the attestation event.
  const repayAmount = ethers.parseUnits("5000", 18); // $5,000 proven volume
  console.log("\n📤 [1/4] Recording repayment on Sepolia…");
  const fireTx = await vault.recordRepayment(
    1n,
    ethers.ZeroAddress,
    repayAmount,
    ethers.keccak256(ethers.toUtf8Bytes(`credence-e2e-${Date.now()}`))
  );
  const fireRcpt = await fireTx.wait();
  if (!fireRcpt || fireRcpt.status !== 1) throw new Error("recordRepayment reverted");
  const txHash = fireRcpt.hash;
  console.log(`   ✅ RepaymentLogged emitted · tx ${txHash} (block ${fireRcpt.blockNumber})`);

  // 2–3. Attestation wait + OOB proof generation
  console.log("\n🔎 [2/4] Resolving chainKey & waiting for block attestation (0x0FD3)…");
  console.log("🧱 [3/4] Fetching Merkle + continuity proofs (Proof Builder API)…");
  const pipeline = new CanonicalProofPipeline(CONFIG.SEPOLIA_RPC);
  const proof = await pipeline.build(txHash);
  console.log(
    `   ✅ Proofs ready · chainKey ${proof.chainKey} @ height ${proof.height}`
  );

  // 4. Canonical submit → Hub → precompiles verify → score
  console.log("\n🚀 [4/4] Submitting to Hub (verification inside precompile 0x0FD2)…");
  const submitTx = await hub.verifyAndProcessCanonicalProof(
    proof.chainKey,
    proof.height,
    proof.encodedTransaction,
    [proof.merkleProof.blockDigest, proof.merkleProof.siblings],
    [proof.continuityProof.anchor, proof.continuityProof.hashes],
    { gasLimit: 1_500_000 }
  );
  const submitRcpt = await submitTx.wait();
  console.log(`   ✅ Verified on Creditcoin · tx ${submitTx.hash}`);

  const profileAfter = await hub.getCreditProfile(ccWallet.address);
  const totalProofs = await hub.totalProofsVerified();

  console.log("\n===================================================================");
  console.log("🏆 END-TO-END SUCCESS");
  console.log(`   Score:   ${profileBefore.creditScore} → ${profileAfter.creditScore}`);
  console.log(`   Tier:    ${profileAfter.tier}`);
  console.log(`   Volume:  ${ethers.formatEther(profileAfter.totalRepaidUSD)} USD verified`);
  console.log(`   Proofs:  ${totalProofs} processed by Hub`);
  console.log(`   Sepolia tx:  ${txHash}`);
  console.log(`   Creditcoin:  ${submitTx.hash}`);
  console.log("===================================================================");
}

main().catch((err) => {
  console.error("❌ E2E failed:", err?.message ?? err);
  process.exit(1);
});
