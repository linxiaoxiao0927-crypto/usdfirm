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
    <div className="rounded-3xl bg-[#1C1D21] p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#00DC6D]" />
            <h2 className="text-xl font-bold tracking-tight text-[#F4F4F6]">{t.title}</h2>
          </div>
          <p className="text-xs text-white/60 mt-1">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D]/15 px-3.5 py-1 text-xs font-mono font-semibold text-[#00DC6D]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.backingRatio}: {attestation.reserveRatioPct.toFixed(2)}%
          </span>
          <span className="rounded-full bg-[#24262C] px-3.5 py-1 text-xs font-mono text-white/65">
            {t.epochRound} #{attestation.roundId}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm-bento-emerald rounded-2xl p-5 space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-[#6EE7B7]/85 font-medium">
            {t.totalReserves}
          </span>
          <p className="text-2xl font-bold font-mono text-[#00DC6D]">
            ${attestation.totalReservesUsd.toLocaleString()} USD
          </p>
          <span className="text-[11px] text-white/65">{t.totalReservesSub}</span>
        </div>

        <div className="sm-bento-slate rounded-2xl p-5 space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-[#93C5FD]/85 font-medium">
            {t.circulatingUsdf}
          </span>
          <p className="text-2xl font-bold font-mono text-[#F4F4F6]">
            ${attestation.circulatingUsdf.toLocaleString()} USDF
          </p>
          <span className="text-[11px] text-white/65">{t.circulatingSub}</span>
        </div>

        <div className="sm-bento-amber rounded-2xl p-5 space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-[#FCD34D]/85 font-medium">
            {t.surplusBuffer}
          </span>
          <p className="text-2xl font-bold font-mono text-[#FCD34D]">
            +${surplusUsd.toLocaleString()} USD
          </p>
          <span className="text-[11px] text-white/65">{t.surplusSub}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span className="font-semibold uppercase text-white/80 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#00DC6D]" />
            {t.breakdownTitle}
          </span>
          <span>
            {t.updatedAt}:{' '}
            {new Date(attestation.timestamp).toLocaleTimeString(
              locale === 'zh' ? 'zh-CN' : 'en-US'
            )}
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
                className="rounded-2xl bg-[#24262C] hover:bg-[#26272B] transition p-4 flex flex-col justify-between space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#00DC6D] font-bold">{item.cusip}</span>
                  <div className="flex items-center gap-1.5">
                    {typeof item.weightPct === 'number' && (
                      <span className="rounded-full bg-[#00DC6D]/15 px-2.5 py-0.5 text-[10px] text-[#00DC6D] font-mono font-semibold">
                        {t.weight} {item.weightPct}%
                      </span>
                    )}
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] text-white/75 font-mono">
                      {localizedAssetType}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F4F4F6] truncate">{displayName}</p>
                  <p className="text-xs text-white/60">{item.custodian}</p>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#18191C] px-3 py-2 text-xs font-mono">
                  <span className="text-white/60">{t.marketValue}</span>
                  <span className="text-[#F4F4F6] font-bold">
                    ${item.marketUsd.toLocaleString()} USD
                  </span>
                  <span className="text-[#FCD34D] font-semibold">
                    {item.yieldApy}% {t.apy}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-[#24262C] p-4 space-y-2 text-xs font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-white/60 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#00DC6D]" />
            {t.merkleLabel}
          </span>
          <span className="text-[#6EE7B7] break-all">{attestation.merkleRoot}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/45 pt-1 font-sans">
          <span>
            {t.oracleFeed} #{attestation.chainlinkRoundData.roundId} | {t.answerMicro}:{' '}
            {attestation.chainlinkRoundData.answerMicro}
          </span>
          <a
            href={attestation.attestationReportUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#00DC6D] hover:text-[#19E67C] flex items-center gap-1 font-mono font-semibold"
          >
            <FileText className="w-3.5 h-3.5" />
            {t.viewCert}
          </a>
        </div>
      </div>
    </div>
  );
}
