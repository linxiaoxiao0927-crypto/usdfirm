'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, LockKeyhole, Play, Loader2 } from 'lucide-react';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';
import type { FirewallSelfCheckResult } from '@/lib/usdfirm/types';

export function FirewallSelfCheckCard() {
  const { locale, copy, resolveError } = useUsdfirmLocale();
  const fw = copy.firewall;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FirewallSelfCheckResult | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const runSelfCheck = async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const res = await fetch('/api/v1/usdfirm/firewall-check', {
        method: 'POST',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_WORKER_UNREACHABLE';
        setErrorCode(code);
        setResult(null);
        return;
      }
      setResult(json.data as FirewallSelfCheckResult);
    } catch {
      setErrorCode('ERR_WORKER_UNREACHABLE');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#090A0F]/90 p-6 backdrop-blur-xl shadow-2xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LockKeyhole className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">{fw.title}</h3>
          </div>
          <p className="text-xs text-zinc-400">{fw.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono text-emerald-300">
          {fw.secretGuard}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={runSelfCheck}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {fw.runningBtn}
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              {fw.runBtn}
            </>
          )}
        </button>

        {result && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono font-bold ${
              result.passed
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
            }`}
          >
            {result.passed ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            {result.passed ? fw.verdictPassed : fw.verdictFailed}
          </span>
        )}
      </div>

      {!result && !errorCode && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 text-xs text-zinc-400">
          {fw.idleHint}
        </div>
      )}

      {errorCode && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/40 bg-rose-950/60 p-4 text-xs text-rose-200 flex items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            {resolveError(errorCode)}
          </span>
          <code className="shrink-0 rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
            {errorCode}
          </code>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="block text-[10px] text-zinc-400 font-sans">{fw.endpointLabel}</span>
              <span className="text-zinc-200 break-all">{result.endpoint}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="block text-[10px] text-zinc-400 font-sans">{fw.httpStatusLabel}</span>
              <span className={result.httpStatus === 401 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {fw.httpPrefix} {result.httpStatus}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="block text-[10px] text-zinc-400 font-sans">{fw.errorCodeLabel}</span>
              <span className="text-amber-300 font-bold break-all">{result.errorCode}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="block text-[10px] text-zinc-400 font-sans">{fw.latencyLabel}</span>
              <span className="text-white font-bold">{result.latencyMs} ms</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-zinc-300">
            <span>{resolveError(result.errorCode)}</span>
            <span className="font-mono text-[11px] text-zinc-500">
              {fw.tracePrefix}: {result.traceId} ·{' '}
              {new Date(result.checkedAt).toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-US')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
