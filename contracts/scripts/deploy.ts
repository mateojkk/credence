import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("===============================================================");
  console.log(`🚀 Deploying Credence Protocol Suite to Chain ID: ${network.chainId}`);
  console.log(`👤 Deployer Address: ${deployer.address}`);
  console.log("===============================================================");

  let blockProverAddress = "0x0000000000000000000000000000000000000FD2";

  // If on local hardhat / testnet without precompile, deploy MockBlockProver
  if (network.chainId === 31337n) {
    console.log("📦 Deploying MockBlockProver for local simulation...");
    const MockBlockProver = await ethers.getContractFactory("MockBlockProver");
    const mockProver = await MockBlockProver.deploy();
    await mockProver.waitForDeployment();
    blockProverAddress = await mockProver.getAddress();
    console.log(`✅ MockBlockProver deployed at: ${blockProverAddress}`);
  }

  // 1. Deploy Mock Tokens for Testnet Demo
  console.log("📦 Deploying Test Tokens (xUSDC, xCTC, tWETH)...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Credence USD", "xUSDC", 18);
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log(`✅ xUSDC deployed at: ${usdcAddr}`);

  const ctc = await MockERC20.deploy("Credence CTC", "xCTC", 18);
  await ctc.waitForDeployment();
  const ctcAddr = await ctc.getAddress();
  console.log(`✅ xCTC deployed at: ${ctcAddr}`);

  // 2. Deploy CredenceHub (Creditcoin Settlement Hub)
  console.log("📦 Deploying CredenceHub...");
  const CredenceHub = await ethers.getContractFactory("CredenceHub");
  const hub = await CredenceHub.deploy(blockProverAddress);
  await hub.waitForDeployment();
  const hubAddr = await hub.getAddress();
  console.log(`✅ CredenceHub deployed at: ${hubAddr}`);

  // 3. Deploy CredenceLendingPool
  console.log("📦 Deploying CredenceLendingPool...");
  const CredenceLendingPool = await ethers.getContractFactory("CredenceLendingPool");
  const pool = await CredenceLendingPool.deploy(hubAddr);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log(`✅ CredenceLendingPool deployed at: ${poolAddr}`);

  // 4. Deploy AIRiskSentinel
  console.log("📦 Deploying AIRiskSentinel...");
  const AIRiskSentinel = await ethers.getContractFactory("AIRiskSentinel");
  const sentinel = await AIRiskSentinel.deploy(hubAddr, poolAddr);
  await sentinel.waitForDeployment();
  const sentinelAddr = await sentinel.getAddress();
  console.log(`✅ AIRiskSentinel deployed at: ${sentinelAddr}`);

  // 5. Link contracts & configure reserves
  console.log("🔗 Linking Hub, Pool, and Sentinel...");
  await hub.setLendingPool(poolAddr);
  await hub.setAIRiskSentinel(sentinelAddr);
  await pool.setAIRiskSentinel(sentinelAddr);

  console.log("⚙️  Configuring pool reserves...");
  await pool.configureReserve(usdcAddr, true, ethers.parseUnits("1.0", 18));
  await pool.configureReserve(ctcAddr, true, ethers.parseUnits("2.50", 18));

  // 6. Deploy SourceVault (for Source Chain e.g. Sepolia / Base)
  console.log("📦 Deploying SourceVault (Source Chain Gateway)...");
  const SourceVault = await ethers.getContractFactory("SourceVault");
  const sourceVault = await SourceVault.deploy();
  await sourceVault.waitForDeployment();
  const sourceVaultAddr = await sourceVault.getAddress();
  console.log(`✅ SourceVault deployed at: ${sourceVaultAddr}`);

  console.log("\n===============================================================");
  console.log("🎉 Credence Deployment Complete!");
  console.log("===============================================================");
  console.log(`Creditcoin Precompile 0x0FD2: ${blockProverAddress}`);
  console.log(`CredenceHub:                 ${hubAddr}`);
  console.log(`CredenceLendingPool:        ${poolAddr}`);
  console.log(`AIRiskSentinel:              ${sentinelAddr}`);
  console.log(`SourceVault (Sepolia/Base):   ${sourceVaultAddr}`);
  console.log(`xUSDC:                        ${usdcAddr}`);
  console.log(`xCTC:                         ${ctcAddr}`);
  console.log("===============================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
