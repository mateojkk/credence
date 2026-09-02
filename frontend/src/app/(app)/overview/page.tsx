"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchLiveCreditProfile,
  fetchUserBalances,
  fetchUserLoans,
  fetchUserSupplies,
  CreditProfileData,
  UserLoanData,
} from "@/lib/web3";
import { ArrowRight, ArrowUpRight } from "lucide-react";

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
  const [userAddress, setUserAddress] = useState<string>("");
  const [profile, setProfile] = useState<CreditProfileData>(DEFAULT_PROFILE);
  const [balances, setBalances] = useState({ nativeCTC: 0, xUSDC: 0, xCTC: 0 });
  const [supplies, setSupplies] = useState({ xUSDC: 0, xCTC: 0 });
  const [loans, setLoans] = useState<UserLoanData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) load(accounts[0]);
          else setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const load = async (addr: string) => {
    setUserAddress(addr);
    setIsLoading(true);
    try {
      const [prof, bals, userSupplies, userLoans] = await Promise.all([
        fetchLiveCreditProfile(addr),
        fetchUserBalances(addr),
        fetchUserSupplies(addr),
        fetchUserLoans(addr),
      ]);
      setProfile(prof);
      setBalances(bals);
      setSupplies(userSupplies);
      setLoans(userLoans);
    } catch (e) {
      console.warn("Overview load warning:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeLoans = loans.filter((l) => !l.isSettled && !l.isLiquidated);
  const totalOwedUSD =
    activeLoans.reduce(
      (sum, l) => sum + l.totalOwed * (l.borrowSymbol === "xUSDC" ? 1 : 2.5),
      0
    );
  const suppliedUSD = supplies.xUSDC + supplies.xCTC * 2.5;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono truncate max-w-xs sm:max-w-none">
            {userAddress
              ? `${userAddress.slice(0, 10)}…${userAddress.slice(-8)}`
              : "Wallet not connected"}
          </p>
        </div>
        {userAddress && (
          <Link
            href={`/check?address=${userAddress}`}
            className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Run full credit check
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        )}
      </header>

      {!userAddress && !isLoading ? (
        <section className="glass-card p-10 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Connect your wallet to see your credit, loans, and supplies.
          </p>
        </section>
      ) : (
        <>
          {/* Credit summary */}
          <section className="glass-card p-6 flex items-center justify-between gap-6">
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-faint">
                Your credit score
              </span>
              <span className="tnum block text-4xl font-medium text-foreground mt-1">
                {profile.score}
              </span>
              <span className="block text-xs text-accent mt-1">
                {profile.tierName}
              </span>
            </div>
            <div className="flex gap-8 text-right">
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-faint">
                  Max LTV
                </span>
                <span className="tnum block text-xl font-medium text-mark mt-1">
                  {profile.maxLtv}%
                </span>
              </div>
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-faint">
                  APR discount
                </span>
                <span className="tnum block text-xl font-medium text-positive mt-1">
                  −{(profile.discountBps / 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/borrow" className="glass-card glass-card-hover p-5 group">
              <span className="block text-sm font-medium text-foreground">
                Borrow
              </span>
              <span className="tnum block text-xs text-muted-foreground mt-1">
                {activeLoans.length} active loan{activeLoans.length === 1 ? "" : "s"}
                {totalOwedUSD > 0 && ` · $${Math.round(totalOwedUSD).toLocaleString()} owed`}
              </span>
              <ArrowRight className="w-4 h-4 text-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all mt-3" />
            </Link>
            <Link href="/lend" className="glass-card glass-card-hover p-5 group">
              <span className="block text-sm font-medium text-foreground">
                Supply
              </span>
              <span className="tnum block text-xs text-muted-foreground mt-1">
                ${Math.round(suppliedUSD).toLocaleString()} supplied ·{" "}
                {balances.xUSDC.toFixed(0)} xUSDC in wallet
              </span>
              <ArrowRight className="w-4 h-4 text-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all mt-3" />
            </Link>
          </div>

          {/* Active loans */}
          <section className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Your loans</h3>
              {activeLoans.length > 0 && (
                <Link href="/borrow" className="text-xs text-accent hover:text-mark transition-colors">
                  Manage →
                </Link>
              )}
            </div>

            {activeLoans.length === 0 ? (
              <p className="px-6 py-8 text-sm text-faint text-center">
                No active loans.
              </p>
            ) : (
              <ul className="divide-y divide-hairline">
                {activeLoans.map((loan) => (
                  <li key={loan.loanId} className="px-6 py-3.5 flex items-center justify-between text-sm">
                    <span className="font-mono text-muted-foreground">
                      #{loan.loanId} ·{" "}
                      <span className="tnum text-foreground">
                        {loan.totalOwed.toLocaleString()} {loan.borrowSymbol}
                      </span>{" "}
                      owed
                    </span>
                    <span className={`tnum text-xs ${loan.isOverdue ? "text-negative" : "text-faint"}`}>
                      due {loan.dueDate.toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
