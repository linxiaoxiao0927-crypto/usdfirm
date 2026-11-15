'use client';

import React, { useEffect, useRef } from 'react';

interface SwipeTabFrameProps<T extends string> {
  tabs: readonly T[];
  activeTab: T;
  onChangeTab: (next: T) => void;
  enabled: boolean;
  children: React.ReactNode;
}

export function SwipeTabFrame<T extends string>({
  tabs,
  activeTab,
  onChangeTab,
  enabled,
  children,
}: SwipeTabFrameProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const gestureRef = useRef<{
    active: boolean;
    locked: 'x' | 'y' | null;
    startX: number;
    startY: number;
    startTime: number;
    currentDrag: number;
  }>({
    active: false,
    locked: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    currentDrag: 0,
  });

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const scheduleTransform = (px: number, dragging: boolean) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = containerRef.current;
      if (!el) return;
      if (dragging) {
        el.style.transition = 'none';
        el.style.willChange = 'transform';
        el.style.transform = `translate3d(${px}px, 0, 0)`;
      } else {
        el.style.transition =
          'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
        el.style.transform = 'translate3d(0px, 0, 0)';
        el.style.willChange = 'auto';
      }
    });
  };

  const shouldIgnoreTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest(
        "input, textarea, select, button, a, table, [data-no-swipe='true'], .overflow-x-auto"
      )
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled || e.touches.length !== 1) return;
    if (shouldIgnoreTarget(e.target)) return;
    const t = e.touches[0];
    gestureRef.current = {
      active: true,
      locked: null,
      startX: t.clientX,
      startY: t.clientY,
      startTime: performance.now(),
      currentDrag: 0,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const g = gestureRef.current;
    if (!enabled || !g.active || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - g.startX;
    const dy = t.clientY - g.startY;

    if (!g.locked) {
      if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) {
        g.locked = 'y';
        return;
      }
      if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.45) {
        g.locked = 'x';
      } else {
        return;
      }
    }

    if (g.locked !== 'x') return;

    const idx = tabs.indexOf(activeTab);
    const atStartEdge = idx <= 0 && dx > 0;
    const atEndEdge = idx >= tabs.length - 1 && dx < 0;
    const factor = atStartEdge || atEndEdge ? 0.24 : 0.65;
    const clamped = Math.max(-140, Math.min(140, dx * factor));
    g.currentDrag = clamped;
    scheduleTransform(clamped, true);
  };

  const finishGesture = () => {
    const g = gestureRef.current;
    if (!g.active) return;
    const wasHorizontal = g.locked === 'x';
    const dt = Math.max(1, performance.now() - g.startTime);
    const currentDrag = g.currentDrag;
    g.active = false;
    g.locked = null;
    g.currentDrag = 0;

    if (!wasHorizontal) return;

    scheduleTransform(0, false);

    const velocity = Math.abs(currentDrag) / dt;
    if (Math.abs(currentDrag) >= 48 || (velocity >= 0.35 && Math.abs(currentDrag) >= 24)) {
      const idx = tabs.indexOf(activeTab);
      if (currentDrag < 0 && idx >= 0 && idx < tabs.length - 1) {
        onChangeTab(tabs[idx + 1]);
      } else if (currentDrag > 0 && idx > 0) {
        onChangeTab(tabs[idx - 1]);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={finishGesture}
      onTouchCancel={finishGesture}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}
