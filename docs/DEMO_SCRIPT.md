# Credence Hackathon Demo Video Script (3 Minutes)

> **Hackathon:** BUIDL CTC 2026 Fall  
> **Speaker:** Lead Developer & Founder  
> **Target Video Duration:** 2 minutes 50 seconds  
> **Visual Focus:** Live DApp UI, Credit Scanner, Borrowing Terminal, Creditcoin Explorer, Precompile `0x0FD2`

---

### [0:00 - 0:30] The Hook & The Problem
- **[Screen: Title Card & Problem Infographic]**
- **Speaker:** "Hi everyone! Welcome to Credence. Today, DeFi lending has a trillion-dollar bottleneck: 100% overcollateralization. If you've been a reliable borrower with millions in on-time repayments on Ethereum or Base, you have zero credit history on Creditcoin. You're forced to lock 150% to 200% collateral. Existing solutions rely on centralized oracles or vulnerable multi-sig bridges that get hacked.
- **Speaker:** "With the **Attestcoin Protocol** on Creditcoin, we are changing that forever."

---

### [0:30 - 1:15] The Solution & Attestcoin Architecture
- **[Screen: Overview Dashboard & Live Credit Scanner]** (`/overview` → `/check`)
- **Speaker:** "Credence is the first Universal Cross-Chain Verifiable Credit Protocol powered by Creditcoin's native **Block Prover precompile `0x0FD2`**."
- **Speaker:** "Here on our live credit scanner we see real xCS scores—300 to 850, mirroring FICO. Click a preset and read the actual on-chain state: **Aura Capital, 850 Platinum, 90% max LTV**; Nexus DeFi, Gold; a fresh wallet starts at 500 with 50% LTV. Every profile is queryable on Blockscout."

---

### [1:15 - 2:00] Live Demonstration: Credit Scanner & Proof Verification
- **[Screen: `/check` scanning Aura Capital]**
- **Speaker:** "Let's look at how those scores are earned cryptographically."
- **[Open the Proof Explorer `/visualizer`]**
- **Speaker:** "Step 1: a borrower repays an obligation on Ethereum Sepolia. `SourceVault.sol` emits a deterministic `RepaymentLogged` receipt."
- **Speaker:** "Step 2: the @gluwa/cc-next-query-builder proof builder captures the transaction and generates a Merkle Patricia Trie inclusion proof against the block's receipts root."
- **Speaker:** "Step 3 & 4: the proof is relayed to Creditcoin Testnet. `0x0FD2` synchronously validates inclusion and continuity on-chain in ~15 seconds—zero centralized oracles."
- **Speaker:** "Each verified receipt updates the borrower's score. That's how the presets you just scanned became real, on-chain, verifiable credit. The explorer here walks the same path as a local simulation; live receipts flow through our relayer (`npm run e2e`)."

---

### [2:00 - 2:30] Undercollateralized Borrowing & Autonomous AI Sentinel
- **[Screen: Borrow & Supply terminals]** (`/borrow`, `/lend`)
- **Speaker:** "With their upgraded score, borrowers access our capital-efficient borrowing terminal: up to **90% LTV**—i.e. 111% collateral instead of 200%—plus up to 3% APR discounts. Supply side: multi-asset liquidity vaults with live reserves on chain."
- **[Screen: Sentinel stream] (`/sentinel`)**
- **Speaker:** "To guarantee protocol solvency, our **Autonomous AI Risk Sentinel** continuously monitors cross-chain position health. If volatility spikes or a position breaches the 1.05 health-factor threshold, the Sentinel submits an on-chain liquidation that also penalizes the borrower's credit score—closing the risk loop."

---

### [2:30 - 2:50] The Vision & CEIP Fast-Track
- **[Screen: Summary Card & Links]**
- **Speaker:** "Credence turns Creditcoin into the universal credit evaluation and settlement layer for Web3, bridging DeFi, RWA invoice factoring, and DePIN. We have a fully working dual-chain testnet deployment, a complete smart-contract test suite, and an off-chain relayer."
- **Speaker:** "We are excited to partner with Credit Labs and the CEIP Fast-Track to scale verifiable credit to the real world. Thank you!"
