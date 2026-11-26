/**
 * ShineMight OS Matrix QR Auth Runtime v2.0 (Zero-Dependency Self-Contained Vanilla JS)
 *
 * - Built-in pure ISO/IEC 18004 QR Code Matrix & SVG generator (Byte mode, V1-V12, ECC-M)
 * - Exact Dreamina Obsidian Auth Modal in isolated Shadow DOM (#141416 card, #303034 primary,
 *   outlined secondary, #222226 icon row + floating #2C2C2E "使用 沙发 App 扫码登录" tooltip,
 *   #4DA3FF sky-blue legal links, #5E5E66 "ShineMight Pass · 沙发通行证" footer)
 * - Full Tencent/WeChat-grade v2 QR protocol:
 *   PKCE S256 (WebCrypto), RAM-only pollSecret, WebSocket -> SSE -> 25s Long-Polling cascade
 *   with exponential backoff, 120s/60s/30s timers, 2-digit anti-quishing challenge display,
 *   BU-02 Compliance Firewall badge, max 3 idle auto-refreshes, local session persistence
 * - Exposes window.ShineMightAuth = { openLoginModal, openQrLogin, closeModal, getSession, logout, onAuthChange }
 * - Listens for [data-sm-qr-login] / [data-sm-login] clicks and CustomEvent('sm:open-login')
 * - Respects html[data-matrix-auth-ui="custom"] (never injects unsolicited overlays)
 * - Official Chinese brand name: 沙发 / 沙发 SofaYes
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__SM_MATRIX_AUTH_INIT__) return;
  window.__SM_MATRIX_AUTH_INIT__ = true;

  var DEFAULT_AUTH_ORIGIN = 'https://auth.shinemight.com';
  var SOFAYES_OAUTH_ORIGIN = 'https://app.sofayes.com';
  var QR_UNSCANNED_TTL_SEC = 120;
  var QR_SCANNED_CONFIRM_TTL_SEC = 60;
  var MAX_AUTO_REFRESH = 3;
  var LONG_POLL_TIMEOUT_MS = 25000;
  var STORAGE_PREFIX = 'sm_matrix_pass_session_';

  var CANONICAL_PROVIDERS = [
    { id: 'wechat', zh: '微信', en: 'WeChat' },
    { id: 'douyin', zh: '抖音', en: 'Douyin' },
    { id: 'apple', zh: 'Apple', en: 'Apple' },
    { id: 'google', zh: 'Google', en: 'Google' },
    { id: 'facebook', zh: 'Facebook', en: 'Facebook' },
    { id: 'tiktok', zh: 'TikTok', en: 'TikTok' },
    { id: 'x', zh: 'X', en: 'X' },
    { id: 'instagram', zh: 'Instagram', en: 'Instagram' },
    { id: 'whatsapp', zh: 'WhatsApp', en: 'WhatsApp' },
    { id: 'github', zh: 'GitHub', en: 'GitHub' },
    { id: 'discord', zh: 'Discord', en: 'Discord' },
    { id: 'weibo', zh: '微博', en: 'Weibo' },
    { id: 'sofayes', zh: '沙发通行证', en: 'SofaYes SSO' },
  ];

  function providerLabel(id, loc) {
    for (var i = 0; i < CANONICAL_PROVIDERS.length; i++) {
      if (CANONICAL_PROVIDERS[i].id === id) {
        return loc === 'en' ? CANONICAL_PROVIDERS[i].en : CANONICAL_PROVIDERS[i].zh;
      }
    }
    return String(id || '');
  }

  function buildOAuthHandoffUrl(providerId, returnTo) {
    var ret =
      returnTo && String(returnTo).trim()
        ? String(returnTo).trim()
        : (window.location && window.location.href) ||
          (config && config.domain ? 'https://' + config.domain : 'https://sofayes.com');
    return (
      SOFAYES_OAUTH_ORIGIN +
      '/?screen=login&oauth=' +
      encodeURIComponent(String(providerId || '')) +
      '&returnTo=' +
      encodeURIComponent(ret)
    );
  }

  /* =========================================================================
   * 1. Script Tag Config Discovery
   * ========================================================================= */
  function readScriptConfig() {
    var cfg = {
      projectId: 'sofayes',
      appName: '沙发 SofaYes',
      appNameEn: 'SofaYes',
      domain: window.location.hostname || 'sofayes.com',
      firewallZone: '',
      authOrigin: DEFAULT_AUTH_ORIGIN,
      apiBase: '',
      termsUrl: 'https://sofayes.com/legal/terms',
      privacyUrl: 'https://sofayes.com/legal/privacy',
    };
    try {
      var cur = document.currentScript;
      var list = cur ? [cur] : [];
      var found = document.querySelectorAll('script[src*="matrix-qr-auth"],script[data-project-id]');
      for (var i = 0; i < found.length; i++) list.push(found[i]);
      for (var j = 0; j < list.length; j++) {
        var el = list[j];
        if (!el || !el.getAttribute) continue;
        var pid = el.getAttribute('data-project-id');
        var an = el.getAttribute('data-app-name');
        var ane = el.getAttribute('data-app-name-en');
        var dom = el.getAttribute('data-domain');
        var fw = el.getAttribute('data-firewall-zone');
        var ao = el.getAttribute('data-auth-origin');
        var ab = el.getAttribute('data-api-base');
        if (pid) cfg.projectId = pid.trim();
        if (an) cfg.appName = an.trim();
        if (ane) cfg.appNameEn = ane.trim();
        if (dom) cfg.domain = dom.trim();
        if (fw !== null && fw.trim()) cfg.firewallZone = fw.trim();
        if (ao) cfg.authOrigin = ao.trim().replace(/\/+$/, '');
        if (ab) cfg.apiBase = ab.trim().replace(/\/+$/, '');
        if (pid) break;
      }
    } catch (_) {}
    if (!cfg.apiBase) {
      cfg.apiBase = cfg.authOrigin + '/v1/qr';
    }
    return cfg;
  }

  var config = readScriptConfig();

  function getLocale() {
    var lang = (document.documentElement.lang || '').trim().toLowerCase();
    if (lang.indexOf('en') === 0) return 'en';
    if (lang.indexOf('zh') === 0) return 'zh';
    if (navigator.language && navigator.language.toLowerCase().indexOf('en') === 0) return 'en';
    return 'zh';
  }

  /* =========================================================================
   * 2. 100% Bilingual Locale-Strict Error Dictionary
   * ========================================================================= */
  var ERROR_MESSAGES = {
    ERR_RATE_LIMITED: {
      zh: '请求过于频繁，请稍后再刷新二维码',
      en: 'Too many QR requests. Please wait a moment and try again.',
    },
    ERR_QR_ORIGIN_FORBIDDEN: {
      zh: '当前来源站点未在沙发生态安全白名单内，已拒绝创建扫码会话',
      en: 'This origin is not in the authorized ShineMight matrix allowlist.',
    },
    ERR_MATRIX_PROJECT_NOT_FOUND: {
      zh: '未找到对应的沙发生态矩阵站点配置',
      en: 'The requested ShineMight matrix project was not found.',
    },
    ERR_QR_INVALID_REQUEST: {
      zh: '扫码认证请求参数无效，请刷新二维码重试',
      en: 'Invalid QR authentication request parameters. Please refresh.',
    },
    ERR_QR_POLL_FORBIDDEN: {
      zh: '轮询凭证校验失败，请重新生成二维码',
      en: 'Session poll secret check failed. Please generate a fresh QR code.',
    },
    ERR_QR_SESSION_NOT_FOUND: {
      zh: '二维码会话已失效或不存在，请刷新重试',
      en: 'QR session was not found or has been cleared. Please refresh.',
    },
    ERR_UNAUTHORIZED: {
      zh: '未授权访问，请先在沙发 App 登录有效账号',
      en: 'Unauthorized. Please sign in to SofaYes App first.',
    },
    ERR_QR_SIGNATURE_INVALID: {
      zh: '二维码安全签名校验失败，请刷新二维码重试',
      en: 'QR code security signature verification failed. Please refresh.',
    },
    ERR_QR_EXPIRED: {
      zh: '二维码已过期，请点击刷新后重新使用沙发 App 扫码',
      en: 'QR code expired. Refresh and scan again with SofaYes App.',
    },
    ERR_QR_ALREADY_SCANNED: {
      zh: '该二维码已被其他沙发账号扫描锁定，请刷新二维码',
      en: 'This QR code was already scanned by another account. Please refresh.',
    },
    ERR_QR_INVALID_STATE: {
      zh: '当前二维码状态已变更，请刷新后重试',
      en: 'QR session state changed unexpectedly. Please refresh and retry.',
    },
    ERR_QR_SCANNER_MISMATCH: {
      zh: '仅限原扫码的沙发账号完成本次登录确认',
      en: 'Only the original scanning SofaYes account can confirm sign-in.',
    },
    ERR_QR_CHALLENGE_MISMATCH: {
      zh: '2 位安全确认数字不匹配，请在沙发 App 重新选择',
      en: '2-digit security code mismatch. Please retry in SofaYes App.',
    },
    ERR_QR_CHALLENGE_LOCKED: {
      zh: '安全数字连续输错 3 次，本次扫码登录已自动拒绝保护',
      en: 'Security code failed 3 times. Sign-in was denied for your protection.',
    },
    ERR_FIREWALL_ACK_REQUIRED: {
      zh: '请在沙发 App 勾选确认 BU-02 金融合规防火墙独立隔离声明',
      en: 'Please acknowledge the BU-02 Financial Compliance Firewall notice in SofaYes App.',
    },
    ERR_QR_AUTH_CODE_INVALID: {
      zh: '一次性扫码授权码无效，请重新扫码',
      en: 'One-time authorization code is invalid. Please scan again.',
    },
    ERR_QR_AUTH_CODE_EXPIRED: {
      zh: '扫码授权已超过 30 秒核销窗口，请重新扫码',
      en: 'Authorization code expired (30s window). Please scan again.',
    },
    ERR_QR_AUTH_CODE_CONSUMED: {
      zh: '该扫码授权码已被核销，禁止重放，请重新扫码',
      en: 'Authorization code has already been used. Please scan again.',
    },
    ERR_PKCE_MISMATCH: {
      zh: '安全密钥（PKCE）核验不匹配，请刷新二维码重新发起',
      en: 'PKCE security verification failed. Please refresh and try again.',
    },
    ERR_SECRET_MISCONFIGURED: {
      zh: '认证节点签名配置异常，已拒绝不安全降级，请稍后重试',
      en: 'Authentication node signing configuration is unavailable.',
    },
    ERR_INTERNAL: {
      zh: '边缘认证服务临时繁忙，请点击刷新重试',
      en: 'Edge authentication service is temporarily busy. Please retry.',
    },
    ERR_NETWORK_UNAVAILABLE: {
      zh: '网络连接失败，无法连接沙发通行证边缘认证节点',
      en: 'Network unavailable. Could not reach ShineMight Pass authentication edge.',
    },
    ERR_CRYPTO_UNAVAILABLE: {
      zh: '当前浏览器不支持安全加密接口（WebCrypto），请使用 HTTPS 访问',
      en: 'WebCrypto is unavailable in this browser context. Please open over HTTPS.',
    },
    ERR_AUTO_REFRESH_LIMIT: {
      zh: '二维码长时间未被扫描，请点击下方按钮手动刷新',
      en: 'QR code timed out after auto-refreshes. Click below to refresh manually.',
    },
    ERR_USER_DENIED: {
      zh: '您已在沙发 App 中取消本次扫码登录',
      en: 'Sign-in request was canceled on your SofaYes App.',
    },
    ERR_INVALID_CONTACT: {
      zh: '请输入有效的邮箱地址或手机号码',
      en: 'Please enter a valid email address or phone number.',
    },
    ERR_METHOD_UNCONFIGURED: {
      zh: '该站点暂未开通此快捷渠道，请点击右侧「沙发 App 扫码登录」一步直达',
      en: 'This shortcut is not enabled here yet. Use SofaYes App QR Sign-In instead.',
    },
  };

  function mapError(code, locale) {
    var key = String(code || 'ERR_INTERNAL').trim().toUpperCase();
    var entry = ERROR_MESSAGES[key] || ERROR_MESSAGES.ERR_INTERNAL;
    return locale === 'en' ? entry.en : entry.zh;
  }

  function firewallLabel(zone, locale) {
    if (!zone) return '';
    var k = String(zone).trim().toUpperCase();
    var map = {
      FIREWALL_ZONE_A_EXCHANGE_MATCHING: {
        zh: 'BU-02 独立合规防火墙 · 交易所撮合舱',
        en: 'BU-02 Isolated Compliance Firewall · Exchange Matching',
      },
      FIREWALL_ZONE_B_STABLECOIN_MINT: {
        zh: 'BU-02 独立合规防火墙 · 稳定币发行舱',
        en: 'BU-02 Isolated Compliance Firewall · Stablecoin Protocol',
      },
      FIREWALL_ZONE_C_PAYMENT_GATEWAY: {
        zh: 'BU-02 独立合规防火墙 · 全球支付网关舱',
        en: 'BU-02 Isolated Compliance Firewall · Payment Gateway',
      },
      FIREWALL_ZONE_E_TREASURY_NETTING: {
        zh: 'BU-02 独立合规防火墙 · 财资清算通证舱',
        en: 'BU-02 Isolated Compliance Firewall · Treasury & Yield',
      },
    };
    var entry = map[k];
    if (entry) return locale === 'en' ? entry.en : entry.zh;
    return locale === 'en'
      ? 'BU-02 Isolated Financial Compliance Firewall'
      : 'BU-02 金融合规防火墙独立隔离舱';
  }

  /* =========================================================================
   * 3. Pure Vanilla JS ISO/IEC 18004 QR Code Generator (Byte Mode, V1-V12, ECC-M)
   * ========================================================================= */
  var QR_SPECS = [
    [1, 21, 26, 16, 10, 1, 16, 0, 0, 0, []],
    [2, 25, 44, 28, 16, 1, 28, 0, 0, 7, [6, 18]],
    [3, 29, 70, 44, 26, 1, 44, 0, 0, 7, [6, 22]],
    [4, 33, 100, 64, 18, 2, 32, 0, 0, 7, [6, 26]],
    [5, 37, 134, 86, 24, 2, 43, 0, 0, 7, [6, 30]],
    [6, 41, 172, 108, 16, 4, 27, 0, 0, 7, [6, 34]],
    [7, 45, 196, 124, 18, 4, 31, 0, 0, 0, [6, 22, 38]],
    [8, 49, 242, 154, 22, 2, 38, 2, 39, 0, [6, 24, 42]],
    [9, 53, 292, 182, 22, 3, 36, 2, 37, 0, [6, 26, 46]],
    [10, 57, 346, 216, 26, 4, 43, 1, 44, 0, [6, 28, 50]],
    [11, 61, 404, 254, 30, 1, 50, 4, 51, 0, [6, 30, 54]],
    [12, 65, 466, 290, 22, 6, 36, 2, 37, 0, [6, 32, 58]],
  ];

  var GF_EXP = new Uint8Array(512);
  var GF_LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) GF_EXP[j] = GF_EXP[j - 255];
  })();

  function gfMul(a, b) {
    return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsEcc(data, ecCount) {
    var gen = new Uint8Array([1]);
    for (var i = 0; i < ecCount; i++) {
      var next = new Uint8Array(gen.length + 1);
      var root = GF_EXP[i];
      for (var j = 0; j < gen.length; j++) {
        next[j] ^= gen[j];
        next[j + 1] ^= gfMul(gen[j], root);
      }
      gen = next;
    }
    var rem = new Uint8Array(ecCount);
    for (var d = 0; d < data.length; d++) {
      var factor = data[d] ^ rem[0];
      for (var k = 0; k < ecCount - 1; k++) {
        rem[k] = rem[k + 1] ^ gfMul(gen[k + 1], factor);
      }
      rem[ecCount - 1] = gfMul(gen[ecCount], factor);
    }
    return rem;
  }

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    var arr = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) arr.push(c);
      else if (c < 0x800) arr.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else arr.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return new Uint8Array(arr);
  }

  function encodeQrMatrix(text) {
    var bytes = utf8Bytes(text);
    var spec = null;
    for (var s = 0; s < QR_SPECS.length; s++) {
      var sp = QR_SPECS[s];
      var cb = sp[0] <= 9 ? 8 : 16;
      if (4 + cb + bytes.length * 8 <= sp[3] * 8) {
        spec = sp;
        break;
      }
    }
    if (!spec) throw new RangeError('QR payload too long');

    var ver = spec[0], size = spec[1], totalCw = spec[2], dataCw = spec[3];
    var ecPerBlock = spec[4], g1B = spec[5], g1D = spec[6], g2B = spec[7], g2D = spec[8];
    var remBits = spec[9], aligns = spec[10];

    var bits = [];
    function pushBits(v, n) {
      for (var i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
    }
    pushBits(4, 4);
    pushBits(bytes.length, ver <= 9 ? 8 : 16);
    for (var bi = 0; bi < bytes.length; bi++) pushBits(bytes[bi], 8);
    var maxBits = dataCw * 8;
    var tLen = Math.min(4, maxBits - bits.length);
    for (var ti = 0; ti < tLen; ti++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    var dcw = new Uint8Array(dataCw);
    var idx = 0;
    for (var k = 0; k < bits.length; k += 8) {
      var bval = 0;
      for (var m = 0; m < 8; m++) bval = (bval << 1) | bits[k + m];
      dcw[idx++] = bval;
    }
    var pt = 0;
    while (idx < dataCw) {
      dcw[idx++] = pt === 0 ? 0xec : 0x11;
      pt ^= 1;
    }

    var dBlocks = [], eBlocks = [], off = 0;
    for (var b1 = 0; b1 < g1B; b1++) {
      var sl1 = dcw.subarray(off, off + g1D);
      off += g1D;
      dBlocks.push(sl1);
      eBlocks.push(rsEcc(sl1, ecPerBlock));
    }
    for (var b2 = 0; b2 < g2B; b2++) {
      var sl2 = dcw.subarray(off, off + g2D);
      off += g2D;
      dBlocks.push(sl2);
      eBlocks.push(rsEcc(sl2, ecPerBlock));
    }

    var finalCw = new Uint8Array(totalCw);
    var fi = 0;
    var maxDLen = Math.max(g1D, g2D);
    for (var col = 0; col < maxDLen; col++) {
      for (var db = 0; db < dBlocks.length; db++) {
        if (col < dBlocks[db].length) finalCw[fi++] = dBlocks[db][col];
      }
    }
    for (var ec = 0; ec < ecPerBlock; ec++) {
      for (var eb = 0; eb < eBlocks.length; eb++) {
        finalCw[fi++] = eBlocks[eb][ec];
      }
    }

    var mods = [], isFn = [];
    for (var r = 0; r < size; r++) {
      mods[r] = new Array(size).fill(false);
      isFn[r] = new Array(size).fill(false);
    }
    function setFn(rr, cc, dark) {
      if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
        mods[rr][cc] = dark;
        isFn[rr][cc] = true;
      }
    }
    for (var t = 0; t < size; t++) {
      setFn(6, t, t % 2 === 0);
      setFn(t, 6, t % 2 === 0);
    }
    function drawFinder(tr, lc) {
      for (var dr = -1; dr <= 7; dr++) {
        for (var dc = -1; dc <= 7; dc++) {
          var inO = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
          var brd = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          var core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          setFn(tr + dr, lc + dc, inO && (brd || core));
        }
      }
    }
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    for (var ai = 0; ai < aligns.length; ai++) {
      for (var aj = 0; aj < aligns.length; aj++) {
        if ((ai === 0 && aj === 0) || (ai === 0 && aj === aligns.length - 1) || (ai === aligns.length - 1 && aj === 0)) continue;
        for (var dr2 = -2; dr2 <= 2; dr2++) {
          for (var dc2 = -2; dc2 <= 2; dc2++) {
            setFn(aligns[ai] + dr2, aligns[aj] + dc2, Math.max(Math.abs(dr2), Math.abs(dc2)) !== 1);
          }
        }
      }
    }

    function fmtBits(mask) {
      var data = mask & 7;
      var rem = data << 10;
      for (var i = 14; i >= 10; i--) if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
      return ((data << 10) | rem) ^ 0x5412;
    }
    function writeFmt(grid, mask) {
      var fb = fmtBits(mask);
      for (var i = 0; i <= 5; i++) {
        grid[8][i] = ((fb >>> (14 - i)) & 1) !== 0;
        isFn[8][i] = true;
      }
      grid[8][7] = ((fb >>> 8) & 1) !== 0; isFn[8][7] = true;
      grid[8][8] = ((fb >>> 7) & 1) !== 0; isFn[8][8] = true;
      grid[7][8] = ((fb >>> 6) & 1) !== 0; isFn[7][8] = true;
      for (var j = 9; j < 15; j++) {
        grid[14 - j][8] = ((fb >>> (14 - j)) & 1) !== 0;
        isFn[14 - j][8] = true;
      }
      for (var m2 = 0; m2 < 7; m2++) {
        grid[size - 1 - m2][8] = ((fb >>> (14 - m2)) & 1) !== 0;
        isFn[size - 1 - m2][8] = true;
      }
      for (var n2 = 7; n2 < 15; n2++) {
        grid[8][size - 15 + n2] = ((fb >>> (14 - n2)) & 1) !== 0;
        isFn[8][size - 15 + n2] = true;
      }
      grid[size - 8][8] = true;
      isFn[size - 8][8] = true;
    }
    writeFmt(mods, 0);

    if (ver >= 7) {
      var vr = ver << 12;
      for (var vi = 17; vi >= 12; vi--) if ((vr >>> vi) & 1) vr ^= 0x1f25 << (vi - 12);
      var vb = (ver << 12) | vr;
      for (var vk = 0; vk < 18; vk++) {
        var vd = ((vb >>> vk) & 1) !== 0;
        var a = size - 11 + (vk % 3);
        var b = Math.floor(vk / 3);
        setFn(b, a, vd);
        setFn(a, b, vd);
      }
    }

    var totalBits = finalCw.length * 8 + remBits;
    var bitIdx = 0;
    var up = true;
    for (var rc = size - 1; rc >= 1; rc -= 2) {
      if (rc === 6) rc = 5;
      for (var st = 0; st < size; st++) {
        var row = up ? size - 1 - st : st;
        for (var dc3 = 0; dc3 < 2; dc3++) {
          var cl = rc - dc3;
          if (isFn[row][cl]) continue;
          var dk = false;
          if (bitIdx < finalCw.length * 8) {
            dk = ((finalCw[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) !== 0;
          }
          mods[row][cl] = dk;
          if (bitIdx < totalBits) bitIdx++;
        }
      }
      up = !up;
    }

    function mCond(mk, rr, cc) {
      switch (mk) {
        case 0: return (rr + cc) % 2 === 0;
        case 1: return rr % 2 === 0;
        case 2: return cc % 3 === 0;
        case 3: return (rr + cc) % 3 === 0;
        case 4: return (Math.floor(rr / 2) + Math.floor(cc / 3)) % 2 === 0;
        case 5: return ((rr * cc) % 2) + ((rr * cc) % 3) === 0;
        case 6: return (((rr * cc) % 2) + ((rr * cc) % 3)) % 2 === 0;
        case 7: return (((rr + cc) % 2) + ((rr * cc) % 3)) % 2 === 0;
        default: return false;
      }
    }

    function score(g) {
      var pen = 0, dark = 0;
      for (var r1 = 0; r1 < size; r1++) {
        var rc0 = g[r1][0], rl = 1;
        for (var c1 = 1; c1 < size; c1++) {
          if (g[r1][c1] === rc0) rl++;
          else { if (rl >= 5) pen += 3 + (rl - 5); rc0 = g[r1][c1]; rl = 1; }
        }
        if (rl >= 5) pen += 3 + (rl - 5);
      }
      for (var c2 = 0; c2 < size; c2++) {
        var cc0 = g[0][c2], cl2 = 1;
        for (var r2 = 1; r2 < size; r2++) {
          if (g[r2][c2] === cc0) cl2++;
          else { if (cl2 >= 5) pen += 3 + (cl2 - 5); cc0 = g[r2][c2]; cl2 = 1; }
        }
        if (cl2 >= 5) pen += 3 + (cl2 - 5);
      }
      for (var r3 = 0; r3 < size - 1; r3++) {
        for (var c3 = 0; c3 < size - 1; c3++) {
          var v = g[r3][c3];
          if (v === g[r3][c3 + 1] && v === g[r3 + 1][c3] && v === g[r3 + 1][c3 + 1]) pen += 3;
        }
      }
      for (var r4 = 0; r4 < size; r4++) {
        for (var c4 = 0; c4 < size; c4++) if (g[r4][c4]) dark++;
      }
      pen += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
      return pen;
    }

    var bestG = null, bestP = 1e9;
    for (var mk = 0; mk < 8; mk++) {
      var cand = new Array(size);
      for (var rr = 0; rr < size; rr++) {
        cand[rr] = mods[rr].slice();
        for (var cc = 0; cc < size; cc++) {
          if (!isFn[rr][cc] && mCond(mk, rr, cc)) cand[rr][cc] = !cand[rr][cc];
        }
      }
      writeFmt(cand, mk);
      var sc = score(cand);
      if (sc < bestP) { bestP = sc; bestG = cand; }
    }

    return { version: ver, size: size, modules: bestG };
  }

  function encodeQrToSvg(text, px) {
    var mat = encodeQrMatrix(text);
    var margin = 4;
    var view = mat.size + margin * 2;
    var parts = [];
    for (var r = 0; r < mat.size; r++) {
      var row = mat.modules[r];
      var c = 0;
      while (c < mat.size) {
        if (!row[c]) { c++; continue; }
        var run = 1;
        while (c + run < mat.size && row[c + run]) run++;
        parts.push('M' + (c + margin) + ',' + (r + margin) + 'h' + run + 'v1h-' + run + 'z');
        c += run;
      }
    }
    var bs = Math.max(5, Math.round(mat.size * 0.145));
    var bp = (view - bs) / 2;
    var pad = 0.7;
    var cx = view / 2, cy = view / 2, rad = bs * 0.24;
    var emblem =
      '<rect x="' + (bp - pad).toFixed(2) + '" y="' + (bp - pad).toFixed(2) +
      '" width="' + (bs + pad * 2).toFixed(2) + '" height="' + (bs + pad * 2).toFixed(2) +
      '" rx="' + (rad + 0.45).toFixed(2) + '" fill="#FFFFFF"/>' +
      '<rect x="' + bp.toFixed(2) + '" y="' + bp.toFixed(2) +
      '" width="' + bs.toFixed(2) + '" height="' + bs.toFixed(2) +
      '" rx="' + rad.toFixed(2) + '" fill="#141416"/>' +
      '<path d="M' + (cx - bs * 0.24).toFixed(2) + ',' + (cy - bs * 0.08).toFixed(2) +
      'c0,-' + (bs * 0.18).toFixed(2) + ' ' + (bs * 0.48).toFixed(2) + ',-' + (bs * 0.18).toFixed(2) +
      ' ' + (bs * 0.48).toFixed(2) + ',0v' + (bs * 0.18).toFixed(2) + 'h-' + (bs * 0.48).toFixed(2) +
      'z" fill="#FFFFFF"/>' +
      '<rect x="' + (cx - bs * 0.28).toFixed(2) + '" y="' + (cy + bs * 0.08).toFixed(2) +
      '" width="' + (bs * 0.56).toFixed(2) + '" height="' + (bs * 0.13).toFixed(2) +
      '" rx="' + (bs * 0.06).toFixed(2) + '" fill="#10B981"/>';

    var dim = px || 204;
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + view + ' ' + view +
      '" width="' + dim + '" height="' + dim + '" shape-rendering="crispEdges">' +
      '<rect width="' + view + '" height="' + view + '" fill="#FFFFFF"/>' +
      '<path d="' + parts.join('') + '" fill="#0A0A0C"/>' +
      emblem + '</svg>'
    );
  }

  /* =========================================================================
   * 4. PKCE S256 & Session Storage Helpers
   * ========================================================================= */
  function b64url(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function generatePkce() {
    if (!window.crypto || !window.crypto.subtle || !window.crypto.getRandomValues) {
      return Promise.reject(new Error('ERR_CRYPTO_UNAVAILABLE'));
    }
    var rand = new Uint8Array(32);
    window.crypto.getRandomValues(rand);
    var verifier = b64url(rand);
    return window.crypto.subtle
      .digest('SHA-256', utf8Bytes(verifier))
      .then(function (digest) {
        return {
          codeVerifier: verifier,
          codeChallenge: b64url(new Uint8Array(digest)),
          codeChallengeMethod: 'S256',
        };
      });
  }

  function storageKey(pid) {
    return STORAGE_PREFIX + String(pid || config.projectId || 'sofayes').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  function getSession(pid) {
    try {
      var raw = window.localStorage.getItem(storageKey(pid));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.accessToken && parsed.profile ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function saveSession(session) {
    try {
      window.localStorage.setItem(storageKey(session.projectId), JSON.stringify(session));
    } catch (_) {}
  }

  var authListeners = [];
  function notifyAuthChange(session) {
    for (var i = 0; i < authListeners.length; i++) {
      try { authListeners[i](session); } catch (_) {}
    }
  }

  function logout(pid) {
    try { window.localStorage.removeItem(storageKey(pid)); } catch (_) {}
    notifyAuthChange(null);
  }

  /* =========================================================================
   * 5. Dreamina Obsidian Modal UI (Isolated Shadow DOM) + v2 QR State Engine
   * ========================================================================= */
  var hostEl = null;
  var shadow = null;
  var modalOpen = false;
  var currentView = 'methods';
  var activeRunId = 0;
  var pollSecret = null;
  var codeVerifier = null;
  var activeWs = null;
  var activeEs = null;
  var activeAbort = null;
  var pollTimer = null;
  var wsPingTimer = null;
  var countdownTimer = null;
  var lastVersion = 0;
  var lastStatus = 'PENDING';
  var exchangingCode = null;
  var inlineMessage = '';
  var pendingFirewallOAuth = null;
  var modalOverrides = {};

  var qrState = {
    state: 'LOADING',
    qrToken: null,
    qrSvg: '',
    expiresAtMs: null,
    confirmExpiresAtMs: null,
    secondsRemaining: QR_UNSCANNED_TTL_SEC,
    autoRefreshCount: 0,
    maxAutoRefresh: MAX_AUTO_REFRESH,
    challengeDisplayCode: null,
    firewallZone: config.firewallZone || '',
    scanner: null,
    errorCode: null,
  };

  function teardownQr() {
    activeRunId++;
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    if (wsPingTimer) { clearInterval(wsPingTimer); wsPingTimer = null; }
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    if (activeWs) {
      try { activeWs.onopen = activeWs.onmessage = activeWs.onerror = activeWs.onclose = null; activeWs.close(); } catch (_) {}
      activeWs = null;
    }
    if (activeEs) {
      try { activeEs.close(); } catch (_) {}
      activeEs = null;
    }
    if (activeAbort) {
      try { activeAbort.abort(); } catch (_) {}
      activeAbort = null;
    }
    pollSecret = null;
    codeVerifier = null;
    exchangingCode = null;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function effectiveConfig() {
    var apiBase = modalOverrides.apiBase || config.apiBase;
    if (modalOverrides.authOrigin && !modalOverrides.apiBase) {
      apiBase = String(modalOverrides.authOrigin).replace(/\/+$/, '') + '/v1/qr';
    }
    return {
      projectId: modalOverrides.projectId || config.projectId,
      appName: modalOverrides.appName || config.appName,
      appNameEn: modalOverrides.appNameEn || config.appNameEn || config.appName,
      domain: modalOverrides.domain || config.domain,
      firewallZone: modalOverrides.firewallZone !== undefined ? modalOverrides.firewallZone : config.firewallZone,
      apiBase: apiBase,
      termsUrl: modalOverrides.termsUrl || config.termsUrl,
      privacyUrl: modalOverrides.privacyUrl || config.privacyUrl,
    };
  }

  var SHADOW_CSS = [
    '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Helvetica Neue",sans-serif;}',
    'input,textarea{user-select:text;-webkit-user-select:text;}',
    '.backdrop{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);overscroll-behavior:none;animation:smFade .18s cubic-bezier(.22,1,.36,1) both;}',
    '.card{position:relative;width:100%;max-width:392px;min-height:472px;display:flex;flex-direction:column;background:#141416;color:#F5F5F7;border:1px solid rgba(255,255,255,0.08);border-radius:22px;padding:24px 28px calc(22px + env(safe-area-inset-bottom,0px));box-shadow:0 24px 64px rgba(0,0,0,0.72);overflow:hidden;animation:smCard .32s cubic-bezier(.22,1.15,.36,1) both;}',
    '.grabber{display:none;width:36px;height:4px;border-radius:9999px;background:rgba(255,255,255,0.16);margin:-10px auto 12px;}',
    '@media (max-width:767px){.backdrop{align-items:flex-end;padding:0;}.card{max-width:100%;border-radius:24px 24px 0 0;border-bottom:none;animation:smSheet .34s cubic-bezier(.22,1.12,.36,1) both;}.grabber{display:block;}}',
    '.topbar{display:flex;align-items:center;justify-content:space-between;min-height:32px;}',
    '.brand{display:flex;align-items:center;gap:8px;min-width:0;font-size:14px;font-weight:600;letter-spacing:-0.01em;color:#F5F5F7;}',
    '.brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.back-btn{display:inline-flex;align-items:center;gap:6px;margin-left:-8px;padding:6px 8px;border:none;border-radius:10px;background:transparent;color:#A1A1AA;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:color .15s,background .15s;}',
    '.back-btn:hover{color:#FFF;background:rgba(255,255,255,0.06);}',
    '.close-btn{width:32px;height:32px;margin-right:-6px;border:none;border-radius:9999px;background:transparent;color:#A1A1AA;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:color .15s,background .15s;}',
    '.close-btn:hover{color:#FFF;background:rgba(255,255,255,0.08);}',
    '.fw-badge{margin-top:12px;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.22);color:#FDE68A;font-size:11.5px;line-height:1.35;}',
    '.view{display:flex;flex-direction:column;flex:1;animation:smView .26s cubic-bezier(.22,1.12,.36,1) both;}',
    '.title{margin:44px 0 20px;font-size:20px;font-weight:500;letter-spacing:-0.015em;color:#F5F5F7;line-height:1.25;text-align:left;}',
    '.title.tight{margin-top:24px;}',
    '.pill-primary,.pill-secondary{position:relative;width:100%;height:46px;padding:0 16px;border-radius:12px;font-size:14px;font-weight:500;display:flex;align-items:center;justify-content:center;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .15s,transform .14s,border-color .15s;}',
    '.pill-primary{background:#303034;border:1px solid rgba(255,255,255,0.06);color:#F5F5F7;}',
    '.pill-primary:hover{background:#3A3A3F;}',
    '.pill-secondary{margin-top:12px;background:transparent;border:1px solid rgba(255,255,255,0.14);color:#E5E5EA;}',
    '.pill-secondary:hover{background:rgba(255,255,255,0.05);}',
    '.pill-primary:active,.pill-secondary:active{transform:scale(0.985);}',
    '.pill-ico{position:absolute;left:16px;display:flex;align-items:center;}',
    '.icon-row{position:relative;margin-top:48px;display:flex;align-items:center;justify-content:center;gap:10px;}',
    '.ico-btn{width:42px;height:42px;border-radius:10px;background:#222226;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .15s,transform .14s;}',
    '.ico-btn:hover{background:#2E2E33;}',
    '.ico-btn:active{transform:scale(0.95);}',
    '.ico-more{height:42px;padding:0 11px;border-radius:10px;background:#222226;border:1px solid rgba(255,255,255,0.08);color:#E5E5EA;font-size:12px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:4px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .15s,transform .14s;}',
    '.ico-more:hover{background:#2E2E33;}',
    '.ico-more:active{transform:scale(0.95);}',
    '.qr-wrap{position:relative;flex-shrink:0;}',
    '.qr-tip-wrap{position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);z-index:2;}',
    '.qr-tip{position:relative;padding:6px 12px;border-radius:8px;background:#2C2C2E;border:1px solid rgba(255,255,255,0.08);color:#E5E5EA;font-size:11.5px;font-weight:500;white-space:nowrap;flex-shrink:0;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,0.52);animation:smFloat 2.8s ease-in-out infinite;}',
    '.qr-tip:hover{background:#35353A;}',
    '.qr-tip::after{content:"";position:absolute;bottom:-5px;left:50%;width:9px;height:9px;background:#2C2C2E;border-right:1px solid rgba(255,255,255,0.08);border-bottom:1px solid rgba(255,255,255,0.08);transform:translateX(-50%) rotate(45deg);}',
    '.prov-head{margin:20px 0 14px;text-align:left;}',
    '.prov-head-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}',
    '.prov-head h2{margin:0;font-size:19px;font-weight:500;letter-spacing:-0.015em;color:#F5F5F7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.prov-count{padding:2px 8px;border-radius:9999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#A1A1AA;font-size:11px;font-weight:500;white-space:nowrap;flex-shrink:0;}',
    '.prov-head p{margin:4px 0 0;font-size:12px;color:#8A8A91;line-height:1.45;}',
    '.prov-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:336px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;-ms-overflow-style:none;}',
    '.prov-grid::-webkit-scrollbar{display:none;}',
    '.prov-tile{min-width:0;height:42px;padding:0 11px;border-radius:11px;background:#1C1C1E;border:1px solid rgba(255,255,255,0.08);color:#F5F5F7;font-size:13px;font-weight:500;display:flex;align-items:center;justify-content:flex-start;gap:9px;cursor:pointer;white-space:nowrap;flex-shrink:0;overflow:hidden;transition:background .15s,transform .14s,border-color .15s;}',
    '.prov-tile:hover{background:#28282D;}',
    '.prov-tile:active{transform:scale(0.975);}',
    '.prov-tile.span2{grid-column:span 2;justify-content:center;background:rgba(16,185,129,0.09);border-color:rgba(52,211,153,0.26);}',
    '.prov-tile.span2:hover{background:rgba(16,185,129,0.16);}',
    '.prov-tile span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.fw-oauth-box{margin-top:14px;padding:12px;border-radius:12px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);color:#FEF3C7;font-size:12px;line-height:1.5;text-align:left;}',
    '.fw-oauth-box p{margin:0;}',
    '.fw-oauth-actions{margin-top:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}',
    '.fw-btn-qr,.fw-btn-go{height:36px;padding:0 10px;border-radius:9px;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;transition:background .15s;}',
    '.fw-btn-qr{background:#303034;border:1px solid rgba(255,255,255,0.1);color:#F5F5F7;}',
    '.fw-btn-qr:hover{background:#3A3A3F;}',
    '.fw-btn-go{background:rgba(251,191,36,0.16);border:1px solid rgba(252,211,77,0.32);color:#FEF3C7;}',
    '.fw-btn-go:hover{background:rgba(251,191,36,0.26);}',
    '.notice{margin-top:16px;padding:9px 12px;border-radius:10px;background:#1C1C1E;border:1px solid rgba(255,255,255,0.08);color:#D4D4D8;font-size:12px;line-height:1.5;}',
    '.legal{margin-top:20px;font-size:11.5px;line-height:1.58;color:#8A8A91;text-align:left;}',
    '.legal a{color:#4DA3FF;text-decoration:none;}',
    '.legal a:hover{text-decoration:underline;}',
    '.footer{margin-top:auto;padding-top:28px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:500;color:#5E5E66;}',
    '.sub-title{margin:20px 0 4px;font-size:19px;font-weight:500;letter-spacing:-0.015em;color:#F5F5F7;}',
    '.sub-desc{margin:0 0 18px;font-size:12px;color:#8A8A91;line-height:1.45;}',
    '.input{width:100%;height:46px;padding:0 14px;border-radius:12px;background:#1C1C1E;border:1px solid rgba(255,255,255,0.12);color:#F5F5F7;font-size:14px;outline:none;transition:border-color .15s;}',
    '.input:focus{border-color:#4DA3FF;}',
    '.input::placeholder{color:#6E6E76;}',
    '.qr-box{position:relative;margin:0 auto;width:224px;height:224px;padding:10px;border-radius:16px;background:#FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 32px rgba(0,0,0,0.45);overflow:hidden;}',
    '.qr-svg{width:100%;height:100%;display:flex;align-items:center;justify-content:center;transition:filter .2s,opacity .2s;}',
    '.qr-svg.dim{filter:blur(3px);opacity:0.28;}',
    '.qr-overlay{position:absolute;inset:0;background:rgba(20,20,22,0.9);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center;}',
    '.qr-overlay p{margin:0 0 14px;font-size:12.5px;line-height:1.5;color:#E5E5EA;}',
    '.qr-refresh{height:36px;padding:0 16px;border-radius:10px;background:#303034;border:1px solid rgba(255,255,255,0.1);color:#FFF;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;flex-shrink:0;}',
    '.qr-refresh:hover{background:#3A3A3F;}',
    '.challenge-card{width:100%;padding:24px 20px;border-radius:18px;background:#1C1C1E;border:1px solid rgba(52,211,153,0.28);text-align:center;box-shadow:0 12px 32px rgba(0,0,0,0.45);}',
    '.challenge-pill{display:inline-flex;padding:4px 12px;border-radius:9999px;background:rgba(16,185,129,0.14);border:1px solid rgba(52,211,153,0.25);color:#6EE7B7;font-size:11px;font-weight:500;}',
    '.challenge-num{margin-top:16px;font-size:48px;line-height:1;font-weight:700;letter-spacing:0.2em;padding-left:0.2em;color:#FFFFFF;font-variant-numeric:tabular-nums;}',
    '.challenge-desc{margin:12px 0 0;font-size:12px;line-height:1.5;color:#A1A1AA;}',
    '.qr-meta{margin-top:16px;width:100%;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#8A8A91;}',
    '.link-btn{background:none;border:none;padding:0;color:#4DA3FF;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;flex-shrink:0;}',
    '.link-btn:hover{text-decoration:underline;}',
    '.avatar{width:54px;height:54px;border-radius:9999px;border:2px solid #34D399;background:rgba(16,185,129,0.2);color:#6EE7B7;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;overflow:hidden;}',
    '.avatar img{width:100%;height:100%;object-fit:cover;}',
    '.spin{width:24px;height:24px;border-radius:9999px;border:2px solid rgba(20,20,22,0.18);border-top-color:#141416;animation:smSpin .85s linear infinite;}',
    '.spin.light{border-color:rgba(52,211,153,0.25);border-top-color:#34D399;}',
    '@keyframes smFade{from{opacity:0}to{opacity:1}}',
    '@keyframes smCard{0%{opacity:0;transform:translate3d(0,18px,0) scale(.965)}100%{opacity:1;transform:translate3d(0,0,0) scale(1)}}',
    '@keyframes smSheet{0%{opacity:0;transform:translate3d(0,44px,0)}100%{opacity:1;transform:translate3d(0,0,0)}}',
    '@keyframes smView{0%{opacity:0;transform:translate3d(0,8px,0) scale(.985)}100%{opacity:1;transform:translate3d(0,0,0) scale(1)}}',
    '@keyframes smFloat{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-2.5px,0)}}',
    '@keyframes smSpin{to{transform:rotate(360deg)}}',
  ].join('');

  var ICON_SOFA = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5.2 10.4C5.2 7.45 7.6 5.4 12 5.4C16.4 5.4 18.8 7.45 18.8 10.4V13.4H5.2V10.4Z" fill="currentColor"/><rect x="3.4" y="12.2" width="17.2" height="4.4" rx="2.2" fill="currentColor"/><circle cx="7.4" cy="18.1" r="1.25" fill="currentColor" opacity="0.72"/><circle cx="16.6" cy="18.1" r="1.25" fill="currentColor" opacity="0.72"/></svg>';
  var ICON_GOOGLE = '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
  var ICON_MAIL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E5E5EA" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4.2 6.8L12 12.6L19.8 6.8"/></svg>';
  var ICON_WECHAT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M9.6 4.5C5.65 4.5 2.5 7.12 2.5 10.35c0 1.84 1.02 3.49 2.63 4.58l-.67 2.04 2.34-1.18c.88.26 1.82.41 2.8.41.31 0 .61-.02.91-.05-.21-.59-.33-1.22-.33-1.88 0-3.09 2.88-5.59 6.45-5.59.22 0 .43.01.64.03C16.56 6.22 13.38 4.5 9.6 4.5Zm-2.45 4.6a.95.95 0 1 1 0-1.9.95.95 0 0 1 0 1.9Zm4.75 0a.95.95 0 1 1 0-1.9.95.95 0 0 1 0 1.9Z" fill="#07C160"/><path d="M16.65 9.65c-3.06 0-5.55 2.06-5.55 4.6 0 2.54 2.49 4.6 5.55 4.6.69 0 1.36-.11 1.97-.3l1.86.93-.52-1.6c1.37-.87 2.24-2.18 2.24-3.63 0-2.54-2.49-4.6-5.55-4.6Zm-1.8 3.68a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6Zm3.6 0a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6Z" fill="#22D975"/></svg>';
  var ICON_DOUYIN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M14.7 3.6c.68 1.44 1.95 2.43 3.55 2.66v2.77a6.6 6.6 0 0 1-3.48-1.08v6.22a5.25 5.25 0 1 1-4.57-5.2v2.83a2.48 2.48 0 1 0 1.72 2.36V3.6h2.78Z" fill="#25F4EE"/><path d="M16.1 4.8c.68 1.44 1.95 2.43 3.55 2.66v2.77a6.6 6.6 0 0 1-3.48-1.08v6.22a5.25 5.25 0 1 1-4.57-5.2v2.83a2.48 2.48 0 1 0 1.72 2.36V4.8h2.78Z" fill="#FE2C55"/><path d="M15.4 4.2c.68 1.44 1.95 2.43 3.55 2.66v2.77a6.6 6.6 0 0 1-3.48-1.08v6.22a5.25 5.25 0 1 1-4.57-5.2v2.83a2.48 2.48 0 1 0 1.72 2.36V4.2h2.78Z" fill="#FFFFFF"/></svg>';
  var ICON_APPLE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#F5F5F7" style="flex-shrink:0"><path d="M16.36 12.63c-.03-2.45 2-3.63 2.09-3.69-1.14-1.67-2.92-1.89-3.55-1.92-1.51-.15-2.96.89-3.73.89-.77 0-1.95-.87-3.22-.84-1.65.02-3.18.96-4.03 2.45-1.72 2.98-.44 7.39 1.24 9.81.82 1.18 1.8 2.51 3.09 2.46 1.24-.05 1.71-.8 3.21-.8 1.5 0 1.92.8 3.23.77 1.34-.02 2.18-1.2 2.99-2.39.94-1.38 1.33-2.71 1.35-2.78-.03-.01-2.64-1.01-2.67-3.96ZM13.91 5.42c.68-.83 1.14-1.97 1.01-3.12-.98.04-2.18.65-2.88 1.48-.63.73-1.18 1.9-1.03 3.02 1.1.08 2.22-.55 2.9-1.38Z"/></svg>';
  var ICON_FACEBOOK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><circle cx="12" cy="12" r="10" fill="#1877F2"/><path d="M15.65 15.1l.44-2.88h-2.76v-1.87c0-.79.39-1.56 1.62-1.56h1.26V6.34s-1.14-.2-2.23-.2c-2.28 0-3.77 1.38-3.77 3.88v2.2H7.68v2.88h2.53v6.86a10.1 10.1 0 0 0 3.12 0V15.1h2.32Z" fill="#FFFFFF"/></svg>';
  var ICON_TIKTOK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><rect x="2" y="2" width="20" height="20" rx="5.5" fill="#0B0B0D" stroke="rgba(255,255,255,0.16)" stroke-width="1"/><path d="M14.3 5.7c.54 1.15 1.56 1.94 2.84 2.13v2.2a5.3 5.3 0 0 1-2.78-.86v4.98a4.2 4.2 0 1 1-3.66-4.16v2.26a1.98 1.98 0 1 0 1.38 1.89V5.7h2.22Z" fill="#25F4EE" transform="translate(-0.55,-0.45)"/><path d="M14.3 5.7c.54 1.15 1.56 1.94 2.84 2.13v2.2a5.3 5.3 0 0 1-2.78-.86v4.98a4.2 4.2 0 1 1-3.66-4.16v2.26a1.98 1.98 0 1 0 1.38 1.89V5.7h2.22Z" fill="#FE2C55" transform="translate(0.55,0.45)"/><path d="M14.3 5.7c.54 1.15 1.56 1.94 2.84 2.13v2.2a5.3 5.3 0 0 1-2.78-.86v4.98a4.2 4.2 0 1 1-3.66-4.16v2.26a1.98 1.98 0 1 0 1.38 1.89V5.7h2.22Z" fill="#FFFFFF"/></svg>';
  var ICON_X = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#F5F5F7" style="flex-shrink:0"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
  var ICON_INSTAGRAM = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><defs><linearGradient id="sm-rt-ig" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#FEDA75"/><stop offset="28%" stop-color="#FA7E1E"/><stop offset="56%" stop-color="#D62976"/><stop offset="82%" stop-color="#962FBF"/><stop offset="100%" stop-color="#4F5BD5"/></linearGradient></defs><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="url(#sm-rt-ig)"/><rect x="6" y="6" width="12" height="12" rx="3.4" stroke="#FFFFFF" stroke-width="1.6"/><circle cx="12" cy="12" r="2.9" stroke="#FFFFFF" stroke-width="1.6"/><circle cx="15.8" cy="8.2" r="0.95" fill="#FFFFFF"/></svg>';
  var ICON_WHATSAPP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path fill="#25D366" d="M12.04 2C6.54 2 2.08 6.46 2.08 11.96c0 1.76.46 3.47 1.33 4.98L2 22l5.2-1.36a9.92 9.92 0 0 0 4.84 1.24h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Z"/><path fill="#FFFFFF" d="M17.36 14.84c-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.13-.57.12-.17.25-.65.81-.8.98-.15.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.57-1.37-.78-1.87-.2-.49-.41-.42-.57-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.61c.13.17 1.78 2.71 4.31 3.8.6.26 1.07.42 1.44.53.6.19 1.15.16 1.59.1.48-.07 1.48-.6 1.69-1.19.21-.59.21-1.09.15-1.19-.06-.1-.23-.17-.48-.29Z"/></svg>';
  var ICON_GITHUB = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#F5F5F7" style="flex-shrink:0"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.36 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.88-2.78.62-3.37-1.21-3.37-1.21-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.85.09-.66.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"/></svg>';
  var ICON_DISCORD = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2" style="flex-shrink:0"><path d="M19.73 4.87A18.2 18.2 0 0 0 15.24 3.5a12.5 12.5 0 0 0-.56 1.15 16.8 16.8 0 0 0-5.36 0A12.4 12.4 0 0 0 8.76 3.5a18.2 18.2 0 0 0-4.5 1.37C1.42 9.13.65 13.28 1.03 17.37a18.4 18.4 0 0 0 5.51 2.78c.45-.61.84-1.26 1.18-1.95-.65-.24-1.27-.54-1.85-.89.15-.11.3-.23.45-.35a12.9 12.9 0 0 0 11.36 0c.15.12.3.24.45.35-.58.35-1.2.65-1.85.89.34.69.73 1.34 1.18 1.95a18.3 18.3 0 0 0 5.51-2.78c.45-4.74-.77-8.85-3.24-12.5ZM8.34 14.85c-1.08 0-1.97-.99-1.97-2.21 0-1.22.87-2.21 1.97-2.21 1.11 0 1.99 1 1.97 2.21 0 1.22-.87 2.21-1.97 2.21Zm7.32 0c-1.08 0-1.97-.99-1.97-2.21 0-1.22.87-2.21 1.97-2.21 1.11 0 1.99 1 1.97 2.21 0 1.22-.86 2.21-1.97 2.21Z"/></svg>';
  var ICON_WEIBO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path fill="#E6162D" d="M10.1 19.6c-4.25 0-7.7-2.06-7.7-4.88 0-1.96 1.62-4.38 4.18-6.4 2.4-1.88 4.92-2.66 5.95-1.66.48.46.49 1.32.15 2.26-.15.42.28.27.56.16 2.15-.84 4.12-.74 4.78.34.34.56.26 1.34-.1 2.16-.14.33.08.43.42.54 1.35.42 2.26 1.24 2.26 2.42 0 2.94-4.25 5.06-10.5 5.06Z"/><ellipse cx="9.8" cy="15.1" rx="3.35" ry="2.35" fill="#FFFFFF"/><circle cx="9.25" cy="15.3" r="1.35" fill="#141416"/><circle cx="8.7" cy="14.75" r="0.42" fill="#FFFFFF"/><path d="M16.2 6.7a3.1 3.1 0 0 1 3.1 3.1M15.9 4.1a5.7 5.7 0 0 1 5.7 5.7" stroke="#FF8200" stroke-width="1.65" stroke-linecap="round"/></svg>';
  var ICON_SOFAYES_SSO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M5.2 10.4C5.2 7.45 7.6 5.4 12 5.4C16.4 5.4 18.8 7.45 18.8 10.4V13.4H5.2V10.4Z" fill="#FFFFFF"/><rect x="3.4" y="12.2" width="17.2" height="4.4" rx="2.2" fill="#10B981"/><circle cx="7.4" cy="18.1" r="1.25" fill="#10B981" opacity="0.82"/><circle cx="16.6" cy="18.1" r="1.25" fill="#10B981" opacity="0.82"/></svg>';
  var ICON_MORE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" style="flex-shrink:0"><path d="M12 5v14M5 12h14"/></svg>';
  var PROVIDER_ICONS = {
    wechat: ICON_WECHAT,
    douyin: ICON_DOUYIN,
    apple: ICON_APPLE,
    google: ICON_GOOGLE,
    facebook: ICON_FACEBOOK,
    tiktok: ICON_TIKTOK,
    x: ICON_X,
    instagram: ICON_INSTAGRAM,
    whatsapp: ICON_WHATSAPP,
    github: ICON_GITHUB,
    discord: ICON_DISCORD,
    weibo: ICON_WEIBO,
    sofayes: ICON_SOFAYES_SSO,
  };
  var ICON_QR = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5F5F7" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/><path d="M14.5 14.5h2v2h-2zM18.5 14.5h2v2h-2zM14.5 18.5h2v2h-2zM18.5 18.5h2v2h-2z" fill="#F5F5F7" stroke="none"/></svg>';
  var ICON_PASS = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"><path d="M4.5 8.2L9.2 12L4.5 15.8V8.2ZM19.5 8.2L14.8 12L19.5 15.8V8.2ZM9.2 12L12 9.4L14.8 12L12 14.6L9.2 12Z"/></svg>';
  var ICON_CLOSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
  var ICON_BACK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

  function ensureHost() {
    if (hostEl && shadow) return;
    hostEl = document.createElement('div');
    hostEl.id = 'sm-matrix-auth-host';
    hostEl.setAttribute('data-matrix-auth-modal', '1');
    shadow = hostEl.attachShadow({ mode: 'open' });
    document.body.appendChild(hostEl);
  }

  function renderModal() {
    if (!modalOpen) {
      if (hostEl && hostEl.parentNode) hostEl.parentNode.removeChild(hostEl);
      hostEl = null;
      shadow = null;
      return;
    }
    ensureHost();

    var loc = getLocale();
    var isEn = loc === 'en';
    var cfg = effectiveConfig();
    var appTitle = isEn ? cfg.appNameEn : cfg.appName;
    var fwZone = qrState.firewallZone || cfg.firewallZone;
    var fwText = firewallLabel(fwZone, loc);

    var topLeftHtml =
      currentView === 'methods'
        ? '<div class="brand">' + ICON_SOFA + '<span>' + escapeHtml(appTitle) + '</span></div>'
        : '<button type="button" class="back-btn" data-act="back">' + ICON_BACK + '<span>' + (isEn ? 'Back' : '返回') + '</span></button>';

    var fwHtml = fwText
      ? '<div class="fw-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" stroke-width="2"><path d="M12 3l7.5 3.2v5.6c0 4.6-3.1 8.6-7.5 9.9-4.4-1.3-7.5-5.3-7.5-9.9V6.2L12 3z"/></svg><span>' + escapeHtml(fwText) + '</span></div>'
      : '';

    function renderFirewallOAuthNotice() {
      if (!pendingFirewallOAuth) return '';
      var pLabel = providerLabel(pendingFirewallOAuth.providerId, loc);
      var msg = isEn
        ? 'BU-02 Isolated Firewall active: SofaYes App QR Sign-In (with 2-digit security check) is primary. You may also hand off ' + pLabel + ' via SofaYes Auth.'
        : '当前处于 BU-02 金融合规防火墙独立隔离舱，推荐优先使用「沙发 App 扫码（含 2 位安全数字核验）」；如需使用「' + pLabel + '」跨舱授权，请点击下方继续前往。';
      return (
        '<div class="fw-oauth-box">' +
        '<p>' + escapeHtml(msg) + '</p>' +
        '<div class="fw-oauth-actions">' +
        '<button type="button" class="fw-btn-qr" data-act="open-qr">' + (isEn ? 'Use QR Sign-In' : '优先扫码登录') + '</button>' +
        '<button type="button" class="fw-btn-go" data-act="confirm-fw-oauth">' + escapeHtml(isEn ? 'Continue (' + pLabel + ')' : '继续 ' + pLabel) + '</button>' +
        '</div></div>'
      );
    }

    var bodyHtml = '';
    if (currentView === 'methods') {
      var tip = isEn ? 'Continue with SofaYes App' : '使用 沙发 App 扫码登录';
      var legalHtml = isEn
        ? 'By continuing, you agree to the <a href="' + escapeHtml(cfg.termsUrl) + '" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="' + escapeHtml(cfg.privacyUrl) + '" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.'
        : '继续即表示您同意我们的 <a href="' + escapeHtml(cfg.termsUrl) + '" target="_blank" rel="noopener noreferrer">服务条款</a> 与 <a href="' + escapeHtml(cfg.privacyUrl) + '" target="_blank" rel="noopener noreferrer">隐私政策</a>。';

      bodyHtml =
        '<div class="view">' +
        '<h2 class="title' + (fwText ? ' tight' : '') + '">' + escapeHtml(isEn ? 'Sign in to ' + appTitle : '登录 ' + appTitle) + '</h2>' +
        '<button type="button" class="pill-primary" data-act="provider" data-provider="google"><span class="pill-ico">' + ICON_GOOGLE + '</span><span>' + (isEn ? 'Continue with Google' : '使用 Google 账号继续') + '</span></button>' +
        '<button type="button" class="pill-secondary" data-act="email"><span class="pill-ico">' + ICON_MAIL + '</span><span>' + (isEn ? 'Continue with email or phone' : '使用邮箱或手机号继续') + '</span></button>' +
        '<div class="icon-row">' +
        '<button type="button" class="ico-btn" data-act="provider" data-provider="wechat" aria-label="' + (isEn ? 'WeChat' : '微信') + '" title="' + (isEn ? 'WeChat' : '微信') + '">' + ICON_WECHAT + '</button>' +
        '<button type="button" class="ico-btn" data-act="provider" data-provider="apple" aria-label="Apple" title="Apple">' + ICON_APPLE + '</button>' +
        '<button type="button" class="ico-btn" data-act="provider" data-provider="douyin" aria-label="' + (isEn ? 'Douyin' : '抖音') + '" title="' + (isEn ? 'Douyin' : '抖音') + '">' + ICON_DOUYIN + '</button>' +
        '<div class="qr-wrap">' +
        '<div class="qr-tip-wrap"><button type="button" class="qr-tip" data-act="open-qr">' + escapeHtml(tip) + '</button></div>' +
        '<button type="button" class="ico-btn" data-act="open-qr" aria-label="' + escapeHtml(tip) + '">' + ICON_QR + '</button>' +
        '</div>' +
        '<button type="button" class="ico-more" data-act="more-providers" aria-label="' + (isEn ? 'More sign-in providers (13)' : '更多第三方登录方式（全部 13 种）') + '">' + ICON_MORE + '<span>' + (isEn ? 'More' : '更多') + '</span></button>' +
        '</div>' +
        renderFirewallOAuthNotice() +
        (inlineMessage ? '<div class="notice">' + escapeHtml(inlineMessage) + '</div>' : '') +
        '<p class="legal">' + legalHtml + '</p>' +
        '</div>';
    } else if (currentView === 'providers') {
      var tilesHtml = '';
      for (var pi = 0; pi < CANONICAL_PROVIDERS.length; pi++) {
        var prov = CANONICAL_PROVIDERS[pi];
        var pName = isEn ? prov.en : prov.zh;
        var pIco = PROVIDER_ICONS[prov.id] || ICON_SOFA;
        var spanCls = prov.id === 'sofayes' ? ' span2' : '';
        tilesHtml +=
          '<button type="button" class="prov-tile' + spanCls + '" data-act="provider" data-provider="' + prov.id + '" aria-label="' + escapeHtml(isEn ? 'Continue with ' + prov.en : '使用 ' + prov.zh + ' 登录') + '">' +
          pIco + '<span>' + escapeHtml(pName) + '</span></button>';
      }
      bodyHtml =
        '<div class="view">' +
        '<div class="prov-head">' +
        '<div class="prov-head-row"><h2>' + (isEn ? 'All sign-in providers' : '全部第三方登录方式') + '</h2><span class="prov-count">' + (isEn ? '13 options' : '13 种方式') + '</span></div>' +
        '<p>' + escapeHtml(isEn ? 'Select a connected account to continue to ' + appTitle + '.' : '选择任意第三方账号授权登录 ' + appTitle + '。') + '</p>' +
        '</div>' +
        '<div class="prov-grid">' + tilesHtml + '</div>' +
        renderFirewallOAuthNotice() +
        (inlineMessage ? '<div class="notice">' + escapeHtml(inlineMessage) + '</div>' : '') +
        '</div>';
    } else if (currentView === 'email') {
      bodyHtml =
        '<form class="view" data-act="email-form" novalidate>' +
        '<h2 class="sub-title">' + (isEn ? 'Email or phone sign-in' : '邮箱或手机号登录') + '</h2>' +
        '<p class="sub-desc">' + escapeHtml(isEn ? 'Enter your email or phone number for ' + appTitle + '.' : '输入您的邮箱地址或手机号以登录 ' + appTitle + '。') + '</p>' +
        '<input class="input" name="contact" type="text" autocomplete="username" placeholder="' + escapeHtml(isEn ? 'name@example.com or +86 138...' : '输入邮箱或手机号') + '" />' +
        (inlineMessage ? '<div class="notice">' + escapeHtml(inlineMessage) + '</div>' : '') +
        '<button type="submit" class="pill-primary" style="margin-top:16px">' + (isEn ? 'Continue' : '下一步') + '</button>' +
        '<button type="button" class="pill-secondary" data-act="open-qr">' + (isEn ? 'Use SofaYes App QR Sign-In' : '改用「沙发 App」扫码一键登录') + '</button>' +
        '</form>';
    } else {
      var st = qrState.state;
      var blocked = st === 'EXPIRED' || st === 'DENIED' || st === 'ERROR';
      var centerHtml = '';
      if (st === 'CHALLENGE_REQUIRED' && qrState.challengeDisplayCode) {
        centerHtml =
          '<div class="challenge-card">' +
          '<span class="challenge-pill">' + (isEn ? '2-Digit Security Check' : '反钓鱼安全数字核验') + '</span>' +
          '<div class="challenge-num">' + escapeHtml(qrState.challengeDisplayCode) + '</div>' +
          '<p class="challenge-desc">' + (isEn ? 'Tap this exact 2-digit number in your SofaYes App to approve sign-in.' : '请在手机「沙发 App」中点击与上方一致的 2 位数字以确认登录。') + '</p>' +
          '</div>';
      } else {
        var inner = '';
        if (st === 'LOADING' && !qrState.qrSvg) {
          inner = '<div style="display:flex;flex-direction:column;align-items:center;gap:10px"><div class="spin"></div><span style="font-size:11.5px;color:#52525B">' + (isEn ? 'Generating secure QR...' : '正在生成安全二维码...') + '</span></div>';
        } else {
          inner = '<div class="qr-svg' + (blocked || st === 'SCANNED' || st === 'AUTHORIZING' || st === 'AUTHORIZED' ? ' dim' : '') + '">' + qrState.qrSvg + '</div>';
        }
        var ov = '';
        if (st === 'SCANNED') {
          var sName = (qrState.scanner && qrState.scanner.displayName) || (isEn ? 'SofaYes User' : '沙发用户');
          var av = qrState.scanner && qrState.scanner.avatar
            ? '<img src="' + escapeHtml(qrState.scanner.avatar) + '" alt="" />'
            : escapeHtml(sName.slice(0, 1));
          ov = '<div class="qr-overlay"><div class="avatar">' + av + '</div><p style="margin-top:12px;margin-bottom:4px;font-weight:600;color:#FFF">' + escapeHtml(sName) + '</p><p style="margin:0;color:#6EE7B7;font-size:11.5px">' + (isEn ? 'Scanned · Confirm in SofaYes App' : '已扫码 · 请在沙发 App 点击确认') + '</p></div>';
        } else if (st === 'AUTHORIZING' || st === 'AUTHORIZED') {
          ov = '<div class="qr-overlay">' + (st === 'AUTHORIZED' ? '<div class="avatar" style="font-size:22px">✓</div>' : '<div class="spin light"></div>') + '<p style="margin-top:12px;margin-bottom:0;font-weight:500;color:#FFF">' + (st === 'AUTHORIZED' ? (isEn ? 'Signed in with ShineMight Pass' : '沙发通行证授权成功') : (isEn ? 'Verifying PKCE & issuing pass...' : '正在安全核销凭证...')) + '</p></div>';
        } else if (blocked) {
          ov = '<div class="qr-overlay"><p>' + escapeHtml(mapError(qrState.errorCode || 'ERR_QR_EXPIRED', loc)) + '</p><button type="button" class="qr-refresh" data-act="refresh-qr">' + (isEn ? 'Refresh QR Code' : '刷新二维码') + '</button></div>';
        }
        centerHtml = '<div class="qr-box">' + inner + ov + '</div>';
      }

      var statusText =
        st === 'PENDING'
          ? (isEn ? 'Expires in ' + qrState.secondsRemaining + 's' : '有效期剩余 ' + qrState.secondsRemaining + ' 秒')
          : st === 'SCANNED' || st === 'CHALLENGE_REQUIRED'
            ? (isEn ? 'Confirm within ' + qrState.secondsRemaining + 's' : '请在 ' + qrState.secondsRemaining + ' 秒内确认')
            : st === 'LOADING'
              ? (isEn ? 'Connecting edge...' : '连接边缘认证节点...')
              : st === 'AUTHORIZED'
                ? (isEn ? 'Authorized' : '已完成安全登录')
                : (isEn ? 'Session paused' : '会话已暂停');

      bodyHtml =
        '<div class="view">' +
        '<h2 class="sub-title">' + (isEn ? 'Scan with SofaYes App' : '沙发 App 扫码登录') + '</h2>' +
        '<p class="sub-desc">' + escapeHtml(isEn ? 'Open SofaYes App and scan to sign in to ' + appTitle : '打开手机「沙发」App 扫一扫，安全授权登录 ' + appTitle) + '</p>' +
        centerHtml +
        '<div class="qr-meta"><span>' + escapeHtml(statusText) + '</span>' +
        (st === 'PENDING' || blocked ? '<button type="button" class="link-btn" data-act="refresh-qr">' + (isEn ? 'Refresh' : '换一张') + '</button>' : '') +
        '</div></div>';
    }

    var footerLabel = isEn ? 'ShineMight Pass · SofaYes' : 'ShineMight Pass · 沙发通行证';
    shadow.innerHTML =
      '<style>' + SHADOW_CSS + '</style>' +
      '<div class="backdrop" role="dialog" aria-modal="true">' +
      '<div class="card">' +
      '<div class="grabber"></div>' +
      '<div class="topbar">' + topLeftHtml + '<button type="button" class="close-btn" data-act="close" aria-label="' + (isEn ? 'Close' : '关闭') + '">' + ICON_CLOSE + '</button></div>' +
      fwHtml +
      bodyHtml +
      '<div class="footer">' + ICON_PASS + '<span>' + footerLabel + '</span></div>' +
      '</div></div>';

    bindShadowEvents();
  }

  function bindShadowEvents() {
    if (!shadow) return;
    var backdrop = shadow.querySelector('.backdrop');
    var card = shadow.querySelector('.card');
    if (backdrop) {
      backdrop.addEventListener('click', function (ev) {
        if (ev.target === backdrop) closeModal();
      });
    }
    var acts = shadow.querySelectorAll('[data-act]');
    for (var i = 0; i < acts.length; i++) {
      (function (el) {
        var act = el.getAttribute('data-act');
        if (act === 'email-form') {
          el.addEventListener('submit', function (ev) {
            ev.preventDefault();
            var inp = el.querySelector('input[name="contact"]');
            var val = inp ? String(inp.value || '').trim() : '';
            var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val) || /^\+?[0-9][0-9\s-]{6,17}$/.test(val);
            inlineMessage = mapError(valid ? 'ERR_METHOD_UNCONFIGURED' : 'ERR_INVALID_CONTACT', getLocale());
            renderModal();
          });
          return;
        }
        el.addEventListener('click', function () {
          if (act === 'close') closeModal();
          else if (act === 'back') { teardownQr(); inlineMessage = ''; pendingFirewallOAuth = null; currentView = 'methods'; renderModal(); }
          else if (act === 'more-providers') { inlineMessage = ''; pendingFirewallOAuth = null; currentView = 'providers'; renderModal(); }
          else if (act === 'email') { inlineMessage = ''; pendingFirewallOAuth = null; currentView = 'email'; renderModal(); }
          else if (act === 'open-qr') { inlineMessage = ''; pendingFirewallOAuth = null; currentView = 'qr'; renderModal(); startQrSession(0); }
          else if (act === 'refresh-qr') { startQrSession(0); }
          else if (act === 'confirm-fw-oauth') {
            if (pendingFirewallOAuth && pendingFirewallOAuth.handoffUrl && window.location) {
              var dest = pendingFirewallOAuth.handoffUrl;
              if (typeof window.location.assign === 'function') window.location.assign(dest);
              else window.location.href = dest;
            }
          } else if (act === 'provider') {
            var provider = el.getAttribute('data-provider');
            inlineMessage = '';
            pendingFirewallOAuth = null;
            var cb = typeof modalOverrides.onOAuthProvider === 'function'
              ? modalOverrides.onOAuthProvider
              : (typeof modalOverrides.onProviderClick === 'function' ? modalOverrides.onProviderClick : null);
            if (cb) {
              try { cb(provider); return; } catch (_) {
                inlineMessage = mapError('ERR_INTERNAL', getLocale());
                renderModal();
                return;
              }
            }
            var cfgNow = effectiveConfig();
            var fwActive = qrState.firewallZone || cfgNow.firewallZone;
            var handoffUrl = buildOAuthHandoffUrl(provider);
            if (fwActive) {
              pendingFirewallOAuth = { providerId: provider, handoffUrl: handoffUrl };
              renderModal();
              return;
            }
            if (window.location) {
              if (typeof window.location.assign === 'function') window.location.assign(handoffUrl);
              else window.location.href = handoffUrl;
              return;
            }
            inlineMessage = mapError('ERR_METHOD_UNCONFIGURED', getLocale());
            renderModal();
          }
        });
      })(acts[i]);
    }

    // 120Hz GPU-only mobile drag-to-dismiss directly on DOM transform
    if (card && window.innerWidth < 768) {
      var drag = { on: false, sy: 0, ly: 0, lt: 0, v: 0 };
      card.addEventListener('touchstart', function (ev) {
        if (ev.target && ev.target.closest && ev.target.closest('input,button,a')) return;
        var t = ev.touches[0];
        if (!t) return;
        drag = { on: true, sy: t.clientY, ly: t.clientY, lt: performance.now(), v: 0 };
        card.style.transition = 'none';
      }, { passive: true });
      card.addEventListener('touchmove', function (ev) {
        if (!drag.on) return;
        var t = ev.touches[0];
        if (!t) return;
        var dy = Math.max(0, t.clientY - drag.sy);
        var now = performance.now();
        drag.v = (t.clientY - drag.ly) / Math.max(1, now - drag.lt);
        drag.ly = t.clientY;
        drag.lt = now;
        card.style.transform = 'translate3d(0,' + dy + 'px,0)';
        card.style.opacity = String(Math.max(0.55, 1 - dy / 420));
      }, { passive: true });
      card.addEventListener('touchend', function () {
        if (!drag.on) return;
        drag.on = false;
        var dy = Math.max(0, drag.ly - drag.sy);
        card.style.transition = 'transform .26s cubic-bezier(.22,1.12,.36,1),opacity .22s ease';
        if (dy > 110 || drag.v > 0.65) {
          card.style.transform = 'translate3d(0,120%,0)';
          card.style.opacity = '0';
          setTimeout(closeModal, 180);
        } else {
          card.style.transform = 'translate3d(0,0,0)';
          card.style.opacity = '1';
        }
      }, { passive: true });
    }
  }

  function startCountdown(myRun) {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(function () {
      if (!modalOpen || myRun !== activeRunId) { clearInterval(countdownTimer); return; }
      var st = qrState.state;
      if (st !== 'PENDING' && st !== 'SCANNED' && st !== 'CHALLENGE_REQUIRED') {
        clearInterval(countdownTimer);
        return;
      }
      var dl = st === 'PENDING' ? qrState.expiresAtMs : (qrState.confirmExpiresAtMs || qrState.expiresAtMs);
      if (!dl) return;
      var rem = Math.max(0, Math.ceil((dl - Date.now()) / 1000));
      if (rem !== qrState.secondsRemaining) {
        qrState.secondsRemaining = rem;
        var metaSpan = shadow && shadow.querySelector('.qr-meta span');
        if (metaSpan) {
          var isEn = getLocale() === 'en';
          metaSpan.textContent =
            st === 'PENDING'
              ? (isEn ? 'Expires in ' + rem + 's' : '有效期剩余 ' + rem + ' 秒')
              : (isEn ? 'Confirm within ' + rem + 's' : '请在 ' + rem + ' 秒内确认');
        }
      }
      if (rem <= 0) handleLocalExpiry(myRun);
    }, 1000);
  }

  function handleLocalExpiry(myRun) {
    if (!modalOpen || myRun !== activeRunId) return;
    var wasPending = qrState.state === 'PENDING';
    var nextAuto = qrState.autoRefreshCount + 1;
    if (wasPending && nextAuto <= qrState.maxAutoRefresh) {
      startQrSession(nextAuto);
      return;
    }
    teardownQr();
    qrState.state = 'EXPIRED';
    qrState.secondsRemaining = 0;
    qrState.challengeDisplayCode = null;
    qrState.errorCode = wasPending ? 'ERR_AUTO_REFRESH_LIMIT' : 'ERR_QR_EXPIRED';
    renderModal();
  }

  function startQrSession(autoCount) {
    teardownQr();
    var myRun = activeRunId;
    var cfg = effectiveConfig();
    var loc = getLocale();
    lastVersion = 0;
    lastStatus = 'PENDING';
    qrState = {
      state: 'LOADING',
      qrToken: null,
      qrSvg: '',
      expiresAtMs: null,
      confirmExpiresAtMs: null,
      secondsRemaining: QR_UNSCANNED_TTL_SEC,
      autoRefreshCount: autoCount,
      maxAutoRefresh: MAX_AUTO_REFRESH,
      challengeDisplayCode: null,
      firewallZone: cfg.firewallZone || '',
      scanner: null,
      errorCode: null,
    };
    renderModal();

    generatePkce()
      .then(function (pkce) {
        if (!modalOpen || myRun !== activeRunId) return;
        codeVerifier = pkce.codeVerifier;
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        activeAbort = ctrl;
        return fetch(cfg.apiBase + '/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-SM-Locale': loc },
          body: JSON.stringify({
            projectId: cfg.projectId,
            codeChallenge: pkce.codeChallenge,
            codeChallengeMethod: 'S256',
            clientKind: 'web',
            origin: window.location.origin,
          }),
          signal: ctrl ? ctrl.signal : undefined,
        }).then(function (res) {
          return res.json().catch(function () { return null; }).then(function (body) {
            return { ok: res.ok, body: body };
          });
        });
      })
      .then(function (result) {
        if (!result || !modalOpen || myRun !== activeRunId) return;
        var body = result.body;
        if (!result.ok || !body || !body.success || !body.qrToken || !body.pollSecret) {
          qrState.state = 'ERROR';
          qrState.errorCode = (body && body.errorCode) || 'ERR_INTERNAL';
          renderModal();
          return;
        }
        pollSecret = body.pollSecret;
        var uri = body.qrUniversalUrl || body.qrUri;
        qrState.qrToken = body.qrToken;
        qrState.qrSvg = encodeQrToSvg(uri, 204);
        var expMs = Date.parse(body.expiresAt);
        qrState.expiresAtMs = isFinite(expMs) ? expMs : Date.now() + QR_UNSCANNED_TTL_SEC * 1000;
        qrState.secondsRemaining = Math.max(1, Math.ceil((qrState.expiresAtMs - Date.now()) / 1000));
        qrState.maxAutoRefresh = typeof body.maxAutoRefresh === 'number' ? Math.min(body.maxAutoRefresh, MAX_AUTO_REFRESH) : MAX_AUTO_REFRESH;
        if (body.project && body.project.complianceFirewallZone) {
          qrState.firewallZone = body.project.complianceFirewallZone;
        }
        qrState.state = 'PENDING';
        renderModal();
        startCountdown(myRun);
        connectWs(myRun, cfg.apiBase);
      })
      .catch(function (err) {
        if (!modalOpen || myRun !== activeRunId) return;
        qrState.state = 'ERROR';
        qrState.errorCode = err && err.message === 'ERR_CRYPTO_UNAVAILABLE' ? 'ERR_CRYPTO_UNAVAILABLE' : 'ERR_NETWORK_UNAVAILABLE';
        renderModal();
      });
  }

  function qsAuth() {
    var qs = new URLSearchParams();
    if (qrState.qrToken) qs.set('qrToken', qrState.qrToken);
    if (pollSecret) qs.set('pollSecret', pollSecret);
    qs.set('lang', getLocale());
    return qs.toString();
  }

  function connectWs(myRun, apiBase) {
    if (typeof window.WebSocket !== 'function') { connectSse(myRun, apiBase); return; }
    var wsBase = apiBase.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
    var settled = false, gotFrame = false;
    function fallback() {
      if (settled || !modalOpen || myRun !== activeRunId) return;
      settled = true;
      if (wsPingTimer) { clearInterval(wsPingTimer); wsPingTimer = null; }
      if (activeWs) { try { activeWs.close(); } catch (_) {} activeWs = null; }
      connectSse(myRun, apiBase);
    }
    try {
      var ws = new WebSocket(wsBase + '/ws?' + qsAuth());
      activeWs = ws;
      var tmo = setTimeout(function () { if (!gotFrame && !settled) fallback(); }, 4500);
      ws.onopen = function () {
        wsPingTimer = setInterval(function () {
          if (ws.readyState === 1) { try { ws.send(JSON.stringify({ type: 'ping' })); } catch (_) { fallback(); } }
        }, 20000);
      };
      ws.onmessage = function (ev) {
        if (!modalOpen || myRun !== activeRunId) return;
        gotFrame = true;
        clearTimeout(tmo);
        try {
          var p = JSON.parse(String(ev.data || '{}'));
          if (p.type !== 'pong' && p.status) handleStatus(myRun, p, apiBase);
        } catch (_) {}
      };
      ws.onerror = function () { clearTimeout(tmo); fallback(); };
      ws.onclose = function () {
        clearTimeout(tmo);
        if (wsPingTimer) { clearInterval(wsPingTimer); wsPingTimer = null; }
        if (qrState.state === 'PENDING' || qrState.state === 'SCANNED' || qrState.state === 'CHALLENGE_REQUIRED') fallback();
      };
    } catch (_) { fallback(); }
  }

  function connectSse(myRun, apiBase) {
    if (typeof window.EventSource !== 'function') { startLongPoll(myRun, apiBase, 0); return; }
    var settled = false;
    function fallback() {
      if (settled || !modalOpen || myRun !== activeRunId) return;
      settled = true;
      if (activeEs) { try { activeEs.close(); } catch (_) {} activeEs = null; }
      startLongPoll(myRun, apiBase, 0);
    }
    try {
      var es = new EventSource(apiBase + '/stream?' + qsAuth());
      activeEs = es;
      var onEv = function (ev) {
        if (!modalOpen || myRun !== activeRunId) return;
        try {
          var p = JSON.parse(String(ev.data || '{}'));
          if (p.status) handleStatus(myRun, p, apiBase);
        } catch (_) {}
      };
      es.addEventListener('qr_status', onEv);
      es.onmessage = onEv;
      es.onerror = function () {
        if (qrState.state === 'PENDING' || qrState.state === 'SCANNED' || qrState.state === 'CHALLENGE_REQUIRED') fallback();
      };
    } catch (_) { fallback(); }
  }

  function startLongPoll(myRun, apiBase, failCount) {
    if (!modalOpen || myRun !== activeRunId) return;
    if (qrState.state !== 'PENDING' && qrState.state !== 'SCANNED' && qrState.state !== 'CHALLENGE_REQUIRED') return;
    if (!qrState.qrToken || !pollSecret) return;

    var qs = new URLSearchParams();
    qs.set('qrToken', qrState.qrToken);
    qs.set('lastStatus', lastStatus);
    qs.set('timeoutMs', String(LONG_POLL_TIMEOUT_MS));
    qs.set('lang', getLocale());
    if (lastVersion > 0) qs.set('since', String(lastVersion));

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    activeAbort = ctrl;
    fetch(apiBase + '/poll?' + qs.toString(), {
      method: 'GET',
      headers: { 'X-QR-Poll-Secret': pollSecret, 'X-SM-Locale': getLocale() },
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (res) {
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!modalOpen || myRun !== activeRunId) return;
          if (!res.ok) {
            var code = (data && data.errorCode) || 'ERR_INTERNAL';
            if (code === 'ERR_QR_SESSION_NOT_FOUND' || code === 'ERR_QR_EXPIRED') {
              handleLocalExpiry(myRun);
              return;
            }
            throw new Error(code);
          }
          if (data && data.status) handleStatus(myRun, data, apiBase);
          if (qrState.state === 'PENDING' || qrState.state === 'SCANNED' || qrState.state === 'CHALLENGE_REQUIRED') {
            pollTimer = setTimeout(function () { startLongPoll(myRun, apiBase, 0); }, 150);
          }
        });
      })
      .catch(function () {
        if (!modalOpen || myRun !== activeRunId) return;
        if (qrState.state !== 'PENDING' && qrState.state !== 'SCANNED' && qrState.state !== 'CHALLENGE_REQUIRED') return;
        var nextFail = failCount + 1;
        var delay = Math.min(8000, 600 * Math.pow(2, Math.min(nextFail - 1, 4)));
        pollTimer = setTimeout(function () { startLongPoll(myRun, apiBase, nextFail); }, delay);
      });
  }

  function handleStatus(myRun, p, apiBase) {
    if (!modalOpen || myRun !== activeRunId) return;
    if (typeof p.version === 'number' && p.version > lastVersion) lastVersion = p.version;
    lastStatus = p.status;
    if (p.complianceFirewallZone) qrState.firewallZone = p.complianceFirewallZone;
    if (p.scanner) qrState.scanner = p.scanner;
    var cExp = p.confirmExpiresAt ? Date.parse(p.confirmExpiresAt) : NaN;
    if (isFinite(cExp)) qrState.confirmExpiresAtMs = cExp;

    if (p.status === 'SCANNED' || p.status === 'CHALLENGE_REQUIRED') {
      qrState.state = p.status === 'CHALLENGE_REQUIRED' || p.challengeRequired ? 'CHALLENGE_REQUIRED' : 'SCANNED';
      qrState.challengeDisplayCode = p.challengeDisplayCode || null;
      var dl = qrState.confirmExpiresAtMs || qrState.expiresAtMs;
      qrState.secondsRemaining = dl ? Math.max(0, Math.ceil((dl - Date.now()) / 1000)) : QR_SCANNED_CONFIRM_TTL_SEC;
      renderModal();
    } else if (p.status === 'AUTHORIZED' && p.authCode) {
      if (exchangingCode === p.authCode) return;
      exchangingCode = p.authCode;
      var token = qrState.qrToken;
      var secret = pollSecret;
      var verifier = codeVerifier;
      teardownQr();
      var exchangeRun = activeRunId;
      qrState.state = 'AUTHORIZING';
      qrState.challengeDisplayCode = null;
      renderModal();
      exchangeCode(exchangeRun, apiBase, token, p.authCode, secret, verifier);
    } else if (p.status === 'DENIED') {
      teardownQr();
      qrState.state = 'DENIED';
      qrState.errorCode = 'ERR_USER_DENIED';
      renderModal();
    } else if (p.status === 'EXPIRED' || p.status === 'REVOKED') {
      handleLocalExpiry(myRun);
    }
  }

  function exchangeCode(myRun, apiBase, qrToken, authCode, secret, verifier) {
    fetch(apiBase + '/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-QR-Poll-Secret': secret || '',
        'X-SM-Locale': getLocale(),
      },
      body: JSON.stringify({
        qrToken: qrToken,
        authCode: authCode,
        pollSecret: secret,
        codeVerifier: verifier,
      }),
    })
      .then(function (res) {
        return res.json().catch(function () { return null; }).then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (r) {
        if (!modalOpen || myRun !== activeRunId) return;
        var b = r.body;
        if (!r.ok || !b || !b.success || !b.idToken || !b.accessToken || !b.profile) {
          qrState.state = 'ERROR';
          qrState.errorCode = (b && b.errorCode) || 'ERR_INTERNAL';
          renderModal();
          return;
        }
        var cfg = effectiveConfig();
        var session = {
          protocolVersion: b.protocolVersion || '2.0',
          tokenType: 'Bearer',
          expiresIn: typeof b.expiresIn === 'number' ? b.expiresIn : 900,
          issuedAt: Date.now(),
          projectId: b.projectId || cfg.projectId,
          clientId: b.clientId || '',
          aud: b.aud || b.clientId || '',
          domain: b.domain || cfg.domain,
          firewallZone: b.firewallZone || cfg.firewallZone || null,
          unionId: b.unionId || b.profile.unionId,
          scopes: Array.isArray(b.scopes) ? b.scopes : ['openid', 'unionid'],
          jti: b.jti || '',
          idToken: b.idToken,
          accessToken: b.accessToken,
          refreshToken: b.refreshToken || '',
          profile: b.profile,
        };
        saveSession(session);
        qrState.state = 'AUTHORIZED';
        renderModal();
        notifyAuthChange(session);
        try {
          window.dispatchEvent(new CustomEvent('shinemight:auth-success', {
            detail: { projectId: session.projectId, session: session },
          }));
        } catch (_) {}
        if (typeof modalOverrides.onSuccess === 'function') {
          try { modalOverrides.onSuccess(session); } catch (_) {}
        }
        setTimeout(function () {
          if (modalOpen && qrState.state === 'AUTHORIZED') closeModal();
        }, 900);
      })
      .catch(function () {
        if (!modalOpen || myRun !== activeRunId) return;
        qrState.state = 'ERROR';
        qrState.errorCode = 'ERR_NETWORK_UNAVAILABLE';
        renderModal();
      });
  }

  function openLoginModal(opts) {
    modalOverrides = opts && typeof opts === 'object' ? opts : {};
    inlineMessage = '';
    pendingFirewallOAuth = null;
    currentView = modalOverrides.mode === 'qr'
      ? 'qr'
      : modalOverrides.mode === 'providers'
        ? 'providers'
        : 'methods';
    modalOpen = true;
    renderModal();
    if (currentView === 'qr') startQrSession(0);
  }

  function openQrLogin(opts) {
    var merged = {};
    if (opts && typeof opts === 'object') {
      for (var k in opts) merged[k] = opts[k];
    }
    merged.mode = 'qr';
    openLoginModal(merged);
  }

  function closeModal() {
    teardownQr();
    modalOpen = false;
    inlineMessage = '';
    pendingFirewallOAuth = null;
    renderModal();
  }

  /* =========================================================================
   * 6. Global Public API & Event Delegation
   * ========================================================================= */
  window.ShineMightAuth = {
    openLoginModal: openLoginModal,
    openQrLogin: openQrLogin,
    closeModal: closeModal,
    getSession: function (pid) { return getSession(pid); },
    logout: function (pid) { logout(pid); },
    onAuthChange: function (fn) {
      if (typeof fn !== 'function') return function () {};
      authListeners.push(fn);
      return function () {
        var i = authListeners.indexOf(fn);
        if (i >= 0) authListeners.splice(i, 1);
      };
    },
    getConfig: function () { return effectiveConfig(); },
    getProviders: function () { return CANONICAL_PROVIDERS.slice(); },
    buildOAuthHandoffUrl: buildOAuthHandoffUrl,
    encodeQrToSvg: encodeQrToSvg,
  };

  document.addEventListener('keydown', function (ev) {
    if (modalOpen && ev.key === 'Escape') closeModal();
  });

  document.addEventListener('click', function (ev) {
    var target = ev.target;
    if (!target || !target.closest) return;
    var trigger = target.closest('[data-sm-qr-login],[data-sm-login]');
    if (!trigger) return;
    if (document.documentElement.getAttribute('data-matrix-auth-ui') === 'custom' && !trigger.hasAttribute('data-sm-force')) {
      return;
    }
    ev.preventDefault();
    var mode = trigger.getAttribute('data-sm-qr-login') === 'methods' || trigger.hasAttribute('data-sm-login')
      ? 'methods'
      : 'qr';
    openLoginModal({ mode: mode });
  });

  window.addEventListener('sm:open-login', function (ev) {
    var detail = (ev && ev.detail) || {};
    if (document.documentElement.getAttribute('data-matrix-auth-ui') === 'custom' && !detail.force) {
      return;
    }
    openLoginModal(detail);
  });

  if (typeof MutationObserver !== 'undefined') {
    try {
      new MutationObserver(function () {
        if (modalOpen) renderModal();
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    } catch (_) {}
  }
})();
