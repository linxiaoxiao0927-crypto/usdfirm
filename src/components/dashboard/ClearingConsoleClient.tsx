'use client';

import React, { useState } from 'react';
import { RefreshCw, AlertOctagon, Inbox, Layers } from 'lucide-react';
import type { LedgerSnapshot } from '@/types/ledger';
import { HyperspaceCanvas } from '@/components/canvas/HyperspaceCanvas';
import { MetricGlassCard } from '@/components/dashboard/MetricGlassCard';
import { FederationBusPanel } from '@/components/dashboard/FederationBusPanel';
import { ReserveVaultPanel } from '@/components/dashboard/ReserveVaultPanel';
import { TokenSwapAndAccountsPanel } from '@/components/dashboard/TokenSwapAndAccountsPanel';
import { SkillBurnMatrix } from '@/components/dashboard/SkillBurnMatrix';
import { FourFlowTracker } from '@/components/dashboard/FourFlowTracker';
import { LedgerStreamPanel } from '@/components/dashboard/LedgerStreamPanel';
import { RustChainCorePanel } from '@/components/dashboard/RustChainCorePanel';
import { DeveloperSdkPanel } from '@/components/dashboard/DeveloperSdkPanel';
import { UsdfirmProtocolHub } from '@/components/usdfirm/UsdfirmProtocolHub';

export type ModuleTab =
  | 'ALL'
  | 'USDFIRM'
  | 'RUST_CHAIN'
  | 'FEDERATION'
  | 'VAULT_SWAP'
  | 'SKILLS'
  | 'ESCROW'
  | 'DEVELOPER'
  | 'LEDGER';

interface ClearingConsoleClientProps {
  initialSnapshot: LedgerSnapshot;
  initialTab?: ModuleTab;
}

const MODULE_TABS: Array<{ key: ModuleTab; label: string }> = [
  { key: 'ALL', label: '全景驾驶舱 (All)' },
  { key: 'USDFIRM', label: 'USDFirm 稳定币发行协议' },
  { key: 'RUST_CHAIN', label: 'Rust 合约 & Merkle 证明' },
  { key: 'FEDERATION', label: '29+ 跨站联邦总线' },
  { key: 'VAULT_SWAP', label: 'PoR 储备 & 双态闪兑' },
  { key: 'SKILLS', label: 'AI Skill 燃料矩阵' },
  { key: 'ESCROW', label: '四流合一智能托管' },
  { key: 'DEVELOPER', label: '开发者 SDK & 对账' },
  { key: 'LEDGER', label: '复式记账总账审计' },
];

export function ClearingConsoleClient({
  initialSnapshot,
  initialTab = 'ALL',
}: ClearingConsoleClientProps) {
  const [snapshot, setSnapshot] = useState<LedgerSnapshot>(initialSnapshot);
  const [activeTab, setActiveTab] = useState<ModuleTab>(initialTab);
  const [viewState, setViewState] = useState<'SUCCESS' | 'LOADING' | 'EMPTY' | 'ERROR'>('SUCCESS');
  const [errorBanner, setErrorBanner] = useState<string>('');
  const [pulseBoost, setPulseBoost] = useState<number>(1);

  const handleSnapshotUpdate = (nextSnap: LedgerSnapshot) => {
    setSnapshot(nextSnap);
    setViewState('SUCCESS');
    setPulseBoost(2.2);
    setTimeout(() => setPulseBoost(1), 1200);
  };

  const fetchWithMode = async (mode: 'NORMAL' | 'SIMULATE_EMPTY' | 'SIMULATE_ERROR') => {
    setViewState('LOADING');
    setErrorBanner('');
    try {
      const query =
        mode === 'SIMULATE_ERROR'
          ? '?simulateError=true'
          : mode === 'SIMULATE_EMPTY'
            ? '?simulateEmpty=true'
            : '';
      const res = await fetch(`/api/v1/ledger${query}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'UPSTREAM_LEDGER_ERROR: 清算总账同步失败');
      }
      setSnapshot(json.data);
      setViewState(mode === 'SIMULATE_EMPTY' ? 'EMPTY' : 'SUCCESS');
    } catch (err) {
      setViewState('ERROR');
      setErrorBanner(
        err instanceof Error ? err.message : '清结算网关异常：严禁伪造降级，请排查节点连接'
      );
    }
  };

  return (
    <div className="relative min-h-screen text-zinc-100">
      <HyperspaceCanvas pulseBoost={pulseBoost} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-3xl border border-white/10 bg-zinc-950/85 p-6 backdrop-blur-xl shadow-2xl">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-0.5 text-xs font-mono font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                ShineMight OS · FinTech Core
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-mono text-amber-300">
                1 ASD-S = $1.00 USD = 1,000,000 ASD-G
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              USDFirm.com{' '}
              <span className="text-zinc-400 font-normal text-lg sm:text-xl">
                美元稳定币底层发行协议 · PoR 储备金证明与多签财资池
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              合规防火墙物理隔离：独立承载 USDF Mint/Burn 与多签储备透明公示，仅向 xpayes.com 输出流动性，与交易所撮合严格隔离
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => fetchWithMode('NORMAL')} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 transition">
              <RefreshCw className="w-3.5 h-3.5" />
              同步实时总账
            </button>
            <button type="button" onClick={() => fetchWithMode('SIMULATE_EMPTY')} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition">
              <Inbox className="w-3.5 h-3.5 text-cyan-400" />
              空态演练 (Empty)
            </button>
            <button type="button" onClick={() => fetchWithMode('SIMULATE_ERROR')} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/20 transition">
              <AlertOctagon className="w-3.5 h-3.5" />
              故障演练 (Zero-Fake)
            </button>
          </div>
        </header>

        <nav aria-label="核心模块工作区切换" className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 p-2 backdrop-blur-md">
          <span className="px-2.5 text-xs text-zinc-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            视图域:
          </span>
          {MODULE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                activeTab === t.key
                  ? 'bg-emerald-500 text-zinc-950 font-semibold shadow'
                  : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {viewState === 'LOADING' && (
          <div className="rounded-3xl border border-amber-500/30 bg-zinc-900/90 p-8 text-center backdrop-blur-xl space-y-2">
            <RefreshCw className="w-7 h-7 text-amber-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-white">
              正在从 ASDCoin 复式记账核心拉取 T+0 试算平衡快照...
            </p>
          </div>
        )}

        {viewState === 'ERROR' && (
          <div role="alert" className="rounded-3xl border border-rose-500/40 bg-rose-950/60 p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <AlertOctagon className="w-5 h-5 shrink-0" />
                <span>真实告警 (Zero-Fake Policy)：跨站清结算节点通讯中断</span>
              </div>
              <p className="text-xs font-mono text-rose-200">{errorBanner}</p>
            </div>
            <button type="button" onClick={() => fetchWithMode('NORMAL')} className="shrink-0 rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400 transition">
              重连主清算通道
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricGlassCard
            title="生态流通稳定币总量"
            subtitle="跨 29+ 矩阵站点零汇损结算"
            value={snapshot.circulatingAsdS.toLocaleString()}
            unit="ASD-S"
            badgeText={snapshot.trialBalanceOk ? '借贷试算平衡' : '账务失衡告警'}
            accent="emerald"
          />
          <MetricGlassCard
            title="PoR 储备金充足率"
            subtitle={`总储备 $${snapshot.totalReserveUsd.toLocaleString()} USD`}
            value={`${snapshot.reserveRatioPct.toFixed(2)}%`}
            unit="RESERVE"
            badgeText=">= 100% 足额锚定"
            accent="amber"
          />
          <MetricGlassCard
            title="AI Skill 燃料累计燃烧"
            subtitle="按 Token / 毫秒颗粒度实时销毁"
            value={snapshot.totalBurnedAsdG.toLocaleString()}
            unit="ASD-G"
            badgeText="通缩分润引擎"
            accent="cyan"
          />
          <MetricGlassCard
            title="四流合一合规对齐率"
            subtitle={`实时脉冲吞吐: ${snapshot.tpsPulse} TPS`}
            value={`${snapshot.fourFlowAlignmentPct.toFixed(1)}%`}
            unit="ALIGNED"
            badgeText="主体+税+资+物"
            accent="purple"
          />
        </section>

        {(activeTab === 'ALL' || activeTab === 'USDFIRM') && (
          <UsdfirmProtocolHub showStandaloneLink />
        )}
        {(activeTab === 'ALL' || activeTab === 'RUST_CHAIN') && (
          <RustChainCorePanel accounts={snapshot.accounts} />
        )}
        {(activeTab === 'ALL' || activeTab === 'FEDERATION') && (
          <FederationBusPanel nodes={snapshot.federationNodes} onSnapshotUpdate={handleSnapshotUpdate} />
        )}
        {(activeTab === 'ALL' || activeTab === 'VAULT_SWAP') && (
          <>
            <ReserveVaultPanel reserves={snapshot.reserves} reserveRatioPct={snapshot.reserveRatioPct} onSnapshotUpdate={handleSnapshotUpdate} />
            <TokenSwapAndAccountsPanel accounts={snapshot.accounts} onSnapshotUpdate={handleSnapshotUpdate} />
          </>
        )}
        {(activeTab === 'ALL' || activeTab === 'SKILLS') && (
          <SkillBurnMatrix skills={snapshot.skills} totalBurnedAsdG={snapshot.totalBurnedAsdG} onSnapshotUpdate={handleSnapshotUpdate} />
        )}
        {(activeTab === 'ALL' || activeTab === 'ESCROW') && (
          <FourFlowTracker escrows={snapshot.escrowOrders} onSnapshotUpdate={handleSnapshotUpdate} />
        )}
        {(activeTab === 'ALL' || activeTab === 'DEVELOPER') && <DeveloperSdkPanel />}
        {(activeTab === 'ALL' || activeTab === 'LEDGER') && (
          <LedgerStreamPanel entries={snapshot.recentEntries} />
        )}
      </div>
    </div>
  );
}
