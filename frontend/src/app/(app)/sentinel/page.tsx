"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { RefreshCw } from "lucide-react";
import { CONTRACT_ADDRESSES, POOL_ABI, SENTINEL_ABI } from "@/lib/constants";
import { getReadProvider } from "@/lib/web3";

type RiskStatus = "LIQUIDATABLE" | "CRITICAL" | "WATCHLIST" | "HEALTHY";

interface LivePosition {
  loanId: number;
  borrower: string;
  collateralUSD: number;
  debtUSD: number;
  hf: number;
  status: RiskStatus;
}

interface SentinelStats {
  thresholdBps: number;
  alertsDispatched: number;
  automatedLiquidations: number;
}

const VOLATILITY_INDEX = 0.25;

function classify(hf: number): RiskStatus {
  if (hf < 1.02) return "LIQUIDATABLE";
  if (hf < 1.15) return "CRITICAL";
  if (hf < 1.3) return "WATCHLIST";
  return "HEALTHY";
}

function statusColor(status: RiskStatus): string {
  switch (status) {
    case "LIQUIDATABLE":
      return "text-negative";
    case "CRITICAL":
      return "text-accent";
    case "WATCHLIST":
      return "text-mark";
    default:
      return "text-positive";
  }
}

export default function SentinelPage() {
  const [stats, setStats] = useState<SentinelStats>({
    thresholdBps: 10500,
    alertsDispatched: 0,
    automatedLiquidations: 0,
  });
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = getReadProvider();
      const sentinel = new ethers.Contract(
        CONTRACT_ADDRESSES.AIRiskSentinel,
        SENTINEL_ABI,
        provider
      );
      const pool = new ethers.Contract(
        CONTRACT_ADDRESSES.xCredenceLendingPool,
        POOL_ABI,
        provider
      );

      // Sentinel counters + threshold (fall back to protocol default)
      let thresholdBps = 10500;
      try {
        thresholdBps = Number(await sentinel.liquidationThresholdBps());
      } catch {}
      const [alerts, liquidations, loanCount] = await Promise.all([
        sentinel.totalAlertsDispatched().catch(() => BigInt(0)),
        sentinel.totalAutomatedLiquidations().catch(() => BigInt(0)),
        pool.loanCount(),
      ]);
      setStats({
        thresholdBps,
        alertsDispatched: Number(alerts),
        automatedLiquidations: Number(liquidations),
      });

      // Price each reserve once
      const priceCache = new Map<string, number>();
      const priceOf = async (token: string): Promise<number> => {
        const key = token.toLowerCase();
        if (!priceCache.has(key)) {
          const reserve = await pool.reserves(token);
          priceCache.set(key, Number(ethers.formatEther(reserve.oraclePriceUSD)));
        }
        return priceCache.get(key)!;
      };

      // Compute volatility-adjusted health factor per active loan
      const volDiscount = 1 - VOLATILITY_INDEX * 0.15;
      const live: LivePosition[] = [];
      for (let i = 1; i <= Number(loanCount); i++) {
        try {
          const loan = await pool.loans(i);
          if (loan.isSettled || loan.isLiquidated) continue;
          const [collPrice, borrowPrice] = await Promise.all([
            priceOf(loan.collateralToken),
            priceOf(loan.borrowToken),
          ]);
          const collateralUSD =
            Number(ethers.formatEther(loan.collateralAmount)) * collPrice;
          const debtUSD =
            Number(ethers.formatEther(loan.totalOwed)) * borrowPrice;
          const hf =
            debtUSD > 0
              ? parseFloat(((collateralUSD / debtUSD) * volDiscount).toFixed(3))
              : 99;
          live.push({
            loanId: Number(loan.loanId),
            borrower: loan.borrower,
            collateralUSD,
            debtUSD,
            hf,
            status: classify(hf),
          });
        } catch {
          // Skip unreadable loan rather than failing the whole scan
        }
      }
      live.sort((a, b) => a.hf - b.hf);
      setPositions(live);
    } catch (err: any) {
      console.error("Sentinel scan error:", err);
      setError(err?.message || "Failed to read on-chain data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    scan();
    const id = setInterval(scan, 15000);
    return () => clearInterval(id);
  }, [scan]);

  const atRisk = positions.filter((p) => p.status !== "HEALTHY").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Risk Sentinel
          </h1>
        </div>

        <button
          onClick={scan}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-surface-2 px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Live protocol stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Liquidation threshold",
            value: (stats.thresholdBps / 10000).toFixed(2),
            unit: "HF, set on-chain",
          },
          {
            label: "Active positions",
            value: String(positions.length),
            unit: `${atRisk} at risk`,
          },
          {
            label: "Alerts dispatched",
            value: String(stats.alertsDispatched),
            unit: "on-chain counter",
          },
          {
            label: "Auto liquidations",
            value: String(stats.automatedLiquidations),
            unit: "on-chain counter",
          },
        ].map((m) => (
          <div key={m.label} className="glass-card p-4">
            <span className="block text-[10px] uppercase tracking-[0.12em] text-faint">
              {m.label}
            </span>
            <span className="tnum block mt-1.5 text-lg font-medium text-foreground truncate">
              {m.value}
            </span>
            <span className="block mt-1 text-[10px] text-faint font-mono leading-snug">
              {m.unit}
            </span>
          </div>
        ))}
      </div>

      {/* Live position feed */}
      <section className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <h3 className="text-sm font-medium text-foreground">Position risk feed</h3>
          <span className="flex items-center gap-1.5 text-xs text-faint">
            <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? "bg-faint" : "bg-positive animate-pulse"}`} />
            {isLoading ? "Scanning chain…" : "Live · auto-refresh 15s"}
          </span>
        </div>

        {error && (
          <div className="px-6 py-8 text-center text-sm text-negative">{error}</div>
        )}

        {!error && !isLoading && positions.length === 0 && (
          <p className="px-6 py-8 text-sm text-faint text-center">
            No active loans on Creditcoin yet — originate one in Borrow to see it
            monitored here.
          </p>
        )}

        {!error && positions.length > 0 && (
          <ul className="divide-y divide-hairline">
            {positions.map((p) => (
              <li key={p.loanId} className="px-6 py-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-mono text-muted-foreground truncate">
                    #{p.loanId} ·{" "}
                    <span className="text-foreground">
                      {`${p.borrower.slice(0, 6)}…${p.borrower.slice(-4)}`}
                    </span>
                  </span>
                  <span className={`tnum font-mono shrink-0 ${statusColor(p.status)}`}>
                    HF {p.hf.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-[11px] text-faint font-mono">
                  <span>
                    coll ${Math.round(p.collateralUSD).toLocaleString()} · debt $
                    {Math.round(p.debtUSD).toLocaleString()}
                  </span>
                  <span className={statusColor(p.status)}>{p.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-faint font-mono leading-relaxed">
        Health factors are volatility-adjusted (index {VOLATILITY_INDEX}) using
        the same model as the off-chain sentinel agent. Liquidations execute
        through AIRiskSentinel by authorized agents only.
      </p>
    </div>
  );
}
