'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Globe, Shield } from 'lucide-react';
import { useUsdfirmLocale } from '@/lib/usdfirm/i18n';

export function UsdfirmPageHeader() {
  const { locale, toggleLocale, copy } = useUsdfirmLocale();
  const t = copy.dedicatedPage;

  return (
    <header className="sticky top-0 z-40 bg-[#141519]/88 backdrop-blur-2xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-[max(10px,env(safe-area-inset-top))] pb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            aria-label={t.backHome}
            className="w-10 h-10 rounded-full bg-[#1C1D21] hover:bg-[#24262C] flex items-center justify-center text-[#F4F4F6] active:scale-95 transition shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 min-w-0 px-3.5 py-2 rounded-full bg-[#1C1D21]">
            <Shield className="w-3.5 h-3.5 text-[#00DC6D] shrink-0" />
            <span className="text-sm font-semibold tracking-tight text-[#F4F4F6] truncate">
              USDFirm · {t.pegBadge}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleLocale}
          aria-label={locale === 'zh' ? 'Switch to English' : '切换至中文'}
          className="h-10 px-3.5 rounded-full bg-[#1C1D21] hover:bg-[#24262C] flex items-center justify-center gap-1.5 text-xs font-mono font-semibold text-[#F4F4F6] active:scale-95 transition"
        >
          <Globe className="w-3.5 h-3.5 text-[#00DC6D]" />
          <span>{locale === 'zh' ? 'EN' : '中'}</span>
        </button>
      </div>
    </header>
  );
}
