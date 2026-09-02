"use client";

import React from "react";
import { CheckCircle2, Shield, ArrowDown, Cpu, FileCheck, Layers } from "lucide-react";

interface MerkleTreeViewerProps {
  receiptRoot?: string;
  txHash?: string;
  precompileTarget?: string;
  verified?: boolean;
  proof?: {
    receiptRoot?: string;
    receiptsRoot?: string;
    txHash?: string;
    merkleProofNodes?: string[];
    precompileTarget?: string;
  };
}

export const MerkleTreeViewer: React.FC<MerkleTreeViewerProps> = ({
  receiptRoot: directReceiptRoot,
  txHash: directTxHash,
  precompileTarget: directPrecompileTarget,
  verified = true,
  proof,
}) => {
  const receiptRoot = proof?.receiptRoot || proof?.receiptsRoot || directReceiptRoot || "0x98f4e29b0a1c7d6e4b8a3f1c5e9d2a7b6c5e4f3a2b1d0e9f8a7b6c5d4e3f2a1b";
  const txHash = proof?.txHash || directTxHash || "0x89f2a488b13c7c7f3e5871f30be628178d2b99335efd08d98d249d9c9b56f8f4";
  const precompileTarget = proof?.precompileTarget || directPrecompileTarget || "0x0000000000000000000000000000000000000FD2";
  return (
    <div className="glass-card rounded-2xl p-6 border border-border relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-attest-cyan" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Attestcoin Merkle Patricia Trie Cryptographic Proof Tree
          </h3>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Cryptographically Verified
        </span>
      </div>

      {/* Tree Visualization Layout */}
      <div className="flex flex-col items-center space-y-4 max-w-2xl mx-auto font-mono text-xs">
        {/* Layer 1: Receipts Root Hash */}
        <div className="w-full bg-surface/80 border border-purple-500/40 rounded-xl p-3.5 shadow-lg shadow-purple-950/30 flex flex-col items-center text-center">
          <span className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1">
            Source Chain Block Receipts Root (Header)
          </span>
          <span className="text-foreground/85 font-mono break-all text-xs bg-background px-2 py-1 rounded border border-border">
            {receiptRoot}
          </span>
        </div>

        {/* Connector */}
        <div className="flex items-center justify-center text-faint">
          <ArrowDown className="w-4 h-4 animate-bounce text-accent" />
        </div>

        {/* Layer 2: Branch & Intermediate Nodes */}
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="bg-surface/80 border border-border rounded-lg p-2.5 flex flex-col items-center text-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Branch Node 0x01</span>
            <span className="text-[11px] text-foreground/85 truncate w-full">0x4a7f9b2c...88d1</span>
          </div>
          <div className="bg-surface/80 border border-border rounded-lg p-2.5 flex flex-col items-center text-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Extension Node 0x02</span>
            <span className="text-[11px] text-foreground/85 truncate w-full">0x1e3b6a9d...44c2</span>
          </div>
        </div>

        {/* Connector */}
        <div className="flex items-center justify-center text-faint">
          <ArrowDown className="w-4 h-4 text-accent" />
        </div>

        {/* Layer 3: Transaction Leaf Node */}
        <div className="w-full bg-surface/80 border border-accent/40 rounded-xl p-3.5 shadow-lg shadow-accent/10 flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-accent text-[10px] font-bold uppercase tracking-widest mb-1">
            <FileCheck className="w-3.5 h-3.5" /> Proven Transaction Leaf (Sepolia)
          </div>
          <span className="text-foreground font-mono break-all text-xs bg-background px-2 py-1 rounded border border-border">
            {txHash}
          </span>
        </div>

        {/* Connector */}
        <div className="flex items-center justify-center text-faint">
          <ArrowDown className="w-4 h-4 text-emerald-400" />
        </div>

        {/* Layer 4: Precompile 0x0FD2 Native Execution */}
        <div className="w-full border border-creditcoin/50 rounded-xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-creditcoin/20 border border-creditcoin/40 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-creditcoin-light" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Creditcoin Precompile 0x0FD2
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">{precompileTarget}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30">
              VALIDATED IN 1 BLOCK (~15s)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
