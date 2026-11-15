'use client';

import React from 'react';
import { BookOpen, CheckCircle } from 'lucide-react';
import type { LedgerEntryRecord } from '@/types/ledger';
import { translateLedgerSeedText, useUsdfirmLocale } from '@/lib/usdfirm/i18n';

export function LedgerStreamPanel({
  entries,
}: {
  entries: LedgerEntryRecord[];
}) {
  const { locale, copy } = useUsdfirmLocale();
  const t = copy.dashboard.ledgerStream;

  return (
    <section className="rounded-3xl bg-[#1C1D21] p-6 sm:p-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#00DC6D]" />
          <h2 className="text-lg font-bold text-[#F4F4F6]">{t.title}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D]/15 px-3 py-1 text-xs font-mono font-semibold text-[#00DC6D]">
          <CheckCircle className="w-3.5 h-3.5" />
          {t.invariantOk}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl bg-[#24262C] p-6 text-center text-xs text-white/60">
          {t.emptyState}
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.slice(0, 8).map((tx) => (
            <div
              key={tx.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl bg-[#24262C] hover:bg-[#26272B] transition px-4 py-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[#00DC6D] font-semibold">
                    {tx.txHash}
                  </span>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/75">
                    {tx.debitAccId} → {tx.creditAccId}
                  </span>
                </div>
                <p className="text-white/75">{translateLedgerSeedText(tx.memo, locale)}</p>
              </div>
              <div className="text-right font-mono shrink-0">
                <span className="text-sm font-bold text-[#F4F4F6]">
                  {tx.amount.toLocaleString()}
                </span>{' '}
                <span className="text-[#FCD34D]">{tx.tokenType}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
