"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MerkleTreeViewer } from "@/components/MerkleTreeViewer";
import { generateAttestationProof } from "@/lib/attestcoin";
import { CONTRACT_ADDRESSES, NETWORKS } from "@/lib/constants";
import { ethers } from "ethers";
import {
  FileCheck2,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Lock,
  Zap,
} from "lucide-react";

export default function ProofExplorerPage() {
  const [sourceChainId, setSourceChainId] = useState<number>(11155111); // Sepolia
  const [borrowerAddress, setBorrowerAddress] = useState<string>("0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7");
  const [actionType, setActionType] = useState<number>(0); // REPAYMENT
  const [amountUSD, setAmountUSD] = useState<string>("25000");

  const [generatedProof, setGeneratedProof] = useState<any>(() =>
    generateAttestationProof({
      sourceChainId: 11155111,
      borrower: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      actionType: 0,
      amountUSD: 25000,
    })
  );

  const [isVerifying, setIsVerifying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    status: "IDLE" | "SUCCESS" | "REJECTED";
    scoreDelta?: number;
    newMaxLtv?: number;
    timeMs?: number;
  }>({ status: "IDLE" });

  const handleGenerateProof = (e: React.FormEvent) => {
    e.preventDefault();
    setTxHash(null);
    setTxError(null);
    setVerificationResult({ status: "IDLE" });

    const proof = generateAttestationProof({
      sourceChainId,
      borrower: borrowerAddress,
      actionType,
      amountUSD: parseFloat(amountUSD) || 10000,
    });
    setGeneratedProof(proof);
  };

  const handleVerifyOnChain = async () => {
    setIsVerifying(true);
    setTxError(null);
    setTxHash(null);

    const startTime = Date.now();

    // ⚠️ Concept simulation — no wallet, no gas.
    // Creditcoin's native 0x0FD2 precompile only accepts proofs for real,
    // consensus-attested source blocks. Locally-synthesized bytes would be
    // rejected on-chain, so this explorer walks through the verification
    // path locally. For LIVE attested scores on Creditcoin, race to /check:
    // the demo presets there read real on-chain xCS profiles.
    await new Promise((r) => setTimeout(r, 700));

    const elapsed = Date.now() - startTime;

    setVerificationResult({
      status: "SUCCESS",
      scoreDelta: +45,
      newMaxLtv: 85,
      timeMs: elapsed,
    });
    setIsVerifying(false);
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono mb-2">
          <Cpu className="w-3.5 h-3.5" />
          <span>Creditcoin Precompile 0x0FD2 (Attestcoin Engine)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Attestcoin Proof Explorer & Visualizer
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-3xl">
          A walkthrough of how cross-chain Ethereum &amp; Sepolia repayment events are
          verified inside Creditcoin's native state machine using Merkle Patricia
          Trie receipts. Runs as a <strong className="text-foreground">local concept simulation</strong> —
          the native <code className="text-xs font-mono">0x0FD2</code> precompile only accepts proofs of
          real attested blocks. For live attested scores, see{" "}
          <Link href="/check" className="text-accent hover:underline">the credit scanner</Link>.
        </p>
      </div>

      {/* 4-Step Verification Architecture Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            step: "01",
            title: "Source Vault Event",
            chain: "Ethereum Sepolia (11155111)",
            desc: "Borrower repays loan on Sepolia. SourceVault.sol logs RepaymentLogged event in block receipt.",
            icon: Lock,
            color: "border-accent/40 text-accent",
          },
          {
            step: "02",
            title: "MPT Trie Extraction",
            chain: "Attestcoin Relayer",
            desc: "Relayer extracts raw receipt RLP and constructs cryptographic Merkle Patricia Trie inclusion proof.",
            icon: Layers,
            color: "border-accent/40 text-accent",
          },
          {
            step: "03",
            title: "Precompile 0x0FD2",
            chain: "Creditcoin Testnet",
            desc: "Native CC3 precompile validates Merkle root & block header continuity in a single atomic transaction.",
            icon: Cpu,
            color: "border-accent/40 text-accent",
          },
          {
            step: "04",
            title: "Dynamic LTV Unlock",
            chain: "Credence Settlement Hub",
            desc: "xCS credit score is upgraded immediately, unlocking up to 90% undercollateralized LTV in the lending pool.",
            icon: Sparkles,
            color: "border-emerald-500/40 text-emerald-400",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className={`rounded-2xl p-5 bg-surface/80 border ${item.color} backdrop-blur-xl flex flex-col justify-between space-y-3`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-muted-foreground">
                  STEP {item.step}
                </span>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{item.title}</h3>
                <span className="text-[10px] font-mono text-accent block mt-0.5">
                  {item.chain}
                </span>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Proof Generator & Verifier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Input Parameters */}
        <div className="rounded-3xl border border-border bg-surface/80 p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-accent" />
              <span>Construct Attested Event</span>
            </h2>
            <span className="text-xs font-mono text-muted-foreground">Sepolia Gateway</span>
          </div>

          <form onSubmit={handleGenerateProof} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Source Blockchain
              </label>
              <select
                value={sourceChainId}
                onChange={(e) => setSourceChainId(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-accent"
              >
                <option value={11155111}>Ethereum Sepolia (Chain ID: 11155111)</option>
                <option value={1}>Ethereum Mainnet (Chain ID: 1)</option>
                <option value={8453}>Base Mainnet (Chain ID: 8453)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Borrower Address
              </label>
              <input
                type="text"
                value={borrowerAddress}
                onChange={(e) => setBorrowerAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                  Action Type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-accent"
                >
                  <option value={0}>REPAYMENT_LOGGED</option>
                  <option value={1}>INVOICE_SETTLED</option>
                  <option value={2}>COLLATERAL_PLEDGED</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  value={amountUSD}
                  onChange={(e) => setAmountUSD(e.target.value)}
                  placeholder="25000"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-accent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-surface-2 hover:bg-surface-2 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-border"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate RLP & Merkle Patricia Proof</span>
            </button>
          </form>

          {/* Raw Proof Details Preview */}
          <div className="p-4 rounded-2xl bg-background/80 border border-border space-y-2 text-xs font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Receipts Root:</span>
              <span className="text-white font-bold">{generatedProof.receiptRoot.slice(0, 14)}...{generatedProof.receiptRoot.slice(-8)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tx Hash:</span>
              <span className="text-accent">{generatedProof.txHash.slice(0, 14)}...{generatedProof.txHash.slice(-8)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tx Index:</span>
              <span className="text-white">{generatedProof.txIndex}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Proof Size:</span>
              <span className="text-emerald-400">{(generatedProof.proofBytes.length / 2).toFixed(0)} Bytes (Optimized RLP)</span>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleVerifyOnChain}
            disabled={isVerifying}
            className="w-full chamfer bg-primary text-primary-foreground font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Precompile 0x0FD2 Verification...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Simulate Proof Verification (concept)</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Merkle Tree Visualizer & Confirmation */}
        <div className="rounded-3xl border border-border bg-surface/80 p-6 sm:p-8 backdrop-blur-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                <span>Cryptographic Proof Tree</span>
              </h2>
              <span className="text-xs font-mono text-emerald-400">Patricia Trie Node</span>
            </div>

            <MerkleTreeViewer proof={generatedProof} />
          </div>

          {/* Verification Status Result */}
          {verificationResult.status === "SUCCESS" && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-2 text-xs font-mono text-emerald-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>0x0FD2 Cryptographic Proof VALID (simulated)</span>
                </div>
                <span>Validated in {verificationResult.timeMs || 1420}ms</span>
              </div>
              <p className="text-foreground/85">
                Hub updated borrower xCS score by <strong className="text-emerald-400">+{verificationResult.scoreDelta} pts</strong>. Max dynamic LTV escalated to <strong className="text-accent">{verificationResult.newMaxLtv}%</strong>.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-emerald-200">
                <span>⚠️ Simulation surface — on-chain attestations require a real Sepolia receipt via the relayer.</span>
                <Link href="/check" className="inline-flex items-center gap-1 hover:underline">
                  See live attested profiles <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {txError && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/50 flex items-center gap-2 text-xs font-mono text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{txError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
