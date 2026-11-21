"use client";

import React, { useLayoutEffect, useRef } from 'react';
import { MATRIX_SPRINGS, SpringValue } from './physics';

export interface SpringTabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  testId?: string;
}

export interface SpringSegmentedTabsProps<T extends string = string> {
  items: SpringTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Fires immediately on pointerdown before click commit for local-first prefetching. */
  onPrefetch?: (id: T) => void;
  variant?: 'scrollable' | 'segmented';
  tone?: 'light-pill' | 'emerald-pill' | 'surface-pill';
  className?: string;
  ariaLabel?: string;
  testId?: string;
}

const TONE_STYLES: Record<
  NonNullable<SpringSegmentedTabsProps['tone']>,
  {
    trackBg: string;
    pillBg: string;
    activeColor: string;
    inactiveColor: string;
  }
> = {
  // 全部使用主题变量：随「纯黑 / 亮白 / 彩色」主题整套切换，深色作用域内自动回到深色原貌
  'light-pill': {
    trackBg: 'color-mix(in oklab, var(--color-white, #fff) 5%, transparent)',
    pillBg: 'var(--color-white, #ffffff)',
    activeColor: 'var(--color-black, #000000)',
    inactiveColor: 'color-mix(in oklab, var(--color-white, #fff) 72%, transparent)',
  },
  'emerald-pill': {
    trackBg: 'var(--bg-secondary, #121214)',
    pillBg: '#10B981',
    activeColor: '#FFFFFF',
    inactiveColor: 'color-mix(in oklab, var(--color-white, #fff) 72%, transparent)',
  },
  'surface-pill': {
    trackBg: 'var(--bg-secondary, #121214)',
    pillBg: 'var(--bg-tertiary, #1C1C1E)',
    activeColor: 'var(--color-white, #ffffff)',
    inactiveColor: 'color-mix(in oklab, var(--color-white, #fff) 62%, transparent)',
  },
};

export function SpringSegmentedTabs<T extends string = string>({
  items,
  value,
  onChange,
  onPrefetch,
  variant = 'scrollable',
  tone = 'light-pill',
  className,
  ariaLabel = 'Navigation tabs',
  testId,
}: SpringSegmentedTabsProps<T>) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const xSpringRef = useRef<SpringValue | null>(null);
  const wSpringRef = useRef<SpringValue | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const committedOnPointerDownRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);

  const colors = TONE_STYLES[tone];

  const syncPill = (immediate: boolean) => {
    const btn = btnRefs.current[value];
    const track = trackRef.current;
    const pill = pillRef.current;
    if (!btn || !track || !pill) return;

    const targetX = btn.offsetLeft;
    const targetW = btn.offsetWidth;
    if (targetW <= 0) return;

    if (!xSpringRef.current) {
      xSpringRef.current = new SpringValue(targetX);
      xSpringRef.current.subscribe((x) => {
        if (pillRef.current) {
          pillRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
        }
      });
    }
    if (!wSpringRef.current) {
      wSpringRef.current = new SpringValue(targetW);
      wSpringRef.current.subscribe((w) => {
        if (pillRef.current) {
          pillRef.current.style.width = `${w}px`;
        }
      });
    }

    if (immediate || !initializedRef.current) {
      xSpringRef.current.set(targetX);
      wSpringRef.current.set(targetW);
      pill.style.opacity = '1';
      initializedRef.current = true;
    } else {
      pill.style.opacity = '1';
      xSpringRef.current.animateTo(targetX, MATRIX_SPRINGS.snappy);
      wSpringRef.current.animateTo(targetW, MATRIX_SPRINGS.snappy);
    }

    if (variant === 'scrollable') {
      const trackCenter = track.clientWidth / 2;
      const btnCenter = targetX + targetW / 2;
      const nextScroll = Math.max(0, btnCenter - trackCenter);
      track.scrollTo({ left: nextScroll, behavior: immediate ? 'auto' : 'smooth' });
    }
  };

  useLayoutEffect(() => {
    syncPill(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, items.length, variant]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => syncPill(true));
    ro.observe(track);
    return () => {
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useLayoutEffect(() => {
    return () => {
      xSpringRef.current?.destroy();
      wSpringRef.current?.destroy();
    };
  }, []);

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label={ariaLabel}
      data-testid={testId}
      data-matrix-no-scrollbar="1"
      className={className}
      style={{
        position: 'relative',
        isolation: 'isolate',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px',
        borderRadius: '9999px',
        backgroundColor: colors.trackBg,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflowX: variant === 'scrollable' ? 'auto' : 'hidden',
        overflowY: 'hidden',
        whiteSpace: 'nowrap',
        width: variant === 'segmented' ? '100%' : 'auto',
      }}
    >
      <div
        ref={pillRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          zIndex: 0,
          top: '4px',
          bottom: '4px',
          left: 0,
          borderRadius: '9999px',
          backgroundColor: colors.pillBg,
          opacity: 0,
          pointerEvents: 'none',
          willChange: 'transform, width',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
        }}
      />

      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              btnRefs.current[item.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={item.testId}
            disabled={item.disabled}
            onPointerDown={(e) => {
              if (item.disabled) return;
              onPrefetch?.(item.id);
              pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
              if (variant === 'segmented') {
                committedOnPointerDownRef.current = true;
                onChange(item.id);
              } else {
                committedOnPointerDownRef.current = false;
              }
            }}
            onPointerUp={(e) => {
              if (item.disabled || variant !== 'scrollable' || !pointerDownPosRef.current) return;
              const moved = Math.abs(e.clientX - pointerDownPosRef.current.x);
              pointerDownPosRef.current = null;
              if (moved < 8) {
                committedOnPointerDownRef.current = true;
                onChange(item.id);
              }
            }}
            onClick={() => {
              if (item.disabled) return;
              if (committedOnPointerDownRef.current) {
                committedOnPointerDownRef.current = false;
                return;
              }
              onChange(item.id);
            }}
            style={{
              position: 'relative',
              zIndex: 2,
              transform: 'translate3d(0, 0, 0)',
              flex: variant === 'segmented' ? '1 1 0%' : '0 0 auto',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '9999px',
              border: 'none',
              background: 'transparent',
              color: active ? colors.activeColor : colors.inactiveColor,
              fontSize: '12px',
              fontWeight: active ? 700 : 600,
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.45 : 1,
              touchAction: 'manipulation',
              transition: 'color 150ms ease',
            }}
          >
            {item.icon}
            <span
              style={{
                position: 'relative',
                zIndex: 1,
                whiteSpace: 'nowrap',
                color: active ? colors.activeColor : colors.inactiveColor,
              }}
            >
              {item.label}
            </span>
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}
