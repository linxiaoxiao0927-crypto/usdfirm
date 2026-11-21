"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MATRIX_SPRINGS, SpringValue, VelocityTracker, clamp, rubberband } from './physics';

export interface InteractiveBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Viewport height fractions in (0, 1], e.g. [0.55, 0.9]. */
  snapPoints?: number[];
  initialSnap?: number;
  onSnapChange?: (snapIndex: number) => void;
  maxBlurPx?: number;
  maxWidth?: number;
  testId?: string;
  closeButtonTestId?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function InteractiveBottomSheet({
  open,
  onClose,
  title,
  subtitle,
  snapPoints = [0.55, 0.9],
  initialSnap = 0,
  onSnapChange,
  maxBlurPx = 16,
  maxWidth = 520,
  testId,
  closeButtonTestId,
  children,
  footer,
}: InteractiveBottomSheetProps) {
  const [rendered, setRendered] = useState(open);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [closeAriaLabel, setCloseAriaLabel] = useState<string>('关闭');

  const backdropRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const springRef = useRef<SpringValue | null>(null);
  const velocityRef = useRef<VelocityTracker>(new VelocityTracker());
  const closingRef = useRef<boolean>(false);

  const sortedSnaps = useMemo(() => {
    const clean = snapPoints
      .map((s) => clamp(s, 0.25, 0.96))
      .sort((a, b) => a - b);
    return clean.length > 0 ? clean : [0.6];
  }, [snapPoints]);

  const maxSnap = sortedSnaps[sortedSnaps.length - 1];
  const getVh = () => (typeof window !== 'undefined' ? window.innerHeight : 844);
  const getSheetHeight = () => Math.round(getVh() * maxSnap);
  const getSnapOffsets = () => {
    const vh = getVh();
    return sortedSnaps.map((frac) => Math.max(0, Math.round((maxSnap - frac) * vh)));
  };

  const gestureRef = useRef<{
    active: boolean;
    pointerId: number;
    startY: number;
    startSheetY: number;
    fromBody: boolean;
    draggingSheet: boolean;
  }>({
    active: false,
    pointerId: -1,
    startY: 0,
    startSheetY: 0,
    fromBody: false,
    draggingSheet: false,
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalTarget(document.body);
      const syncLang = () => {
        const lang = (document.documentElement.lang || '').toLowerCase();
        setCloseAriaLabel(lang.startsWith('en') ? 'Close' : '关闭');
      };
      syncLang();
      const observer = new MutationObserver(syncLang);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['lang'],
      });
      return () => observer.disconnect();
    }
  }, []);

  const syncDomForY = (y: number, sheetHeight: number, lowestSnapY: number) => {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    if (sheet) {
      sheet.style.transform = `translate3d(0, ${y}px, 0)`;
    }
    if (backdrop) {
      const denom = Math.max(1, sheetHeight - lowestSnapY);
      const openness = clamp(1 - (y - lowestSnapY) / denom, 0, 1);
      backdrop.style.opacity = String(openness * 0.72);
      const blur = Math.round(openness * maxBlurPx);
      backdrop.style.backdropFilter = `blur(${blur}px)`;
      (backdrop.style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter =
        `blur(${blur}px)`;
    }
  };

  const animateClose = (releaseVy = 0) => {
    if (closingRef.current) return;
    closingRef.current = true;
    const sheetH = getSheetHeight();
    const offsets = getSnapOffsets();
    const lowestSnapY = offsets[0] ?? 0;

    if (!springRef.current) {
      springRef.current = new SpringValue(lowestSnapY);
    }
    const spring = springRef.current;
    spring.subscribe((y) => syncDomForY(y, sheetH, lowestSnapY));
    spring.animateTo(sheetH, MATRIX_SPRINGS.sheet, releaseVy, () => {
      closingRef.current = false;
      setRendered(false);
      onClose();
    });
  };

  useLayoutEffect(() => {
    if (open) {
      closingRef.current = false;
      setRendered(true);
    } else if (rendered && !closingRef.current) {
      animateClose(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!rendered || !open) return;
    const sheetH = getSheetHeight();
    const offsets = getSnapOffsets();
    const lowestSnapY = offsets[0] ?? 0;
    const safeIdx = clamp(initialSnap, 0, offsets.length - 1);
    const targetY = offsets[safeIdx] ?? 0;

    springRef.current?.destroy();
    const spring = new SpringValue(sheetH);
    springRef.current = spring;
    spring.subscribe((y) => syncDomForY(y, sheetH, lowestSnapY));
    syncDomForY(sheetH, sheetH, lowestSnapY);
    requestAnimationFrame(() => {
      spring.animateTo(targetY, MATRIX_SPRINGS.sheet, 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered, open]);

  useEffect(() => {
    if (!rendered) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        animateClose(0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered]);

  useEffect(() => {
    return () => {
      springRef.current?.destroy();
    };
  }, []);

  if (!portalTarget || !rendered) {
    return null;
  }

  const sheetHeight = getSheetHeight();

  const beginDrag = (clientY: number, pointerId: number, fromBody: boolean) => {
    if (closingRef.current) return;
    const currentY = springRef.current?.get() ?? 0;
    springRef.current?.stop();
    velocityRef.current.reset();
    velocityRef.current.addSample(0, clientY);

    gestureRef.current = {
      active: true,
      pointerId,
      startY: clientY,
      startSheetY: currentY,
      fromBody,
      draggingSheet: !fromBody,
    };
  };

  const moveDrag = (clientY: number, pointerId: number) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== pointerId || closingRef.current) return;

    const dy = clientY - g.startY;
    velocityRef.current.addSample(0, clientY);

    if (g.fromBody && !g.draggingSheet) {
      const scrollTop = bodyRef.current?.scrollTop ?? 0;
      if (scrollTop <= 0 && dy > 6) {
        g.draggingSheet = true;
        g.startY = clientY;
        g.startSheetY = springRef.current?.get() ?? 0;
      } else {
        return;
      }
    }

    const rawY = g.startSheetY + (clientY - g.startY);
    const nextY = rawY < 0 ? -rubberband(-rawY, sheetHeight * 0.3, 0.4) : rawY;
    const offsets = getSnapOffsets();
    const lowestSnapY = offsets[0] ?? 0;

    if (!springRef.current) {
      springRef.current = new SpringValue(nextY);
      springRef.current.subscribe((y) => syncDomForY(y, sheetHeight, lowestSnapY));
    }
    springRef.current.set(nextY, true);
  };

  const endDrag = (pointerId: number) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== pointerId) return;
    g.active = false;
    if (!g.draggingSheet || closingRef.current) return;

    const { vy } = velocityRef.current.getVelocity();
    const currentY = springRef.current?.get() ?? 0;
    const offsets = getSnapOffsets();
    const lowestSnapY = offsets[0] ?? 0;
    const vh = getVh();
    const projectedY = currentY + vy * 0.16;

    const shouldDismiss =
      (currentY >= lowestSnapY - 8 && vy > 650) ||
      vy > 1250 ||
      projectedY > lowestSnapY + vh * sortedSnaps[0] * 0.42;

    if (shouldDismiss) {
      animateClose(vy);
      return;
    }

    let bestIdx = 0;
    let bestDist = Infinity;
    offsets.forEach((offset, idx) => {
      const dist = Math.abs(projectedY - offset);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });

    const targetY = offsets[bestIdx] ?? 0;
    onSnapChange?.(bestIdx);
    springRef.current?.animateTo(targetY, MATRIX_SPRINGS.sheet, vy);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-matrix-sheet="true"
      data-ios-bottom-sheet-overlay="true"
      data-testid={testId}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9900,
        overscrollBehavior: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
      }}
    >
      <div
        ref={backdropRef}
        onClick={() => animateClose(0)}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#000000',
          opacity: 0,
          willChange: 'opacity',
        }}
      />

      <div
        ref={sheetRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: `${maxWidth}px`,
          height: `${sheetHeight}px`,
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          borderTop: '1px solid var(--border-color)',
          borderLeft: '1px solid var(--border-color)',
          borderRight: '1px solid var(--border-color)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          overscrollBehavior: 'none',
          willChange: 'transform',
          boxShadow: 'var(--glass-shadow, 0 -20px 60px rgba(0, 0, 0, 0.32))',
        }}
      >
        <div
          onPointerDown={(e) => {
            if (
              e.target instanceof HTMLElement &&
              e.target.closest('button, a, input, select, textarea, [data-no-sheet-drag]')
            ) {
              return;
            }
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            beginDrag(e.clientY, e.pointerId, false);
          }}
          onPointerMove={(e) => moveDrag(e.clientY, e.pointerId)}
          onPointerUp={(e) => {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              // Ignore already-released pointer.
            }
            endDrag(e.pointerId);
          }}
          onPointerCancel={(e) => endDrag(e.pointerId)}
          style={{
            touchAction: 'none',
            paddingTop: '10px',
            paddingBottom: '12px',
            paddingLeft: '18px',
            paddingRight: '18px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
            cursor: 'grab',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              borderRadius: '9999px',
              backgroundColor: 'color-mix(in oklab, var(--text-secondary) 45%, transparent)',
              margin: '0 auto 12px',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {title && (
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {title}
                </div>
              )}
              {subtitle && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {subtitle}
                </div>
              )}
            </div>
            <button
              type="button"
              data-testid={closeButtonTestId}
              data-no-sheet-drag="true"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                animateClose(0);
              }}
              aria-label={closeAriaLabel}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80"
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '18px',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div
          ref={bodyRef}
          data-matrix-no-scrollbar="1"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            beginDrag(e.clientY, e.pointerId, true);
          }}
          onPointerMove={(e) => moveDrag(e.clientY, e.pointerId)}
          onPointerUp={(e) => endDrag(e.pointerId)}
          onPointerCancel={(e) => endDrag(e.pointerId)}
          style={{
            flex: 1,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: '16px 18px',
            paddingBottom: footer ? '16px' : 'max(env(safe-area-inset-bottom, 0px), 24px)',
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              flexShrink: 0,
              padding: '12px 18px',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    portalTarget,
  );
}
