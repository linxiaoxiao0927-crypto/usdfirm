export type UiScalePreset = 85 | 90 | 100 | 110 | 120 | 130 | 140 | 150;
export type AccentSkinId = 'ios_blue' | 'emerald' | 'amber' | 'cyan';

export interface UiScaleOption {
  value: UiScalePreset;
  zh: string;
  en: string;
}

export interface AccentSkinOption {
  id: AccentSkinId;
  zh: string;
  en: string;
  badgeZh: string;
  badgeEn: string;
  hex: string;
  soft: string;
  onAccentHex: string;
}

export const UI_SCALE_OPTIONS: UiScaleOption[] = [
  { value: 85, zh: '85% · 超宽视野', en: '85% · Ultra Compact' },
  { value: 90, zh: '90% · 紧凑信息流', en: '90% · Compact' },
  { value: 100, zh: '100% · 默认标准', en: '100% · Default' },
  { value: 110, zh: '110% · 舒适大字', en: '110% · Comfortable' },
  { value: 120, zh: '120% · 清晰大号', en: '120% · Large' },
  { value: 130, zh: '130% · 高对比阅读', en: '130% · Larger' },
  { value: 140, zh: '140% · 关怀放大', en: '140% · Accessibility' },
  { value: 150, zh: '150% · 最大号', en: '150% · Maximum' },
];

export const ACCENT_SKIN_OPTIONS: AccentSkinOption[] = [
  {
    id: 'emerald',
    zh: '音乐曜石翡翠',
    en: 'Music Emerald Matrix',
    badgeZh: '默认主色',
    badgeEn: 'Default',
    hex: '#00DC6D',
    soft: 'rgba(0, 220, 109, 0.15)',
    onAccentHex: '#090A0F',
  },
  {
    id: 'amber',
    zh: '香槟暖金',
    en: 'Champagne Gold',
    badgeZh: '储备金',
    badgeEn: 'Gold',
    hex: '#D4A853',
    soft: 'rgba(212, 168, 83, 0.15)',
    onAccentHex: '#090A0F',
  },
  {
    id: 'cyan',
    zh: '青黛墨绿',
    en: 'Teal Matte',
    badgeZh: '极简青',
    badgeEn: 'Teal',
    hex: '#2DD4BF',
    soft: 'rgba(45, 212, 191, 0.15)',
    onAccentHex: '#090A0F',
  },
  {
    id: 'ios_blue',
    zh: '峡湾灰蓝',
    en: 'Fjord Slate',
    badgeZh: '低饱和',
    badgeEn: 'Slate',
    hex: '#93C5FD',
    soft: 'rgba(147, 197, 253, 0.15)',
    onAccentHex: '#090A0F',
  },
];

export interface UiPrefsState {
  scalePct: UiScalePreset;
  skin: AccentSkinId;
  swipeEnabled: boolean;
  compactMode: boolean;
}

export const DEFAULT_UI_PREFS: UiPrefsState = {
  scalePct: 100,
  skin: 'emerald',
  swipeEnabled: true,
  compactMode: false,
};

const STORAGE_SCALE_KEY = 'sm_ui_scale_pct';
const STORAGE_SKIN_KEY = 'sm_accent_skin_v2';
const STORAGE_SWIPE_KEY = 'sm_swipe_enabled';
const STORAGE_COMPACT_KEY = 'sm_compact_mode';
export const UI_PREFS_EVENT = 'sm:ui-prefs-changed';

const ALLOWED_SCALES = new Set<number>(UI_SCALE_OPTIONS.map((o) => o.value));
const ALLOWED_SKINS = new Set<string>(ACCENT_SKIN_OPTIONS.map((s) => s.id));

export function readUiPrefs(): UiPrefsState {
  if (typeof window === 'undefined') return DEFAULT_UI_PREFS;
  try {
    const rawScale = Number(window.localStorage.getItem(STORAGE_SCALE_KEY));
    const rawSkin = window.localStorage.getItem(STORAGE_SKIN_KEY) || '';
    const rawSwipe = window.localStorage.getItem(STORAGE_SWIPE_KEY);
    const rawCompact = window.localStorage.getItem(STORAGE_COMPACT_KEY);
    return {
      scalePct: ALLOWED_SCALES.has(rawScale)
        ? (rawScale as UiScalePreset)
        : DEFAULT_UI_PREFS.scalePct,
      skin: ALLOWED_SKINS.has(rawSkin)
        ? (rawSkin as AccentSkinId)
        : DEFAULT_UI_PREFS.skin,
      swipeEnabled: rawSwipe === null ? true : rawSwipe !== '0',
      compactMode: rawCompact === '1',
    };
  } catch {
    return DEFAULT_UI_PREFS;
  }
}

export function applyUiPrefs(prefs: UiPrefsState): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const scale = prefs.scalePct / 100;
  root.style.setProperty('--sofa-ui-scale', String(scale));
  root.style.fontSize = `${16 * scale}px`;
  root.dataset.smUiScale = String(prefs.scalePct);
  const skinCfg =
    ACCENT_SKIN_OPTIONS.find((s) => s.id === prefs.skin) ||
    ACCENT_SKIN_OPTIONS[0];
  root.style.setProperty('--sm-accent', skinCfg.hex);
  root.style.setProperty('--sm-accent-soft', skinCfg.soft);
  root.style.setProperty('--sm-accent-text', skinCfg.onAccentHex);
  root.dataset.smSkin = skinCfg.id;
  root.dataset.smCompact = prefs.compactMode ? '1' : '0';
}

export function persistUiPrefs(next: UiPrefsState): void {
  applyUiPrefs(next);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_SCALE_KEY, String(next.scalePct));
    window.localStorage.setItem(STORAGE_SKIN_KEY, next.skin);
    window.localStorage.setItem(
      STORAGE_SWIPE_KEY,
      next.swipeEnabled ? '1' : '0'
    );
    window.localStorage.setItem(
      STORAGE_COMPACT_KEY,
      next.compactMode ? '1' : '0'
    );
    window.dispatchEvent(
      new CustomEvent<UiPrefsState>(UI_PREFS_EVENT, { detail: next })
    );
  } catch {}
}

export const UI_PREF_BOOTSTRAP_SCRIPT = `(() => {
  try {
    var allowed = [85, 90, 100, 110, 120, 130, 140, 150];
    var s = Number(window.localStorage.getItem("${STORAGE_SCALE_KEY}"));
    var pct = allowed.indexOf(s) >= 0 ? s : 100;
    var root = document.documentElement;
    root.style.setProperty("--sofa-ui-scale", String(pct / 100));
    root.style.fontSize = (16 * pct / 100) + "px";
    var skins = {
      emerald: ["#00DC6D", "rgba(0,220,109,0.15)", "#090A0F"],
      amber: ["#D4A853", "rgba(212,168,83,0.15)", "#090A0F"],
      cyan: ["#2DD4BF", "rgba(45,212,191,0.15)", "#090A0F"],
      ios_blue: ["#93C5FD", "rgba(147,197,253,0.15)", "#090A0F"]
    };
    var sk = window.localStorage.getItem("${STORAGE_SKIN_KEY}") || "emerald";
    var cfg = skins[sk] || skins.emerald;
    root.style.setProperty("--sm-accent", cfg[0]);
    root.style.setProperty("--sm-accent-soft", cfg[1]);
    root.style.setProperty("--sm-accent-text", cfg[2]);
    if (window.localStorage.getItem("${STORAGE_COMPACT_KEY}") === "1") {
      root.dataset.smCompact = "1";
    }
  } catch (e) {}
})();`;
