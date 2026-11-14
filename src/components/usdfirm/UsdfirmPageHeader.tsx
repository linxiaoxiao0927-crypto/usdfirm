'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { useUsdfirmLocale, UsdfirmLocaleToggle } from '@/lib/usdfirm/i18n';

export function UsdfirmPageHeader() {
  const { copy } = useUsdfirmLocale();
  const t = copy.dedicatedPage;

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-white/10 bg-zinc-950/90 p-6 backdrop-blur-xl shadow-2xl">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-0.5 text-xs font-mono font-semibold text-emerald-300">
            <Shield className="w-3.5 h-3.5" />
            {t.firewallBadge}
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-mono text-amber-300">
            {t.pegBadge}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          USDFirm.com{' '}
          <span className="text-zinc-400 font-normal text-lg">{t.subtitle}</span>
        </h1>
      </div>

      <div className="flex items-center gap-2.5 self-start sm:self-auto">
        <UsdfirmLocaleToggle />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.backHome}
        </Link>
      </div>
    </header>
  );
}
