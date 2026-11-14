'use client';

import React, { useState, useCallback } from 'react';
import { RefreshCw, AlertOctagon, Layers } from 'lucide-react';
import type { LedgerSnapshot } from '@/types/ledger';
import type { UsdfirmProtocolBundle } from '@/lib/usdfirm/types';
import {
  useUsdfirmLocale,
  UsdfirmLocaleToggle,
  extractErrorCode,
} from '@/lib/usdfirm/i18n';
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
  initialBundle?: UsdfirmProtocolBundle | null;
  initialBundleErrorCode?: string | null;
  initialTab?: ModuleTab;
}

const MODULE_TAB_KEYS: ModuleTab[] = [
  'ALL',
  'USDFIRM',
  'RUST_CHAIN',
  'FEDERATION',
  'VAULT_SWAP',
  'SKILLS',
  'ESCROW',
  'DEVELOPER',
  'LEDGER',
];

export function ClearingConsoleClient({
  initialSnapshot,
  initialBundle = null,
  initialBundleErrorCode = null,
  initialTab = 'ALL',
}: ClearingConsoleClientProps) {
  const { copy, resolveError } = useUsdfirmLocale();
  const c = copy.console;

  const [snapshot, setSnapshot] = useState<LedgerSnapshot>(initialSnapshot);
  const [liveBundle, setLiveBundle] = useState<UsdfirmProtocolBundle | null>(
    initialBundle ?? null
  );
  const [activeTab, setActiveTab] = useState<ModuleTab>(initialTab);
  const [viewState, setViewState] = useState<'SUCCESS' | 'LOADING' | 'ERROR'>('SUCCESS');
  const [errorCode, setErrorCode] = useState<string>('');
  const [pulseBoost, setPulseBoost] = useState<number>(1);

  const handleSnapshotUpdate = (nextSnap: LedgerSnapshot) => {
    setSnapshot(nextSnap);
    setViewState('SUCCESS');
    setPulseBoost(2.2);
    setTimeout(() => setPulseBoost(1), 1200);
  };

  const handleLiveBundleSync = useCallback((bundle: UsdfirmProtocolBundle) => {
    setLiveBundle(bundle);
  }, []);

  const syncLedger = async () => {
    setViewState('LOADING');
    setErrorCode('');
    try {
      const res = await fetch('/api/v1/ledger', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_LEDGER_SYNC_FAILED';
        setViewState('ERROR');
        setErrorCode(code);
        return;
      }
      setSnapshot(json.data);
      setViewState('SUCCESS');
    } catch {
      setViewState('ERROR');
      setErrorCode('ERR_LEDGER_SYNC_FAILED');
    }
  };

  const displayCirculating =
    liveBundle?.attestation.circulatingUsdf ?? snapshot.circulatingAsdS;
  const displayReservesUsd =
    liveBundle?.attestation.totalReservesUsd ?? snapshot.totalReserveUsd;
  const displayReserveRatio =
    liveBundle?.attestation.reserveRatioPct ?? snapshot.reserveRatioPct;

  return (
    <div className="relative min-h-screen text-zinc-100">
      <HyperspaceCanvas pulseBoost={pulseBoost} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-3xl border border-white/10 bg-zinc-950/85 p-6 backdrop-blur-xl shadow-2xl">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-0.5 text-xs font-mono font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {c.badge}
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-mono text-amber-300">
                {c.pegPill}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              USDFirm.com{' '}
              <span className="text-zinc-400 font-normal text-lg sm:text-xl">
                {c.pageTitleSub}
              </span>
            </h1>
            <p className="text-xs text-zinc-400">{c.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <UsdfirmLocaleToggle />
            <button
              type="button"
              onClick={syncLedger}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {c.syncLedger}
            </button>
          </div>
        </header>

        <nav
          aria-label={c.viewScope}
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 p-2 backdrop-blur-md"
        >
          <span className="px-2.5 text-xs text-zinc-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            {c.viewScope}
          </span>
          {MODULE_TAB_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                activeTab === key
                  ? 'bg-emerald-500 text-zinc-950 font-semibold shadow'
                  : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {c.tabs[key]}
            </button>
          ))}
        </nav>

        {viewState === 'LOADING' && (
          <div className="rounded-3xl border border-amber-500/30 bg-zinc-900/90 p-8 text-center backdrop-blur-xl space-y-2">
            <RefreshCw className="w-7 h-7 text-amber-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-white">{c.loadingSnapshot}</p>
          </div>
        )}

        {viewState === 'ERROR' && (
          <div
            role="alert"
            className="rounded-3xl border border-rose-500/40 bg-rose-950/60 p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <AlertOctagon className="w-5 h-5 shrink-0" />
                <span>{c.errorAlertTitle}</span>
              </div>
              <p className="text-xs text-rose-200">{resolveError(errorCode)}</p>
              {errorCode && (
                <code className="inline-block rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
                  {errorCode}
                </code>
              )}
            </div>
            <button
              type="button"
              onClick={syncLedger}
              className="shrink-0 rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400 transition"
            >
              {c.reconnectBtn}
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricGlassCard
            title={c.metricCircTitle}
            subtitle={c.metricCircSub}
            value={displayCirculating.toLocaleString()}
            unit="USDF"
            badgeText={snapshot.trialBalanceOk ? c.metricTrialOk : c.metricTrialErr}
            accent="emerald"
          />
          <MetricGlassCard
            title={c.metricPorTitle}
            subtitle={`${c.metricPorSubPrefix} $${displayReservesUsd.toLocaleString()} USD`}
            value={`${displayReserveRatio.toFixed(2)}%`}
            unit="PoR"
            badgeText={c.metricPorBadge}
            accent="amber"
          />
          <MetricGlassCard
            title={c.metricBurnTitle}
            subtitle={c.metricBurnSub}
            value={snapshot.totalBurnedAsdG.toLocaleString()}
            unit={c.metricBurnUnit}
            badgeText={c.metricBurnBadge}
            accent="cyan"
          />
          <MetricGlassCard
            title={c.metricFlowTitle}
            subtitle={`${c.metricFlowSubPrefix}: ${snapshot.tpsPulse} TPS`}
            value={`${snapshot.fourFlowAlignmentPct.toFixed(1)}%`}
            unit={c.metricFlowUnit}
            badgeText={c.metricFlowBadge}
            accent="purple"
          />
        </section>

        {(activeTab === 'ALL' || activeTab === 'USDFIRM') && (
          <UsdfirmProtocolHub
            initialBundle={liveBundle ?? undefined}
            initialErrorCode={initialBundleErrorCode}
            showStandaloneLink
            onBundleSync={handleLiveBundleSync}
          />
        )}
        {(activeTab === 'ALL' || activeTab === 'RUST_CHAIN') && (
          <RustChainCorePanel accounts={snapshot.accounts} />
        )}
        {(activeTab === 'ALL' || activeTab === 'FEDERATION') && (
          <FederationBusPanel nodes={snapshot.federationNodes} onSnapshotUpdate={handleSnapshotUpdate} />
        )}
        {(activeTab === 'ALL' || activeTab === 'VAULT_SWAP') && (
          <>
            <ReserveVaultPanel
              reserves={snapshot.reserves}
              reserveRatioPct={displayReserveRatio}
              onSnapshotUpdate={handleSnapshotUpdate}
            />
            <TokenSwapAndAccountsPanel
              accounts={snapshot.accounts}
              onSnapshotUpdate={handleSnapshotUpdate}
            />
          </>
        )}
        {(activeTab === 'ALL' || activeTab === 'SKILLS') && (
          <SkillBurnMatrix
            skills={snapshot.skills}
            totalBurnedAsdG={snapshot.totalBurnedAsdG}
            onSnapshotUpdate={handleSnapshotUpdate}
          />
        )}
        {(activeTab === 'ALL' || activeTab === 'ESCROW') && (
          <FourFlowTracker
            escrows={snapshot.escrowOrders}
            onSnapshotUpdate={handleSnapshotUpdate}
          />
        )}
        {(activeTab === 'ALL' || activeTab === 'DEVELOPER') && <DeveloperSdkPanel />}
        {(activeTab === 'ALL' || activeTab === 'LEDGER') && (
          <LedgerStreamPanel entries={snapshot.recentEntries} />
        )}
      </div>
    </div>
  );
}
