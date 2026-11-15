'use client';

import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { LedgerAccountRecord, LedgerSnapshot } from '@/types/ledger';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';

interface TokenSwapAndAccountsPanelProps {
  accounts: LedgerAccountRecord[];
  onSnapshotUpdate: (snap: LedgerSnapshot) => void;
}

export function TokenSwapAndAccountsPanel({
  accounts,
  onSnapshotUpdate,
}: TokenSwapAndAccountsPanelProps) {
  const { copy, resolveError } = useUsdfirmLocale();
  const t = copy.dashboard.swap;

  const [ownerSite, setOwnerSite] = useState('sofayes.com');
  const [direction, setDirection] = useState<'USDF_TO_UUSDF' | 'UUSDF_TO_USDF'>(
    'USDF_TO_UUSDF'
  );
  const [amount, setAmount] = useState('500');
  const [status, setStatus] = useState<
    'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  >('IDLE');
  const [feedback, setFeedback] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setStatus('ERROR');
      setErrorCode('ERR_INVALID_AMOUNT');
      setFeedback(resolveError('ERR_INVALID_AMOUNT'));
      return;
    }

    setStatus('LOADING');
    setFeedback('');
    setErrorCode(null);

    try {
      const res = await fetch('/api/v1/swap', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerSite,
          ownerEntity: 'ENT-SOFA-CORE',
          direction,
          amount: numericAmount,
          idempotencyKey: `swap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_INTERNAL_SERVER';
        setStatus('ERROR');
        setErrorCode(code);
        setFeedback(resolveError(code, json.error?.message));
        return;
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setFeedback(
        direction === 'USDF_TO_UUSDF'
          ? t.formatForwardSuccess(numericAmount, json.data.convertedAmount)
          : t.formatReverseSuccess(numericAmount, json.data.convertedAmount)
      );
    } catch {
      const code = 'ERR_LEDGER_SYNC_FAILED';
      setStatus('ERROR');
      setErrorCode(code);
      setFeedback(resolveError(code));
    }
  };

  return (
    <div className="sm-card rounded-3xl bg-[#1C1D21] p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#FCD34D]" />
            <h2 className="text-lg font-bold text-white">{t.title}</h2>
          </div>
          <p className="text-xs text-white/55 mt-1">
            {t.subtitlePrefix}{' '}
            <span className="text-[#00DC6D] font-mono">{t.subtitleRate}</span>
            {t.subtitleSuffix}
          </p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-2xl bg-[#24262C] p-6 text-center text-xs text-white/50">
          {t.emptyAccounts}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts
            .filter((a) => a.accountType !== 'ASSET_RESERVE')
            .map((acc) => (
              <div
                key={acc.id}
                className="rounded-2xl bg-[#24262C] p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-mono font-bold text-white">
                    <Wallet className="w-3.5 h-3.5 text-[#00DC6D]" />
                    {acc.ownerSite}
                  </span>
                  <span className="rounded-full bg-[#1C1D21] px-2 py-0.5 font-mono text-[10px] text-white/60">
                    {acc.accountType} · v{acc.version}
                  </span>
                </div>
                <div className="pt-1 space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/55">{t.stableLabel}</span>
                    <span className="text-[#00DC6D] font-bold">
                      {acc.asdStableBal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/55">{t.gasLabel}</span>
                    <span className="text-[#FCD34D] font-bold">
                      {acc.asdGasBal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <form
        onSubmit={handleSwap}
        noValidate
        className="rounded-2xl bg-[#24262C] p-5 space-y-4"
      >
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
              <option value="sofayes.com">sofayes.com</option>
              <option value="hmm.sale">hmm.sale</option>
              <option value="dezi.life">dezi.life</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-white/55 mb-1">
              {t.directionLabel}
            </label>
            <select
              value={direction}
              onChange={(e) => {
                const nextDir = e.target.value as 'USDF_TO_UUSDF' | 'UUSDF_TO_USDF';
                setDirection(nextDir);
                setAmount(nextDir === 'USDF_TO_UUSDF' ? '500' : '50000000');
              }}
              className="w-full rounded-2xl bg-[#1C1D21] px-3.5 py-2.5 text-xs text-white focus:outline-none"
            >
              <option value="USDF_TO_UUSDF">{t.dirUsdfToUusdf}</option>
              <option value="UUSDF_TO_USDF">{t.dirUusdfToUsdf}</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-white/55 mb-1">
              {t.amountPrefix} ({direction === 'USDF_TO_UUSDF' ? 'USDF' : 'uUSDF'})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-2xl bg-white/[0.075] focus:bg-white/[0.12] px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
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
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {feedback}
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
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {feedback}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={status === 'LOADING'}
            className="rounded-full bg-[#00DC6D] hover:bg-[#19E67C] px-5 py-2 text-xs font-bold text-[#090A0F] disabled:opacity-50 transition"
          >
            {t.submitBtn}
          </button>
        </div>
      </form>
    </div>
  );
}
