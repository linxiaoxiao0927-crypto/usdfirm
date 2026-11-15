'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, PauseCircle, PlayCircle, Hash, AlertTriangle } from 'lucide-react';
import type { UsdfRiskTelemetrySnapshot, UsdfAuditLogRecord } from '@/lib/usdfirm/types';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';

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
  const { locale, copy, resolveError } = useUsdfirmLocale();
  const t = copy.risk;

  const [telemetry, setTelemetry] = useState<UsdfRiskTelemetrySnapshot>(initialTelemetry);
  const [auditLogs, setAuditLogs] = useState<UsdfAuditLogRecord[]>(initialAuditLogs);
  const [simPeg, setSimPeg] = useState('0.985');
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ code: string; text: string } | null>(null);

  useEffect(() => {
    setTelemetry(initialTelemetry);
  }, [initialTelemetry]);

  useEffect(() => {
    setAuditLogs(initialAuditLogs);
  }, [initialAuditLogs]);

  const syncRiskData = async () => {
    const res = await fetch('/api/v1/usdfirm/risk', { cache: 'no-store' });
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
    setErrorInfo(null);
    try {
      const res = await fetch('/api/v1/usdfirm/risk', {
        method: 'POST',
        cache: 'no-store',
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
        const code = extractErrorCode(json) || 'RISK_OP_ERROR';
        setErrorInfo({ code, text: resolveError(code, json.error?.message) });
        return;
      }
      await syncRiskData();
    } catch {
      setErrorInfo({
        code: 'ERR_WORKER_UNREACHABLE',
        text: resolveError('ERR_WORKER_UNREACHABLE'),
      });
    } finally {
      setLoading(false);
    }
  };

  const capPct = Math.min(
    100,
    Math.round((telemetry.dailyMintVolumeUsd / Math.max(1, telemetry.dailyMintCapUsd)) * 100)
  );

  return (
    <div className="rounded-3xl bg-[#1C1D21] p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-lg font-bold text-[#F4F4F6] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#00DC6D]" />
            {t.title}
          </h3>
          <p className="text-xs text-white/60 mt-0.5">{t.subtitle}</p>
        </div>

        <span
          className={`rounded-full px-3.5 py-1 text-xs font-mono font-bold ${
            telemetry.alertLevel === 'NORMAL'
              ? 'bg-[#00DC6D]/15 text-[#00DC6D]'
              : telemetry.alertLevel === 'WARNING'
                ? 'bg-[#D4A853]/15 text-[#FCD34D]'
                : 'bg-[#F87171]/20 text-[#FDA4AF] animate-pulse'
          }`}
        >
          {t.statusPrefix}{' '}
          {(t.levelLabels as Record<string, string>)[
            telemetry.riskLevel || telemetry.alertLevel
          ] ||
            telemetry.riskLevel ||
            telemetry.alertLevel}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="sm-bento-slate rounded-2xl p-4 space-y-1">
          <span className="text-white/65">{t.pegLabel}</span>
          <p className="text-lg font-bold font-mono text-[#F4F4F6]">
            ${telemetry.currentPegUsd.toFixed(4)}
          </p>
          <span className="text-[11px] font-mono text-[#93C5FD]">
            {t.deltaPrefix} {telemetry.depegDeltaBps} bps
          </span>
        </div>

        <div
          className={`rounded-2xl p-4 space-y-1 ${
            telemetry.circuitBreakerActive ? 'sm-bento-rose' : 'sm-bento-emerald'
          }`}
        >
          <span className="text-white/65">{t.breakerLabel}</span>
          <p
            className={`text-lg font-bold font-mono ${
              telemetry.circuitBreakerActive ? 'text-[#FDA4AF]' : 'text-[#00DC6D]'
            }`}
          >
            {telemetry.circuitBreakerActive ? t.breakerFrozen : t.breakerActive}
          </p>
          <span className="text-[11px] text-white/60">{t.breakerRule}</span>
        </div>

        <div className="sm-bento-teal rounded-2xl p-4 space-y-1">
          <span className="text-white/65">{t.segregationLabel}</span>
          <p className="text-lg font-bold font-mono text-[#67E8F9]">
            {telemetry.isExchangeRiskSegregated ? t.segregatedYes : t.segregatedNo}
          </p>
          <span className="text-[11px] text-white/60">{t.segregationSub}</span>
        </div>

        <div className="sm-bento-amber rounded-2xl p-4 space-y-1">
          <span className="text-white/65">{t.velocityLabel}</span>
          <p className="text-lg font-bold font-mono text-[#FCD34D]">
            {capPct}% {t.usedSuffix}
          </p>
          <span className="text-[11px] font-mono text-white/60">
            ${(telemetry.dailyMintVolumeUsd / 1_000_000).toFixed(2)}M / $25M
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#24262C] p-4 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading || telemetry.circuitBreakerActive}
            onClick={() => triggerRiskAction('PAUSE', t.reasonPause)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#F87171]/15 px-3.5 py-2 font-semibold text-[#FDA4AF] hover:bg-[#F87171]/25 disabled:opacity-40 transition"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            {t.freezeBtn}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => triggerRiskAction('RESUME', t.reasonResume)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D]/15 px-3.5 py-2 font-semibold text-[#00DC6D] hover:bg-[#00DC6D]/25 disabled:opacity-40 transition"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            {t.resumeBtn}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-white/60">{t.stressLabel}</span>
          <input
            type="number"
            step="0.001"
            value={simPeg}
            onChange={(e) => setSimPeg(e.target.value)}
            className="w-24 rounded-full bg-white/[0.075] focus:bg-white/[0.12] px-3 py-1.5 font-mono text-[#F4F4F6] focus:outline-none"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              triggerRiskAction('SIMULATE_DEPEG', t.reasonDepeg, Number(simPeg))
            }
            className="rounded-full bg-[#D4A853] px-4 py-1.5 font-bold text-[#090A0F] hover:bg-[#FCD34D] transition"
          >
            {t.simulateBtn}
          </button>
        </div>
      </div>

      {errorInfo && (
        <div
          role="alert"
          className="sm-bento-rose rounded-2xl p-3.5 text-xs text-[#FDA4AF] flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorInfo.text}</span>
          </span>
          <code className="shrink-0 rounded-full bg-[#090A0F]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
            {errorInfo.code}
          </code>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span className="font-semibold uppercase flex items-center gap-1.5 text-white/80">
            <Hash className="w-3.5 h-3.5 text-[#00DC6D]" />
            {t.auditTitle}
          </span>
          <span className="flex items-center gap-1 text-[#00DC6D] font-mono font-semibold">
            <Activity className="w-3.5 h-3.5" /> {t.chainVerified}
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="rounded-xl bg-[#24262C] p-4 text-center text-xs text-white/55">
            {t.emptyLogs}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 font-mono text-[11px]">
            {auditLogs.map((log) => {
              const summary =
                locale === 'zh'
                  ? log.summaryZh || log.payloadSummary
                  : log.summaryEn || log.payloadSummary;
              return (
                <div
                  key={log.id || log.sequenceNum}
                  className="rounded-xl bg-[#24262C] hover:bg-[#26272B] transition p-3 space-y-1"
                >
                  <div className="flex items-center justify-between text-white/55">
                    <span>
                      <strong className="text-[#00DC6D]">
                        {log.id || `#${log.sequenceNum}`}
                      </strong>{' '}
                      [{(t.actionLabels as Record<string, string>)[log.action] || log.action}] ·{' '}
                      <span className="text-[#F4F4F6]">{log.actor}</span>
                    </span>
                    <span>
                      {new Date(log.timestamp).toLocaleTimeString(
                        locale === 'zh' ? 'zh-CN' : 'en-US'
                      )}
                    </span>
                  </div>
                  <p className="text-white/75 truncate">{summary}</p>
                  <p className="text-[10px] text-[#67E8F9]/85 truncate">
                    SHA256: {log.currHash} ({log.prevHash.slice(0, 14)}...)
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
