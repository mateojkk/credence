"use client";

import React, { useState, useEffect } from "react";
import { CONTRACT_ADDRESSES, NETWORKS } from "@/lib/constants";
import {
  fetchPoolReserves,
  fetchUserBalances,
  fetchUserSupplies,
  executeSupply,
  executeWithdraw,
  connectBrowserWallet,
  requestFaucetTokens,
  formatTransactionError,
  PoolReserveData,
} from "@/lib/web3";
import { useToast } from "@/components/Toast";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Droplet,
  RefreshCw,
} from "lucide-react";

export default function LendPage() {
  const toast = useToast();

  const [reserves, setReserves] = useState<PoolReserveData[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState(true);

  const [userAddress, setUserAddress] = useState<string>("");
  const [balances, setBalances] = useState({ nativeCTC: 0, xUSDC: 0, xCTC: 0 });
  const [supplies, setSupplies] = useState({ xUSDC: 0, xCTC: 0 });

  const [selectedToken, setSelectedToken] = useState<"xUSDC" | "xCTC">("xUSDC");
  const [amount, setAmount] = useState<string>("500");
  const [mode, setMode] = useState<"supply" | "withdraw">("supply");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);

  const loadData = async (addr: string) => {
    setIsLoadingPools(true);
    try {
      const [res, bals, userSupp] = await Promise.all([
        fetchPoolReserves(),
        fetchUserBalances(addr),
        fetchUserSupplies(addr),
      ]);
      setReserves(res);
      setBalances(bals);
      setSupplies(userSupp);
    } catch (e) {
      console.warn("Pool data fetch error:", e);
    } finally {
      setIsLoadingPools(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setUserAddress(accounts[0]);
            loadData(accounts[0]);
          } else {
            setUserAddress("");
            loadData("");
          }
        })
        .catch(() => {
          loadData("");
        });

      const onAccountsChanged = (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setUserAddress(accounts[0]);
          loadData(accounts[0]);
        } else {
          setUserAddress("");
          loadData("");
        }
      };

      (window as any).ethereum.on("accountsChanged", onAccountsChanged);
      return () => {
        (window as any).ethereum?.removeListener("accountsChanged", onAccountsChanged);
      };
    } else {
      loadData("");
    }
  }, []);

  const tokenAddr = selectedToken === "xUSDC" ? CONTRACT_ADDRESSES.xUSDC : CONTRACT_ADDRESSES.xCTC;
  const activeReserve = reserves.find((r) => r.symbol === selectedToken);
  const userSuppliedForSelected = selectedToken === "xUSDC" ? supplies.xUSDC : supplies.xCTC;
  const userBalanceForSelected = selectedToken === "xUSDC" ? balances.xUSDC : balances.xCTC;

  const totalSuppliedUSD = supplies.xUSDC * 1.0 + supplies.xCTC * 2.5;
  const usdcReserve = reserves.find((r) => r.symbol === "xUSDC");
  const ctcReserve = reserves.find((r) => r.symbol === "xCTC");

  // Calculate blended supply APY
  const blendedApy =
    totalSuppliedUSD > 0
      ? (
          ((supplies.xUSDC * (usdcReserve?.supplyApy || 0)) +
            (supplies.xCTC * 2.5 * (ctcReserve?.supplyApy || 0))) /
          totalSuppliedUSD
        ).toFixed(2)
      : (usdcReserve?.supplyApy || 3.4).toFixed(2);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userAddress) {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        toast.error("Wallet Not Found", "Please install MetaMask or Rabby to supply liquidity.");
        return;
      }
      try {
        const { address } = await connectBrowserWallet();
        setUserAddress(address);
        await loadData(address);
        toast.info("Wallet Connected", `Connected to ${address.slice(0, 6)}…${address.slice(-4)}`);
      } catch (err: any) {
        toast.error("Connection Failed", formatTransactionError(err));
      }
      return;
    }

    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) {
      toast.error("Invalid Amount", "Please enter an amount greater than zero.");
      return;
    }

    if (mode === "supply" && parsedAmount > userBalanceForSelected) {
      toast.error(
        "Insufficient Balance",
        `You only have ${userBalanceForSelected.toFixed(2)} ${selectedToken}. Claim testnet tokens from the faucet.`
      );
      return;
    }

    if (mode === "withdraw" && parsedAmount > userSuppliedForSelected) {
      toast.error(
        "Insufficient Supplied Balance",
        `You have ${userSuppliedForSelected.toFixed(2)} ${selectedToken} supplied in this pool.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "supply") {
        const receipt = await executeSupply(tokenAddr, parsedAmount);
        toast.success(
          "Deposit Confirmed!",
          `Successfully supplied ${parsedAmount.toLocaleString()} ${selectedToken} to earn ${activeReserve?.supplyApy || 0}% APY.`,
          receipt.hash
        );
      } else {
        const receipt = await executeWithdraw(tokenAddr, parsedAmount);
        toast.success(
          "Withdrawal Confirmed!",
          `Successfully withdrew ${parsedAmount.toLocaleString()} ${selectedToken} back to your wallet.`,
          receipt.hash
        );
      }
      await loadData(userAddress);
    } catch (err: any) {
      console.error("Pool interaction error:", err);
      toast.error("Transaction Reverted", formatTransactionError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFaucet = async (tokenSymbol: "xUSDC" | "xCTC") => {
    if (!userAddress) {
      toast.info("Connect Wallet", "Connect your wallet to claim testnet tokens.");
      return;
    }
    setFaucetLoading(true);
    try {
      const targetAddr = tokenSymbol === "xUSDC" ? CONTRACT_ADDRESSES.xUSDC : CONTRACT_ADDRESSES.xCTC;
      const receipt = await requestFaucetTokens(targetAddr, userAddress, 1000);
      toast.success(
        "Faucet Claimed!",
        `Minted 1,000 ${tokenSymbol} testnet tokens to your address.`,
        receipt?.hash
      );
      await loadData(userAddress);
    } catch (err: any) {
      toast.error("Faucet Error", formatTransactionError(err));
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleSetPercent = (pct: number) => {
    const maxVal = mode === "supply" ? userBalanceForSelected : userSuppliedForSelected;
    const computed = (maxVal * (pct / 100)).toFixed(2);
    setAmount(computed);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header & Faucet Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-foreground">
              Supply Markets
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-positive/10 text-positive text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
              CC3 Testnet
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Deposit assets to provide cross-chain lending liquidity and earn yield from verified borrower repayments.
          </p>
        </div>

        {/* Testnet faucets */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleFaucet("xUSDC")}
            disabled={faucetLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-2 text-xs text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            title="Claim 1,000 xUSDC testnet tokens"
          >
            <Droplet className="w-3.5 h-3.5 text-accent" />
            <span className="font-mono font-medium">+1,000 xUSDC</span>
          </button>

          <button
            onClick={() => handleFaucet("xCTC")}
            disabled={faucetLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-2 text-xs text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            title="Claim 1,000 xCTC testnet tokens"
          >
            <Droplet className="w-3.5 h-3.5 text-accent" />
            <span className="font-mono font-medium">+1,000 xCTC</span>
          </button>
        </div>
      </div>

      {/* Your Active Supply Positions Summary */}
      <div className="glass-card p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-medium text-foreground tracking-tight">
              Your Supplied Positions
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live deposits earning interest inside the Credence Lending Pool on Creditcoin.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-surface-2 px-3 py-1.5 rounded-xl">
              <span className="text-muted-foreground">Total Supplied: </span>
              <span className="text-foreground font-medium tnum">
                ${totalSuppliedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-surface-2 px-3 py-1.5 rounded-xl">
              <span className="text-muted-foreground">Blended APY: </span>
              <span className="text-positive font-medium tnum">{blendedApy}%</span>
            </div>
          </div>
        </div>

        {/* Position Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* xUSDC Position */}
          <div className="p-5 rounded-2xl bg-surface-2/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center font-mono font-medium text-accent">
                  $
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">Credence USD (xUSDC)</h3>
                  <span className="text-xs font-mono text-muted-foreground">$1.00 USD</span>
                </div>
              </div>
              <div className="text-right">
                <span className="tnum text-lg font-medium text-positive">
                  {usdcReserve?.supplyApy || 3.4}%
                </span>
                <span className="block text-[10px] uppercase font-mono text-faint">Supply APY</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono">
              <div>
                <span className="text-muted-foreground block text-[11px]">Your Supplied Balance</span>
                <span className="text-foreground font-medium tnum text-sm">
                  {supplies.xUSDC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} xUSDC
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Wallet Available</span>
                <span className="text-muted-foreground tnum text-sm">
                  {balances.xUSDC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} xUSDC
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedToken("xUSDC");
                  setMode("supply");
                  setAmount("500");
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  selectedToken === "xUSDC" && mode === "supply"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                + Supply More
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedToken("xUSDC");
                  setMode("withdraw");
                  setAmount(supplies.xUSDC.toString());
                }}
                disabled={supplies.xUSDC <= 0}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all disabled:opacity-40 ${
                  selectedToken === "xUSDC" && mode === "withdraw"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* xCTC Position */}
          <div className="p-5 rounded-2xl bg-surface-2/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center font-mono font-medium text-accent">
                  C
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">Credence CTC (xCTC)</h3>
                  <span className="text-xs font-mono text-muted-foreground">$2.50 USD</span>
                </div>
              </div>
              <div className="text-right">
                <span className="tnum text-lg font-medium text-positive">
                  {ctcReserve?.supplyApy || 2.1}%
                </span>
                <span className="block text-[10px] uppercase font-mono text-faint">Supply APY</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono">
              <div>
                <span className="text-muted-foreground block text-[11px]">Your Supplied Balance</span>
                <span className="text-foreground font-medium tnum text-sm">
                  {supplies.xCTC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} xCTC
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Wallet Available</span>
                <span className="text-muted-foreground tnum text-sm">
                  {balances.xCTC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} xCTC
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedToken("xCTC");
                  setMode("supply");
                  setAmount("500");
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  selectedToken === "xCTC" && mode === "supply"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                + Supply More
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedToken("xCTC");
                  setMode("withdraw");
                  setAmount(supplies.xCTC.toString());
                }}
                disabled={supplies.xCTC <= 0}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all disabled:opacity-40 ${
                  selectedToken === "xCTC" && mode === "withdraw"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Markets vs Supply Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Pool Market Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground tracking-tight">
              All Lending Pools
            </h2>
            <button
              onClick={() => loadData(userAddress)}
              disabled={isLoadingPools}
              className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingPools ? "animate-spin" : ""}`} />
              <span>Refresh Pools</span>
            </button>
          </div>

          {isLoadingPools ? (
            <div className="glass-card p-12 text-center text-sm font-mono text-faint">
              Querying Creditcoin CC3 on-chain pool reserves…
            </div>
          ) : reserves.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm font-mono text-negative">
              Failed to load pool reserves from Creditcoin Testnet.
            </div>
          ) : (
            <div className="space-y-4">
              {reserves.map((res) => {
                const isSelected = selectedToken === res.symbol;
                return (
                  <div
                    key={res.symbol}
                    onClick={() => setSelectedToken(res.symbol as "xUSDC" | "xCTC")}
                    className={`glass-card p-6 space-y-4 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-surface-2/90 shadow-lg shadow-black/40"
                        : "hover:bg-surface-2/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-base font-medium font-mono text-foreground">
                          {res.symbol === "xUSDC" ? "$" : "C"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-medium text-foreground">{res.name}</h3>
                            <span className="text-[11px] font-mono text-faint uppercase px-2 py-0.5 rounded-md bg-surface">
                              {res.symbol}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">
                            Oracle Price: ${res.oraclePriceUSD.toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="tnum text-2xl font-medium text-positive">
                          {res.supplyApy}%
                        </span>
                        <span className="block text-[10px] uppercase tracking-wider font-mono text-faint">
                          Supply APY
                        </span>
                      </div>
                    </div>

                    {/* Stat Badges */}
                    <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface/80 text-xs font-mono">
                      <div>
                        <span className="text-faint block text-[11px]">Total Supplied</span>
                        <span className="text-foreground font-medium tnum">
                          {res.totalSupplied.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-faint block text-[11px]">Total Borrowed</span>
                        <span className="text-foreground font-medium tnum">
                          {res.totalBorrowed.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-faint block text-[11px]">Utilization</span>
                        <span className="text-accent font-medium tnum">
                          {res.utilizationRate}%
                        </span>
                      </div>
                    </div>

                    {/* Utilization Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full h-2 rounded-full bg-background overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            res.utilizationRate > 80
                              ? "bg-amber-400"
                              : res.utilizationRate > 50
                              ? "bg-accent"
                              : "bg-positive"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(4, res.utilizationRate))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                        <span>Available: {res.availableLiquidity.toLocaleString()} {res.symbol}</span>
                        <span>Base Borrow APR: {res.borrowApr}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Supply / Withdraw Action Terminal */}
        <div className="lg:col-span-5 glass-card p-6 sm:p-7 space-y-6 sticky top-24">
          {/* Mode Switch Tabs */}
          <div className="flex p-1 rounded-xl bg-surface-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setMode("supply")}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "supply"
                  ? "bg-card text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Deposit / Supply</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("withdraw")}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "withdraw"
                  ? "bg-card text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>

          <form onSubmit={handleAction} className="space-y-5">
            {/* Asset Selector Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground uppercase flex items-center justify-between">
                <span>Select Pool Asset</span>
                <span className="text-faint">
                  {mode === "supply" ? "Wallet" : "Supplied"}:{" "}
                  <span className="text-foreground font-medium">
                    {mode === "supply"
                      ? `${userBalanceForSelected.toFixed(2)} ${selectedToken}`
                      : `${userSuppliedForSelected.toFixed(2)} ${selectedToken}`}
                  </span>
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedToken("xUSDC")}
                  className={`p-3 rounded-xl flex items-center gap-2.5 transition-all ${
                    selectedToken === "xUSDC"
                      ? "bg-surface-2 text-foreground shadow-sm"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-surface-2/60"
                  }`}
                >
                  <span className="w-6 h-6 rounded-md bg-surface flex items-center justify-center font-mono text-xs text-accent">
                    $
                  </span>
                  <div className="text-left font-mono">
                    <span className="block text-xs font-medium">xUSDC</span>
                    <span className="block text-[10px] text-faint">
                      {mode === "supply" ? `${balances.xUSDC.toFixed(0)} avail` : `${supplies.xUSDC.toFixed(0)} supp`}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedToken("xCTC")}
                  className={`p-3 rounded-xl flex items-center gap-2.5 transition-all ${
                    selectedToken === "xCTC"
                      ? "bg-surface-2 text-foreground shadow-sm"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-surface-2/60"
                  }`}
                >
                  <span className="w-6 h-6 rounded-md bg-surface flex items-center justify-center font-mono text-xs text-accent">
                    C
                  </span>
                  <div className="text-left font-mono">
                    <span className="block text-xs font-medium">xCTC</span>
                    <span className="block text-[10px] text-faint">
                      {mode === "supply" ? `${balances.xCTC.toFixed(0)} avail` : `${supplies.xCTC.toFixed(0)} supp`}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Amount to {mode === "supply" ? "Deposit" : "Withdraw"}</span>
                <span className="text-[11px] text-faint">
                  ≈ ${(parseFloat(amount || "0") * (selectedToken === "xUSDC" ? 1.0 : 2.5)).toFixed(2)} USD
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-2 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-grow bg-transparent text-2xl font-medium font-mono text-foreground focus:outline-none placeholder:text-faint"
                    required
                  />
                  <span className="font-mono text-sm font-medium text-foreground px-2.5 py-1 rounded-lg bg-card">
                    {selectedToken}
                  </span>
                </div>

                {/* Percentage Presets */}
                <div className="flex items-center gap-1.5 mt-3 pt-2.5 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSetPercent(25)}
                    className="flex-1 py-1 rounded-md bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPercent(50)}
                    className="flex-1 py-1 rounded-md bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPercent(75)}
                    className="flex-1 py-1 rounded-md bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPercent(100)}
                    className="flex-1 py-1 rounded-md bg-primary/10 text-accent font-medium hover:bg-primary/20 transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>
            </div>

            {/* Impact Details Preview */}
            <div className="p-4 rounded-xl bg-surface space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pool Supply APY</span>
                <span className="tnum text-positive font-medium">{activeReserve?.supplyApy || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {mode === "supply" ? "Est. 30-Day Yield" : "Remaining Supplied"}
                </span>
                <span className="tnum text-foreground">
                  {mode === "supply"
                    ? `+${((parseFloat(amount || "0") * (activeReserve?.supplyApy || 0)) / 100 / 12).toFixed(2)} ${selectedToken}`
                    : `${Math.max(0, userSuppliedForSelected - (parseFloat(amount) || 0)).toFixed(2)} ${selectedToken}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network Settlement</span>
                <span className="text-accent">Creditcoin CC3 (Instant)</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-black/20"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Settling On Creditcoin CC3…</span>
                </>
              ) : !userAddress ? (
                <span>Connect Wallet to {mode === "supply" ? "Deposit" : "Withdraw"}</span>
              ) : mode === "supply" ? (
                <>
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Deposit {amount || "0"} {selectedToken}</span>
                </>
              ) : (
                <>
                  <ArrowUpFromLine className="w-4 h-4" />
                  <span>Withdraw {amount || "0"} {selectedToken}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
