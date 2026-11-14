'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { ReserveAssetItem, LedgerSnapshot } from '@/types/ledger';

interface ReserveVaultPanelProps {
  reserves: ReserveAssetItem[];
  reserveRatioPct: number;
  onSnapshotUpdate: (snap: LedgerSnapshot) => void;
}

export function ReserveVaultPanel({
  reserves,
  reserveRatioPct,
  onSnapshotUpdate,
}: ReserveVaultPanelProps) {
  const [action, setAction] = useState<'MINT' | 'REDEEM'>('MINT');
  const [channel, setChannel] = useState<'XPAYES_VIBAN' | 'ITISCOIN_CHAIN'>(
    'XPAYES_VIBAN'
  );
  const [ownerSite, setOwnerSite] = useState('sofayes.com');
  const [amountUsd, setAmountUsd] = useState('25000');
  const [status, setStatus] = useState<
    'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  >('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    setFeedbackMsg('');

    try {
      const numericAmount = Number(amountUsd);
      const res = await fetch('/api/v1/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ownerSite,
          ownerEntity: 'ENT-SOFA-CORE',
          amountUsd: numericAmount,
          channel,
          idempotencyKey: `mint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? '铸造/赎回请求被拒绝');
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setFeedbackMsg(
        `已完成 ${numericAmount.toLocaleString()} ASD-S ${
          action === 'MINT' ? '1:1 储备铸造' : '1:1 赎回销毁'
        }，哈希: ${json.data.entry.txHash}`
      );
    } catch (err) {
      setStatus('ERROR');
      setFeedbackMsg(err instanceof Error ? err.message : '未知网络错误');
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/75 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              铸币、赎回与 PoR 储备金透明舱
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            联动 <span className="text-amber-400 font-mono">xpayes.com</span>{' '}
            法币备付金池与{' '}
            <span className="text-cyan-400 font-mono">itiscoin.com</span>{' '}
            多签金库，100%+ 足额 Merkle 审计
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-300">
          PoR 储备率: {reserveRatioPct.toFixed(2)}%
        </span>
      </div>

      {reserves.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-zinc-400">
          暂无储备金托管池快照数据 (Empty State)
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reserves.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-amber-400 font-semibold">
                  {item.channelDomain}
                </span>
                <span className="text-zinc-400">
                  权重 {item.allocationPct.toFixed(0)}%
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                {item.assetName}
              </p>
              <p className="text-xl font-bold font-mono text-emerald-400">
                ${item.usdValue.toLocaleString()} USD
              </p>
              <p className="text-[11px] font-mono text-zinc-500 truncate">
                Merkle: {item.merkleRoot}
              </p>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            执行 1:1 跨站铸造 / 赎回指令
          </span>
          <div className="flex rounded-xl bg-zinc-900 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setAction('MINT')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition ${
                action === 'MINT'
                  ? 'bg-emerald-500 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              铸造 ASD-S
            </button>
            <button
              type="button"
              onClick={() => setAction('REDEEM')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition ${
                action === 'REDEEM'
                  ? 'bg-amber-500 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              赎回 USD
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              目标生态站点
            </label>
            <select
              value={ownerSite}
              onChange={(e) => setOwnerSite(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="sofayes.com">sofayes.com (母舰)</option>
              <option value="hmm.sale">hmm.sale (跨境商城)</option>
              <option value="dezi.life">dezi.life (嘚滋供应链)</option>
              <option value="sheng.sale">sheng.sale (省手特卖)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              清算储备通道
            </label>
            <select
              value={channel}
              onChange={(e) =>
                setChannel(
                  e.target.value as 'XPAYES_VIBAN' | 'ITISCOIN_CHAIN'
                )
              }
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="XPAYES_VIBAN">XPayes vIBAN 法币网关</option>
              <option value="ITISCOIN_CHAIN">ItisCoin 链上稳定币池</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              金额 (USD / ASD-S)
            </label>
            <input
              type="number"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-xs">
            {status === 'LOADING' && (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                正在同步复式记账总账与 Merkle 树...
              </span>
            )}
            {status === 'ERROR' && (
              <span className="inline-flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {feedbackMsg}
              </span>
            )}
            {status === 'SUCCESS' && (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {feedbackMsg}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={status === 'LOADING'}
            className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition"
          >
            立即执行清算
          </button>
        </div>
      </form>
    </div>
  );
}
