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

interface RustChainCorePanelProps {
  accounts: LedgerAccountRecord[];
}

export function RustChainCorePanel({ accounts }: RustChainCorePanelProps) {
  const [targetSite, setTargetSite] = useState('sofayes.com');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<{
    proof: MerkleInclusionProof;
    chainStatus: ChainRollupStatus;
  } | null>(null);

  const handleVerifyMerkle = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSite }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Merkle 密码学校验失败');
      }
      setResult(json.data);
      setStatus('SUCCESS');
    } catch (err) {
      setStatus('ERROR');
      setErrorMsg(err instanceof Error ? err.message : '密码学内核调用异常');
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/75 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              Rust 状态通道内核 & Solana Anchor 智能合约 & 真 Merkle PoR 校验舱
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            双管齐下架构（方案 C）：链下 <span className="text-emerald-300 font-mono">rust-core</span> u128 高频流式扣费 + 链上 <span className="text-amber-300 font-mono">programs/asdcoin_escrow</span> 刚性托管分润
          </p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-300">
          FIPS 180-4 SHA-256 · u128 定点数
        </span>
      </div>

      {/* Rust 双核工程模块状态卡 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              rust-core/src/lib.rs & merkle_por.rs
            </span>
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
              链下高频状态通道
            </span>
          </div>
          <p className="text-xs text-zinc-300">
            采用 Rust <code className="text-amber-300">u128</code> 定点数（<code className="text-emerald-300">checked_add / checked_sub</code>）彻底消除浮点数误差，内置纯 Rust FIPS 180-4 SHA-256 Merkle Tree 状态根生成器。
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-amber-400 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              programs/asdcoin_escrow/src/lib.rs
            </span>
            <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-300">
              链上 Anchor 智能合约
            </span>
          </div>
          <p className="text-xs text-zinc-300">
            实现链上 <code className="text-emerald-300">mint_asd_stable</code> 1:1 铸币指令、<code className="text-cyan-300">commit_state_channel_rollup</code> 算力燃烧上链存证，以及 <code className="text-purple-300">settle_four_flow_escrow</code> 四流合一原子分润合约。
          </p>
        </div>
      </div>

      {/* 交互式真 SHA-256 Merkle 树包含性证明验证器 */}
      <form
        onSubmit={handleVerifyMerkle}
        className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>实时生成并校验账户 SHA-256 Merkle 树储备包含性证明 (Inclusion Proof)</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={targetSite}
              onChange={(e) => setTargetSite(e.target.value)}
              aria-label="选择要生成 Merkle 证明的站点账户"
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
              {status === 'LOADING' ? '计算哈希树中...' : '生成真实 Merkle 证明'}
            </button>
          </div>
        </div>

        {status === 'LOADING' && (
          <div className="text-xs text-amber-300 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            正在对全网账户叶子节点执行 SHA-256 哈希配对与路径回溯...
          </div>
        )}

        {status === 'ERROR' && (
          <div className="text-xs text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {status === 'SUCCESS' && result && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2.5 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-300 font-sans font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                密码学校验通过 (Verified = {String(result.proof.verified)}) · 区块高度 Slot #{result.chainStatus.slotHeight}
              </span>
              <span className="text-[11px] text-amber-300 font-mono">
                u128 借贷恒等: {result.chainStatus.u128InvariantOk ? 'OK' : 'BROKEN'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-zinc-950/90 p-2.5 border border-white/10">
                <span className="text-zinc-400 block">账户叶子明文 (u128 序列化):</span>
                <span className="text-white break-all">{result.proof.leafPayload}</span>
              </div>
              <div className="rounded-lg bg-zinc-950/90 p-2.5 border border-white/10">
                <span className="text-zinc-400 block">账户叶子 SHA-256 (Leaf Hash):</span>
                <span className="text-cyan-300 break-all">{result.proof.leafHash}</span>
              </div>
              <div className="rounded-lg bg-zinc-950/90 p-2.5 border border-white/10">
                <span className="text-zinc-400 block">全网状态根 (Merkle State Root):</span>
                <span className="text-emerald-400 break-all">{result.proof.merkleRoot}</span>
              </div>
              <div className="rounded-lg bg-zinc-950/90 p-2.5 border border-white/10">
                <span className="text-zinc-400 block">最新链式区块头哈希 (Block Hash):</span>
                <span className="text-amber-300 break-all">{result.chainStatus.latestBlockHash}</span>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
