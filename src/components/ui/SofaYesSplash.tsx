'use client';

import React, { useEffect, useState } from 'react';

const SOFAYES_LOGOS = [
  '/logos/sofayes-1.png',
  '/logos/sofayes-2.png',
  '/logos/sofayes-3.png',
  '/logos/sofayes-4.png',
  '/logos/sofayes-5.png',
  '/logos/sofayes-6.png',
  '/logos/sofayes-7.png',
];

const SESSION_KEY = 'sm_sofayes_splash_done';

export function SofaYesSplash({ appLabel = 'USDFirm' }: { appLabel?: string }) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.userAgent.includes('ShineMightIOS')
      ) {
        return;
      }
      if (
        typeof window !== 'undefined' &&
        window.sessionStorage.getItem(SESSION_KEY) === '1'
      ) {
        return;
      }
    } catch {
      return;
    }

    const picked =
      SOFAYES_LOGOS[Math.floor(Math.random() * SOFAYES_LOGOS.length)];
    setLogoSrc(picked);

    const fadeTimer = window.setTimeout(() => setFading(true), 580);
    const hideTimer = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(SESSION_KEY, '1');
      } catch {}
      setLogoSrc(null);
    }, 820);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!logoSrc) return null;

  const handleSkip = () => {
    setFading(true);
    window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(SESSION_KEY, '1');
      } catch {}
      setLogoSrc(null);
    }, 180);
  };

  return (
    <div
      onClick={handleSkip}
      role="presentation"
      className={`fixed inset-0 z-[300] bg-[#090A0F] flex flex-col items-center justify-between py-14 px-6 select-none cursor-pointer transition-opacity duration-200 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="h-6" />

      <div className="flex flex-col items-center gap-4">
        <img
          src={logoSrc}
          alt="SofaYes"
          className="w-44 h-28 object-contain"
          decoding="async"
        />
        <span className="text-[11px] font-mono tracking-[0.26em] uppercase text-[#00DC6D]/80">
          {appLabel}
        </span>
      </div>

      <div className="text-[11px] font-semibold tracking-[0.34em] uppercase text-white/40">
        SHINEMIGHT
      </div>
    </div>
  );
}
