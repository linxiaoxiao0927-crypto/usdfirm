'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, Check, Play, PlusCircle, AlertCircle } from 'lucide-react';
import type { TimelockProposalRecord, UsdfirmProtocolBundle } from '@/lib/usdfirm/types';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';

interface MultiSigTimelockPanelProps {
  initialProposals: TimelockProposalRecord[];
  signers: string[];
  requiredConfirmations: number;
  onRefresh: () => void;
  onBundleUpdate?: (bundle: UsdfirmProtocolBundle) => void;
}

export function MultiSigTimelockPanel({
  initialProposals,
  signers,
  requiredConfirmations,
  onRefresh,
  onBundleUpdate,
}: MultiSigTimelockPanelProps) {
  const { locale, copy, resolveError } = useUsdfirmLocale();
  const t = copy.multisig;

  const [proposals, setProposals] = useState<TimelockProposalRecord[]>(initialProposals);
  const [selectedSigner, setSelectedSigner] = useState<string>(signers[0] ?? '');
  const [newAction, setNewAction] = useState('MINT_TREASURY_TRANCHE_2_5M_USDF');
  const [busyId, setBusyId] = useState<string>('');
  const [errorInfo, setErrorInfo] = useState<{ code: string; text: string } | null>(null);

  useEffect(() => {
    setProposals(initialProposals);
  }, [initialProposals]);

  useEffect(() => {
    if (signers.length > 0 && !signers.includes(selectedSigner)) {
      setSelectedSigner(signers[0]);
    }
  }, [signers, selectedSigner]);

  const refreshProposals = async () => {
    const res = await fetch('/api/v1/usdfirm/multisig', { cache: 'no-store' });
    const json = await res.json();
    if (json.success && json.data?.proposals) {
      setProposals(json.data.proposals);
    }
    onRefresh();
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('PROPOSE');
    setErrorInfo(null);
    try {
      const res = await fetch('/api/v1/usdfirm/multisig', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PROPOSE',
          targetAction: newAction,
          proposer: selectedSigner,
          delaySeconds: 86400,
          amountUsd: 2_500_000,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'MULTISIG_REJECTED';
        setErrorInfo({ code, text: resolveError(code, json.error?.message) });
        return;
      }
      if (json.data?.bundle && onBundleUpdate) {
        onBundleUpdate(json.data.bundle as UsdfirmProtocolBundle);
      } else {
        await refreshProposals();
      }
    } catch {
      setErrorInfo({
        code: 'ERR_WORKER_UNREACHABLE',
        text: resolveError('ERR_WORKER_UNREACHABLE'),
      });
    } finally {
      setBusyId('');
    }
  };

  const handleAction = async (proposalId: string, action: 'CONFIRM' | 'EXECUTE') => {
    setBusyId(`${action}_${proposalId}`);
    setErrorInfo(null);
    try {
      const payload =
        action === 'CONFIRM'
          ? { action: 'CONFIRM', proposalId, signer: selectedSigner }
          : { action: 'EXECUTE', proposalId, executor: selectedSigner };

      const res = await fetch('/api/v1/usdfirm/multisig', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'MULTISIG_REJECTED';
        setErrorInfo({ code, text: resolveError(code, json.error?.message) });
        return;
      }
      if (json.data?.bundle && onBundleUpdate) {
        onBundleUpdate(json.data.bundle as UsdfirmProtocolBundle);
      } else {
        await refreshProposals();
      }
    } catch {
      setErrorInfo({
        code: 'ERR_WORKER_UNREACHABLE',
        text: resolveError('ERR_WORKER_UNREACHABLE'),
      });
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 backdrop-blur-xl shadow-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            {t.title} ({requiredConfirmations}-of-{signers.length})
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-300">
          {t.minDelayBadge}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <label className="space-y-1">
          <span className="text-zinc-400 font-medium">{t.activeSigner}</span>
          <select
            value={selectedSigner}
            onChange={(e) => setSelectedSigner(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-emerald-300 focus:border-emerald-500 focus:outline-none"
          >
            {signers.map((s, idx) => (
              <option key={s} value={s}>
                #{idx + 1}: {s.length > 22 ? `${s.slice(0, 10)}...${s.slice(-6)}` : s}
              </option>
            ))}
          </select>
        </label>

        <form onSubmit={handlePropose} noValidate className="space-y-1">
          <span className="text-zinc-400 font-medium">{t.queueAction}</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              className="flex-1 min-w-0 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busyId === 'PROPOSE'}
              className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {t.queueBtn}
            </button>
          </div>
        </form>
      </div>

      {errorInfo && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/40 bg-rose-950/60 p-3 text-xs text-rose-200 flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorInfo.text}</span>
          </span>
          <code className="shrink-0 rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
            {errorInfo.code}
          </code>
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 text-center text-xs text-zinc-400">
          {t.emptyProposals}
        </div>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {proposals.map((prop) => {
            const isReadyTime = new Date(prop.eta).getTime() <= Date.now();
            const hasQuorum = prop.confirmCount >= prop.requiredConfirmations;
            const isExecuted = prop.status === 'EXECUTED' || prop.rawStatus === 'EXECUTED';
            const title =
              locale === 'zh'
                ? prop.titleZh || prop.targetAction
                : prop.titleEn || prop.targetAction;
            const statusLabel = isExecuted
              ? t.statusExecuted
              : prop.rawStatus === 'READY_TO_EXECUTE' || hasQuorum
                ? t.statusReady
                : t.statusPending;

            return (
              <div
                key={prop.proposalId}
                className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-amber-300 font-bold">{prop.proposalId}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] ${
                        isExecuted
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : hasQuorum
                            ? 'bg-cyan-500/15 text-cyan-300'
                            : 'bg-white/10 text-zinc-300'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <span className="font-mono text-zinc-400">
                    {t.confirmations}{' '}
                    <strong className="text-white">
                      {prop.confirmCount}/{prop.requiredConfirmations}
                    </strong>
                  </span>
                </div>

                <p className="text-white text-xs break-words">{title}</p>

                <div className="flex flex-wrap gap-1.5">
                  {prop.signers.map((sig) => (
                    <span
                      key={sig}
                      className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300"
                    >
                      {sig.length > 18 ? `${sig.slice(0, 8)}...` : sig}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <span className="text-[11px] font-mono text-zinc-400">
                    {t.etaLabel}: {new Date(prop.eta).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')} (
                    {isReadyTime ? t.unlocked : t.timelocked})
                  </span>

                  {!isExecuted && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAction(prop.proposalId, 'CONFIRM')}
                        disabled={busyId === `CONFIRM_${prop.proposalId}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-emerald-300 hover:bg-emerald-500/25 font-medium transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {t.signBtn} ({selectedSigner.slice(0, 10)})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(prop.proposalId, 'EXECUTE')}
                        disabled={busyId === `EXECUTE_${prop.proposalId}`}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition ${
                          hasQuorum && isReadyTime
                            ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                            : 'border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        {t.executeBtn}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
