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
  { badge: string; glow: string; text: string }
> = {
  emerald: {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    glow: 'from-emerald-500/10 via-transparent to-transparent',
    text: 'text-emerald-400',
  },
  amber: {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    glow: 'from-amber-500/10 via-transparent to-transparent',
    text: 'text-amber-400',
  },
  cyan: {
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    glow: 'from-cyan-500/10 via-transparent to-transparent',
    text: 'text-cyan-400',
  },
  purple: {
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    glow: 'from-purple-500/10 via-transparent to-transparent',
    text: 'text-purple-400',
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
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/75 p-6 backdrop-blur-xl shadow-xl transition hover:border-white/20">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${style.glow}`}
      />
      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              {title}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${style.badge}`}
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
