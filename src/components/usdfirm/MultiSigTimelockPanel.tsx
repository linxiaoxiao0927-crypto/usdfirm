'use client';

import React, { useState } from 'react';
import { KeyRound, Check, Play, PlusCircle, AlertCircle } from 'lucide-react';
import type { TimelockProposalRecord } from '@/lib/usdfirm/types';

interface MultiSigTimelockPanelProps {
  initialProposals: TimelockProposalRecord[];
  signers: string[];
  requiredConfirmations: number;
  onRefresh: () => void;
}

export function MultiSigTimelockPanel({
  initialProposals,
  signers,
  requiredConfirmations,
  onRefresh,
}: MultiSigTimelockPanelProps) {
  const [proposals, setProposals] = useState<TimelockProposalRecord[]>(initialProposals);
  const [selectedSigner, setSelectedSigner] = useState<string>(signers[0] ?? '');
  const [newAction, setNewAction] = useState('ROTATE_CUSTODY_VAULT_BNY_MELLON_2026');
  const [busyId, setBusyId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const refreshProposals = async () => {
    const res = await fetch('/api/v1/usdfirm/multisig');
    const json = await res.json();
    if (json.success) {
      setProposals(json.data.proposals);
    }
    onRefresh();
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('PROPOSE');
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/usdfirm/multisig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PROPOSE',
          targetAction: newAction,
          proposer: selectedSigner,
          delaySeconds: 86400,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Proposal creation failed');
      }
      await refreshProposals();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Proposal failed');
    } finally {
      setBusyId('');
    }
  };

  const handleAction = async (proposalId: string, action: 'CONFIRM' | 'EXECUTE') => {
    setBusyId(`${action}_${proposalId}`);
    setErrorMsg('');
    try {
      const payload =
        action === 'CONFIRM'
          ? { action: 'CONFIRM', proposalId, signer: selectedSigner }
          : { action: 'EXECUTE', proposalId, executor: selectedSigner };

      const res = await fetch('/api/v1/usdfirm/multisig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? `${action} rejected`);
      }
      await refreshProposals();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Multi-sig action rejected');
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
            Multi-Sig Treasury Timelock Governance ({requiredConfirmations}-of-{signers.length})
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Enforces mandatory 24-hour minimum timelock delay and {requiredConfirmations}-of-{signers.length} hardware quorum
          </p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-300">
          Min Delay: 86,400s (24h)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <label className="space-y-1">
          <span className="text-zinc-400 font-medium">Active Committee Signer Key</span>
          <select
            value={selectedSigner}
            onChange={(e) => setSelectedSigner(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-emerald-300 focus:border-emerald-500 focus:outline-none"
          >
            {signers.map((s, idx) => (
              <option key={s} value={s}>
                Signer #{idx + 1}: {s.slice(0, 10)}...{s.slice(-6)}
              </option>
            ))}
          </select>
        </label>

        <form onSubmit={handlePropose} className="space-y-1">
          <span className="text-zinc-400 font-medium">Queue New Governance Action</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busyId === 'PROPOSE'}
              className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Queue
            </button>
          </div>
        </form>
      </div>

      {errorMsg && (
        <div role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-950/60 p-3 text-xs text-rose-200 flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
        {proposals.map((prop) => {
          const isReadyTime = new Date(prop.eta).getTime() <= Date.now();
          const hasQuorum = prop.confirmCount >= prop.requiredConfirmations;
          return (
            <div
              key={prop.proposalId}
              className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-2.5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-amber-300 font-bold">{prop.proposalId}</span>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300">
                    {prop.status}
                  </span>
                </div>
                <span className="font-mono text-zinc-400">
                  Confirmations: <strong className="text-white">{prop.confirmCount}/{prop.requiredConfirmations}</strong>
                </span>
              </div>

              <p className="font-mono text-white text-xs break-all">{prop.targetAction}</p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                <span className="text-[11px] font-mono text-zinc-400">
                  ETA: {new Date(prop.eta).toLocaleString()} {isReadyTime ? '(Unlocked)' : '(Timelocked)'}
                </span>

                {prop.status === 'QUEUED' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction(prop.proposalId, 'CONFIRM')}
                      disabled={busyId === `CONFIRM_${prop.proposalId}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-emerald-300 hover:bg-emerald-500/25 font-medium transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Sign ({selectedSigner.slice(0, 6)})
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
                      Execute
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
