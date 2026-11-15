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
    <div className="rounded-3xl bg-[#1C1D21] p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#FCD34D]" />
            <h2 className="text-lg font-bold text-[#F4F4F6]">{t.title}</h2>
          </div>
          <p className="text-xs text-white/60 mt-1">
            {t.subtitlePrefix}{' '}
            <span className="text-[#FCD34D] font-mono">uUSDF</span>
            {t.subtitleSuffix}
          </p>
        </div>
        <span className="rounded-full bg-[#D4A853]/15 px-3.5 py-1 text-xs font-mono font-semibold text-[#FCD34D]">
          {t.burnedBadgePrefix} {totalBurnedAsdG.toLocaleString()} uUSDF
        </span>
      </div>

      {skills.length === 0 ? (
        <div className="rounded-2xl bg-[#24262C] p-6 text-center text-xs text-white/60">
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
                className="flex flex-col justify-between rounded-2xl bg-[#24262C] p-5 hover:bg-[#26272B] transition space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-full bg-[#00DC6D]/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#00DC6D]">
                      {skill.code.slice(0, 8)}
                    </span>
                    <span className="font-mono text-[#67E8F9] font-semibold">
                      {skill.domain}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#F4F4F6]">
                    {localizedMeta?.name ?? skill.name}
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    {localizedMeta?.description ?? skill.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="rounded-xl bg-[#18191C] px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-white/60">
                      <span>
                        {t.unitPricePrefix} ({localizedMeta?.unitLabel ?? skill.unitLabel})
                      </span>
                      <span className="font-mono text-[#FCD34D] font-semibold">
                        {skill.gasPerUnit.toLocaleString()} uUSDF
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-white/60">
                      <span>{t.splitLabel}</span>
                      <span className="font-mono text-[#6EE7B7]">
                        {Math.round(skill.providerRatio * 100)}% {t.providerLabel} /{' '}
                        {Math.round(skill.burnRatio * 100)}% {t.burnLabel}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isCalling}
                    onClick={() => triggerSkillCall(skill)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-full bg-[#00DC6D] py-2.5 text-xs font-bold text-[#090A0F] hover:bg-[#19E67C] disabled:opacity-50 transition"
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
        <div
          className={`rounded-2xl px-4 py-3 text-xs flex items-center justify-between gap-2 ${
            status === 'ERROR'
              ? 'sm-bento-rose'
              : status === 'SUCCESS'
                ? 'sm-bento-emerald'
                : 'bg-[#24262C]'
          }`}
        >
          {status === 'LOADING' && (
            <span className="text-[#FCD34D] flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.loadingMsg}
            </span>
          )}
          {status === 'SUCCESS' && (
            <span className="text-[#6EE7B7] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00DC6D]" />
              {statusMsg}
            </span>
          )}
          {status === 'ERROR' && (
            <>
              <span className="text-[#FDA4AF] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {statusMsg}
              </span>
              {errorCode && (
                <code className="rounded-full bg-[#090A0F]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
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
