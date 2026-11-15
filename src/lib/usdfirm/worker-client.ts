import type {
  UsdfirmProtocolBundle,
  UsdfBufferItem,
  UsdfClearingTraceHop,
  UsdfMintBurnOrderRecord,
  UsdfReserveAssetItem,
  TimelockProposalRecord,
  UsdfAuditLogRecord,
  FirewallSelfCheckResult,
} from './types';

export const USDFIRM_WORKER_URL =
  process.env.USDFIRM_WORKER_URL ||
  process.env.NEXT_PUBLIC_USDFIRM_WORKER_URL ||
  'https://usdfirm-rt-protocol.linxiaoxiao0927.workers.dev';

export const USDFIRM_WS_URL =
  process.env.NEXT_PUBLIC_USDFIRM_WS_URL ||
  'wss://usdfirm-rt-protocol.linxiaoxiao0927.workers.dev/ws';

export function isVitestOffline(): boolean {
  return (
    process.env.VITEST === 'true' &&
    process.env.USDFIRM_FORCE_LIVE_WORKER !== 'true'
  );
}

export interface WorkerAttestationRaw {
  epoch: number;
  merkleRoot: string;
  totalReservesUsd: number;
  circulatingUsdf: number;
  surplusUsd: number;
  backingRatioPct: number;
  weightedYieldBps: number;
  pegUsd: number;
  status: string;
  attestedAt: number;
}

export interface WorkerReserveRaw {
  id: string;
  name_zh: string;
  name_en: string;
  custodian: string;
  asset_class: string;
  amount_usd: number;
  yield_bps: number;
  updated_at: number;
  weight_pct?: number;
}

export interface WorkerOrderRaw {
  id: string;
  order_type: string;
  source_module: string;
  counterparty: string;
  fiat_currency: string;
  fiat_amount: number;
  usdf_amount: number;
  tx_hash: string;
  merkle_root: string;
  status: string;
  trace_id: string;
  created_at: number;
}

export interface WorkerProposalRaw {
  id: string;
  action: string;
  title_zh: string;
  title_en: string;
  amount_usd: number;
  proposer: string;
  approvals_json?: string;
  required_confirmations: number;
  timelock_until: number;
  status: string;
  trace_id: string;
  created_at: number;
  approvals?: string[];
}

export interface WorkerAuditLogRaw {
  id: string;
  category: string;
  actor: string;
  summary_zh: string;
  summary_en: string;
  tx_hash: string;
  trace_id: string;
  created_at: number;
}

export interface WorkerTelemetryRaw {
  backingRatioPct: number;
  pegDeviationBps: number;
  circulatingUsdf: number;
  segregatedBufferUtilizationPct?: number;
  riskLevel: string;
  firewallMode: string;
}

export interface WorkerSnapshotResponse {
  ok: boolean;
  service?: string;
  domain?: string;
  isolation?: string;
  errorCode?: string;
  attestation: WorkerAttestationRaw;
  reserves: WorkerReserveRaw[];
  orders: WorkerOrderRaw[];
  proposals: WorkerProposalRaw[];
  signers: string[];
  requiredConfirmations: number;
  bufferStatus: { allocated: number; maxCap: number; isSegregated: boolean };
  buffers?: UsdfBufferItem[];
  telemetry: WorkerTelemetryRaw;
  auditLogs: WorkerAuditLogRaw[];
  traces?: UsdfClearingTraceHop[];
  onlineClients?: number;
  serverTs?: number;
}

export function mapWorkerSnapshotToBundle(raw: WorkerSnapshotResponse): UsdfirmProtocolBundle {
  const att = raw.attestation;
  const attestedDate = new Date(att.attestedAt || Date.now());

  const reserves: UsdfReserveAssetItem[] = (raw.reserves || []).map((r) => ({
    cusip: r.id,
    name: r.name_en,
    nameZh: r.name_zh,
    nameEn: r.name_en,
    assetType: r.asset_class,
    custodian: r.custodian,
    maturityDate: null,
    notionalUsd: Number(r.amount_usd || 0),
    marketUsd: Number(r.amount_usd || 0),
    yieldApy: Number((Number(r.yield_bps || 0) / 100).toFixed(2)),
    weightPct: r.weight_pct,
    lastAuditDate: new Date(r.updated_at || Date.now()).toISOString(),
  }));

  const orders: UsdfMintBurnOrderRecord[] = (raw.orders || []).map((o) => {
    const isBurn = String(o.order_type || '').toUpperCase().includes('BURN');
    const amountUsd = Number(o.usdf_amount || 0);
    const feeRate = isBurn ? 0.0003 : 0.0005;
    const createdIso = new Date(o.created_at || Date.now()).toISOString();
    return {
      orderNo: o.id,
      orderType: isBurn ? 'BURN' : 'MINT',
      rawOrderType: o.order_type,
      partnerSite: o.source_module || 'usdfirm.com',
      requesterPubkey: o.counterparty || 'Institutional Custody Desk',
      amountUsd,
      feeUsd: Number((amountUsd * feeRate).toFixed(2)),
      status: o.status === 'SETTLED' ? 'EXECUTED' : (o.status as UsdfMintBurnOrderRecord['status']),
      rawStatus: o.status,
      txHash: o.tx_hash || null,
      merkleRoot: o.merkle_root || null,
      traceId: o.trace_id || null,
      fiatCurrency: o.fiat_currency,
      fiatAmount: o.fiat_amount,
      xpayesRef: o.source_module === 'xpayes.com' ? o.counterparty : null,
      segregatedMmRef:
        o.source_module && o.source_module !== 'xpayes.com' && o.source_module !== 'usdfirm.com'
          ? o.counterparty
          : null,
      timelockEta: null,
      executedAt: createdIso,
      createdAt: createdIso,
    };
  });

  const proposals: TimelockProposalRecord[] = (raw.proposals || []).map((p) => {
    const approvals = Array.isArray(p.approvals)
      ? p.approvals
      : (JSON.parse(p.approvals_json || '[]') as string[]);
    const rawStatus = p.status || 'PENDING';
    return {
      proposalId: p.id,
      targetAction: p.action,
      titleZh: p.title_zh,
      titleEn: p.title_en,
      amountUsd: Number(p.amount_usd || 0),
      proposer: p.proposer,
      delaySeconds: 86400,
      eta: new Date(p.timelock_until || Date.now()).toISOString(),
      status: rawStatus === 'EXECUTED' ? 'EXECUTED' : 'QUEUED',
      rawStatus,
      confirmCount: approvals.length,
      requiredConfirmations: Number(p.required_confirmations || raw.requiredConfirmations || 3),
      signers: approvals,
      traceId: p.trace_id,
      executionTx: null,
      createdAt: new Date(p.created_at || Date.now()).toISOString(),
    };
  });

  const logsRaw = raw.auditLogs || [];
  const auditLogs: UsdfAuditLogRecord[] = logsRaw.map((l, idx) => {
    const nextOlder = logsRaw[idx + 1];
    return {
      sequenceNum: logsRaw.length - idx,
      id: l.id,
      prevHash: nextOlder?.tx_hash || '0x' + '0'.repeat(64),
      currHash: l.tx_hash,
      actor: l.actor,
      action: l.category,
      payloadSummary: l.summary_en || l.summary_zh,
      summaryZh: l.summary_zh,
      summaryEn: l.summary_en,
      traceId: l.trace_id,
      timestamp: new Date(l.created_at || Date.now()).toISOString(),
    };
  });

  const nowMs = Date.now();
  const dailyMintVolumeUsd = (raw.orders || [])
    .filter(
      (o) =>
        o.id !== 'ORD-GENESIS-001' &&
        String(o.order_type || '').toUpperCase().includes('MINT') &&
        nowMs - Number(o.created_at || 0) <= 86_400_000
    )
    .reduce((sum, o) => sum + Number(o.usdf_amount || 0), 0);

  const backingRatioPct = Number(raw.telemetry?.backingRatioPct ?? att.backingRatioPct ?? 100);
  const pegUsd = Number(att.pegUsd ?? 1.0);
  const pegDeviationBps = Number(raw.telemetry?.pegDeviationBps ?? Math.round(Math.abs(pegUsd - 1) * 10000));
  const riskLevel = raw.telemetry?.riskLevel || (backingRatioPct >= 100 ? 'NOMINAL' : 'CRITICAL');
  const firewallMode = raw.telemetry?.firewallMode || 'STRICT_SEGREGATION';

  let alertLevel: 'NORMAL' | 'WARNING' | 'EMERGENCY_FREEZE' = 'NORMAL';
  if (riskLevel === 'CRITICAL' || backingRatioPct < 100) {
    alertLevel = 'EMERGENCY_FREEZE';
  } else if (backingRatioPct < 101 || pegDeviationBps > 50) {
    alertLevel = 'WARNING';
  }

  return {
    attestation: {
      roundId: Number(att.epoch || 1),
      timestamp: attestedDate.toISOString(),
      totalReservesUsd: Number(att.totalReservesUsd || 0),
      circulatingUsdf: Number(att.circulatingUsdf || 0),
      surplusUsd: Number(att.surplusUsd ?? Math.max(0, att.totalReservesUsd - att.circulatingUsdf)),
      reserveRatioPct: Number(att.backingRatioPct || 100),
      weightedYieldBps: Number(att.weightedYieldBps || 0),
      merkleRoot: att.merkleRoot,
      auditorFirm: 'Grant Thornton LLP & USDFirm DO PoR Oracle',
      attestationReportUrl: 'https://usdfirm.com/attestation/GT-2026-USDF-R1.pdf',
      isCompliant: backingRatioPct >= 100,
      status: att.status,
      chainlinkRoundData: {
        roundId: Number(att.epoch || 1),
        answerMicro: (BigInt(Math.round(Number(att.totalReservesUsd || 0))) * 1_000_000n).toString(),
        updatedAt: Math.floor(attestedDate.getTime() / 1000),
      },
    },
    reserves,
    orders,
    proposals,
    signers: raw.signers || [],
    requiredConfirmations: Number(raw.requiredConfirmations || 3),
    bufferStatus: {
      allocated: Number(raw.bufferStatus?.allocated ?? 0),
      maxCap: Number(raw.bufferStatus?.maxCap ?? 20_000_000),
      isSegregated: Boolean(raw.bufferStatus?.isSegregated ?? true),
    },
    buffers: raw.buffers || [],
    telemetry: {
      circuitBreakerActive: riskLevel === 'CRITICAL',
      reserveRatioPct: backingRatioPct,
      depegDeltaBps: pegDeviationBps,
      currentPegUsd: pegUsd,
      dailyMintVolumeUsd,
      dailyMintCapUsd: 25_000_000,
      isExchangeRiskSegregated: firewallMode === 'STRICT_SEGREGATION',
      segregatedBufferUtilizationPct: Number(
        raw.telemetry?.segregatedBufferUtilizationPct ??
          (raw.bufferStatus?.maxCap
            ? Math.round((Number(raw.bufferStatus.allocated || 0) / Number(raw.bufferStatus.maxCap)) * 10000) / 100
            : 0)
      ),
      riskLevel,
      firewallMode,
      lastCheckTimestamp: new Date(raw.serverTs || Date.now()).toISOString(),
      alertLevel,
    },
    auditLogs,
    traces: raw.traces || [],
    onlineClients: Number(raw.onlineClients ?? 0),
    serverTs: Number(raw.serverTs ?? Date.now()),
    source: 'LIVE_WORKER',
  };
}

export async function fetchWorkerState(
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: true; raw: WorkerSnapshotResponse; bundle: UsdfirmProtocolBundle } | { ok: false; status: number; errorCode: string }> {
  try {
    const res = await fetchImpl(`${USDFIRM_WORKER_URL}/api/state`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(1800),
    });
    const json = (await res.json()) as WorkerSnapshotResponse;
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        status: res.status || 502,
        errorCode: json.errorCode || 'ERR_WORKER_UNREACHABLE',
      };
    }
    return {
      ok: true,
      raw: json,
      bundle: mapWorkerSnapshotToBundle(json),
    };
  } catch {
    return {
      ok: false,
      status: 503,
      errorCode: 'ERR_WORKER_UNREACHABLE',
    };
  }
}

export async function fetchWorkerTrace(
  traceId?: string,
  fetchImpl: typeof fetch = fetch
): Promise<
  | { ok: true; traces: UsdfClearingTraceHop[]; service?: string; domain?: string }
  | { ok: false; status: number; errorCode: string }
> {
  try {
    const query = traceId?.trim() ? `?traceId=${encodeURIComponent(traceId.trim())}` : '';
    const res = await fetchImpl(`${USDFIRM_WORKER_URL}/api/trace${query}`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      errorCode?: string;
      service?: string;
      domain?: string;
      traces?: UsdfClearingTraceHop[];
    };
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        status: res.status || 502,
        errorCode: json.errorCode || 'ERR_WORKER_UNREACHABLE',
      };
    }
    return {
      ok: true,
      traces: json.traces || [],
      service: json.service,
      domain: json.domain,
    };
  } catch {
    return {
      ok: false,
      status: 503,
      errorCode: 'ERR_WORKER_UNREACHABLE',
    };
  }
}

/**
 * Executes a zero-secret-leakage cryptographic firewall self-check by sending an
 * intentionally forged signature to the live DO Worker `/api/bridge/xpayes-settlement`.
 * Expects HTTP 401 + ERR_INVALID_HMAC_SIGNATURE.
 */
export async function executeFirewallSelfCheck(
  fetchImpl: typeof fetch = fetch
): Promise<FirewallSelfCheckResult> {
  const startedAt = Date.now();
  const traceId = `trc_fw_check_${startedAt}`;
  const idempotencyKey = `fw_probe_${startedAt}_${Math.random().toString(16).slice(2, 8)}`;
  const rawBody = JSON.stringify({
    merchantId: 'FW_SELFCHECK_PROBE',
    depositCurrency: 'USD',
    depositAmount: 1000,
    usdfPayoutAmount: 1000,
    vIbanAccount: 'GB88XPAY00009999',
    paymentRef: idempotencyKey,
    timestamp: new Date(startedAt).toISOString(),
  });

  const res = await fetchImpl(`${USDFIRM_WORKER_URL}/api/bridge/xpayes-settlement`, {
    method: 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(7000),
    headers: {
      'Content-Type': 'application/json',
      'X-SM-Caller': 'usdfirm-firewall-selfcheck',
      'X-SM-Trace-Id': traceId,
      'X-SM-Timestamp': String(startedAt),
      'X-SM-Idempotency-Key': idempotencyKey,
      'X-SM-Signature':
        'sha256=000000000000000000000000000000000000000000000000000000000000dead',
    },
    body: rawBody,
  });

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    errorCode?: string;
  };
  const errorCode = json.errorCode || 'ERR_UNKNOWN';
  const passed = res.status === 401 && errorCode === 'ERR_INVALID_HMAC_SIGNATURE';

  return {
    passed,
    httpStatus: res.status,
    errorCode,
    endpoint: '/api/bridge/xpayes-settlement',
    traceId,
    latencyMs: Math.max(1, Date.now() - startedAt),
    checkedAt: new Date().toISOString(),
  };
}
