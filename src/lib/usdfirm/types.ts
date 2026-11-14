export type UsdfAssetType =
  | 'US_TREASURY_BILL'
  | 'FDIC_CASH_DEPOSIT'
  | 'OVERNIGHT_REPO'
  | 'FED_RESERVE_CASH'
  | string;

export type UsdfOrderStatus =
  | 'PENDING_COMPLIANCE'
  | 'QUEUED_TIMELOCK'
  | 'EXECUTED'
  | 'SETTLED'
  | 'REJECTED'
  | 'CANCELLED';

export interface UsdfReserveAssetItem {
  cusip: string;
  name: string;
  nameZh?: string;
  nameEn?: string;
  assetType: UsdfAssetType;
  custodian: string;
  maturityDate: string | null;
  notionalUsd: number;
  marketUsd: number;
  yieldApy: number;
  weightPct?: number;
  lastAuditDate: string;
}

export interface UsdfPoRAttestation {
  roundId: number;
  timestamp: string;
  totalReservesUsd: number;
  circulatingUsdf: number;
  surplusUsd?: number;
  reserveRatioPct: number;
  weightedYieldBps?: number;
  merkleRoot: string;
  auditorFirm: string;
  attestationReportUrl: string;
  isCompliant: boolean;
  status?: string;
  chainlinkRoundData: {
    roundId: number;
    answerMicro: string;
    updatedAt: number;
  };
}

export interface UsdfMintBurnOrderRecord {
  orderNo: string;
  orderType: 'MINT' | 'BURN';
  rawOrderType?: string;
  partnerSite: 'xpayes.com' | 'segregated_mm_desk' | 'institutional_direct' | 'usdfirm.com' | string;
  requesterPubkey: string;
  amountUsd: number;
  feeUsd: number;
  status: UsdfOrderStatus;
  rawStatus?: string;
  txHash: string | null;
  merkleRoot?: string | null;
  traceId?: string | null;
  fiatCurrency?: string;
  fiatAmount?: number;
  xpayesRef: string | null;
  segregatedMmRef: string | null;
  timelockEta: string | null;
  executedAt: string | null;
  createdAt: string;
}

export interface TimelockProposalRecord {
  proposalId: string;
  targetAction: string;
  titleZh?: string;
  titleEn?: string;
  amountUsd?: number;
  proposer: string;
  delaySeconds: number;
  eta: string;
  status: 'QUEUED' | 'EXECUTED' | 'CANCELLED';
  rawStatus?: 'PENDING' | 'READY_TO_EXECUTE' | 'EXECUTED' | string;
  confirmCount: number;
  requiredConfirmations: number;
  signers: string[];
  traceId?: string;
  executionTx: string | null;
  createdAt: string;
}

export interface UsdfRiskTelemetrySnapshot {
  circuitBreakerActive: boolean;
  reserveRatioPct: number;
  depegDeltaBps: number;
  currentPegUsd: number;
  dailyMintVolumeUsd: number;
  dailyMintCapUsd: number;
  isExchangeRiskSegregated: boolean;
  segregatedBufferUtilizationPct?: number;
  riskLevel?: string;
  firewallMode?: string;
  lastCheckTimestamp: string;
  alertLevel: 'NORMAL' | 'WARNING' | 'EMERGENCY_FREEZE';
}

export interface UsdfAuditLogRecord {
  sequenceNum: number;
  id?: string;
  prevHash: string;
  currHash: string;
  actor: string;
  action: string;
  payloadSummary: string;
  summaryZh?: string;
  summaryEn?: string;
  traceId?: string;
  timestamp: string;
}

export interface UsdfBufferItem {
  module_id: string;
  allocated_usdf: number;
  max_cap_usdf: number;
  is_segregated: number;
  updated_at: number;
}

export interface UsdfClearingTraceHop {
  id: string;
  trace_id: string;
  hop_seq: number;
  caller: string;
  receiver: string;
  action: string;
  amount: number;
  asset: string;
  status: string;
  receipt_hash: string;
  meta_json: string;
  created_at: number;
}

export interface UsdfirmProtocolBundle {
  attestation: UsdfPoRAttestation;
  reserves: UsdfReserveAssetItem[];
  orders: UsdfMintBurnOrderRecord[];
  proposals: TimelockProposalRecord[];
  signers: string[];
  requiredConfirmations: number;
  telemetry: UsdfRiskTelemetrySnapshot;
  auditLogs: UsdfAuditLogRecord[];
  bufferStatus: { allocated: number; maxCap: number; isSegregated: boolean };
  buffers?: UsdfBufferItem[];
  traces?: UsdfClearingTraceHop[];
  onlineClients?: number;
  serverTs?: number;
  source?: 'LIVE_WORKER' | 'LOCAL_ENGINE';
}

export interface FirewallSelfCheckResult {
  passed: boolean;
  httpStatus: number;
  errorCode: string;
  endpoint: string;
  traceId: string;
  latencyMs: number;
  checkedAt: string;
}
