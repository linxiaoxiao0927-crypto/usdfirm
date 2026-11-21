/**
 * ShineMight OS Universal 9-Palette Theme Runtime + Shadow-DOM Switcher v1.0
 * - Zero dependencies, FOUC-free pre-paint hydration
 * - Syncs with sofayes-app via localStorage key "shinemight_matrix_palette_v2"
 * - Shadow-DOM floating palette pill (skipped automatically if html[data-matrix-theme-ui="custom"])
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__SM_MATRIX_THEME_INIT__) return;
  window.__SM_MATRIX_THEME_INIT__ = true;

  var STORAGE_KEY = 'shinemight_matrix_palette_v2';
  var THEME_KEY = 'sofayes_theme_v2';
  var PALETTES = [
    { id: 'black', zh: '纯黑', en: 'Pure Black', dark: true, bg: '#000000', bg2: '#121214', bg3: '#1C1C1E', fg: '#FFFFFF', fg2: '#A1A1AA', accent: '#10B981', dot: '#10B981' },
    { id: 'dark', zh: '暗黑', en: 'Obsidian', dark: true, bg: '#090A0F', bg2: '#12141C', bg3: '#1B1E2B', fg: '#F8FAFC', fg2: '#94A3B8', accent: '#10B981', dot: '#334155' },
    { id: 'light', zh: '亮白', en: 'Daylight', dark: false, bg: '#F3F4F8', bg2: '#FFFFFF', bg3: '#E8EAF0', fg: '#090D16', fg2: '#475569', accent: '#0A84FF', dot: '#FFFFFF' },
    { id: 'gray', zh: '钛灰', en: 'Titanium', dark: true, bg: '#181A20', bg2: '#22252E', bg3: '#2C303C', fg: '#F9FAFB', fg2: '#CBD5E1', accent: '#38BDF8', dot: '#64748B' },
    { id: 'teal', zh: '蓝绿', en: 'Teal', dark: true, bg: '#061518', bg2: '#0C2227', bg3: '#133138', fg: '#ECFEFF', fg2: '#99F6E4', accent: '#2DD4BF', dot: '#14B8A6' },
    { id: 'purple', zh: '紫色', en: 'Cosmic', dark: true, bg: '#0E081A', bg2: '#18102B', bg3: '#23183E', fg: '#FAF5FF', fg2: '#D8B4FE', accent: '#C084FC', dot: '#A855F7' },
    { id: 'orange', zh: '暖橙', en: 'Amber', dark: true, bg: '#170B05', bg2: '#24130A', bg3: '#331B0F', fg: '#FFF7ED', fg2: '#FDBA74', accent: '#FB923C', dot: '#F97316' },
    { id: 'red', zh: '绯红', en: 'Crimson', dark: true, bg: '#18060A', bg2: '#260C12', bg3: '#36121B', fg: '#FFF1F2', fg2: '#FDA4AF', accent: '#FB7185', dot: '#F43F5E' },
    { id: 'yellow', zh: '流金', en: 'Solar', dark: true, bg: '#151104', bg2: '#221C08', bg3: '#31280D', fg: '#FEFCE8', fg2: '#FDE047', accent: '#FACC15', dot: '#EAB308' },
  ];

  var byId = {};
  for (var i = 0; i < PALETTES.length; i++) byId[PALETTES[i].id] = PALETTES[i];

  function readDefaultPalette() {
    try {
      var cur = document.currentScript;
      var attr = cur && cur.getAttribute('data-default-palette');
      if (attr && byId[attr]) return attr;
      var scripts = document.querySelectorAll('script[data-default-palette]');
      for (var j = 0; j < scripts.length; j++) {
        var v = scripts[j].getAttribute('data-default-palette');
        if (v && byId[v]) return v;
      }
    } catch (_) {}
    return 'black';
  }

  var defaultPalette = readDefaultPalette();
  var activeId = defaultPalette;
  var listeners = [];

  function resolveInitial() {
    try {
      var qs = new URLSearchParams(window.location.search).get('palette');
      if (qs && byId[qs]) return qs;
    } catch (_) {}
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && byId[saved]) return saved;
    } catch (_) {}
    return defaultPalette;
  }

  function applyPalette(id, persist) {
    var spec = byId[id] || byId[defaultPalette] || PALETTES[0];
    activeId = spec.id;
    var root = document.documentElement;
    var skin = spec.dark ? 'dark' : 'light';
    root.setAttribute('data-matrix-palette', spec.id);
    root.setAttribute('data-theme-skin', skin);
    root.style.colorScheme = skin;
    if (spec.dark) root.classList.add('dark');
    else root.classList.remove('dark');

    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, spec.id);
        window.localStorage.setItem(THEME_KEY, skin);
      } catch (_) {}
    }
    try {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', spec.bg);
    } catch (_) {}
    for (var k = 0; k < listeners.length; k++) {
      try { listeners[k](spec); } catch (_) {}
    }
    return spec;
  }

  /* Apply immediately before first paint (zero FOUC) */
  applyPalette(resolveInitial(), false);

  /* Cross-tab sync */
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY && e.newValue && byId[e.newValue]) {
      applyPalette(e.newValue, false);
    }
  });

  window.ShineMightTheme = {
    palettes: PALETTES,
    getPalette: function () { return activeId; },
    setPalette: function (id) { return applyPalette(id, true); },
    subscribe: function (fn) { listeners.push(fn); },
  };

  /* Mount Shadow-DOM floating 9-palette switcher after hydration */
  function mountSwitcher() {
    if (!document.body) return;
    if (document.documentElement.getAttribute('data-matrix-theme-ui') === 'custom') return;
    if (document.getElementById('sm-matrix-theme-host')) return;

    var host = document.createElement('div');
    host.id = 'sm-matrix-theme-host';
    host.setAttribute('data-matrix-theme-switcher', '1');
    host.style.cssText = 'position:fixed;left:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);z-index:2147483000;pointer-events:auto;';
    var shadow = host.attachShadow({ mode: 'open' });

    var isEn = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
    var open = false;

    var style = document.createElement('style');
    style.textContent = [
      '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;}',
      '.wrap{position:relative;}',
      '.fab{width:44px;height:44px;border-radius:9999px;border:1px solid rgba(255,255,255,0.18);background:rgba(18,18,20,0.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 6px 20px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .18s cubic-bezier(.22,1,.36,1),background .2s,border-color .2s;padding:0;}',
      '.fab:focus-visible,.item:focus-visible{outline:2px solid rgba(52,211,153,0.85);outline-offset:2px;}',
      '.fab:active{transform:scale(.92);}',
      '.fab.light{background:rgba(255,255,255,0.9);border-color:rgba(15,23,42,0.14);box-shadow:0 6px 20px rgba(15,23,42,0.14);}',
      '.dot{width:16px;height:16px;border-radius:9999px;border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 0 1px rgba(0,0,0,0.2);}',
      '.fab.light .dot{border-color:rgba(15,23,42,0.75);}',
      '.pop{position:absolute;left:0;bottom:44px;width:236px;padding:10px;border-radius:18px;border:1px solid rgba(255,255,255,0.14);background:rgba(18,18,20,0.94);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 16px 40px rgba(0,0,0,0.48);color:#fff;transform-origin:bottom left;transition:opacity .18s ease,transform .22s cubic-bezier(.22,1,.36,1);opacity:0;transform:scale(.92) translateY(6px);pointer-events:none;}',
      '.pop.open{opacity:1;transform:scale(1) translateY(0);pointer-events:auto;}',
      '.pop.light{background:rgba(255,255,255,0.96);border-color:rgba(15,23,42,0.12);color:#090D16;box-shadow:0 16px 40px rgba(15,23,42,0.16);}',
      '.hd{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:700;opacity:.75;padding:0 2px 8px;}',
      '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}',
      '.item{display:flex;align-items:center;gap:5px;padding:6px 7px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.05);color:inherit;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;transition:transform .14s ease,border-color .15s,background .15s;}',
      '.item:active{transform:scale(.95);}',
      '.pop.light .item{border-color:rgba(15,23,42,0.08);background:rgba(15,23,42,0.04);}',
      '.item.on{border-color:#10B981;background:rgba(16,185,129,0.18);}',
      '.pop.light .item.on{border-color:#0A84FF;background:rgba(10,132,255,0.12);}',
      '.sw{width:11px;height:11px;border-radius:9999px;flex-shrink:0;border:1px solid rgba(128,128,128,0.45);}',
    ].join('');

    var wrap = document.createElement('div');
    wrap.className = 'wrap';

    var pop = document.createElement('div');
    pop.className = 'pop';
    var hd = document.createElement('div');
    hd.className = 'hd';
    hd.textContent = isEn ? '9-Palette Theme' : '全矩阵 9 套配色';
    pop.appendChild(hd);

    var grid = document.createElement('div');
    grid.className = 'grid';
    var btns = {};
    var labelEls = {};

    for (var i = 0; i < PALETTES.length; i++) {
      (function (p) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'item';
        b.setAttribute('data-palette', p.id);
        var sw = document.createElement('span');
        sw.className = 'sw';
        sw.style.background = p.id === 'light' ? '#FFFFFF' : p.id === 'black' ? '#000000' : p.dot;
        var lb = document.createElement('span');
        lb.textContent = isEn ? p.en : p.zh;
        b.appendChild(sw);
        b.appendChild(lb);
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          applyPalette(p.id, true);
          setOpen(false);
        });
        btns[p.id] = b;
        labelEls[p.id] = { el: lb, zh: p.zh, en: p.en };
        grid.appendChild(b);
      })(PALETTES[i]);
    }
    pop.appendChild(grid);

    var fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'fab';
    var dot = document.createElement('span');
    dot.className = 'dot';
    fab.appendChild(dot);

    function syncLocale() {
      isEn = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
      hd.textContent = isEn ? '9-Palette Theme' : '全矩阵 9 套配色';
      fab.setAttribute('aria-label', isEn ? 'Switch Theme Palette' : '切换主题配色');
      fab.title = isEn ? 'Switch 9-Palette Theme' : '切换 9 套主题配色';
      for (var id in labelEls) {
        labelEls[id].el.textContent = isEn ? labelEls[id].en : labelEls[id].zh;
      }
    }
    syncLocale();
    if (typeof MutationObserver !== 'undefined') {
      try {
        var langObserver = new MutationObserver(syncLocale);
        langObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['lang'],
        });
      } catch (_) {}
    }

    function setOpen(next) {
      open = next;
      if (open) pop.classList.add('open');
      else pop.classList.remove('open');
    }

    function syncUi(spec) {
      var isLight = !spec.dark;
      fab.className = isLight ? 'fab light' : 'fab';
      pop.className = (isLight ? 'pop light' : 'pop') + (open ? ' open' : '');
      dot.style.background = spec.id === 'light' ? '#0A84FF' : spec.id === 'black' ? '#000000' : spec.dot;
      for (var k in btns) {
        if (k === spec.id) btns[k].classList.add('on');
        else btns[k].classList.remove('on');
      }
    }

    fab.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setOpen(!open);
    });
    document.addEventListener('click', function (ev) {
      if (open && ev.target !== host) setOpen(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (open && ev.key === 'Escape') setOpen(false);
    });

    wrap.appendChild(pop);
    wrap.appendChild(fab);
    shadow.appendChild(style);
    shadow.appendChild(wrap);
    document.body.appendChild(host);

    listeners.push(syncUi);
    syncUi(byId[activeId] || PALETTES[0]);
  }

  /* Mount slightly after initial hydration to avoid any SSR mismatch */
  function scheduleMount() {
    setTimeout(function () {
      try {
        var qs = new URLSearchParams(window.location.search).get('palette');
        if (qs && byId[qs]) applyPalette(qs, false);
        else {
          var saved = window.localStorage.getItem(STORAGE_KEY);
          if (saved && byId[saved]) applyPalette(saved, false);
        }
      } catch (_) {}
      mountSwitcher();
      installTapToTop();
    }, 120);
  }

  /* ── Global iOS-Style Tap-to-Top (Zero-Dependency Delegated Runtime) ── */
  function installTapToTop() {
    var INTERACTIVE_SEL =
      'button,a[href],input,textarea,select,option,label,summary,details,' +
      '[role="button"],[role="link"],[role="tab"],[role="menuitem"],' +
      '[role="switch"],[role="checkbox"],[role="radio"],[role="combobox"],' +
      '[role="searchbox"],[role="slider"],[role="spinbutton"],' +
      '[contenteditable="true"],[contenteditable=""],[data-no-tap-to-top],' +
      '[onclick],video,audio,canvas';
    var HEADING_TAGS = { H1: 1, H2: 1, H3: 1, H4: 1, P: 1, HEADER: 1 };

    function hasReactHandler(el) {
      try {
        var keys = Object.keys(el);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf('__reactProps$') === 0) {
            var p = el[keys[i]];
            if (p && (typeof p.onClick === 'function' || typeof p.onPointerDown === 'function' || typeof p.onMouseDown === 'function' || typeof p.onTouchStart === 'function')) {
              return true;
            }
          }
        }
      } catch (_) {}
      return false;
    }

    function isInteractive(target, boundary) {
      if (!target) return true;
      var node = target.nodeType === 1 ? target : target.parentElement;
      if (!node) return true;
      if (node.closest && node.closest('#sm-matrix-theme-host,[data-matrix-theme-switcher]')) return true;
      var bCur = '';
      try { bCur = boundary ? window.getComputedStyle(boundary).cursor || '' : ''; } catch (_) {}
      while (node && node !== document.body && node !== document.documentElement) {
        if (node.getAttribute && node.getAttribute('data-no-tap-to-top') !== null) return true;
        if (node === boundary) {
          return Boolean(node.matches && node.matches('button,a[href],input,textarea,select,[role="button"],[role="link"],[role="tab"]'));
        }
        var optIn = node.getAttribute && node.getAttribute('data-tap-to-top');
        if (optIn === 'true' || optIn === '') return false;
        if (node.matches && node.matches(INTERACTIVE_SEL)) return true;
        if (hasReactHandler(node)) return true;
        if (!HEADING_TAGS[node.tagName]) {
          try {
            if (window.getComputedStyle(node).cursor === 'pointer' && bCur !== 'pointer') return true;
          } catch (_) {}
        }
        node = node.parentElement;
      }
      return false;
    }

    function winTop() {
      return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || (document.body && document.body.scrollTop) || 0;
    }

    function isVisScrollable(el) {
      if (!el || el.scrollTop <= 0) return false;
      if (el.scrollHeight <= el.clientHeight + 4) return false;
      if (el.getAttribute && (el.getAttribute('data-scroll-aux') === 'true' || el.getAttribute('data-scroll-container') === 'aux')) return false;
      var r = el.getBoundingClientRect();
      if (r.width < 120 || r.height < 120) return false;
      if (r.right <= 0 || r.left >= window.innerWidth || r.bottom <= 0 || r.top >= window.innerHeight) return false;
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
      return cs.overflowY === 'auto' || cs.overflowY === 'scroll' || cs.overflowY === 'overlay';
    }

    function pickBest(root, minWR, minHR) {
      var minW = Math.min(260, window.innerWidth * minWR);
      var minH = Math.min(220, window.innerHeight * minHR);
      var best = null, bestScore = -1;
      var all = root.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.scrollTop <= 0 || !isVisScrollable(el)) continue;
        var r = el.getBoundingClientRect();
        if (r.width < minW || r.height < minH) continue;
        var score = r.width * r.height +
          (el.closest && el.closest('[data-ios-subpage="true"],[role="dialog"],[aria-modal="true"]') ? 1e9 : 0) +
          (el.getAttribute('data-scroll-container') === 'primary' || el.tagName === 'MAIN' ? 1e7 : 0);
        if (score > bestScore) { bestScore = score; best = el; }
      }
      return best;
    }

    function findTarget(preferred, origin) {
      if (preferred) {
        var t = preferred === window ? winTop() : preferred.scrollTop;
        return t > 0 ? preferred : null;
      }
      var modal = origin && origin.closest && origin.closest('[role="dialog"],[aria-modal="true"],[data-ios-subpage="true"]');
      if (modal) {
        if (isVisScrollable(modal)) return modal;
        return pickBest(modal, 0.25, 0.2);
      }
      var prims = document.querySelectorAll('[data-scroll-container="primary"]');
      for (var i = prims.length - 1; i >= 0; i--) {
        if (isVisScrollable(prims[i])) return prims[i];
      }
      if (winTop() > 0) return window;
      return document.body ? pickBest(document.body, 0.42, 0.28) : null;
    }

    function scrollToTop(preferred, origin) {
      var t = findTarget(preferred, origin);
      if (!t) return false;
      try {
        t.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (_) {
        if (t === window) window.scrollTo(0, 0);
        else t.scrollTop = 0;
      }
      return true;
    }

    if (!window.ShineMightTapToTop) {
      window.ShineMightTapToTop = { scrollToTop: function (p) { return scrollToTop(p); } };
    }
    if (window.__SM_TAP_TO_TOP_ACTIVE__) return;
    window.__SM_TAP_TO_TOP_ACTIVE__ = true;

    function findHeader(target, clientY) {
      var node = target && (target.nodeType === 1 ? target : target.parentElement);
      var maxBottom = Math.max(150, window.innerHeight * 0.28);
      while (node && node !== document.body && node !== document.documentElement) {
        var attr = node.getAttribute && node.getAttribute('data-tap-to-top');
        if (attr === 'false') return null;
        if (attr !== null) return node;
        var r = node.getBoundingClientRect();
        var topZone = r.top <= 24 && r.height >= 26 && r.height <= 128 && r.bottom <= maxBottom;
        if (topZone && (node.tagName === 'HEADER' || node.getAttribute('role') === 'banner' ||
            (node.classList && (node.classList.contains('top-dock') || node.classList.contains('top-header') || node.classList.contains('topbar'))) ||
            (node.tagName === 'NAV' && r.top <= 20))) {
          return node;
        }
        if (topZone && r.width >= window.innerWidth * 0.5) {
          var pos = window.getComputedStyle(node).position;
          if (pos === 'fixed' || pos === 'sticky') return node;
        }
        node = node.parentElement;
      }
      return clientY >= 0 && clientY <= 24 ? document.body : null;
    }

    var dx = 0, dy = 0, moved = false;
    document.addEventListener('pointerdown', function (e) { dx = e.clientX; dy = e.clientY; moved = false; }, { passive: true, capture: true });
    document.addEventListener('pointermove', function (e) { if (!moved && (Math.abs(e.clientX - dx) > 10 || Math.abs(e.clientY - dy) > 10)) moved = true; }, { passive: true, capture: true });
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || moved || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var sel = window.getSelection && window.getSelection().toString();
      if (sel && sel.trim().length > 0) return;
      var header = findHeader(e.target, e.clientY);
      if (!header || isInteractive(e.target, header)) return;
      if (scrollToTop(null, header)) e.stopPropagation();
    }, false);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    scheduleMount();
  } else {
    document.addEventListener('DOMContentLoaded', scheduleMount, { once: true });
  }
})();
