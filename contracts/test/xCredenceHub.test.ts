import { expect } from "chai";
import { ethers } from "hardhat";
import { xCredenceHub, MockBlockProver, MockChainInfo } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("xCredenceHub - Canonical Attestcoin Flow (0x0FD2 + 0x0FD3)", function () {
  let hub: xCredenceHub;
  let mockProver: MockBlockProver;
  let mockChainInfo: MockChainInfo;
  let owner: SignerWithAddress;
  let borrower: SignerWithAddress;
  let attacker: SignerWithAddress;

  // On CC3 testnet, Sepolia is chainKey 1 (not the EVM chainId)
  const SEPOLIA_CHAIN_KEY = 1n;
  const HEIGHT = 5_400_000n;

  const coder = ethers.AbiCoder.defaultAbiCoder();
  const REPAY_SIG = ethers.id(
    "RepaymentLogged(address,uint256,address,uint256,uint256,bytes32)"
  );

  /** Builds txBytes in EvmV1Decoder layout carrying one RepaymentLogged log. */
  function buildEncodedTransaction(amountUSD: bigint, seed: string): string {
    const common = coder.encode(
      ["uint64", "uint64", "address", "bool", "address", "uint256", "bytes"],
      [0n, 21000n, borrower.address, false, ethers.ZeroAddress, 0n, "0x"]
    );
    const legacy = coder.encode(
      ["uint128", "uint256", "bytes32", "bytes32"],
      [1n, 27n, ethers.id(`r-${seed}`), ethers.id(`s-${seed}`)]
    );
    const log = [
      ethers.ZeroAddress,
      [
        REPAY_SIG,
        ethers.zeroPadValue(borrower.address.toLowerCase(), 32),
        ethers.zeroPadValue(ethers.toBeHex(1), 32), // loanId
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

  async function submitCanonical(
    submitter: SignerWithAddress,
    amountUSD: bigint,
    txSeed: string,
    height: bigint = HEIGHT
  ) {
    const encodedTransaction = buildEncodedTransaction(amountUSD, txSeed);
    const merkleProof = {
      root: ethers.keccak256(ethers.toUtf8Bytes(`digest-${height}`)),
      siblings: [
        { hash: ethers.keccak256(ethers.toUtf8Bytes(`sib-a-${txSeed}`)), isLeft: true },
        { hash: ethers.keccak256(ethers.toUtf8Bytes(`sib-b-${txSeed}`)), isLeft: false },
      ],
    };
    const continuityProof = {
      lowerEndpointDigest: ethers.keccak256(ethers.toUtf8Bytes(`anchor-${height}`)),
      roots: [ethers.keccak256(ethers.toUtf8Bytes(`cont-${txSeed}`))],
    };

    return hub
      .connect(submitter)
      .verifyAndProcessCanonicalProof(
        SEPOLIA_CHAIN_KEY,
        height,
        encodedTransaction,
        merkleProof,
        continuityProof
      );
  }

  beforeEach(async function () {
    [owner, borrower, attacker] = await ethers.getSigners();

    const ProverFactory = await ethers.getContractFactory("MockBlockProver");
    mockProver = (await ProverFactory.deploy()) as unknown as MockBlockProver;
    await mockProver.waitForDeployment();

    const ChainInfoFactory = await ethers.getContractFactory("MockChainInfo");
    mockChainInfo = (await ChainInfoFactory.deploy()) as unknown as MockChainInfo;
    await mockChainInfo.waitForDeployment();

    const HubFactory = await ethers.getContractFactory("xCredenceHub");
    hub = (await HubFactory.deploy(await mockProver.getAddress())) as unknown as xCredenceHub;
    await hub.waitForDeployment();
    await hub.setChainInfo(await mockChainInfo.getAddress());
  });

  it("should initialize with default base credit score of 500 and UNVERIFIED tier", async function () {
    const profile = await hub.getCreditProfile(borrower.address);
    expect(profile.creditScore).to.equal(500n);
    expect(profile.tier).to.equal(0); // UNVERIFIED

    const maxLtv = await hub.getMaxLTVBps(borrower.address);
    expect(maxLtv).to.equal(5000n); // 50% max LTV
  });

  it("should reject proofs for blocks that are not attested on Creditcoin", async function () {
    await mockChainInfo.setDefaultAttested(false);
    await expect(
      submitCanonical(borrower, ethers.parseUnits("1000", 18), "unattested")
    ).to.be.revertedWith("Source block not attested on Creditcoin");
  });

  it("should verify canonical cross-chain repayment proof via 0x0FD2 and upgrade credit score", async function () {
    const repaymentAmount = ethers.parseUnits("5000", 18); // $5,000 repayment

    const tx = await submitCanonical(borrower, repaymentAmount, "repay-001");
    await tx.wait();

    const profile = await hub.getCreditProfile(borrower.address);
    expect(profile.successfulRepayments).to.equal(1n);
    expect(profile.totalRepaidUSD).to.equal(repaymentAmount);

    // Score calculation: 500 base + 75 volume pts (5k/1k * 15) + 10 freq pts = 585
    expect(profile.creditScore).to.equal(585n);
    expect(profile.tier).to.equal(1); // BRONZE tier (550+)

    const maxLtv = await hub.getMaxLTVBps(borrower.address);
    expect(maxLtv).to.equal(6500n); // 65% LTV
  });

  it("should upgrade borrower to PLATINUM tier (90% LTV) upon sustained high-volume attestations", async function () {
    const repaymentAmount = ethers.parseUnits("20000", 18);

    for (let i = 1; i <= 15; i++) {
      await submitCanonical(
        borrower,
        repaymentAmount,
        `volume-batch-${i}`,
        BigInt(5_000_000 + i)
      );
    }

    const profile = await hub.getCreditProfile(borrower.address);
    expect(profile.creditScore).to.be.gte(780n);
    expect(profile.tier).to.equal(4); // PLATINUM

    const maxLtv = await hub.getMaxLTVBps(borrower.address);
    expect(maxLtv).to.equal(9000n); // 90% capital efficiency unlocked!

    const discount = await hub.getInterestDiscountBps(borrower.address);
    expect(discount).to.equal(300n); // 300 bps (3%) discount
  });

  it("should reject replayed canonical proofs (same chainKey/height/tx bytes)", async function () {
    await submitCanonical(borrower, ethers.parseUnits("1000", 18), "replay-test");

    await expect(
      submitCanonical(attacker, ethers.parseUnits("1000", 18), "replay-test")
    ).to.be.revertedWith("Proof already processed");
  });

  it("should reject canonical proofs if precompile validation fails", async function () {
    await mockProver.setAlwaysPass(false);

    await expect(
      submitCanonical(attacker, ethers.parseUnits("1000", 18), "forged")
    ).to.be.revertedWith("Canonical verification failed");
  });
});
