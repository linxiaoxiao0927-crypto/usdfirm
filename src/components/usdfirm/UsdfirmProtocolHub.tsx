'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink, Radio, AlertOctagon } from 'lucide-react';
import Link from 'next/link';
import type {
  UsdfirmProtocolBundle,
  UsdfPoRAttestation,
  UsdfReserveAssetItem,
  UsdfMintBurnOrderRecord,
  TimelockProposalRecord,
  UsdfRiskTelemetrySnapshot,
  UsdfAuditLogRecord,
} from '@/lib/usdfirm/types';
import {
  USDFIRM_WS_URL,
  mapWorkerSnapshotToBundle,
  type WorkerSnapshotResponse,
} from '@/lib/usdfirm/worker-client';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';
import { PorAttestationDashboard } from './PorAttestationDashboard';
import { MintBurnPanel } from './MintBurnPanel';
import { MultiSigTimelockPanel } from './MultiSigTimelockPanel';
import { RiskMonitorPanel } from './RiskMonitorPanel';
import { BridgeStatusPanel } from './BridgeStatusPanel';
import { FirewallSelfCheckCard } from './FirewallSelfCheckCard';
import { ClearingTraceInspector } from './ClearingTraceInspector';

export interface UsdfirmInitialBundle {
  attestation: UsdfPoRAttestation;
  reserves: UsdfReserveAssetItem[];
  orders: UsdfMintBurnOrderRecord[];
  proposals: TimelockProposalRecord[];
  signers: string[];
  requiredConfirmations: number;
  telemetry: UsdfRiskTelemetrySnapshot;
  auditLogs: UsdfAuditLogRecord[];
  bufferStatus: { allocated: number; maxCap: number; isSegregated: boolean };
  buffers?: UsdfirmProtocolBundle['buffers'];
  traces?: UsdfirmProtocolBundle['traces'];
  onlineClients?: number;
  serverTs?: number;
  source?: 'LIVE_WORKER' | 'LOCAL_ENGINE';
}

interface UsdfirmProtocolHubProps {
  initialBundle?: UsdfirmInitialBundle;
  initialErrorCode?: string | null;
  showStandaloneLink?: boolean;
  onBundleSync?: (bundle: UsdfirmProtocolBundle) => void;
}

export function UsdfirmProtocolHub({
  initialBundle,
  initialErrorCode = null,
  showStandaloneLink = false,
  onBundleSync,
}: UsdfirmProtocolHubProps) {
  const { copy, resolveError } = useUsdfirmLocale();
  const t = copy.hub;

  const [bundle, setBundle] = useState<UsdfirmProtocolBundle | null>(
    initialBundle ?? null
  );
  const [syncing, setSyncing] = useState(!initialBundle);
  const [errorCode, setErrorCode] = useState<string | null>(initialErrorCode);
  const [wsState, setWsState] = useState<'CONNECTING' | 'LIVE' | 'RECONNECTING'>(
    'CONNECTING'
  );
  const [onlineClients, setOnlineClients] = useState<number>(
    initialBundle?.onlineClients ?? 0
  );

  const applyBundle = useCallback(
    (nextBundle: UsdfirmProtocolBundle) => {
      setBundle(nextBundle);
      setErrorCode(null);
      if (typeof nextBundle.onlineClients === 'number') {
        setOnlineClients(nextBundle.onlineClients);
      }
      onBundleSync?.(nextBundle);
    },
    [onBundleSync]
  );

  const fetchFullState = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/v1/usdfirm/state', {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        setErrorCode(extractErrorCode(json) || 'ERR_WORKER_UNREACHABLE');
        return;
      }
      applyBundle(json.data as UsdfirmProtocolBundle);
    } catch {
      setErrorCode('ERR_WORKER_UNREACHABLE');
    } finally {
      setSyncing(false);
    }
  }, [applyBundle]);

  useEffect(() => {
    if (!initialBundle) {
      void fetchFullState();
    }
  }, [initialBundle, fetchFullState]);

  // Live WebSocket connection to usdfirm-rt-protocol Durable Object
  useEffect(() => {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return;
    }

    let disposed = false;
    let socket: WebSocket | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const connect = () => {
      if (disposed) return;
      setWsState(attempt === 0 ? 'CONNECTING' : 'RECONNECTING');

      try {
        socket = new WebSocket(USDFIRM_WS_URL);
      } catch {
        setWsState('RECONNECTING');
        return;
      }

      socket.onopen = () => {
        if (disposed) return;
        attempt = 0;
        setWsState('LIVE');
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          if (typeof document !== 'undefined' && document.hidden) return;
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping', clientTs: Date.now() }));
          }
        }, 25_000);
      };

      socket.onmessage = (event) => {
        if (disposed) return;
        try {
          const msg = JSON.parse(String(event.data)) as Partial<WorkerSnapshotResponse> & {
            type?: string;
            onlineClients?: number;
          };
          if (msg.type === 'presence' && typeof msg.onlineClients === 'number') {
            setOnlineClients(msg.onlineClients);
            return;
          }
          if (
            (msg.type === 'init' ||
              msg.type === 'INITIAL_STATE' ||
              msg.type === 'protocol_update' ||
              msg.type === 'PROTOCOL_UPDATED' ||
              String(msg.type || '').startsWith('bridge_')) &&
            msg.attestation
          ) {
            const mapped = mapWorkerSnapshotToBundle(msg as WorkerSnapshotResponse);
            applyBundle(mapped);
            setSyncing(false);
          }
        } catch {
          // Ignore non-JSON frames
        }
      };

      socket.onerror = () => {
        if (!disposed) {
          setWsState('RECONNECTING');
        }
      };

      socket.onclose = () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (disposed) return;
        setWsState('RECONNECTING');
        const delayMs = Math.min(15_000, 1500 * Math.pow(2, attempt));
        attempt += 1;
        reconnectTimer = setTimeout(connect, delayMs);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        try {
          socket.close();
        } catch {
          // Ignore close error
        }
      }
    };
  }, [applyBundle]);

  if (!bundle && syncing) {
    return (
      <div className="sm-card rounded-3xl bg-[#1C1D21] p-8 text-center space-y-2">
        <RefreshCw className="w-6 h-6 text-[#00DC6D] animate-spin mx-auto" />
        <p className="text-xs font-mono text-white/70">{t.loadingState}</p>
      </div>
    );
  }

  if (!bundle && errorCode) {
    return (
      <div
        role="alert"
        className="sm-bento-rose rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#FDA4AF] font-bold text-sm">
            <AlertOctagon className="w-5 h-5 shrink-0" />
            <span>{t.workerErrorTitle}</span>
          </div>
          <p className="text-xs text-white/80">{resolveError(errorCode)}</p>
          <code className="inline-block rounded-full bg-[#090A0F]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
            {errorCode}
          </code>
        </div>
        <button
          type="button"
          onClick={() => void fetchFullState()}
          className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#090A0F] hover:bg-white/90 transition"
        >
          {t.retryWorker}
        </button>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="sm-card rounded-3xl bg-[#1C1D21] p-8 text-center space-y-2">
        <RefreshCw className="w-6 h-6 text-[#00DC6D] animate-spin mx-auto" />
        <p className="text-xs font-mono text-white/70">{t.loadingState}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#1C1D21] px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="rounded-full bg-[#00DC6D] px-3 py-0.5 font-mono font-bold text-[#090A0F]">
            {t.protocolBadge}
          </span>
          <span className="text-white/80 font-medium">{t.protocolDesc}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono font-semibold ${
              wsState === 'LIVE'
                ? 'bg-[#00DC6D]/15 text-[#00DC6D]'
                : wsState === 'CONNECTING'
                  ? 'bg-[#D4A853]/15 text-[#FCD34D]'
                  : 'bg-[#F87171]/15 text-[#FDA4AF]'
            }`}
          >
            <Radio
              className={`w-3 h-3 ${wsState === 'LIVE' ? 'animate-pulse text-[#00DC6D]' : ''}`}
            />
            {wsState === 'LIVE'
              ? `${t.wsLive} · ${t.onlineNodes}: ${onlineClients}`
              : wsState === 'CONNECTING'
                ? t.wsConnecting
                : t.wsReconnecting}
          </span>

          <button
            type="button"
            onClick={() => void fetchFullState()}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#24262C] px-3.5 py-1.5 text-xs font-mono text-[#F4F4F6] hover:bg-[#26272B] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#00DC6D]' : ''}`} />
            {t.refreshOracle}
          </button>

          {showStandaloneLink && (
            <Link
              href="/usdfirm"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D]/15 px-3.5 py-1.5 text-xs font-mono font-semibold text-[#00DC6D] hover:bg-[#00DC6D]/25 transition"
            >
              {t.dedicatedPortal}
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {errorCode && (
        <div
          role="alert"
          className="sm-bento-rose rounded-2xl p-4 text-xs text-[#FDA4AF] flex items-center justify-between gap-2"
        >
          <span>{resolveError(errorCode)}</span>
          <code className="rounded-full bg-[#090A0F]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
            {errorCode}
          </code>
        </div>
      )}

      <PorAttestationDashboard attestation={bundle.attestation} reserves={bundle.reserves} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MintBurnPanel
          initialOrders={bundle.orders}
          onRefresh={fetchFullState}
          onBundleUpdate={applyBundle}
        />
        <MultiSigTimelockPanel
          initialProposals={bundle.proposals}
          signers={bundle.signers}
          requiredConfirmations={bundle.requiredConfirmations}
          onRefresh={fetchFullState}
          onBundleUpdate={applyBundle}
        />
      </div>

      <BridgeStatusPanel
        initialBuffer={bundle.bufferStatus}
        buffers={bundle.buffers}
        onRefresh={fetchFullState}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FirewallSelfCheckCard />
        <ClearingTraceInspector recentTraces={bundle.traces} />
      </div>

      <RiskMonitorPanel
        initialTelemetry={bundle.telemetry}
        initialAuditLogs={bundle.auditLogs}
        onRefresh={fetchFullState}
      />
    </div>
  );
}
