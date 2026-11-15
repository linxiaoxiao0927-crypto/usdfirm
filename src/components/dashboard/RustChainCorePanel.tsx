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
    <div className="rounded-3xl bg-[#1C1D21] p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#00DC6D]" />
            <h2 className="text-lg font-bold text-[#F4F4F6]">{t.title}</h2>
          </div>
          <p className="text-xs text-white/60 mt-1">
            {t.subtitlePrefix}{' '}
            <span className="text-[#00DC6D] font-mono">rust-core</span>{' '}
            {t.subtitleMid}{' '}
            <span className="text-[#FCD34D] font-mono">programs/usdfirm_escrow</span>{' '}
            {t.subtitleEnd}
          </p>
        </div>
        <span className="rounded-full bg-[#D4A853]/15 px-3.5 py-1 text-xs font-mono font-semibold text-[#FCD34D]">
          {t.specBadge}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="sm-bento-emerald rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-[#00DC6D] flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              rust-core/src/lib.rs & merkle_por.rs
            </span>
            <span className="rounded-full bg-[#090A0F]/45 px-2.5 py-0.5 font-mono text-[10px] text-[#6EE7B7]">
              {t.offchainBadge}
            </span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            {t.offchainDesc1} <code className="text-[#FCD34D]">u128</code>{' '}
            {t.offchainDesc2}
            <code className="text-[#6EE7B7]">checked_add / checked_sub</code>
            {t.offchainDesc3}
          </p>
        </div>

        <div className="sm-bento-amber rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-[#FCD34D] flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              programs/usdfirm_escrow/src/lib.rs
            </span>
            <span className="rounded-full bg-[#090A0F]/45 px-2.5 py-0.5 font-mono text-[10px] text-[#FCD34D]">
              {t.onchainBadge}
            </span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            {t.onchainDesc1} <code className="text-[#6EE7B7]">mint_usdf_stable</code>{' '}
            {t.onchainDesc2}{' '}
            <code className="text-[#67E8F9]">commit_state_channel_rollup</code>{' '}
            {t.onchainDesc3}{' '}
            <code className="text-[#D8B4FE]">settle_four_flow_escrow</code>{' '}
            {t.onchainDesc4}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleVerifyMerkle}
        noValidate
        className="rounded-2xl bg-[#24262C] p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F4F6]">
            <ShieldCheck className="w-4 h-4 text-[#00DC6D]" />
            <span>{t.verifyTitle}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={targetSite}
              onChange={(e) => setTargetSite(e.target.value)}
              aria-label={t.selectAria}
              className="rounded-full bg-white/[0.075] focus:bg-white/[0.12] px-3.5 py-2 text-xs text-[#F4F4F6] font-mono focus:outline-none"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.ownerSite} className="bg-[#18191C] text-white">
                  {a.ownerSite} ({a.id})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={status === 'LOADING'}
              className="rounded-full bg-[#00DC6D] px-4 py-2 text-xs font-bold text-[#090A0F] hover:bg-[#19E67C] disabled:opacity-50 transition"
            >
              {status === 'LOADING' ? t.computingBtn : t.generateBtn}
            </button>
          </div>
        </div>

        {status === 'LOADING' && (
          <div className="text-xs text-[#FCD34D] flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t.loadingMsg}
          </div>
        )}

        {status === 'ERROR' && (
          <div className="sm-bento-rose rounded-xl p-3 text-xs text-[#FDA4AF] flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </span>
            {errorCode && (
              <code className="rounded-full bg-[#090A0F]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
                {errorCode}
              </code>
            )}
          </div>
        )}

        {status === 'SUCCESS' && result && (
          <div className="sm-bento-emerald rounded-2xl p-4 space-y-2.5 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[#6EE7B7] font-sans font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#00DC6D]" />
                {t.verifiedTitlePrefix} ({String(result.proof.verified)}) · {t.slotHeightPrefix}
                {result.chainStatus.slotHeight}
              </span>
              <span className="text-[11px] text-[#FCD34D] font-mono">
                {t.u128Prefix} {result.chainStatus.u128InvariantOk ? 'OK' : 'BROKEN'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-xl bg-[#090A0F]/45 p-2.5">
                <span className="text-white/60 block">{t.leafPayloadLabel}</span>
                <span className="text-[#F4F4F6] break-all">{result.proof.leafPayload}</span>
              </div>
              <div className="rounded-xl bg-[#090A0F]/45 p-2.5">
                <span className="text-white/60 block">{t.leafHashLabel}</span>
                <span className="text-[#67E8F9] break-all">{result.proof.leafHash}</span>
              </div>
              <div className="rounded-xl bg-[#090A0F]/45 p-2.5">
                <span className="text-white/60 block">{t.stateRootLabel}</span>
                <span className="text-[#00DC6D] break-all">{result.proof.merkleRoot}</span>
              </div>
              <div className="rounded-xl bg-[#090A0F]/45 p-2.5">
                <span className="text-white/60 block">{t.blockHashLabel}</span>
                <span className="text-[#FCD34D] break-all">{result.chainStatus.latestBlockHash}</span>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
