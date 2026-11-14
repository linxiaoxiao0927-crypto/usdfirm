export type UsdfAssetType =
  | 'US_TREASURY_BILL'
  | 'FDIC_CASH_DEPOSIT'
  | 'OVERNIGHT_REPO'
  | 'FED_RESERVE_CASH';

export type UsdfOrderStatus =
  | 'PENDING_COMPLIANCE'
  | 'QUEUED_TIMELOCK'
  | 'EXECUTED'
  | 'REJECTED'
  | 'CANCELLED';

export interface UsdfReserveAssetItem {
  cusip: string;
  name: string;
  assetType: UsdfAssetType;
  custodian: string;
  maturityDate: string | null;
  notionalUsd: number;
  marketUsd: number;
  yieldApy: number;
  lastAuditDate: string;
}

export interface UsdfPoRAttestation {
  roundId: number;
  timestamp: string;
  totalReservesUsd: number;
  circulatingUsdf: number;
  reserveRatioPct: number;
  merkleRoot: string;
  auditorFirm: string;
  attestationReportUrl: string;
  isCompliant: boolean;
  chainlinkRoundData: {
    roundId: number;
    answerMicro: string;
    updatedAt: number;
  };
}

export interface UsdfMintBurnOrderRecord {
  orderNo: string;
  orderType: 'MINT' | 'BURN';
  partnerSite: 'xpayes.com' | 'itisdeal.com' | 'institutional_direct';
  requesterPubkey: string;
  amountUsd: number;
  feeUsd: number;
  status: UsdfOrderStatus;
  txHash: string | null;
  xpayesRef: string | null;
  itisdealRef: string | null;
  timelockEta: string | null;
  executedAt: string | null;
  createdAt: string;
}

export interface TimelockProposalRecord {
  proposalId: string;
  targetAction: string;
  proposer: string;
  delaySeconds: number;
  eta: string;
  status: 'QUEUED' | 'EXECUTED' | 'CANCELLED';
  confirmCount: number;
  requiredConfirmations: number;
  signers: string[];
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
  lastCheckTimestamp: string;
  alertLevel: 'NORMAL' | 'WARNING' | 'EMERGENCY_FREEZE';
}

export interface UsdfAuditLogRecord {
  sequenceNum: number;
  prevHash: string;
  currHash: string;
  actor: string;
  action: string;
  payloadSummary: string;
  timestamp: string;
}
