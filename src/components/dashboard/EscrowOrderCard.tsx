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
    <div className="rounded-2xl border border-white/10 bg-zinc-950/75 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm font-bold text-white">
            {esc.orderNo}
          </span>
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-mono text-cyan-300">
            {c.sourcePrefix} {esc.sourceSite}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-base font-bold text-emerald-400">
            {esc.totalAmountAsd.toLocaleString()} USDF
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
              isSettled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
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
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <span className="text-[10px] text-zinc-400 block">{c.step1}</span>
          <span className="font-mono text-emerald-300 text-xs mt-1 block truncate">
            {esc.setupyesEntity ?? c.pendingEntity}
          </span>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <span className="text-[10px] text-zinc-400 block">{c.step2}</span>
          <span className="font-mono text-amber-300 text-xs mt-1 block truncate">
            {esc.taxyesRouteId ?? c.pendingTax}
          </span>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <span className="text-[10px] text-zinc-400 block">{c.step3}</span>
          <span className="font-mono text-cyan-300 text-xs mt-1 block truncate">
            {esc.xpayesPayment ?? c.pendingCapital}
          </span>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <span className="text-[10px] text-zinc-400 block">{c.step4}</span>
          <span
            className={`font-mono text-xs mt-1 block truncate ${
              esc.uptoyesWaybill ? 'text-purple-300' : 'text-amber-400'
            }`}
          >
            {esc.uptoyesWaybill ?? c.pendingLogistics}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
        <div className="flex flex-wrap gap-2">
          {esc.splitRules.map((r) => (
            <span
              key={r.recipientSite}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300"
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition"
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
