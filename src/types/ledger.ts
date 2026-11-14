export type TokenType = 'USDF' | 'UUSDF';

export type AccountType =
  | 'ASSET_RESERVE'
  | 'USER_WALLET'
  | 'ESCROW_VAULT'
  | 'SKILL_GAS_POOL'
  | 'TREASURY_BURN';

export type EscrowStatus =
  | 'PENDING_4FLOW'
  | 'LOCKED_IN_TRANSIT'
  | 'SETTLED_SPLIT'
  | 'DISPUTED_FROZEN'
  | 'REFUNDED';

export type SkillCode =
  | 'SKILL_01_SETUPYES'
  | 'SKILL_02_TAXYES'
  | 'SKILL_03_UPTOYES'
  | 'SKILL_04_FITJOB'
  | 'SKILL_05_TOCADS'
  | 'SKILL_06_IDLES';

export type ParticleCategory =
  | 'B2B_INFRA'
  | 'FINTECH_RESERVE'
  | 'AI_COMPUTE'
  | 'RETAIL_BRANDS';

export type MatrixCluster =
  | 'SUPER_APP'
  | 'FINTECH_CRYPTO'
  | 'B2B_INFRA_SKILLS'
  | 'AI_VERTICALS'
  | 'RETAIL_BRANDS'
  | 'HOLDING_LAB';

export interface FederationNodeItem {
  domain: string;
  brandName: string;
  brandNameEn?: string;
  cluster: MatrixCluster;
  roleSummary: string;
  roleSummaryEn?: string;
  protocolType: 'WEBHOOK_REST' | 'GRPC_STREAM' | 'STATE_CHANNEL';
  status: 'ONLINE' | 'SYNCING' | 'DEGRADED';
  latencyMs: number;
  volume24hAsdS: number;
  gasBurn24hAsdG: number;
  lastSyncAt: string;
}

export interface SkillDefinition {
  code: SkillCode;
  name: string;
  domain: string;
  category: ParticleCategory;
  unitLabel: string;
  gasPerUnit: number;
  burnRatio: number;
  providerRatio: number;
  description: string;
}

export interface LedgerAccountRecord {
  id: string;
  ownerSite: string;
  ownerEntity: string;
  accountType: AccountType;
  asdStableBal: number;
  asdGasBal: number;
  version: number;
  updatedAt: string;
}

export interface LedgerEntryRecord {
  id: string;
  idempotencyKey: string;
  txHash: string;
  debitAccId: string;
  creditAccId: string;
  amount: number;
  tokenType: TokenType;
  skillCode: SkillCode | null;
  memo: string;
  category: ParticleCategory;
  createdAt: string;
}

export interface SplitRuleItem {
  recipientSite: string;
  roleLabel: string;
  percentage: number;
}

export interface FourFlowEscrowRecord {
  id: string;
  orderNo: string;
  sourceSite: string;
  buyerEntity: string;
  totalAmountAsd: number;
  status: EscrowStatus;
  setupyesEntity: string | null;
  taxyesRouteId: string | null;
  xpayesPayment: string | null;
  uptoyesWaybill: string | null;
  splitRules: SplitRuleItem[];
  settledAt: string | null;
  createdAt: string;
}

export interface ReserveAssetItem {
  id: string;
  custodian: string;
  assetName: string;
  channelDomain: string;
  usdValue: number;
  allocationPct: number;
  merkleRoot: string;
  lastAuditedAt: string;
}

export interface LedgerSnapshot {
  circulatingAsdS: number;
  circulatingAsdG: number;
  totalReserveUsd: number;
  reserveRatioPct: number;
  totalBurnedAsdG: number;
  fourFlowAlignmentPct: number;
  tpsPulse: number;
  trialBalanceOk: boolean;
  accounts: LedgerAccountRecord[];
  recentEntries: LedgerEntryRecord[];
  escrowOrders: FourFlowEscrowRecord[];
  reserves: ReserveAssetItem[];
  skills: SkillDefinition[];
  federationNodes: FederationNodeItem[];
}
