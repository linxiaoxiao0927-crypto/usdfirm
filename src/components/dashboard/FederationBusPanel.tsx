'use client';

import React, { useState } from 'react';
import {
  Network,
  Radio,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Zap,
} from 'lucide-react';
import type {
  FederationNodeItem,
  MatrixCluster,
  LedgerSnapshot,
} from '@/types/ledger';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';

interface FederationBusPanelProps {
  nodes: FederationNodeItem[];
  onSnapshotUpdate: (snap: LedgerSnapshot) => void;
}

const CLUSTER_KEYS: Array<MatrixCluster | 'ALL'> = [
  'ALL',
  'SUPER_APP',
  'FINTECH_CRYPTO',
  'B2B_INFRA_SKILLS',
  'AI_VERTICALS',
  'RETAIL_BRANDS',
  'HOLDING_LAB',
];

export function FederationBusPanel({
  nodes,
  onSnapshotUpdate,
}: FederationBusPanelProps) {
  const { locale, copy, resolveError } = useUsdfirmLocale();
  const t = copy.dashboard.federation;

  const [clusterFilter, setClusterFilter] = useState<MatrixCluster | 'ALL'>('ALL');
  const [sourceSite, setSourceSite] = useState('sofayes.com');
  const [targetSite, setTargetSite] = useState('idles.site');
  const [eventType, setEventType] = useState<
    | 'COMPUTE_LEASE_PAYOUT'
    | 'CROSS_MALL_ORDER_LOCK'
    | 'TAX_ROUTE_REBATE'
    | 'SKILL_STREAM_SETTLE'
  >('COMPUTE_LEASE_PAYOUT');
  const [amountAsdS, setAmountAsdS] = useState('1500');
  const [tamperHmac, setTamperHmac] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [feedback, setFeedback] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const filteredNodes =
    clusterFilter === 'ALL' ? nodes : nodes.filter((n) => n.cluster === clusterFilter);

  const handleDispatchEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amountAsdS);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setStatus('ERROR');
      setErrorCode('ERR_INVALID_AMOUNT');
      setFeedback(resolveError('ERR_INVALID_AMOUNT'));
      return;
    }

    setStatus('LOADING');
    setFeedback('');
    setErrorCode(null);
    const hmacSignature = tamperHmac
      ? 'invalid_forged_sig_000'
      : `sha256=${Date.now().toString(16)}9f8a7b6c5d4e3f2a1b0c`;

    try {
      const res = await fetch('/api/v1/federation', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSite,
          targetSite,
          eventType,
          amountAsdS: numericAmount,
          hmacSignature,
          payloadSummary: `${eventType}: ${t.payloadSummaryDefault}`,
          idempotencyKey: `fed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_INVALID_HMAC_SIGNATURE';
        setStatus('ERROR');
        setErrorCode(code);
        setFeedback(resolveError(code, json.error?.message));
        return;
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setFeedback(
        t.formatSuccess(sourceSite, targetSite, numericAmount, json.data.entry.txHash)
      );
    } catch {
      const code = 'ERR_LEDGER_SYNC_FAILED';
      setStatus('ERROR');
      setErrorCode(code);
      setFeedback(resolveError(code));
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/75 p-6 sm:p-8 backdrop-blur-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">{t.title}</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">{t.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-300">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          {t.onlineBadgePrefix} {nodes.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {CLUSTER_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setClusterFilter(key)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              clusterFilter === key
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            {t.clusters[key]}
          </button>
        ))}
      </div>

      {filteredNodes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-zinc-400">
          {t.emptyNodes}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
          {filteredNodes.map((node) => {
            const displayName =
              locale === 'zh' ? node.brandName : node.brandNameEn || node.brandName;
            const displayRole =
              locale === 'zh'
                ? node.roleSummary
                : node.roleSummaryEn || node.roleSummary;
            return (
              <div
                key={node.domain}
                className="rounded-2xl border border-white/10 bg-zinc-950/75 p-4 space-y-1.5 hover:border-white/25 transition"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-white">{node.domain}</span>
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                    {node.latencyMs}ms
                  </span>
                </div>
                <p className="text-xs font-semibold text-amber-300">{displayName}</p>
                <p className="text-[11px] text-zinc-400 line-clamp-2">{displayRole}</p>
                <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>24h: ${node.volume24hAsdS.toLocaleString()}</span>
                  <span className="text-cyan-300">{node.protocolType}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form
        onSubmit={handleDispatchEvent}
        noValidate
        className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            {t.simTitle}
          </span>
          <label className="inline-flex items-center gap-2 text-xs text-rose-300 cursor-pointer">
            <input
              type="checkbox"
              checked={tamperHmac}
              onChange={(e) => setTamperHmac(e.target.checked)}
              className="accent-rose-500"
            />
            {t.tamperLabel}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">{t.sourceLabel}</label>
            <select value={sourceSite} onChange={(e) => setSourceSite(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white">
              <option value="sofayes.com">{t.sourceSofayes}</option>
              <option value="hmm.sale">{t.sourceHmm}</option>
              <option value="dezi.life">{t.sourceDezi}</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">{t.targetLabel}</label>
            <select value={targetSite} onChange={(e) => setTargetSite(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white">
              <option value="idles.site">{t.targetIdles}</option>
              <option value="taxyesai.com">{t.targetTaxyes}</option>
              <option value="uptoyes.com">{t.targetUptoyes}</option>
              <option value="tocads.com">{t.targetTocads}</option>
              <option value="dcdy.life">{t.targetDcdy}</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">{t.protocolLabel}</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value as typeof eventType)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white">
              <option value="COMPUTE_LEASE_PAYOUT">{t.evCompute}</option>
              <option value="CROSS_MALL_ORDER_LOCK">{t.evMall}</option>
              <option value="TAX_ROUTE_REBATE">{t.evTax}</option>
              <option value="SKILL_STREAM_SETTLE">{t.evSkill}</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">{t.amountLabel}</label>
            <input type="number" value={amountAsdS} onChange={(e) => setAmountAsdS(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-mono text-white" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-xs flex items-center gap-2">
            {status === 'LOADING' && (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t.loadingMsg}
              </span>
            )}
            {status === 'ERROR' && (
              <>
                <span className="inline-flex items-center gap-1.5 text-rose-400">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {feedback}
                </span>
                {errorCode && (
                  <code className="rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
                    {errorCode}
                  </code>
                )}
              </>
            )}
            {status === 'SUCCESS' && (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {feedback}
              </span>
            )}
          </div>
          <button type="submit" disabled={status === 'LOADING'} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition">
            {t.submitBtn}
          </button>
        </div>
      </form>
    </div>
  );
}
