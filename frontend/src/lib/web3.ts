import { ethers } from "ethers";
import {
  NETWORKS,
  CONTRACT_ADDRESSES,
  HUB_ABI,
  POOL_ABI,
  ERC20_ABI,
  SENTINEL_ABI,
} from "./constants";

// Read-only JSON-RPC provider (works without wallet connection)
export function getReadProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(NETWORKS.CREDITCOIN_TESTNET.rpcUrl);
}

export interface CreditProfileData {
  score: number;
  tier: number;
  tierName: "UNVERIFIED" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  totalRepaidUSD: number;
  successfulRepayments: number;
  lastAttestationTime: number;
  defaultCount: number;
  isBlacklisted: boolean;
  maxLtv: number;
  discountBps: number;
}

export interface PoolReserveData {
  tokenAddress: string;
  symbol: string;
  name: string;
  totalSupplied: number;
  totalBorrowed: number;
  availableLiquidity: number;
  utilizationRate: number;
  supplyApy: number;
  borrowApr: number;
  oraclePriceUSD: number;
}

export interface UserLoanData {
  loanId: number;
  borrower: string;
  collateralToken: string;
  collateralSymbol: string;
  collateralAmount: number;
  borrowToken: string;
  borrowSymbol: string;
  principalAmount: number;
  totalOwed: number;
  interestRateBps: number;
  borrowedAt: Date;
  dueDate: Date;
  tierAtBorrow: number;
  isSettled: boolean;
  isLiquidated: boolean;
  isOverdue: boolean;
}

export interface ProtocolStatsData {
  totalVerifiedVolumeUSD: number;
  totalProofsVerified: number;
  totalProfilesCreated: number;
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  avgCreditScore: number;
}

// Connect browser wallet (MetaMask / Rabby / Frame)
export async function connectBrowserWallet() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask or Rabby.");
  }

  const provider = new ethers.BrowserProvider((window as any).ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address,
    chainId: Number(network.chainId),
  };
}

// Prompt wallet to add / switch to Creditcoin Testnet (Chain ID 102031)
export async function switchToCreditcoinTestnet(): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) return false;

  try {
    await (window as any).ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: NETWORKS.CREDITCOIN_TESTNET.hexChainId }],
    });
    return true;
  } catch (switchError: any) {
    if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: NETWORKS.CREDITCOIN_TESTNET.hexChainId,
              chainName: NETWORKS.CREDITCOIN_TESTNET.name,
              rpcUrls: [NETWORKS.CREDITCOIN_TESTNET.rpcUrl],
              nativeCurrency: {
                name: "Creditcoin Testnet CTC",
                symbol: "xCTC",
                decimals: 18,
              },
              blockExplorerUrls: [NETWORKS.CREDITCOIN_TESTNET.explorer],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Creditcoin Testnet:", addError);
        return false;
      }
    }
    return false;
  }
}

// Tier name mapping helper
function getTierName(tierNum: number): "UNVERIFIED" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" {
  switch (tierNum) {
    case 1:
      return "BRONZE";
    case 2:
      return "SILVER";
    case 3:
      return "GOLD";
    case 4:
      return "PLATINUM";
    default:
      return "UNVERIFIED";
  }
}

// Fetch live Credit Profile for any address directly from CredenceHub
export async function fetchLiveCreditProfile(userAddress: string): Promise<CreditProfileData> {
  if (!userAddress || !ethers.isAddress(userAddress)) {
    return {
      score: 500,
      tier: 0,
      tierName: "UNVERIFIED",
      totalRepaidUSD: 0,
      successfulRepayments: 0,
      lastAttestationTime: 0,
      defaultCount: 0,
      isBlacklisted: false,
      maxLtv: 50,
      discountBps: 0,
    };
  }
  const provider = getReadProvider();
  const hub = new ethers.Contract(CONTRACT_ADDRESSES.xCredenceHub, HUB_ABI, provider);

  try {
    const [profile, maxLtvBps, discountBps] = await Promise.all([
      hub.getCreditProfile(userAddress),
      hub.getMaxLTVBps(userAddress),
      hub.getInterestDiscountBps(userAddress),
    ]);

    const rawScore = Number(profile.creditScore);
    const score = rawScore === 0 ? 500 : rawScore;
    const tier = Number(profile.tier);

    return {
      score,
      tier,
      tierName: getTierName(tier),
      totalRepaidUSD: Number(ethers.formatEther(profile.totalRepaidUSD)),
      successfulRepayments: Number(profile.successfulRepayments),
      lastAttestationTime: Number(profile.lastAttestationTime),
      defaultCount: Number(profile.defaultCount),
      isBlacklisted: Boolean(profile.isBlacklisted),
      maxLtv: Number(maxLtvBps) / 100, // e.g. 5000 -> 50%
      discountBps: Number(discountBps),
    };
  } catch (err) {
    console.error("Error fetching credit profile:", err);
    return {
      score: 500,
      tier: 0,
      tierName: "UNVERIFIED",
      totalRepaidUSD: 0,
      successfulRepayments: 0,
      lastAttestationTime: 0,
      defaultCount: 0,
      isBlacklisted: false,
      maxLtv: 50,
      discountBps: 0,
    };
  }
}

// Fetch global protocol metrics live from Hub and Lending Pool
export async function fetchProtocolStats(): Promise<ProtocolStatsData> {
  const provider = getReadProvider();
  const hub = new ethers.Contract(CONTRACT_ADDRESSES.xCredenceHub, HUB_ABI, provider);
  const pool = new ethers.Contract(CONTRACT_ADDRESSES.xCredenceLendingPool, POOL_ABI, provider);

  try {
    const [proofs, volume, profiles, usdcReserve, ctcReserve] = await Promise.all([
      hub.totalProofsVerified(),
      hub.totalVerifiedVolumeUSD(),
      hub.totalProfilesCreated(),
      pool.reserves(CONTRACT_ADDRESSES.xUSDC),
      pool.reserves(CONTRACT_ADDRESSES.xCTC),
    ]);

    const suppliedUSDC = Number(ethers.formatEther(usdcReserve.totalSupplied));
    const borrowedUSDC = Number(ethers.formatEther(usdcReserve.totalBorrowed));
    const suppliedCTC = Number(ethers.formatEther(ctcReserve.totalSupplied)) * 2.5; // $2.50 per CTC
    const borrowedCTC = Number(ethers.formatEther(ctcReserve.totalBorrowed)) * 2.5;

    // Derive avg credit score from on-chain volume: base 500 + volume factor (capped 350 pts)
    const avgCreditScore = Number(profiles) > 0
      ? Math.min(850, 500 + Math.floor((Number(ethers.formatEther(volume)) / Math.max(1, Number(profiles))) / 1000 * 15))
      : 500;

    return {
      totalProofsVerified: Number(proofs),
      totalVerifiedVolumeUSD: Number(ethers.formatEther(volume)),
      totalProfilesCreated: Number(profiles),
      totalSuppliedUSD: suppliedUSDC + suppliedCTC,
      totalBorrowedUSD: borrowedUSDC + borrowedCTC,
      avgCreditScore,
    };
  } catch (err) {
    console.error("Error fetching protocol stats:", err);
    return {
      totalProofsVerified: 0,
      totalVerifiedVolumeUSD: 0,
      totalProfilesCreated: 0,
      totalSuppliedUSD: 0,
      totalBorrowedUSD: 0,
      avgCreditScore: 500,
    };
  }
}

// Fetch live reserves for xUSDC and xCTC
export async function fetchPoolReserves(): Promise<PoolReserveData[]> {
  const provider = getReadProvider();
  const pool = new ethers.Contract(CONTRACT_ADDRESSES.xCredenceLendingPool, POOL_ABI, provider);

  const tokens = [
    { address: CONTRACT_ADDRESSES.xUSDC, symbol: "xUSDC", name: "Credence USD", price: 1.0 },
    { address: CONTRACT_ADDRESSES.xCTC, symbol: "xCTC", name: "Credence CTC", price: 2.5 },
  ];

  // Read the real on-chain base borrow rate (contract constant, bps)
  let baseBorrowApr = 8.0;
  try {
    baseBorrowApr = Number(await pool.BASE_BORROW_RATE_BPS()) / 100;
  } catch {}

  const results: PoolReserveData[] = [];

  for (const t of tokens) {
    try {
      const res = await pool.reserves(t.address);
      const supplied = Number(ethers.formatEther(res.totalSupplied));
      const borrowed = Number(ethers.formatEther(res.totalBorrowed));
      const available = Math.max(0, supplied - borrowed);
      const util = supplied > 0 ? (borrowed / supplied) * 100 : 0;
      const supplyApy = (util / 100) * baseBorrowApr * 0.85;

      results.push({
        tokenAddress: t.address,
        symbol: t.symbol,
        name: t.name,
        totalSupplied: supplied,
        totalBorrowed: borrowed,
        availableLiquidity: available,
        utilizationRate: Number(util.toFixed(2)),
        supplyApy: Number(supplyApy.toFixed(2)),
        borrowApr: baseBorrowApr,
        oraclePriceUSD: t.price,
      });
    } catch (err) {
      console.error(`Error reading reserve for ${t.symbol}:`, err);
    }
  }

  return results;
}

// Fetch user token balances (native xCTC, xUSDC, xCTC ERC20)
export async function fetchUserBalances(userAddress: string) {
  if (!userAddress || !ethers.isAddress(userAddress)) {
    return { nativeCTC: 0, xUSDC: 0, xCTC: 0 };
  }
  const provider = getReadProvider();
  const usdc = new ethers.Contract(CONTRACT_ADDRESSES.xUSDC, ERC20_ABI, provider);
  const ctcErc20 = new ethers.Contract(CONTRACT_ADDRESSES.xCTC, ERC20_ABI, provider);

  try {
    const [nativeBal, usdcBal, ctcBal] = await Promise.all([
      provider.getBalance(userAddress),
      usdc.balanceOf(userAddress),
      ctcErc20.balanceOf(userAddress),
    ]);

    return {
      nativeCTC: Number(ethers.formatEther(nativeBal)),
      xUSDC: Number(ethers.formatEther(usdcBal)),
      xCTC: Number(ethers.formatEther(ctcBal)),
    };
  } catch (err) {
    console.error("Error reading balances:", err);
    return { nativeCTC: 0, xUSDC: 0, xCTC: 0 };
  }
}

// Fetch user's supplied balances in the lending pool
export async function fetchUserSupplies(userAddress: string): Promise<{ xUSDC: number; xCTC: number }> {
  if (!userAddress || !ethers.isAddress(userAddress)) {
    return { xUSDC: 0, xCTC: 0 };
  }
  const provider = getReadProvider();
  const pool = new ethers.Contract(CONTRACT_ADDRESSES.xCredenceLendingPool, POOL_ABI, provider);

  try {
    const [usdcSupplied, ctcSupplied] = await Promise.all([
      pool.supplierBalances(CONTRACT_ADDRESSES.xUSDC, userAddress),
      pool.supplierBalances(CONTRACT_ADDRESSES.xCTC, userAddress),
    ]);
    return {
      xUSDC: Number(ethers.formatEther(usdcSupplied)),
      xCTC: Number(ethers.formatEther(ctcSupplied)),
    };
  } catch (err) {
    console.error("Error reading supplies:", err);
    return { xUSDC: 0, xCTC: 0 };
  }
}

// Fetch active loans for an address
export async function fetchUserLoans(userAddress: string): Promise<UserLoanData[]> {
  if (!userAddress || !ethers.isAddress(userAddress)) {
    return [];
  }
  const provider = getReadProvider();
  const pool = new ethers.Contract(CONTRACT_ADDRESSES.xCredenceLendingPool, POOL_ABI, provider);

  try {
    const loanIds: bigint[] = await pool.getUserLoanIds(userAddress);
    const loanPromises = loanIds.map((id) => pool.loans(id));
    const rawLoans = await Promise.all(loanPromises);

    return rawLoans.map((l, index) => {
      const isUSDC = l.borrowToken.toLowerCase() === CONTRACT_ADDRESSES.xUSDC.toLowerCase();
      const isCollateralUSDC = l.collateralToken.toLowerCase() === CONTRACT_ADDRESSES.xUSDC.toLowerCase();
      const dueDate = new Date(Number(l.dueDate) * 1000);
      const isOverdue = dueDate.getTime() < Date.now() && !l.isSettled;

      return {
        loanId: Number(l.loanId || loanIds[index]),
        borrower: l.borrower,
        collateralToken: l.collateralToken,
        collateralSymbol: isCollateralUSDC ? "xUSDC" : "xCTC",
        collateralAmount: Number(ethers.formatEther(l.collateralAmount)),
        borrowToken: l.borrowToken,
        borrowSymbol: isUSDC ? "xUSDC" : "xCTC",
        principalAmount: Number(ethers.formatEther(l.principalAmount)),
        totalOwed: Number(ethers.formatEther(l.totalOwed)),
        interestRateBps: Number(l.interestRateBps),
        borrowedAt: new Date(Number(l.borrowedAt) * 1000),
        dueDate,
        tierAtBorrow: Number(l.tierAtBorrow),
        isSettled: Boolean(l.isSettled),
        isLiquidated: Boolean(l.isLiquidated),
        isOverdue,
      };
    });
  } catch (err) {
    console.error("Error fetching user loans:", err);
    return [];
  }
}

// 1-Click Faucet to mint test tokens (xUSDC / xCTC) for judges to test
export async function requestFaucetTokens(tokenAddress: string, recipientAddress: string, amount: number = 1000) {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Wallet not connected");
  }

  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

  const parsedAmount = ethers.parseUnits(amount.toString(), 18);
  const tx = await token.faucet(recipientAddress, parsedAmount);
  return await tx.wait();
}

// Helper to parse web3 and contract revert errors into clean, user-friendly messages
export function formatTransactionError(err: any): string {
  if (!err) return "Transaction failed";

  const errString = `${err.message || ""} ${err.data || ""} ${err.shortMessage || ""} ${err.reason || ""}`;

  if (
    errString.includes("0xe450d38c") ||
    errString.includes("ERC20InsufficientBalance") ||
    errString.includes("Insufficient collateral balance") ||
    errString.includes("Insufficient token balance")
  ) {
    return err.message && err.message.startsWith("Insufficient")
      ? err.message
      : "Insufficient token balance to complete this transaction. Please claim testnet tokens from the faucet.";
  }

  if (
    errString.includes("0xfb8f41b2") ||
    errString.includes("ERC20InsufficientAllowance")
  ) {
    return "Insufficient token allowance. Please approve the protocol to spend your tokens.";
  }

  if (
    err.code === "ACTION_REJECTED" ||
    err.code === 4001 ||
    errString.includes("user rejected") ||
    errString.includes("denied transaction signature")
  ) {
    return "Transaction was canceled in your wallet.";
  }

  if (errString.includes("Requested borrow exceeds dynamic Attested LTV limit")) {
    return "Borrow amount exceeds your dynamic Attested LTV limit. Provide more collateral or reduce the borrow amount.";
  }

  if (errString.includes("Insufficient liquidity in reserve")) {
    return "The lending pool currently does not have enough liquidity for this borrow amount.";
  }

  if (errString.includes("Zero amount")) {
    return "Amount must be greater than zero.";
  }

  if (err.reason) return err.reason;
  if (err.shortMessage) return err.shortMessage;
  if (err.message) {
    const cleanMsg = err.message.split("(action=")[0].replace(/execution reverted:? /i, "").trim();
    if (cleanMsg && cleanMsg.length < 120 && !cleanMsg.includes("{")) {
      return cleanMsg;
    }
  }

  return "Transaction failed. Please check your token balance and try again.";
}

// Execute on-chain borrow
export async function executeBorrow(
  collateralToken: string,
  collateralAmount: number,
  borrowToken: string,
  borrowAmount: number,
  durationDays: number = 30
) {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Wallet not connected");
  }

  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();

  const collateralContract = new ethers.Contract(collateralToken, ERC20_ABI, signer);
  const poolContract = new ethers.Contract(CONTRACT_ADDRESSES.xCredenceLendingPool, POOL_ABI, signer);

  const parsedCollateral = ethers.parseUnits(collateralAmount.toString(), 18);
  const parsedBorrow = ethers.parseUnits(borrowAmount.toString(), 18);

  // Check collateral balance first
  const userBalance = await collateralContract.balanceOf(userAddress);
  if (userBalance < parsedCollateral) {
    const symbol = collateralToken.toLowerCase() === CONTRACT_ADDRESSES.xCTC.toLowerCase() ? "xCTC" : "xUSDC";
    throw new Error(
      `Insufficient ${symbol} balance. You need ${collateralAmount} ${symbol}, but only have ${Number(ethers.formatEther(userBalance)).toFixed(2)} ${symbol}. Please click (+ faucet) to claim test tokens.`
    );
  }

  // Check and approve collateral
  const allowance = await collateralContract.allowance(
    userAddress,
    CONTRACT_ADDRESSES.xCredenceLendingPool
  );

  if (allowance < parsedCollateral) {
    const approveTx = await collateralContract.approve(
      CONTRACT_ADDRESSES.xCredenceLendingPool,
      ethers.MaxUint256
    );
    await approveTx.wait();
  }

  // Execute borrow
  const borrowTx = await poolContract.borrow(
    collateralToken,
    parsedCollateral,
    borrowToken,
    parsedBorrow,
    BigInt(durationDays)
  );

  return await borrowTx.wait();
}

// Execute on-chain repayment
export async function executeRepay(loanId: number, amount: number, borrowTokenAddress: string) {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Wallet not connected");
  }

  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();

  const tokenContract = new ethers.Contract(borrowTokenAddress, ERC20_ABI, signer);
  const poolContract = new ethers.Contract(CONTRACT_ADDRESSES.xCredenceLendingPool, POOL_ABI, signer);

  const parsedAmount = ethers.parseUnits(amount.toString(), 18);

  // Check repayment balance
  const userBalance = await tokenContract.balanceOf(userAddress);
  if (userBalance < parsedAmount) {
    const symbol = borrowTokenAddress.toLowerCase() === CONTRACT_ADDRESSES.xUSDC.toLowerCase() ? "xUSDC" : "xCTC";
    throw new Error(
      `Insufficient ${symbol} balance for repayment. You need ${amount.toFixed(2)} ${symbol}, but only have ${Number(ethers.formatEther(userBalance)).toFixed(2)} ${symbol}.`
    );
  }

  // Approve repayment token
  const allowance = await tokenContract.allowance(
    userAddress,
    CONTRACT_ADDRESSES.xCredenceLendingPool
  );

  if (allowance < parsedAmount) {
    const approveTx = await tokenContract.approve(
      CONTRACT_ADDRESSES.xCredenceLendingPool,
      ethers.MaxUint256
    );
    await approveTx.wait();
  }

  const repayTx = await poolContract.repay(BigInt(loanId), parsedAmount);
  return await repayTx.wait();
}

// Execute on-chain liquidity supply
export async function executeSupply(tokenAddress: string, amount: number) {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Wallet not connected");
  }

  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();

  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const pool = new ethers.Contract(CONTRACT_ADDRESSES.xCredenceLendingPool, POOL_ABI, signer);

  const parsedAmount = ethers.parseUnits(amount.toString(), 18);

  // Check supply balance
  const userBalance = await token.balanceOf(userAddress);
  if (userBalance < parsedAmount) {
    const symbol = tokenAddress.toLowerCase() === CONTRACT_ADDRESSES.xUSDC.toLowerCase() ? "xUSDC" : "xCTC";
    throw new Error(
      `Insufficient ${symbol} balance. You need ${amount} ${symbol}, but only have ${Number(ethers.formatEther(userBalance)).toFixed(2)} ${symbol}. Please use the faucet to claim testnet tokens.`
    );
  }

  const allowance = await token.allowance(
    userAddress,
    CONTRACT_ADDRESSES.xCredenceLendingPool
  );

  if (allowance < parsedAmount) {
    const approveTx = await token.approve(
      CONTRACT_ADDRESSES.xCredenceLendingPool,
      ethers.MaxUint256
    );
    await approveTx.wait();
  }

  const supplyTx = await pool.supply(tokenAddress, parsedAmount);
  return await supplyTx.wait();
}

// Execute on-chain liquidity withdraw
export async function executeWithdraw(tokenAddress: string, amount: number) {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Wallet not connected");
  }

  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const pool = new ethers.Contract(CONTRACT_ADDRESSES.xCredenceLendingPool, POOL_ABI, signer);

  const parsedAmount = ethers.parseUnits(amount.toString(), 18);
  const withdrawTx = await pool.withdraw(tokenAddress, parsedAmount);
  return await withdrawTx.wait();
}

// Submit a canonical Attestcoin proof directly to CredenceHub on Creditcoin Testnet.
// Proofs are validated natively by precompile 0x0FD2 after ChainInfo (0x0FD3)
// confirms the source block attestation. Fabricated proofs will be rejected.
export async function submitCrossChainProof(
  chainKey: number,
  height: number,
  encodedTransaction: string,
  merkleProof: { blockDigest: string; siblings: { hash: string; isLeft: boolean }[] },
  continuityProof: { anchorHash: string; proofHashes: string[] }
) {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Wallet not connected");
  }

  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const hub = new ethers.Contract(CONTRACT_ADDRESSES.xCredenceHub, HUB_ABI, signer);

  const tx = await hub.verifyAndProcessCanonicalProof(
    chainKey,
    height,
    encodedTransaction,
    [merkleProof.blockDigest, merkleProof.siblings],
    [continuityProof.anchorHash, continuityProof.proofHashes]
  );
  return await tx.wait();
}

// Request browser wallet to track the ERC-20 token (MetaMask, Rabby, etc.)
export async function addTokenToWallet(tokenAddress: string, symbol: string, decimals: number = 18) {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Wallet not connected");
  }
  return await (window as any).ethereum.request({
    method: "wallet_watchAsset",
    params: {
      type: "ERC20",
      options: {
        address: tokenAddress,
        symbol: symbol,
        decimals: decimals,
      },
    },
  });
}
