'use client';

import React, { useState } from 'react';
import {
  Cpu,
  ShieldCheck,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  GitBranch,
} from 'lucide-react';
import type { LedgerAccountRecord } from '@/types/ledger';
import type {
  MerkleInclusionProof,
  ChainRollupStatus,
} from '@/lib/crypto-chain-engine';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';

interface RustChainCorePanelProps {
  accounts: LedgerAccountRecord[];
}

export function RustChainCorePanel({ accounts }: RustChainCorePanelProps) {
  const { copy, resolveError } = useUsdfirmLocale();
  const t = copy.dashboard.chain;

  const [targetSite, setTargetSite] = useState('sofayes.com');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [result, setResult] = useState<{
    proof: MerkleInclusionProof;
    chainStatus: ChainRollupStatus;
  } | null>(null);

  const handleVerifyMerkle = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    setErrorMsg('');
    setErrorCode(null);

    try {
      const res = await fetch('/api/v1/chain', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSite }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_MERKLE_ENGINE';
        setStatus('ERROR');
        setErrorCode(code);
        setErrorMsg(resolveError(code, json.error?.message));
        return;
      }
      setResult(json.data);
      setStatus('SUCCESS');
    } catch {
      const code = 'ERR_MERKLE_ENGINE';
      setStatus('ERROR');
      setErrorCode(code);
      setErrorMsg(resolveError(code));
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/75 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">{t.title}</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {t.subtitlePrefix}{' '}
            <span className="text-emerald-300 font-mono">rust-core</span>{' '}
            {t.subtitleMid}{' '}
            <span className="text-amber-300 font-mono">programs/usdfirm_escrow</span>{' '}
            {t.subtitleEnd}
          </p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-300">
          {t.specBadge}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              rust-core/src/lib.rs & merkle_por.rs
            </span>
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
              {t.offchainBadge}
            </span>
          </div>
          <p className="text-xs text-zinc-300">
            {t.offchainDesc1} <code className="text-amber-300">u128</code>{' '}
            {t.offchainDesc2}
            <code className="text-emerald-300">checked_add / checked_sub</code>
            {t.offchainDesc3}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-amber-400 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              programs/usdfirm_escrow/src/lib.rs
            </span>
            <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-300">
              {t.onchainBadge}
            </span>
          </div>
          <p className="text-xs text-zinc-300">
            {t.onchainDesc1} <code className="text-emerald-300">mint_usdf_stable</code>{' '}
            {t.onchainDesc2}{' '}
            <code className="text-cyan-300">commit_state_channel_rollup</code>{' '}
            {t.onchainDesc3}{' '}
            <code className="text-purple-300">settle_four_flow_escrow</code>{' '}
            {t.onchainDesc4}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleVerifyMerkle}
        noValidate
        className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t.verifyTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={targetSite}
              onChange={(e) => setTargetSite(e.target.value)}
              aria-label={t.selectAria}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-white font-mono"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.ownerSite}>
                  {a.ownerSite} ({a.id})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={status === 'LOADING'}
              className="rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              {status === 'LOADING' ? t.computingBtn : t.generateBtn}
            </button>
          </div>
        </div>

        {status === 'LOADING' && (
          <div className="text-xs text-amber-300 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t.loadingMsg}
          </div>
        )}

        {status === 'ERROR' && (
          <div className="text-xs text-rose-400 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </span>
            {errorCode && (
              <code className="rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
                {errorCode}
              </code>
            )}
          </div>
        )}

        {status === 'SUCCESS' && result && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2.5 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-300 font-sans font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {t.verifiedTitlePrefix} ({String(result.proof.verified)}) · {t.slotHeightPrefix}
                {result.chainStatus.slotHeight}
              </span>
              <span className="text-[11px] text-amber-300 font-mono">
                {t.u128Prefix} {result.chainStatus.u128InvariantOk ? 'OK' : 'BROKEN'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-zinc-950/90 p-2.5 border border-white/10">
                <span className="text-zinc-400 block">{t.leafPayloadLabel}</span>
                <span className="text-white break-all">{result.proof.leafPayload}</span>
              </div>
              <div className="rounded-lg bg-zinc-950/90 p-2.5 border border-white/10">
                <span className="text-zinc-400 block">{t.leafHashLabel}</span>
                <span className="text-cyan-300 break-all">{result.proof.leafHash}</span>
              </div>
              <div className="rounded-lg bg-zinc-950/90 p-2.5 border border-white/10">
                <span className="text-zinc-400 block">{t.stateRootLabel}</span>
                <span className="text-emerald-400 break-all">{result.proof.merkleRoot}</span>
              </div>
              <div className="rounded-lg bg-zinc-950/90 p-2.5 border border-white/10">
                <span className="text-zinc-400 block">{t.blockHashLabel}</span>
                <span className="text-amber-300 break-all">{result.chainStatus.latestBlockHash}</span>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
