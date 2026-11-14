'use client';

import React, { useState } from 'react';
import { Network, ArrowLeftRight, Shield, CheckCircle2, AlertOctagon } from 'lucide-react';

interface BridgeStatusPanelProps {
  initialBuffer: { allocated: number; maxCap: number; isSegregated: boolean };
  onRefresh: () => void;
}

export function BridgeStatusPanel({ initialBuffer, onRefresh }: BridgeStatusPanelProps) {
  const [buffer, setBuffer] = useState(initialBuffer);
  const [xpayesResult, setXpayesResult] = useState<string>('');
  const [itisdealResult, setItisdealResult] = useState<string>('');
  const [bridgeError, setBridgeError] = useState<string>('');
  const [busy, setBusy] = useState<string>('');

  const runXPayesSettlement = async (tamperSignature: boolean) => {
    setBusy('XPAYES');
    setBridgeError('');
    setXpayesResult('');
    try {
      const sampleRes = await fetch('/api/v1/usdfirm/bridge/xpayes');
      const sampleJson = await sampleRes.json();
      const { samplePayload, sampleSignature } = sampleJson.data;

      const sigToSend = tamperSignature ? 'sha256=0000deadbeefinvalidhmac0000' : sampleSignature;
      const res = await fetch('/api/v1/usdfirm/bridge/xpayes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: samplePayload, signature: sigToSend }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'XPayes settlement rejected');
      }
      setXpayesResult(
        `SETTLED Ref ${samplePayload.paymentRef} ($${samplePayload.usdfPayoutAmount.toLocaleString()} USDF) | Tx: ${json.data.txHash.slice(0, 22)}...`
      );
      onRefresh();
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : 'XPayes bridge error');
    } finally {
      setBusy('');
    }
  };

  const runItisDealLiquidity = async (orderType: 'MINT_LIQUIDITY' | 'BURN_REDEEM', amountUsdf: number) => {
    setBusy('ITISDEAL');
    setBridgeError('');
    setItisdealResult('');
    try {
      const sampleRes = await fetch('/api/v1/usdfirm/bridge/itisdeal');
      const sampleJson = await sampleRes.json();
      const basePayload = sampleJson.data.samplePayload;

      const customPayload = {
        ...basePayload,
        orderType,
        amountUsdf,
        exchangeNonce: Math.floor(Math.random() * 900_000) + 100_000,
      };

      const res = await fetch('/api/v1/usdfirm/bridge/itisdeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: sampleJson.data.samplePayload,
          signature: sampleJson.data.sampleSignature,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'ItisDeal bridge rejected');
      }
      setBuffer((prev) => ({ ...prev, allocated: json.data.bufferRemaining }));
      setItisdealResult(
        `COMMITTED ${customPayload.orderType} | Remaining Segregated Buffer: $${json.data.bufferRemaining.toLocaleString()} USDF`
      );
      onRefresh();
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : 'ItisDeal bridge error');
    } finally {
      setBusy('');
    }
  };

  const utilizationPct = Math.min(100, Math.round((buffer.allocated / buffer.maxCap) * 100));

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 backdrop-blur-xl shadow-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-emerald-400" />
            Ecosystem Liquidity Bridges (xpayes.com &amp; itisdeal.com)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            HMAC-SHA256 authenticated settlement webhooks &amp; strictly ring-fenced exchange liquidity buffer
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-mono text-emerald-300">
          <Shield className="w-3.5 h-3.5" />
          Compliance Firewall: Segregated
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">xpayes.com Payment Gateway Bridge</span>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                vIBAN On-Ramp
              </span>
            </div>
            <p className="text-zinc-400">
              Instant T+0 fiat-to-USDF settlement with idempotency protection by paymentRef and HMAC-SHA256 verification.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={busy === 'XPAYES'}
              onClick={() => runXPayesSettlement(false)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Execute Valid HMAC Webhook
            </button>
            <button
              type="button"
              disabled={busy === 'XPAYES'}
              onClick={() => runXPayesSettlement(true)}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-rose-300 hover:bg-rose-500/20 transition"
            >
              Test Invalid HMAC
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">itisdeal.com Exchange Liquidity Bridge</span>
              <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                Cap: ${(buffer.maxCap / 1_000_000).toFixed(0)}M USDF
              </span>
            </div>
            <p className="text-zinc-400">
              Allocated Buffer: <strong className="font-mono text-white">${buffer.allocated.toLocaleString()} USDF</strong> ({utilizationPct}% of hard cap). Prevents exchange trading risk spillover.
            </p>
            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${utilizationPct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy === 'ITISDEAL'}
              onClick={() => runItisDealLiquidity('MINT_LIQUIDITY', 500_000)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition"
            >
              Bridge +$500K Liquidity
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

      {itisdealResult && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs font-mono text-amber-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{itisdealResult}</span>
        </div>
      )}

      {bridgeError && (
        <div role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-950/60 p-3 text-xs font-mono text-rose-200 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{bridgeError}</span>
        </div>
      )}
    </div>
  );
}
