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
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove);

    let animId = 0;
    const render = () => {
      ctx.fillStyle = '#090A0F';
      ctx.fillRect(0, 0, width, height);
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      const cfg = configRef.current;
      while (stars.length < cfg.density) {
        stars.push(createStarParticle(true, width, cfg.activeKeys));
      }
      while (stars.length > cfg.density) stars.pop();

      const speed = 10 * cfg.speedMultiplier * cfg.pulseBoost;
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
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
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
          <div className="w-72 rounded-2xl border border-white/10 bg-zinc-950/90 p-5 backdrop-blur-xl shadow-2xl text-xs text-zinc-300 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                {t.title}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">{t.fpsBadge}</span>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>{t.speedLabel}</span>
                <span className="text-emerald-400 font-mono">{speedMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="18"
                step="0.5"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>{t.trailLabel}</span>
                <span className="text-amber-400 font-mono">{trailScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={trailScale}
                onChange={(e) => setTrailScale(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>{t.densityLabel}</span>
                <span className="text-cyan-400 font-mono">{density}</span>
              </div>
              <input
                type="range"
                min="400"
                max="2400"
                step="100"
                value={density}
                onChange={(e) => setDensity(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
            <div className="pt-1 border-t border-white/10 grid grid-cols-2 gap-1.5">
              {MATRIX_PALETTE.map((c) => {
                const active = activeKeys.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleColor(c.key)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition ${
                      active
                        ? 'border-white/25 bg-white/10 text-white'
                        : 'border-white/5 bg-white/5 text-zinc-500'
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
          className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/80 px-4 py-2.5 text-xs text-zinc-200 backdrop-blur-md hover:border-emerald-500/50 hover:text-white transition shadow-lg"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.toggleLabel}</span>
        </button>
      </div>
    </>
  );
}
