"use client";

import React, { useState, useEffect } from "react";
import { CreditScoreGauge } from "@/components/CreditScoreGauge";
import { CONTRACT_ADDRESSES, NETWORKS, TIER_CONFIG } from "@/lib/constants";
import {
  fetchLiveCreditProfile,
  fetchUserBalances,
  fetchUserLoans,
  executeBorrow,
  executeRepay,
  connectBrowserWallet,
  CreditProfileData,
  UserLoanData,
  requestFaucetTokens,
  formatTransactionError,
} from "@/lib/web3";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Coins,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/components/Toast";

export default function BorrowPage() {
  const toast = useToast();
  const [userAddress, setUserAddress] = useState<string>("");
  const [profile, setProfile] = useState<CreditProfileData>({
    score: 850,
    tier: 4,
    tierName: "PLATINUM",
    totalRepaidUSD: 22500,
    successfulRepayments: 15,
    lastAttestationTime: 0,
    defaultCount: 0,
    isBlacklisted: false,
    maxLtv: 90,
    discountBps: 300,
  });

  const [balances, setBalances] = useState({ nativeCTC: 0, xUSDC: 0, xCTC: 0 });
  const [loans, setLoans] = useState<UserLoanData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Borrow Form State
  const [collateralToken, setCollateralToken] = useState<"xCTC" | "xUSDC">("xCTC");
  const [borrowToken, setBorrowToken] = useState<"xUSDC" | "xCTC">("xUSDC");
  const [collateralAmount, setCollateralAmount] = useState<string>("500");
  const [borrowAmount, setBorrowAmount] = useState<string>("1000");
  const [durationDays, setDurationDays] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [repayingLoanId, setRepayingLoanId] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const collateralPrice = collateralToken === "xCTC" ? 2.5 : 1.0;
  const borrowPrice = borrowToken === "xUSDC" ? 1.0 : 2.5;

  const collateralValUSD = (parseFloat(collateralAmount) || 0) * collateralPrice;
  const maxBorrowUSD = (collateralValUSD * profile.maxLtv) / 100;
  const maxBorrowTokens = (maxBorrowUSD / borrowPrice).toFixed(2);
  const requestedBorrowUSD = (parseFloat(borrowAmount) || 0) * borrowPrice;
  const currentLtv = collateralValUSD > 0 ? (requestedBorrowUSD / collateralValUSD) * 100 : 0;
  const isLtvValid = currentLtv <= profile.maxLtv && currentLtv > 0;

  const userCollateralBalance = collateralToken === "xCTC" ? balances.xCTC : balances.xUSDC;
  const numCollateral = parseFloat(collateralAmount) || 0;
  const hasInsufficientCollateral = numCollateral > userCollateralBalance;
  const canBorrow = isLtvValid && !hasInsufficientCollateral && numCollateral > 0 && (parseFloat(borrowAmount) || 0) > 0;

  // Base borrow APR (6.00%) minus attested discount
  const effectiveApr = Math.max(2.0, 8.0 - profile.discountBps / 100);

  const loadUserData = async (addr: string) => {
    setIsLoading(true);
    try {
      const [prof, bals, userLoans] = await Promise.all([
        fetchLiveCreditProfile(addr),
        fetchUserBalances(addr),
        fetchUserLoans(addr),
      ]);
      setProfile(prof);
      setBalances(bals);
      setLoans(userLoans);
    } catch (e) {
      console.warn("User load warning:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setUserAddress(accounts[0]);
            setIsDemoMode(false);
            loadUserData(accounts[0]);
          } else {
            setUserAddress("");
            setIsDemoMode(false);
            loadUserData("");
          }
        })
        .catch(() => {
          setUserAddress("");
          setIsDemoMode(false);
          loadUserData("");
        });

      const onAccountsChanged = (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setUserAddress(accounts[0]);
          setIsDemoMode(false);
          loadUserData(accounts[0]);
        } else {
          setUserAddress("");
          setIsDemoMode(false);
          loadUserData("");
        }
      };

      (window as any).ethereum.on("accountsChanged", onAccountsChanged);
      return () => {
        (window as any).ethereum?.removeListener("accountsChanged", onAccountsChanged);
      };
    } else {
      setUserAddress("");
      setIsDemoMode(false);
      loadUserData("");
    }
  }, []);

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);
    setTxHash(null);

    if (!userAddress) {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        setTxError("No Web3 wallet detected. Please install MetaMask to borrow.");
        return;
      }
      try {
        const { address } = await connectBrowserWallet();
        setUserAddress(address);
        await loadUserData(address);
      } catch (err: any) {
        setTxError(formatTransactionError(err));
      }
      return;
    }

    const cTokenAddr = collateralToken === "xCTC" ? CONTRACT_ADDRESSES.xCTC : CONTRACT_ADDRESSES.xUSDC;
    const bTokenAddr = borrowToken === "xUSDC" ? CONTRACT_ADDRESSES.xUSDC : CONTRACT_ADDRESSES.xCTC;

    setIsSubmitting(true);
    try {
      const receipt = await executeBorrow(
        cTokenAddr,
        parseFloat(collateralAmount),
        bTokenAddr,
        parseFloat(borrowAmount),
        durationDays
      );
      setTxHash(receipt.hash);
      toast.success(
        "Borrow Confirmed!",
        `Successfully borrowed ${borrowAmount} ${borrowToken} against ${collateralAmount} ${collateralToken} collateral.`,
        receipt.hash
      );
      await loadUserData(userAddress);
    } catch (err: any) {
      console.error("Borrow execution error:", err);
      const errMsg = formatTransactionError(err);
      setTxError(errMsg);
      toast.error("Borrow Failed", errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepay = async (loan: UserLoanData) => {
    setRepayingLoanId(loan.loanId);
    setTxError(null);
    try {
      const receipt = await executeRepay(loan.loanId, loan.totalOwed, loan.borrowToken);
      setTxHash(receipt.hash);
      toast.success(
        "Loan Repaid!",
        `Settled #${loan.loanId} (${loan.totalOwed.toLocaleString()} ${loan.borrowSymbol}) and released collateral back to your wallet.`,
        receipt.hash
      );
      await loadUserData(userAddress);
    } catch (err: any) {
      console.error("Repay execution error:", err);
      const errMsg = formatTransactionError(err);
      setTxError(errMsg);
      toast.error("Repay Failed", errMsg);
    } finally {
      setRepayingLoanId(null);
    }
  };

  const handleGetFaucetCollateral = async () => {
    if (!userAddress) {
      toast.info("Connect Wallet", "Please connect your wallet first.");
      return;
    }
    try {
      const tokenAddr = collateralToken === "xCTC" ? CONTRACT_ADDRESSES.xCTC : CONTRACT_ADDRESSES.xUSDC;
      const receipt = await requestFaucetTokens(tokenAddr, userAddress, 2000);
      toast.success("Faucet Minted!", `Minted 2,000 ${collateralToken} testnet tokens.`, receipt?.hash);
      await loadUserData(userAddress);
    } catch (e: any) {
      const errMsg = formatTransactionError(e);
      setTxError(errMsg);
      toast.error("Faucet Error", errMsg);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Borrow
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isDemoMode && (
              <span className="text-faint">(demo address) </span>
            )}
            Lock collateral to borrow against your attested credit ·{" "}
            <span className="text-accent">{profile.tierName}</span>{" "}
            <span className="tnum">· {profile.maxLtv}% max LTV</span>
          </p>
        </div>

        <button
          onClick={() => loadUserData(userAddress)}
          className="self-start md:self-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Grid: Form + Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Borrow Terminal Form */}
        <div className="lg:col-span-2 glass-card p-6 sm:p-8 space-y-6">
          <form onSubmit={handleBorrow} className="space-y-6">
            {/* Step 1: Collateral Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                <span>1. Provide Collateral</span>
                <span className={hasInsufficientCollateral ? "text-amber-400 font-bold" : ""}>
                  Balance: {userCollateralBalance.toFixed(2)} {collateralToken}
                  <button
                    type="button"
                    onClick={handleGetFaucetCollateral}
                    className="ml-2 text-accent hover:underline lowercase font-normal"
                  >
                    (+ faucet)
                  </button>
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-2">
                <input
                  type="number"
                  step="any"
                  value={collateralAmount}
                  onChange={(e) => setCollateralAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-grow bg-transparent text-xl sm:text-2xl font-bold font-mono text-white focus:outline-none"
                  required
                />
                {userCollateralBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => setCollateralAmount(userCollateralBalance.toString())}
                    className="text-xs px-2.5 py-1 rounded-lg bg-card hover:bg-surface text-muted-foreground hover:text-white transition-colors font-mono"
                  >
                    MAX
                  </button>
                )}
                <select
                  value={collateralToken}
                  onChange={(e) => {
                    const token = e.target.value as "xCTC" | "xUSDC";
                    setCollateralToken(token);
                    if (token === borrowToken) {
                      setBorrowToken(token === "xCTC" ? "xUSDC" : "xCTC");
                    }
                  }}
                  className="bg-card text-white text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none"
                >
                  <option value="xCTC">xCTC ($2.50)</option>
                  <option value="xUSDC">xUSDC ($1.00)</option>
                </select>
              </div>
              {hasInsufficientCollateral && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <span>
                      Insufficient {collateralToken} balance (You have {userCollateralBalance.toFixed(2)}, need {numCollateral.toFixed(2)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetFaucetCollateral}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-[11px] transition-colors"
                  >
                    Claim 2,000 {collateralToken}
                  </button>
                </div>
              )}
              <div className="text-right text-xs font-mono text-muted-foreground">
                ≈ ${collateralValUSD.toLocaleString()} USD Collateral Value
              </div>
            </div>

            {/* Step 2: Borrow Asset Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                <span>2. Desired Borrow Asset</span>
                <span>Max Allowed: ${maxBorrowUSD.toLocaleString()} ({maxBorrowTokens} {borrowToken})</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-2">
                <input
                  type="number"
                  step="any"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-grow bg-transparent text-xl sm:text-2xl font-bold font-mono text-white focus:outline-none"
                  required
                />
                <select
                  value={borrowToken}
                  onChange={(e) => {
                    const token = e.target.value as "xUSDC" | "xCTC";
                    setBorrowToken(token);
                    if (token === collateralToken) {
                      setCollateralToken(token === "xUSDC" ? "xCTC" : "xUSDC");
                    }
                  }}
                  className="bg-card text-white text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none"
                >
                  <option value="xUSDC">xUSDC ($1.00)</option>
                  <option value="xCTC">xCTC ($2.50)</option>
                </select>
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Current LTV: <strong className={isLtvValid ? "text-emerald-400" : "text-red-400"}>{currentLtv.toFixed(1)}%</strong></span>
                <span>Max Cap: {profile.maxLtv}%</span>
              </div>
            </div>

            {/* Step 3: Loan Duration */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">3. Loan Tenure</span>
              <div className="grid grid-cols-4 gap-2">
                {[7, 14, 30, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDurationDays(days)}
                    className={`py-2 rounded-xl text-xs font-semibold font-mono transition-all ${
                      durationDays === days
                        ? "bg-accent text-background font-bold"
                        : "bg-surface-2 text-muted-foreground hover:text-white"
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Loan Terms Summary */}
            <div className="p-4 rounded-2xl bg-surface-2/60 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Borrow APR:</span>
                <span className="text-white font-semibold">
                  {effectiveApr.toFixed(2)}% <span className="text-emerald-400">(-{profile.discountBps / 100}% discount)</span>
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Interest:</span>
                <span className="text-white font-semibold">
                  {((parseFloat(borrowAmount) || 0) * (effectiveApr / 100) * (durationDays / 365)).toFixed(2)} {borrowToken}
                </span>
              </div>
            </div>

            {/* Notifications */}
            {txHash && (
              <div className="p-4 rounded-2xl bg-positive/10 flex items-center justify-between text-xs font-mono text-positive">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-positive" />
                  <span>Loan Originated on Creditcoin CC3!</span>
                </div>
                <a
                  href={`${NETWORKS.CREDITCOIN_TESTNET.explorer}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:underline text-positive"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {txError && (
              <div className="p-4 rounded-2xl bg-negative/10 flex items-center gap-2 text-xs font-mono text-negative">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{txError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || (userAddress ? !canBorrow : false)}
              className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                !userAddress
                  ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                  : canBorrow
                  ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                  : "bg-surface-2 text-faint cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Confirming On-Chain...</span>
                </>
              ) : !userAddress ? (
                <span>Connect Wallet to Borrow</span>
              ) : hasInsufficientCollateral ? (
                <span>Insufficient {collateralToken} Balance (Use Faucet Above)</span>
              ) : !isLtvValid ? (
                <span>LTV Exceeds {profile.maxLtv}% Limit</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Borrow {borrowAmount} {borrowToken}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Col: compact credit summary */}
        <div className="space-y-6">
          <div className="glass-card p-6 flex flex-col items-center justify-center">
            <CreditScoreGauge score={profile.score} size={180} />
            <div className="mt-4 w-full pt-4 border-t border-hairline space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max LTV</span>
                <span className="tnum text-accent font-bold">{profile.maxLtv}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">APR discount</span>
                <span className="tnum text-positive font-bold">
                  −{(profile.discountBps / 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <details className="group glass-card px-6 py-4">
            <summary className="flex items-center justify-between cursor-pointer list-none text-sm text-muted-foreground">
              Why is my LTV higher than DeFi's 50%?
              <span className="text-faint group-open:rotate-45 transition-transform select-none">+</span>
            </summary>
            <p className="pt-3 pb-1 text-xs leading-relaxed text-muted-foreground">
              Standard protocols require 200% collateral because they cannot see
              your history. Credence verifies repayment receipts from other
              chains through precompile 0x0FD2, and your proven record raises
              your limit, up to 90% LTV at Platinum.
            </p>
          </details>
        </div>
      </div>

      {/* Active Borrowed Positions Table & Repayments */}
      <div className="glass-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-foreground tracking-tight">
              Your Loans & Repayments
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Repay active loans to settle debt, reclaim your locked collateral, and build on-chain credit score.
            </p>
          </div>
          {loans.length > 0 && (
            <span className="text-xs font-mono text-faint">
              {loans.filter((l) => !l.isSettled && !l.isLiquidated).length} active loan{loans.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {loans.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-surface-2/30 space-y-2">
            <Coins className="w-8 h-8 text-faint mx-auto" />
            <p className="text-sm text-muted-foreground">No active loans found for this address.</p>
            <p className="text-xs text-faint font-mono">
              Originate a loan above. Once borrowed, it will appear here with a 1-click Repay button.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-hairline text-muted-foreground uppercase">
                  <th className="pb-3">Loan ID</th>
                  <th className="pb-3">Principal</th>
                  <th className="pb-3">Total Owed</th>
                  <th className="pb-3">Collateral</th>
                  <th className="pb-3">APR</th>
                  <th className="pb-3">Due Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {loans.map((loan) => (
                  <tr key={loan.loanId} className="text-foreground/85">
                    <td className="py-4 font-bold text-white">#{loan.loanId}</td>
                    <td>{loan.principalAmount.toLocaleString()} {loan.borrowSymbol}</td>
                    <td className="text-white font-bold">{loan.totalOwed.toLocaleString()} {loan.borrowSymbol}</td>
                    <td>{loan.collateralAmount.toLocaleString()} {loan.collateralSymbol}</td>
                    <td>{(loan.interestRateBps / 100).toFixed(2)}%</td>
                    <td>{loan.dueDate.toLocaleDateString()}</td>
                    <td>
                      {loan.isSettled ? (
                        <span className="px-2.5 py-1 rounded-full bg-positive/10 text-positive text-[11px] font-medium">
                          Settled
                        </span>
                      ) : loan.isLiquidated ? (
                        <span className="px-2.5 py-1 rounded-full bg-negative/10 text-negative text-[11px] font-medium">
                          Liquidated
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-accent/15 text-accent text-[11px] font-medium">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {!loan.isSettled && !loan.isLiquidated && (
                        <button
                          onClick={() => handleRepay(loan)}
                          disabled={repayingLoanId === loan.loanId}
                          className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {repayingLoanId === loan.loanId ? "Repaying…" : "Repay Loan"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
