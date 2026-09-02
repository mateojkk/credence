import * as dotenv from "dotenv";

dotenv.config();

export const CONFIG = {
  CREDITCOIN_RPC: process.env.CREDITCOIN_RPC_URL || "https://rpc.cc3-testnet.creditcoin.network/",
  CREDITCOIN_CHAIN_ID: 102031,
  // Live deployment (2026-08-19) — matches frontend/src/lib/deployed-contracts.json
  CREDITCOIN_HUB_ADDRESS: process.env.CREDITCOIN_HUB_ADDRESS || "0x6F242C3b40C9C89D4400bB77F2Fd18D0dfCDF39e",
  CREDITCOIN_POOL_ADDRESS: process.env.CREDITCOIN_POOL_ADDRESS || "0x1688e85a494B8a51fF9Cf2D71193767107bcBa9C",
  BLOCK_PROVER_PRECOMPILE: "0x0000000000000000000000000000000000000FD2",

  SEPOLIA_RPC: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
  SEPOLIA_CHAIN_ID: 11155111,
  SOURCE_VAULT_ADDRESS: process.env.SOURCE_VAULT_ADDRESS || "0x80fFF9bB1b9f3231CB7cB8e835F26cb217d1fBd3",

  RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY || "",

  AI_SENTINEL_ADDRESS: process.env.AI_SENTINEL_ADDRESS || "0x7f3137F762D28eD5DC396Fc6d793eA7B3dDa98cd",
  // Creditcoin out-of-the-box Proof Builder API (generates Merkle + continuity proofs)
  PROOF_GEN_API_URL: process.env.PROOF_GEN_API_URL || "https://proof-gen-api.cc3-testnet.creditcoin.network",
  PROOF_POLL_INTERVAL_MS: 5000,
  RISK_EVAL_INTERVAL_MS: 10000,

  // AI Sentinel behaviour
  VOLATILITY_INDEX: Number(process.env.VOLATILITY_INDEX ?? 0.25),
  // Only set to "true" when the relayer wallet is an authorized agent on AIRiskSentinel
  AUTO_LIQUIDATE: process.env.AUTO_LIQUIDATE === "true",
};
