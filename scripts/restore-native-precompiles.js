// One-shot emergency restore: force Hub back to native precompiles.
// Run: node scripts/restore-native-precompiles.js  (from repo root, uses root .env DEPLOYER_PRIVATE_KEY)
const { ethers } = require("../contracts/node_modules/ethers");
const fs = require("fs");

function loadKey() {
  if (process.env.DEPLOYER_PRIVATE_KEY) return process.env.DEPLOYER_PRIVATE_KEY;
  const env = fs.readFileSync(".env", "utf8").match(/^DEPLOYER_PRIVATE_KEY=(\S+)/m);
  if (env) return env[1];
  const env2 = fs.readFileSync("contracts/.env", "utf8").match(/^PRIVATE_KEY=(\S+)/m);
  if (env2) return env2[1];
  throw new Error("deployer key not found");
}

const RPC = process.env.CREDITCOIN_RPC_URL || "https://rpc.cc3-testnet.creditcoin.network/";
const HUB = process.env.HUB_ADDRESS || "0x6F242C3b40C9C89D4400bB77F2Fd18D0dfCDF39e";
const NATIVE_PROVER = "0x0000000000000000000000000000000000000FD2";
const NATIVE_INFO = "0x0000000000000000000000000000000000000FD3";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(loadKey(), provider);
  const hub = new ethers.Contract(HUB, [
    "function setBlockProver(address)",
    "function setChainInfo(address)",
    "function blockProver() view returns (address)",
    "function chainInfo() view returns (address)",
  ], wallet);

  console.log(`Sender: ${wallet.address}`);
  console.log(`Before: blockProver=${await hub.blockProver()} chainInfo=${await hub.chainInfo()}`);

  for (const [name, fn, target] of [
    ["blockProver", hub.setBlockProver, NATIVE_PROVER],
    ["chainInfo", hub.setChainInfo, NATIVE_INFO],
  ]) {
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        const tx = await fn(target);
        console.log(`${name}: submitted ${tx.hash}, waiting…`);
        await tx.wait();
        console.log(`${name}: confirmed`);
        break;
      } catch (e) {
        console.log(`${name}: attempt ${attempt} failed (${e.shortMessage || e.message}), retrying…`);
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  }

  const bp = await hub.blockProver();
  const ci = await hub.chainInfo();
  console.log(`After:  blockProver=${bp} chainInfo=${ci}`);
  if (
    bp.toLowerCase() !== NATIVE_PROVER.toLowerCase() ||
    ci.toLowerCase() !== NATIVE_INFO.toLowerCase()
  ) {
    console.error("❌ RESTORE FAILED — hub not on native precompiles");
    process.exit(1);
  }
  console.log("✅ Hub is fully restored to native precompiles 0x0FD2 / 0x0FD3");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});