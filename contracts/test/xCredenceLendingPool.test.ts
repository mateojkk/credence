import { expect } from "chai";
import { ethers } from "hardhat";
import {
  xCredenceHub,
  xCredenceLendingPool,
  AIRiskSentinel,
  MockBlockProver,
  MockChainInfo,
  MockERC20,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("xCredenceLendingPool & AIRiskSentinel - Undercollateralized DeFi & AI Risk Guard", function () {
  let hub: xCredenceHub;
  let pool: xCredenceLendingPool;
  let sentinel: AIRiskSentinel;
  let mockProver: MockBlockProver;
  let mockChainInfo: MockChainInfo;
  let usdc: MockERC20;
  let ctc: MockERC20;

  let owner: SignerWithAddress;
  let lpSupplier: SignerWithAddress;
  let borrower: SignerWithAddress;
  let liquidator: SignerWithAddress;

  const SEPOLIA_CHAIN_ID = 11155111;

  beforeEach(async function () {
    [owner, lpSupplier, borrower, liquidator] = await ethers.getSigners();

    // 1. Deploy Tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    usdc = (await MockERC20Factory.deploy("USD Coin", "USDC", 18)) as unknown as MockERC20;
    await usdc.waitForDeployment();

    ctc = (await MockERC20Factory.deploy("Creditcoin Token", "CTC", 18)) as unknown as MockERC20;
    await ctc.waitForDeployment();

    // 2. Deploy MockBlockProver
    const MockBlockProverFactory = await ethers.getContractFactory("MockBlockProver");
    mockProver = (await MockBlockProverFactory.deploy()) as unknown as MockBlockProver;
    await mockProver.waitForDeployment();

    // 3. Deploy xCredenceHub
    const xCredenceHubFactory = await ethers.getContractFactory("xCredenceHub");
    hub = (await xCredenceHubFactory.deploy(await mockProver.getAddress())) as unknown as xCredenceHub;
    await hub.waitForDeployment();

    // 3b. Deploy MockChainInfo and wire it (canonical 0x0FD3 emulation)
    const MockChainInfoFactory = await ethers.getContractFactory("MockChainInfo");
    mockChainInfo = (await MockChainInfoFactory.deploy()) as unknown as MockChainInfo;
    await mockChainInfo.waitForDeployment();
    await hub.setChainInfo(await mockChainInfo.getAddress());

    // 4. Deploy xCredenceLendingPool
    const xCredenceLendingPoolFactory = await ethers.getContractFactory("xCredenceLendingPool");
    pool = (await xCredenceLendingPoolFactory.deploy(await hub.getAddress())) as unknown as xCredenceLendingPool;
    await pool.waitForDeployment();

    // 5. Deploy AIRiskSentinel
    const AIRiskSentinelFactory = await ethers.getContractFactory("AIRiskSentinel");
    sentinel = (await AIRiskSentinelFactory.deploy(await hub.getAddress(), await pool.getAddress())) as unknown as AIRiskSentinel;
    await sentinel.waitForDeployment();

    // 6. Connect Hub, Pool, and Sentinel
    await hub.setLendingPool(await pool.getAddress());
    await hub.setAIRiskSentinel(await sentinel.getAddress());
    await pool.setAIRiskSentinel(await sentinel.getAddress());

    // 7. Configure Reserves: USDC at $1.00, CTC at $2.00
    await pool.configureReserve(await usdc.getAddress(), true, ethers.parseUnits("1.0", 18));
    await pool.configureReserve(await ctc.getAddress(), true, ethers.parseUnits("2.0", 18));

    // 8. Distribute Tokens
    await usdc.mint(lpSupplier.address, ethers.parseUnits("100000", 18));
    await ctc.mint(borrower.address, ethers.parseUnits("10000", 18));
    await usdc.mint(liquidator.address, ethers.parseUnits("50000", 18));

    // 9. LP supplies liquidity
    await usdc.connect(lpSupplier).approve(await pool.getAddress(), ethers.MaxUint256);
    await pool.connect(lpSupplier).supply(await usdc.getAddress(), ethers.parseUnits("50000", 18));
  });


  const SEPOLIA_CHAIN_KEY = 1n;
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

  /** Submits a canonical proof; the Hub decodes repayment facts trustlessly. */
  async function submitCanonicalRepayment(amountUSD: bigint, seed: string) {
    const height = BigInt(6_000_000 + Math.floor(Math.random() * 1000));
    const encodedTransaction = buildEncodedTransaction(amountUSD, seed);
    const merkleProof = {
      root: ethers.keccak256(ethers.toUtf8Bytes(`digest-${seed}-${height}`)),
      siblings: [
        { hash: ethers.keccak256(ethers.toUtf8Bytes(`sib-${seed}-a`)), isLeft: true },
        { hash: ethers.keccak256(ethers.toUtf8Bytes(`sib-${seed}-b`)), isLeft: false },
      ],
    };
    const continuityProof = {
      lowerEndpointDigest: ethers.keccak256(ethers.toUtf8Bytes(`anchor-${height}`)),
      roots: [ethers.keccak256(ethers.toUtf8Bytes(`cont-${seed}`))],
    };
    return hub.verifyAndProcessCanonicalProof(
      SEPOLIA_CHAIN_KEY,
      height,
      encodedTransaction,
      merkleProof,
      continuityProof
    );
  }

  it("should allow UNVERIFIED borrower to borrow up to 50% LTV", async function () {
    const collateralAmount = ethers.parseUnits("1000", 18); // 1,000 CTC = $2,000 collateral
    await ctc.connect(borrower).approve(await pool.getAddress(), collateralAmount);

    // Max allowed borrow for 50% LTV = $1,000 USDC
    const borrowAmount = ethers.parseUnits("1000", 18);

    const tx = await pool.connect(borrower).borrow(
      await ctc.getAddress(),
      collateralAmount,
      await usdc.getAddress(),
      borrowAmount,
      30 // 30 days
    );
    await tx.wait();

    const borrowerBalance = await usdc.balanceOf(borrower.address);
    expect(borrowerBalance).to.equal(borrowAmount);
  });

  it("should reject loan when requested amount exceeds dynamic LTV limit", async function () {
    const collateralAmount = ethers.parseUnits("1000", 18); // $2,000 collateral
    await ctc.connect(borrower).approve(await pool.getAddress(), collateralAmount);

    // UNVERIFIED borrower cannot borrow $1,500 on $2,000 collateral (75% > 50%)
    const excessiveBorrow = ethers.parseUnits("1500", 18);

    await expect(
      pool.connect(borrower).borrow(
        await ctc.getAddress(),
        collateralAmount,
        await usdc.getAddress(),
        excessiveBorrow,
        30
      )
    ).to.be.revertedWith("Requested borrow exceeds dynamic Attested LTV limit");
  });

  it("should unlock 85% LTV after Attestcoin proof attestation elevates borrower to GOLD tier", async function () {
    // Borrower proves $15,000 in past repayments on Sepolia via Attestcoin
    const repaymentAmount = ethers.parseUnits("15000", 18);
    for (let i = 0; i < 8; i++) {
      await submitCanonicalRepayment(repaymentAmount, `gold-history-${i}`);
    }

    const profile = await hub.getCreditProfile(borrower.address);
    expect(profile.creditScore).to.be.gte(720n); // GOLD tier

    // Now borrower pledges $2,000 collateral and borrows $1,700 USDC (85% LTV)
    const collateralAmount = ethers.parseUnits("1000", 18); // 1000 CTC = $2000
    const highLtvBorrow = ethers.parseUnits("1700", 18);   // $1700 = 85% LTV

    await ctc.connect(borrower).approve(await pool.getAddress(), collateralAmount);
    await pool.connect(borrower).borrow(
      await ctc.getAddress(),
      collateralAmount,
      await usdc.getAddress(),
      highLtvBorrow,
      30
    );

    const borrowerBalance = await usdc.balanceOf(borrower.address);
    expect(borrowerBalance).to.equal(highLtvBorrow);
  });

  it("should allow full loan repayment and unlock collateral", async function () {
    const collateralAmount = ethers.parseUnits("1000", 18);
    const borrowAmount = ethers.parseUnits("1000", 18);

    await ctc.connect(borrower).approve(await pool.getAddress(), collateralAmount);
    await pool.connect(borrower).borrow(
      await ctc.getAddress(),
      collateralAmount,
      await usdc.getAddress(),
      borrowAmount,
      30
    );

    const loan = await pool.loans(1);
    const totalOwed = loan.totalOwed;

    // Ensure borrower holds enough to cover principal + interest
    await usdc.mint(borrower.address, totalOwed);

    // Borrower approves repayment in USDC
    await usdc.connect(borrower).approve(await pool.getAddress(), totalOwed);
    await pool.connect(borrower).repay(1, totalOwed);

    const updatedLoan = await pool.loans(1);
    expect(updatedLoan.isSettled).to.be.true;
    expect(updatedLoan.totalOwed).to.equal(0n);

    // Borrower received back collateral
    const borrowerCtc = await ctc.balanceOf(borrower.address);
    expect(borrowerCtc).to.equal(ethers.parseUnits("10000", 18));
  });

  it("should support AI Risk Sentinel telemetry and automated liquidation dispatch", async function () {
    // 1. Borrower borrows $1,000 on 1000 CTC ($2,000)
    const collateralAmount = ethers.parseUnits("1000", 18);
    const borrowAmount = ethers.parseUnits("1000", 18);
    await ctc.connect(borrower).approve(await pool.getAddress(), collateralAmount);
    await pool.connect(borrower).borrow(
      await ctc.getAddress(),
      collateralAmount,
      await usdc.getAddress(),
      borrowAmount,
      30
    );

    // 2. CTC collateral price plunges from $2.00 to $0.80 (Collateral = $800, Debt = ~$1,006)
    await pool.setOraclePrice(await ctc.getAddress(), ethers.parseUnits("0.80", 18));

    // 3. AI Sentinel emits risk telemetry
    await sentinel.emitRiskTelemetry(
      borrower.address,
      SEPOLIA_CHAIN_ID,
      8200, // Health factor 0.82 (< 1.05)
      "CRITICAL: Collateral price shock detected on CTC/USD"
    );
    expect(await sentinel.totalAlertsDispatched()).to.equal(1n);

    // 4. Liquidator liquidates position
    const loan = await pool.loans(1);
    await usdc.connect(liquidator).approve(await pool.getAddress(), loan.totalOwed);
    await pool.connect(liquidator).liquidate(1, ethers.keccak256(ethers.toUtf8Bytes("proof-ref-01")));

    const settledLoan = await pool.loans(1);
    expect(settledLoan.isLiquidated).to.be.true;

    // 5. Check credit profile penalty applied
    const profile = await hub.getCreditProfile(borrower.address);
    expect(profile.defaultCount).to.equal(1n);
  });
});
