'use client';

import React from 'react';
import { ShieldCheck, CheckCircle2, FileText, Database, Lock } from 'lucide-react';
import type { UsdfPoRAttestation, UsdfReserveAssetItem } from '@/lib/usdfirm/types';
import { useUsdfirmLocale } from '@/lib/usdfirm/i18n';

interface PorAttestationDashboardProps {
  attestation: UsdfPoRAttestation;
  reserves: UsdfReserveAssetItem[];
}

export function PorAttestationDashboard({
  attestation,
  reserves,
}: PorAttestationDashboardProps) {
  const { locale, copy } = useUsdfirmLocale();
  const t = copy.por;
  const surplusUsd =
    attestation.surplusUsd ??
    Math.max(0, attestation.totalReservesUsd - attestation.circulatingUsdf);

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">{t.title}</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-mono font-semibold text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.backingRatio}: {attestation.reserveRatioPct.toFixed(2)}%
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-zinc-400">
            {t.epochRound} #{attestation.roundId}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 space-y-1">
          <span className="text-xs uppercase tracking-wider text-zinc-400">{t.totalReserves}</span>
          <p className="text-2xl font-bold font-mono text-emerald-400">
            ${attestation.totalReservesUsd.toLocaleString()} USD
          </p>
          <span className="text-[11px] text-zinc-500">{t.totalReservesSub}</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 space-y-1">
          <span className="text-xs uppercase tracking-wider text-zinc-400">{t.circulatingUsdf}</span>
          <p className="text-2xl font-bold font-mono text-white">
            ${attestation.circulatingUsdf.toLocaleString()} USDF
          </p>
          <span className="text-[11px] text-zinc-500">{t.circulatingSub}</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 space-y-1">
          <span className="text-xs uppercase tracking-wider text-zinc-400">{t.surplusBuffer}</span>
          <p className="text-2xl font-bold font-mono text-amber-300">
            +${surplusUsd.toLocaleString()} USD
          </p>
          <span className="text-[11px] text-zinc-500">{t.surplusSub}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-semibold uppercase text-zinc-300 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-cyan-400" />
            {t.breakdownTitle}
          </span>
          <span>
            {t.updatedAt}: {new Date(attestation.timestamp).toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-US')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reserves.map((item) => {
            const displayName =
              locale === 'zh' ? item.nameZh || item.name : item.nameEn || item.name;
            const assetTypeKey = String(item.assetType || '').toUpperCase();
            const localizedAssetType =
              (t.assetTypes as Record<string, string>)[assetTypeKey] ||
              String(item.assetType).replace(/_/g, ' ');
            return (
              <div
                key={item.cusip}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-emerald-300 font-bold">{item.cusip}</span>
                  <div className="flex items-center gap-1.5">
                    {typeof item.weightPct === 'number' && (
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300 font-mono">
                        {t.weight} {item.weightPct}%
                      </span>
                    )}
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300 font-mono">
                      {localizedAssetType}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                  <p className="text-xs text-zinc-400">{item.custodian}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-mono">
                  <span className="text-zinc-400">{t.marketValue}</span>
                  <span className="text-white font-bold">
                    ${item.marketUsd.toLocaleString()} USD
                  </span>
                  <span className="text-amber-400">
                    {item.yieldApy}% {t.apy}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950/90 p-4 space-y-2 text-xs font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            {t.merkleLabel}
          </span>
          <span className="text-cyan-300 break-all">{attestation.merkleRoot}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 pt-1 border-t border-white/10 font-sans">
          <span>
            {t.oracleFeed} #{attestation.chainlinkRoundData.roundId} | {t.answerMicro}:{' '}
            {attestation.chainlinkRoundData.answerMicro}
          </span>
          <a
            href={attestation.attestationReportUrl}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline flex items-center gap-1 font-mono"
          >
            <FileText className="w-3.5 h-3.5" />
            {t.viewCert}
          </a>
        </div>
      </div>
    </div>
  );
}
