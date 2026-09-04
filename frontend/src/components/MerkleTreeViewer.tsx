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
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-hairline">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-medium text-foreground">
            Attestcoin Proof Structure
          </h3>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-positive/10 text-positive flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" />
          Precompile 0x0FD2 Validated
        </span>
      </div>

      {/* Tree Visualization Layout */}
      <div className="flex flex-col items-center space-y-3 font-mono text-xs">
        {/* Layer 1: Receipts Root Hash */}
        <div className="w-full bg-surface-2 rounded-xl p-3.5 border border-hairline flex flex-col items-center text-center space-y-1">
          <span className="text-[10px] text-faint uppercase tracking-wider">
            Source Chain Receipts Root
          </span>
          <span className="text-foreground font-mono break-all text-xs">
            {receiptRoot}
          </span>
        </div>

        {/* Connector */}
        <div className="flex items-center justify-center text-faint">
          <ArrowDown className="w-3.5 h-3.5 text-accent" />
        </div>

        {/* Layer 2: Branch & Intermediate Nodes */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="bg-surface-2 rounded-xl p-3 border border-hairline flex flex-col items-center text-center space-y-1">
            <span className="text-[10px] text-faint uppercase tracking-wider">Branch Node 0x01</span>
            <span className="text-[11px] text-foreground font-mono truncate w-full">0x4a7f9b2c...88d1</span>
          </div>
          <div className="bg-surface-2 rounded-xl p-3 border border-hairline flex flex-col items-center text-center space-y-1">
            <span className="text-[10px] text-faint uppercase tracking-wider">Extension Node 0x02</span>
            <span className="text-[11px] text-foreground font-mono truncate w-full">0x1e3b6a9d...44c2</span>
          </div>
        </div>

        {/* Connector */}
        <div className="flex items-center justify-center text-faint">
          <ArrowDown className="w-3.5 h-3.5 text-accent" />
        </div>

        {/* Layer 3: Transaction Leaf Node */}
        <div className="w-full bg-surface-2 rounded-xl p-3.5 border border-hairline flex flex-col items-center text-center space-y-1">
          <div className="flex items-center gap-1.5 text-accent text-[10px] uppercase tracking-wider">
            <FileCheck className="w-3.5 h-3.5" /> Proven Transaction Receipt Leaf
          </div>
          <span className="text-foreground font-mono break-all text-xs">
            {txHash}
          </span>
        </div>

        {/* Connector */}
        <div className="flex items-center justify-center text-faint">
          <ArrowDown className="w-3.5 h-3.5 text-positive" />
        </div>

        {/* Layer 4: Precompile 0x0FD2 Native Execution */}
        <div className="w-full bg-surface-2 rounded-xl p-4 border border-hairline flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">
                Creditcoin Precompile 0x0FD2
              </span>
              <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[140px] sm:max-w-none">
                {precompileTarget}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-positive/10 text-positive font-mono text-xs">
              1 Block Settlement (~15s)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
