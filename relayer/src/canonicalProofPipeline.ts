import { ethers } from "ethers";
import {
  chainInfo,
  proofGenerator,
} from "@gluwa/cc-next-query-builder";
import { CONFIG } from "./config";

/**
 * Canonical Attestcoin proof pipeline built entirely on Creditcoin's
 * out-of-the-box tooling:
 *
 *   1. ChainInfo precompile (0x0FD3)   → resolve source EVM chainId → chainKey,
 *                                        wait until the tx block is attested
 *   2. Proof Builder API               → fetch Merkle + continuity proofs
 *                                        (/api/v1/proof-by-tx/{chainKey}/{txHash})
 *   3. Result                          → canonical args ready for xCredenceHub,
 *                                        which forwards them to Block Prover 0x0FD2
 */
export interface CanonicalProof {
  chainKey: number;
  sourceChainId: number;
  height: number;
  encodedTransaction: string;
  merkleProof: { blockDigest: string; siblings: [string, boolean][] };
  continuityProof: { anchor: string; hashes: string[] };
  /** Decoded RepaymentLogged args, read locally from the source receipt. */
  borrower: string;
  actionType: number;
  amountUSD: bigint;
  txHash: string;
}

export class CanonicalProofPipeline {
  private ccProvider: ethers.JsonRpcProvider;
  private sourceProvider: ethers.JsonRpcProvider;
  private chainInfoProvider: instanceOf<typeof chainInfo.PrecompileChainInfoProvider>;
  private apiProver: instanceOf<typeof proofGenerator.api.ProverAPIProofGenerator> | null = null;

  constructor(sourceRpcUrl: string) {
    this.ccProvider = new ethers.JsonRpcProvider(CONFIG.CREDITCOIN_RPC);
    this.sourceProvider = new ethers.JsonRpcProvider(sourceRpcUrl);
    this.chainInfoProvider = new chainInfo.PrecompileChainInfoProvider(this.ccProvider);
  }

  /** Resolve the Creditcoin chainKey for an EVM source chainId via precompile 0x0FD3. */
  public async resolveChainKey(sourceChainId: number): Promise<number> {
    const supported = await this.chainInfoProvider.getSupportedChains();
    const match = supported.find((c: any) => Number(c.chainId) === sourceChainId);
    if (!match) {
      throw new Error(
        `Source chain ${sourceChainId} is not attested on Creditcoin. Supported: ` +
          supported.map((c: any) => `${c.chainName}(#${c.chainId}→key ${c.chainKey})`).join(", ")
      );
    }
    return Number(match.chainKey);
  }

  /**
   * Full end-to-end proof build for a source-chain transaction.
   */
  public async build(txHash: string): Promise<CanonicalProof> {
    // --- Source-side facts -------------------------------------------------
    const receipt = await this.sourceProvider.getTransactionReceipt(txHash);
    if (!receipt) throw new Error(`Receipt not found for ${txHash}`);
    const height = receipt.blockNumber;
    const network = await this.sourceProvider.getNetwork();
    const sourceChainId = Number(network.chainId);

    // Extract the repayment event args from the receipt log
    const log = receipt.logs[0];
    if (!log) throw new Error("No event log in source transaction");
    const [borrower, amountRaw] = new ethers.AbiCoder().decode(
      ["address", "uint256"],
      log.data
    );
    // LOAN_REPAYMENT = 1 per IxCredence.CrossChainActionType
    const actionType = 1;

    // --- Creditcoin-side attestation --------------------------------------
    const chainKey = await this.resolveChainKey(sourceChainId);
    console.log(
      `[CanonicalPipeline] chainId ${sourceChainId} → chainKey ${chainKey}; waiting for block ${height} attestation…`
    );
    await this.chainInfoProvider.waitUntilHeightAttested(chainKey, height, 10_000, 900_000);

    // --- Proof Builder API (OOB service) -----------------------------------
    if (!this.apiProver) {
      this.apiProver = new proofGenerator.api.ProverAPIProofGenerator(
        chainKey,
        CONFIG.PROOF_GEN_API_URL
      );
    }
    // DNS for the proof API can be flaky from some networks — retry generously.
    let result: any = null;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        result = await this.apiProver!.generateProof(txHash);
        if (result.success && result.data) break;
        lastErr = new Error(result.error ?? "unknown error");
      } catch (e) {
        lastErr = e;
      }
      console.log(`   ↻ proof API attempt ${attempt} failed, retrying…`);
      await new Promise((r) => setTimeout(r, 5_000));
    }
    if (!result || !result.success || !result.data) {
      throw new Error(`Proof generation failed: ${(lastErr as Error)?.message ?? "unknown"}`);
    }
    const d: any = result.data;
    console.log(
      `[CanonicalPipeline] Proof fetched: header #${d.headerNumber ?? height}, merkle ${
        Array.isArray(d.merkleProof) ? "ok" : "?"
      }, continuity ok`
    );

    return {
      chainKey,
      sourceChainId,
      height: d.headerNumber ?? height,
      encodedTransaction: d.txBytes,
      merkleProof: d.merkleProof,
      continuityProof: d.continuityProof,
      borrower,
      actionType,
      amountUSD: BigInt(amountRaw),
      txHash,
    };
  }
}

// Minimal helper type so we don't fight the SDK's nested generics in config
type instanceOf<T> = T extends new (...args: any) => infer R ? R : never;
