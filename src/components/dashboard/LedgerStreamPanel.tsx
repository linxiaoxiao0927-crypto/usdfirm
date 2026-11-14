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
    <section className="rounded-3xl border border-white/10 bg-zinc-900/75 p-6 sm:p-8 backdrop-blur-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">{t.title}</h2>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400">
          <CheckCircle className="w-3.5 h-3.5" />
          {t.invariantOk}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-zinc-400">
          {t.emptyState}
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.slice(0, 8).map((tx) => (
            <div
              key={tx.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-emerald-400 font-semibold">
                    {tx.txHash}
                  </span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    {tx.debitAccId} → {tx.creditAccId}
                  </span>
                </div>
                <p className="text-zinc-300">{translateLedgerSeedText(tx.memo, locale)}</p>
              </div>
              <div className="text-right font-mono shrink-0">
                <span className="text-sm font-bold text-white">
                  {tx.amount.toLocaleString()}
                </span>{' '}
                <span className="text-amber-400">{tx.tokenType}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
