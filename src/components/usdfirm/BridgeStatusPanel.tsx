'use client';

import React, { useState, useEffect } from 'react';
import { Network, ArrowLeftRight, Shield, CheckCircle2, AlertOctagon, Gauge } from 'lucide-react';
import type { UsdfBufferItem } from '@/lib/usdfirm/types';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';

interface BridgeStatusPanelProps {
  initialBuffer: { allocated: number; maxCap: number; isSegregated: boolean };
  buffers?: UsdfBufferItem[];
  onRefresh: () => void;
}

export function BridgeStatusPanel({
  initialBuffer,
  buffers = [],
  onRefresh,
}: BridgeStatusPanelProps) {
  const { copy, resolveError } = useUsdfirmLocale();
  const t = copy.bridge;

  const [buffer, setBuffer] = useState(initialBuffer);
  const [xpayesResult, setXpayesResult] = useState<string>('');
  const [mmResult, setMmResult] = useState<string>('');
  const [bridgeError, setBridgeError] = useState<{ code: string; text: string } | null>(null);
  const [busy, setBusy] = useState<string>('');

  useEffect(() => {
    setBuffer(initialBuffer);
  }, [initialBuffer]);

  const runXPayesSettlement = async (tamperSignature: boolean) => {
    setBusy('XPAYES');
    setBridgeError(null);
    setXpayesResult('');
    try {
      const sampleRes = await fetch('/api/v1/usdfirm/bridge/xpayes', { cache: 'no-store' });
      const sampleJson = await sampleRes.json();
      if (!sampleRes.ok || !sampleJson.success) {
        const code = extractErrorCode(sampleJson) || 'ERR_WORKER_UNREACHABLE';
        setBridgeError({ code, text: resolveError(code, sampleJson.error?.message) });
        return;
      }
      const { samplePayload, sampleSignature } = sampleJson.data;

      const sigToSend = tamperSignature
        ? 'sha256=0000deadbeefinvalidhmac0000000000000000000000000000000000000000'
        : sampleSignature;

      const res = await fetch('/api/v1/usdfirm/bridge/xpayes', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: samplePayload,
          signature: sigToSend,
          tamperTest: tamperSignature,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_INVALID_HMAC_SIGNATURE';
        setBridgeError({ code, text: resolveError(code, json.error?.message) });
        return;
      }
      setXpayesResult(
        `${t.xpayesSettledPrefix}: ${samplePayload.paymentRef} ($${samplePayload.usdfPayoutAmount.toLocaleString()} USDF) · ${t.txPrefix}: ${String(json.data.txHash || '').slice(0, 22)}...`
      );
      onRefresh();
    } catch {
      setBridgeError({
        code: 'ERR_WORKER_UNREACHABLE',
        text: resolveError('ERR_WORKER_UNREACHABLE'),
      });
    } finally {
      setBusy('');
    }
  };

  const runSegregatedMmLiquidity = async (
    orderType: 'MINT_LIQUIDITY' | 'BURN_REDEEM',
    amountUsdf: number
  ) => {
    setBusy('SEGREGATED_MM');
    setBridgeError(null);
    setMmResult('');
    try {
      const customNonce = Math.floor(Math.random() * 900_000) + 100_000;
      const sampleRes = await fetch(
        `/api/v1/usdfirm/bridge/segregated-mm?orderType=${orderType}&amountUsdf=${amountUsdf}&exchangeNonce=${customNonce}`,
        { cache: 'no-store' }
      );
      const sampleJson = await sampleRes.json();
      if (!sampleRes.ok || !sampleJson.success) {
        const code = extractErrorCode(sampleJson) || 'ERR_WORKER_UNREACHABLE';
        setBridgeError({ code, text: resolveError(code, sampleJson.error?.message) });
        return;
      }
      const basePayload = sampleJson.data.samplePayload;

      const customPayload = {
        ...basePayload,
        orderType,
        amountUsdf,
        exchangeNonce: customNonce,
      };

      const res = await fetch('/api/v1/usdfirm/bridge/segregated-mm', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: customPayload,
          signature: sampleJson.data.sampleSignature,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_INVALID_HMAC_SIGNATURE';
        setBridgeError({ code, text: resolveError(code, json.error?.message) });
        return;
      }
      const nextAllocated =
        typeof json.data.allocatedUsdf === 'number'
          ? json.data.allocatedUsdf
          : buffer.allocated;
      setBuffer((prev) => ({ ...prev, allocated: nextAllocated }));
      setMmResult(
        `${t.segregatedMmCommittedPrefix}: ${customPayload.orderType === 'MINT_LIQUIDITY' ? t.orderMintLiquidity : t.orderBurnRedeem} · ${t.remainingLabel}: $${Number(json.data.bufferRemaining ?? 0).toLocaleString()} USDF`
      );
      onRefresh();
    } catch {
      setBridgeError({
        code: 'ERR_WORKER_UNREACHABLE',
        text: resolveError('ERR_WORKER_UNREACHABLE'),
      });
    } finally {
      setBusy('');
    }
  };

  const maxCap = Math.max(1, buffer.maxCap || 20_000_000);
  const allocatedUsdf = Math.max(0, buffer.allocated);
  const bufferRemaining = Math.max(0, maxCap - allocatedUsdf);
  const utilizationPct = Math.min(
    100,
    Math.round((allocatedUsdf / maxCap) * 10000) / 100
  );
  const xpayesPool = buffers.find((b) => b.module_id === 'xpayes');

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 backdrop-blur-xl shadow-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-emerald-400" />
            {t.title}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-mono text-emerald-300">
          <Shield className="w-3.5 h-3.5" />
          {t.firewallBadge}
        </span>
      </div>

      {/* Live $20M Segregated Market-Maker Buffer Gauge */}
      <div className="rounded-2xl border border-amber-500/30 bg-[#090A0F]/95 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">{t.gaugeTitle}</h4>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{t.gaugeSubtitle}</p>
          </div>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-mono font-bold text-amber-300">
            {t.utilizationLabel}: {utilizationPct.toFixed(2)}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <span className="block text-[11px] font-sans text-zinc-400">{t.allocatedLabel}</span>
            <span className="text-lg font-bold text-amber-300">
              ${allocatedUsdf.toLocaleString()} USDF
            </span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <span className="block text-[11px] font-sans text-zinc-400">{t.remainingLabel}</span>
            <span className="text-lg font-bold text-emerald-400">
              ${bufferRemaining.toLocaleString()} USDF
            </span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <span className="block text-[11px] font-sans text-zinc-400">{t.capLabel}</span>
            <span className="text-lg font-bold text-white">${maxCap.toLocaleString()} USDF</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="h-3 w-full rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                utilizationPct >= 90
                  ? 'bg-rose-500'
                  : utilizationPct >= 75
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-emerald-500 to-amber-400'
              }`}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
          {xpayesPool && (
            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>
                {t.xpayesPoolLabel}{' '}
                <strong className="text-emerald-300">
                  ${Number(xpayesPool.allocated_usdf).toLocaleString()} / $
                  {Number(xpayesPool.max_cap_usdf).toLocaleString()} USDF
                </strong>
              </span>
              <span>
                {t.segregatedLabel}:{' '}
                <strong className={buffer.isSegregated ? 'text-emerald-300' : 'text-rose-400'}>
                  {buffer.isSegregated ? t.segregatedYes : t.segregatedNo}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{t.xpayesTitle}</span>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                {t.xpayesTag}
              </span>
            </div>
            <p className="text-zinc-400">{t.xpayesDesc}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={busy === 'XPAYES'}
              onClick={() => runXPayesSettlement(false)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {t.xpayesValidBtn}
            </button>
            <button
              type="button"
              disabled={busy === 'XPAYES'}
              onClick={() => runXPayesSettlement(true)}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-rose-300 hover:bg-rose-500/20 transition"
            >
              {t.xpayesBadBtn}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{t.segregatedMmTitle}</span>
              <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                ${(maxCap / 1_000_000).toFixed(0)}
                {t.capTagSuffix}
              </span>
            </div>
            <p className="text-zinc-400">{t.segregatedMmDesc}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy === 'SEGREGATED_MM'}
              onClick={() => runSegregatedMmLiquidity('MINT_LIQUIDITY', 500_000)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition"
            >
              {t.segregatedMmBridgeBtn}
            </button>
            <button
              type="button"
              disabled={busy === 'SEGREGATED_MM'}
              onClick={() => runSegregatedMmLiquidity('BURN_REDEEM', 250_000)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-300 hover:bg-white/10 transition"
            >
              {t.segregatedMmRedeemBtn}
            </button>
          </div>
        </div>
      </div>

      {xpayesResult && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{xpayesResult}</span>
        </div>
      )}

      {mmResult && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs font-mono text-amber-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{mmResult}</span>
        </div>
      )}

      {bridgeError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/40 bg-rose-950/60 p-3 text-xs text-rose-200 flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{bridgeError.text}</span>
          </span>
          <code className="shrink-0 rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
            {bridgeError.code}
          </code>
        </div>
      )}
    </div>
  );
}
