"use client";

import React, { useState } from "react";
import {
  Check,
  ChevronDown,
  Globe,
  Hand,
  Layers,
  Minus,
  Monitor,
  Palette,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  ACCENT_SKIN_OPTIONS,
  DEFAULT_UI_PREFS,
  UI_SCALE_OPTIONS,
  type AccentSkinId,
  type UiPrefsState,
  type UiScalePreset,
} from "@/lib/uiPreferences";

interface SofaSettingsCenterProps {
  lang: "zh" | "en";
  onChangeLang: (next: "zh" | "en") => void;
  prefs: UiPrefsState;
  onUpdatePrefs: (next: UiPrefsState) => void;
  wsStatus: "CONNECTING" | "CONNECTED" | "DISCONNECTED";
  onlineClients: number;
  lastEventLabel: string;
  onRefreshNode: () => void;
  appName: string;
  domainPrimary: string;
  domainBackup: string;
  firewallNoteZh: string;
  firewallNoteEn: string;
}

export function SofaSettingsCenter({
  lang,
  onChangeLang,
  prefs,
  onUpdatePrefs,
  wsStatus,
  onlineClients,
  lastEventLabel,
  onRefreshNode,
  appName,
  domainPrimary,
  domainBackup,
  firewallNoteZh,
  firewallNoteEn,
}: SofaSettingsCenterProps) {
  const isZh = lang === "zh";
  const [scaleMenuOpen, setScaleMenuOpen] = useState(false);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  const scaleIdx = UI_SCALE_OPTIONS.findIndex(
    (o) => o.value === prefs.scalePct
  );
  const activeScaleOpt =
    UI_SCALE_OPTIONS[scaleIdx >= 0 ? scaleIdx : 2] || UI_SCALE_OPTIONS[2];

  const stepScale = (delta: number) => {
    const nextIdx = Math.min(
      UI_SCALE_OPTIONS.length - 1,
      Math.max(0, (scaleIdx >= 0 ? scaleIdx : 2) + delta)
    );
    onUpdatePrefs({
      ...prefs,
      scalePct: UI_SCALE_OPTIONS[nextIdx].value as UiScalePreset,
    });
  };

  const handleResetLocal = () => {
    try {
      window.sessionStorage.clear();
    } catch {}
    onUpdatePrefs(DEFAULT_UI_PREFS);
    onRefreshNode();
    setCacheNotice(
      isZh
        ? "已清理本地界面缓存，恢复 100% 缩放与音乐曜石翡翠默认皮肤"
        : "Local UI preferences & session cache restored to Emerald Matrix defaults."
    );
    window.setTimeout(() => setCacheNotice(null), 3200);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-8">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles
              className="w-5 h-5"
              style={{ color: "var(--sm-accent)" }}
            />
            <span>
              {isZh ? "控制中心与显示偏好" : "Settings & Display Control"}
            </span>
          </h2>
          <p className="text-xs text-white/55 mt-0.5">
            {isZh
              ? "SofaMusic 曜石翡翠控制台规范 · 无边框扁平色块与实时热切换"
              : "SofaMusic Emerald Matrix cockpit · flat borderless color blocks"}
          </p>
        </div>
        <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#00DC6D]/15 text-[#00DC6D]">
          EMERALD MATRIX
        </span>
      </div>

      {/* 1. UI & Font Scale (85% - 150%) */}
      <section className="sm-card rounded-3xl bg-[#1C1D21] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <Monitor className="w-4 h-4" style={{ color: "var(--sm-accent)" }} />
            <span>{isZh ? "界面与字体缩放" : "UI & Font Scale"}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => stepScale(-1)}
              disabled={scaleIdx <= 0}
              aria-label={isZh ? "缩小视图" : "Zoom out"}
              className="w-8 h-8 rounded-full bg-[#24262C] hover:bg-[#26272B] disabled:opacity-35 flex items-center justify-center text-white transition active:scale-95"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => stepScale(1)}
              disabled={scaleIdx >= UI_SCALE_OPTIONS.length - 1}
              aria-label={isZh ? "放大视图" : "Zoom in"}
              className="w-8 h-8 rounded-full bg-[#24262C] hover:bg-[#26272B] disabled:opacity-35 flex items-center justify-center text-white transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setScaleMenuOpen((v) => !v)}
          className="w-full px-4 py-3 rounded-2xl bg-[#24262C] hover:bg-[#26272B] flex items-center justify-between text-sm font-medium text-white transition"
        >
          <span>{isZh ? activeScaleOpt.zh : activeScaleOpt.en}</span>
          <ChevronDown
            className={`w-4 h-4 text-white/55 transition-transform ${
              scaleMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {scaleMenuOpen && (
          <div className="rounded-2xl bg-[#24262C] p-1.5 space-y-1">
            {UI_SCALE_OPTIONS.map((opt) => {
              const active = opt.value === prefs.scalePct;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onUpdatePrefs({ ...prefs, scalePct: opt.value });
                    setScaleMenuOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 text-sm text-left transition ${
                    active
                      ? "bg-[#00DC6D]/15 font-semibold text-[#00DC6D]"
                      : "text-white/75 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="w-4 flex items-center justify-center shrink-0">
                    {active && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span>{isZh ? opt.zh : opt.en}</span>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-xs text-white/50 leading-relaxed">
          {isZh
            ? "全局同步缩放资产仪表盘、审计表格、交互表单与底部毛玻璃导航栏。"
            : "Globally scales dashboards, audit ledgers, forms, and the frosted dock navigation."}
        </p>
      </section>

      {/* 2. Theme & Accent Skin */}
      <section className="sm-card rounded-3xl bg-[#1C1D21] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <Palette className="w-4 h-4" style={{ color: "var(--sm-accent)" }} />
            <span>
              {isZh ? "皮肤风格与强调色" : "Theme & Accent Skin"}
            </span>
          </span>
          <span className="text-[11px] text-white/50">
            {isZh ? "实时热切换" : "Instant Switch"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ACCENT_SKIN_OPTIONS.map((skin) => {
            const active = skin.id === prefs.skin;
            return (
              <button
                key={skin.id}
                type="button"
                onClick={() =>
                  onUpdatePrefs({ ...prefs, skin: skin.id as AccentSkinId })
                }
                className={`p-3.5 rounded-2xl text-left transition flex items-center justify-between gap-2 ${
                  active
                    ? "bg-[#26272B]"
                    : "bg-[#24262C] hover:bg-[#26272B]"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span className="truncate">
                      {isZh ? skin.zh : skin.en}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-white/75 shrink-0">
                      {isZh ? skin.badgeZh : skin.badgeEn}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-white/50 mt-1">
                    STAGE #111215 · {skin.hex}
                  </div>
                </div>
                <span
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: skin.hex }}
                >
                  {active && (
                    <Check
                      className="w-3.5 h-3.5"
                      style={{ color: skin.onAccentHex }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Language + Gesture + Density Controls */}
      <section className="sm-card rounded-3xl bg-[#1C1D21] p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe className="w-4 h-4" style={{ color: "var(--sm-accent)" }} />
              <span>{isZh ? "界面显示语言" : "Display Language"}</span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              {isZh
                ? "所有错误码、弹窗与提示 100% 遵循当前语言"
                : "100% locale-strict prompts, alerts, and error codes"}
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-full bg-[#24262C] shrink-0">
            <button
              type="button"
              onClick={() => onChangeLang("zh")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                isZh ? "bg-[#00DC6D] text-[#090A0F]" : "text-white/65 hover:text-white"
              }`}
            >
              中文
            </button>
            <button
              type="button"
              onClick={() => onChangeLang("en")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                !isZh ? "bg-[#00DC6D] text-[#090A0F]" : "text-white/65 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#24262C] p-3.5">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Hand className="w-4 h-4" style={{ color: "var(--sm-accent)" }} />
              <span>
                {isZh ? "框架左右手势丝滑切页" : "Swipe Gesture Navigation"}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              {isZh
                ? "在主内容区左右滑动即可如原生般顺滑切换视图"
                : "Swipe horizontally across pages for native-grade frame switching"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.swipeEnabled}
            onClick={() =>
              onUpdatePrefs({ ...prefs, swipeEnabled: !prefs.swipeEnabled })
            }
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
              prefs.swipeEnabled ? "bg-[#00DC6D]" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
                prefs.swipeEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#24262C] p-3.5">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers
                className="w-4 h-4"
                style={{ color: "var(--sm-accent)" }}
              />
              <span>
                {isZh ? "紧凑卡片排版密度" : "Compact Card Density"}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              {isZh
                ? "开启后缩小卡片内边距，单屏展示更多财务行"
                : "Tighter card padding to surface more telemetry per viewport"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.compactMode}
            onClick={() =>
              onUpdatePrefs({ ...prefs, compactMode: !prefs.compactMode })
            }
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
              prefs.compactMode ? "bg-[#00DC6D]" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
                prefs.compactMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      {/* 4. Sofa Connect Real-Time Node & Cache Recovery */}
      <section className="sm-card rounded-3xl bg-[#1C1D21] p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <Radio
              className={`w-4 h-4 ${
                wsStatus === "CONNECTED" ? "text-[#00DC6D]" : "text-[#FCD34D]"
              }`}
            />
            <span>
              {isZh ? "Sofa Connect 实时网关节点" : "Sofa Connect Edge Node"}
            </span>
          </span>
          <span
            className={`text-[11px] font-mono px-3 py-0.5 rounded-full ${
              wsStatus === "CONNECTED"
                ? "bg-[#00DC6D]/15 text-[#00DC6D]"
                : "bg-[#D4A853]/15 text-[#FCD34D]"
            }`}
          >
            {wsStatus === "CONNECTED"
              ? isZh
                ? `在线 · ${onlineClients} 节点`
                : `LIVE · ${onlineClients} peers`
              : isZh
              ? "自动重连中"
              : "RECONNECTING"}
          </span>
        </div>

        <div className="rounded-2xl bg-[#24262C] p-3.5 text-xs font-mono space-y-1.5 text-white/75">
          <div className="flex justify-between gap-2">
            <span className="text-white/50">
              {isZh ? "主节点域名" : "Primary Domain"}
            </span>
            <span className="text-white">{domainPrimary}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-white/50">
              {isZh ? "官方双活备域" : "Active Backup"}
            </span>
            <span className="text-[#00DC6D]">{domainBackup}</span>
          </div>
          {lastEventLabel && (
            <div className="flex justify-between gap-2">
              <span className="text-white/50">
                {isZh ? "最近实时事件" : "Latest Stream"}
              </span>
              <span className="text-[#67E8F9] truncate">{lastEventLabel}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onRefreshNode}
            className="px-4 py-2.5 rounded-full bg-[#00DC6D] hover:bg-[#19E67C] text-xs font-bold text-[#090A0F] flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isZh ? "立即刷新节点快照" : "Sync Edge Snapshot"}</span>
          </button>
          <button
            type="button"
            onClick={handleResetLocal}
            className="px-4 py-2.5 rounded-full bg-[#301B1D] hover:bg-[#3E2224] text-xs font-semibold text-[#FDA4AF] flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isZh ? "重置默认设置与缓存" : "Reset UI Defaults"}</span>
          </button>
        </div>

        {cacheNotice && (
          <div className="rounded-2xl sm-bento-emerald px-3.5 py-2.5 text-xs text-[#6EE7B7]">
            {cacheNotice}
          </div>
        )}
      </section>

      {/* 5. Web2.5 Compliance Firewall Card */}
      <section className="rounded-3xl sm-bento-emerald p-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#00DC6D]">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            {isZh
              ? `${appName} · Web2.5 物理合规隔离防火墙`
              : `${appName} · Web2.5 Physical Compliance Firewall`}
          </span>
        </div>
        <p className="text-xs text-white/75 leading-relaxed">
          {isZh ? firewallNoteZh : firewallNoteEn}
        </p>
      </section>
    </div>
  );
}
