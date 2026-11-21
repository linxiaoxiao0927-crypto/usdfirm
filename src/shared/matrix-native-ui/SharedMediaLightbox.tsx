"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MATRIX_SPRINGS,
  SpringValue,
  VelocityTracker,
  clamp,
  computeCoverCropBox,
  lerp,
  rubberband,
} from './physics';

export interface SharedMediaItem {
  id?: string;
  src: string;
  alt?: string;
  aspectRatio?: number;
  caption?: string;
}

export interface SharedMediaLightboxProps {
  items: SharedMediaItem[];
  activeIndex: number | null;
  onIndexChange?: (index: number) => void;
  onClose: () => void;
  getThumbnailElement?: (index: number) => HTMLElement | null;
  originRect?: DOMRect | null;
  originBorderRadius?: number;
  renderFooter?: (item: SharedMediaItem, index: number) => React.ReactNode;
}

interface Pose {
  cx: number;
  cy: number;
  scale: number;
  cropX: number;
  cropY: number;
  radius: number;
  backdropOpacity: number;
}

function getSafeInsets(): { top: number; bottom: number } {
  return { top: 56, bottom: 72 };
}

function computeFullRect(
  vw: number,
  vh: number,
  naturalRatio: number,
): { x: number; y: number; w: number; h: number } {
  const safe = getSafeInsets();
  const availW = Math.max(200, vw);
  const availH = Math.max(240, vh - safe.top - safe.bottom);
  const ratio = clamp(Number.isFinite(naturalRatio) && naturalRatio > 0 ? naturalRatio : 1, 0.25, 4);

  let w = availW;
  let h = w / ratio;
  if (h > availH) {
    h = availH;
    w = h * ratio;
  }
  const x = (vw - w) / 2;
  const y = safe.top + (availH - h) / 2;
  return { x, y, w, h };
}

function parseBorderRadius(el: HTMLElement | null, fallback: number): number {
  if (!el || typeof getComputedStyle !== 'function') return fallback;
  const raw = getComputedStyle(el).borderTopLeftRadius;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fallbackRect(vw: number, vh: number): DOMRect {
  const w = Math.min(220, vw * 0.6);
  const h = w * 1.2;
  return new DOMRect((vw - w) / 2, (vh - h) / 2, w, h);
}

export function SharedMediaLightbox({
  items,
  activeIndex,
  onIndexChange,
  onClose,
  getThumbnailElement,
  originRect,
  originBorderRadius = 16,
  renderFooter,
}: SharedMediaLightboxProps) {
  const [mountedIndex, setMountedIndex] = useState<number | null>(activeIndex);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [naturalRatios, setNaturalRatios] = useState<Record<number, number>>({});

  const backdropRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const chromeTopRef = useRef<HTMLDivElement | null>(null);
  const chromeBottomRef = useRef<HTMLDivElement | null>(null);

  const hiddenThumbRef = useRef<HTMLElement | null>(null);
  const savedOriginRef = useRef<DOMRect | null>(null);
  const savedRadiusRef = useRef<number>(originBorderRadius);
  const closingRef = useRef<boolean>(false);

  const openSpringRef = useRef<SpringValue | null>(null);
  const returnSpringRef = useRef<SpringValue | null>(null);
  const dragXSpringRef = useRef<SpringValue | null>(null);
  const dragYSpringRef = useRef<SpringValue | null>(null);
  const velocityRef = useRef<VelocityTracker>(new VelocityTracker());

  const poseRef = useRef<Pose>({
    cx: 0,
    cy: 0,
    scale: 1,
    cropX: 0,
    cropY: 0,
    radius: 0,
    backdropOpacity: 0,
  });

  const gestureRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    axis: 'none' | 'x' | 'y';
  }>({ active: false, pointerId: -1, startX: 0, startY: 0, axis: 'none' });

  const indexRef = useRef<number>(mountedIndex ?? 0);
  indexRef.current = mountedIndex ?? 0;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const ratiosRef = useRef(naturalRatios);
  ratiosRef.current = naturalRatios;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalTarget(document.body);
    }
  }, []);

  const restoreHiddenThumbnail = () => {
    if (hiddenThumbRef.current) {
      hiddenThumbRef.current.style.visibility = '';
      hiddenThumbRef.current = null;
    }
  };

  const hideThumbnailAt = (idx: number) => {
    const nextEl = getThumbnailElement?.(idx) ?? null;
    if (hiddenThumbRef.current && hiddenThumbRef.current !== nextEl) {
      hiddenThumbRef.current.style.visibility = '';
      hiddenThumbRef.current = null;
    }
    if (nextEl) {
      savedOriginRef.current = nextEl.getBoundingClientRect();
      savedRadiusRef.current = parseBorderRadius(nextEl, originBorderRadius);
      nextEl.style.visibility = 'hidden';
      hiddenThumbRef.current = nextEl;
    } else if (originRect) {
      savedOriginRef.current = originRect;
      savedRadiusRef.current = originBorderRadius;
    }
  };

  const getActiveFullRect = (idx: number) => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
    const item = itemsRef.current[idx];
    const thumb = savedOriginRef.current;
    const fallbackRatio = thumb && thumb.height > 0 ? thumb.width / thumb.height : 0.75;
    const ratio = ratiosRef.current[idx] ?? item?.aspectRatio ?? fallbackRatio;
    return { vw, vh, full: computeFullRect(vw, vh, ratio) };
  };

  const applyPoseToDom = (pose: Pose, full: { x: number; y: number; w: number; h: number }) => {
    poseRef.current = pose;
    const stage = stageRef.current;
    const backdrop = backdropRef.current;
    if (stage) {
      const fullCx = full.x + full.w / 2;
      const fullCy = full.y + full.h / 2;
      const tx = pose.cx - fullCx;
      const ty = pose.cy - fullCy;
      stage.style.width = `${full.w}px`;
      stage.style.height = `${full.h}px`;
      stage.style.left = `${full.x}px`;
      stage.style.top = `${full.y}px`;
      stage.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${pose.scale})`;
      const safeRadius = pose.radius / Math.max(0.05, pose.scale);
      stage.style.clipPath = `inset(${pose.cropY}px ${pose.cropX}px ${pose.cropY}px ${pose.cropX}px round ${safeRadius}px)`;
    }
    if (backdrop) {
      backdrop.style.opacity = String(clamp(pose.backdropOpacity, 0, 1));
    }
  };

  const setChromeOpacity = (opacity: number) => {
    const val = String(clamp(opacity, 0, 1));
    if (chromeTopRef.current) chromeTopRef.current.style.opacity = val;
    if (chromeBottomRef.current) chromeBottomRef.current.style.opacity = val;
  };

  const runOpenSpring = (idx: number, fromCurrent = false) => {
    const { vw, vh, full } = getActiveFullRect(idx);
    const thumb = savedOriginRef.current ?? fallbackRect(vw, vh);
    const crop = computeCoverCropBox(thumb.width, thumb.height, full.w, full.h);
    const thumbRadius = savedRadiusRef.current;

    const startPose: Pose = fromCurrent
      ? { ...poseRef.current }
      : {
          cx: thumb.left + thumb.width / 2,
          cy: thumb.top + thumb.height / 2,
          scale: crop.scale0,
          cropX: crop.cropX,
          cropY: crop.cropY,
          radius: thumbRadius,
          backdropOpacity: 0,
        };

    const endCx = full.x + full.w / 2;
    const endCy = full.y + full.h / 2;

    openSpringRef.current?.stop();
    returnSpringRef.current?.stop();

    const spring = new SpringValue(0);
    openSpringRef.current = spring;
    spring.subscribe((p) => {
      applyPoseToDom(
        {
          cx: lerp(startPose.cx, endCx, p),
          cy: lerp(startPose.cy, endCy, p),
          scale: lerp(startPose.scale, 1, p),
          cropX: lerp(startPose.cropX, 0, p),
          cropY: lerp(startPose.cropY, 0, p),
          radius: lerp(startPose.radius, 0, p),
          backdropOpacity: lerp(startPose.backdropOpacity, 1, p),
        },
        full,
      );
      setChromeOpacity(clamp((p - 0.55) / 0.45, 0, 1));
    });

    spring.animateTo(1, MATRIX_SPRINGS.lightboxOpen, 0);
  };

  const triggerDismiss = (releaseVy = 0) => {
    if (closingRef.current) return;
    closingRef.current = true;
    openSpringRef.current?.stop();
    dragXSpringRef.current?.stop();
    dragYSpringRef.current?.stop();
    setChromeOpacity(0);

    const idx = indexRef.current;
    const { vw, vh, full } = getActiveFullRect(idx);
    const liveThumbEl = getThumbnailElement?.(idx) ?? null;
    if (liveThumbEl) {
      savedOriginRef.current = liveThumbEl.getBoundingClientRect();
      savedRadiusRef.current = parseBorderRadius(liveThumbEl, originBorderRadius);
    }
    const targetRect = savedOriginRef.current ?? fallbackRect(vw, vh);
    const targetCrop = computeCoverCropBox(targetRect.width, targetRect.height, full.w, full.h);
    const targetCx = targetRect.left + targetRect.width / 2;
    const targetCy = targetRect.top + targetRect.height / 2;
    const targetRadius = savedRadiusRef.current;

    const startPose = { ...poseRef.current };
    const startSpeed = clamp(Math.abs(releaseVy) / Math.max(200, vh), 0, 3.5);

    const spring = new SpringValue(0);
    returnSpringRef.current = spring;
    spring.subscribe((u) => {
      applyPoseToDom(
        {
          cx: lerp(startPose.cx, targetCx, u),
          cy: lerp(startPose.cy, targetCy, u),
          scale: lerp(startPose.scale, targetCrop.scale0, u),
          cropX: lerp(startPose.cropX, targetCrop.cropX, u),
          cropY: lerp(startPose.cropY, targetCrop.cropY, u),
          radius: lerp(startPose.radius, targetRadius, u),
          backdropOpacity: lerp(startPose.backdropOpacity, 0, clamp(u * 1.15, 0, 1)),
        },
        full,
      );
    });

    spring.animateTo(1, MATRIX_SPRINGS.lightboxReturn, startSpeed, () => {
      restoreHiddenThumbnail();
      closingRef.current = false;
      setMountedIndex(null);
      onClose();
    });
  };

  useLayoutEffect(() => {
    if (activeIndex !== null && activeIndex >= 0 && activeIndex < items.length) {
      const isFreshOpen = mountedIndex === null;
      closingRef.current = false;
      setMountedIndex(activeIndex);
      hideThumbnailAt(activeIndex);
      if (trackRef.current) {
        trackRef.current.style.transform = 'translate3d(0px, 0px, 0)';
      }
      if (isFreshOpen) {
        requestAnimationFrame(() => runOpenSpring(activeIndex, false));
      } else {
        const { full } = getActiveFullRect(activeIndex);
        applyPoseToDom(
          {
            cx: full.x + full.w / 2,
            cy: full.y + full.h / 2,
            scale: 1,
            cropX: 0,
            cropY: 0,
            radius: 0,
            backdropOpacity: 1,
          },
          full,
        );
      }
    } else if (activeIndex === null && mountedIndex !== null && !closingRef.current) {
      triggerDismiss(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, items.length]);

  useEffect(() => {
    if (mountedIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerDismiss(0);
      } else if (e.key === 'ArrowRight' && mountedIndex < itemsRef.current.length - 1) {
        onIndexChange?.(mountedIndex + 1);
      } else if (e.key === 'ArrowLeft' && mountedIndex > 0) {
        onIndexChange?.(mountedIndex - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountedIndex]);

  useEffect(() => {
    return () => {
      openSpringRef.current?.destroy();
      returnSpringRef.current?.destroy();
      dragXSpringRef.current?.destroy();
      dragYSpringRef.current?.destroy();
      restoreHiddenThumbnail();
    };
  }, []);

  if (!portalTarget || mountedIndex === null || !items[mountedIndex]) {
    return null;
  }

  const currentItem = items[mountedIndex];

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (closingRef.current || e.button !== 0) return;
    openSpringRef.current?.stop();
    dragXSpringRef.current?.stop();
    dragYSpringRef.current?.stop();
    velocityRef.current.reset();
    velocityRef.current.addSample(e.clientX, e.clientY);

    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      axis: 'none',
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== e.pointerId || closingRef.current) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    velocityRef.current.addSample(e.clientX, e.clientY);

    if (g.axis === 'none') {
      if (Math.hypot(dx, dy) < 6) return;
      g.axis = Math.abs(dx) > Math.abs(dy) * 1.2 && items.length > 1 ? 'x' : 'y';
      setChromeOpacity(0);
    }

    const { vw, vh, full } = getActiveFullRect(indexRef.current);

    if (g.axis === 'x') {
      const atStart = indexRef.current === 0 && dx > 0;
      const atEnd = indexRef.current === items.length - 1 && dx < 0;
      const effDx = atStart || atEnd ? rubberband(dx, vw * 0.45, 0.5) : dx;
      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${effDx}px, 0px, 0)`;
      }
      return;
    }

    const effDy = dy >= 0 ? dy : rubberband(dy, vh * 0.35, 0.4);
    const dragProgress = clamp(Math.max(0, dy) / (vh * 0.42), 0, 1);
    const scale = 1 - dragProgress * 0.36;
    const radius = lerp(0, savedRadiusRef.current, dragProgress);
    const backdropOpacity = clamp(1 - dragProgress * 1.15, 0.04, 1);

    applyPoseToDom(
      {
        cx: full.x + full.w / 2 + dx * 0.88,
        cy: full.y + full.h / 2 + effDy,
        scale,
        cropX: 0,
        cropY: 0,
        radius,
        backdropOpacity,
      },
      full,
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== e.pointerId) return;
    g.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer already released.
    }

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const { vx, vy } = velocityRef.current.getVelocity();
    const { vw, full } = getActiveFullRect(indexRef.current);

    if (g.axis === 'x') {
      const shouldNext =
        indexRef.current < items.length - 1 && (dx < -vw * 0.22 || vx < -550);
      const shouldPrev = indexRef.current > 0 && (dx > vw * 0.22 || vx > 550);

      const spring = new SpringValue(dx);
      dragXSpringRef.current = spring;
      const targetX = shouldNext ? -vw : shouldPrev ? vw : 0;

      spring.subscribe((x) => {
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${x}px, 0px, 0)`;
        }
      });

      spring.animateTo(targetX, MATRIX_SPRINGS.snappy, vx, () => {
        if (trackRef.current) {
          trackRef.current.style.transform = 'translate3d(0px, 0px, 0)';
        }
        setChromeOpacity(1);
        if (shouldNext) {
          onIndexChange?.(indexRef.current + 1);
        } else if (shouldPrev) {
          onIndexChange?.(indexRef.current - 1);
        }
      });
      return;
    }

    if (g.axis === 'none') {
      setChromeOpacity(1);
      return;
    }

    const shouldDismiss = dy > 105 || (dy > 24 && vy > 600) || vy > 920;
    if (shouldDismiss) {
      triggerDismiss(vy);
      return;
    }

    const startPose = { ...poseRef.current };
    const endCx = full.x + full.w / 2;
    const endCy = full.y + full.h / 2;
    const snap = new SpringValue(0);
    dragYSpringRef.current = snap;
    snap.subscribe((p) => {
      applyPoseToDom(
        {
          cx: lerp(startPose.cx, endCx, p),
          cy: lerp(startPose.cy, endCy, p),
          scale: lerp(startPose.scale, 1, p),
          cropX: lerp(startPose.cropX, 0, p),
          cropY: lerp(startPose.cropY, 0, p),
          radius: lerp(startPose.radius, 0, p),
          backdropOpacity: lerp(startPose.backdropOpacity, 1, p),
        },
        full,
      );
      setChromeOpacity(clamp(p, 0, 1));
    });
    snap.animateTo(1, MATRIX_SPRINGS.lightboxOpen, 0);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-scheme="dark"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overscrollBehavior: 'none',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={backdropRef}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#000000',
          opacity: 0,
          willChange: 'opacity',
        }}
      />

      <div
        ref={chromeTopRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 3,
          paddingTop: 'max(env(safe-area-inset-top, 0px), 14px)',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          opacity: 0,
          willChange: 'opacity',
        }}
      >
        <div
          style={{
            padding: '6px 12px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(18, 18, 20, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            fontSize: '12px',
            fontWeight: 700,
            color: '#ffffff',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {mountedIndex + 1} / {items.length}
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => triggerDismiss(0)}
          aria-label="Close"
          style={{
            pointerEvents: 'auto',
            width: '36px',
            height: '36px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(28, 28, 30, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: '#ffffff',
            fontSize: '18px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <div
        ref={stageRef}
        style={{
          position: 'fixed',
          zIndex: 2,
          transformOrigin: 'center center',
          willChange: 'transform, clip-path',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          ref={trackRef}
          style={{
            width: '100%',
            height: '100%',
            willChange: 'transform',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={currentItem.src}
            alt={currentItem.alt ?? ''}
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                const ratio = img.naturalWidth / img.naturalHeight;
                const prevRatio = ratiosRef.current[mountedIndex];
                if (prevRatio === undefined || Math.abs(prevRatio - ratio) > 0.02) {
                  setNaturalRatios((prev) => ({ ...prev, [mountedIndex]: ratio }));
                  const { full } = getActiveFullRect(mountedIndex);
                  applyPoseToDom(poseRef.current, full);
                }
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>
      </div>

      {(renderFooter || currentItem.caption) && (
        <div
          ref={chromeBottomRef}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 3,
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
            paddingTop: '12px',
            paddingLeft: '16px',
            paddingRight: '16px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.88), transparent)',
            opacity: 0,
            willChange: 'opacity',
          }}
        >
          {renderFooter ? (
            renderFooter(currentItem, mountedIndex)
          ) : (
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.88)', textAlign: 'center' }}>
              {currentItem.caption}
            </div>
          )}
        </div>
      )}
    </div>,
    portalTarget,
  );
}
