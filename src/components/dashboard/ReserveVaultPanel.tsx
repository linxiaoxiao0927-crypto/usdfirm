'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { ReserveAssetItem, LedgerSnapshot } from '@/types/ledger';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';

interface ReserveVaultPanelProps {
  reserves: ReserveAssetItem[];
  reserveRatioPct: number;
  onSnapshotUpdate: (snap: LedgerSnapshot) => void;
}

const RESERVE_BENTO = [
  'sm-bento-emerald',
  'sm-bento-amber',
  'sm-bento-slate',
  'sm-bento-teal',
];

export function ReserveVaultPanel({
  reserves,
  reserveRatioPct,
  onSnapshotUpdate,
}: ReserveVaultPanelProps) {
  const { copy, resolveError } = useUsdfirmLocale();
  const t = copy.dashboard.vault;

  const [action, setAction] = useState<'MINT' | 'REDEEM'>('MINT');
  const [channel, setChannel] = useState<'XPAYES_VIBAN' | 'ITISCOIN_CHAIN'>(
    'XPAYES_VIBAN'
  );
  const [ownerSite, setOwnerSite] = useState('sofayes.com');
  const [amountUsd, setAmountUsd] = useState('25000');
  const [status, setStatus] = useState<
    'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  >('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amountUsd);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setStatus('ERROR');
      setErrorCode('ERR_INVALID_AMOUNT');
      setFeedbackMsg(resolveError('ERR_INVALID_AMOUNT'));
      return;
    }

    setStatus('LOADING');
    setFeedbackMsg('');
    setErrorCode(null);

    try {
      const res = await fetch('/api/v1/mint', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ownerSite,
          ownerEntity: 'ENT-SOFA-CORE',
          amountUsd: numericAmount,
          channel,
          idempotencyKey: `mint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_INTERNAL_SERVER';
        setStatus('ERROR');
        setErrorCode(code);
        setFeedbackMsg(resolveError(code, json.error?.message));
        return;
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setFeedbackMsg(
        action === 'MINT'
          ? t.formatMintSuccess(numericAmount, json.data.entry.txHash)
          : t.formatRedeemSuccess(numericAmount, json.data.entry.txHash)
      );
    } catch {
      const code = 'ERR_LEDGER_SYNC_FAILED';
      setStatus('ERROR');
      setErrorCode(code);
      setFeedbackMsg(resolveError(code));
    }
  };

  return (
    <div className="sm-card rounded-3xl bg-[#1C1D21] p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#00DC6D]" />
            <h2 className="text-lg font-bold text-white">{t.title}</h2>
          </div>
          <p className="text-xs text-white/55 mt-1">
            {t.subtitlePrefix}{' '}
            <span className="text-[#FCD34D] font-mono">xpayes.com</span>{' '}
            {t.subtitleMid}{' '}
            <span className="text-[#67E8F9] font-mono">itiscoin.com</span>{' '}
            {t.subtitleEnd}
          </p>
        </div>
        <span className="rounded-full bg-[#00DC6D]/15 px-3.5 py-1 text-xs font-mono font-semibold text-[#00DC6D]">
          {t.ratioPrefix} {reserveRatioPct.toFixed(2)}%
        </span>
      </div>

      {reserves.length === 0 ? (
        <div className="rounded-2xl bg-[#24262C] p-6 text-center text-xs text-white/50">
          {t.emptyReserves}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reserves.map((item, idx) => (
            <div
              key={item.id}
              className={`rounded-2xl p-4 sm:p-5 space-y-2 ${
                RESERVE_BENTO[idx % RESERVE_BENTO.length]
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#FCD34D] font-semibold">
                  {item.channelDomain}
                </span>
                <span className="rounded-full bg-black/25 px-2.5 py-0.5 text-white/75">
                  {t.weightPrefix} {item.allocationPct.toFixed(0)}%
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                {t.assetNames[item.id] ?? item.assetName}
              </p>
              <p className="text-xl font-bold font-mono text-[#00DC6D]">
                ${item.usdValue.toLocaleString()} USD
              </p>
              <p className="text-[11px] font-mono text-white/45 truncate">
                {t.merklePrefix} {item.merkleRoot}
              </p>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl bg-[#24262C] p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/75">
            {t.formTitle}
          </span>
          <div className="flex rounded-full bg-[#1C1D21] p-1">
            <button
              type="button"
              onClick={() => setAction('MINT')}
              className={`flex items-center gap-1 px-3.5 py-1 rounded-full text-xs font-semibold transition ${
                action === 'MINT'
                  ? 'bg-[#00DC6D] text-[#090A0F]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              {t.mintTab}
            </button>
            <button
              type="button"
              onClick={() => setAction('REDEEM')}
              className={`flex items-center gap-1 px-3.5 py-1 rounded-full text-xs font-semibold transition ${
                action === 'REDEEM'
                  ? 'bg-[#D4A853] text-[#090A0F]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              {t.redeemTab}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-white/55 mb-1">
              {t.siteLabel}
            </label>
            <select
              value={ownerSite}
              onChange={(e) => setOwnerSite(e.target.value)}
              className="w-full rounded-2xl bg-[#1C1D21] px-3.5 py-2.5 text-xs text-white focus:outline-none"
            >
              <option value="sofayes.com">{t.siteSofayes}</option>
              <option value="hmm.sale">{t.siteHmm}</option>
              <option value="dezi.life">{t.siteDezi}</option>
              <option value="sheng.sale">{t.siteSheng}</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-white/55 mb-1">
              {t.channelLabel}
            </label>
            <select
              value={channel}
              onChange={(e) =>
                setChannel(
                  e.target.value as 'XPAYES_VIBAN' | 'ITISCOIN_CHAIN'
                )
              }
              className="w-full rounded-2xl bg-[#1C1D21] px-3.5 py-2.5 text-xs text-white focus:outline-none"
            >
              <option value="XPAYES_VIBAN">{t.channelXpayes}</option>
              <option value="ITISCOIN_CHAIN">{t.channelItiscoin}</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-white/55 mb-1">
              {t.amountLabel}
            </label>
            <input
              type="number"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              className="w-full rounded-2xl bg-white/[0.075] focus:bg-white/[0.12] px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none transition"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-xs flex items-center gap-2">
            {status === 'LOADING' && (
              <span className="inline-flex items-center gap-1.5 text-[#FCD34D]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t.loadingMsg}
              </span>
            )}
            {status === 'ERROR' && (
              <>
                <span className="inline-flex items-center gap-1.5 text-[#FDA4AF]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {feedbackMsg}
                </span>
                {errorCode && (
                  <code className="rounded-lg bg-black/30 px-2 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
                    {errorCode}
                  </code>
                )}
              </>
            )}
            {status === 'SUCCESS' && (
              <span className="inline-flex items-center gap-1.5 text-[#00DC6D]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {feedbackMsg}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={status === 'LOADING'}
            className="shrink-0 rounded-full bg-[#00DC6D] hover:bg-[#19E67C] px-5 py-2 text-xs font-bold text-[#090A0F] disabled:opacity-50 transition"
          >
            {t.submitBtn}
          </button>
        </div>
      </form>
    </div>
  );
}
