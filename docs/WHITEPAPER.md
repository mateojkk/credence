# Credence Protocol Whitepaper
### Universal Cross-Chain Verifiable Credit Protocol & Autonomous Risk Sentinel

**Authors:** The Credence Research & Engineering Team  
**Version:** 1.0.0 (Release Candidate)  
**Date:** August 2026  
**Ecosystem:** Creditcoin Network (USC / Attestcoin Protocol)

---

## 1. Abstract
Decentralized lending is currently constrained by the requirement for full or excess collateralization (typically 150% to 200%), preventing on-chain finance from scaling to meet the capital efficiency of traditional global debt markets. This limitation arises from the absence of trustless cross-chain credit verification. 

**Credence** introduces a novel decentralized credit settlement protocol deployed natively on **Creditcoin**, powered by the **Attestcoin Protocol (Universal Smart Contracts / USC)**. By utilizing Creditcoin's native **Block Prover precompile (`0x0FD2`)**, Credence verifies Merkle Patricia Trie transaction inclusion and continuity proofs from external blockchains (Ethereum, Sepolia, Base, Arbitrum) in a single block (~15 seconds) with zero reliance on centralized oracles or trusted multi-sig custodians. 

Credence computes a sovereign **Attested Credit Score (xCS)** from 300 to 850, unlocking up to **90% Loan-to-Value (LTV)** undercollateralized debt facilities. Protocol solvency is guaranteed by an autonomous **Risk Sentinel**, which monitors cross-chain position health and executes deterministic, proof-backed liquidations.

---

## 2. Mathematical Model of the Attested Credit Score (xCS)

The Credence Credit Score $S(A) \in [300, 850]$ for borrower address $A$ is formulated as:

$$S(A) = \text{clamp}\left(300, 850, S_{\text{base}} + \Omega_{\text{vol}}(V) + \Phi_{\text{freq}}(N) + \Theta_{\text{tenure}}(T) - \Delta_{\text{default}}(D)\right)$$

Where:
- $S_{\text{base}} = 500$ (Default unverified baseline score).
- $\Omega_{\text{vol}}(V) = \min\left(200, \left\lfloor \frac{V_{\text{USD}}}{1000} \right\rfloor \times 15\right)$: Volume factor contributing up to 200 points for cumulative verified cross-chain repayments $V_{\text{USD}}$.
- $\Phi_{\text{freq}}(N) = \min(150, N \times 10)$: Frequency factor rewarding $N$ on-time historical settlements.
- $\Theta_{\text{tenure}}(T) = \min(50, T_{\text{months}} \times 5)$: Cross-chain longevity bonus.
- $\Delta_{\text{default}}(D) = D \times 120$: Strict penalty of 120 points per recorded liquidation or missed obligation.

### Dynamic Loan-to-Value (LTV) Mapping

$$\text{MaxLTV}(S) = \begin{cases} 
90\% & \text{if } S \ge 780 \text{ (Platinum Tier)} \\
85\% & \text{if } 720 \le S < 780 \text{ (Gold Tier)} \\
75\% & \text{if } 650 \le S < 720 \text{ (Silver Tier)} \\
65\% & \text{if } 550 \le S < 650 \text{ (Bronze Tier)} \\
50\% & \text{if } S < 550 \text{ (Unverified / Baseline)}
\end{cases}$$

---

## 3. Cryptographic Verification via Attestcoin Protocol

### 3.1 Precompile Integration (`0x0FD2`)
The Creditcoin EVM runtime exposes the **Block Prover precompile** at address `0x0000000000000000000000000000000000000FD2`. 

When an event is emitted on a source chain (e.g. `RepaymentLogged` on Sepolia), the off-chain worker constructs a tuple:

$$\Pi = \langle \text{ChainID}, \text{BlockNumber}, \text{BlockHash}, \text{TxHash}, \text{EmitterAddress}, \text{EventSig}, \text{Payload}, \text{MerklePath} \rangle$$

The precompile verifies:
1. **Block Continuity:** The block hash matches the attested header root validated by Creditcoin consensus validators.
2. **Receipt Inclusion:** The Merkle Patricia Trie path cryptographically resolves to the block's `receiptsRoot`.
3. **Payload Decoding:** The event signature matches the deterministic hash:
   $$\text{keccak256}(\text{"RepaymentLogged(address,uint256,address,uint256,uint256,bytes32)"})$$

### 3.2 Replay Protection Invariant
To prevent double-counting or re-attestation of historical transactions, the Creditcoin hub enforces:

$$\mathcal{H}_{\text{attest}} = \text{keccak256}(\text{chainKey} \mathbin{\Vert} \text{blockHeight} \mathbin{\Vert} \text{txIndex})$$
$$\text{require}(\text{processedAttestations}[\mathcal{H}_{\text{attest}}] == \text{false})$$

---

## 4. Autonomous Risk Sentinel & Liquidation Dynamics

### 4.1 Health Factor ($HF$) Formulation
The health factor of active loan position $i$ is calculated continuously:

$$HF_i = \frac{C_i \cdot P_C \cdot (1 - \sigma_{\text{asset}})}{D_i \cdot P_D}$$

Where:
- $C_i$: Collateral amount locked.
- $P_C$: Collateral oracle price.
- $D_i$: Debt amount outstanding (Principal + accrued interest).
- $P_D$: Borrowed asset price.
- $\sigma_{\text{asset}}$: Volatility index discount factor.

### 4.2 Autonomous Liquidation Trigger
If $HF_i < 1.05$ (10,500 bps), authorized Sentinel nodes generate an attestation reference and trigger `executeAutonomousLiquidation()`, transferring collateral to the liquidator and assessing a score penalty $\Delta_{\text{default}}$ to the borrower.

---

## 5. Security & Risk Mitigations
1. **Zero Centralized Oracles:** Price and repayment verifications rely strictly on cryptographic inclusion proofs verified directly by Creditcoin validators.
2. **Sybil Resistance:** New addresses default to 50% LTV ($S=500$) and cannot unlock capital efficiency without proven historical repayments.
3. **Reentrancy Protection:** All fund transfers follow checks-effects-interactions patterns guarded by OpenZeppelin `ReentrancyGuard`.

---

## 6. Conclusion
Credence demonstrates the full technical capabilities of the Attestcoin Protocol (USC), bridging fragmented liquidity and turning Creditcoin into the primary decentralized credit evaluation and settlement layer for Web3.
