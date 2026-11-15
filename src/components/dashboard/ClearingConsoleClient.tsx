'use client';

import React, { startTransition, useCallback, useEffect, useState } from 'react';
import {
  AlertOctagon,
  ChevronLeft,
  Coins,
  Globe,
  Layers,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import type { LedgerSnapshot } from '@/types/ledger';
import type { UsdfirmProtocolBundle } from '@/lib/usdfirm/types';
import {
  extractErrorCode,
  useUsdfirmLocale,
} from '@/lib/usdfirm/i18n';
import {
  DEFAULT_UI_PREFS,
  UI_PREFS_EVENT,
  applyUiPrefs,
  persistUiPrefs,
  readUiPrefs,
  type UiPrefsState,
} from '@/lib/uiPreferences';
import { BilingualErrorBoundary } from '@/components/ui/BilingualErrorBoundary';
import {
  LiquidGlassTabBar,
  type UsdfMainTab,
} from '@/components/ui/LiquidGlassTabBar';
import { SwipeTabFrame } from '@/components/ui/SwipeTabFrame';
import { SofaSettingsCenter } from '@/components/ui/SofaSettingsCenter';
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

const USDF_MAIN_TABS: readonly UsdfMainTab[] = [
  'overview',
  'vault',
  'federation',
  'ledger',
  'settings',
];

function mapModuleToMainTab(tab: ModuleTab): UsdfMainTab {
  if (tab === 'VAULT_SWAP') return 'vault';
  if (tab === 'FEDERATION' || tab === 'ESCROW') return 'federation';
  if (tab === 'LEDGER') return 'ledger';
  return 'overview';
}

export function ClearingConsoleClient({
  initialSnapshot,
  initialBundle = null,
  initialBundleErrorCode = null,
  initialTab = 'ALL',
}: ClearingConsoleClientProps) {
  const { locale, setLocale, toggleLocale, copy, resolveError } =
    useUsdfirmLocale();
  const c = copy.console;

  const [snapshot, setSnapshot] = useState<LedgerSnapshot>(initialSnapshot);
  const [liveBundle, setLiveBundle] = useState<UsdfirmProtocolBundle | null>(
    initialBundle ?? null
  );
  const [activeTab, setActiveTab] = useState<ModuleTab>(initialTab);
  const [mainTab, setMainTab] = useState<UsdfMainTab>(() =>
    mapModuleToMainTab(initialTab)
  );
  const [uiPrefs, setUiPrefs] = useState<UiPrefsState>(DEFAULT_UI_PREFS);
  const [viewState, setViewState] = useState<'SUCCESS' | 'LOADING' | 'ERROR'>(
    'SUCCESS'
  );
  const [errorCode, setErrorCode] = useState<string>('');

  useEffect(() => {
    const initial = readUiPrefs();
    setUiPrefs(initial);
    applyUiPrefs(initial);
    const onSync = (ev: Event) => {
      const detail = (ev as CustomEvent<UiPrefsState>).detail;
      if (detail) setUiPrefs(detail);
    };
    window.addEventListener(UI_PREFS_EVENT, onSync);
    return () => window.removeEventListener(UI_PREFS_EVENT, onSync);
  }, []);

  const handleUpdatePrefs = useCallback((next: UiPrefsState) => {
    setUiPrefs(next);
    persistUiPrefs(next);
  }, []);

  const handleSelectMainTab = useCallback((next: UsdfMainTab) => {
    startTransition(() => {
      setMainTab(next);
      if (next === 'overview') {
        setActiveTab((prev) =>
          prev === 'VAULT_SWAP' ||
          prev === 'FEDERATION' ||
          prev === 'ESCROW' ||
          prev === 'LEDGER'
            ? 'USDFIRM'
            : prev
        );
      } else if (next === 'vault') {
        setActiveTab('VAULT_SWAP');
      } else if (next === 'federation') {
        setActiveTab('FEDERATION');
      } else if (next === 'ledger') {
        setActiveTab('LEDGER');
      }
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleSelectModuleTab = useCallback((next: ModuleTab) => {
    startTransition(() => {
      setActiveTab(next);
      setMainTab(mapModuleToMainTab(next));
    });
  }, []);

  const handleSnapshotUpdate = (nextSnap: LedgerSnapshot) => {
    setSnapshot(nextSnap);
    setViewState('SUCCESS');
  };

  const handleLiveBundleSync = useCallback((bundle: UsdfirmProtocolBundle) => {
    setLiveBundle(bundle);
  }, []);

  const syncLedger = useCallback(async () => {
    setViewState('LOADING');
    setErrorCode('');
    try {
      const res = await fetch('/api/v1/ledger', {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
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
  }, []);

  const displayCirculating =
    liveBundle?.attestation.circulatingUsdf ?? snapshot.circulatingAsdS;
  const displayReservesUsd =
    liveBundle?.attestation.totalReservesUsd ?? snapshot.totalReserveUsd;
  const displayReserveRatio =
    liveBundle?.attestation.reserveRatioPct ?? snapshot.reserveRatioPct;

  return (
    <div className="relative min-h-screen bg-[#111215] text-[#F4F4F6] flex flex-col overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-[#141519]/88 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-[max(10px,env(safe-area-inset-top))] pb-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (mainTab !== 'overview') {
                  handleSelectMainTab('overview');
                } else {
                  void syncLedger();
                }
              }}
              aria-label={
                mainTab !== 'overview'
                  ? locale === 'zh'
                    ? '返回总览'
                    : 'Back to Overview'
                  : 'USDFirm'
              }
              className="w-10 h-10 rounded-full bg-[#1C1D21] hover:bg-[#24262C] flex items-center justify-center text-white active:scale-95 transition shrink-0"
            >
              {mainTab !== 'overview' ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <Coins className="w-4 h-4 text-[#00DC6D]" />
              )}
            </button>

            <div className="flex items-center gap-2 min-w-0 px-3.5 py-1.5 rounded-full bg-[#1C1D21]">
              <span className="text-sm font-semibold tracking-tight text-white truncate">
                USDFirm
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00DC6D] shrink-0" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void syncLedger()}
              aria-label={c.syncLedger}
              className="w-10 h-10 rounded-full bg-[#1C1D21] hover:bg-[#24262C] flex items-center justify-center text-white active:scale-95 transition"
            >
              <RefreshCw
                className={`w-4 h-4 text-[#00DC6D] ${viewState === 'LOADING' ? 'animate-spin' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={toggleLocale}
              aria-label={locale === 'zh' ? 'Switch to English' : '切换至中文'}
              className="h-10 px-3.5 rounded-full bg-[#1C1D21] hover:bg-[#24262C] flex items-center justify-center gap-1.5 text-xs font-mono font-semibold text-white active:scale-95 transition"
            >
              <Globe className="w-3.5 h-3.5 text-[#00DC6D]" />
              <span>{locale === 'zh' ? 'EN' : '中'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleSelectMainTab(mainTab === 'settings' ? 'overview' : 'settings')
              }
              aria-label={locale === 'zh' ? '设置与皮肤' : 'Settings'}
              className="w-10 h-10 rounded-full bg-[#1C1D21] hover:bg-[#24262C] flex items-center justify-center text-white active:scale-95 transition"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#00DC6D]" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pt-3 pb-28 space-y-5">
        <BilingualErrorBoundary lang={locale}>
          <SwipeTabFrame
            tabs={USDF_MAIN_TABS}
            activeTab={mainTab}
            onChangeTab={handleSelectMainTab}
            enabled={uiPrefs.swipeEnabled}
          >
            {mainTab === 'settings' ? (
              <SofaSettingsCenter
                lang={locale}
                onChangeLang={setLocale}
                prefs={uiPrefs}
                onUpdatePrefs={handleUpdatePrefs}
                wsStatus={liveBundle ? 'CONNECTED' : 'CONNECTING'}
                onlineClients={liveBundle?.onlineClients ?? 1}
                lastEventLabel={c.pegPill}
                onRefreshNode={() => void syncLedger()}
                appName="USDFirm"
                domainPrimary="usdfirm.com"
                domainBackup="usdfirm-rt-protocol.workers.dev"
                firewallNoteZh="usdfirm.com 仅承载美元稳定币 (USDF) 底层铸造/销毁协议、3-of-5 多签时间锁与储备金证明 (PoR)；撮合交易隔离于 itisdeal.com，生息治理隔离于 itiscoin.com，法币支付入口隔离于 xpayes.com。"
                firewallNoteEn="usdfirm.com strictly handles USDF issuance/burn, 3-of-5 timelock multi-sig, and Proof-of-Reserves (PoR). Matching is isolated on itisdeal.com, yield governance on itiscoin.com, and payments on xpayes.com."
              />
            ) : (
              <div className="space-y-5">
                <section className="rounded-3xl bg-[#1C1D21] p-5 sm:p-6 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D]/15 px-3 py-1 text-xs font-mono font-semibold text-[#00DC6D]">
                      <span className="h-2 w-2 rounded-full bg-[#00DC6D]" />
                      {c.badge}
                    </span>
                    <span className="rounded-full bg-[#D4A853]/15 px-3 py-1 text-xs font-mono text-[#FCD34D]">
                      {c.pegPill}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                    USDFirm.com{' '}
                    <span className="text-white/60 font-normal text-base sm:text-lg">
                      {c.pageTitleSub}
                    </span>
                  </h1>
                  <p className="text-xs text-white/65 leading-relaxed">{c.subtitle}</p>
                </section>

                <nav
                  aria-label={c.viewScope}
                  className="flex items-center gap-1.5 rounded-full bg-[#1C1D21] p-1.5 overflow-x-auto no-scrollbar"
                >
                  <span className="px-2.5 text-xs text-white/55 flex items-center gap-1 shrink-0">
                    <Layers className="w-3.5 h-3.5 text-[#00DC6D]" />
                    {c.viewScope}
                  </span>
                  {MODULE_TAB_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectModuleTab(key)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition shrink-0 ${
                        activeTab === key
                          ? 'bg-[#00DC6D] text-[#090A0F] font-bold'
                          : 'bg-white/[0.055] text-white/70 hover:bg-white/[0.10] hover:text-white'
                      }`}
                    >
                      {c.tabs[key]}
                    </button>
                  ))}
                </nav>

                {viewState === 'ERROR' && (
                  <div
                    role="alert"
                    className="rounded-3xl sm-bento-rose p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[#FDA4AF] font-bold text-sm">
                        <AlertOctagon className="w-5 h-5 shrink-0" />
                        <span>{c.errorAlertTitle}</span>
                      </div>
                      <p className="text-xs text-white/80">{resolveError(errorCode)}</p>
                      {errorCode && (
                        <code className="inline-block rounded-lg bg-black/30 px-2 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
                          {errorCode}
                        </code>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void syncLedger()}
                      className="shrink-0 rounded-full bg-[#00DC6D] hover:bg-[#19E67C] px-4 py-2 text-xs font-bold text-[#090A0F] transition"
                    >
                      {c.reconnectBtn}
                    </button>
                  </div>
                )}

                {mainTab === 'overview' && (
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
                )}

                {(mainTab === 'overview' && (activeTab === 'ALL' || activeTab === 'USDFIRM')) && (
                  <UsdfirmProtocolHub
                    initialBundle={liveBundle ?? undefined}
                    initialErrorCode={initialBundleErrorCode}
                    showStandaloneLink
                    onBundleSync={handleLiveBundleSync}
                  />
                )}
                {(mainTab === 'overview' && (activeTab === 'ALL' || activeTab === 'RUST_CHAIN')) && (
                  <RustChainCorePanel accounts={snapshot.accounts} />
                )}
                {((mainTab === 'federation' && activeTab !== 'ESCROW') ||
                  (mainTab === 'overview' && activeTab === 'ALL')) && (
                  <FederationBusPanel
                    nodes={snapshot.federationNodes}
                    onSnapshotUpdate={handleSnapshotUpdate}
                  />
                )}
                {(mainTab === 'vault' || (mainTab === 'overview' && activeTab === 'ALL')) && (
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
                {(mainTab === 'overview' && (activeTab === 'ALL' || activeTab === 'SKILLS')) && (
                  <SkillBurnMatrix
                    skills={snapshot.skills}
                    totalBurnedAsdG={snapshot.totalBurnedAsdG}
                    onSnapshotUpdate={handleSnapshotUpdate}
                  />
                )}
                {((mainTab === 'federation' && activeTab === 'ESCROW') ||
                  mainTab === 'federation' ||
                  (mainTab === 'overview' && activeTab === 'ALL')) && (
                  <FourFlowTracker
                    escrows={snapshot.escrowOrders}
                    onSnapshotUpdate={handleSnapshotUpdate}
                  />
                )}
                {(mainTab === 'overview' && (activeTab === 'ALL' || activeTab === 'DEVELOPER')) && (
                  <DeveloperSdkPanel />
                )}
                {(mainTab === 'ledger' || (mainTab === 'overview' && activeTab === 'ALL')) && (
                  <LedgerStreamPanel entries={snapshot.recentEntries} />
                )}
              </div>
            )}
          </SwipeTabFrame>
        </BilingualErrorBoundary>
      </div>

      <LiquidGlassTabBar
        lang={locale}
        activeTab={mainTab}
        onSelectTab={handleSelectMainTab}
      />
    </div>
  );
}
