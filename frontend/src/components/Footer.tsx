import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CONTRACT_ADDRESSES, NETWORKS } from "@/lib/constants";

function MarkGlyph({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0 L24 8.4 V15.6 L12 24 L0 15.6 V8.4 Z" opacity="0.35" />
      <path d="M12 4.6 L19.6 9.9 V14.1 L12 19.4 L4.4 14.1 V9.9 Z" />
    </svg>
  );
}

export const Footer = () => {
  const explorer = NETWORKS.CREDITCOIN_TESTNET.explorer;

  return (
    <footer className="relative border-t border-hairline bg-surface/40">
      <div className="max-w-6xl mx-auto px-5 py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-[2fr_1fr_1fr]">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <MarkGlyph className="w-[1.15em] h-[1.15em] text-mark" />
              <span className="text-lg font-medium tracking-tight text-foreground">credence</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Verifiable cross-chain credit and undercollateralized lending,
              proven natively on Creditcoin through the Attestcoin Protocol.
            </p>
            <div className="flex items-center gap-2 text-xs text-faint pt-1">
              <span
                className="w-4 h-4 rounded border border-border bg-surface-2 inline-flex items-center justify-center"
                aria-hidden
              >
                <MarkGlyph className="w-2.5 h-2.5 text-mark" />
              </span>
              Built on Creditcoin · Attestcoin Protocol
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.14em] text-faint mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/#cycle" className="text-muted-foreground hover:text-foreground transition-colors">How it works</Link></li>
              <li><Link href="/visualizer" className="text-muted-foreground hover:text-foreground transition-colors">Proof Explorer</Link></li>
              <li><Link href="/overview" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
              <li><Link href="/borrow" className="text-muted-foreground hover:text-foreground transition-colors">Borrow</Link></li>
              <li><Link href="/lend" className="text-muted-foreground hover:text-foreground transition-colors">Supply liquidity</Link></li>
              <li><Link href="/sentinel" className="text-muted-foreground hover:text-foreground transition-colors">Risk Sentinel</Link></li>
              <li><Link href="/faucet" className="text-muted-foreground hover:text-foreground transition-colors">Testnet Faucet</Link></li>
            </ul>
          </div>

          {/* On-chain + resources */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.14em] text-faint mb-4">On-chain</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href={`${explorer}/address/${CONTRACT_ADDRESSES.xCredenceHub}`} target="_blank" rel="noreferrer" className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors">
                  <span>xCredenceHub</span>
                  <ExternalLink className="w-3 h-3 text-faint" />
                </a>
              </li>
              <li>
                <a href={`${explorer}/address/${CONTRACT_ADDRESSES.xCredenceLendingPool}`} target="_blank" rel="noreferrer" className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors">
                  <span>LendingPool</span>
                  <ExternalLink className="w-3 h-3 text-faint" />
                </a>
              </li>
              <li>
                <a href={`${explorer}/address/${CONTRACT_ADDRESSES.AIRiskSentinel}`} target="_blank" rel="noreferrer" className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors">
                  <span>RiskSentinel</span>
                  <ExternalLink className="w-3 h-3 text-faint" />
                </a>
              </li>
              <li className="flex items-center justify-between text-accent">
                <span>Block Prover 0x0FD2</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 normal-case">native</span>
              </li>
              <li>
                <a href="https://faucet.cc3-testnet.creditcoin.network" target="_blank" rel="noreferrer" className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors">
                  <span>CC3 Testnet Faucet</span>
                  <ExternalLink className="w-3 h-3 text-faint" />
                </a>
              </li>
              <li>
                <a href="https://attestcoin.org/" target="_blank" rel="noreferrer" className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors">
                  <span>Attestcoin Protocol</span>
                  <ExternalLink className="w-3 h-3 text-faint" />
                </a>
              </li>
              <li>
                <a href="https://docs.creditcoin.org/creditcoin-usc" target="_blank" rel="noreferrer" className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors">
                  <span>Developer docs</span>
                  <ExternalLink className="w-3 h-3 text-faint" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-hairline pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-faint">
          <p>© 2026 Credence · BUIDL CTC 2026 Fall submission</p>
        </div>
      </div>
    </footer>
  );
};
