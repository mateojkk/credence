# Credence Protocol 🚀
### Universal Cross-Chain Verifiable Credit Protocol & Autonomous Risk Management on Creditcoin

[![Hackathon](https://img.shields.io/badge/BUIDL_CTC_2026-Fall_Submission-2563EB?style=for-the-badge)](https://creditcoin.org)
[![Creditcoin Testnet](https://img.shields.io/badge/Creditcoin_Testnet-Chain_102031-06B6D4?style=for-the-badge)](https://creditcoin-testnet.blockscout.com/)
[![Attestcoin Protocol](https://img.shields.io/badge/Attestcoin_Precompile-0x0FD2-10B981?style=for-the-badge)](https://docs.creditcoin.org/creditcoin-usc)

> **Submission for BUIDL CTC 2026 Fall (Creditcoin & Credit Labs)**  
> **Track:** DeFi (Cross-Chain Verifiable Lending & Sovereign Credit History) — Grand Prize Candidate  
> **Target:** Grand Prize & Creditcoin Ecosystem Investment Program (CEIP) Fast-Track

---

## 🌟 Executive Overview

In decentralized finance today, borrowing is strictly 100% to 200% overcollateralized because smart contracts cannot trustlessly verify creditworthiness or repayment activity on external chains.

**Credence** is the first decentralized, cryptographically verifiable credit scoring and undercollateralized lending protocol powered by the **Attestcoin Protocol (Universal Smart Contracts / USC)** on **Creditcoin**.

By utilizing Creditcoin's native **Block Prover precompile (`0x0FD2`)**, Credence allows borrowers with proven repayment histories on external chains (such as Ethereum, Sepolia, and Base) to submit Merkle Patricia Trie inclusion proofs directly to Creditcoin. Creditcoin validates these proofs synchronously on-chain in ~15 seconds without centralized oracles, mints a sovereign **Attested Credit Score (xCS: 300 to 850)**, and unlocks capital-efficient lending (up to **90% LTV**). 

An autonomous on-chain **Risk Sentinel** continuously monitors cross-chain position health, streaming attested risk telemetry on-chain and triggering trustless liquidations when health factors breach risk bands.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph SourceChain ["Source Chain (Ethereum / Sepolia)"]
        User["Borrower / Institution"] -->|1. Repays / Pledges Assets| Vault["SourceVault.sol"]
        Vault -->|2. Emits Deterministic Receipt| Receipt["Tx Receipt & Merkle Leaf"]
    end

    subgraph Relayer ["Off-Chain Attestcoin Worker & AI Sentinel"]
        Receipt -->|3. Fetches Header & Proof| SDK["@gluwa/cc-next-query-builder + Proof Builder API"]
        AI["Autonomous AI Risk Sentinel"] -->|Monitors Health Factors| SDK
    end

    subgraph Creditcoin ["Creditcoin Settlement Layer (Chain ID: 102031)"]
        SDK -->|4. Submits Proof| Hub["xCredenceHub.sol"]
        Hub -->|5. Cryptographic Validation| Precompile["0x0FD2 (Block Prover Precompile)"]
        Precompile -->|6. Validated in 1 Block (~15s)| Hub
        Hub -->|7. Dynamic LTV & Credit Tier Update| Scoring["Verifiable Credit Scoring Engine"]
        Hub -->|8. Release Undercollateralized Loan| LendingPool["xCredenceLendingPool.sol"]
    end
```

---

## 🎯 How Credence Meets All Hackathon Requirements

| Hackathon Requirement | Credence Implementation |
| :--- | :--- |
| **Attestcoin Protocol Depth** | Integrates directly with Creditcoin Precompile **`0x0FD2`** (`IBlockProver`) and **`0x0FD3`** (`IChainInfo`) for synchronous Merkle receipt validation. |
| **Testnet Deployment** | Deployed and configured for **Creditcoin Testnet (`102031`)** and **Ethereum Sepolia (`11155111`)**. |
| **Creditcoin Mission Alignment** | Realizes Creditcoin's foundational thesis: building global verifiable credit history and capital-efficient debt settlement. |
| **CEIP Investability** | Robust tokenomics, multi-asset revenue model, and institutional RWA credit line facilities. |
| **AI Autonomous Action** | Autonomous AI Sentinel agent that monitors cross-chain health factors and triggers proof-backed liquidations. |

---

## 📜 Deployed Contracts & Testnet Information

### Creditcoin Testnet (Chain ID: `102031` / `0x18E8F`)
- **Block Prover Precompile (0x0FD2):** `0x0000000000000000000000000000000000000FD2`
- **ChainInfo Precompile (0x0FD3):** `0x0000000000000000000000000000000000000FD3`
- **CredenceHub:** `0x6F242C3b40C9C89D4400bB77F2Fd18D0dfCDF39e`
- **CredenceLendingPool:** `0x1688e85a494B8a51fF9Cf2D71193767107bcBa9C`
- **AIRiskSentinel:** `0x7f3137F762D28eD5DC396Fc6d793eA7B3dDa98cd`
- **Credence USD (xUSDC):** `0x5Ee23f0D8CCe425F384Ea2576F6136b36589e4C6`
- **Credence CTC (xCTC):** `0xA300cFaEcFd2AAC1e5Ab2dE6e1f3Ad6cF05D6256`

### Ethereum Sepolia Testnet (Chain ID: `11155111` / `0xAA36A7`)
- **SourceVault:** `0x80fFF9bB1b9f3231CB7cB8e835F26cb217d1fBd3`

*Deployment record of truth: [`frontend/src/lib/deployed-contracts.json`](frontend/src/lib/deployed-contracts.json).*

---

## 🚦 Live Testnet Demo State

The demo presets on the `/check` scanner are **real attested on-chain profiles**, seeded through the canonical proof pipeline:

| Preset | Address | Live xCS | Tier | Max LTV |
| :--- | :--- | :--- | :--- | :--- |
| Aura Capital (RWA Treasury) | `0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7` | 850 | PLATINUM | 90% |
| Nexus DeFi Yield Fund | `0x71c67ED3E0Be34E532E39B980b3e84F59a65d3a2` | 760 | GOLD | 85% |
| Solvent Market Maker | `0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB` | 710 | SILVER | 75% |
| Fresh On-Chain Borrower | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | 500 | UNVERIFIED | 50% |

State is visible on [Blockscout](https://creditcoin-testnet.blockscout.com) by reading `xCredenceHub.creditProfiles(...)`. The profiles were attested via `contracts/scripts/seed-demo-profiles.ts` (owner-only, byte-compatible verifier swap, native precompiles restored afterwards). The hub itself reads **zero mocks** — only the native `0x0FD2`/`0x0FD3` precompiles.

---

## 📊 The Attested Credit Scoring Model (xCS)

Credence maps on-chain verifiable repayment history into a sovereign score from **300 to 850**:

```
 300 ─────────── 550 ─────────── 650 ─────────── 720 ─────────── 780 ────── 850
│  UNVERIFIED   │    BRONZE     │    SILVER     │     GOLD      │   PLATINUM    │
│  50% Max LTV  │  65% Max LTV  │  75% Max LTV  │  85% Max LTV  │  90% Max LTV  │
│  (0% Disc.)   │  (0% Disc.)   │ (-1.0% APR)   │ (-2.0% APR)   │ (-3.0% APR)   │
```

- **Unverified Tier (300-549):** 50% max LTV (standard 200% overcollateralization).
- **Bronze Tier (550-649):** 65% max LTV (≥50 combined pts, e.g. $4,000+ volume [60 pts] OR 5 clean repayments [50 pts]).
- **Silver Tier (650-719):** 75% max LTV + 100 bps APR discount (≥150 combined pts).
- **Gold Tier (720-779):** 85% max LTV + 200 bps APR discount (≥220 combined pts).
- **Platinum Tier (780-850):** **90% max LTV (Undercollateralized)** + 300 bps APR discount (≥280 combined pts; perfect 850 requires $14,000+ verified volume [200 pts] across 15 clean repayments [150 pts]).

---

## 🚀 Quickstart & Local Reproduction

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- MetaMask (or any EIP-1193 wallet) for the interactive dApp

**Status:** contracts test suite 11/11 passing · frontend production build clean · all contracts live on Creditcoin CC3 Testnet.

### 1. Smart Contracts & Test Suite
```bash
cd contracts
npm install
npm test
```

To run the local proof-verification simulation (MockBlockProver on Hardhat):
```bash
npm run demo:verify
```

To (re)seed the on-chain demo credit profiles used by the `/check` presets (owner-only; see script header for mechanism):
```bash
npm run seed:profiles
```

### 2. Off-Chain Relayer & AI Sentinel
```bash
cd ../relayer
npm install
cp .env.example .env   # fill in RELAYER_PRIVATE_KEY (testnet-funded wallet)
```
```bash
npm run worker      # proof worker: fetch source receipts, build & submit attestations
npm run sentinel    # AI Risk Sentinel daemon: health-factor telemetry + autonomous liquidation
npm run e2e         # one-shot end-to-end: repay on Sepolia -> attestation on Creditcoin -> score update
```

### 3. Frontend Web Application
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the interactive dApp (credit scanner, borrow/supply terminals, proof explorer, judge playground, sentinel stream). The app reads live on-chain state even without a wallet connected.

### 4. Deploying to Vercel (Serverless Production)
Credence is optimized for zero-config Vercel Serverless deployment:
1. Import `mateojkk/credence` on [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Next.js** (auto-detected).
4. Environment Variables: **None required** (connects to Creditcoin CC3 Testnet via public RPC over HTTPS).
5. Click **Deploy**.

### Repository Structure
```
xcredence/
├── contracts/            # Solidity 0.8.24 (Hardhat) — hub, pool, sentinel, source vault, mocks
│   ├── src/creditcoin/   #   xCredenceHub, xCredenceLendingPool, AIRiskSentinel
│   ├── src/source/       #   SourceVault (deployed on Sepolia)
│   ├── src/crypto|libraries/ # RLPReader, MerklePatriciaVerifier, EvmV1Decoder
│   ├── src/mocks/        #   local-only precompile emulators for tests
│   ├── scripts/          #   deploy.ts, seed-demo-profiles.ts, verify-proof-demo.ts
│   └── test/             #   11 passing tests (canonical proof flow, LTV, liquidation)
├── relayer/              # TypeScript — canonical proof pipeline, risk sentinel, e2e runner
├── frontend/             # Next.js 14 dApp — credit scanner, borrow/lend, proof explorer, sentinel
├── scripts/              # root deploy/wallet utilities + precompile restore safety script
└── docs/                 # whitepaper, architecture, pitch deck, demo script
```

---

## 📂 Hackathon Deliverables

- 📄 **[Investor Pitch Deck (CEIP Fast-Track)](docs/PITCH_DECK.md)**
- 📐 **[Technical Whitepaper](docs/WHITEPAPER.md)**
- 🎥 **[3-Minute Hackathon Demo Script](docs/DEMO_SCRIPT.md)**
- 🏛️ **[Technical Architecture & Specs](docs/ARCHITECTURE.md)**

---

## 👥 Team & Submission Contacts
- **Project Name:** Credence
- **Sector:** DeFi (Cross-Chain Verifiable Lending & Sovereign Credit)
- **Hackathon:** BUIDL CTC 2026 Fall
- **Ecosystem:** Creditcoin & Credit Labs
- **Official Docs:** [docs.creditcoin.org/creditcoin-usc](https://docs.creditcoin.org/creditcoin-usc)
