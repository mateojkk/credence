"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { fetchProtocolStats, ProtocolStatsData } from "@/lib/web3";

/* ------------------------------------------------------------------ */
/* Ambient canvas: drifting attestation nodes linked by proof lines    */
/* ------------------------------------------------------------------ */
function AttestationCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const N = 46;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00045,
      vy: (Math.random() - 0.5) * 0.00045,
      r: Math.random() * 1.4 + 0.5,
    }));

    let t = 0;
    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      for (const n of nodes) {
        if (!reduced) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > 1) n.vx *= -1;
          if (n.y < 0 || n.y > 1) n.vy *= -1;
        }
      }

      // proof links
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = (a.x - b.x) * width;
          const dy = (a.y - b.y) * height;
          const dist = Math.hypot(dx, dy);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(242, 241, 244, ${0.08 * (1 - dist / 130)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x * width, a.y * height);
            ctx.lineTo(b.x * width, b.y * height);
            ctx.stroke();
          }
        }
      }

      // nodes pulse gently
      for (const n of nodes) {
        const glow = 0.35 + 0.3 * Math.sin((t + n.x * 400) * 0.02);
        ctx.fillStyle = `rgba(196, 181, 253, ${glow * 0.5})`;
        ctx.beginPath();
        ctx.arc(n.x * width, n.y * height, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 w-full h-full [mask-image:linear-gradient(to_bottom,black_55%,transparent_96%)]"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Chamfered primary button                                            */
/* ------------------------------------------------------------------ */
function ChamferLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="chamfer inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
      style={{ "--cut": "10px" } as React.CSSProperties}
    >
      {children}
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.14em] text-accent mb-4">{children}</p>
  );
}

/* ================================================================== */

const PROOF_STEPS = [
  {
    label: "Repay",
    caption: "A loan is repaid on the source chain; the vault emits a deterministic receipt event.",
  },
  {
    label: "Relay",
    caption: "The off-chain worker wraps the receipt into a Merkle Patricia Trie inclusion proof.",
  },
  {
    label: "Prove",
    caption: "xCredenceHub calls precompile 0x0FD2; validity settles on Creditcoin in one block.",
  },
  {
    label: "Score",
    caption: "The verified fact updates the borrower's attested score, tier, and max LTV instantly.",
  },
  {
    label: "Borrow",
    caption: "Capital unlocks at up to 90% LTV: collateral efficiency earned by proven history.",
  },
];

const TRUST_ROWS = [
  {
    term: "No oracle operators",
    detail:
      "Attestation happens inside the EVM. xCredenceHub calls Creditcoin's native Block Prover precompile (0x0FD2), so cross-chain facts are validated by the chain itself. There is no external signer to bribe, hack, or shut down.",
  },
  {
    term: "Synchronous finality",
    detail:
      "Proof validation completes atomically within a single Creditcoin block (~15s). Borrowers scan, qualify, and open positions in one session instead of waiting on challenge windows or bridge latency.",
  },
  {
    term: "Replay-proof by construction",
    detail:
      "Every accepted attestation binds keccak(chainKey, blockHeight, txIndex) on-chain. The same receipt can never mint credit twice, across any borrower, on any chain.",
  },
  {
    term: "Undercollateralized by math, not promises",
    detail:
      "LTV limits are derived on-chain from cryptographically verified repayment volume and frequency. Platinum borrowers reach 111% collateral requirements because their history, not their word, backs them.",
  },
];

const FAQS = [
  {
    q: "What does Credence actually do?",
    a: "It turns verifiable cross-chain repayment history into borrowing power. Repayments made on chains like Sepolia are proven on Creditcoin through the Attestcoin Protocol, compiled into an on-chain credit score (300 to 850), and mapped to dynamic loan terms: up to 90% loan-to-value with interest discounts of up to 3 percentage points.",
  },
  {
    q: "How does it use the Attestcoin Protocol?",
    a: "Every credit point originates from an inclusion proof. When a repayment event fires on a source chain, its Merkle Patricia Trie receipt proof is submitted to xCredenceHub, which validates it synchronously via Creditcoin's native Block Prover precompile at 0x0FD2 (with ChainInfo at 0x0FD3 for source-chain metadata). No centralized oracle ever touches the data path.",
  },
  {
    q: "Why is this better than overcollateralized lending?",
    a: "Standard DeFi treats every wallet as anonymous risk, so capital sits locked at 150% to 200% collateral. Credence prices proven behavior instead: an unverified borrower starts at 50% LTV, while a Platinum borrower with sustained verified volume borrows at 90% LTV, releasing most of their collateral for productive use.",
  },
  {
    q: "Can someone forge or replay a proof to inflate a score?",
    a: "Forged proofs fail precompile verification outright. Replays are blocked on-chain: each processed attestation records keccak(chainKey, blockHeight, txIndex), and duplicates revert. Score inflation would require actually repaying loans on a source chain, which is exactly the point.",
  },
  {
    q: "What happens if a borrower's position degrades?",
    a: "The autonomous Risk Sentinel reprices every active loan against live oracle reserves using a volatility-adjusted health factor. Positions entering critical bands trigger on-chain telemetry through the RiskSentinel contract, and authorized agents can execute fully collateralized liquidations without waiting for a human.",
  },
  {
    q: "Is this live or a mockup?",
    a: "The protocol is 100% live on Creditcoin CC3 Testnet with verified smart contracts and seeded liquidity. All borrowing, lending, credit scoring, and faucet interactions execute real on-chain EVM transactions on Creditcoin. Cross-chain repayment receipts are proven through our relayer directly against Creditcoin's native 0x0FD2 precompile, and the visualizer lets you inspect the underlying cryptographic Merkle proof structure step-by-step.",
  },
];

/* ================================================================== */

export default function LandingPage() {
  const [stats, setStats] = useState<ProtocolStatsData>({
    totalVerifiedVolumeUSD: 0,
    totalProofsVerified: 0,
    totalProfilesCreated: 0,
    totalSuppliedUSD: 0,
    totalBorrowedUSD: 0,
    avgCreditScore: 0,
  });

  useEffect(() => {
    fetchProtocolStats().then(setStats);
  }, []);

  return (
    <div className="w-full">
      {/* ============================== HERO ============================== */}
      <section className="grain relative overflow-hidden">
        {/* ambient layers */}
        <AttestationCanvas />
        <div
          aria-hidden
          className="absolute top-[-20rem] left-1/2 -translate-x-1/2 w-[60rem] h-[40rem] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(closest-side, var(--primary), transparent)" }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-background pointer-events-none"
        />

        <div className="relative max-w-4xl mx-auto px-5 pt-32 sm:pt-44 pb-24 sm:pb-32 text-center">
          <h1 className="text-balance text-[2.9rem] font-medium leading-[1.02] tracking-[-0.02em] sm:text-7xl text-foreground">
            Your repayment history,
            <br />
            proven on-chain.
          </h1>

          <p className="mt-6 mx-auto max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Credence turns repayments made on other chains into cryptographic
            credit proofs on Creditcoin, unlocking undercollateralized loans
            with no oracle in between.
          </p>

          <div className="mt-10 flex items-center justify-center gap-6">
            <ChamferLink href="/overview">Launch app</ChamferLink>
            <Link
              href="/visualizer"
              className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              See how a proof verifies
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* live metrics strip */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-hairline pt-8">
            {[
              { label: "Pool liquidity", value: `$${Math.round(stats.totalSuppliedUSD).toLocaleString()}` },
              { label: "Max borrow LTV", value: "90%" },
              { label: "Verification engine", value: "0x0FD2" },
              { label: "Settlement", value: "~15s" },
            ].map((m) => (
              <div key={m.label} className="text-left">
                <span className="block text-[11px] uppercase tracking-wider text-faint">{m.label}</span>
                <span className="tnum mt-1 block text-xl sm:text-2xl font-medium text-foreground">
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PROOF TERMINAL (chat-demo slot) ==================== */}
      <section className="border-b border-hairline relative overflow-hidden">
        <div
          aria-hidden
          className="absolute right-[-12rem] top-1/2 -translate-y-1/2 w-[38rem] h-[38rem] rounded-full opacity-[0.06] blur-2xl pointer-events-none"
          style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }}
        />
        <div className="max-w-6xl mx-auto px-5 py-24 grid lg:grid-cols-[0.92fr_1.08fr] gap-16 items-center">
          <div>
            <Eyebrow>The attestcoin loop</Eyebrow>
            <h2 className="text-balance text-3xl sm:text-4xl font-medium tracking-tight leading-tight text-foreground">
              Watch a repayment become reputation.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed max-w-md">
              Each verified receipt flows from the source chain, through
              precompile 0x0FD2, into your on-chain profile, and comes out as
              borrowing power you can take anywhere on Creditcoin.
            </p>
            <ChamferLink href="/visualizer">
              Open the Proof Explorer
              <ArrowUpRight className="w-4 h-4" />
            </ChamferLink>
          </div>

          {/* terminal card */}
          <div className="chamfer-edge p-[1px] bg-border" style={{ "--cut": "14px" } as React.CSSProperties}>
            <div className="chamfer bg-card" style={{ "--cut": "13px" } as React.CSSProperties}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline">
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="orb-spin w-5 h-5 text-primary/70" fill="none" aria-hidden>
                    <g className="orb-spin">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.5 4" />
                    </g>
                    <circle cx="12" cy="12" r="3.2" fill="currentColor" opacity="0.85" />
                  </svg>
                  <span className="text-sm text-foreground">Attestor</span>
                  <span className="flex items-center gap-1.5 text-xs text-faint">
                    <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
                    online · 0x0FD2 · illustrative
                  </span>
                </div>
              </div>

              <div className="px-5 py-5 space-y-3 font-mono text-xs leading-relaxed">
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-surface-2 border border-border rounded-xl rounded-tr-sm px-4 py-2.5 text-foreground">
                    Repaid 25,000 USDC on Sepolia → prove it
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-accent" />
                  <div className="bg-surface/50 border border-hairline rounded-xl rounded-tl-sm px-4 py-2.5 text-muted-foreground space-y-1.5">
                    <p><span className="text-accent">event</span> RepaymentLogged(borrower=0x89…3e7, amount=25000)</p>
                    <p><span className="text-accent">proof</span> MPT path built against receiptsRoot #5,400,120</p>
                    <p><span className="text-accent">verify</span> precompile 0x0FD2 → <span className="text-positive">valid ✓</span> (atomic, 1 block)</p>
                    <p><span className="text-accent">score</span> xCS 500 → 850 · tier PLATINUM · LTV 9000 bps</p>
                    <p><span className="text-faint">Try it live</span> → <a className="text-accent hover:underline" href="/check?address=0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7">scan seeded profile</a></p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="chamfer bg-primary/15 border border-accent/30 px-4 py-2.5 text-accent" style={{ "--cut": "8px" } as React.CSSProperties}>
                    Borrow up to $22,500 against 25k collateral → borrow now
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 pl-1 text-faint">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  sample flow — live scans run in the app
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= PROCESS RAIL (#cycle) ======================= */}
      <section id="cycle" className="border-b border-hairline relative overflow-hidden">
        {/* halftone-ish texture backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(var(--foreground) 0.65px, transparent 0.65px)",
            backgroundSize: "9px 9px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-5 py-24">
          <div className="max-w-2xl mb-16">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="text-balance text-3xl sm:text-4xl font-medium tracking-tight leading-tight text-foreground">
              One proof, start to score.
            </h2>
          </div>

          <div className="flex flex-col md:flex-row md:flex-1 gap-10 md:gap-0">
            {PROOF_STEPS.map((step, i) => (
              <div key={step.label} className="relative flex-1 flex md:block items-start gap-4">
                {/* connector */}
                {i < PROOF_STEPS.length - 1 && (
                  <>
                    <svg
                      className="hidden md:block absolute left-[7px] top-6 w-[calc(100%-14px)] h-px overflow-visible"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <line
                        x1="0"
                        y1="0.5"
                        x2="100%"
                        y2="0.5"
                        stroke="var(--primary)"
                        strokeWidth="1"
                        className="cycle-flow"
                        style={{ animationDelay: `${i * 0.38}s`, opacity: 0.5 }}
                      />
                    </svg>
                    <div className="md:hidden absolute left-[7px] top-8 bottom-[-2.5rem] w-px overflow-hidden">
                      <svg width="1" height="100%" aria-hidden>
                        <line
                          x1="0.5"
                          y1="0"
                          x2="0.5"
                          y2="100%"
                          stroke="var(--primary)"
                          strokeWidth="1"
                          className="cycle-flow"
                          style={{ animationDelay: `${i * 0.38}s`, opacity: 0.5 }}
                        />
                      </svg>
                    </div>
                  </>
                )}
                <div className="relative shrink-0">
                  <span className="cycle-ping absolute inset-0 rounded-full bg-accent" aria-hidden />
                  <span className="relative block w-[15px] h-[15px] rounded-full border-2 border-accent bg-background" />
                </div>
                <div className="md:mt-6 md:pr-8">
                  <h3 className="text-sm font-medium text-foreground tracking-tight">
                    {String(i + 1).padStart(2, "0")} · {step.label}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground max-w-[24ch]">
                    {step.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================= TRUST LEDGER ========================= */}
      <section id="trust" className="border-b border-hairline bg-surface/40">
        <div className="max-w-6xl mx-auto px-5 py-24 grid lg:grid-cols-[0.8fr_1.2fr] gap-14">
          <div>
            <Eyebrow>Why trust it</Eyebrow>
            <h2 className="text-balance text-3xl sm:text-4xl font-medium tracking-tight leading-tight text-foreground">
              No middleman. Just proof.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed max-w-sm">
              Cross-chain credit usually means trusting whoever operates the
              bridge. Here, the settlement layer itself does the verifying.
            </p>
          </div>

          <dl>
            {TRUST_ROWS.map((row) => (
              <div
                key={row.term}
                className="grid sm:grid-cols-[0.9fr_1.1fr] gap-2 sm:gap-8 border-t border-hairline py-7 first:border-t-0 first:pt-0"
              >
                <dt className="text-sm font-medium text-foreground">{row.term}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{row.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ====================== COMPARISON CARDS (#proof) ====================== */}
      <section id="proof" className="border-b border-hairline">
        <div className="max-w-6xl mx-auto px-5 py-24">
          <div className="max-w-2xl mb-12">
            <Eyebrow>The numbers</Eyebrow>
            <h2 className="text-balance text-3xl sm:text-4xl font-medium tracking-tight leading-tight text-foreground">
              Collateral should follow credibility.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              The same borrower, priced two ways: by anonymity, or by what they
              have actually proven on-chain.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* standard DeFi */}
            <div className="rounded-2xl border border-border bg-surface/40 p-6">
              <p className="text-sm text-muted-foreground">Standard cross-chain DeFi</p>
              <div className="tnum mt-5 grid grid-cols-3 gap-4">
                <div>
                  <span className="block text-xl sm:text-2xl font-medium text-foreground">50%</span>
                  <span className="block text-[11px] text-faint mt-1">max LTV</span>
                </div>
                <div>
                  <span className="block text-xl sm:text-2xl font-medium text-negative">200%</span>
                  <span className="block text-[11px] text-faint mt-1">collateral required</span>
                </div>
                <div>
                  <span className="block text-xl sm:text-2xl font-medium text-foreground">8%</span>
                  <span className="block text-[11px] text-faint mt-1">flat APR, no history</span>
                </div>
              </div>
            </div>

            {/* Credence */}
            <div className="rounded-2xl border border-accent/40 bg-surface/60 p-6">
              <p className="text-sm text-accent flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Credence · attested Platinum
              </p>
              <div className="tnum mt-5 grid grid-cols-3 gap-4">
                <div>
                  <span className="block text-xl sm:text-2xl font-medium text-mark">90%</span>
                  <span className="block text-[11px] text-faint mt-1">max LTV</span>
                </div>
                <div>
                  <span className="block text-xl sm:text-2xl font-medium text-positive">111%</span>
                  <span className="block text-[11px] text-faint mt-1">collateral required</span>
                </div>
                <div>
                  <span className="block text-xl sm:text-2xl font-medium text-mark">−3%</span>
                  <span className="block text-[11px] text-faint mt-1">APR vs base rate</span>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-8 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            That is{" "}
            <span className="text-foreground font-medium">79 points of LTV</span> and{" "}
            <span className="text-foreground font-medium">nearly half the locked collateral</span>{" "}
            returned to productive use, earned entirely through proofs, not deposits.
          </p>
        </div>
      </section>

      {/* ============================ FAQ ============================ */}
      <section id="faq" className="border-b border-hairline bg-surface/40">
        <div className="max-w-3xl mx-auto px-5 py-24">
          <Eyebrow>Common questions</Eyebrow>
          <h2 className="text-balance text-3xl sm:text-4xl font-medium tracking-tight leading-tight text-foreground mb-10">
            Quick answers.
          </h2>
          <div className="divide-y divide-hairline border-y border-hairline">
            {FAQS.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex items-center justify-between gap-6 cursor-pointer list-none py-5 text-left">
                  <span className="text-sm sm:text-[0.95rem] font-medium text-foreground">
                    {item.q}
                  </span>
                  <span
                    className="shrink-0 text-lg text-faint group-open:rotate-45 transition-transform select-none"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="pb-6 pr-10 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ========================= FINAL CTA BAND ========================= */}
      <section className="grain relative overflow-hidden">
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[52rem] h-[30rem] rounded-full opacity-[0.08] blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none"
        />
        <div className="relative max-w-3xl mx-auto px-5 py-28 text-center">
          <h2 className="text-balance text-3xl sm:text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-foreground">
            Stop locking capital.
            <br />
            Start proving credit.
          </h2>
          <p className="mt-5 text-muted-foreground max-w-md mx-auto leading-relaxed">
            Scan your address, watch your proofs settle, and borrow against the
            history you have already built.
          </p>
          <div className="mt-10 flex justify-center">
            <ChamferLink href="/overview">Launch app</ChamferLink>
          </div>
        </div>
      </section>
    </div>
  );
}
