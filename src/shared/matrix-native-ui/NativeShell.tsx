"use client";

import React, { useEffect } from 'react';
import { useScrollToTop } from './useScrollToTop';

export interface NativeShellProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Inner max-width container (e.g. 480 for mobile-first shell, or 'full'). */
  maxWidth?: number | string | 'full';
  /** Apply env(safe-area-inset-top) on outer wrapper. Default false (let sticky header manage top). */
  safeAreaTop?: boolean;
  /** Apply env(safe-area-inset-bottom) on outer wrapper. Default false. */
  safeAreaBottom?: boolean;
  /** Lock html/body overscroll-behavior: none & pure black root. Default true. */
  lockOverscroll?: boolean;
  /** Use CSS variables (--bg-primary / --text-primary) instead of forcing #000000 on html/body. */
  useThemeVars?: boolean;
  /** Lock shell container to 100dvh fixed viewport height for native app stages. */
  fullHeightStage?: boolean;
}

const STYLE_ELEMENT_ID = 'matrix-native-shell-css';

const GLOBAL_SHELL_CSS = `
:root {
  color-scheme: dark;
  --matrix-bg: #000000;
  --matrix-card-1: #121214;
  --matrix-card-2: #1C1C1E;
  --matrix-border: rgba(255, 255, 255, 0.10);
  --matrix-safe-top: env(safe-area-inset-top, 0px);
  --matrix-safe-bottom: env(safe-area-inset-bottom, 0px);
}
html[data-matrix-overscroll-lock="1"],
html[data-matrix-overscroll-lock="1"] body {
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}
html[data-matrix-overscroll-lock="1"][data-matrix-force-black="1"],
html[data-matrix-overscroll-lock="1"][data-matrix-force-black="1"] body {
  background-color: #000000;
}
[data-matrix-native-shell] {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
[data-matrix-native-shell][data-matrix-theme-vars="0"] {
  background-color: var(--matrix-bg);
  color: #ffffff;
}
[data-matrix-native-shell] input,
[data-matrix-native-shell] textarea,
[data-matrix-native-shell] [contenteditable="true"],
[data-matrix-native-shell] [data-selectable="true"] {
  -webkit-touch-callout: default;
  -webkit-user-select: text;
  user-select: text;
}
[data-matrix-no-scrollbar]::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
[data-matrix-no-scrollbar] {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

export function NativeShell({
  children,
  className,
  style,
  maxWidth = 'full',
  safeAreaTop = false,
  safeAreaBottom = false,
  lockOverscroll = true,
  useThemeVars = false,
  fullHeightStage = false,
}: NativeShellProps) {
  useScrollToTop({ global: true });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById(STYLE_ELEMENT_ID);
    if (!existing) {
      const el = document.createElement('style');
      el.id = STYLE_ELEMENT_ID;
      el.textContent = GLOBAL_SHELL_CSS;
      document.head.appendChild(el);
    } else if (existing.textContent !== GLOBAL_SHELL_CSS) {
      existing.textContent = GLOBAL_SHELL_CSS;
    }
    const root = document.documentElement;
    if (lockOverscroll) {
      root.setAttribute('data-matrix-overscroll-lock', '1');
    } else {
      root.removeAttribute('data-matrix-overscroll-lock');
    }
    if (useThemeVars) {
      root.removeAttribute('data-matrix-force-black');
    } else {
      root.setAttribute('data-matrix-force-black', '1');
    }
    return () => {
      if (lockOverscroll) {
        root.removeAttribute('data-matrix-overscroll-lock');
      }
      root.removeAttribute('data-matrix-force-black');
    };
  }, [lockOverscroll, useThemeVars]);

  const resolvedMaxWidth =
    maxWidth === 'full' ? undefined : typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

  return (
    <div
      data-matrix-native-shell="1"
      data-matrix-theme-vars={useThemeVars ? '1' : '0'}
      className={className}
      style={{
        minHeight: fullHeightStage ? undefined : '100dvh',
        height: fullHeightStage ? '100dvh' : undefined,
        overflow: fullHeightStage ? 'hidden' : undefined,
        width: '100%',
        backgroundColor: useThemeVars ? 'var(--bg-primary, #000000)' : '#000000',
        color: useThemeVars ? 'var(--text-primary, #ffffff)' : '#ffffff',
        overflowX: 'clip',
        paddingTop: safeAreaTop ? 'env(safe-area-inset-top, 0px)' : undefined,
        paddingBottom: safeAreaBottom ? 'env(safe-area-inset-bottom, 0px)' : undefined,
        ...style,
      }}
    >
      {resolvedMaxWidth ? (
        <div
          style={{
            maxWidth: resolvedMaxWidth,
            width: '100%',
            margin: '0 auto',
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
