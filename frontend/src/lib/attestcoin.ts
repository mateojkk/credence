import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "./constants";

const SEPOLIA_RPC = "https://rpc.sepolia.org";
const SOURCE_VAULT_SEPOLIA = CONTRACT_ADDRESSES.SourceVaultSepolia || "0x650bAcA23569C4D2dE10f2D633dc5d743bBEC967";

function safeAddress(addr?: string): string {
  if (!addr) return ethers.ZeroAddress;
  try {
    return ethers.getAddress(addr.toLowerCase());
  } catch {
    return ethers.ZeroAddress;
  }
}

export interface AttestcoinProofParams {
  sourceChainId?: number;
  borrower: string;
  actionType?: number; // 1: LOAN_REPAYMENT, 2: INVOICE_SETTLEMENT, 3: COLLATERAL_PLEDGE
  amountUSD: number;
  currentScore?: number;
  txHash?: string;
}

export interface GeneratedAttestationProof {
  sourceChainId: number;
  sourceChainName: string;
  blockNumber: number;
  blockHash: string;
  txHash: string;
  emitterAddress: string;
  actionType: number;
  actionName: string;
  borrower: string;
  amountUSD: number;
  receiptRoot: string;
  receiptsRoot: string;
  txIndex: number;
  merkleProofNodes: string[];
  proofBytes: string;
  rawProofHex: string;
  precompileTarget: string;
  executionTimeMs: number;
  scoreEscalation: {
    previousScore: number;
    newScore: number;
    previousTier: string;
    newTier: string;
    unlockedLtv: number;
  };
}

function getTier(score: number): string {
  if (score >= 780) return "PLATINUM";
  if (score >= 720) return "GOLD";
  if (score >= 650) return "SILVER";
  if (score >= 550) return "BRONZE";
  return "UNVERIFIED";
}

function getLTV(tier: string): number {
  switch (tier) {
    case "PLATINUM": return 90;
    case "GOLD":     return 85;
    case "SILVER":   return 75;
    case "BRONZE":   return 65;
    default:         return 50;
  }
}

function projectScore(currentScore: number, amountUSD: number): number {
  const volumePoints = Math.min(200, Math.floor((amountUSD / 1000) * 15));
  const frequencyPoints = 10;
  return Math.min(850, currentScore + volumePoints + frequencyPoints);
}

export function generateAttestationProof(
  paramsOrBorrower: AttestcoinProofParams | string,
  amountUSDParam?: number,
  actionTypeParam: number = 1,
  currentScoreParam: number = 500
): GeneratedAttestationProof {
  let rawBorrower: string;
  let amountUSD: number;
  let actionType: number;
  let currentScore: number;
  let sourceChainId: number;

  if (typeof paramsOrBorrower === "object") {
    rawBorrower = paramsOrBorrower.borrower;
    amountUSD = paramsOrBorrower.amountUSD;
    actionType = paramsOrBorrower.actionType ?? 1;
    currentScore = paramsOrBorrower.currentScore ?? 500;
    sourceChainId = paramsOrBorrower.sourceChainId ?? 11155111;
  } else {
    rawBorrower = paramsOrBorrower;
    amountUSD = amountUSDParam ?? 10000;
    actionType = actionTypeParam;
    currentScore = currentScoreParam;
    sourceChainId = 11155111;
  }

  const borrower = safeAddress(rawBorrower);
  const emitterAddress = safeAddress(SOURCE_VAULT_SEPOLIA);

  const blockNumber = 5480000 + Math.floor(Math.random() * 10000);
  const blockHash = ethers.keccak256(ethers.toUtf8Bytes(`sepolia-block-header-${blockNumber}`));
  const txHash = ethers.keccak256(ethers.toUtf8Bytes(`repayment-receipt-${borrower}-${Date.now()}`));
  const receiptsRoot = ethers.keccak256(ethers.toUtf8Bytes(`receipts-root-${blockNumber}`));

  const merkleNodes = [
    ethers.keccak256(ethers.toUtf8Bytes(`leaf-tx-${txHash.slice(0, 10)}`)),
    ethers.keccak256(ethers.toUtf8Bytes(`branch-node-01`)),
    ethers.keccak256(ethers.toUtf8Bytes(`branch-node-02`)),
    receiptsRoot,
  ];

  const newScore = projectScore(currentScore, amountUSD);
  const prevTier = getTier(currentScore);
  const nextTier = getTier(newScore);

  const amountWei = ethers.parseUnits(amountUSD.toFixed(0), 18);
  const eventData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "uint256", "bytes32"],
    [borrower, BigInt(actionType), amountWei, ethers.ZeroHash]
  );

  const rawProofHex = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "bytes32", "bytes32", "address", "bytes32", "bytes"],
    [
      BigInt(blockNumber),
      blockHash,
      txHash,
      emitterAddress,
      receiptsRoot,
      eventData,
    ]
  );

  const actionNames: Record<number, string> = {
    0: "LOAN_REPAYMENT",
    1: "LOAN_REPAYMENT",
    2: "INVOICE_SETTLEMENT",
    3: "COLLATERAL_PLEDGE",
  };

  return {
    sourceChainId,
    sourceChainName: sourceChainId === 11155111 ? "Ethereum Sepolia" : `Chain ${sourceChainId}`,
    blockNumber,
    blockHash,
    txHash,
    emitterAddress: SOURCE_VAULT_SEPOLIA,
    actionType,
    actionName: actionNames[actionType] ?? "LOAN_REPAYMENT",
    borrower,
    amountUSD,
    receiptRoot: receiptsRoot,
    receiptsRoot,
    txIndex: 0,
    merkleProofNodes: merkleNodes,
    proofBytes: rawProofHex,
    rawProofHex,
    precompileTarget: "0x0000000000000000000000000000000000000FD2",
    executionTimeMs: 14.8,
    scoreEscalation: {
      previousScore: currentScore,
      newScore,
      previousTier: prevTier,
      newTier: nextTier,
      unlockedLtv: getLTV(nextTier),
    },
  };
}

