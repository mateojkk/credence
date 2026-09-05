"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchLiveCreditProfile,
  fetchUserBalances,
  fetchUserLoans,
  fetchUserSupplies,
  fetchPoolReserves,
  executeRepay,
  executeWithdraw,
  connectBrowserWallet,
  formatTransactionError,
  CreditProfileData,
  UserLoanData,
  PoolReserveData,
} from "@/lib/web3";
import { useToast } from "@/components/Toast";
import { CONTRACT_ADDRESSES, NETWORKS } from "@/lib/constants";
import {
  ArrowRight,
  ArrowUpRight,
  Coins,
  Wallet,
  RefreshCw,
  ExternalLink,
  Plus,
  X,
} from "lucide-react";

const DEFAULT_PROFILE: CreditProfileData = {
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

export default function OverviewPage() {
  const toast = useToast();

  const [userAddress, setUserAddress] = useState<string>("");
  const [profile, setProfile] = useState<CreditProfileData>(DEFAULT_PROFILE);
  const [balances, setBalances] = useState({ nativeCTC: 0, xUSDC: 0, xCTC: 0 });
  const [supplies, setSupplies] = useState({ xUSDC: 0, xCTC: 0 });
  const [loans, setLoans] = useState<UserLoanData[]>([]);
  const [reserves, setReserves] = useState<PoolReserveData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Action states
  const [repayingLoanId, setRepayingLoanId] = useState<number | null>(null);
  const [withdrawModal, setWithdrawModal] = useState<{
    isOpen: boolean;
    token: "xUSDC" | "xCTC";
    amount: string;
  }>({
    isOpen: false,
    token: "xUSDC",
    amount: "",
  });
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) load(accounts[0]);
          else {
            load("");
            setIsLoading(false);
          }
        })
        .catch(() => setIsLoading(false));

      const onAccountsChanged = (accounts: string[]) => {
        if (accounts && accounts.length > 0) load(accounts[0]);
        else {
          setUserAddress("");
          load("");
        }
      };

      (window as any).ethereum.on("accountsChanged", onAccountsChanged);
      return () => {
        (window as any).ethereum?.removeListener("accountsChanged", onAccountsChanged);
      };
    } else {
      load("");
      setIsLoading(false);
    }
  }, []);

  const load = async (addr: string) => {
    setUserAddress(addr);
    setIsLoading(true);
    try {
      const [prof, bals, userSupplies, userLoans, poolReserves] = await Promise.all([
        fetchLiveCreditProfile(addr),
        fetchUserBalances(addr),
        fetchUserSupplies(addr),
        fetchUserLoans(addr),
        fetchPoolReserves(),
      ]);
      setProfile(prof);
      setBalances(bals);
      setSupplies(userSupplies);
      setLoans(userLoans);
      setReserves(poolReserves);
    } catch (e) {
      console.warn("Overview load warning:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      toast.error("Wallet Not Found", "Please install MetaMask or Rabby.");
      return;
    }
    try {
      const { address } = await connectBrowserWallet();
      await load(address);
      toast.info("Wallet Connected", `Connected to ${address.slice(0, 6)}…${address.slice(-4)}`);
    } catch (err: any) {
      toast.error("Connection Failed", formatTransactionError(err));
    }
  };

  // 1-Click Repay from Dashboard
  const handleRepay = async (loan: UserLoanData) => {
    setRepayingLoanId(loan.loanId);
    try {
      const receipt = await executeRepay(loan.loanId, loan.totalOwed, loan.borrowToken);
      toast.success(
        "Loan Repaid Successfully!",
        `Settled #${loan.loanId} (${loan.totalOwed.toLocaleString()} ${loan.borrowSymbol}) and released collateral back to your wallet.`,
        receipt.hash
      );
      await load(userAddress);
    } catch (err: any) {
      console.error("Dashboard repay error:", err);
      toast.error("Repay Failed", formatTransactionError(err));
    } finally {
      setRepayingLoanId(null);
    }
  };

  // Withdraw directly from Dashboard
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokenAddr =
      withdrawModal.token === "xUSDC" ? CONTRACT_ADDRESSES.xUSDC : CONTRACT_ADDRESSES.xCTC;
    const parsedAmount = parseFloat(withdrawModal.amount) || 0;
    const currentSupplied = withdrawModal.token === "xUSDC" ? supplies.xUSDC : supplies.xCTC;

    if (parsedAmount <= 0) {
      toast.error("Invalid Amount", "Please enter an amount greater than zero.");
      return;
    }
    if (parsedAmount > currentSupplied) {
      toast.error("Insufficient Balance", `You only have ${currentSupplied.toFixed(2)} ${withdrawModal.token} supplied.`);
      return;
    }

    setIsWithdrawing(true);
    try {
      const receipt = await executeWithdraw(tokenAddr, parsedAmount);
      toast.success(
        "Withdrawal Confirmed!",
        `Successfully withdrew ${parsedAmount.toLocaleString()} ${withdrawModal.token} to your wallet.`,
        receipt.hash
      );
      setWithdrawModal({ isOpen: false, token: "xUSDC", amount: "" });
      await load(userAddress);
    } catch (err: any) {
      console.error("Dashboard withdraw error:", err);
      toast.error("Withdraw Failed", formatTransactionError(err));
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Financial calculations
  const activeLoans = loans.filter((l) => !l.isSettled && !l.isLiquidated);
  const totalBorrowedUSD = activeLoans.reduce(
    (sum, l) => sum + l.totalOwed * (l.borrowSymbol === "xUSDC" ? 1 : 2.5),
    0
  );
  const totalCollateralLockedUSD = activeLoans.reduce(
    (sum, l) => sum + l.collateralAmount * (l.collateralSymbol === "xUSDC" ? 1 : 2.5),
    0
  );
  const suppliedUSD = supplies.xUSDC * 1.0 + supplies.xCTC * 2.5;
  const netPortfolioUSD = suppliedUSD + totalCollateralLockedUSD - totalBorrowedUSD;

  const usdcReserve = reserves.find((r) => r.symbol === "xUSDC");
  const ctcReserve = reserves.find((r) => r.symbol === "xCTC");

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-medium tracking-tight text-foreground">
              Portfolio Command Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-positive/10 text-positive text-xs font-mono">
              Creditcoin CC3
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {userAddress ? (
              <span className="flex items-center gap-2">
                <span>Account:</span>
                <span className="text-foreground">
                  {userAddress.slice(0, 10)}…{userAddress.slice(-8)}
                </span>
                <a
                  href={`${NETWORKS.CREDITCOIN_TESTNET.explorer}/address/${userAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </span>
            ) : (
              "Connect wallet to manage your sovereign credit and active positions."
            )}
          </p>
        </div>

        {/* Quick actions top rail */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => load(userAddress)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 text-xs text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            title="Refresh on-chain data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Data</span>
          </button>

          {userAddress ? (
            <Link
              href={`/check?address=${userAddress}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-2 text-xs text-accent hover:bg-surface-2/80 transition-all font-mono"
            >
              <span>Scan Credit</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          ) : (
            <button
              onClick={handleConnect}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </header>

      {!userAddress && !isLoading ? (
        <section className="glass-card p-12 text-center space-y-4 max-w-xl mx-auto">
          <Wallet className="w-10 h-10 text-accent mx-auto" />
          <h2 className="text-lg font-medium text-foreground">Wallet Not Connected</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Connect your MetaMask or Web3 wallet to manage your borrowed debt, withdraw or supply liquidity,
            and inspect your live on-chain credit score.
          </p>
          <button
            onClick={handleConnect}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-all"
          >
            Connect MetaMask
          </button>
        </section>
      ) : (
        <>
          {/* Top KPI Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Net Portfolio Value */}
            <div className="glass-card p-5 space-y-2">
              <span className="block text-[11px] uppercase tracking-wider font-mono text-faint">
                Net Portfolio Balance
              </span>
              <span className="tnum block text-2xl font-medium text-foreground">
                ${netPortfolioUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="block text-[11px] font-mono text-muted-foreground">
                Assets minus active debt
              </span>
            </div>

            {/* Card 2: Attested Credit Standing */}
            <div className="glass-card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-[11px] uppercase tracking-wider font-mono text-faint">
                  Attested Credit Score
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent/15 text-accent">
                  {profile.tierName}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="tnum text-2xl font-medium text-foreground">
                  {profile.score}
                </span>
                <span className="text-xs font-mono text-muted-foreground">/ 850</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground pt-1">
                <span>Max LTV: <strong className="text-foreground">{profile.maxLtv}%</strong></span>
                <span>Discount: <strong className="text-positive">−{(profile.discountBps / 100).toFixed(2)}%</strong></span>
              </div>
            </div>

            {/* Card 3: Total Supplied Assets */}
            <div className="glass-card p-5 space-y-2">
              <span className="block text-[11px] uppercase tracking-wider font-mono text-faint">
                Total Supplied Assets
              </span>
              <span className="tnum block text-2xl font-medium text-positive">
                ${suppliedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground pt-1">
                <span>{supplies.xUSDC.toFixed(0)} xUSDC</span>
                <span>{supplies.xCTC.toFixed(0)} xCTC</span>
              </div>
            </div>

            {/* Card 4: Active Borrowed Debt */}
            <div className="glass-card p-5 space-y-2">
              <span className="block text-[11px] uppercase tracking-wider font-mono text-faint">
                Active Borrowed Debt
              </span>
              <span className="tnum block text-2xl font-medium text-foreground">
                ${totalBorrowedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground pt-1">
                <span>{activeLoans.length} active loan{activeLoans.length === 1 ? "" : "s"}</span>
                <span>Collateral: ${Math.round(totalCollateralLockedUSD).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Active Borrowed Loans Management */}
          <section className="glass-card p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium text-foreground tracking-tight">
                    Active Borrowed Loans
                  </h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-surface-2 text-faint">
                    {activeLoans.length} open
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage debt positions, check due dates, and execute 1-click repayments to reclaim collateral.
                </p>
              </div>

              <Link
                href="/borrow"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-2 text-xs text-foreground hover:bg-surface-2/80 font-mono transition-all self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-accent" />
                <span>Borrow Capital</span>
              </Link>
            </div>

            {loans.length === 0 ? (
              <div className="text-center py-10 rounded-2xl bg-surface-2/40 space-y-2">
                <Coins className="w-8 h-8 text-faint mx-auto" />
                <p className="text-sm text-foreground font-medium">No Active Loans</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You have no outstanding debt. Borrow up to {profile.maxLtv}% LTV based on your attested reputation.
                </p>
                <div className="pt-2">
                  <Link
                    href="/borrow"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-all"
                  >
                    <span>Originate Loan Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-muted-foreground uppercase text-[11px]">
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
                  <tbody className="divide-y divide-hairline/40">
                    {loans.map((loan) => (
                      <tr key={loan.loanId} className="text-foreground/85 hover:bg-surface-2/30 transition-colors">
                        <td className="py-4 font-medium text-foreground">#{loan.loanId}</td>
                        <td>
                          {loan.principalAmount.toLocaleString()} {loan.borrowSymbol}
                        </td>
                        <td className="text-foreground font-medium">
                          {loan.totalOwed.toLocaleString()} {loan.borrowSymbol}
                        </td>
                        <td>
                          {loan.collateralAmount.toLocaleString()} {loan.collateralSymbol}
                        </td>
                        <td>{(loan.interestRateBps / 100).toFixed(2)}%</td>
                        <td>
                          <span className={loan.isOverdue ? "text-negative font-medium" : "text-muted-foreground"}>
                            {loan.dueDate.toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          {loan.isSettled ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-positive/10 text-positive text-[11px] font-medium">
                              Settled
                            </span>
                          ) : loan.isLiquidated ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-negative/10 text-negative text-[11px] font-medium">
                              Liquidated
                            </span>
                          ) : loan.isOverdue ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-negative/15 text-negative text-[11px] font-medium">
                              Overdue
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-medium">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          {!loan.isSettled && !loan.isLiquidated && (
                            <button
                              onClick={() => handleRepay(loan)}
                              disabled={repayingLoanId === loan.loanId}
                              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
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
          </section>

          {/* Section 2: Supplied Positions Management */}
          <section className="glass-card p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-medium text-foreground tracking-tight">
                  Your Supplied Assets & Yield
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Liquidity supplied to earn borrower interest. Withdraw anytime or deposit more.
                </p>
              </div>

              <Link
                href="/lend"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-2 text-xs text-foreground hover:bg-surface-2/80 font-mono transition-all self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-accent" />
                <span>Deposit Assets</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* xUSDC Supply Card */}
              <div className="p-5 rounded-2xl bg-surface-2/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center font-mono font-medium text-accent">
                      $
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Credence USD (xUSDC)</h3>
                      <span className="text-xs font-mono text-muted-foreground">
                        Pool APY: <strong className="text-positive">{usdcReserve?.supplyApy || 3.4}%</strong>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="tnum text-lg font-medium text-foreground">
                      {supplies.xUSDC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[10px] uppercase font-mono text-faint">
                      ≈ ${(supplies.xUSDC * 1.0).toFixed(2)} USD
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link
                    href="/lend"
                    className="flex-1 py-2 text-center rounded-lg bg-surface text-xs font-mono text-foreground hover:bg-surface-2 transition-colors"
                  >
                    + Supply More
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      setWithdrawModal({
                        isOpen: true,
                        token: "xUSDC",
                        amount: supplies.xUSDC.toString(),
                      })
                    }
                    disabled={supplies.xUSDC <= 0}
                    className="flex-1 py-2 rounded-lg bg-surface-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    Withdraw
                  </button>
                </div>
              </div>

              {/* xCTC Supply Card */}
              <div className="p-5 rounded-2xl bg-surface-2/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center font-mono font-medium text-accent">
                      C
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Credence CTC (xCTC)</h3>
                      <span className="text-xs font-mono text-muted-foreground">
                        Pool APY: <strong className="text-positive">{ctcReserve?.supplyApy || 2.1}%</strong>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="tnum text-lg font-medium text-foreground">
                      {supplies.xCTC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[10px] uppercase font-mono text-faint">
                      ≈ ${(supplies.xCTC * 2.5).toFixed(2)} USD
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link
                    href="/lend"
                    className="flex-1 py-2 text-center rounded-lg bg-surface text-xs font-mono text-foreground hover:bg-surface-2 transition-colors"
                  >
                    + Supply More
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      setWithdrawModal({
                        isOpen: true,
                        token: "xCTC",
                        amount: supplies.xCTC.toString(),
                      })
                    }
                    disabled={supplies.xCTC <= 0}
                    className="flex-1 py-2 rounded-lg bg-surface-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Withdraw Modal for Dashboard */}
      {withdrawModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-foreground">
                Withdraw {withdrawModal.token}
              </h3>
              <button
                onClick={() => setWithdrawModal({ isOpen: false, token: "xUSDC", amount: "" })}
                className="text-faint hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>Amount to Withdraw</span>
                  <span>
                    Supplied:{" "}
                    {withdrawModal.token === "xUSDC"
                      ? `${supplies.xUSDC.toFixed(2)} xUSDC`
                      : `${supplies.xCTC.toFixed(2)} xCTC`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-2 flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={withdrawModal.amount}
                    onChange={(e) =>
                      setWithdrawModal((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="0.00"
                    className="flex-grow bg-transparent text-xl font-mono text-foreground focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setWithdrawModal((prev) => ({
                        ...prev,
                        amount: (prev.token === "xUSDC" ? supplies.xUSDC : supplies.xCTC).toString(),
                      }))
                    }
                    className="px-2.5 py-1 rounded-md bg-card text-[11px] font-mono text-accent hover:bg-surface transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWithdrawModal({ isOpen: false, token: "xUSDC", amount: "" })}
                  className="flex-1 py-2.5 rounded-xl bg-surface-2 text-xs font-mono text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawing}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isWithdrawing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Withdrawing…</span>
                    </>
                  ) : (
                    <span>Confirm Withdraw</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
