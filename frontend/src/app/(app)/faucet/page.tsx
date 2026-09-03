"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Copy,
  Check,
} from "lucide-react";
import { CONTRACT_ADDRESSES, NETWORKS } from "@/lib/constants";
import {
  fetchUserBalances,
  requestFaucetTokens,
  formatTransactionError,
  addTokenToWallet,
} from "@/lib/web3";

export default function FaucetPage() {
  const [userAddress, setUserAddress] = useState<string>("");
  const [balances, setBalances] = useState({ nativeCTC: 0, xUSDC: 0, xCTC: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Mint states
  const [xctcAmount, setXctcAmount] = useState<string>("2000");
  const [xusdcAmount, setXusdcAmount] = useState<string>("2000");
  const [mintingToken, setMintingToken] = useState<string | null>(null);
  const [isMintingBundle, setIsMintingBundle] = useState(false);

  // Status feedback
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txSuccessMessage, setTxSuccessMessage] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [addedToken, setAddedToken] = useState<string | null>(null);

  const explorer = NETWORKS.CREDITCOIN_TESTNET.explorer;

  const loadUserData = async (addr: string) => {
    setIsLoading(true);
    try {
      const bals = await fetchUserBalances(addr);
      setBalances(bals);
    } catch (e) {
      console.warn("Balance load warning:", e);
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
            loadUserData(accounts[0]);
          }
        })
        .catch(() => {});

      const onAccountsChanged = (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setUserAddress(accounts[0]);
          loadUserData(accounts[0]);
        } else {
          setUserAddress("");
          setBalances({ nativeCTC: 0, xUSDC: 0, xCTC: 0 });
        }
      };

      (window as any).ethereum.on("accountsChanged", onAccountsChanged);
      return () => {
        (window as any).ethereum.removeListener("accountsChanged", onAccountsChanged);
      };
    }
  }, []);

  const handleMint = async (tokenSymbol: "xCTC" | "xUSDC", amount: number) => {
    if (!userAddress) {
      setTxError("Please connect your wallet first to mint testnet tokens.");
      return;
    }
    setTxError(null);
    setTxHash(null);
    setTxSuccessMessage(null);
    setMintingToken(tokenSymbol);

    try {
      const tokenAddress = tokenSymbol === "xCTC" ? CONTRACT_ADDRESSES.xCTC : CONTRACT_ADDRESSES.xUSDC;
      const receipt = await requestFaucetTokens(tokenAddress, userAddress, amount);
      setTxHash(receipt.hash);
      setTxSuccessMessage(`Minted ${amount.toLocaleString()} ${tokenSymbol} to your wallet.`);
      await loadUserData(userAddress);
    } catch (err: any) {
      console.error("Faucet mint error:", err);
      setTxError(formatTransactionError(err));
    } finally {
      setMintingToken(null);
    }
  };

  const handleMintBundle = async () => {
    if (!userAddress) {
      setTxError("Please connect your wallet first to claim the Starter Pack.");
      return;
    }
    setTxError(null);
    setTxHash(null);
    setTxSuccessMessage(null);
    setIsMintingBundle(true);

    try {
      await requestFaucetTokens(CONTRACT_ADDRESSES.xCTC, userAddress, 2000);
      const receiptUSDC = await requestFaucetTokens(CONTRACT_ADDRESSES.xUSDC, userAddress, 2000);

      setTxHash(receiptUSDC.hash);
      setTxSuccessMessage("Starter pack claimed: 2,000 xCTC + 2,000 xUSDC minted.");
      await loadUserData(userAddress);
    } catch (err: any) {
      console.error("Bundle mint error:", err);
      setTxError(formatTransactionError(err));
    } finally {
      setIsMintingBundle(false);
    }
  };

  const handleAddToWallet = async (tokenAddress: string, symbol: string) => {
    try {
      await addTokenToWallet(tokenAddress, symbol, 18);
      setAddedToken(symbol);
      setTimeout(() => setAddedToken(null), 3000);
    } catch (err: any) {
      console.warn("Add token warning:", err);
    }
  };

  const handleCopyAddress = () => {
    if (!userAddress) return;
    navigator.clipboard.writeText(userAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Testnet faucet
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-md">
            Mint simulated collateral and borrow assets directly on Creditcoin CC3 to test undercollateralized loans and liquidity provisioning.
          </p>
        </div>

        {userAddress && (
          <button
            onClick={() => loadUserData(userAddress)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-lg bg-surface-2 px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        )}
      </header>

      {/* Wallet Status & Live Balances */}
      <section className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hairline text-xs font-mono">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Recipient:</span>
            {userAddress ? (
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <span>{`${userAddress.slice(0, 8)}…${userAddress.slice(-6)}`}</span>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="text-faint hover:text-foreground transition-colors"
                  title="Copy address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-positive" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </span>
            ) : (
              <span className="text-faint">Wallet not connected</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-faint">
            <span className="w-1.5 h-1.5 rounded-full bg-positive" />
            <span>Creditcoin CC3 (102031)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-surface-2/40">
            <span className="block text-[10px] uppercase tracking-[0.12em] text-faint">
              Native CTC
            </span>
            <span className="tnum block text-xl font-medium text-foreground mt-1">
              {balances.nativeCTC.toFixed(3)}
            </span>
            <span className="block text-[11px] text-faint mt-1 font-mono">
              Gas token
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-2/40">
            <span className="block text-[10px] uppercase tracking-[0.12em] text-faint">
              xCTC balance
            </span>
            <span className="tnum block text-xl font-medium text-foreground mt-1">
              {balances.xCTC.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
            <span className="block text-[11px] text-accent mt-1 font-mono">
              Collateral · $2.50 USD
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-2/40">
            <span className="block text-[10px] uppercase tracking-[0.12em] text-faint">
              xUSDC balance
            </span>
            <span className="tnum block text-xl font-medium text-foreground mt-1">
              {balances.xUSDC.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
            <span className="block text-[11px] text-positive mt-1 font-mono">
              Borrow asset · $1.00 USD
            </span>
          </div>
        </div>
      </section>

      {/* Notifications */}
      {txSuccessMessage && (
        <div className="rounded-xl bg-positive/10 px-4 py-3 text-xs font-mono text-positive flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{txSuccessMessage}</span>
          </div>
          {txHash && (
            <a
              href={`${explorer}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-positive hover:underline shrink-0"
            >
              <span>Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {txError && (
        <div className="rounded-xl bg-negative/10 px-4 py-3 text-xs font-mono text-negative flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{txError}</span>
        </div>
      )}

      {/* 1-Click Starter Pack Banner */}
      <section className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1 max-w-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-medium text-foreground">
              Starter pack
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Mint 2,000 xCTC ($5,000 collateral) and 2,000 xUSDC ($2,000 liquidity) together in a single flow to test borrowing and lending immediately.
          </p>
        </div>

        <button
          type="button"
          onClick={handleMintBundle}
          disabled={!userAddress || isMintingBundle || mintingToken !== null}
          className="chamfer shrink-0 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ "--cut": "8px" } as React.CSSProperties}
        >
          {isMintingBundle ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Minting bundle…</span>
            </>
          ) : (
            <span>Claim starter pack</span>
          )}
        </button>
      </section>

      {/* Two Token Mint Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* xCTC Card */}
        <div className="glass-card p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center text-sm font-medium text-foreground font-mono">
                  C
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">Credence CTC</h3>
                  <span className="text-xs font-mono text-muted-foreground">xCTC · $2.50 USD</span>
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-1 rounded-full font-mono">
                Collateral
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Locked as collateral to borrow USDC. Attested credit tiers unlock up to 90% LTV against deposited xCTC.
            </p>

            {/* Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase tracking-[0.12em] text-faint">Amount</span>
                <div className="flex items-center gap-1.5">
                  {["500", "2000", "5000"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setXctcAmount(preset)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                        xctcAmount === preset
                          ? "bg-accent/20 text-accent font-medium"
                          : "bg-surface-2/60 text-muted-foreground hover:text-foreground hover:bg-surface-2"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-3.5 py-2.5 transition-colors">
                <input
                  type="number"
                  step="any"
                  value={xctcAmount}
                  onChange={(e) => setXctcAmount(e.target.value)}
                  placeholder="0"
                  className="flex-grow bg-transparent text-base font-mono font-medium text-foreground focus:outline-none placeholder-faint"
                />
                <span className="text-xs font-mono text-muted-foreground">xCTC</span>
              </div>
              <div className="text-right text-[11px] font-mono text-faint">
                ≈ ${(parseFloat(xctcAmount || "0") * 2.5).toLocaleString()} USD value
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-hairline">
            <button
              type="button"
              onClick={() => handleMint("xCTC", parseFloat(xctcAmount) || 2000)}
              disabled={!userAddress || mintingToken !== null || isMintingBundle}
              className="chamfer w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ "--cut": "8px" } as React.CSSProperties}
            >
              {mintingToken === "xCTC" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Confirming…</span>
                </>
              ) : (
                <span>Mint {Number(xctcAmount || 0).toLocaleString()} xCTC</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <button
                type="button"
                onClick={() => handleAddToWallet(CONTRACT_ADDRESSES.xCTC, "xCTC")}
                className="hover:text-foreground flex items-center gap-1 transition-colors text-[11px]"
              >
                <Plus className="w-3 h-3 text-accent" />
                <span>{addedToken === "xCTC" ? "Added to wallet" : "Add to wallet"}</span>
              </button>

              <a
                href={`${explorer}/address/${CONTRACT_ADDRESSES.xCTC}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground flex items-center gap-1 text-[11px] transition-colors"
              >
                <span>Contract</span>
                <ExternalLink className="w-3 h-3 text-faint" />
              </a>
            </div>
          </div>
        </div>

        {/* xUSDC Card */}
        <div className="glass-card p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center text-sm font-medium text-foreground font-mono">
                  $
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">Credence USD</h3>
                  <span className="text-xs font-mono text-muted-foreground">xUSDC · $1.00 USD</span>
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-positive bg-positive/10 px-2.5 py-1 rounded-full font-mono">
                Borrow asset
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Supplied into liquidity reserves to earn lending APY, or borrowed against your attested cross-chain credit profile.
            </p>

            {/* Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase tracking-[0.12em] text-faint">Amount</span>
                <div className="flex items-center gap-1.5">
                  {["1000", "2000", "5000"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setXusdcAmount(preset)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                        xusdcAmount === preset
                          ? "bg-accent/20 text-accent font-medium"
                          : "bg-surface-2/60 text-muted-foreground hover:text-foreground hover:bg-surface-2"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-3.5 py-2.5 transition-colors">
                <input
                  type="number"
                  step="any"
                  value={xusdcAmount}
                  onChange={(e) => setXusdcAmount(e.target.value)}
                  placeholder="0"
                  className="flex-grow bg-transparent text-base font-mono font-medium text-foreground focus:outline-none placeholder-faint"
                />
                <span className="text-xs font-mono text-muted-foreground">xUSDC</span>
              </div>
              <div className="text-right text-[11px] font-mono text-faint">
                ≈ ${(parseFloat(xusdcAmount || "0") * 1.0).toLocaleString()} USD value
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-hairline">
            <button
              type="button"
              onClick={() => handleMint("xUSDC", parseFloat(xusdcAmount) || 2000)}
              disabled={!userAddress || mintingToken !== null || isMintingBundle}
              className="chamfer w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ "--cut": "8px" } as React.CSSProperties}
            >
              {mintingToken === "xUSDC" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Confirming…</span>
                </>
              ) : (
                <span>Mint {Number(xusdcAmount || 0).toLocaleString()} xUSDC</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <button
                type="button"
                onClick={() => handleAddToWallet(CONTRACT_ADDRESSES.xUSDC, "xUSDC")}
                className="hover:text-foreground flex items-center gap-1 transition-colors text-[11px]"
              >
                <Plus className="w-3 h-3 text-accent" />
                <span>{addedToken === "xUSDC" ? "Added to wallet" : "Add to wallet"}</span>
              </button>

              <a
                href={`${explorer}/address/${CONTRACT_ADDRESSES.xUSDC}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground flex items-center gap-1 text-[11px] transition-colors"
              >
                <span>Contract</span>
                <ExternalLink className="w-3 h-3 text-faint" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Official Network Faucet Link */}
      <section className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-foreground">Need native CTC for gas?</div>
          <p className="text-xs text-muted-foreground">
            Creditcoin CC3 Testnet transactions require native CTC to cover network execution fees.
          </p>
        </div>
        <a
          href="https://faucet.cc3-testnet.creditcoin.network"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3.5 py-2 text-xs text-foreground hover:bg-surface-2/80 transition-colors shrink-0 self-start sm:self-auto"
        >
          <span>Official network faucet</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-faint" />
        </a>
      </section>

      {/* Next Steps: matches overview.tsx layout */}
      <div className="space-y-3">
        <span className="block text-[10px] uppercase tracking-[0.14em] text-faint">
          Next steps
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/borrow" className="glass-card glass-card-hover p-5 group">
            <span className="block text-sm font-medium text-foreground">
              Borrow against credit
            </span>
            <span className="block text-xs text-muted-foreground mt-1">
              Lock your minted xCTC to access dynamic undercollateralized LTV up to 90%.
            </span>
            <ArrowRight className="w-4 h-4 text-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all mt-3" />
          </Link>

          <Link href="/lend" className="glass-card glass-card-hover p-5 group">
            <span className="block text-sm font-medium text-foreground">
              Supply liquidity
            </span>
            <span className="block text-xs text-muted-foreground mt-1">
              Deposit xUSDC or xCTC into the lending pool to earn passive lending APY.
            </span>
            <ArrowRight className="w-4 h-4 text-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all mt-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
