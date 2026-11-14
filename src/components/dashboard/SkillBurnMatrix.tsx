'use client';

import React, { useState } from 'react';
import {
  Flame,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type {
  SkillDefinition,
  SkillCode,
  LedgerSnapshot,
} from '@/types/ledger';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';

interface SkillBurnMatrixProps {
  skills: SkillDefinition[];
  totalBurnedAsdG: number;
  onSnapshotUpdate: (snap: LedgerSnapshot) => void;
}

export function SkillBurnMatrix({
  skills,
  totalBurnedAsdG,
  onSnapshotUpdate,
}: SkillBurnMatrixProps) {
  const { copy, resolveError } = useUsdfirmLocale();
  const t = copy.dashboard.skills;

  const [activeCode, setActiveCode] = useState<SkillCode | null>(null);
  const [status, setStatus] = useState<
    'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  >('IDLE');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const triggerSkillCall = async (skill: SkillDefinition) => {
    setActiveCode(skill.code);
    setStatus('LOADING');
    setStatusMsg('');
    setErrorCode(null);

    try {
      const res = await fetch('/api/v1/gas', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerSite: 'sofayes.com',
          callerEntity: 'ENT-SOFA-CORE',
          skillCode: skill.code,
          units: 10,
          idempotencyKey: `gas-${skill.code}-${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_INTERNAL_SERVER';
        setStatus('ERROR');
        setErrorCode(code);
        setStatusMsg(resolveError(code, json.error?.message));
        return;
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setStatusMsg(
        t.formatSuccessMsg(
          skill.domain,
          json.data.totalGasConsumed,
          json.data.providerGas,
          json.data.burnedGas
        )
      );
    } catch {
      const code = 'ERR_LEDGER_SYNC_FAILED';
      setStatus('ERROR');
      setErrorCode(code);
      setStatusMsg(resolveError(code));
    } finally {
      setActiveCode(null);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/75 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">{t.title}</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {t.subtitlePrefix}{' '}
            <span className="text-amber-300 font-mono">uUSDF</span>
            {t.subtitleSuffix}
          </p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-300">
          {t.burnedBadgePrefix} {totalBurnedAsdG.toLocaleString()} uUSDF
        </span>
      </div>

      {skills.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-zinc-400">
          {t.emptyState}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => {
            const isCalling =
              status === 'LOADING' && activeCode === skill.code;
            const localizedMeta = t.skillMeta[skill.code];
            return (
              <div
                key={skill.code}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-emerald-500/40 transition space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[11px] text-emerald-300 border border-emerald-500/30">
                      {skill.code.slice(0, 8)}
                    </span>
                    <span className="font-mono text-cyan-400 font-semibold">
                      {skill.domain}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {localizedMeta?.name ?? skill.name}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {localizedMeta?.description ?? skill.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>
                      {t.unitPricePrefix} ({localizedMeta?.unitLabel ?? skill.unitLabel})
                    </span>
                    <span className="font-mono text-amber-300 font-semibold">
                      {skill.gasPerUnit.toLocaleString()} uUSDF
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{t.splitLabel}</span>
                    <span className="font-mono text-emerald-300">
                      {Math.round(skill.providerRatio * 100)}% {t.providerLabel} /{' '}
                      {Math.round(skill.burnRatio * 100)}% {t.burnLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isCalling}
                    onClick={() => triggerSkillCall(skill)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 py-2 text-xs font-semibold text-white hover:bg-emerald-500 hover:text-zinc-950 hover:border-emerald-400 disabled:opacity-50 transition"
                  >
                    {isCalling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {t.callingBtn}
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3.5 h-3.5" />
                        {t.invokeBtn}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {status !== 'IDLE' && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-xs flex items-center justify-between gap-2">
          {status === 'LOADING' && (
            <span className="text-amber-300 flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.loadingMsg}
            </span>
          )}
          {status === 'SUCCESS' && (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {statusMsg}
            </span>
          )}
          {status === 'ERROR' && (
            <>
              <span className="text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {statusMsg}
              </span>
              {errorCode && (
                <code className="rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
                  {errorCode}
                </code>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
