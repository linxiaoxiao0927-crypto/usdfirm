"use client";

import { useCallback, useEffect, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';

export interface UseScrollToTopOptions {
  /** Optional explicit scroll container ref (falls back to auto-detecting window or primary scroll container). */
  containerRef?: RefObject<HTMLElement | null>;
  /** Install global delegated top-bar Tap-to-Top listener while mounted. Default false (set true in root Shell/Layout). */
  global?: boolean;
  /** Disable hook behavior dynamically. Default true. */
  enabled?: boolean;
  /** Optional callback fired right after a smooth scroll-to-top actually triggers (never fires when scrollTop === 0). */
  onScrolled?: () => void;
}

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'textarea',
  'select',
  'option',
  'label',
  'summary',
  'details',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="combobox"]',
  '[role="searchbox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  '[data-no-tap-to-top]',
  '[onclick]',
  'video',
  'audio',
  'canvas',
].join(',');

const HEADING_OR_LABEL_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'HEADER']);

function hasReactClickHandler(el: Element): boolean {
  try {
    const keys = Object.keys(el);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].startsWith('__reactProps$')) {
        const props = (el as unknown as Record<string, Record<string, unknown>>)[keys[i]];
        if (
          props &&
          (typeof props.onClick === 'function' ||
            typeof props.onPointerDown === 'function' ||
            typeof props.onMouseDown === 'function' ||
            typeof props.onTouchStart === 'function')
        ) {
          return true;
        }
      }
    }
  } catch {
    // Ignore cross-realm inspection errors
  }
  return false;
}

/**
 * Strict anti-misclick check: walks from e.target up to (but excluding) the header boundary.
 * Ensures back buttons, menu icons, tabs, links, search inputs, and React clickable divs never misfire Tap-to-Top.
 */
export function isTapToTopInteractiveTarget(
  target: EventTarget | null,
  boundary?: Element | null
): boolean {
  if (!target) return true;
  let node: Element | null =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
  if (!node) return true;
  if (node.closest('#sm-matrix-theme-host, [data-matrix-theme-switcher]')) return true;

  let boundaryCursor = '';
  if (boundary && typeof window !== 'undefined') {
    try {
      boundaryCursor = window.getComputedStyle(boundary).cursor || '';
    } catch {
      boundaryCursor = '';
    }
  }

  while (node && node !== document.body && node !== document.documentElement) {
    if (node.getAttribute('data-no-tap-to-top') !== null) return true;
    if (node === boundary) {
      // Only reject the boundary itself if it is literally an interactive element (e.g., <button>)
      return node.matches('button, a[href], input, textarea, select, [role="button"], [role="link"], [role="tab"]');
    }
    if (node.getAttribute('data-tap-to-top') === 'true' || node.getAttribute('data-tap-to-top') === '') {
      // Explicitly opted-in Tap-to-Top zone (e.g., header title wrapper)
      return false;
    }
    if (node.matches(INTERACTIVE_SELECTOR)) return true;
    if (hasReactClickHandler(node)) return true;
    if (typeof window !== 'undefined' && !HEADING_OR_LABEL_TAGS.has(node.tagName)) {
      try {
        const cursor = window.getComputedStyle(node).cursor;
        if (cursor === 'pointer' && boundaryCursor !== 'pointer') {
          return true;
        }
      } catch {
        // Ignore style lookup errors
      }
    }
    node = node.parentElement;
  }
  return false;
}

function getWindowScrollTop(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
  return (
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement?.scrollTop ||
    document.body?.scrollTop ||
    0
  );
}

function isVisibleScrollable(el: HTMLElement): boolean {
  if (!el || el.scrollTop <= 0) return false;
  if (el.scrollHeight <= el.clientHeight + 4) return false;
  if (el.getAttribute('data-scroll-aux') === 'true' || el.getAttribute('data-scroll-container') === 'aux') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width < 120 || rect.height < 120) return false;
  if (rect.right <= 0 || rect.left >= window.innerWidth || rect.bottom <= 0 || rect.top >= window.innerHeight) {
    return false;
  }
  const cs = window.getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
  return cs.overflowY === 'auto' || cs.overflowY === 'scroll' || cs.overflowY === 'overlay';
}

function pickLargestScrollable(root: ParentNode, minWidthRatio: number, minHeightRatio: number): HTMLElement | null {
  const minW = Math.min(260, window.innerWidth * minWidthRatio);
  const minH = Math.min(220, window.innerHeight * minHeightRatio);
  let best: HTMLElement | null = null;
  let bestScore = -1;

  const list = root.querySelectorAll('*');
  for (let i = 0; i < list.length; i++) {
    const el = list[i] as HTMLElement;
    if (el.scrollTop <= 0) continue;
    if (!isVisibleScrollable(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < minW || rect.height < minH) continue;
    const area = rect.width * rect.height;
    const isSubpage = el.closest('[data-ios-subpage="true"], [role="dialog"], [aria-modal="true"]') ? 1e9 : 0;
    const isPrimary = el.getAttribute('data-scroll-container') === 'primary' || el.tagName === 'MAIN' ? 1e7 : 0;
    const score = isSubpage + isPrimary + area;
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

/**
 * Auto-detects the active scrolled container (explicit ref, modal scroller, primary custom scroller, or window).
 * Returns null if the active container is already at scrollTop === 0.
 */
export function findPrimaryScrollTarget(
  preferred?: HTMLElement | Window | null,
  originEl?: Element | null
): HTMLElement | Window | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  if (preferred) {
    const top = preferred === window ? getWindowScrollTop() : (preferred as HTMLElement).scrollTop;
    return top > 0 ? preferred : null;
  }

  // 1. If triggered inside a modal / dialog / iOS subpage, restrict search to that active layer
  const modalRoot = originEl?.closest('[role="dialog"], [aria-modal="true"], [data-ios-subpage="true"]');
  if (modalRoot) {
    if (modalRoot instanceof HTMLElement && isVisibleScrollable(modalRoot)) return modalRoot;
    return pickLargestScrollable(modalRoot, 0.25, 0.2);
  }

  // 2. Explicit [data-scroll-container="primary"]
  const explicitPrimaries = document.querySelectorAll<HTMLElement>('[data-scroll-container="primary"]');
  for (let i = explicitPrimaries.length - 1; i >= 0; i--) {
    if (isVisibleScrollable(explicitPrimaries[i])) return explicitPrimaries[i];
  }

  // 3. Standard window / document scroll
  if (getWindowScrollTop() > 0) return window;

  // 4. Custom app-shell scroll containers (e.g. 100dvh overflow-hidden shells)
  return pickLargestScrollable(document.body, 0.42, 0.28);
}

/**
 * Smoothly scrolls the active primary container to top.
 * Strictly a no-op (returns false) when scrollTop === 0.
 */
export function scrollElementToTop(
  preferred?: HTMLElement | Window | null,
  originEl?: Element | null
): boolean {
  const target = findPrimaryScrollTarget(preferred, originEl);
  if (!target) return false;
  try {
    if (target === window) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      (target as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch {
    if (target === window) {
      window.scrollTo(0, 0);
    } else {
      (target as HTMLElement).scrollTop = 0;
    }
  }
  return true;
}

function findTapToTopHeader(target: EventTarget | null, clientY: number): Element | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  let node: Element | null =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;

  const maxHeaderBottom = Math.max(150, window.innerHeight * 0.28);
  while (node && node !== document.body && node !== document.documentElement) {
    if (node.getAttribute('data-tap-to-top') === 'false') return null;
    if (node.getAttribute('data-tap-to-top') !== null) return node;

    const rect = node.getBoundingClientRect();
    const isTopRegion = rect.top <= 24 && rect.height >= 26 && rect.height <= 128 && rect.bottom <= maxHeaderBottom;

    if (
      isTopRegion &&
      (node.tagName === 'HEADER' ||
        node.getAttribute('role') === 'banner' ||
        node.classList.contains('top-dock') ||
        node.classList.contains('top-header') ||
        node.classList.contains('topbar') ||
        (node.tagName === 'NAV' && rect.top <= 20))
    ) {
      return node;
    }

    if (isTopRegion && rect.width >= window.innerWidth * 0.5) {
      const pos = window.getComputedStyle(node).position;
      if (pos === 'fixed' || pos === 'sticky') {
        return node;
      }
    }
    node = node.parentElement;
  }

  // Fallback: top status-bar touch strip (iOS safe-area top)
  if (clientY >= 0 && clientY <= 24) {
    return document.body;
  }
  return null;
}

declare global {
  interface Window {
    __SM_TAP_TO_TOP_ACTIVE__?: boolean;
    ShineMightTapToTop?: {
      scrollToTop: (preferred?: HTMLElement | Window | null) => boolean;
    };
  }
}

/**
 * Installs a singleton global delegated Tap-to-Top listener across the entire document.
 * Safe to call repeatedly; coordinates with matrix-theme.js via window.__SM_TAP_TO_TOP_ACTIVE__.
 */
export function installGlobalTapToTop(options?: { onScrolled?: () => void }): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  window.ShineMightTapToTop = {
    scrollToTop: (preferred?: HTMLElement | Window | null) => scrollElementToTop(preferred),
  };

  if (window.__SM_TAP_TO_TOP_ACTIVE__) {
    return () => {};
  }
  window.__SM_TAP_TO_TOP_ACTIVE__ = true;

  let downX = 0;
  let downY = 0;
  let moved = false;

  const onPointerDown = (e: PointerEvent) => {
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!moved && (Math.abs(e.clientX - downX) > 10 || Math.abs(e.clientY - downY) > 10)) {
      moved = true;
    }
  };

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || moved) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const sel = window.getSelection?.()?.toString();
    if (sel && sel.trim().length > 0) return;

    const header = findTapToTopHeader(e.target, e.clientY);
    if (!header) return;
    if (isTapToTopInteractiveTarget(e.target, header)) return;

    const scrolled = scrollElementToTop(null, header);
    if (scrolled) {
      e.stopPropagation();
      options?.onScrolled?.();
    }
  };

  document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
  document.addEventListener('pointermove', onPointerMove, { passive: true, capture: true });
  document.addEventListener('click', onClick, false);

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('click', onClick, false);
    window.__SM_TAP_TO_TOP_ACTIVE__ = false;
  };
}

/**
 * Universal React Hook for iOS-style Tap-to-Top.
 * - Pass `{ global: true }` inside a root Shell/Layout to cover all headers automatically.
 * - Or spread `{...headerProps}` onto any custom Header component with an optional `containerRef`.
 */
export function useScrollToTop(options: UseScrollToTopOptions = {}) {
  const { containerRef, global = false, enabled = true, onScrolled } = options;

  useEffect(() => {
    if (!enabled || !global) return;
    return installGlobalTapToTop({ onScrolled });
  }, [enabled, global, onScrolled]);

  const scrollToTop = useCallback(() => {
    if (!enabled) return false;
    const scrolled = scrollElementToTop(containerRef?.current ?? null);
    if (scrolled) onScrolled?.();
    return scrolled;
  }, [containerRef, enabled, onScrolled]);

  const onHeaderClick = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (!enabled || e.defaultPrevented) return;
      if (isTapToTopInteractiveTarget(e.target, e.currentTarget)) return;
      const scrolled = scrollElementToTop(containerRef?.current ?? null, e.currentTarget);
      if (scrolled) {
        e.stopPropagation();
        onScrolled?.();
      }
    },
    [containerRef, enabled, onScrolled]
  );

  return {
    scrollToTop,
    onHeaderClick,
    headerProps: {
      'data-tap-to-top': 'true',
      onClick: onHeaderClick,
    },
  };
}
