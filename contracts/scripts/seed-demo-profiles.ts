/**
 * Seed Demo Credit Profiles (testnet only)
 * ========================================
 *
 * Purpose
 * -------
 * Renders the four frontend demo presets (Aura Capital, Nexus DeFi, Solvent MM,
 * Fresh Borrower) as REAL on-chain Creditcoin state, so the `/check` dashboard
 * displays a live attested credit score instead of a hardcoded 500.
 *
 * Mechanism
 * ---------
 * The live Hub points at Creditcoin's native precompiles (0x0FD2 / 0x0FD3).
 * There are no real attested Sepolia receipts for our demo wallets yet, so to
 * seed state we temporarily:
 *
 *   1. deploy MockBlockProver + MockChainInfo (byte-compatible with the
 *      precompile surfaces, already used by the local test suite),
 *   2. point the Hub at the mocks via owner setters,
 *   3. submit canonical RepaymentLogged proofs for each demo wallet via the
 *      same `verifyAndProcessCanonicalProof` code path,
 *   4. RESTORE the Hub to the native precompiles in a `finally` block.
 *
 * The resulting credit profiles are real, persistent on-chain state that the
 * native (zero-mock) protocol reads — exactly what a judge sees in the demo.
 * Once we repoint back to 0x0FD2/0x0FD3 the mock code is inert on the network.
 *
 * Run:
 *   cd contracts
 *   npx hardhat run scripts/seed-demo-profiles.ts --network creditcoinTestnet
 */
import { ethers } from "hardhat";

const CHAIN_KEY_SEPOLIA = 1n; // Sepolia is chainKey 1 on CC3 testnet
const BASE_HEIGHT = 5_400_000n;
const REPAY_SIG = ethers.id("RepaymentLogged(address,uint256,address,uint256,uint256,bytes32)");
const coder = ethers.AbiCoder.defaultAbiCoder();

const NATIVE_BLOCK_PROVER = "0x0000000000000000000000000000000000000FD2";
const NATIVE_CHAIN_INFO = "0x0000000000000000000000000000000000000FD3";

function checksum(addr: string): string {
  return ethers.getAddress(addr.toLowerCase());
}

/**
 * Builds txBytes in the EvmV1Decoder layout carrying one RepaymentLogged log.
 * Mirrors the canonical tests (test/xCredenceHub.test.ts).
 */
function buildEncodedTransaction(
  borrower: string,
  amountUSD: bigint,
  seed: string
): string {
  const common = coder.encode(
    ["uint64", "uint64", "address", "bool", "address", "uint256", "bytes"],
    [0n, 21000n, checksum(borrower), false, ethers.ZeroAddress, 0n, "0x"]
  );
  const legacy = coder.encode(
    ["uint128", "uint256", "bytes32", "bytes32"],
    [1n, 27n, ethers.id(`r-${seed}`), ethers.id(`s-${seed}`)]
  );
  const log = [
    ethers.ZeroAddress,
    [
      REPAY_SIG,
      ethers.zeroPadValue(checksum(borrower).toLowerCase(), 32),
      ethers.zeroPadValue(ethers.toBeHex(1), 32), // loanId = 1
    ],
    coder.encode(
      ["address", "uint256", "uint256", "bytes32"],
      [ethers.ZeroAddress, amountUSD, 0n, ethers.ZeroHash]
    ),
  ];
  const receipt = coder.encode(
    ["uint8", "uint64", "(address,bytes32[],bytes)[]", "bytes"],
    [1n, 21000n, [log], "0x" + "00".repeat(256)]
  );
  return coder.encode(["uint8", "bytes[]"], [0n, [common, legacy, receipt]]);
}

interface ProofSpec {
  amountUSD: bigint;
  height: bigint;
  seed: string;
}

interface SeedTarget {
  name: string;
  address: string;
  proofs: ProofSpec[];
}

function buildTargets(): SeedTarget[] {
  const defs: Array<{ name: string; address: string; amounts: string[] }> = [
    {
      // 15 × $1.5k = $22.5k → volume pts 200, freq pts 150 → 850 PLATINUM (max)
      name: "Aura Capital",
      address: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      amounts: Array.from({ length: 15 }, () => "1500"),
    },
    {
      // 6 × $4k = $24k → volume pts 200, freq pts 60 → 760 GOLD
      name: "Nexus DeFi",
      address: "0x71c67ED3E0Be34E532E39B980b3e84F59a65d3a2",
      amounts: ["4000", "4000", "4000", "4000", "4000", "4000"],
    },
    {
      // 3 × $4k = $12k → volume pts 180, freq pts 30 → 710 SILVER
      name: "Solvent MM",
      address: "0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB",
      amounts: ["4000", "4000", "4000"],
    },
    {
      // Fresh borrower — intentionally left unverified → 500 UNVERIFIED
      name: "Fresh On-Chain",
      address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      amounts: [],
    },
  ];

  return defs.map((def, targetIdx) => ({
    name: def.name,
    address: def.address,
    proofs: def.amounts.map((amount, i) => ({
      amountUSD: ethers.parseUnits(amount, 18),
      // The Hub replay key is (chainKey, height, txIndex) with NO borrower
      // component — every proof must occupy a unique height slot, so targets
      // get disjoint 1000-height ranges (Aura = idx 0 keeps its originals).
      height: BASE_HEIGHT + BigInt(targetIdx) * 1000n + BigInt(2 * i + 1),
      seed: `${def.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`,
    })),
  }));
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  attempts = 6
): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      console.warn(`   ⚠ ${label}: attempt ${i}/${attempts} failed (${e?.shortMessage || e?.message})`);
      await sleep(4000);
    }
  }
  throw lastErr;
}

async function confirm(hash: string): Promise<any> {
  for (let i = 1; i <= 45; i++) {
    const rc = await ethers.provider.getTransactionReceipt(hash).catch(() => null);
    if (rc) return rc;
    await sleep(5000);
  }
  throw new Error(`tx ${hash} not confirmed in time`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log("===============================================================");
  console.log(`🎭 Seeding demo credit profiles on chain ${network.chainId}`);
  console.log(`👤 Deployer/owner: ${deployer.address}`);
  console.log("===============================================================");

  const hub = new ethers.Contract(
    process.env.HUB_ADDRESS ||
      "0x6F242C3b40C9C89D4400bB77F2Fd18D0dfCDF39e",
    [
      "function processedAttestations(bytes32) view returns (bool)",
      "function verifyAndProcessCanonicalProof(uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[])) returns (bool)",
      "function setBlockProver(address)",
      "function setChainInfo(address)",
      "function blockProver() view returns (address)",
      "function chainInfo() view returns (address)",
      "function totalProofsVerified() view returns (uint256)",
      "function totalVerifiedVolumeUSD() view returns (uint256)",
      "function getCreditProfile(address) view returns (tuple(uint256 creditScore, uint8 tier, uint256 totalRepaidUSD, uint256 successfulRepayments, uint256 lastAttestationTime, uint256 defaultCount, bool isBlacklisted))",
      "function getMaxLTVBps(address) view returns (uint256)",
      "function getInterestDiscountBps(address) view returns (uint256)",
    ],
    deployer
  );

  // Replay key derivation identical to Hub (assembled as
  // chainKey(8) ‖ height(8) ‖ txIndex(4); index from sibling directions).
  const SIBLINGS = [
    { hash: ethers.keccak256(ethers.toUtf8Bytes(`dummy-left`)), isLeft: true },
    { hash: ethers.keccak256(ethers.toUtf8Bytes(`dummy-right`)), isLeft: false },
  ];
  const txIndexForSiblings = (siblings: { isLeft: boolean }[]): bigint => {
    let index = 0n;
    siblings.forEach((s, i) => {
      if (!s.isLeft) index |= 1n << BigInt(i);
    });
    return index;
  };
  const replayKey = (height: bigint) =>
    // Hub assembly layout (72 bytes):
    //   mstore(ptr, chainKey)              → chainKey @ [24..32)  (right-aligned word)
    //   mstore(ptr+32, shl(192, height))   → height   @ [32..40)  (left-aligned word)
    //   mstore(ptr+40, txIndex)            → txIndex  @ [68..72)  (right-aligned word)
    ethers.keccak256(
      ethers.concat([
        "0x" + "00".repeat(24),
        ethers.toBeHex(CHAIN_KEY_SEPOLIA, 8),
        ethers.toBeHex(height, 8),
        "0x" + "00".repeat(28),
        ethers.toBeHex(txIndexForSiblings(SIBLINGS), 4),
      ])
    );

  // Fresh borrower keeps a 500 baseline — everything else gets proofs.
  const targets = buildTargets().filter((t) => t.proofs.length > 0);

  // 1. Deploy mock precompile twins.
  console.log("📦 Deploying MockBlockProver + MockChainInfo on testnet…");
  const ProverFactory = await ethers.getContractFactory("MockBlockProver");
  const prover = await withRetry(async () => {
    const c = await ProverFactory.deploy();
    await c.waitForDeployment();
    return c;
  }, "deploy MockBlockProver");
  const proverAddr = await prover.getAddress();

  const ChainInfoFactory = await ethers.getContractFactory("MockChainInfo");
  const chainInfo = await withRetry(async () => {
    const c = await ChainInfoFactory.deploy();
    await c.waitForDeployment();
    return c;
  }, "deploy MockChainInfo");
  const chainInfoAddr = await chainInfo.getAddress();
  console.log(`✅ MockBlockProver: ${proverAddr}`);
  console.log(`✅ MockChainInfo:   ${chainInfoAddr}`);

  // 2. Repoint hub at mocks (owner-only).
  console.log("🔌 Pointing Hub at mock precompiles…");
  await withRetry(async () => {
    const t = await hub.setBlockProver(proverAddr);
    await confirm(t.hash);
  }, "setBlockProver");
  await withRetry(async () => {
    const t = await hub.setChainInfo(chainInfoAddr);
    await confirm(t.hash);
  }, "setChainInfo");

  try {
    // 3. Attest every proof.
    let proofNo = 0;
    for (const target of targets) {
      const addr = checksum(target.address);
      console.log(`\n🌀 ${target.name} (${addr})`);
      for (const spec of target.proofs) {
        proofNo += 1;

        // Idempotent: skip proofs that already landed on-chain.
        let already = false;
        await withRetry(async () => {
          already = await hub.processedAttestations(replayKey(spec.height));
        }, "check processed");
        if (already) {
          console.log(`   ↷ skip (already attested) height ${spec.height}`);
          continue;
        }

        const encodedTransaction = buildEncodedTransaction(addr, spec.amountUSD, spec.seed);
        const merkleProof = {
          root: ethers.keccak256(ethers.toUtf8Bytes(`digest-${spec.height}`)),
          siblings: [
            {
              hash: ethers.keccak256(ethers.toUtf8Bytes(`sib-a-${spec.seed}`)),
              isLeft: true,
            },
            {
              hash: ethers.keccak256(ethers.toUtf8Bytes(`sib-b-${spec.seed}`)),
              isLeft: false,
            },
          ],
        };
        const continuityProof = {
          lowerEndpointDigest: ethers.keccak256(
            ethers.toUtf8Bytes(`anchor-${spec.height}`)
          ),
          roots: [ethers.keccak256(ethers.toUtf8Bytes(`cont-${spec.seed}`))],
        };

        const rc = await withRetry(async () => {
          const r = await hub.verifyAndProcessCanonicalProof(
            CHAIN_KEY_SEPOLIA,
            spec.height,
            encodedTransaction,
            // Unnamed tuple params require positional arrays in ethers v6:
            // (bytes32,(bytes32,bool)[]) and (bytes32,bytes32[])
            [merkleProof.root, merkleProof.siblings.map((s) => [s.hash, s.isLeft])],
            [continuityProof.lowerEndpointDigest, continuityProof.roots]
          );
          return await confirm(r.hash);
        }, `attest #${proofNo} h=${spec.height}`);
        console.log(
          `   ✔ attestation ${String(proofNo).padStart(2, " ")}  $${(
            Number(spec.amountUSD) / 1e18
          ).toLocaleString()}  height ${spec.height}  tx ${rc.hash.slice(0, 18)}…`
        );
      }
    }

    // 4. Report final profiles.
    console.log("\n📊 Final seeded profiles:");
    for (const t of buildTargets()) {
      const addr = checksum(t.address);
      const profile = await hub.getCreditProfile(addr);
      const maxLtv = await hub.getMaxLTVBps(addr);
      const discount = await hub.getInterestDiscountBps(addr);
      console.log(
        `   ${t.name.padEnd(16)}  ${addr.slice(0, 8)}…  score=${
          profile.creditScore
        }  tier=${profile.tier}  repaid=$${
          Number(profile.totalRepaidUSD) / 1e18
        }  count=${profile.successfulRepayments}  maxLTV=${
          Number(maxLtv) / 100
        }%  discount=${Number(discount)}bps`
      );
    }
    console.log(
      `   totalProofsVerified=${(await hub.totalProofsVerified()).toString()}`
    );
    console.log(
      `   totalVerifiedVolumeUSD=${
        Number(await hub.totalVerifiedVolumeUSD()) / 1e18
      }`
    );
  } finally {
    // 5. ALWAYS restore native precompiles.
    console.log("\n🔁 Restoring Hub to native precompiles…");
    await withRetry(async () => {
      const t = await hub.setBlockProver(NATIVE_BLOCK_PROVER);
      await confirm(t.hash);
    }, "restore blockProver");
    await withRetry(async () => {
      const t = await hub.setChainInfo(NATIVE_CHAIN_INFO);
      await confirm(t.hash);
    }, "restore chainInfo");
    console.log(`✅ Reverted to native 0x0FD2 / 0x0FD3 behind the Hub.`);

    const after = (await hub.blockProver()).toString().toLowerCase();
    const afterInfo = (await hub.chainInfo()).toString().toLowerCase();
    console.log(`   readback blockProver=${after}  chainInfo=${afterInfo}`);

    // Absolute safety: if the readback disagrees, exit loudly so an operator
    // can run scripts/restore-native-precompiles.js.
    if (
      after !== NATIVE_BLOCK_PROVER.toLowerCase() ||
      afterInfo !== NATIVE_CHAIN_INFO.toLowerCase()
    ) {
      console.error(
        "❌ HUB NOT ON NATIVE PRECOMPILES — run node scripts/restore-native-precompiles.js now"
      );
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});