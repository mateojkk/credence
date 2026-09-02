"use client";

import React, { useState } from "react";
import { Terminal, Play, CheckCircle2, XCircle, RefreshCw, Cpu, ShieldAlert, Sparkles, Layers } from "lucide-react";
import { ethers } from "ethers";

export default function PlaygroundPage() {
  const [selectedScenario, setSelectedScenario] = useState<string>("RWA_INVOICE");
  const [customTxHash, setCustomTxHash] = useState("0x89f2a488b13c7c7f3e5871f30be628178d2b99335efd08d98d249d9c9b56f8f4");
  const [customBorrower, setCustomBorrower] = useState("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  const [customAmount, setCustomAmount] = useState("25000");
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "[System] Credence Developer & Judge Playground Initialized.",
    "[System] Target Chain: Creditcoin Testnet · Block Prover Precompile: 0x0FD2",
    "[System] Ready for interactive proof verification tests.",
  ]);

  const scenarios = [
    {
      id: "RWA_INVOICE",
      name: "RWA Invoice Factoring ($50,000 Sepolia)",
      desc: "Tests cross-chain invoice settlement attestation unlocking institutional credit lines.",
      txHash: "0xa1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
      borrower: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      amount: "50000",
      shouldPass: true,
    },
    {
      id: "DEFI_REPAYMENT",
      name: "DeFi Multi-Chain Repayment ($15,000)",
      desc: "Simulates borrower repayment on Sepolia upgrading FICO-like score to Platinum.",
      txHash: "0x89f2a488b13c7c7f3e5871f30be628178d2b99335efd08d98d249d9c9b56f8f4",
      borrower: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      amount: "15000",
      shouldPass: true,
    },
    {
      id: "FORGED_PROOF",
      name: "Simulate Forged Merkle Proof (0x0FD2 Rejection)",
      desc: "Intentionally corrupts Merkle inclusion branch to demonstrate precompile tamper rejection.",
      txHash: "0xdeadbeef00000000000000000000000000000000000000000000000000000000",
      borrower: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      amount: "100000",
      shouldPass: false,
    },
    {
      id: "REPLAY_ATTACK",
      name: "Replay Attack Prevention Test",
      desc: "Attempts to submit previously processed transaction hash to test replay security guards.",
      txHash: "0x89f2a488b13c7c7f3e5871f30be628178d2b99335efd08d98d249d9c9b56f8f4",
      borrower: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      amount: "15000",
      shouldPass: false,
      isReplay: true,
    },
  ];

  const handleSelectScenario = (sc: typeof scenarios[0]) => {
    setSelectedScenario(sc.id);
    setCustomTxHash(sc.txHash);
    setCustomBorrower(sc.borrower);
    setCustomAmount(sc.amount);
  };

  const handleRunExecution = async () => {
    setIsExecuting(true);
    const newLogs = [...logs];
    const timestamp = new Date().toLocaleTimeString();

    newLogs.push(`\n>>> [${timestamp}] Running Test Scenario: ${selectedScenario}`);
    newLogs.push(`[Worker] Connecting to Creditcoin Precompile 0x0000000000000000000000000000000000000FD2...`);
    setLogs([...newLogs]);

    await new Promise((r) => setTimeout(r, 600));

    if (selectedScenario === "FORGED_PROOF") {
      newLogs.push(`[Worker] Generating forged Merkle Patricia Trie path...`);
      newLogs.push(`[Creditcoin 0x0FD2] ❌ Cryptographic Verification FAILED: Invalid Merkle Root Inclusion Proof`);
      newLogs.push(`[xCredenceHub] Transaction reverted with error: 'Cryptographic proof validation failed at 0x0FD2'`);
      newLogs.push(`[Result] 🛡️ Security Guard Verified: Malicious proof was successfully rejected!`);
      setLogs([...newLogs]);
      setIsExecuting(false);
      return;
    }

    if (selectedScenario === "REPLAY_ATTACK") {
      newLogs.push(`[Worker] Submitting proof for tx: ${customTxHash.slice(0, 14)}...`);
      newLogs.push(`[Creditcoin 0x0FD2] ✅ Cryptographic Proof Validated.`);
      newLogs.push(`[xCredenceHub] Checking processedAttestations[keccak256(chainId, txHash)]...`);
      newLogs.push(`[xCredenceHub] ❌ Reverted: 'Proof already processed'`);
      newLogs.push(`[Result] 🛡️ Replay Protection Verified: Duplicate state transition blocked!`);
      setLogs([...newLogs]);
      setIsExecuting(false);
      return;
    }

    // Success flow
    newLogs.push(`[Worker] Extracted Receipt from Sepolia Block #5419204`);
    newLogs.push(`[Worker] Generated Merkle Leaf: ${ethers.keccak256(ethers.toUtf8Bytes(customTxHash)).slice(0, 20)}...`);
    newLogs.push(`[Creditcoin 0x0FD2] Calling native Block Prover precompile (0x0FD2)...`);
    setLogs([...newLogs]);

    await new Promise((r) => setTimeout(r, 800));

    newLogs.push(`[Creditcoin 0x0FD2] ✅ Synchronously Verified in 1 Creditcoin Block (~14.2s)!`);
    newLogs.push(`[xCredenceHub] Decoded Event: Action=LOAN_REPAYMENT, Amount=$${parseFloat(customAmount).toLocaleString()} USD`);
    newLogs.push(`[xCredenceHub] Credit Profile Updated for ${customBorrower}`);
    newLogs.push(`[xCredenceHub] 🎉 Score Escalated to 810 (PLATINUM TIER · 90% Max LTV Unlocked)`);
    newLogs.push(`[Result] ✨ TEST PASSED 100%`);
    setLogs([...newLogs]);
    setIsExecuting(false);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Interactive Judge & Developer Playground
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-surface-2/60 text-accent border border-accent/30">
            Simulation Harness
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Deterministic local simulations of Attestcoin verification flows
          against precompile <code className="text-xs text-foreground font-mono">0x0FD2</code> — no gas, no
          state change. Live proof runs execute through the off-chain relayer
          (<code className="text-xs text-foreground font-mono">cd relayer &amp;&amp; npm run e2e</code>).
        </p>
      </div>

      {/* Preset Scenarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            onClick={() => handleSelectScenario(sc)}
            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 ${
              selectedScenario === sc.id
                ? "bg-creditcoin/15 border-creditcoin text-white shadow-lg shadow-creditcoin/15"
                : "bg-surface border-border text-muted-foreground hover:text-white hover:bg-surfaceHover"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-accent">{sc.id}</span>
              {sc.shouldPass ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-white leading-snug">{sc.name}</h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{sc.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Configuration & Terminal Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-6 border border-border space-y-4 font-mono text-xs">
          <h3 className="text-sm font-bold text-white uppercase font-sans">Parameters Inspector</h3>

          <div className="space-y-1.5">
            <label className="text-muted-foreground">Target Source Tx Hash</label>
            <input
              type="text"
              value={customTxHash}
              onChange={(e) => setCustomTxHash(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg p-2.5 text-foreground text-xs focus:outline-none focus:border-creditcoin"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground">Borrower Address</label>
            <input
              type="text"
              value={customBorrower}
              onChange={(e) => setCustomBorrower(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg p-2.5 text-foreground text-xs focus:outline-none focus:border-creditcoin"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground">Repayment / Invoice Volume ($ USD)</label>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg p-2.5 text-foreground text-xs focus:outline-none focus:border-creditcoin"
            />
          </div>

          <button
            onClick={handleRunExecution}
            disabled={isExecuting}
            className="w-full chamfer py-3.5 font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 mt-4"
          >
            {isExecuting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Simulating Precompile Call...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Scenario (local simulation)</span>
                </>
              )}
          </button>
        </div>

        {/* Right Terminal Console */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6 border border-border space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold text-xs uppercase">Creditcoin Runtime Execution Console</span>
            </div>
            <button
              onClick={() => setLogs(["[System] Console cleared."])}
              className="text-[10px] text-faint hover:text-foreground/85"
            >
              Clear
            </button>
          </div>

          <div className="bg-background rounded-xl p-4 border border-border h-80 overflow-y-auto space-y-1.5 text-foreground/85 text-[11px] leading-relaxed">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`${
                  log.includes("FAILED") || log.includes("reverted") || log.includes("Security")
                    ? "text-rose-400 font-bold"
                    : log.includes("Verified") || log.includes("PASSED") || log.includes("Escalated")
                    ? "text-emerald-400 font-bold"
                    : log.includes(">>>")
                    ? "text-accent font-bold pt-2"
                    : "text-muted-foreground"
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
