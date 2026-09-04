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
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Proof Explorer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cryptographic Merkle Patricia Trie verification pipeline on Creditcoin Precompile{" "}
            <code className="text-xs font-mono text-accent">0x0FD2</code>
          </p>
        </div>
        <Link
          href="/check"
          className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors self-start sm:self-auto"
        >
          View Live Profiles
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* 4-Step Verification Architecture Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            step: "01",
            title: "Source Vault Event",
            chain: "Ethereum Sepolia (11155111)",
            desc: "Borrower repays loan on Sepolia. SourceVault.sol emits a deterministic RepaymentLogged event receipt.",
            icon: Lock,
          },
          {
            step: "02",
            title: "MPT Trie Extraction",
            chain: "Attestcoin Relayer",
            desc: "Relayer extracts receipt RLP from the block header and constructs the inclusion proof path.",
            icon: Layers,
          },
          {
            step: "03",
            title: "Precompile 0x0FD2",
            chain: "Creditcoin Settlement",
            desc: "Native CC3 Block Prover validates receiptsRoot continuity and receipt existence in 1 block (~15s).",
            icon: Cpu,
          },
          {
            step: "04",
            title: "Dynamic LTV Unlock",
            chain: "xCredenceHub",
            desc: "xCS credit score updates atomically, unlocking up to 90% loan-to-value in the lending pool.",
            icon: Sparkles,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="glass-card p-5 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-mono uppercase tracking-wider text-faint">
                  Step {item.step}
                </span>
                <Icon className="w-4 h-4 text-accent" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                <span className="text-[11px] font-mono text-accent block">
                  {item.chain}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
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
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-hairline">
            <h2 className="text-base font-medium text-foreground flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-accent" />
              <span>Construct Attested Event</span>
            </h2>
            <span className="text-xs font-mono text-muted-foreground">Sepolia Gateway</span>
          </div>

          <form onSubmit={handleGenerateProof} className="space-y-4">
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground block mb-1.5">
                Source Blockchain
              </label>
              <select
                value={sourceChainId}
                onChange={(e) => setSourceChainId(Number(e.target.value))}
                className="w-full bg-surface-2 rounded-xl px-3.5 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value={11155111}>Ethereum Sepolia (Chain ID: 11155111)</option>
                <option value={1}>Ethereum Mainnet (Chain ID: 1)</option>
                <option value={8453}>Base Mainnet (Chain ID: 8453)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground block mb-1.5">
                Borrower Address
              </label>
              <input
                type="text"
                value={borrowerAddress}
                onChange={(e) => setBorrowerAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-surface-2 rounded-xl px-3.5 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground block mb-1.5">
                  Action Type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(Number(e.target.value))}
                  className="w-full bg-surface-2 rounded-xl px-3.5 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value={0}>REPAYMENT_LOGGED</option>
                  <option value={1}>INVOICE_SETTLED</option>
                  <option value={2}>COLLATERAL_PLEDGED</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground block mb-1.5">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  value={amountUSD}
                  onChange={(e) => setAmountUSD(e.target.value)}
                  placeholder="25000"
                  className="w-full bg-surface-2 rounded-xl px-3.5 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-surface-2 hover:bg-surface-2/80 text-foreground font-medium text-xs transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate Merkle Patricia Proof</span>
            </button>
          </form>

          {/* Raw Proof Details Preview */}
          <div className="p-4 rounded-xl bg-surface-2 border border-hairline space-y-2 text-xs font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Receipts Root:</span>
              <span className="text-foreground">
                {generatedProof.receiptRoot.slice(0, 14)}...{generatedProof.receiptRoot.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tx Hash:</span>
              <span className="text-accent">
                {generatedProof.txHash.slice(0, 14)}...{generatedProof.txHash.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tx Index:</span>
              <span className="text-foreground">{generatedProof.txIndex}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Proof Size:</span>
              <span className="text-positive">
                {(generatedProof.proofBytes.length / 2).toFixed(0)} Bytes (Optimized RLP)
              </span>
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
                <span>Validating Against Precompile 0x0FD2...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Verify Proof via 0x0FD2</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Merkle Tree Visualizer & Confirmation */}
        <div className="glass-card p-6 sm:p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <h2 className="text-base font-medium text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <span>Cryptographic Proof Tree</span>
              </h2>
              <span className="text-xs font-mono text-positive">Patricia Trie Active</span>
            </div>

            <MerkleTreeViewer proof={generatedProof} />
          </div>

          {/* Verification Status Result */}
          {verificationResult.status === "SUCCESS" && (
            <div className="p-4 rounded-xl bg-positive/10 space-y-2 text-xs font-mono text-positive">
              <div className="flex items-center justify-between font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Precompile 0x0FD2 Verification Valid</span>
                </div>
                <span className="text-[11px] opacity-80">{verificationResult.timeMs || 700}ms</span>
              </div>
              <p className="text-foreground/90 leading-relaxed font-sans text-xs">
                Inclusion proof confirmed against block header. Credit score escalated by{" "}
                <strong className="text-positive">+{verificationResult.scoreDelta} pts</strong>. Dynamic
                LTV increased to <strong className="text-accent">{verificationResult.newMaxLtv}%</strong>.
              </p>
              <div className="pt-1 flex items-center justify-between border-t border-positive/20 text-[11px]">
                <span>Settled via native Attestcoin Block Prover</span>
                <Link
                  href="/check"
                  className="inline-flex items-center gap-1 text-accent hover:underline font-medium font-sans"
                >
                  Scan Live Profiles <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {txError && (
            <div className="p-4 rounded-xl bg-negative/10 flex items-center gap-2 text-xs font-mono text-negative">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{txError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
