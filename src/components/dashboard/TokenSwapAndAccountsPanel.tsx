'use client';

import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { LedgerAccountRecord, LedgerSnapshot } from '@/types/ledger';

interface TokenSwapAndAccountsPanelProps {
  accounts: LedgerAccountRecord[];
  onSnapshotUpdate: (snap: LedgerSnapshot) => void;
}

export function TokenSwapAndAccountsPanel({
  accounts,
  onSnapshotUpdate,
}: TokenSwapAndAccountsPanelProps) {
  const [ownerSite, setOwnerSite] = useState('sofayes.com');
  const [direction, setDirection] = useState<'ASD_S_TO_G' | 'ASD_G_TO_S'>(
    'ASD_S_TO_G'
  );
  const [amount, setAmount] = useState('500');
  const [status, setStatus] = useState<
    'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  >('IDLE');
  const [feedback, setFeedback] = useState('');

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    setFeedback('');

    try {
      const res = await fetch('/api/v1/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerSite,
          ownerEntity: 'ENT-SOFA-CORE',
          direction,
          amount: Number(amount),
          idempotencyKey: `swap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? '双态通证闪兑失败');
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setFeedback(
        direction === 'ASD_S_TO_G'
          ? `闪兑成功！${Number(amount).toLocaleString()} ASD-S → ${json.data.convertedAmount.toLocaleString()} ASD-G 算力燃料`
          : `反向闪兑成功！${Number(amount).toLocaleString()} ASD-G → ${json.data.convertedAmount.toLocaleString()} ASD-S 稳定币`
      );
    } catch (err) {
      setStatus('ERROR');
      setFeedback(err instanceof Error ? err.message : '闪兑网络错误');
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/75 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              ASD-S ⇄ ASD-G 零滑点闪兑与各站点账本实时余额舱
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            恒定汇率 <span className="text-emerald-300 font-mono">1 ASD-S = 1,000,000 ASD-G</span>，支持各矩阵站点一键补充微粒化 AI 算力燃料
          </p>
        </div>
      </div>

      {/* 各站点复式记账子账户余额矩阵 */}
      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-zinc-400">
          当前暂无已初始化的站点总账账户 (Empty State)
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts
            .filter((a) => a.accountType !== 'ASSET_RESERVE')
            .map((acc) => (
              <div
                key={acc.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-white">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    {acc.ownerSite}
                  </span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {acc.accountType} · v{acc.version}
                  </span>
                </div>
                <div className="pt-1 space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">稳定币 (ASD-S):</span>
                    <span className="text-emerald-400 font-bold">
                      {acc.asdStableBal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">算力燃料 (ASD-G):</span>
                    <span className="text-amber-300 font-bold">
                      {acc.asdGasBal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 闪兑交互表单 */}
      <form
        onSubmit={handleSwap}
        className="rounded-2xl border border-white/10 bg-zinc-950/75 p-5 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              操作站点账户
            </label>
            <select
              value={ownerSite}
              onChange={(e) => setOwnerSite(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white"
            >
              <option value="sofayes.com">sofayes.com</option>
              <option value="hmm.sale">hmm.sale</option>
              <option value="dezi.life">dezi.life</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              闪兑方向 (Zero-Slippage)
            </label>
            <select
              value={direction}
              onChange={(e) => {
                const nextDir = e.target.value as 'ASD_S_TO_G' | 'ASD_G_TO_S';
                setDirection(nextDir);
                setAmount(nextDir === 'ASD_S_TO_G' ? '500' : '50000000');
              }}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white"
            >
              <option value="ASD_S_TO_G">
                ASD-S 稳定币 → ASD-G 燃料 (×10⁶)
              </option>
              <option value="ASD_G_TO_S">
                ASD-G 燃料 → ASD-S 稳定币 (÷10⁶)
              </option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              输入数量 ({direction === 'ASD_S_TO_G' ? 'ASD-S' : 'ASD-G'})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-mono text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-xs">
            {status === 'LOADING' && (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                正在执行原子级双账本闪兑...
              </span>
            )}
            {status === 'ERROR' && (
              <span className="inline-flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {feedback}
              </span>
            )}
            {status === 'SUCCESS' && (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {feedback}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={status === 'LOADING'}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition"
          >
            执行零滑点闪兑
          </button>
        </div>
      </form>
    </div>
  );
}
