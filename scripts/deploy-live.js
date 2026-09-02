const { ethers } = require("../frontend/node_modules/ethers");
const fs = require("fs");
const path = require("path");

const CREDITCOIN_RPC = process.env.CREDITCOIN_RPC_URL || "https://rpc.cc3-testnet.creditcoin.network/";

// Never hardcode keys in source. Loaded from env or root .env (DEPLOYER_PRIVATE_KEY).
function loadDeployerKey() {
  if (process.env.DEPLOYER_PRIVATE_KEY) return process.env.DEPLOYER_PRIVATE_KEY;
  try {
    const envFile = fs.readFileSync(path.join(__dirname, "../.env"), "utf8");
    const match = envFile.match(/^DEPLOYER_PRIVATE_KEY=(\S+)/m);
    if (match) return match[1];
  } catch {
    // fall through to error below
  }
  throw new Error("Deployer key not found. Set DEPLOYER_PRIVATE_KEY in .env or environment.");
}

const PRIVATE_KEY = loadDeployerKey();

const ARTIFACTS_DIR = path.join(__dirname, "../contracts/artifacts");

function loadArtifact(name) {
  const abi = JSON.parse(fs.readFileSync(path.join(ARTIFACTS_DIR, `${name}.abi`), "utf8"));
  const bin = "0x" + fs.readFileSync(path.join(ARTIFACTS_DIR, `${name}.bin`), "utf8").trim();
  return { abi, bin };
}

async function main() {
  console.log("==================================================================");
  console.log("   🚀 Deploying Credence Protocol to Creditcoin Testnet (102031)");
  console.log("==================================================================");

  const provider = new ethers.JsonRpcProvider(CREDITCOIN_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const network = await provider.getNetwork();
  const balance = await provider.getBalance(wallet.address);

  console.log(`Deployer Address : ${wallet.address}`);
  console.log(`Network Chain ID : ${network.chainId}`);
  console.log(`Deployer Balance : ${ethers.formatEther(balance)} xCTC`);
  console.log("------------------------------------------------------------------");

  if (balance === 0n) {
    throw new Error("Deployer balance is 0 xCTC. Fund wallet first.");
  }

  async function deploy(name, artifactName, args = []) {
    console.log(`\n⏳ Deploying ${name}...`);
    const { abi, bin } = loadArtifact(artifactName);
    const factory = new ethers.ContractFactory(abi, bin, wallet);
    const contract = await factory.deploy(...args);
    console.log(`   Tx sent: ${contract.deploymentTransaction()?.hash}`);
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    console.log(`   ✅ ${name} deployed to: ${addr}`);
    return { contract, address: addr, abi };
  }

  // NOTE: 0x0FD2 is the LIVE native Block Prover precompile on CC3 testnet.
  // Confirmed live via eth_call — returns "Unknown selector" (Rust precompile running).
  // Pass address(0) so the Hub constructor self-wires to DEFAULT_BLOCK_PROVER = 0x0FD2.
  const REAL_PRECOMPILE = "0x0000000000000000000000000000000000000FD2";

  // 1. Deploy Test Tokens
  const xUSDC = await deploy("Credence USD (xUSDC)", "MockERC20", ["Credence USD", "xUSDC", 18]);
  const xCTC = await deploy("Credence CTC (xCTC)", "MockERC20", ["Credence CTC", "xCTC", 18]);

  // 2. Deploy xCredenceHub — pass address(0) so it self-wires to DEFAULT_BLOCK_PROVER (0x0FD2)
  const hub = await deploy("xCredenceHub", "xCredenceHub", [ethers.ZeroAddress]);

  // 3. Deploy xCredenceLendingPool
  const pool = await deploy("xCredenceLendingPool", "xCredenceLendingPool", [hub.address]);

  // 4. Deploy AIRiskSentinel
  const sentinel = await deploy("AIRiskSentinel", "AIRiskSentinel", [hub.address, pool.address]);

  // 5. Deploy SourceVault
  const sourceVault = await deploy("SourceVault", "SourceVault", []);

  console.log("\n------------------------------------------------------------------");
  console.log("⚙️  Configuring and Linking Protocols On-Chain...");
  console.log("------------------------------------------------------------------");

  // Wire Hub
  console.log("Linking Hub -> LendingPool...");
  let tx = await hub.contract.setLendingPool(pool.address);
  await tx.wait();

  console.log("Linking Hub -> AIRiskSentinel...");
  tx = await hub.contract.setAIRiskSentinel(sentinel.address);
  await tx.wait();

  console.log("Registering Sepolia (11155111) Source Vault in Hub...");
  tx = await hub.contract.setAuthorizedSourceVault(11155111n, sourceVault.address, true);
  await tx.wait();

  // Wire Pool
  console.log("Linking LendingPool -> AIRiskSentinel...");
  tx = await pool.contract.setAIRiskSentinel(sentinel.address);
  await tx.wait();

  console.log("Configuring LendingPool Reserves (xUSDC @ $1.00, xCTC @ $2.50)...");
  tx = await pool.contract.configureReserve(xUSDC.address, true, ethers.parseUnits("1.0", 18));
  await tx.wait();
  tx = await pool.contract.configureReserve(xCTC.address, true, ethers.parseUnits("2.5", 18));
  await tx.wait();

  // Wire SourceVault
  console.log("Configuring SourceVault token support...");
  tx = await sourceVault.contract.setTokenSupport(xUSDC.address, true);
  await tx.wait();
  tx = await sourceVault.contract.setTokenSupport(xCTC.address, true);
  await tx.wait();

  // Mint and Seed Liquidity
  console.log("\n💧 Seeding Initial Lending Pool Liquidity...");
  const seedUSDC = ethers.parseUnits("100000", 18);
  const seedCTC = ethers.parseUnits("50000", 18);

  tx = await xUSDC.contract.mint(wallet.address, seedUSDC);
  await tx.wait();
  tx = await xCTC.contract.mint(wallet.address, seedCTC);
  await tx.wait();

  tx = await xUSDC.contract.approve(pool.address, seedUSDC);
  await tx.wait();
  tx = await xCTC.contract.approve(pool.address, seedCTC);
  await tx.wait();

  const supplyUSDC = ethers.parseUnits("50000", 18);
  const supplyCTC = ethers.parseUnits("25000", 18);
  tx = await pool.contract.supply(xUSDC.address, supplyUSDC);
  await tx.wait();
  tx = await pool.contract.supply(xCTC.address, supplyCTC);
  await tx.wait();
  console.log("   ✅ Supplied 50,000 xUSDC and 25,000 xCTC to Lending Pool");

  const deploymentData = {
    network: "Creditcoin CC3 Testnet",
    chainId: 102031,
    rpc: CREDITCOIN_RPC,
    explorer: "https://creditcoin-testnet.blockscout.com",
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    blockProver: REAL_PRECOMPILE,
    contracts: {
      xCredenceHub: hub.address,
      xCredenceLendingPool: pool.address,
      AIRiskSentinel: sentinel.address,
      SourceVault: sourceVault.address,
      xUSDC: xUSDC.address,
      xCTC: xCTC.address,
    },
  };

  const outputPath = path.join(__dirname, "../frontend/src/lib/deployed-contracts.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));

  console.log("\n==================================================================");
  console.log("🎉 All Contracts Successfully Deployed & Initialized On-Chain!");
  console.log("==================================================================");
  console.log(`Block Prover Precompile: ${REAL_PRECOMPILE} (0x0FD2 — LIVE NATIVE)`);
  console.log(`xCredenceHub          : ${hub.address}`);
  console.log(`xCredenceLendingPool  : ${pool.address}`);
  console.log(`AIRiskSentinel        : ${sentinel.address}`);
  console.log(`SourceVault (Sepolia) : ${sourceVault.address}`);
  console.log(`xUSDC                 : ${xUSDC.address}`);
  console.log(`xCTC                  : ${xCTC.address}`);
  console.log("==================================================================");
  console.log(`Saved deployment record to: ${outputPath}`);
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
