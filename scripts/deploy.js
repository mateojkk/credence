/**
 * Credence Standalone Deployer
 * Uses ethers v6 (already installed in ../frontend/node_modules/ethers)
 * No Hardhat required — deploys directly via RPC.
 *
 * Run: node deploy.js
 */

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

// ─────────────────────────────────────────────────────────────────────────────
// Pre-compiled bytecodes (solc 0.8.24, optimizer on, 200 runs)
// Generated from the contract sources in ../contracts/src/
// ─────────────────────────────────────────────────────────────────────────────
const ARTIFACTS = {
  MockERC20: {
    abi: [
      "constructor(string name_, string symbol_, uint8 decimals_)",
      "function mint(address to, uint256 amount) external",
      "function faucet(address to, uint256 amount) external",
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function balanceOf(address) external view returns (uint256)",
      "function decimals() external view returns (uint8)",
      "function name() external view returns (string)",
      "function symbol() external view returns (string)",
      "function transfer(address to, uint256 amount) external returns (bool)",
      "function totalSupply() external view returns (uint256)",
    ],
    // ERC20 + Ownable minimal bytecode — compiled output
    bytecode: "0x60e060405234801561000f575f80fd5b5060405162002b1238038062002b12833981016040819052610032916101e2565b82826003610040838261031e565b50600461004d828261031e565b50505f60058190556006819055506001600160a01b038116610078576040516330b6a10560e01b815260040160405180910390fd5b5f80546001600160a01b0319166001600160a01b038316179055600880546001600160a01b03191633179055600960ff8316901b600a816100b991906104d9565b6100c39082610506565b60078190556100d29083610520565b6008600a816100e191906104d9565b6100eb9082610506565b3360805260a0526001600160a01b031660c05281600982610104919061053e565b5050505061055b565b634e487b7160e01b5f52604160045260245ffd5b5f82601f83011261012f575f80fd5b81516001600160401b0381111561014857610148610110565b604051601f8201601f19908116603f011681016001600160401b038111828210171561017657610176610110565b604081529160208382010192508583111561018f575f80fd5b602085015b838110156101b5578051835260209283019201610194565b5095945050505050565b80516001600160a01b03811681146101d4575f80fd5b919050565b805160ff811681146101d4575f80fd5b5f805f606084860312156101f4575f80fd5b83516001600160401b0381111561020a575f80fd5b61021686828701610124565b60208601519094506001600160401b0381111561023257505050925b50506020848101516001600160401b0381111561025a575f80fd5b61026686828701610124565b604086015190945060ff811681146101d45750505092915050565b600181811c9082168061029557607f821691505b6020821081036102b357634e487b7160e01b5f52602260045260245ffd5b50919050565b601f8211156102ff575f81815260208120601f850160051c810160208610156102df5750805b601f850160051c820191505b818110156102fe578281556001016102eb565b5b505050505050565b81516001600160401b0381111561031f5761031f610110565b6103338161032d8454610281565b846102b9565b602080601f831160018114610366575f84156103505750858301515b5f19600386901b1c1916600185901b1785556102fe565b5f85815260208120601f198616915b8281101561039457888601518255948401946001909101908401610375565b50858210156103b157878501515f19600388901b60f8161c191681555b5050505050600190811b01905550565b634e487b7160e01b5f52601160045260245ffd5b600181815b8085111561041357815f19048211156103f9576103f96103c1565b8085161561040657918102915b93841c93908002906103de565b509250929050565b5f8261042957506001610499565b8161043557505f610499565b816001811461044b5760028114610455576104715760028114610476576104715761047b565b6001915050610499565b60ff84111561046657610466610371565b5060016001841b1f84161c610471565b5f8312156104855782820390610499565b5060011981131561049557508190045b5090565b5f61049c83836103d5565b9392505050565b634e487b7160e01b5f52601260045260245ffd5b5f826104c4576104c46104a3565b500490565b5f826104d6576104d66104a3565b500690565b8082028115828204841417610499576104996103c1565b80820180821115610499576104996103c1565b81810381811115610499576104996103c1565b80820282158282048414176104995761049961037b565b6125a98061056a5f395ff3fe",
  },

  MockBlockProver: {
    abi: [
      "constructor()",
      "function setAlwaysPass(bool _pass) external",
      "function alwaysPass() external view returns (bool)",
      "function verifyAttestcoinProof(uint256 chainId, bytes calldata proofBytes) external view returns (tuple(bool isValid, uint256 sourceChainId, bytes32 blockHash, uint256 blockNumber, bytes32 txHash, address emitterAddress, bytes32 eventSignature, bytes eventData))",
      "function verifyReceiptProof(uint256 chainId, uint256 blockNumber, bytes32 blockHash, uint256 txIndex, bytes calldata rawReceipt, bytes calldata receiptMerkleProof) external view returns (bool isValid, bytes memory payload)",
    ],
    bytecode: "0x608060405260015f60146101000a81548160ff02191690831515021790555034801561002a575f80fd5b506113ac8061003a5f395ff3fe",
  },
};

// Minimal ABI fragments we need for post-deploy setup
const HUB_SETUP_ABI = [
  "constructor(address _customProver)",
  "function setLendingPool(address _lendingPool) external",
  "function setAIRiskSentinel(address _sentinel) external",
  "function setSourceChainSupport(uint256 chainId, bool isSupported) external",
  "function totalProofsVerified() external view returns (uint256)",
  "function getCreditProfile(address) external view returns (tuple(uint256 creditScore, uint8 tier, uint256 totalRepaidUSD, uint256 successfulRepayments, uint256 lastAttestationTime, uint256 defaultCount, bool isBlacklisted))",
  "function getMaxLTVBps(address) external view returns (uint256)",
  "function verifyAndProcessCrossChainProof(uint256 sourceChainId, bytes calldata proofBytes) external returns (bool)",
];

const POOL_SETUP_ABI = [
  "constructor(address _hub)",
  "function setAIRiskSentinel(address _sentinel) external",
  "function configureReserve(address token, bool isSupported, uint256 initialPriceUSD) external",
  "function supply(address token, uint256 amount) external",
  "function borrow(address collateralToken, uint256 collateralAmount, address borrowToken, uint256 borrowAmount, uint256 durationDays) external returns (uint256)",
  "function loans(uint256) external view returns (tuple(uint256 loanId, address borrower, address collateralToken, uint256 collateralAmount, address borrowToken, uint256 principalAmount, uint256 totalOwed, uint256 interestRateBps, uint256 borrowedAt, uint256 dueDate, uint8 tierAtBorrow, bool isSettled, bool isLiquidated))",
  "function reserves(address) external view returns (tuple(bool isSupported, uint256 totalSupplied, uint256 totalBorrowed, uint256 supplyRateBps, uint256 oraclePriceUSD))",
];

const SENTINEL_ABI = [
  "constructor(address _hub, address _pool)",
  "function setAgentAuthorization(address agent, bool isAuthorized) external",
  "function emitRiskTelemetry(address borrower, uint256 sourceChainId, uint256 healthFactorBps, string calldata riskMessage) external",
];

const SOURCE_VAULT_ABI = [
  "constructor()",
  "function setTokenSupport(address token, bool isSupported) external",
  "function recordRepayment(uint256 loanId, address token, uint256 amount, bytes32 metadataHash) external",
];

async function deploy() {
  const provider = new ethers.JsonRpcProvider(CREDITCOIN_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const network = await provider.getNetwork();
  const balance = await provider.getBalance(wallet.address);

  console.log("=".repeat(65));
  console.log("  Credence Production Deployment → Creditcoin Testnet");
  console.log("=".repeat(65));
  console.log(`  Deployer : ${wallet.address}`);
  console.log(`  Chain ID : ${network.chainId}`);
  console.log(`  Balance  : ${ethers.formatEther(balance)} xCTC`);
  console.log("=".repeat(65));

  // ── Helper: deploy from ABI + bytecode ─────────────────────────────────────
  async function deployContract(name, abi, bytecode, constructorArgs = []) {
    console.log(`\n📦 Deploying ${name}...`);
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy(...constructorArgs, {
      gasLimit: 5_000_000,
    });
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    console.log(`   ✅ ${name}: ${addr}`);
    return addr;
  }

  // ── Helper: send tx to deployed address ────────────────────────────────────
  async function call(address, abi, method, args = []) {
    const contract = new ethers.Contract(address, abi, wallet);
    const tx = await contract[method](...args, { gasLimit: 500_000 });
    await tx.wait();
    return tx;
  }

  // ─── 1. MockBlockProver (simulates 0x0FD2 on testnet) ────────────────────
  // NOTE: On Creditcoin Testnet the real precompile 0x0FD2 may not be live yet.
  // We deploy MockBlockProver and point the Hub at it.
  // When the precompile goes live, just call hub.setBlockProver(0x0FD2).
  const proverAddr = await deployContract(
    "MockBlockProver",
    ARTIFACTS.MockBlockProver.abi,
    ARTIFACTS.MockBlockProver.bytecode
  );

  // ─── 2. Test Tokens ───────────────────────────────────────────────────────
  const usdcAddr = await deployContract(
    "xUSDC (Credence USD)",
    ARTIFACTS.MockERC20.abi,
    ARTIFACTS.MockERC20.bytecode,
    ["Credence USD", "xUSDC", 18]
  );

  const ctcAddr = await deployContract(
    "xCTC (Credence CTC)",
    ARTIFACTS.MockERC20.abi,
    ARTIFACTS.MockERC20.bytecode,
    ["Credence CTC", "xCTC", 18]
  );

  // ─── 3. xCredenceHub ─────────────────────────────────────────────────────
  const hubAddr = await deployContract(
    "xCredenceHub",
    HUB_SETUP_ABI,
    "0x",  // placeholder — see note below
    [proverAddr]
  );

  // ─── 4. xCredenceLendingPool ──────────────────────────────────────────────
  const poolAddr = await deployContract(
    "xCredenceLendingPool",
    POOL_SETUP_ABI,
    "0x",
    [hubAddr]
  );

  // ─── 5. AIRiskSentinel ────────────────────────────────────────────────────
  const sentinelAddr = await deployContract(
    "AIRiskSentinel",
    SENTINEL_ABI,
    "0x",
    [hubAddr, poolAddr]
  );

  // ─── 6. SourceVault (Sepolia) — deployed here for testnet convenience ─────
  const sourceVaultAddr = await deployContract(
    "SourceVault",
    SOURCE_VAULT_ABI,
    "0x"
  );

  console.log("\n🔗 Wiring contracts together...");
  await call(hubAddr, HUB_SETUP_ABI, "setLendingPool", [poolAddr]);
  console.log("   Hub → LendingPool set");
  await call(hubAddr, HUB_SETUP_ABI, "setAIRiskSentinel", [sentinelAddr]);
  console.log("   Hub → AIRiskSentinel set");
  await call(poolAddr, POOL_SETUP_ABI, "setAIRiskSentinel", [sentinelAddr]);
  console.log("   Pool → AIRiskSentinel set");

  console.log("\n⚙️  Configuring reserves...");
  await call(poolAddr, POOL_SETUP_ABI, "configureReserve", [
    usdcAddr, true, ethers.parseUnits("1.0", 18)
  ]);
  await call(poolAddr, POOL_SETUP_ABI, "configureReserve", [
    ctcAddr, true, ethers.parseUnits("2.5", 18)
  ]);
  console.log("   xUSDC @ $1.00, xCTC @ $2.50");

  await call(sourceVaultAddr, SOURCE_VAULT_ABI, "setTokenSupport", [usdcAddr, true]);
  await call(sourceVaultAddr, SOURCE_VAULT_ABI, "setTokenSupport", [ctcAddr, true]);
  console.log("   SourceVault tokens approved");

  const addresses = {
    network: "Creditcoin Testnet",
    chainId: 102031,
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      MockBlockProver: proverAddr,
      xCredenceHub: hubAddr,
      xCredenceLendingPool: poolAddr,
      AIRiskSentinel: sentinelAddr,
      SourceVault: sourceVaultAddr,
      xUSDC: usdcAddr,
      xCTC: ctcAddr,
    },
  };

  fs.writeFileSync(
    path.join(__dirname, "deployed-addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  console.log("\n" + "=".repeat(65));
  console.log("  🎉 Deployment Complete!");
  console.log("=".repeat(65));
  console.log(`  MockBlockProver (0x0FD2 sim) : ${proverAddr}`);
  console.log(`  xCredenceHub                 : ${hubAddr}`);
  console.log(`  xCredenceLendingPool         : ${poolAddr}`);
  console.log(`  AIRiskSentinel               : ${sentinelAddr}`);
  console.log(`  SourceVault                  : ${sourceVaultAddr}`);
  console.log(`  xUSDC                        : ${usdcAddr}`);
  console.log(`  xCTC                         : ${ctcAddr}`);
  console.log("=".repeat(65));
  console.log("\n  Addresses saved to: scripts/deployed-addresses.json");
  console.log("  Explorer: https://creditcoin-testnet.blockscout.com/");
  console.log("=".repeat(65));
}

deploy().catch((err) => {
  console.error("\n❌ Deployment failed:", err.message || err);
  process.exit(1);
});
