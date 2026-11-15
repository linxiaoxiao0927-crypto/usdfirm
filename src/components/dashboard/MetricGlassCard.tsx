import React from 'react';

export interface MetricGlassCardProps {
  title: string;
  subtitle: string;
  value: string;
  unit: string;
  badgeText: string;
  accent: 'emerald' | 'amber' | 'cyan' | 'purple';
}

const ACCENT_MAP: Record<
  MetricGlassCardProps['accent'],
  { bento: string; badge: string; text: string }
> = {
  emerald: {
    bento: 'sm-bento-emerald',
    badge: 'bg-[#00DC6D]/15 text-[#00DC6D]',
    text: 'text-[#00DC6D]',
  },
  amber: {
    bento: 'sm-bento-amber',
    badge: 'bg-[#D4A853]/20 text-[#FCD34D]',
    text: 'text-[#FCD34D]',
  },
  cyan: {
    bento: 'sm-bento-teal',
    badge: 'bg-[#2DD4BF]/15 text-[#67E8F9]',
    text: 'text-[#67E8F9]',
  },
  purple: {
    bento: 'sm-bento-plum',
    badge: 'bg-[#D8B4FE]/15 text-[#D8B4FE]',
    text: 'text-[#D8B4FE]',
  },
};

export function MetricGlassCard({
  title,
  subtitle,
  value,
  unit,
  badgeText,
  accent,
}: MetricGlassCardProps) {
  const style = ACCENT_MAP[accent];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 transition ${style.bento}`}
    >
      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/75">
              {title}
            </p>
            <p className="text-[11px] text-white/50 mt-0.5">{subtitle}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${style.badge}`}
          >
            {badgeText}
          </span>
        </div>

        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
            {value}
          </span>
          <span className={`text-xs font-semibold font-mono ${style.text}`}>
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}
