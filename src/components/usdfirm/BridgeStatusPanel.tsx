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
    <div className="rounded-3xl bg-[#1C1D21] p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-lg font-bold text-[#F4F4F6] flex items-center gap-2">
            <Network className="w-5 h-5 text-[#00DC6D]" />
            {t.title}
          </h3>
          <p className="text-xs text-white/60 mt-0.5">{t.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D]/15 px-3.5 py-1 text-xs font-mono font-semibold text-[#00DC6D]">
          <Shield className="w-3.5 h-3.5" />
          {t.firewallBadge}
        </span>
      </div>

      {/* Live $20M Segregated Market-Maker Buffer Gauge */}
      <div className="sm-bento-amber rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#FCD34D]" />
              <h4 className="text-sm font-bold text-[#F4F4F6]">{t.gaugeTitle}</h4>
            </div>
            <p className="text-xs text-white/70 mt-0.5">{t.gaugeSubtitle}</p>
          </div>
          <span className="rounded-full bg-[#090A0F]/50 px-3.5 py-1 text-xs font-mono font-bold text-[#FCD34D]">
            {t.utilizationLabel}: {utilizationPct.toFixed(2)}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="rounded-xl bg-[#090A0F]/45 p-3.5">
            <span className="block text-[11px] font-sans text-white/60">{t.allocatedLabel}</span>
            <span className="text-lg font-bold text-[#FCD34D]">
              ${allocatedUsdf.toLocaleString()} USDF
            </span>
          </div>
          <div className="rounded-xl bg-[#090A0F]/45 p-3.5">
            <span className="block text-[11px] font-sans text-white/60">{t.remainingLabel}</span>
            <span className="text-lg font-bold text-[#00DC6D]">
              ${bufferRemaining.toLocaleString()} USDF
            </span>
          </div>
          <div className="rounded-xl bg-[#090A0F]/45 p-3.5">
            <span className="block text-[11px] font-sans text-white/60">{t.capLabel}</span>
            <span className="text-lg font-bold text-[#F4F4F6]">${maxCap.toLocaleString()} USDF</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="h-3 w-full rounded-full bg-[#090A0F]/60 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                utilizationPct >= 90
                  ? 'bg-[#F87171]'
                  : utilizationPct >= 75
                    ? 'bg-[#FCD34D]'
                    : 'bg-gradient-to-r from-[#00DC6D] to-[#FCD34D]'
              }`}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
          {xpayesPool && (
            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-white/70">
              <span>
                {t.xpayesPoolLabel}{' '}
                <strong className="text-[#6EE7B7]">
                  ${Number(xpayesPool.allocated_usdf).toLocaleString()} / $
                  {Number(xpayesPool.max_cap_usdf).toLocaleString()} USDF
                </strong>
              </span>
              <span>
                {t.segregatedLabel}:{' '}
                <strong className={buffer.isSegregated ? 'text-[#00DC6D]' : 'text-[#FDA4AF]'}>
                  {buffer.isSegregated ? t.segregatedYes : t.segregatedNo}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="rounded-2xl bg-[#24262C] p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F4F4F6] text-sm">{t.xpayesTitle}</span>
              <span className="rounded-full bg-[#00DC6D]/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#00DC6D]">
                {t.xpayesTag}
              </span>
            </div>
            <p className="text-white/60 leading-relaxed">{t.xpayesDesc}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={busy === 'XPAYES'}
              onClick={() => runXPayesSettlement(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D] px-3.5 py-2 font-bold text-[#090A0F] hover:bg-[#19E67C] disabled:opacity-50 transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {t.xpayesValidBtn}
            </button>
            <button
              type="button"
              disabled={busy === 'XPAYES'}
              onClick={() => runXPayesSettlement(true)}
              className="rounded-full bg-[#F87171]/15 px-3.5 py-2 font-semibold text-[#FDA4AF] hover:bg-[#F87171]/25 transition"
            >
              {t.xpayesBadBtn}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-[#24262C] p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F4F4F6] text-sm">{t.segregatedMmTitle}</span>
              <span className="rounded-full bg-[#D4A853]/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#FCD34D]">
                ${(maxCap / 1_000_000).toFixed(0)}
                {t.capTagSuffix}
              </span>
            </div>
            <p className="text-white/60 leading-relaxed">{t.segregatedMmDesc}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy === 'SEGREGATED_MM'}
              onClick={() => runSegregatedMmLiquidity('MINT_LIQUIDITY', 500_000)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#D4A853] px-3.5 py-2 font-bold text-[#090A0F] hover:bg-[#FCD34D] disabled:opacity-50 transition"
            >
              {t.segregatedMmBridgeBtn}
            </button>
            <button
              type="button"
              disabled={busy === 'SEGREGATED_MM'}
              onClick={() => runSegregatedMmLiquidity('BURN_REDEEM', 250_000)}
              className="rounded-full bg-white/[0.08] px-3.5 py-2 font-semibold text-white/80 hover:bg-white/[0.14] transition"
            >
              {t.segregatedMmRedeemBtn}
            </button>
          </div>
        </div>
      </div>

      {xpayesResult && (
        <div className="sm-bento-emerald rounded-2xl p-3.5 text-xs font-mono text-[#6EE7B7] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00DC6D]" />
          <span>{xpayesResult}</span>
        </div>
      )}

      {mmResult && (
        <div className="sm-bento-amber rounded-2xl p-3.5 text-xs font-mono text-[#FCD34D] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{mmResult}</span>
        </div>
      )}

      {bridgeError && (
        <div
          role="alert"
          className="sm-bento-rose rounded-2xl p-3.5 text-xs text-[#FDA4AF] flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>{bridgeError.text}</span>
          </span>
          <code className="shrink-0 rounded-full bg-[#090A0F]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
            {bridgeError.code}
          </code>
        </div>
      )}
    </div>
  );
}
