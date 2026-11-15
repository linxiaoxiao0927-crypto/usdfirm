'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sliders, Sparkles } from 'lucide-react';
import {
  MATRIX_PALETTE,
  createStarParticle,
  type StarParticle,
} from '@/components/canvas/hyperspace-config';
import { useUsdfirmLocale } from '@/lib/usdfirm/i18n';

export function HyperspaceCanvas({
  pulseBoost = 1,
}: {
  pulseBoost?: number;
}) {
  const { locale, copy } = useUsdfirmLocale();
  const t = copy.dashboard.canvas;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(6.5);
  const [trailScale, setTrailScale] = useState(1.6);
  const [density, setDensity] = useState(1200);
  const [activeKeys, setActiveKeys] = useState<string[]>([
    'emerald',
    'amber',
    'cyan',
    'purple',
  ]);

  const configRef = useRef({
    speedMultiplier,
    trailScale,
    density,
    activeKeys,
    pulseBoost,
  });

  useEffect(() => {
    configRef.current = {
      speedMultiplier,
      trailScale,
      density,
      activeKeys,
      pulseBoost,
    };
  }, [speedMultiplier, trailScale, density, activeKeys, pulseBoost]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetX = width / 2;
    let targetY = height / 2;
    const focalLength = 800;
    const stars: StarParticle[] = [];

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let animId = 0;
    let lastFrameTs = 0;

    const render = (now = 0) => {
      if (typeof document !== 'undefined' && document.hidden && !reducedMotion) {
        animId = 0;
        return;
      }

      const isMobile = width < 768;
      if (!reducedMotion && isMobile && now > 0 && lastFrameTs > 0 && now - lastFrameTs < 32) {
        animId = requestAnimationFrame(render);
        return;
      }

      const dtMs =
        lastFrameTs > 0 && now > lastFrameTs
          ? Math.min(50, Math.max(4, now - lastFrameTs))
          : 16.67;
      lastFrameTs = now;
      const dtScale = reducedMotion ? 0 : dtMs / 16.67;

      ctx.fillStyle = '#090A0F';
      ctx.fillRect(0, 0, width, height);
      mouseX += (targetX - mouseX) * Math.min(1, 0.05 * dtScale);
      mouseY += (targetY - mouseY) * Math.min(1, 0.05 * dtScale);

      const cfg = configRef.current;
      const targetDensity = isMobile ? Math.min(cfg.density, 360) : cfg.density;
      while (stars.length < targetDensity) {
        stars.push(createStarParticle(true, width, cfg.activeKeys));
      }
      while (stars.length > targetDensity) stars.pop();

      const speed = 10 * cfg.speedMultiplier * cfg.pulseBoost * dtScale;
      const cx = width / 2 + (mouseX - width / 2) * 0.05;
      const cy = height / 2 + (mouseY - height / 2) * 0.05;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.z -= speed;
        if (s.z <= 2) {
          Object.assign(s, createStarParticle(false, width, cfg.activeKeys));
          continue;
        }
        const trailLen = Math.max(0.2, speed * cfg.trailScale);
        const scaleHead = focalLength / s.z;
        const scaleTail = focalLength / (s.z + trailLen);
        const xHead = cx + s.x * scaleHead;
        const yHead = cy + s.y * scaleHead;
        const xTail = cx + s.x * scaleTail;
        const yTail = cy + s.y * scaleTail;

        if (xHead < -40 || xHead > width + 40 || yHead < -40 || yHead > height + 40) {
          continue;
        }
        let alpha = Math.max(0.12, 1 - s.z / 5500);
        if (!s.isHighlight) alpha *= 0.4;
        ctx.strokeStyle = `rgba(${s.r}, ${s.g}, ${s.b}, ${alpha})`;
        ctx.lineWidth = s.isHighlight
          ? Math.min(3.5, scaleHead * 2.2)
          : Math.min(1.8, scaleHead * 1.2);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(xTail, yTail);
        ctx.lineTo(xHead, yHead);
        ctx.stroke();
      }
      if (!reducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    const onVisibilityChange = () => {
      if (reducedMotion || typeof document === 'undefined') return;
      if (document.hidden) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = 0;
        }
      } else if (!animId) {
        lastFrameTs = 0;
        animId = requestAnimationFrame(render);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    if (reducedMotion) {
      render(0);
    } else {
      animId = requestAnimationFrame(render);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  const toggleColor = (key: string) => {
    setActiveKeys((prev) =>
      prev.includes(key) && prev.length > 1
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-75" />
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        {panelOpen && (
          <div className="w-72 rounded-2xl bg-[#18191C]/95 p-5 backdrop-blur-xl text-xs text-white/75 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00DC6D]" />
                {t.title}
              </span>
              <span className="text-[10px] text-[#00DC6D] font-mono">{t.fpsBadge}</span>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>{t.speedLabel}</span>
                <span className="text-[#00DC6D] font-mono">{speedMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="18"
                step="0.5"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
                className="w-full accent-[#00DC6D]"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>{t.trailLabel}</span>
                <span className="text-[#FCD34D] font-mono">{trailScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={trailScale}
                onChange={(e) => setTrailScale(Number(e.target.value))}
                className="w-full accent-[#D4A853]"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>{t.densityLabel}</span>
                <span className="text-[#67E8F9] font-mono">{density}</span>
              </div>
              <input
                type="range"
                min="400"
                max="2400"
                step="100"
                value={density}
                onChange={(e) => setDensity(Number(e.target.value))}
                className="w-full accent-[#2DD4BF]"
              />
            </div>
            <div className="pt-1 grid grid-cols-2 gap-1.5">
              {MATRIX_PALETTE.map((c) => {
                const active = activeKeys.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleColor(c.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-left transition ${
                      active
                        ? 'bg-[#26272B] text-white font-medium'
                        : 'bg-[#24262C] text-white/45 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                    <span className="truncate text-[11px]">{locale === 'zh' ? c.label : c.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-label={t.toggleAria}
          className="flex items-center gap-2 rounded-full bg-[#1C1D21] hover:bg-[#24262C] px-4 py-2.5 text-xs text-white/85 backdrop-blur-md transition"
        >
          <Sliders className="w-3.5 h-3.5 text-[#00DC6D]" />
          <span>{t.toggleLabel}</span>
        </button>
      </div>
    </>
  );
}
