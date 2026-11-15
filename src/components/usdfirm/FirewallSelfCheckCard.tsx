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
    <div className="rounded-3xl bg-[#1C1D21] p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LockKeyhole className="w-5 h-5 text-[#00DC6D]" />
            <h3 className="text-base sm:text-lg font-bold text-[#F4F4F6]">{fw.title}</h3>
          </div>
          <p className="text-xs text-white/60">{fw.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D]/15 px-3.5 py-1 text-[11px] font-mono font-semibold text-[#00DC6D]">
          {fw.secretGuard}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={runSelfCheck}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-[#00DC6D] px-4 py-2 text-xs font-bold text-[#090A0F] hover:bg-[#19E67C] disabled:opacity-50 transition"
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
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-mono font-bold ${
              result.passed
                ? 'bg-[#00DC6D]/15 text-[#00DC6D]'
                : 'bg-[#F87171]/15 text-[#FDA4AF]'
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
        <div className="rounded-2xl bg-[#24262C] p-4 text-xs text-white/60">
          {fw.idleHint}
        </div>
      )}

      {errorCode && (
        <div
          role="alert"
          className="sm-bento-rose rounded-2xl p-4 text-xs text-[#FDA4AF] flex items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {resolveError(errorCode)}
          </span>
          <code className="shrink-0 rounded-full bg-[#090A0F]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
            {errorCode}
          </code>
        </div>
      )}

      {result && (
        <div className="rounded-2xl bg-[#24262C] p-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="rounded-xl bg-[#18191C] p-3">
              <span className="block text-[10px] text-white/55 font-sans">{fw.endpointLabel}</span>
              <span className="text-[#F4F4F6] break-all">{result.endpoint}</span>
            </div>
            <div className="rounded-xl bg-[#18191C] p-3">
              <span className="block text-[10px] text-white/55 font-sans">{fw.httpStatusLabel}</span>
              <span className={result.httpStatus === 401 ? 'text-[#00DC6D] font-bold' : 'text-[#FDA4AF] font-bold'}>
                {fw.httpPrefix} {result.httpStatus}
              </span>
            </div>
            <div className="rounded-xl bg-[#18191C] p-3">
              <span className="block text-[10px] text-white/55 font-sans">{fw.errorCodeLabel}</span>
              <span className="text-[#FCD34D] font-bold break-all">{result.errorCode}</span>
            </div>
            <div className="rounded-xl bg-[#18191C] p-3">
              <span className="block text-[10px] text-white/55 font-sans">{fw.latencyLabel}</span>
              <span className="text-[#F4F4F6] font-bold">{result.latencyMs} ms</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-white/75">
            <span>{resolveError(result.errorCode)}</span>
            <span className="font-mono text-[11px] text-white/45">
              {fw.tracePrefix}: {result.traceId} ·{' '}
              {new Date(result.checkedAt).toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-US')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
