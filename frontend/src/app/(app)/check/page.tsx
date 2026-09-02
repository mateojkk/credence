"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CreditScoreGauge } from "@/components/CreditScoreGauge";
import { DEMO_PROFILES } from "@/lib/constants";
import { fetchLiveCreditProfile, CreditProfileData } from "@/lib/web3";
import { Search, RefreshCw, ArrowRight } from "lucide-react";

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

export default function DashboardPage() {
  const [connectedAddress, setConnectedAddress] = useState<string>("");
  const [lookupAddress, setLookupAddress] = useState<string>("");
  const [activeProfile, setActiveProfile] = useState<CreditProfileData>(DEFAULT_PROFILE);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    // Shareable deep link: /check?address=0x…
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const linkedAddress = params?.get("address");

    if (linkedAddress && linkedAddress.startsWith("0x")) {
      setLookupAddress(linkedAddress);
      loadProfile(linkedAddress);
      return;
    }

    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setConnectedAddress(accounts[0]);
            setLookupAddress(accounts[0]);
            loadProfile(accounts[0]);
          }
        })
        .catch(() => {});
    }
  }, []);

  const loadProfile = async (addr: string) => {
    setIsLoadingProfile(true);
    try {
      const data = await fetchLiveCreditProfile(addr);
      setActiveProfile(data);
      setHasScanned(true);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/check?address=${addr}`);
      }
    } catch (e) {
      console.warn("Profile fetch error:", e);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupAddress && lookupAddress.startsWith("0x")) {
      loadProfile(lookupAddress);
    }
  };

  const collateralRatio = activeProfile.maxLtv > 0
    ? Math.round((100 / activeProfile.maxLtv) * 100)
    : 200;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page purpose */}
      <header>
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Address checker
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          Look up any wallet to see the credit its verified repayment history
          has earned on Creditcoin, and what it can borrow with.
        </p>
      </header>

      {/* Single primary interaction: scan */}
      <form onSubmit={handleCustomSearch} className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
          <input
            type="text"
            value={lookupAddress}
            onChange={(e) => setLookupAddress(e.target.value)}
            placeholder="0x… borrower address"
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-white placeholder-faint focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={isLoadingProfile}
          className="chamfer px-6 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2"
          style={{ "--cut": "8px" } as React.CSSProperties}
        >
          {isLoadingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Scan"}
        </button>
      </form>

      {/* Demo presets */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-faint">Examples:</span>
        {DEMO_PROFILES.map((profile, i) => (
          <button
            key={profile.address}
            onClick={() => {
              setLookupAddress(profile.address);
              loadProfile(profile.address);
            }}
            className="px-2.5 py-1 rounded-full border border-border bg-surface/40 text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
          >
            {profile.name.split(" ")[0]} · {profile.tier.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Result: one card, clear hierarchy */}
      <section className="glass-card p-6 sm:p-8">
        {!hasScanned && !isLoadingProfile ? (
          <p className="py-16 text-center text-sm text-faint">
            Scan an address above to view its credit profile.
          </p>
        ) : (
          <div className="grid sm:grid-cols-[auto_1fr] gap-8 items-center">
            {/* Score */}
            <div className="flex flex-col items-center">
              <CreditScoreGauge score={activeProfile.score} size={200} />
              <span className="mt-3 text-xs font-mono text-faint">
                {lookupAddress
                  ? `${lookupAddress.slice(0, 6)}…${lookupAddress.slice(-4)}`
                  : ""}
                {connectedAddress && lookupAddress === connectedAddress ? " (you)" : ""}
              </span>
            </div>

            {/* What it unlocks */}
            <div className="space-y-5">
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-faint">
                  Max borrow LTV
                </span>
                <span className="tnum text-4xl font-medium text-mark">
                  {activeProfile.maxLtv}%
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  · {collateralRatio}% collateral required
                </span>
              </div>

              <div className="flex gap-10">
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-faint">
                    APR discount
                  </span>
                  <span className="tnum text-xl font-medium text-accent">
                    −{(activeProfile.discountBps / 100).toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-faint">
                    Verified volume
                  </span>
                  <span className="tnum text-xl font-medium text-foreground">
                    ${Math.round(activeProfile.totalRepaidUSD).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-faint">
                    Clean repays
                  </span>
                  <span className="tnum text-xl font-medium text-foreground">
                    {activeProfile.successfulRepayments}
                    {activeProfile.defaultCount > 0 && (
                      <span className="text-negative text-sm"> · {activeProfile.defaultCount} default{activeProfile.defaultCount > 1 ? "s" : ""}</span>
                    )}
                  </span>
                </div>
              </div>

              <Link
                href="/borrow"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-mark transition-colors group"
              >
                Borrow against this profile
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Progressive disclosure: how tiers work */}
      <details className="group glass-card px-6 py-4">
        <summary className="flex items-center justify-between cursor-pointer list-none text-sm text-muted-foreground">
          How scores and tiers are computed
          <span className="text-faint group-open:rotate-45 transition-transform select-none">+</span>
        </summary>
        <p className="pt-4 pb-2 text-sm leading-relaxed text-muted-foreground">
          Every verified cross-chain repayment adds points: volume contributes up
          to +200 and clean repayment count up to +150, starting from a base of
          500. Each liquidation costs 120. Tiers map score ranges to LTV:
          Unverified 50%, Bronze 65%, Silver 75%, Gold 85%, Platinum 90%
          (undercollateralized).
        </p>
      </details>
    </div>
  );
}
