'use client';

import React from 'react';
import {
  Activity,
  Database,
  Landmark,
  Network,
  Settings,
} from 'lucide-react';

export type UsdfMainTab = 'overview' | 'vault' | 'federation' | 'ledger' | 'settings';

interface LiquidGlassTabBarProps {
  lang: 'zh' | 'en';
  activeTab: UsdfMainTab;
  onSelectTab: (tab: UsdfMainTab) => void;
}

const TAB_ITEMS: {
  key: UsdfMainTab;
  zh: string;
  en: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'overview', zh: '总览', en: 'Protocol', icon: Activity },
  { key: 'vault', zh: '储备', en: 'Vault', icon: Landmark },
  { key: 'federation', zh: '联邦', en: 'Bridge', icon: Network },
  { key: 'ledger', zh: '账本', en: 'Ledger', icon: Database },
  { key: 'settings', zh: '设置', en: 'Settings', icon: Settings },
];

export function LiquidGlassTabBar({
  lang,
  activeTab,
  onSelectTab,
}: LiquidGlassTabBarProps) {
  return (
    <nav
      aria-label={lang === 'zh' ? '主导航栏' : 'Primary Navigation'}
      className="fixed left-1/2 -translate-x-1/2 bottom-[max(12px,env(safe-area-inset-bottom))] z-50 w-[calc(100%-24px)] max-w-[440px]"
    >
      <div className="p-1.5 rounded-full bg-[#141519]/88 backdrop-blur-2xl flex items-center justify-between gap-1">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectTab(item.key)}
              className={`flex-1 py-1.5 px-1 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-95 ${
                active
                  ? 'bg-[#00DC6D]/15 text-[#00DC6D]'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="text-[10px] font-semibold tracking-tight leading-none">
                {lang === 'zh' ? item.zh : item.en}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
