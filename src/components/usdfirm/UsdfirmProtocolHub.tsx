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
      const res = await fetch('/api/v1/usdfirm/state', { cache: 'no-store' });
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

  if (!bundle && errorCode) {
    return (
      <div
        role="alert"
        className="rounded-3xl border border-rose-500/40 bg-rose-950/60 p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <AlertOctagon className="w-5 h-5 shrink-0" />
            <span>{t.workerErrorTitle}</span>
          </div>
          <p className="text-xs text-rose-200">{resolveError(errorCode)}</p>
          <code className="inline-block rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
            {errorCode}
          </code>
        </div>
        <button
          type="button"
          onClick={() => void fetchFullState()}
          className="shrink-0 rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400 transition"
        >
          {t.retryWorker}
        </button>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 text-center backdrop-blur-xl space-y-2">
        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
        <p className="text-xs font-mono text-zinc-300">{t.loadingState}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-5 py-3.5 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 font-mono font-bold text-zinc-950">
            {t.protocolBadge}
          </span>
          <span className="text-zinc-300 font-medium">{t.protocolDesc}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono ${
              wsState === 'LIVE'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : wsState === 'CONNECTING'
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                  : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
            }`}
          >
            <Radio
              className={`w-3 h-3 ${wsState === 'LIVE' ? 'animate-pulse text-emerald-400' : ''}`}
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-zinc-200 hover:bg-white/10 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
            {t.refreshOracle}
          </button>

          {showStandaloneLink && (
            <Link
              href="/usdfirm"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-mono text-emerald-300 hover:bg-emerald-500/30 transition"
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
          className="rounded-2xl border border-rose-500/40 bg-rose-950/60 p-4 text-xs text-rose-200 flex items-center justify-between gap-2"
        >
          <span>{resolveError(errorCode)}</span>
          <code className="rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
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
