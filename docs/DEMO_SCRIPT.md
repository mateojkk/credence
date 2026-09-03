# 🏆 Credence Protocol — Hackathon Demo Script (3-Minute Masterplan)

> **Target Competition:** BUIDL CTC 2026 Fall (Creditcoin & Credit Labs)  
> **Target Track:** DeFi (Cross-Chain Verifiable Lending & Sovereign Credit History) — Grand Prize Candidate  
> **Format:** 3:00 Minute Video Walkthrough / Live Presentation  
> **Tone:** Confident, visionary, technically precise, and energetic.

---

## ⏱️ Video Breakdown at a Glance

| Time | Segment | Screen / Route | Core Message |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:35** | **The Hook & Problem** | Landing Page (`/`) | DeFi lending is broken: 200% overcollateralized because chains are blind. |
| **0:35 – 1:05** | **The Superpower (0x0FD2)** | Proof Explorer (`/visualizer`) | Creditcoin’s native MPT precompile verifies cross-chain repayment in ~15s. |
| **1:05 – 1:35** | **The Credit Score (xCS)** | Credit Scanner (`/check`) | Turning Sepolia repayment into sovereign credit: 50% LTV vs 90% Platinum LTV. |
| **1:35 – 2:15** | **Live On-Chain Lending** | Faucet (`/faucet`) & Borrow (`/borrow`) | Real borrow with dynamic LTV enforcement on Creditcoin CC3 Testnet. |
| **2:15 – 2:40** | **Repayment & Autonomous Risk Sentinel** | Borrow (`/borrow`) & Sentinel (`/sentinel`) | 1-click repayment releases collateral; Sentinel automates liquidation risk. |
| **2:40 – 3:00** | **The Vision & Closing** | Overview (`/overview`) & Explorer | Creditcoin as the universal credit layer of Web3. |

---

## 🎬 Minute-by-Minute Script & Choreography

### 1. THE HOOK: The Billion-Dollar DeFi Blindspot (0:00 – 0:35)

#### 🖥️ On Screen:
* Start on the landing page [`/`](file:///home/mateo/basement/xcredence/frontend/src/app/(marketing)/page.tsx) with the interactive proof canvas gently animating behind the headline: *"Your repayment history, proven on-chain."*
* Mouse hovers over the live metrics strip showing **Pool liquidity**, **Max borrow LTV: 90%**, and **Verification engine: 0x0FD2**.

#### 🎙️ Voiceover:
> *"Today, DeFi lending is trapped in a multi-billion dollar paradox: to borrow $1,000, you have to lock up $2,000 of crypto.*
>
> *Why? Because blockchains are blind. A borrower can have a five-year perfect repayment track record on Ethereum, Arbitrum, or in traditional finance, but when they step onto a lending market, they are treated like an anonymous criminal.*
>
> *Welcome to **Credence** — the first decentralized, cryptographically verifiable credit scoring and undercollateralized lending protocol powered by **Creditcoin**."*

---

### 2. THE SUPERPOWER: Native MPT Proofs with 0x0FD2 (0:35 – 1:05)

#### 🖥️ On Screen:
* Click **"See how a proof verifies"** or navigate to [`/visualizer`](file:///home/mateo/basement/xcredence/frontend/src/app/(app)/visualizer/page.tsx).
* Scroll through the interactive Merkle Patricia Trie (MPT) tree visualization. Click on a proof branch and highlight the **0x0FD2 execution chip**.

#### 🎙️ Voiceover:
> *"Why couldn't this exist before? Because verifying Merkle Patricia Trie inclusion proofs across chains in EVM bytecode costs millions of gas.*
>
> *Credence leverages Creditcoin’s native superpower: **Precompile 0x0FD2**. When an invoice or loan is settled on Ethereum or Sepolia through our `SourceVault`, our relayer packages the raw transaction receipt into an MPT proof.*
>
> *Creditcoin's consensus engine executes this cryptographic proof directly at native speed in ~15 seconds. No multisigs. No trusted off-chain oracles. Pure mathematical truth."*

---

### 3. THE REPUTATION ENGINE: Sovereign On-Chain Credit (1:05 – 1:35)

#### 🖥️ On Screen:
* Navigate to [`/check`](file:///home/mateo/basement/xcredence/frontend/src/app/(app)/check/page.tsx).
* Click the preset **"Fresh"** (Unverified): Shows **Score 500**, **50% Max LTV**, **0% APR Discount**.
* Click the preset **"Aura Capital"** (Platinum): The gauge springs to life — **Score 850**, **90% Max LTV**, **3.00% APR Discount**, **$22,500 verified volume**.

#### 🎙️ Voiceover:
> *"Inside `xCredenceHub`, proven history converts into an **Attested Credit Score (xCS)** from 300 to 850.*
>
> *Look at the difference:*
> *A fresh, unverified wallet is capped at the traditional DeFi ceiling: **50% LTV** — requiring 200% collateral.*
>
> *But an attested institution like Aura Capital — with proven repayments verified via 0x0FD2 — reaches **Platinum Tier**. This unlocks up to **90% LTV** — an undercollateralized loan requiring only ~111% collateral, alongside a 300 basis point APR interest discount."*

---

### 4. LIVE EXECUTION: Undercollateralized Borrowing on CC3 (1:35 – 2:15)

#### 🖥️ On Screen:
* Navigate to [`/faucet`](file:///home/mateo/basement/xcredence/frontend/src/app/(app)/faucet/page.tsx): Show the 1-click **Starter Pack** button (minting 2,000 xCTC collateral & 2,000 xUSDC).
* Navigate to [`/borrow`](file:///home/mateo/basement/xcredence/frontend/src/app/(app)/borrow/page.tsx):
  1. Demonstrate the real dynamic protection: Enter an amount that exceeds the wallet's LTV cap to show the active safeguard: *"LTV Exceeds Limit"*.
  2. Input a valid loan: Deposit **500 xCTC** ($1,250 collateral) and borrow **600 xUSDC**. Show the calculated LTV (48.0%), effective APR, and tenure.
  3. Click **"Borrow 600 xUSDC"** and approve the MetaMask transaction on Creditcoin CC3 Testnet.
  4. The transaction confirms! The success alert appears with a live link to the Blockscout explorer.

#### 🎙️ Voiceover:
> *"Let’s see it live on Creditcoin CC3 Testnet.*
>
> *On our testnet Faucet, users claim test collateral in one click. Over on the Borrow terminal, Credence dynamically protects lenders. If an unverified user tries to exceed their 50% cap, the contract blocks it.*
>
> *Now, we originate a loan: locking 500 xCTC as collateral to borrow 600 xUSDC. We sign the transaction on MetaMask... and in seconds, it settles on Creditcoin!*
>
> *The capital is immediately disbursed into our wallet, and the active debt position is minted on-chain."*

---

### 5. REPAYMENT & AUTONOMOUS RISK SENTINEL (2:15 – 2:40)

#### 🖥️ On Screen:
* Scroll down to **"Your Loans & Repayments"** on [`/borrow`](file:///home/mateo/basement/xcredence/frontend/src/app/(app)/borrow/page.tsx). Show Loan #1 with the green **"Repay Loan"** button.
* Click **"Repay Loan"**: Confirms on-chain. Collateral is immediately returned to the wallet.
* Jump to [`/sentinel`](file:///home/mateo/basement/xcredence/frontend/src/app/(app)/sentinel/page.tsx): Show the **AI Risk Sentinel** radar, telemetry terminal, and live health factor monitor.

#### 🎙️ Voiceover:
> *"When borrowers are ready to settle, they scroll to their active positions table. A single click on **Repay** burns the debt, immediately releases 100% of the collateral back to the borrower, and increments their successful repayment count on `xCredenceHub`, raising their score.*
>
> *And to ensure protocol solvency around the clock, our autonomous **AI Risk Sentinel** monitors active health factors against live market volatility, streaming telemetry and executing trustless liquidations the instant a position crosses the liquidation threshold."*

---

### 6. THE VISION & CLOSING (2:40 – 3:00)

#### 🖥️ On Screen:
* Switch to [`/overview`](file:///home/mateo/basement/xcredence/frontend/src/app/(app)/overview/page.tsx) showing the unified credit dashboard, supplied reserves, active loans, and network status.
* Show the Github repository with 100% test coverage and smart contract verification on Blockscout.

#### 🎙️ Voiceover:
> *"Credence bridges real-world and cross-chain financial reputation into Creditcoin. All smart contracts — `xCredenceHub`, `xCredenceLendingPool`, `AIRiskSentinel`, and `SourceVault` — are fully deployed and live on Creditcoin CC3 Testnet.*
>
> *By turning past repayments into future borrowing power, Credence establishes Creditcoin as the universal credit layer for the multichain economy.*
>
> *Thank you, judges. Welcome to the future of credit on Creditcoin."*

---

## 🎯 The "Judge Ear-Catchers" (Punchlines to Emphasize)

1. **On Trustlessness:**  
   *"We don't trust an oracle or a multisig. We trust Creditcoin's native cryptographic precompile 0x0FD2."*
2. **On Capital Efficiency:**  
   *"In traditional DeFi, your reputation is always zero. On Credence, proven credit unlocks up to 90% LTV."*
3. **On Product Readiness:**  
   *"This isn't a mockup or a Figma prototype. Every transaction you see is settling live on Creditcoin CC3 Testnet."*
4. **On Creditcoin Alignment:**  
   *"Creditcoin was founded on the thesis of interchain credit history. Credence turns that founding thesis into live, liquid lending markets today."*

---

## 🛡️ Judge Q&A Defense Cheat Sheet

### Q1: "How does precompile 0x0FD2 actually prevent replay attacks?"
> **Answer:** *"In `xCredenceHub.sol`, we implement canonical replay protection per the official Creditcoin ASC standard: `txKey = keccak256(chainKey, height, txIndex)`. Once an MPT proof is verified, that unique `txKey` is permanently marked as processed in contract storage, making replay impossible even across forks."*

### Q2: "What prevents someone from borrowing and defaulting?"
> **Answer:** *"Credence employs a dual-defense model: First, loans are always collateralized (at least 111% even at Platinum tier), meaning the pool is never exposed to unbacked bad debt. Second, our `AIRiskSentinel` continuously calculates volatility-adjusted health factors. If collateral value dips, liquidation is executed autonomously before the loan becomes undercollateralized. Furthermore, defaulting irreversibly slashes the borrower's on-chain credit score back to 300 and blacklists the address across the protocol."*

### Q3: "Why did you build this on Creditcoin rather than Arbitrum or Solana?"
> **Answer:** *"Verifying Ethereum Merkle Patricia Trie receipts inside standard EVM costs millions of gas and cannot be executed atomically. Creditcoin is the only Layer 1 blockchain with native C++ / Rust precompiles (`0x0FD2` and `0x0FD3`) specifically optimized for cross-chain block and receipt validation in ~15 seconds."*

### Q4: "Where does the lending yield come from?"
> **Answer:** *"Real borrower demand. Borrowers pay between 5.00% and 8.00% APR on borrowed assets. 85% of all interest accrued is distributed continuously to liquidity suppliers based on the pool's utilization rate, with the remaining 15% funding the protocol reserve insurance fund."*
