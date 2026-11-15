'use client';

import React from 'react';
import { CheckCircle2, Clock, Loader2, Send } from 'lucide-react';
import type { FourFlowEscrowRecord } from '@/types/ledger';
import { translateLedgerSeedText, useUsdfirmLocale } from '@/lib/usdfirm/i18n';

interface EscrowOrderCardProps {
  esc: FourFlowEscrowRecord;
  isLoadingThis: boolean;
  onSettle: (esc: FourFlowEscrowRecord) => void;
}

export function EscrowOrderCard({
  esc,
  isLoadingThis,
  onSettle,
}: EscrowOrderCardProps) {
  const { locale, copy } = useUsdfirmLocale();
  const c = copy.dashboard.escrow.card;
  const isSettled = esc.status === 'SETTLED_SPLIT';

  return (
    <div className="rounded-2xl bg-[#24262C] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm font-bold text-white">
            {esc.orderNo}
          </span>
          <span className="rounded-full bg-[#182A2E] px-2.5 py-0.5 text-[11px] font-mono text-[#67E8F9]">
            {c.sourcePrefix} {esc.sourceSite}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-base font-bold text-[#00DC6D]">
            {esc.totalAmountAsd.toLocaleString()} USDF
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              isSettled
                ? 'bg-[#00DC6D]/15 text-[#00DC6D]'
                : 'bg-[#D4A853]/15 text-[#FCD34D]'
            }`}
          >
            {isSettled ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                {c.settledBadge}
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" />
                {c.pendingBadge}
              </>
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="rounded-xl bg-[#1C1D21] p-3">
          <span className="text-[10px] text-white/50 block">{c.step1}</span>
          <span className="font-mono text-[#00DC6D] text-xs mt-1 block truncate">
            {esc.setupyesEntity ?? c.pendingEntity}
          </span>
        </div>
        <div className="rounded-xl bg-[#1C1D21] p-3">
          <span className="text-[10px] text-white/50 block">{c.step2}</span>
          <span className="font-mono text-[#FCD34D] text-xs mt-1 block truncate">
            {esc.taxyesRouteId ?? c.pendingTax}
          </span>
        </div>
        <div className="rounded-xl bg-[#1C1D21] p-3">
          <span className="text-[10px] text-white/50 block">{c.step3}</span>
          <span className="font-mono text-[#67E8F9] text-xs mt-1 block truncate">
            {esc.xpayesPayment ?? c.pendingCapital}
          </span>
        </div>
        <div className="rounded-xl bg-[#1C1D21] p-3">
          <span className="text-[10px] text-white/50 block">{c.step4}</span>
          <span
            className={`font-mono text-xs mt-1 block truncate ${
              esc.uptoyesWaybill ? 'text-[#D8B4FE]' : 'text-[#FCD34D]'
            }`}
          >
            {esc.uptoyesWaybill ?? c.pendingLogistics}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap gap-2">
          {esc.splitRules.map((r) => (
            <span
              key={r.recipientSite}
              className="rounded-full bg-[#1C1D21] px-3 py-1 text-[11px] text-white/75"
            >
              <strong className="text-white font-mono">
                {r.recipientSite}
              </strong>{' '}
              ({translateLedgerSeedText(r.roleLabel, locale)}): {r.percentage}%
            </span>
          ))}
        </div>
        {!isSettled && (
          <button
            type="button"
            disabled={isLoadingThis}
            onClick={() => onSettle(esc)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D] hover:bg-[#19E67C] px-4 py-2 text-xs font-bold text-[#090A0F] disabled:opacity-50 transition"
          >
            {isLoadingThis ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {c.settlingBtn}
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                {c.settleBtn}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
