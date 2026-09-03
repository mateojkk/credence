"use client";

import React, { useState, useEffect } from "react";
import { CONTRACT_ADDRESSES, NETWORKS } from "@/lib/constants";
import {
  fetchPoolReserves,
  fetchUserBalances,
  executeSupply,
  executeWithdraw,
  connectBrowserWallet,
  requestFaucetTokens,
  formatTransactionError,
  PoolReserveData,
} from "@/lib/web3";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Droplet,
} from "lucide-react";

export default function LendPage() {
  const [reserves, setReserves] = useState<PoolReserveData[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState(true);

  const [userAddress, setUserAddress] = useState<string>("");
  const [balances, setBalances] = useState({ nativeCTC: 0, xUSDC: 0, xCTC: 0 });
  const [selectedToken, setSelectedToken] = useState<"xUSDC" | "xCTC">("xUSDC");
  const [amount, setAmount] = useState<string>("500");
  const [mode, setMode] = useState<"supply" | "withdraw">("supply");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [faucetLoading, setFaucetLoading] = useState(false);

  const loadData = async (addr: string) => {
    setIsLoadingPools(true);
    try {
      const [res, bals] = await Promise.all([
        fetchPoolReserves(),
        fetchUserBalances(addr),
      ]);
      setReserves(res);
      setBalances(bals);
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
    } else {
      loadData("");
    }
  }, []);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);
    setTxHash(null);

    if (!userAddress) {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        setTxError("No Web3 wallet detected. Please install MetaMask to deposit or withdraw.");
        return;
      }
      try {
        const { address } = await connectBrowserWallet();
        setUserAddress(address);
        await loadData(address);
      } catch (err: any) {
        setTxError(formatTransactionError(err));
      }
      return;
    }

    const tokenAddr = selectedToken === "xUSDC" ? CONTRACT_ADDRESSES.xUSDC : CONTRACT_ADDRESSES.xCTC;
    const parsedAmount = parseFloat(amount) || 0;

    setIsSubmitting(true);
    try {
      if (mode === "supply") {
        const receipt = await executeSupply(tokenAddr, parsedAmount);
        setTxHash(receipt.hash);
      } else {
        const receipt = await executeWithdraw(tokenAddr, parsedAmount);
        setTxHash(receipt.hash);
      }
      await loadData(userAddress);
    } catch (err: any) {
      console.error("Pool interaction error:", err);
      setTxError(formatTransactionError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFaucet = async (tokenSymbol: "xUSDC" | "xCTC") => {
    if (!userAddress) return;
    setFaucetLoading(true);
    setTxError(null);
    try {
      const tokenAddr = tokenSymbol === "xUSDC" ? CONTRACT_ADDRESSES.xUSDC : CONTRACT_ADDRESSES.xCTC;
      await requestFaucetTokens(tokenAddr, userAddress, 1000);
      await loadData(userAddress);
    } catch (err: any) {
      setTxError(formatTransactionError(err));
    } finally {
      setFaucetLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Supply
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Deposit assets to earn yield from attested-credit loans.
          </p>
        </div>

        {/* Testnet faucets */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFaucet("xUSDC")}
            disabled={faucetLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>+1,000 xUSDC</span>
          </button>

          <button
            onClick={() => handleFaucet("xCTC")}
            disabled={faucetLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>+1,000 xCTC</span>
          </button>
        </div>
      </div>

      {/* Pools Summary Cards */}
      {isLoadingPools ? (
        <p className="text-sm text-faint py-8 text-center">Reading pool reserves on-chain…</p>
      ) : reserves.length === 0 ? (
        <p className="text-sm text-negative py-8 text-center">
          Could not read pool reserves. Check your connection to Creditcoin Testnet.
        </p>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reserves.map((res) => (
          <div
            key={res.symbol}
            className="glass-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center text-sm font-medium text-foreground font-mono">
                  {res.symbol === "xUSDC" ? "$" : "C"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{res.name}</h3>
                  <span className="text-xs font-mono text-muted-foreground">
                    Oracle Price: ${res.oraclePriceUSD.toFixed(2)} USD
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="tnum text-xl font-medium text-positive">
                  {res.supplyApy}%
                </span>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Supply APY
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-surface-2/50 text-xs font-mono">
              <div>
                <span className="text-muted-foreground block">Total Supplied</span>
                <span className="text-white font-bold">{res.totalSupplied.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Total Borrowed</span>
                <span className="text-white font-bold">{res.totalBorrowed.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Utilization</span>
                <span className="text-accent font-bold">{res.utilizationRate}%</span>
              </div>
            </div>

            {/* Utilization Bar */}
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full bg-background overflow-hidden border border-border">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, res.utilizationRate))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>Available: {res.availableLiquidity.toLocaleString()} {res.symbol}</span>
                <span>Borrow APR: {res.borrowApr}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Supply / Withdraw Form */}
      <div className="rounded-3xl border border-border bg-surface/80 p-6 sm:p-8 backdrop-blur-xl max-w-2xl mx-auto space-y-6">
        {/* Toggle Mode */}
        <div className="flex p-1 rounded-lg bg-background border border-border">
          <button
            type="button"
            onClick={() => setMode("supply")}
            className={`flex-1 py-2 rounded-md text-sm transition-colors flex items-center justify-center gap-2 ${
              mode === "supply"
                ? "bg-surface-2 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Supply</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("withdraw")}
            className={`flex-1 py-2 rounded-md text-sm transition-colors flex items-center justify-center gap-2 ${
              mode === "withdraw"
                ? "bg-surface-2 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>

        <form onSubmit={handleAction} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
              <span>Select Asset & Amount</span>
              <span>
                Wallet: {selectedToken === "xUSDC" ? `${balances.xUSDC.toFixed(2)} xUSDC` : `${balances.xCTC.toFixed(2)} xCTC`}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-2">
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-grow bg-transparent text-2xl font-bold font-mono text-white focus:outline-none"
                required
              />
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value as "xUSDC" | "xCTC")}
                className="bg-card text-white text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="xUSDC">xUSDC</option>
                <option value="xCTC">xCTC</option>
              </select>
            </div>
          </div>

          {/* Feedback Alerts */}
          {txHash && (
            <div className="p-4 rounded-2xl bg-positive/10 flex items-center justify-between text-xs font-mono text-positive">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-positive" />
                <span>Transaction Confirmed On-Chain!</span>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full chamfer bg-primary text-primary-foreground font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Confirming On-Chain...</span>
              </>
            ) : !userAddress ? (
              <span>Connect Wallet to {mode === "supply" ? "Deposit" : "Withdraw"}</span>
            ) : mode === "supply" ? (
              <>
                <ArrowDownToLine className="w-4 h-4" />
                <span>Deposit {amount} {selectedToken}</span>
              </>
            ) : (
              <>
                <ArrowUpFromLine className="w-4 h-4" />
                <span>Withdraw {amount} {selectedToken}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
