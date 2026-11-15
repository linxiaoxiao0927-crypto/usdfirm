
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface GatePolicy {
  domain: string;
  mode: 'maintenance' | 'brand' | 'live';
  brand_name_zh: string;
  brand_name_en: string;
  tagline_zh: string;
  tagline_en: string;
  notice_zh: string;
  notice_en: string;
  contact_email: string;
}

const GATE_CACHE = new Map<string, { ts: number; data: GatePolicy }>();
const CACHE_TTL_MS = 3000;

function normalizeHost(rawHost: string): string {
  let h = String(rawHost || '').toLowerCase().trim().split(':')[0] || '';
  if (h.startsWith('www.')) h = h.slice(4);
  if (h === 'data.shinemight.com') return 'shinemight.com';
  if (h === 'ytdlp.hllo.cn') return 'hllo.cn';
  return h;
}

function fallbackBrandFromHost(domain: string): [string, string] {
  const map: Record<string, [string, string]> = {
    'sofayes.com': ['SofaYes', 'SofaYes'],
    'marrychat.com': ['MarryChat', 'MarryChat'],
    'novelyes.com': ['NovelYes', 'NovelYes'],
    'ieternal.life': ['iEternal', 'iEternal'],
    'xmyall.com': ['XMyAll', 'XMyAll'],
    'xpayes.com': ['XPayes', 'XPayes'],
    'itisdeal.com': ['ItisDeal', 'ItisDeal'],
    'usdfirm.com': ['USDFirm', 'USDFirm'],
    'itiscoin.com': ['ItisCoin', 'ItisCoin'],
    'asdcoin.com': ['ASDCoin', 'ASDCoin'],
    'fitjob.ai': ['FitJob', 'FitJob'],
    'aiads.chat': ['AIAds', 'AIAds'],
    'idles.site': ['Idles', 'Idles'],
    'hmm.sale': ['Hmm.Sale', 'Hmm.Sale'],
    'dezi.life': ['嘚滋 DEZI', 'DEZI'],
    'decdics.com': ['DECDICS', 'DECDICS'],
    'lookplum.com': ['望梅 LookPlum', 'LookPlum'],
    'trelry.com': ['Trelry', 'Trelry'],
    'skomolr.com': ['Skomolr', 'Skomolr'],
    'persntrny.com': ['佩袭妮 Persntrny', 'Persntrny'],
    'shinemight.com': ['ShineMight', 'ShineMight'],
    'seeok.cn': ['SeeOK', 'SeeOK'],
    'xallin.xyz': ['XAllIn', 'XAllIn'],
    'alledu.xyz': ['AllEdu', 'AllEdu'],
    'ailedu.xyz': ['AilEdu', 'AilEdu'],
    'xteacher.xyz': ['XTeacher', 'XTeacher'],
    'hllo.cn': ['Hllo', 'Hllo'],
  };
  if (map[domain]) return map[domain];
  const base = domain.split('.')[0] || 'Service';
  const cap = base.charAt(0).toUpperCase() + base.slice(1);
  return [cap, cap];
}

function defaultGate(domain: string): GatePolicy {
  const [bzh, ben] = fallbackBrandFromHost(domain);
  return {
    domain,
    mode: 'maintenance',
    brand_name_zh: bzh,
    brand_name_en: ben,
    tagline_zh: '新一代独立数字体验空间',
    tagline_en: 'Independent Digital Experience Studio',
    notice_zh: '系统维护中，正在更新升级',
    notice_en: 'System is currently under maintenance and updating.',
    contact_email: '',
  };
}

async function fetchGatePolicy(domain: string): Promise<GatePolicy> {
  const now = Date.now();
  const hit = GATE_CACHE.get(domain);
  if (hit && now - hit.ts < CACHE_TTL_MS) {
    return hit.data;
  }
  const sbUrl = process.env.STEALTH_SUPABASE_URL;
  const sbAnon = process.env.STEALTH_SUPABASE_ANON_KEY;
  if (!sbUrl || !sbAnon) {
    return defaultGate(domain);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(`${sbUrl}/rest/v1/rpc/get_stealth_gate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: sbAnon,
        Authorization: `Bearer ${sbAnon}`,
      },
      body: JSON.stringify({ p_host: domain }),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return hit ? hit.data : defaultGate(domain);
    const data = (await res.json()) as Partial<GatePolicy> | null;
    if (!data || typeof data !== 'object' || !data.mode) {
      return defaultGate(domain);
    }
    const normalized: GatePolicy = {
      ...defaultGate(domain),
      ...data,
      domain: data.domain || domain,
    };
    GATE_CACHE.set(domain, { ts: now, data: normalized });
    return normalized;
  } catch {
    clearTimeout(timer);
    return hit ? hit.data : defaultGate(domain);
  }
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyPreviewToken(domain: string, token: string): Promise<boolean> {
  const secret = process.env.STEALTH_PREVIEW_SECRET;
  if (!secret || !token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const exp = Number(parts[0]);
  const sig = parts[1] || '';
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = await hmacHex(secret, `prv|${domain}|${exp}`);
  if (timingSafeEq(expected, sig)) return true;
  const wildcard = await hmacHex(secret, `prv|*|${exp}`);
  return timingSafeEq(wildcard, sig);
}

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function detectZh(request: NextRequest): boolean {
  const accept = (request.headers.get('accept-language') || '').toLowerCase();
  if (!accept) return true;
  const zhIdx = accept.indexOf('zh');
  const enIdx = accept.indexOf('en');
  if (zhIdx === -1 && enIdx !== -1) return false;
  if (zhIdx !== -1 && enIdx !== -1) return zhIdx <= enIdx;
  return true;
}

function securityHeaders(contentType: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

function renderMonogramSvg(letter: string): string {
  const ch = escapeHtml((String(letter || 'S').trim().charAt(0) || 'S').toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#090A0F"/><rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="#10B981" stroke-opacity="0.35" stroke-width="2"/><text x="32" y="42" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="28" font-weight="700" fill="#34D399">${ch}</text></svg>`;
}

function renderStealthHtml(gate: GatePolicy, isZh: boolean): string {
  const isBrand = gate.mode === 'brand';
  const bZh = escapeHtml(gate.brand_name_zh || gate.domain);
  const bEn = escapeHtml(gate.brand_name_en || gate.domain);
  const tZh = escapeHtml(gate.tagline_zh || '独立数字体验空间');
  const tEn = escapeHtml(gate.tagline_en || 'Independent Digital Studio');
  const nZh = escapeHtml(gate.notice_zh || '系统维护中，正在更新升级');
  const nEn = escapeHtml(gate.notice_en || 'System is currently under maintenance and updating.');
  const email = escapeHtml(gate.contact_email || '');
  const dom = escapeHtml(gate.domain || '');
  const initial = escapeHtml((String(gate.brand_name_en || gate.domain || 'S').trim().charAt(0) || 'S').toUpperCase());

  const pageTitleZh = isBrand ? bZh : `${bZh} · 维护更新中`;
  const pageTitleEn = isBrand ? bEn : `${bEn} · Under Maintenance`;

  return `<!doctype html>
<html lang="${isZh ? 'zh-CN' : 'en'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow, noarchive" />
  <title>${isZh ? pageTitleZh : pageTitleEn}</title>
  <link rel="icon" href="/favicon.ico" type="image/svg+xml" />
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background:
        radial-gradient(650px circle at 50% -10%, ${isBrand ? 'rgba(16,185,129,0.13)' : 'rgba(245,158,11,0.10)'}, transparent 65%),
        radial-gradient(500px circle at 85% 95%, rgba(16,185,129,0.06), transparent 60%),
        #090A0F;
      color: #F4F4F6;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .shell {
      width: 100%;
      max-width: 500px;
      background: rgba(255, 255, 255, 0.028);
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 28px;
      padding: 40px 34px 34px;
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 32px; }
    .pill {
      display: inline-flex; align-items: center; gap: 8px; padding: 6px 13px; border-radius: 999px;
      font-size: 12px; font-weight: 600;
      background: ${isBrand ? 'rgba(16, 185, 129, 0.11)' : 'rgba(245, 158, 11, 0.11)'};
      border: 1px solid ${isBrand ? 'rgba(16, 185, 129, 0.28)' : 'rgba(245, 158, 11, 0.28)'};
      color: ${isBrand ? '#34D399' : '#FBBF24'};
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 10px currentColor; animation: pulse 2.2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.38; transform: scale(0.85); } }
    .lang-btn {
      background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.10);
      color: #D4D4D8; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; cursor: pointer;
    }
    .lang-btn:hover { background: rgba(255, 255, 255, 0.09); color: #FFFFFF; }
    .emblem {
      width: 58px; height: 58px; border-radius: 18px;
      background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700; color: ${isBrand ? '#34D399' : '#F59E0B'}; margin-bottom: 22px;
    }
    h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: #FAFAFA; margin-bottom: 12px; line-height: 1.25; }
    .subtitle { font-size: 15px; line-height: 1.72; color: #A1A1AA; margin-bottom: 28px; }
    .bar-wrap { height: 3px; width: 100%; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; margin-bottom: 22px; }
    .bar { height: 100%; width: 42%; border-radius: 999px; background: linear-gradient(90deg, transparent, ${isBrand ? '#10B981' : '#F59E0B'}, transparent); animation: slide 2.6s ease-in-out infinite; }
    @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(260%); } }
    .status-box {
      padding: 15px 18px; border-radius: 16px; background: rgba(0, 0, 0, 0.34);
      border: 1px solid rgba(255, 255, 255, 0.07); display: flex; align-items: center; justify-content: space-between;
      gap: 12px; font-size: 12.5px; color: #71717A;
    }
    .domain-tag { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #D4D4D8; font-size: 12px; }
    .contact-link { display: inline-flex; margin-top: 16px; color: #34D399; text-decoration: none; font-size: 13px; border-bottom: 1px dashed rgba(52,211,153,0.4); padding-bottom: 2px; }
  </style>
</head>
<body>
  <main class="shell">
    <div class="topbar">
      <div class="pill">
        <span class="dot"></span>
        <span id="pillText">${isZh ? (isBrand ? '官方形象页 · 更新筹备中' : '系统维护中 · 更新中') : (isBrand ? 'Official Brand · Updating' : 'Under Maintenance · Updating')}</span>
      </div>
      <button type="button" class="lang-btn" id="langBtn">${isZh ? 'EN' : '中文'}</button>
    </div>
    <div class="emblem">${initial}</div>
    <h1 id="mainTitle">${isZh ? bZh : bEn}</h1>
    <p class="subtitle" id="subText">${isZh ? (isBrand ? tZh : nZh) : (isBrand ? tEn : nEn)}</p>
    <div class="bar-wrap"><div class="bar"></div></div>
    <div class="status-box">
      <span class="domain-tag">${dom}</span>
      <span id="footStatus">${isZh ? (isBrand ? '版本更新升级中' : '维护升级进行中') : (isBrand ? 'Version Upgrade in Progress' : 'Scheduled Upgrade Active')}</span>
    </div>
    ${isBrand && email ? `<a class="contact-link" href="mailto:${email}">${email}</a>` : ''}
  </main>
  <script>
    (function() {
      var state = {
        zh: ${isZh ? 'true' : 'false'},
        isBrand: ${isBrand ? 'true' : 'false'},
        bZh: ${JSON.stringify(gate.brand_name_zh || gate.domain)},
        bEn: ${JSON.stringify(gate.brand_name_en || gate.domain)},
        tZh: ${JSON.stringify(gate.tagline_zh || '独立数字体验空间')},
        tEn: ${JSON.stringify(gate.tagline_en || 'Independent Digital Studio')},
        nZh: ${JSON.stringify(gate.notice_zh || '系统维护中，正在更新升级')},
        nEn: ${JSON.stringify(gate.notice_en || 'System is currently under maintenance and updating.')}
      };
      var btn = document.getElementById('langBtn');
      btn.addEventListener('click', function() {
        state.zh = !state.zh;
        document.documentElement.lang = state.zh ? 'zh-CN' : 'en';
        btn.textContent = state.zh ? 'EN' : '中文';
        var bName = state.zh ? state.bZh : state.bEn;
        document.title = state.isBrand ? bName : (state.zh ? (bName + ' · 维护更新中') : (bName + ' · Under Maintenance'));
        document.getElementById('pillText').textContent = state.isBrand
          ? (state.zh ? '官方形象页 · 更新筹备中' : 'Official Brand · Updating')
          : (state.zh ? '系统维护中 · 更新中' : 'Under Maintenance · Updating');
        document.getElementById('mainTitle').textContent = bName;
        document.getElementById('subText').textContent = state.isBrand ? (state.zh ? state.tZh : state.tEn) : (state.zh ? state.nZh : state.nEn);
        document.getElementById('footStatus').textContent = state.isBrand ? (state.zh ? '版本更新升级中' : 'Version Upgrade in Progress') : (state.zh ? '维护升级进行中' : 'Scheduled Upgrade Active');
      });
    })();
  </script>
</body>
</html>`;
}

async function handleStandardStealthNext(
  request: NextRequest,
  passThroughFn: () => NextResponse
): Promise<Response> {
  const url = request.nextUrl.clone();
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.hostname;
  const domain = normalizeHost(rawHost);
  const pathname = url.pathname;

  if (pathname === '/__preview_exit') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
        'Set-Cookie': '__sm_prv=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
        'Cache-Control': 'no-store',
      },
    });
  }

  const previewParam = url.searchParams.get('__sm_preview');
  if (previewParam) {
    const ok = await verifyPreviewToken(domain, previewParam);
    if (ok) {
      url.searchParams.delete('__sm_preview');
      const cleanDest = url.pathname + (url.search ? url.search : '');
      return new Response(null, {
        status: 302,
        headers: {
          Location: cleanDest || '/',
          'Set-Cookie': `__sm_prv=${encodeURIComponent(previewParam)}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`,
          'Cache-Control': 'no-store',
        },
      });
    }
  }

  const prvCookie = request.cookies.get('__sm_prv')?.value || '';
  if (prvCookie && (await verifyPreviewToken(domain, prvCookie))) {
    return passThroughFn();
  }

  const gate = await fetchGatePolicy(domain);
  if (gate.mode === 'live') {
    return passThroughFn();
  }

  if (pathname === '/robots.txt') {
    return new Response('User-agent: *\nDisallow: /\n', {
      status: 200,
      headers: securityHeaders('text/plain; charset=utf-8'),
    });
  }
  if (pathname === '/sitemap.xml' || pathname.endsWith('.xml')) {
    return new Response('Not Found', {
      status: 404,
      headers: securityHeaders('text/plain; charset=utf-8'),
    });
  }
  if (pathname === '/manifest.webmanifest' || pathname === '/manifest.json') {
    const bName = gate.brand_name_zh || gate.domain;
    return new Response(
      JSON.stringify({
        name: bName,
        short_name: bName,
        start_url: '/',
        display: 'standalone',
        background_color: '#090A0F',
        theme_color: '#090A0F',
      }),
      { status: 200, headers: securityHeaders('application/manifest+json; charset=utf-8') }
    );
  }
  if (pathname === '/favicon.ico' || pathname === '/icon.svg' || pathname === '/apple-touch-icon.png') {
    return new Response(renderMonogramSvg(gate.brand_name_en || gate.domain), {
      status: 200,
      headers: securityHeaders('image/svg+xml; charset=utf-8'),
    });
  }
  if (pathname.startsWith('/api/') || (request.method !== 'GET' && request.method !== 'HEAD')) {
    const isZh = detectZh(request);
    return new Response(
      JSON.stringify({
        ok: false,
        errorCode: 'SERVICE_UNDER_MAINTENANCE',
        message: isZh ? '系统维护升级中，暂不开放服务调用。' : 'System is currently under maintenance.',
      }),
      { status: 503, headers: securityHeaders('application/json; charset=utf-8') }
    );
  }

  const isZh = detectZh(request);
  return new Response(renderStealthHtml(gate, isZh), {
    status: 200,
    headers: securityHeaders('text/html; charset=utf-8'),
  });
}

export async function middleware(request: NextRequest): Promise<Response> {
  return handleStandardStealthNext(request, () => NextResponse.next());
}

export const config = {
  matcher: ['/:path*'],
};
