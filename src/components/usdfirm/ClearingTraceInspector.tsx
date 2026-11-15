'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GitMerge, Search, RefreshCw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';
import type { UsdfClearingTraceHop } from '@/lib/usdfirm/types';

interface ClearingTraceInspectorProps {
  recentTraces?: UsdfClearingTraceHop[];
}

export function ClearingTraceInspector({ recentTraces = [] }: ClearingTraceInspectorProps) {
  const { locale, copy, resolveError } = useUsdfirmLocale();
  const tr = copy.trace;
  const localizeAction = (act: string) => {
    const dict = tr.actionLabels as Record<string, string>;
    if (dict[act]) return dict[act];
    if (act.startsWith('BRIDGE_')) {
      return locale === 'zh' ? '隔离流动性桥接' : 'SEGREGATED LIQUIDITY BRIDGE';
    }
    return act;
  };
  const localizeStatus = (st: string) =>
    (tr.statusLabels as Record<string, string>)[st] || st;
  const [traceIdInput, setTraceIdInput] = useState('');
  const [traces, setTraces] = useState<UsdfClearingTraceHop[]>(recentTraces);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (!traceIdInput && recentTraces.length > 0) {
      setTraces(recentTraces);
    }
  }, [recentTraces, traceIdInput]);

  const queryTrace = useCallback(async (targetTraceId?: string) => {
    setLoading(true);
    setErrorCode(null);
    try {
      const qs = targetTraceId?.trim()
        ? `?traceId=${encodeURIComponent(targetTraceId.trim())}`
        : '';
      const res = await fetch(`/api/v1/usdfirm/trace${qs}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorCode(extractErrorCode(json) || 'ERR_WORKER_UNREACHABLE');
        return;
      }
      setTraces((json.data?.traces as UsdfClearingTraceHop[]) || []);
    } catch {
      setErrorCode('ERR_WORKER_UNREACHABLE');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await queryTrace(traceIdInput);
  };

  const quickTraceIds = Array.from(
    new Set(recentTraces.map((item) => item.trace_id).filter(Boolean))
  ).slice(0, 4);

  const activeTraceId = traceIdInput.trim() || traces[0]?.trace_id || '';
  const activeTraceHops = activeTraceId
    ? traces.filter((h) => h.trace_id === activeTraceId)
    : traces;

  const hopStages = [
    { seq: 1, label: tr.hopStage1 },
    { seq: 2, label: tr.hopStage2 },
    { seq: 3, label: tr.hopStage3 },
    { seq: 4, label: tr.hopStage4 },
  ];

  return (
    <div className="rounded-3xl bg-[#1C1D21] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-[#FCD34D]" />
            <h3 className="text-base sm:text-lg font-bold text-[#F4F4F6]">{tr.title}</h3>
          </div>
          <p className="text-xs text-white/60">{tr.subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-wrap items-center gap-2 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-white/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={traceIdInput}
            onChange={(e) => setTraceIdInput(e.target.value)}
            placeholder={tr.placeholder}
            className="w-full rounded-full bg-white/[0.075] focus:bg-white/[0.12] pl-9 pr-3.5 py-2.5 font-mono text-[#F4F4F6] placeholder:text-white/40 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D] px-4 py-2.5 font-bold text-[#090A0F] hover:bg-[#19E67C] disabled:opacity-50 transition"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {tr.inspectBtn}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setTraceIdInput('');
            void queryTrace('');
          }}
          className="rounded-full bg-[#24262C] px-3.5 py-2.5 text-white/75 hover:bg-[#26272B] transition"
        >
          {tr.showAllBtn}
        </button>
      </form>

      {quickTraceIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-white/55">{tr.quickPicks}</span>
          {quickTraceIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTraceIdInput(id);
                void queryTrace(id);
              }}
              className={`rounded-full px-3 py-1 font-mono transition ${
                activeTraceId === id
                  ? 'bg-white text-[#090A0F] font-semibold'
                  : 'bg-[#24262C] text-white/70 hover:bg-[#26272B]'
              }`}
            >
              {id}
            </button>
          ))}
        </div>
      )}

      {errorCode && (
        <div
          role="alert"
          className="sm-bento-rose rounded-2xl p-3.5 text-xs text-[#FDA4AF] flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {resolveError(errorCode)}
          </span>
          <code className="rounded-full bg-[#090A0F]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
            {errorCode}
          </code>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl bg-[#24262C] p-4 text-xs font-mono text-[#FCD34D] flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          {tr.loading}
        </div>
      )}

      {!loading && activeTraceHops.length === 0 ? (
        <div className="rounded-2xl bg-[#24262C] p-4 text-xs text-white/60">
          {tr.empty}
        </div>
      ) : (
        <div className="space-y-4">
          {/* 4-Hop visual pipeline for selected traceId */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {hopStages.map((stage) => {
              const matchedHop = activeTraceHops.find((h) => h.hop_seq === stage.seq);
              return (
                <div
                  key={stage.seq}
                  className={`rounded-2xl p-3.5 space-y-1.5 ${
                    matchedHop ? 'sm-bento-emerald' : 'bg-[#24262C]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-[#F4F4F6] text-[11px]">{stage.label}</span>
                    {matchedHop ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00DC6D] shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    )}
                  </div>
                  {matchedHop ? (
                    <div className="space-y-1 font-mono text-[11px]">
                      <p className="text-[#6EE7B7] font-bold">
                        {localizeAction(matchedHop.action)} ({localizeStatus(matchedHop.status)})
                      </p>
                      <p className="text-white/80">
                        {matchedHop.caller} → {matchedHop.receiver}
                      </p>
                      <p className="text-[#FCD34D]">
                        ${Number(matchedHop.amount).toLocaleString()} {matchedHop.asset}
                      </p>
                      <p className="text-[10px] text-white/55 truncate">
                        {tr.receiptHash}: {matchedHop.receipt_hash}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-white/45">{tr.awaitingHop}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Raw live trace table */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 font-mono text-[11px]">
            {traces.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-[#24262C] hover:bg-[#26272B] transition px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#00DC6D]/15 px-2 py-0.5 text-[#00DC6D] font-bold">
                    {tr.formatHopBadge(item.hop_seq)}
                  </span>
                  <span className="text-[#FCD34D]">{item.trace_id}</span>
                  <span className="text-[#F4F4F6]">{localizeAction(item.action)}</span>
                  <span className="text-white/55">
                    ({item.caller} → {item.receiver})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#00DC6D] font-bold">
                    ${Number(item.amount).toLocaleString()} {item.asset}
                  </span>
                  <span className="text-white/45">
                    {new Date(item.created_at).toLocaleTimeString(
                      locale === 'zh' ? 'zh-CN' : 'en-US'
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
