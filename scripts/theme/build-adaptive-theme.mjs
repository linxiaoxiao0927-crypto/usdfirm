#!/usr/bin/env node
/**
 * ShineMight OS Universal Adaptive Theme Token Compiler v3
 * Supports Tailwind v4, Tailwind v3, Tailwind CDN, and plain CSS / static HTML.
 *
 * Self-contained (zero external dependencies) so every repo builds cleanly
 * both locally and on remote Vercel / Cloudflare Pages runners.
 *
 * Usage:
 *   node scripts/theme/build-adaptive-theme.mjs [--check] [--root <dir>] [--out <relPath>] [--tw tw4|tw3|cdn|plain] [--base dark|light|dual]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------ CLI args ------------------------------ */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const next = argv[i + 1];
      out[k] = next && !next.startsWith('--') ? next : true;
    }
  }
  return out;
}
const ARGS = parseArgs(process.argv.slice(2));
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(
  typeof ARGS.root === 'string'
    ? ARGS.root
    : fs.existsSync(path.join(process.cwd(), 'package.json')) || fs.existsSync(path.join(process.cwd(), 'index.html'))
    ? process.cwd()
    : path.resolve(HERE, '../..')
);

/* ------------------------------ 9 Matrix Palettes ------------------------------ */
const MATRIX_PALETTES = {
  black: {
    isDark: true,
    bgPrimary: '#000000',
    bgSecondary: '#121214',
    bgTertiary: '#1C1C1E',
    bgActive: '#26272B',
    textPrimary: '#FFFFFF',
    textSecondary: '#A1A1AA',
    accent: '#10B981',
    accentHover: '#34D399',
    accentSoft: 'rgba(16, 185, 129, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    glassBg: 'rgba(18, 18, 20, 0.88)',
    glassBorder: 'rgba(255, 255, 255, 0.10)',
    inputBg: 'rgba(255, 255, 255, 0.08)',
  },
  dark: {
    isDark: true,
    bgPrimary: '#090A0F',
    bgSecondary: '#12141C',
    bgTertiary: '#1B1E2B',
    bgActive: '#25293A',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    accent: '#10B981',
    accentHover: '#34D399',
    accentSoft: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.07)',
    glassBg: 'rgba(18, 20, 28, 0.84)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    inputBg: 'rgba(255, 255, 255, 0.075)',
  },
  light: {
    isDark: false,
    bgPrimary: '#F3F4F8',
    bgSecondary: '#FFFFFF',
    bgTertiary: '#E8EAF0',
    bgActive: '#DCE0EA',
    textPrimary: '#090D16',
    textSecondary: '#475569',
    accent: '#0A84FF',
    accentHover: '#0070E0',
    accentSoft: 'rgba(10, 132, 255, 0.12)',
    borderColor: 'rgba(15, 23, 42, 0.08)',
    glassBg: 'rgba(255, 255, 255, 0.88)',
    glassBorder: 'rgba(15, 23, 42, 0.08)',
    inputBg: 'rgba(15, 23, 42, 0.055)',
  },
  gray: {
    isDark: true,
    bgPrimary: '#181A20',
    bgSecondary: '#22252E',
    bgTertiary: '#2C303C',
    bgActive: '#363B4A',
    textPrimary: '#F9FAFB',
    textSecondary: '#CBD5E1',
    accent: '#38BDF8',
    accentHover: '#7DD3FC',
    accentSoft: 'rgba(56, 189, 248, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    glassBg: 'rgba(34, 37, 46, 0.84)',
    glassBorder: 'rgba(255, 255, 255, 0.09)',
    inputBg: 'rgba(255, 255, 255, 0.08)',
  },
  teal: {
    isDark: true,
    bgPrimary: '#061518',
    bgSecondary: '#0C2227',
    bgTertiary: '#133138',
    bgActive: '#1B4049',
    textPrimary: '#ECFEFF',
    textSecondary: '#99F6E4',
    accent: '#2DD4BF',
    accentHover: '#5EEAD4',
    accentSoft: 'rgba(45, 212, 191, 0.16)',
    borderColor: 'rgba(45, 212, 191, 0.12)',
    glassBg: 'rgba(12, 34, 39, 0.84)',
    glassBorder: 'rgba(45, 212, 191, 0.14)',
    inputBg: 'rgba(45, 212, 191, 0.08)',
  },
  purple: {
    isDark: true,
    bgPrimary: '#0E081A',
    bgSecondary: '#18102B',
    bgTertiary: '#23183E',
    bgActive: '#2F2152',
    textPrimary: '#FAF5FF',
    textSecondary: '#D8B4FE',
    accent: '#C084FC',
    accentHover: '#D8B4FE',
    accentSoft: 'rgba(192, 132, 252, 0.16)',
    borderColor: 'rgba(192, 132, 252, 0.12)',
    glassBg: 'rgba(24, 16, 43, 0.84)',
    glassBorder: 'rgba(192, 132, 252, 0.14)',
    inputBg: 'rgba(192, 132, 252, 0.08)',
  },
  orange: {
    isDark: true,
    bgPrimary: '#170B05',
    bgSecondary: '#24130A',
    bgTertiary: '#331B0F',
    bgActive: '#422415',
    textPrimary: '#FFF7ED',
    textSecondary: '#FDBA74',
    accent: '#FB923C',
    accentHover: '#FDBA74',
    accentSoft: 'rgba(251, 146, 60, 0.16)',
    borderColor: 'rgba(251, 146, 60, 0.12)',
    glassBg: 'rgba(36, 19, 10, 0.84)',
    glassBorder: 'rgba(251, 146, 60, 0.14)',
    inputBg: 'rgba(251, 146, 60, 0.08)',
  },
  red: {
    isDark: true,
    bgPrimary: '#18060A',
    bgSecondary: '#260C12',
    bgTertiary: '#36121B',
    bgActive: '#471925',
    textPrimary: '#FFF1F2',
    textSecondary: '#FDA4AF',
    accent: '#FB7185',
    accentHover: '#FDA4AF',
    accentSoft: 'rgba(251, 113, 133, 0.16)',
    borderColor: 'rgba(251, 113, 133, 0.12)',
    glassBg: 'rgba(38, 12, 18, 0.84)',
    glassBorder: 'rgba(251, 113, 133, 0.14)',
    inputBg: 'rgba(251, 113, 133, 0.08)',
  },
  yellow: {
    isDark: true,
    bgPrimary: '#151104',
    bgSecondary: '#221C08',
    bgTertiary: '#31280D',
    bgActive: '#403412',
    textPrimary: '#FEFCE8',
    textSecondary: '#FDE047',
    accent: '#FACC15',
    accentHover: '#FDE047',
    accentSoft: 'rgba(250, 204, 21, 0.16)',
    borderColor: 'rgba(250, 204, 21, 0.12)',
    glassBg: 'rgba(34, 28, 8, 0.84)',
    glassBorder: 'rgba(250, 204, 21, 0.14)',
    inputBg: 'rgba(250, 204, 21, 0.08)',
  },
};

/* ------------------------------ Built-in Tailwind Palette Table ------------------------------ */
const NEUTRAL_SCALES = ['gray', 'slate', 'zinc', 'neutral', 'stone'];
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const HUES = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];
const BRIGHT_HUES = new Set(['yellow', 'amber', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'orange']);
const DARK_500_HUES = new Set(['red', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']);

const FALLBACK_COLORS = {
  slate:   ['#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#64748b','#475569','#334155','#1e293b','#0f172a','#020617'],
  gray:    ['#f9fafb','#f3f4f6','#e5e7eb','#d1d5db','#9ca3af','#6b7280','#4b5563','#374151','#1f2937','#111827','#030712'],
  zinc:    ['#fafafa','#f4f4f5','#e4e4e7','#d4d4d8','#a1a1aa','#71717a','#52525b','#3f3f46','#27272a','#18181b','#09090b'],
  neutral: ['#fafafa','#f5f5f5','#e5e5e5','#d4d4d4','#a3a3a3','#737373','#525252','#404040','#262626','#171717','#0a0a0a'],
  stone:   ['#fafaf9','#f5f5f4','#e7e5e4','#d6d3d1','#a8a29e','#78716c','#57534e','#44403c','#292524','#1c1917','#0c0a09'],
  red:     ['#fef2f2','#fee2e2','#fecaca','#fca5a5','#f87171','#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d','#450a0a'],
  orange:  ['#fff7ed','#ffedd5','#fed7aa','#fdba74','#fb923c','#f97316','#ea580c','#c2410c','#9a3412','#7c2d12','#431407'],
  amber:   ['#fffbeb','#fef3c7','#fde68a','#fcd34d','#fbbf24','#f59e0b','#d97706','#b45309','#92400e','#78350f','#451a03'],
  yellow:  ['#fefce8','#fef9c3','#fef08a','#fde047','#facc15','#eab308','#ca8a04','#a16207','#854d0e','#713f12','#422006'],
  lime:    ['#f7fee7','#ecfccb','#d9f99d','#bef264','#a3e635','#84cc16','#65a30d','#4d7c0f','#3f6212','#365314','#1a2e05'],
  green:   ['#f0fdf4','#dcfce7','#bbf7d0','#86efac','#4ade80','#22c55e','#16a34a','#15803d','#166534','#14532d','#052e16'],
  emerald: ['#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981','#059669','#047857','#065f46','#064e3b','#022c22'],
  teal:    ['#f0fdfa','#ccfbf1','#99f6e4','#5eead4','#2dd4bf','#14b8a6','#0d9488','#0f766e','#115e59','#134e4a','#042f2e'],
  cyan:    ['#ecfeff','#cffafe','#a5f3fc','#67e8f9','#22d3ee','#06b6d4','#0891b2','#0e7490','#155e75','#164e63','#083344'],
  sky:     ['#f0f9ff','#e0f2fe','#bae6fd','#7dd3fc','#38bdf8','#0ea5e9','#0284c7','#0369a1','#075985','#0c4a6e','#082f49'],
  blue:    ['#eff6ff','#dbeafe','#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e40af','#1e3a8a','#172554'],
  indigo:  ['#eef2ff','#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81','#1e1b4b'],
  violet:  ['#f5f3ff','#ede9fe','#ddd6fe','#c4b5fd','#a78bfa','#8b5cf6','#7c3aed','#6d28d9','#5b21b6','#4c1d95','#2e1065'],
  purple:  ['#faf5ff','#f3e8ff','#e9d5ff','#d8b4fe','#c084fc','#a855f7','#9333ea','#7e22ce','#6b21a8','#581c87','#3b0764'],
  fuchsia: ['#fdf4ff','#fae8ff','#f5d0fe','#f0abfc','#e879f9','#d946ef','#c026d3','#a21caf','#86198f','#701a75','#4a044e'],
  pink:    ['#fdf2f8','#fce7f3','#fbcfe8','#f9a8d4','#f472b6','#ec4899','#db2777','#be185d','#9d174d','#831843','#500724'],
  rose:    ['#fff1f2','#ffe4e6','#fecdd3','#fda4af','#fb7185','#f43f5e','#e11d48','#be123c','#9f1239','#881337','#4c0519'],
};

/* ------------------------------ Color Math ------------------------------ */
function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}
const toLin = (v) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const fromLin = (v) => {
  const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(s * 255)));
};
function rgbToOklab({ r, g, b }) {
  const lr = toLin(r), lg = toLin(g), lb = toLin(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}
function oklabToHex({ L, a, b }) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  const r = fromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = fromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bb = fromLin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return '#' + [r, g, bb].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
const chromaOf = (lab) => Math.sqrt(lab.a * lab.a + lab.b * lab.b);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function isNeutral(lab) {
  const c = chromaOf(lab);
  return c < 0.045 || (lab.L < 0.28 && c < 0.056);
}
function bgBandDark(L) {
  if (L < 0.165) return 'primary';
  if (L < 0.215) return 'secondary';
  if (L < 0.27) return 'tertiary';
  return null;
}
function bgBandLight(L) {
  if (L > 0.96) return 'secondary';
  if (L > 0.90) return 'primary';
  if (L > 0.82) return 'tertiary';
  return null;
}
function lightValueForDarkAuthored(group, lab) {
  if (group === 'bg') {
    const band = bgBandDark(lab.L);
    if (band) return `var(--bg-${band})`;
    return oklabToHex({ L: clamp(1.21 - lab.L, 0.12, 0.92), a: lab.a * 0.6, b: lab.b * 0.6 });
  }
  return oklabToHex({ L: clamp(1.15 - lab.L, 0.17, 0.97), a: lab.a * 0.6, b: lab.b * 0.6 });
}
function darkValueForLightAuthored(group, lab) {
  if (group === 'bg') {
    const band = bgBandLight(lab.L);
    if (band) return `var(--bg-${band})`;
    return oklabToHex({ L: clamp(1.12 - lab.L, 0.12, 0.90), a: lab.a * 0.6, b: lab.b * 0.6 });
  }
  return oklabToHex({ L: clamp(1.12 - lab.L, 0.16, 0.96), a: lab.a * 0.6, b: lab.b * 0.6 });
}
function tintedDarkValueFor(group, hex, lab) {
  if (group !== 'bg') return null;
  const band = bgBandDark(lab.L);
  if (!band) return null;
  return `color-mix(in oklab, ${hex} 45%, var(--bg-${band}))`;
}

/* ------------------------------ Project Auto-Detection ------------------------------ */
const SKIP_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', 'out', 'ios', 'android', '.git', '.vercel',
  'coverage', '__pycache__', '.venv', 'venv', 'iOS26', 'sofayes-admin', 'dezi-os',
]);

function readConfig() {
  const cfgPath = path.join(ROOT, 'scripts/theme/theme.config.json');
  let cfg = {};
  if (fs.existsSync(cfgPath)) {
    try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch {}
  }
  const pkgPath = path.join(ROOT, 'package.json');
  let pkg = {};
  if (fs.existsSync(pkgPath)) {
    try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch {}
  }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const twVer = String(deps.tailwindcss || '');
  let twMode = (typeof ARGS.tw === 'string' ? ARGS.tw : cfg.twMode) || null;
  if (!twMode) {
    if (deps['@tailwindcss/vite'] || deps['@tailwindcss/postcss'] || /^[\^~]?4\./.test(twVer)) twMode = 'tw4';
    else if (/^[\^~]?3\./.test(twVer)) twMode = 'tw3';
    else {
      const idxHtml = path.join(ROOT, 'index.html');
      const h = fs.existsSync(idxHtml) ? fs.readFileSync(idxHtml, 'utf8') : '';
      twMode = h.includes('tailwindcss') ? 'cdn' : 'plain';
    }
  }
  let outRel = (typeof ARGS.out === 'string' ? ARGS.out : cfg.out) || null;
  if (!outRel) {
    if (fs.existsSync(path.join(ROOT, 'src/app/globals.css'))) outRel = 'src/app/theme-adaptive.generated.css';
    else if (fs.existsSync(path.join(ROOT, 'app/globals.css'))) outRel = 'app/theme-adaptive.generated.css';
    else if (fs.existsSync(path.join(ROOT, 'src/index.css'))) outRel = 'src/styles/theme-adaptive.generated.css';
    else if (fs.existsSync(path.join(ROOT, 'src/style.css'))) outRel = 'src/styles/theme-adaptive.generated.css';
    else if (fs.existsSync(path.join(ROOT, 'public/css/ieternal.css'))) outRel = 'public/css/theme-adaptive.generated.css';
    else outRel = 'theme-adaptive.generated.css';
  }
  const baseMode = (typeof ARGS.base === 'string' ? ARGS.base : cfg.baseMode) || 'auto';
  return { twMode, outPath: path.join(ROOT, outRel), outRel, baseMode };
}

function collectSourceFiles(rootDir, outFile) {
  const outAbs = path.resolve(outFile);
  const acc = [];
  function walk(dir, depth = 0) {
    if (depth > 8) return;
    let list;
    try { list = fs.readdirSync(dir); } catch { return; }
    for (const name of list) {
      if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
      const p = path.join(dir, name);
      if (path.resolve(p) === outAbs) continue;
      let st;
      try { st = fs.lstatSync(p); } catch { continue; }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        if (depth === 0 && name === 'scripts') continue;
        walk(p, depth + 1);
      } else if (/\.(tsx|ts|jsx|js|vue|html)$/.test(name) && st.size < 600_000) {
        if (name.endsWith('.generated.css') || name === 'matrix-theme.js' || name === 'tailwindcss.js') continue;
        acc.push(p);
      }
    }
  }
  walk(rootDir, 0);
  return acc;
}

/* ------------------------------ Scanning Regexes ------------------------------ */
const PROP_GROUP = {
  bg: 'bg', from: 'bg', via: 'bg', to: 'bg',
  text: 'fg', border: 'fg', divide: 'fg', ring: 'fg', outline: 'fg', fill: 'fg',
  stroke: 'fg', placeholder: 'fg', caret: 'fg', decoration: 'fg', accent: 'fg',
};
const PROPS_ALT = 'bg|text|border(?:-[xytblrse])?|divide(?:-[xy])?|ring|outline|fill|stroke|placeholder|caret|decoration|accent|from|via|to';

const HEX_CLASS_RE = new RegExp(
  `(?<![\\w\\-\\[\\]#/:.])((?:[a-z0-9-]+:)*)(!?)(${PROPS_ALT})-\\[#([0-9A-Fa-f]{3,8})\\](?:\\/(\\[?[0-9.]+%?\\]?))?(!?)(?![\\w\\-\\[\\]])`,
  'g'
);
const TW_NEUTRAL_RE = new RegExp(
  `(?<![\\w\\-\\[\\]#/:.])((?:[a-z0-9-]+:)*)(!?)(${PROPS_ALT})-(white|black|(?:${NEUTRAL_SCALES.join('|')})-(?:50|100|200|300|400|500|600|700|800|900|950))(?:\\/(\\[?[0-9.]+%?\\]?))?(!?)(?![\\w\\-\\[\\]/])`,
  'g'
);
const HUE_FG_RE = new RegExp(
  `(?<![\\w\\-\\[\\]#/:.])((?:[a-z0-9-]+:)*)(!?)(text|fill|stroke|placeholder|decoration|caret)-(${HUES.join('|')})-(50|100|200|300|400|500|600|700|800|900)(?:\\/(\\[?[0-9.]+%?\\]?))?(!?)(?![\\w\\-\\[\\]/])`,
  'g'
);
const BLACK_ALPHA_RE =
  /(?<![\w\-[\]#/:.])((?:[a-z0-9-]+:)*)!?(bg-black\/(?:\d{1,2}|\[0?\.\d+\]))(?![\w\-[\]])/g;
const FROM_BLACK_RE =
  /(?<![\w\-[\]#/:.])((?:[a-z0-9-]+:)*)!?(from-black(?:\/(?:\d{1,3}|\[0?\.\d+\]))?)(?![\w\-[\]])/g;
const ACCENT_RE = new RegExp(
  `(?<![\\w\\-\\[\\]#/:.])((?:[a-z0-9-]+:)*)!?((?:(?:bg|from)-(?:${HUES.join('|')})-(?:400|500|600|700|800|900|950)(?:\\/(?:6[0-9]|7[0-9]|8\\d|9\\d|100))?)|bg-accent)(?![\\w\\-\\[\\]/])`,
  'g'
);

function parseOpacity(raw) {
  if (!raw) return 1;
  const v = raw.replace(/[[\]%]/g, '');
  const n = parseFloat(v);
  if (Number.isNaN(n)) return 1;
  return raw.includes('.') && !raw.includes('%') && n <= 1 ? n : n / 100;
}
function cssEscape(cls) {
  return cls.replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c);
}

const SUPPORTED_VARIANTS = new Set([
  'hover', 'active', 'focus', 'focus-within', 'focus-visible', 'disabled',
  'placeholder', 'group-hover', 'peer-checked', 'max-md', 'max-sm', 'md', 'sm', 'lg', 'xl', '2xl', 'dark',
  'first', 'last', 'odd', 'even',
]);
const BREAKPOINTS = { sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem', '2xl': '96rem' };

function buildSelector(baseSel, variants, prefixRoot) {
  let sel = baseSel;
  const medias = [];
  let pseudoEl = '';
  let hasDark = false;
  let hasGroupHover = false;
  for (const v of variants) {
    switch (v) {
      case 'hover': sel += ':hover'; medias.push('(hover: hover)'); break;
      case 'active':
      case 'focus':
      case 'focus-within':
      case 'focus-visible':
      case 'disabled': sel += ':' + v; break;
      case 'first': sel += ':first-child'; break;
      case 'last': sel += ':last-child'; break;
      case 'odd': sel += ':nth-child(odd)'; break;
      case 'even': sel += ':nth-child(even)'; break;
      case 'placeholder': pseudoEl = '::placeholder'; break;
      case 'group-hover': hasGroupHover = true; medias.push('(hover: hover)'); break;
      case 'peer-checked': sel += ':is(:where(.peer):checked ~ *)'; break;
      case 'dark': hasDark = true; break;
      case 'max-sm': medias.push('(max-width: 39.999rem)'); break;
      case 'max-md': medias.push('(max-width: 47.999rem)'); break;
      default: if (BREAKPOINTS[v]) medias.push(`(min-width: ${BREAKPOINTS[v]})`);
    }
  }
  if (hasGroupHover) {
    sel = prefixRoot ? `.group:hover ${sel}` : `${sel}:is(:where(.group):hover *)`;
  }
  if (prefixRoot) {
    sel = hasDark ? `:is(html.dark) ${sel}` : `:is(html) ${sel}`;
  } else if (hasDark) {
    sel = `${sel}:where(.dark, .dark *)`;
  }
  return { sel: sel + pseudoEl, medias };
}

function declsFor(prop, value, important, twMode) {
  const imp = important ? ' !important' : '';
  const kind = prop.split('-')[0];
  const side = prop.includes('-') ? prop.split('-')[1] : '';
  const isTw4 = twMode === 'tw4';
  switch (kind) {
    case 'bg': return `background-color: ${value}${imp};`;
    case 'text': return `color: ${value}${imp};`;
    case 'border': {
      const map = {
        '': ['border-color'],
        x: ['border-left-color', 'border-right-color'],
        y: ['border-top-color', 'border-bottom-color'],
        t: ['border-top-color'],
        b: ['border-bottom-color'],
        l: ['border-left-color'],
        r: ['border-right-color'],
        s: ['border-inline-start-color'],
        e: ['border-inline-end-color'],
      };
      return (map[side] || map['']).map((p) => `${p}: ${value}${imp};`).join(' ');
    }
    case 'divide': return `border-color: ${value}${imp};`;
    case 'ring': return `--tw-ring-color: ${value}${imp};`;
    case 'outline': return `outline-color: ${value}${imp};`;
    case 'fill': return `fill: ${value}${imp};`;
    case 'stroke': return `stroke: ${value}${imp};`;
    case 'placeholder': return `color: ${value}${imp};`;
    case 'caret': return `caret-color: ${value}${imp};`;
    case 'decoration': return `text-decoration-color: ${value}${imp};`;
    case 'accent': return `accent-color: ${value}${imp};`;
    case 'from': return isTw4
      ? `--tw-gradient-from: ${value}${imp};`
      : `--tw-gradient-from: ${value} var(--tw-gradient-from-position)${imp};`;
    case 'via': return isTw4
      ? `--tw-gradient-via: ${value}${imp};`
      : `--tw-gradient-stops: var(--tw-gradient-from), ${value} var(--tw-gradient-via-position), var(--tw-gradient-to)${imp};`;
    case 'to': return isTw4
      ? `--tw-gradient-to: ${value}${imp};`
      : `--tw-gradient-to: ${value} var(--tw-gradient-to-position)${imp};`;
    default: return '';
  }
}

function isDarkMidTwAccent(cls) {
  if (cls === 'bg-accent') return false;
  const m = cls.match(/^(?:bg|from)-([a-z]+)-(\d{3})/);
  if (!m) return false;
  const [, hue, shade] = m;
  const n = parseInt(shade, 10);
  if (n >= 600) return true;
  if (n === 500 && DARK_500_HUES.has(hue)) return true;
  return false;
}

function loadRawPalettes() {
  const raw = {};
  const hueRaw = {};
  const twThemePath = path.join(ROOT, 'node_modules/tailwindcss/theme.css');
  const twCss = fs.existsSync(twThemePath) ? fs.readFileSync(twThemePath, 'utf8') : '';
  for (const scale of NEUTRAL_SCALES) {
    SHADES.forEach((shade, idx) => {
      const m = twCss.match(new RegExp(`--color-${scale}-${shade}:\\s*([^;]+);`));
      raw[`${scale}-${shade}`] = m ? m[1].trim() : FALLBACK_COLORS[scale][idx];
    });
  }
  for (const hue of HUES) {
    SHADES.forEach((shade, idx) => {
      const m = twCss.match(new RegExp(`--color-${hue}-${shade}:\\s*([^;]+);`));
      hueRaw[`${hue}-${shade}`] = m ? m[1].trim() : FALLBACK_COLORS[hue][idx];
    });
  }
  return { raw, hueRaw };
}

function hexToRgbTriplet(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

function emitPaletteBlocks(lines) {
  lines.push('/* ═══════════════════════════════════════════════════════════════════════════');
  lines.push(' * ShineMight OS · 9-Palette Full-Matrix Theme Engine (统一语义与 --sm-* 桥接)');
  lines.push(' * ═══════════════════════════════════════════════════════════════════════════ */');
  for (const [id, p] of Object.entries(MATRIX_PALETTES)) {
    lines.push(`html:root[data-matrix-palette="${id}"] {`);
    lines.push(`  color-scheme: ${p.isDark ? 'dark' : 'light'};`);
    lines.push(`  --bg-primary: ${p.bgPrimary};`);
    lines.push(`  --bg-secondary: ${p.bgSecondary};`);
    lines.push(`  --bg-tertiary: ${p.bgTertiary};`);
    lines.push(`  --text-primary: ${p.textPrimary};`);
    lines.push(`  --text-secondary: ${p.textSecondary};`);
    lines.push(`  --border-color: ${p.borderColor};`);
    lines.push(`  --glass-bg: ${p.glassBg};`);
    lines.push(`  --glass-border: ${p.glassBorder};`);
    lines.push(`  --accent: ${p.accent};`);
    /* Full --sm-* & common custom-property bridge across all 40+ matrix sites */
    lines.push(`  --sm-bg-root: ${p.bgPrimary};`);
    lines.push(`  --sm-bg-stage: ${p.bgPrimary};`);
    lines.push(`  --sm-bg-elevated-stage: ${p.bgSecondary};`);
    lines.push(`  --sm-bg-sidebar: ${p.bgSecondary};`);
    lines.push(`  --sm-bg-dock: ${p.glassBg};`);
    lines.push(`  --sm-block-1: ${p.bgSecondary};`);
    lines.push(`  --sm-block-2: ${p.bgTertiary};`);
    lines.push(`  --sm-block-active: ${p.bgActive};`);
    lines.push(`  --sm-input-bg: ${p.inputBg};`);
    lines.push(`  --sm-accent: ${p.accent};`);
    lines.push(`  --sm-accent-hover: ${p.accentHover};`);
    lines.push(`  --sm-accent-soft: ${p.accentSoft};`);
    lines.push(`  --sm-text-primary: ${p.textPrimary};`);
    lines.push(`  --sm-text-secondary: ${p.textSecondary};`);
    lines.push(`  --background: ${p.bgPrimary};`);
    lines.push(`  --foreground: ${p.textPrimary};`);
    lines.push(`  --background-rgb: ${hexToRgbTriplet(p.bgPrimary)};`);
    lines.push(`  --foreground-rgb: ${hexToRgbTriplet(p.textPrimary)};`);
    lines.push(`  --bg-color: ${p.bgPrimary};`);
    lines.push(`  --text-color: ${p.textPrimary};`);
    lines.push(`  --card-bg: ${p.bgSecondary};`);
    lines.push(`  --card-border: ${p.borderColor};`);
    lines.push(`  --bg: ${p.bgPrimary};`);
    lines.push(`  --glass: ${p.bgSecondary};`);
    lines.push(`  --glass-2: ${p.bgTertiary};`);
    lines.push(`  --text: ${p.textPrimary};`);
    lines.push(`  --muted: ${p.textSecondary};`);
    lines.push(`  --dim: ${p.isDark ? 'rgba(255, 255, 255, 0.50)' : 'rgba(15, 23, 42, 0.52)'};`);
    lines.push('}');
  }
  lines.push('html:root[data-matrix-palette], html:root[data-matrix-palette] body {');
  lines.push('  background-color: var(--bg-primary);');
  lines.push('  color: var(--text-primary);');
  lines.push('}');
  lines.push('');
}

/* ------------------------------ Main ------------------------------ */
function main() {
  const { twMode, outPath, outRel, baseMode: cfgBaseMode } = readConfig();
  const { raw, hueRaw } = loadRawPalettes();
  const files = collectSourceFiles(ROOT, outPath);

  /* Auto-detect dark vs light vs dual authoring */
  let baseMode = cfgBaseMode;
  if (baseMode === 'auto') {
    let darkHits = 0, lightHits = 0, darkPrefix = 0;
    for (const file of files) {
      const txt = fs.readFileSync(file, 'utf8');
      darkHits += (txt.match(/\b(?:bg-black|bg-(?:slate|zinc|gray|neutral|stone)-(?:900|950|800)|bg-\[#0[0-9a-fA-F]{5}\]|bg-\[#1[0-9a-fA-F]{5}\]|text-white)\b/g) || []).length;
      lightHits += (txt.match(/\b(?:bg-white|bg-(?:slate|zinc|gray|neutral|stone)-(?:50|100)|bg-\[#[fFeE][0-9a-fA-F]{5}\]|text-(?:slate|zinc|gray|neutral|stone)-(?:900|800)|text-black)\b/g) || []).length;
      darkPrefix += (txt.match(/\bdark:[a-z]+-/g) || []).length;
    }
    const total = Math.max(1, darkHits + lightHits);
    if (darkPrefix >= 60 && darkPrefix / total >= 0.14) baseMode = 'dual';
    else if (darkHits === 0 && lightHits > 20) baseMode = 'light';
    else if (lightHits > darkHits * 1.8 && lightHits >= 40) baseMode = 'light';
    else baseMode = 'dark';
  }

  const hueFgTargetForLight = (hue, shade) => {
    if (shade === '50') return '900';
    if (shade === '100' || shade === '200') return '800';
    if (shade === '300') return '700';
    if (shade === '400') return BRIGHT_HUES.has(hue) ? '700' : '600';
    if (shade === '500' && BRIGHT_HUES.has(hue)) return '700';
    return null;
  };
  const hueFgTargetForDark = (hue, shade) => {
    if (shade === '900') return '200';
    if (shade === '800') return '300';
    if (shade === '700') return '300';
    if (shade === '600') return '400';
    return null;
  };

  const utilityRules = new Map();
  const tokens = new Map();
  const hueFgTokens = new Map();
  const backdropBlackOps = new Map();
  const highScrimBlackClasses = new Set();
  const fromBlackScrimClasses = new Set();
  const accentClasses = new Set();
  const darkFillAutoWhite = new Set();
  const skipped = {};
  const needTw3NeutralRules = twMode === 'tw3' || twMode === 'cdn';

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');

    /* 1. Arbitrary hex utility classes */
    for (const m of text.matchAll(HEX_CLASS_RE)) {
      const [full, variantChain, impPre, prop, hexRaw, opRaw, impPost] = m;
      const variants = variantChain ? variantChain.split(':').filter(Boolean) : [];
      const unsupported = variants.filter((v) => !SUPPORTED_VARIANTS.has(v));
      if (unsupported.length) {
        skipped[unsupported.join(':')] = (skipped[unsupported.join(':')] || 0) + 1;
        continue;
      }
      const rgb = hexToRgb(hexRaw);
      if ([rgb.r, rgb.g, rgb.b].some(Number.isNaN)) continue;
      const lab = rgbToOklab(rgb);
      const alpha = rgb.a * parseOpacity(opRaw);

      if (!isNeutral(lab)) {
        if ((prop === 'bg' || prop === 'from') && variants.length === 0 && lab.L < 0.88 && alpha >= 0.65 && (chromaOf(lab) >= 0.075 || lab.L < 0.42)) {
          const clean = full.replace(/^!/, '');
          accentClasses.add(clean);
          if (lab.L < 0.65) darkFillAutoWhite.add(clean);
        }
        const kindC = prop.split('-')[0];
        if (PROP_GROUP[kindC] === 'fg') {
          const hex6c = '#' + [rgb.r, rgb.g, rgb.b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
          if ((baseMode === 'dark' || baseMode === 'dual') && lab.L > 0.56) {
            const tokenC = `--sfy-cfg-${hex6c.slice(1).toLowerCase()}`;
            if (!tokens.has(tokenC)) {
              tokens.set(tokenC, {
                raw: hex6c,
                light: oklabToHex({ L: Math.min(lab.L, 0.45), a: lab.a * 0.95, b: lab.b * 0.95 }),
                dark: null,
                tinted: null,
              });
            }
            const valueC = alpha >= 0.999 ? `var(${tokenC})` : `color-mix(in oklab, var(${tokenC}) ${Math.round(alpha * 1000) / 10}%, transparent)`;
            if (!utilityRules.has(full)) utilityRules.set(full, { prop, value: valueC, variants, important: Boolean(impPre || impPost) });
          } else if (baseMode === 'light' && lab.L < 0.52) {
            const tokenC = `--sfy-cfg-${hex6c.slice(1).toLowerCase()}`;
            if (!tokens.has(tokenC)) {
              tokens.set(tokenC, {
                raw: hex6c,
                light: null,
                dark: oklabToHex({ L: Math.max(lab.L, 0.74), a: lab.a * 0.95, b: lab.b * 0.95 }),
                tinted: null,
              });
            }
            const valueC = alpha >= 0.999 ? `var(${tokenC})` : `color-mix(in oklab, var(${tokenC}) ${Math.round(alpha * 1000) / 10}%, transparent)`;
            if (!utilityRules.has(full)) utilityRules.set(full, { prop, value: valueC, variants, important: Boolean(impPre || impPost) });
          }
        }
        continue;
      }

      const kind = prop.split('-')[0];
      const group = PROP_GROUP[kind] || 'fg';
      const hex6 = '#' + [rgb.r, rgb.g, rgb.b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

      if (baseMode === 'dark' && group === 'bg' && prop === 'bg' && lab.L < 0.165 && alpha >= 0.65 && alpha < 0.8) {
        if (variants.length === 0) highScrimBlackClasses.add(full.replace(/^!/, ''));
        continue;
      }

      const tokenName = `--sfy-${group}-${hex6.slice(1).toLowerCase()}`;
      if (!tokens.has(tokenName)) {
        tokens.set(tokenName, {
          raw: hex6,
          light: baseMode === 'dark' ? lightValueForDarkAuthored(group, lab) : null,
          dark: baseMode === 'light' ? darkValueForLightAuthored(group, lab) : null,
          tinted: baseMode !== 'light' ? tintedDarkValueFor(group, hex6, lab) : null,
        });
      }
      const value = alpha >= 0.999 ? `var(${tokenName})` : `color-mix(in oklab, var(${tokenName}) ${Math.round(alpha * 1000) / 10}%, transparent)`;
      if (!utilityRules.has(full)) utilityRules.set(full, { prop, value, variants, important: Boolean(impPre || impPost) });
    }

    /* 2. Tailwind v3 / CDN standard neutral classes (text-white, bg-black, bg-zinc-900, etc.) */
    if (needTw3NeutralRules) {
      for (const m of text.matchAll(TW_NEUTRAL_RE)) {
        const [full, variantChain, impPre, prop, colorKey, opRaw, impPost] = m;
        const variants = variantChain ? variantChain.split(':').filter(Boolean) : [];
        const unsupported = variants.filter((v) => !SUPPORTED_VARIANTS.has(v));
        if (unsupported.length) {
          skipped[unsupported.join(':')] = (skipped[unsupported.join(':')] || 0) + 1;
          continue;
        }
        const varRef = `var(--color-${colorKey})`;
        const alpha = parseOpacity(opRaw);
        const value = alpha >= 0.999 ? varRef : `color-mix(in oklab, ${varRef} ${Math.round(alpha * 1000) / 10}%, transparent)`;
        if (!utilityRules.has(full)) utilityRules.set(full, { prop, value, variants, important: Boolean(impPre || impPost) });
      }
    }

    /* 3. Foreground-ONLY hue adaptation */
    if (baseMode !== 'dual') {
      for (const m of text.matchAll(HUE_FG_RE)) {
        const [full, variantChain, impPre, prop, hue, shade, opRaw, impPost] = m;
        const targetShade = baseMode === 'dark' ? hueFgTargetForLight(hue, shade) : hueFgTargetForDark(hue, shade);
        if (!targetShade) continue;
        const variants = variantChain ? variantChain.split(':').filter(Boolean) : [];
        const unsupported = variants.filter((v) => !SUPPORTED_VARIANTS.has(v));
        if (unsupported.length) {
          skipped[unsupported.join(':')] = (skipped[unsupported.join(':')] || 0) + 1;
          continue;
        }
        const fgToken = `--sfy-fg-${hue}-${shade}`;
        if (!hueFgTokens.has(fgToken)) {
          hueFgTokens.set(fgToken, {
            rawVar: `var(--sfy-raw-${hue}-${shade})`,
            adaptedVar: `var(--sfy-raw-${hue}-${targetShade})`,
          });
        }
        const alpha = parseOpacity(opRaw);
        const value = alpha >= 0.999 ? `var(${fgToken})` : `color-mix(in oklab, var(${fgToken}) ${Math.round(alpha * 1000) / 10}%, transparent)`;
        if (!utilityRules.has(full)) utilityRules.set(full, { prop, value, variants, important: Boolean(impPre || impPost) });
      }
    }

    /* 4. bg-black/<op> & from-black* */
    for (const m of text.matchAll(BLACK_ALPHA_RE)) {
      if (m[1]) continue;
      const cls = m[2];
      const op = parseOpacity(cls.split('/')[1]);
      if (op >= 0.3 && op < 0.99) backdropBlackOps.set(cls, op);
      if (baseMode === 'dark' && op >= 0.65 && op < 0.8) highScrimBlackClasses.add(cls);
    }
    for (const m of text.matchAll(FROM_BLACK_RE)) {
      if (m[1]) continue;
      const cls = m[2];
      const op = cls.includes('/') ? parseOpacity(cls.split('/')[1]) : 1;
      if (op >= 0.55) fromBlackScrimClasses.add(cls);
    }

    /* 5. Saturated Tailwind solid / gradient accent classes */
    for (const m of text.matchAll(ACCENT_RE)) {
      if (m[1]) continue;
      const cls = m[2];
      accentClasses.add(cls);
      if (isDarkMidTwAccent(cls)) darkFillAutoWhite.add(cls);
    }
  }

  /* ------------------------------ Emit CSS ------------------------------ */
  const lines = [];
  lines.push('/* AUTO-GENERATED by ShineMight Adaptive Theme Compiler v3 — DO NOT EDIT BY HAND */');
  lines.push(`/* mode: ${twMode} · base: ${baseMode} · files: ${files.length} · tokens: ${tokens.size} · rules: ${utilityRules.size} */`);
  lines.push('');

  const neutralRawDecls = Object.entries(raw).map(([k, v]) => `  --sfy-raw-${k}: ${v};`);
  const neutralDefaultDecls = needTw3NeutralRules
    ? ['  --color-white: #ffffff;', '  --color-black: #000000;', ...Object.keys(raw).map((k) => `  --color-${k}: var(--sfy-raw-${k});`)]
    : [];
  const hueRawDecls = Object.entries(hueRaw).map(([k, v]) => `  --sfy-raw-${k}: ${v};`);
  const hueFgRawDecls = [...hueFgTokens].map(([n, t]) => `  ${n}: ${t.rawVar};`);
  const tokenRawDecls = [...tokens].map(([n, t]) => `  ${n}: ${t.raw};`);

  lines.push(':root {');
  lines.push(...neutralRawDecls, ...neutralDefaultDecls, ...hueRawDecls, ...hueFgRawDecls, ...tokenRawDecls);
  lines.push('}');
  lines.push('');

  emitPaletteBlocks(lines);

  const invertMapDarkToLight = {};
  SHADES.forEach((s, i) => (invertMapDarkToLight[s] = SHADES[SHADES.length - 1 - i]));
  const invertMapLightToDark = {
    '50': '950', '100': '900', '200': '800', '300': '700',
    '400': '400', '500': '400', '600': '300', '700': '200',
    '800': '100', '900': '50', '950': '50',
  };
  const activeInvertMap = baseMode === 'light' ? invertMapLightToDark : invertMapDarkToLight;
  const invertedNeutralDecls = [];
  for (const scale of NEUTRAL_SCALES) {
    for (const shade of SHADES) {
      if (raw[`${scale}-${shade}`]) {
        invertedNeutralDecls.push(`  --color-${scale}-${shade}: var(--sfy-raw-${scale}-${activeInvertMap[shade]});`);
      }
    }
  }
  const hueFgAdaptedDecls = [...hueFgTokens].map(([n, t]) => `  ${n}: ${t.adaptedVar};`);

  /* Shared ShineMight Matrix Bento/Velvet/Glass surface bridge (covers 35+ repos automatically) */
  lines.push('/* 共享矩阵卡片 / 丝绒色块 / 玻璃面板全主题自适应桥接 */');
  lines.push('html:root[data-theme-skin="light"] :is(.glass-panel, .glass-card, .matrix-glass-card, .obsidian-glass, .sm-dock-glass, .hmm-glass-surface, .rarity-common) {');
  lines.push('  background: var(--bg-secondary) !important;');
  lines.push('  border-color: var(--border-color) !important;');
  lines.push('  box-shadow: 0 10px 30px -12px rgba(15, 23, 42, 0.10) !important;');
  lines.push('}');
  lines.push('html:root[data-theme-skin="light"] :is(.glass-card-subtle, .glass-pill, .obsidian-surface, .matrix-elevated-card) {');
  lines.push('  background: var(--bg-tertiary) !important;');
  lines.push('  border-color: var(--border-color) !important;');
  lines.push('}');
  lines.push('html:root[data-theme-skin="light"] .studio-backdrop { background-color: var(--bg-primary) !important; }');
  lines.push('html:root[data-theme-skin="light"] .sm-input { color: var(--text-primary) !important; }');
  lines.push('html:root[data-theme-skin="light"] :is(.sm-bento-emerald, .bento-emerald, .sm-velvet-emerald, .velvet-emerald, .hmm-card-emerald) { background: linear-gradient(135deg, #E8F8F0 0%, #D9F2E5 100%) !important; border-color: rgba(16, 185, 129, 0.22) !important; }');
  lines.push('html:root[data-theme-skin="light"] :is(.sm-bento-slate, .bento-slate, .sm-velvet-slate, .velvet-slate) { background: linear-gradient(135deg, #EEF2F8 0%, #E2E9F4 100%) !important; border-color: rgba(15, 23, 42, 0.10) !important; }');
  lines.push('html:root[data-theme-skin="light"] :is(.sm-bento-amber, .bento-amber, .sm-velvet-amber, .velvet-amber, .hmm-card-gold, .rarity-mythic) { background: linear-gradient(135deg, #FEF6E7 0%, #FBEAD0 100%) !important; border-color: rgba(217, 119, 6, 0.22) !important; }');
  lines.push('html:root[data-theme-skin="light"] :is(.sm-bento-plum, .bento-plum, .sm-velvet-plum, .velvet-plum, .rarity-epic) { background: linear-gradient(135deg, #F5EEFA 0%, #ECE0F6 100%) !important; border-color: rgba(147, 51, 234, 0.20) !important; }');
  lines.push('html:root[data-theme-skin="light"] :is(.sm-bento-teal, .bento-teal, .sm-velvet-teal, .velvet-teal, .rarity-rare) { background: linear-gradient(135deg, #E7F7F8 0%, #D7EFF2 100%) !important; border-color: rgba(13, 148, 136, 0.22) !important; }');
  lines.push('html:root[data-theme-skin="light"] :is(.sm-bento-rose, .bento-rose, .sm-velvet-rose, .velvet-rose, .sm-bento-terracotta, .bento-terracotta, .sm-velvet-terracotta) { background: linear-gradient(135deg, #FCEEEF 0%, #F8DFE2 100%) !important; border-color: rgba(225, 29, 72, 0.20) !important; }');
  lines.push('html:root[data-theme-skin="dark"]:not([data-matrix-palette="black"]) :is(.glass-panel, .glass-card, .matrix-glass-card, .obsidian-glass, .sm-dock-glass, .hmm-glass-surface, .rarity-common) { background: var(--bg-secondary) !important; }');
  lines.push('html:root[data-theme-skin="dark"]:not([data-matrix-palette="black"]) :is(.glass-card-subtle, .glass-pill, .obsidian-surface, .matrix-elevated-card) { background: var(--bg-tertiary) !important; }');
  lines.push('html:root[data-theme-skin="dark"]:not([data-matrix-palette="black"]) .studio-backdrop { background-color: var(--bg-primary) !important; }');
  lines.push('');

  if (baseMode === 'dual') {
    const lightTokenDecls = [...tokens].filter(([, t]) => t.light).map(([n, t]) => `  ${n}: ${t.light};`);
    lines.push('/* 双主题项目亮白微调：强调色文本压暗保证 WCAG AA */');
    lines.push('html:root[data-theme-skin="light"] {');
    lines.push('  --color-accent: color-mix(in oklab, var(--accent), #000 26%);');
    lines.push(...lightTokenDecls);
    lines.push('}');
    lines.push('');
  }

  if (baseMode === 'dark') {
    const lightTokenDecls = [...tokens].filter(([, t]) => t.light).map(([n, t]) => `  ${n}: ${t.light};`);
    lines.push('/* 亮白主题：深色源码中性色按色彩角色反相 + 彩色亮字压暗 */');
    lines.push('html:root[data-theme-skin="light"] {');
    lines.push('  --color-white: var(--text-primary);');
    lines.push('  --color-black: var(--bg-primary);');
    lines.push('  --color-accent: color-mix(in oklab, var(--accent), #000 22%);');
    lines.push(...invertedNeutralDecls, ...hueFgAdaptedDecls, ...lightTokenDecls);
    lines.push('}');
    lines.push('');
  } else if (baseMode === 'light') {
    const darkTokenDecls = [...tokens].filter(([, t]) => t.dark).map(([n, t]) => `  ${n}: ${t.dark};`);
    lines.push('/* 深色主题：浅色源码中性色按色彩角色反相 + 深彩字提亮 */');
    lines.push('html:root[data-theme-skin="dark"] {');
    lines.push('  --color-white: var(--bg-secondary);');
    lines.push('  --color-black: var(--text-primary);');
    lines.push(...invertedNeutralDecls, ...hueFgAdaptedDecls, ...darkTokenDecls);
    lines.push('}');
    lines.push('');
  }

  if (baseMode === 'dark' || baseMode === 'dual') {
    const tintedNeutralDecls = [];
    for (const scale of NEUTRAL_SCALES) {
      if (raw[`${scale}-950`]) tintedNeutralDecls.push(`  --color-${scale}-950: color-mix(in oklab, var(--sfy-raw-${scale}-950) 35%, var(--bg-primary));`);
      if (raw[`${scale}-900`]) tintedNeutralDecls.push(`  --color-${scale}-900: color-mix(in oklab, var(--sfy-raw-${scale}-900) 40%, var(--bg-secondary));`);
      if (raw[`${scale}-800`]) tintedNeutralDecls.push(`  --color-${scale}-800: color-mix(in oklab, var(--sfy-raw-${scale}-800) 45%, var(--bg-tertiary));`);
    }
    const tintedDecls = [...tokens].filter(([, t]) => t.tinted).map(([n, t]) => `  ${n}: ${t.tinted};`);
    lines.push('/* 深色彩色主题 (暗黑/灰/蓝绿/紫/橙/红/黄)：深灰底自动染上主题色阶 */');
    lines.push('html:root[data-theme-skin="dark"]:not([data-matrix-palette="black"]) {');
    if (baseMode === 'dark') {
      lines.push('  --color-white: var(--text-primary);');
      lines.push('  --color-black: var(--bg-primary);');
    }
    lines.push(...tintedNeutralDecls, ...tintedDecls);
    lines.push('}');
    lines.push('');
  }

  const rawResetCore = [
    '  --color-white: #ffffff;',
    '  --color-black: #000000;',
    ...Object.keys(raw).map((k) => `  --color-${k}: var(--sfy-raw-${k});`),
    ...hueFgRawDecls,
    ...tokenRawDecls,
  ];

  /* Full dark scope: media overlays / video / camera / scrims */
  const fullDarkScopeSelectors = [
    '[data-scheme="dark"]',
    ':where(:has(> img, > video, > canvas, > picture)) > .absolute',
    ...[...fromBlackScrimClasses].sort().map((c) => `.absolute.${cssEscape(c)}`),
    ...[...highScrimBlackClasses].sort().map((c) => `.${cssEscape(c)}:not(.inset-0)`),
  ];
  lines.push('/* 完整深色作用域：媒体界面 / 图片浮层 / 高不透明深色角标 —— 永远保持深色原貌 */');
  lines.push(`:is(\n  ${fullDarkScopeSelectors.join(',\n  ')}\n) {`);
  lines.push('  color-scheme: dark;');
  lines.push('  --color-accent: var(--accent);');
  lines.push(...rawResetCore);
  lines.push('  --bg-primary: #000000;');
  lines.push('  --bg-secondary: #121214;');
  lines.push('  --bg-tertiary: #1C1C1E;');
  lines.push('  --text-primary: #FFFFFF;');
  lines.push('  --text-secondary: #A1A1AA;');
  lines.push('  --border-color: rgba(255, 255, 255, 0.10);');
  lines.push('  --glass-bg: rgba(18, 18, 20, 0.88);');
  lines.push('  --glass-border: rgba(255, 255, 255, 0.10);');
  lines.push('}');
  lines.push('');

  /* Saturated accent buttons / gradient tiles */
  const accentSelectors = [...accentClasses]
    .sort()
    .map((c) => (c.startsWith('from-') ? `.${cssEscape(c)}:not(.bg-clip-text)` : `.${cssEscape(c)}`));
  if (accentSelectors.length) {
    lines.push('/* 饱和强调色按钮 / 渐变功能磁贴：内部 text-white 永为纯白、text-black 永为纯黑 */');
    lines.push(`:is(\n  ${accentSelectors.join(',\n  ')}\n) {`);
    lines.push(...rawResetCore);
    lines.push('  --text-primary: #FFFFFF;');
    lines.push('  --text-secondary: rgba(255, 255, 255, 0.84);');
    lines.push('}');
    lines.push('');
  }

  /* Zero-specificity default white on dark/mid solid fills (explicit text-black always wins) */
  const autoWhiteSelectors = [...darkFillAutoWhite]
    .sort()
    .map((c) => (c.startsWith('from-') ? `.${cssEscape(c)}:not(.bg-clip-text)` : `.${cssEscape(c)}`));
  if (autoWhiteSelectors.length) {
    if (twMode === 'tw4') {
      lines.push('@layer base {');
      lines.push(`  :where(\n    ${autoWhiteSelectors.join(',\n    ')}\n  ) {`);
      lines.push('    color: #FFFFFF;');
      lines.push('  }');
      lines.push('}');
    } else {
      lines.push(`:where(\n  ${autoWhiteSelectors.join(',\n  ')}\n) {`);
      lines.push('  color: #FFFFFF;');
      lines.push('}');
    }
    lines.push('');
  }

  /* Escape hatches */
  lines.push('/* 亮白主题局部回归与原生双主题逃生舱 */');
  lines.push('html[data-theme-skin="light"] [data-scheme="app"] {');
  lines.push('  color-scheme: light;');
  lines.push('  --bg-primary: #F3F4F8;');
  lines.push('  --bg-secondary: #FFFFFF;');
  lines.push('  --bg-tertiary: #E8EAF0;');
  lines.push('  --text-primary: #090D16;');
  lines.push('  --text-secondary: #475569;');
  lines.push('  --border-color: rgba(15, 23, 42, 0.08);');
  lines.push('  --glass-bg: rgba(255, 255, 255, 0.88);');
  lines.push('  --glass-border: rgba(15, 23, 42, 0.08);');
  lines.push('  --color-white: #090D16;');
  lines.push('  --color-black: #F3F4F8;');
  lines.push('  --color-accent: color-mix(in oklab, var(--accent), #000 22%);');
  if (baseMode === 'dark') {
    const lightTokenDecls = [...tokens].filter(([, t]) => t.light).map(([n, t]) => `  ${n}: ${t.light};`);
    lines.push(...invertedNeutralDecls, ...hueFgAdaptedDecls, ...lightTokenDecls);
  }
  lines.push('}');
  lines.push('');
  lines.push('[data-scheme="native"] {');
  lines.push(...rawResetCore);
  lines.push('}');
  lines.push('');

  /* Utility class overrides */
  const prefixRoot = needTw3NeutralRules; // :is(html) .cls -> (0,1,1) cleanly beats Tailwind v3 (0,1,0) without !important
  const mediaGroups = new Map();
  for (const [cls, r] of utilityRules) {
    const baseSel = '.' + cssEscape(cls);
    const { sel, medias } = buildSelector(baseSel, r.variants, prefixRoot);
    let finalSel = sel;
    if (r.prop.startsWith('divide')) finalSel = `${sel} > :not(:last-child)`;
    const decl = declsFor(r.prop, r.value, r.important, twMode);
    if (!decl) continue;
    const key = medias.join(' and ');
    if (!mediaGroups.has(key)) mediaGroups.set(key, []);
    mediaGroups.get(key).push(`  ${finalSel} { ${decl} }`);
  }

  const ruleBody = [];
  if (mediaGroups.has('')) ruleBody.push(...mediaGroups.get(''));
  for (const [media, rules] of mediaGroups) {
    if (!media) continue;
    ruleBody.push(`  @media ${media} {`);
    ruleBody.push(...rules.map((r) => '  ' + r));
    ruleBody.push('  }');
  }
  if (baseMode === 'dark') {
    for (const [cls, op] of [...backdropBlackOps].sort()) {
      const rounded = Math.round(op * 1000) / 1000;
      ruleBody.push(
        `  html[data-theme-skin="light"] :is(.fixed, .absolute).inset-0.${cssEscape(cls)} { background-color: rgb(0 0 0 / ${rounded}); }`
      );
    }
  }

  if (twMode === 'tw4') {
    lines.push('@layer utilities {');
    lines.push(...ruleBody);
    lines.push('}');
  } else {
    lines.push(...ruleBody.map((l) => (l.startsWith('  ') ? l.slice(2) : l)));
  }
  lines.push('');

  /* Built-in CSS integrity self-check */
  const nextCss = lines.join('\n');
  for (const l of lines) {
    const t = l.trim();
    if (t.startsWith('/*') && t.endsWith('*/')) {
      const inner = t.slice(2, -2);
      if (inner.includes('/*') || inner.includes('*/')) {
        throw new Error(`Invalid nested comment token in generated CSS: ${l}`);
      }
    }
  }
  const stripped = nextCss.replace(/\/\*[\s\S]*?\*\//g, '');
  if ((stripped.match(/\{/g) || []).length !== (stripped.match(/\}/g) || []).length) {
    throw new Error('Unbalanced braces in generated adaptive theme CSS');
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (ARGS.check) {
    const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
    if (current !== nextCss) {
      console.error(`[theme:check] ${outRel} is out of date — run npm run theme:build`);
      process.exit(1);
    }
    console.log(`[theme:check] OK (${twMode}/${baseMode}, ${utilityRules.size} rules)`);
    return;
  }
  fs.writeFileSync(outPath, nextCss);
  console.log(
    JSON.stringify({
      root: path.basename(ROOT),
      out: outRel,
      twMode,
      baseMode,
      files: files.length,
      tokens: tokens.size,
      hueFg: hueFgTokens.size,
      rules: utilityRules.size,
      accent: accentClasses.size,
      skipped: Object.keys(skipped).length,
    })
  );
}

main();
