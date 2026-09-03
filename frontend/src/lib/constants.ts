import deployedData from "./deployed-contracts.json";

export const NETWORKS = {
  CREDITCOIN_TESTNET: {
    chainId: 102031,
    hexChainId: "0x18E8F",
    name: "Creditcoin Testnet",
    rpcUrl: "https://rpc.cc3-testnet.creditcoin.network/",
    symbol: "xCTC",
    decimals: 18,
    explorer: "https://creditcoin-testnet.blockscout.com",
    precompile0x0FD2: "0x0000000000000000000000000000000000000FD2",
    precompile0x0FD3: "0x0000000000000000000000000000000000000FD3",
  },
  SEPOLIA: {
    chainId: 11155111,
    hexChainId: "0xAA36A7",
    name: "Ethereum Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
    symbol: "SepoliaETH",
    decimals: 18,
    explorer: "https://sepolia.etherscan.io",
  }
};

export const CONTRACT_ADDRESSES = {
  xCredenceHub: deployedData.contracts.xCredenceHub,
  xCredenceLendingPool: deployedData.contracts.xCredenceLendingPool,
  AIRiskSentinel: deployedData.contracts.AIRiskSentinel,
  SourceVaultSepolia: deployedData.contracts.SourceVault,
  xUSDC: deployedData.contracts.xUSDC,
  xCTC: deployedData.contracts.xCTC,
  // Native Creditcoin precompiles, confirmed live via eth_call (returns "Unknown selector" from Rust code)
  precompile0x0FD2: "0x0000000000000000000000000000000000000FD2",
  precompile0x0FD3: "0x0000000000000000000000000000000000000FD3",
};

export const HUB_ABI = [
  "function totalProofsVerified() external view returns (uint256)",
  "function totalVerifiedVolumeUSD() external view returns (uint256)",
  "function totalProfilesCreated() external view returns (uint256)",
  "function getCreditProfile(address borrower) external view returns (tuple(uint256 creditScore, uint8 tier, uint256 totalRepaidUSD, uint256 successfulRepayments, uint256 lastAttestationTime, uint256 defaultCount, bool isBlacklisted))",
  "function getMaxLTVBps(address borrower) external view returns (uint256)",
  "function getInterestDiscountBps(address borrower) external view returns (uint256)",
  "function verifyAndProcessCanonicalProof(uint64 chainKey, uint64 height, bytes encodedTransaction, (bytes32,(bytes32,bool)[]) merkleProof, (bytes32,bytes32[]) continuityProof) external returns (bool)",
  "function supportedSourceChains(uint256) external view returns (bool)",
  "event CreditScoreUpdated(address indexed borrower, uint256 previousScore, uint256 newScore, uint8 tier)",
  "event CrossChainProofVerified(bytes32 indexed txHash, uint256 indexed sourceChainId, address indexed borrower, uint8 actionType, uint256 amount, uint256 newCreditScore, uint8 newTier)"
];

export const POOL_ABI = [
  "function reserves(address token) external view returns (tuple(bool isSupported, uint256 totalSupplied, uint256 totalBorrowed, uint256 supplyRateBps, uint256 oraclePriceUSD))",
  "function BASE_BORROW_RATE_BPS() external view returns (uint256)",
  "function loans(uint256 loanId) external view returns (tuple(uint256 loanId, address borrower, address collateralToken, uint256 collateralAmount, address borrowToken, uint256 principalAmount, uint256 totalOwed, uint256 interestRateBps, uint256 borrowedAt, uint256 dueDate, uint8 tierAtBorrow, bool isSettled, bool isLiquidated))",
  "function getUserLoanIds(address user) external view returns (uint256[] memory)",
  "function supply(address token, uint256 amount) external",
  "function withdraw(address token, uint256 amount) external",
  "function borrow(address collateralToken, uint256 collateralAmount, address borrowToken, uint256 borrowAmount, uint256 durationDays) external returns (uint256)",
  "function repay(uint256 loanId, uint256 amount) external",
  "function loanCount() external view returns (uint256)",
  "function supplierBalances(address token, address supplier) external view returns (uint256)",
  "event LoanOriginated(uint256 indexed loanId, address indexed borrower, address borrowToken, uint256 principalAmount, address collateralToken, uint256 collateralAmount, uint256 ltvBps, uint256 interestRateBps, uint256 dueDate)",
  "event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amountRepaid, bool fullyRepaid)",
  "event PositionLiquidated(uint256 indexed loanId, address indexed borrower, address indexed liquidator, uint256 debtCovered, uint256 collateralSeized, bytes32 proofRef)",
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)"
];

export const ERC20_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)",
  "function faucet(address to, uint256 amount) external",
  "function mint(address to, uint256 amount) external",
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
  "error ERC20InvalidSender(address sender)",
  "error ERC20InvalidReceiver(address receiver)",
  "error ERC20InvalidApprover(address approver)",
  "error ERC20InvalidSpender(address spender)"
];

export const SENTINEL_ABI = [
  "function emitRiskTelemetry(address borrower, uint256 sourceChainId, uint256 healthFactorBps, string calldata riskMessage) external",
  "function executeAutonomousLiquidation(uint256 loanId, bytes32 proofRef, uint256 healthFactorBps) external",
  "function setAgentAuthorization(address agent, bool isAuthorized) external",
  "function liquidationThresholdBps() external view returns (uint256)",
  "function authorizedAgents(address) external view returns (bool)",
  "function totalAlertsDispatched() external view returns (uint256)",
  "function totalAutomatedLiquidations() external view returns (uint256)",
  "event RiskSentinelAlert(address indexed borrower, uint256 indexed sourceChainId, uint256 healthFactorBps, string riskMessage)"
];

export interface DemoProfile {
  name: string;
  address: string;
  label: string;
  avatar: string;
  score: number;
  tier: "UNVERIFIED" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  maxLtv: number;
  totalRepaidUSD: number;
  successfulRepayments: number;
  lastRepaymentDaysAgo: number;
  crossChainTenureMonths: number;
  verifiedChains: string[];
}

export const DEMO_PROFILES: DemoProfile[] = [
  {
    name: "Aura Capital (RWA Treasury)",
    address: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    label: "Elite Institution",
    avatar: "🏛️",
    score: 850,
    tier: "PLATINUM",
    maxLtv: 90,
    totalRepaidUSD: 22500,
    successfulRepayments: 15,
    lastRepaymentDaysAgo: 0,
    crossChainTenureMonths: 18,
    verifiedChains: ["Ethereum Mainnet", "Sepolia", "Base"],
  },
  {
    name: "Nexus DeFi Yield Fund",
    address: "0x71c67ED3E0Be34E532E39B980b3e84F59a65d3a2",
    label: "Prime Borrower",
    avatar: "⚡",
    score: 760,
    tier: "GOLD",
    maxLtv: 85,
    totalRepaidUSD: 24000,
    successfulRepayments: 6,
    lastRepaymentDaysAgo: 0,
    crossChainTenureMonths: 11,
    verifiedChains: ["Sepolia", "Arbitrum"],
  },
  {
    name: "Solvent Market Maker",
    address: "0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB",
    label: "Active Borrower",
    avatar: "📈",
    score: 710,
    tier: "SILVER",
    maxLtv: 75,
    totalRepaidUSD: 12000,
    successfulRepayments: 3,
    lastRepaymentDaysAgo: 0,
    crossChainTenureMonths: 5,
    verifiedChains: ["Sepolia"],
  },
  {
    name: "Fresh On-Chain Borrower",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    label: "Unverified / New",
    avatar: "🌱",
    score: 500,
    tier: "UNVERIFIED",
    maxLtv: 50,
    totalRepaidUSD: 0,
    successfulRepayments: 0,
    lastRepaymentDaysAgo: 0,
    crossChainTenureMonths: 0,
    verifiedChains: [],
  }
];

export const TIER_CONFIG = {
  UNVERIFIED: {
    name: "Unverified",
    minScore: 300,
    maxScore: 549,
    maxLtv: 50,
    discountBps: 0,
    color: "text-muted-foreground",
    bg: "bg-surface-2/60",
    border: "border-border",
    badge: "50% Max LTV (200% Collateral)",
  },
  BRONZE: {
    name: "Bronze",
    minScore: 550,
    maxScore: 649,
    maxLtv: 65,
    discountBps: 0,
    color: "text-amber-500",
    bg: "bg-amber-950/40",
    border: "border-amber-700/50",
    badge: "65% Max LTV",
  },
  SILVER: {
    name: "Silver",
    minScore: 650,
    maxScore: 719,
    maxLtv: 75,
    discountBps: 100,
    color: "text-foreground",
    bg: "bg-slate-700/40",
    border: "border-slate-500/50",
    badge: "75% Max LTV · 1% APR Discount",
  },
  GOLD: {
    name: "Gold",
    minScore: 720,
    maxScore: 779,
    maxLtv: 85,
    discountBps: 200,
    color: "text-yellow-400",
    bg: "bg-yellow-950/40",
    border: "border-yellow-600/50",
    badge: "85% Max LTV · 2% APR Discount",
  },
  PLATINUM: {
    name: "Platinum",
    minScore: 780,
    maxScore: 850,
    maxLtv: 90,
    discountBps: 300,
    color: "text-accent",
    bg: "bg-cyan-950/40",
    border: "border-cyan-500/50",
    badge: "90% Max LTV · 3% APR Discount (Undercollateralized)",
  },
};
