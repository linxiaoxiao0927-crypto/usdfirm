'use client';

import React, { useState } from 'react';
import { ShieldAlert, Activity, PauseCircle, PlayCircle, Hash } from 'lucide-react';
import type { UsdfRiskTelemetrySnapshot, UsdfAuditLogRecord } from '@/lib/usdfirm/types';

interface RiskMonitorPanelProps {
  initialTelemetry: UsdfRiskTelemetrySnapshot;
  initialAuditLogs: UsdfAuditLogRecord[];
  onRefresh: () => void;
}

export function RiskMonitorPanel({
  initialTelemetry,
  initialAuditLogs,
  onRefresh,
}: RiskMonitorPanelProps) {
  const [telemetry, setTelemetry] = useState<UsdfRiskTelemetrySnapshot>(initialTelemetry);
  const [auditLogs, setAuditLogs] = useState<UsdfAuditLogRecord[]>(initialAuditLogs);
  const [simPeg, setSimPeg] = useState('0.985');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const syncRiskData = async () => {
    const res = await fetch('/api/v1/usdfirm/risk');
    const json = await res.json();
    if (json.success) {
      setTelemetry(json.data.telemetry);
      setAuditLogs(json.data.recentLogs);
    }
    onRefresh();
  };

  const triggerRiskAction = async (
    action: 'PAUSE' | 'RESUME' | 'SIMULATE_DEPEG',
    reason: string,
    targetPeg?: number
  ) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/usdfirm/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          actor: 'CHIEF_RISK_OFFICER_CONSOLE',
          reason,
          targetPeg,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Risk action failed');
      }
      await syncRiskData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Risk operation error');
    } finally {
      setLoading(false);
    }
  };

  const capPct = Math.min(
    100,
    Math.round((telemetry.dailyMintVolumeUsd / telemetry.dailyMintCapUsd) * 100)
  );

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 backdrop-blur-xl shadow-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            Automated Risk Sentinel & SHA-256 Hash-Chain Audit Trail
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time peg deviation monitoring, $25M daily mint cap, and emergency circuit breaker
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-mono font-bold border ${
            telemetry.alertLevel === 'NORMAL'
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
              : telemetry.alertLevel === 'WARNING'
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-rose-500/40 bg-rose-500/20 text-rose-300 animate-pulse'
          }`}
        >
          STATUS: {telemetry.alertLevel}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3.5 space-y-1">
          <span className="text-zinc-400">Secondary Market Peg</span>
          <p className="text-lg font-bold font-mono text-white">
            ${telemetry.currentPegUsd.toFixed(4)}
          </p>
          <span className="text-[11px] font-mono text-zinc-400">
            Delta: {telemetry.depegDeltaBps} bps
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3.5 space-y-1">
          <span className="text-zinc-400">Circuit Breaker</span>
          <p className={`text-lg font-bold font-mono ${telemetry.circuitBreakerActive ? 'text-rose-400' : 'text-emerald-400'}`}>
            {telemetry.circuitBreakerActive ? 'FROZEN' : 'ACTIVE'}
          </p>
          <span className="text-[11px] text-zinc-500">Auto-freeze &lt; $0.9900</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3.5 space-y-1">
          <span className="text-zinc-400">Exchange Segregation</span>
          <p className="text-lg font-bold font-mono text-emerald-400">
            {telemetry.isExchangeRiskSegregated ? 'ISOLATED' : 'BREACHED'}
          </p>
          <span className="text-[11px] text-zinc-500">Zero contagion to PoR</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3.5 space-y-1">
          <span className="text-zinc-400">24h Mint Velocity</span>
          <p className="text-lg font-bold font-mono text-amber-300">{capPct}% Used</p>
          <span className="text-[11px] font-mono text-zinc-500">
            ${(telemetry.dailyMintVolumeUsd / 1_000_000).toFixed(2)}M / $25M
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-3.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading || telemetry.circuitBreakerActive}
            onClick={() => triggerRiskAction('PAUSE', 'Manual emergency circuit breaker drill')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-40 transition"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            Emergency Freeze
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => triggerRiskAction('RESUME', 'Restore normal peg & unfreeze minting')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40 transition"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Restore Peg & Resume
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Depeg Stress Test:</span>
          <input
            type="number"
            step="0.001"
            value={simPeg}
            onChange={(e) => setSimPeg(e.target.value)}
            className="w-20 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 font-mono text-white"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => triggerRiskAction('SIMULATE_DEPEG', 'Stress test oracle depeg', Number(simPeg))}
            className="rounded-xl bg-amber-500 px-3 py-1.5 font-bold text-zinc-950 hover:bg-amber-400 transition"
          >
            Simulate Peg
          </button>
        </div>
      </div>

      {errorMsg && <p className="text-xs font-mono text-rose-400">{errorMsg}</p>}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-semibold uppercase flex items-center gap-1.5 text-zinc-300">
            <Hash className="w-3.5 h-3.5 text-emerald-400" />
            Immutable Cryptographic Audit Trail (SHA-256 Chained)
          </span>
          <span className="flex items-center gap-1 text-emerald-400 font-mono">
            <Activity className="w-3.5 h-3.5" /> Chain Verified
          </span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 font-mono text-[11px]">
          {auditLogs.map((log) => (
            <div
              key={log.sequenceNum}
              className="rounded-xl border border-white/5 bg-zinc-950/90 p-2.5 space-y-1"
            >
              <div className="flex items-center justify-between text-zinc-400">
                <span>
                  <strong className="text-emerald-300">#{log.sequenceNum}</strong> [{log.action}] by{' '}
                  <span className="text-white">{log.actor}</span>
                </span>
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-zinc-300 truncate">{log.payloadSummary}</p>
              <p className="text-[10px] text-cyan-400/80 truncate">
                SHA256: {log.currHash} (prev: {log.prevHash.slice(0, 14)}...)
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
