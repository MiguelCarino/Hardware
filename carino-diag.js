/* ============================================================
   carino-diag.js — opt-in "Sys. Status" panel for the shared navbar.
   ------------------------------------------------------------
   Drop this file into any NETWORK-oriented Carino project and add
   it AFTER carino-navbar.js:

     <script src="carino-navbar.js" data-app="AppName" defer></script>
     <script src="carino-diag.js" defer></script>

   It adds a "Sys. Status" button to the navbar's right cluster and
   a dropdown reporting the visitor's public IPv4/IPv6, ISP,
   connection type and round-trip time. This is the in-navbar
   replacement for the retired standalone IP-lookup site, so any
   network tool can carry it without its own subdomain.

   Two deliberate differences from the hub's dropdown:
     * Network only — no hardware/GPU/battery probing. Those belong
       to hardware.carino.systems, not to a network tool.
     * Lazy — nothing is requested until the panel is first opened,
       so simply loading the page contacts no third party.

   On an intranet, point it at an address service of your own and no
   third party is contacted even then:

     <script src="carino-diag.js" data-whoami="/whoami" defer></script>

   Anything answering with a bare IP address in the body will do.
   Caddy needs one line — see carino-offline.caddyfile.example in
   MiguelCarino/Custom-Images. It is tried before every public
   provider, and if it 404s or is not configured the chain simply
   carries on, so a page can ship the attribute before the box that
   answers it exists.

   Self-contained: styles are inlined and scoped under #cnDiagBox /
   #cnDiagBtn with hard-coded colours (no CSS variables), so it is
   safe on light-themed or Tailwind pages and needs no CDN.

   Language: its labels and status words come from a small dictionary
   here (es, pt-BR, ja, ru), picked by CarinoLang.current or <html lang>,
   with a site's window.t winning when it has the string. IPv4, IPv6,
   ISP and RTT are names and stay as they are.
   ============================================================ */
(function () {
  'use strict';

  var A = '#eab308', BG = '#0f0f0f', BORDER = '#262626', MUTED = '#8a8a8a', TEXT = '#fff';
  var MONO = '"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace';

  var CSS = ''
    + '#cnDiagBtn{display:flex;align-items:center;gap:8px;background:transparent;border:1px solid ' + BORDER + ';'
    + 'color:' + MUTED + ';font-family:' + MONO + ';font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;'
    + 'padding:0 14px;height:32px;border-radius:4px;cursor:pointer;transition:.2s;white-space:nowrap;}'
    + '#cnDiagBtn:hover{border-color:' + A + ';color:' + A + ';background:rgba(234,179,8,.08);}'
    + '#cnDiagBtn .cn-pulse{width:6px;height:6px;border-radius:50%;background:' + A + ';box-shadow:0 0 8px ' + A + ';'
    + 'animation:cnPulseGlow 2s ease-in-out infinite;flex-shrink:0;}'
    + '@keyframes cnPulseGlow{0%,100%{opacity:1;}50%{opacity:.4;}}'
    + '@keyframes cnScan{0%,100%{opacity:1;}50%{opacity:.25;}}'

    + '#cnDiagBox{position:fixed;top:70px;right:20px;width:360px;max-width:calc(100vw - 40px);'
    + 'background:' + BG + ';border:1px solid rgba(234,179,8,.45);padding:18px;border-radius:6px;'
    + 'box-shadow:0 10px 40px rgba(0,0,0,.8);opacity:0;pointer-events:none;transform:translateY(-10px);'
    + 'transition:all .3s cubic-bezier(.2,.8,.2,1);z-index:2147483001;font-family:' + MONO + ';'
    + 'text-align:left;color:' + TEXT + ';}'
    + '#cnDiagBox.open{opacity:1;pointer-events:auto;transform:translateY(0);}'
    + '#cnDiagBox *{box-sizing:border-box;}'
    + '#cnDiagBox .d-row{display:flex;justify-content:space-between;align-items:center;gap:12px;'
    + 'margin-bottom:8px;font-size:.75rem;line-height:1.4;}'
    + '#cnDiagBox .d-lbl{color:' + MUTED + ';text-transform:uppercase;letter-spacing:.05em;flex-shrink:0;}'
    + '#cnDiagBox .d-val{color:' + TEXT + ';text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '#cnDiagBox .d-grp{display:flex;align-items:center;gap:6px;min-width:0;justify-content:flex-end;}'
    + '#cnDiagBox .d-sec{color:' + MUTED + ';font-size:.62rem;text-transform:uppercase;letter-spacing:.1em;'
    + 'margin:0 0 8px;opacity:.45;border-bottom:1px solid ' + BORDER + ';padding-bottom:3px;}'
    + '#cnDiagBox .d-head{border-bottom:1px solid ' + BORDER + ';padding-bottom:8px;margin-bottom:14px;}'
    + '#cnDiagBox .dot{width:5px;height:5px;border-radius:50%;display:inline-block;flex-shrink:0;background:#525252;}'
    + '#cnDiagBox .dot.ok{background:' + A + ';box-shadow:0 0 4px ' + A + ';}'
    + '#cnDiagBox .dot.bad{background:#dc2626;box-shadow:0 0 4px #dc2626;}'
    + '#cnDiagBox .dot.scan{background:#d4d4d4;animation:cnScan 1s infinite;}'
    + '#cnDiagBox .d-btn{display:flex;align-items:center;justify-content:center;gap:5px;width:100%;'
    + 'margin-top:14px;background:transparent;border:1px solid ' + BORDER + ';color:' + MUTED + ';'
    + 'font-family:' + MONO + ';font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;'
    + 'padding:7px;border-radius:4px;cursor:pointer;transition:.2s;}'
    + '#cnDiagBox .d-btn:hover{border-color:' + A + ';color:' + A + ';}'
    + '#cnDiagBox .d-btn svg{width:12px;height:12px;}'
    + '@media(max-width:520px){#cnDiagBtn span.lbl{display:none;}#cnDiagBtn{padding:0 10px;}}';

  var L10N = {
    es: {
      'Sys. Status': 'Estado sist.', 'Public IP and connection status': 'IP pública y estado de la conexión',
      'Last Check': 'Última comprobación', 'Network': 'Red', 'Conn': 'Conexión', 'Refresh': 'Actualizar',
      'Blocked by browser': 'Bloqueado por el navegador', 'Unavailable': 'No disponible', 'Not detected': 'No detectada',
      'N/A': 'N/D', 'Unknown': 'Desconocido', 'Timeout': 'Tiempo agotado',
    },
    'pt-BR': {
      'Sys. Status': 'Status do sist.', 'Public IP and connection status': 'IP público e status da conexão',
      'Last Check': 'Última verificação', 'Network': 'Rede', 'Conn': 'Conexão', 'Refresh': 'Atualizar',
      'Blocked by browser': 'Bloqueado pelo navegador', 'Unavailable': 'Indisponível', 'Not detected': 'Não detectado',
      'N/A': 'N/D', 'Unknown': 'Desconhecido', 'Timeout': 'Tempo esgotado',
    },
    ja: {
      'Sys. Status': 'システム状態', 'Public IP and connection status': 'グローバル IP と接続状態',
      'Last Check': '最終チェック', 'Network': 'ネットワーク', 'Conn': '接続', 'Refresh': '更新',
      'Blocked by browser': 'ブラウザーがブロック', 'Unavailable': '取得できません', 'Not detected': '検出されません',
      'N/A': '該当なし', 'Unknown': '不明', 'Timeout': 'タイムアウト',
    },
    ru: {
      'Sys. Status': 'Статус сист.', 'Public IP and connection status': 'Публичный IP и состояние подключения',
      'Last Check': 'Последняя проверка', 'Network': 'Сеть', 'Conn': 'Связь', 'Refresh': 'Обновить',
      'Blocked by browser': 'Заблокировано браузером', 'Unavailable': 'Недоступно', 'Not detected': 'Не обнаружен',
      'N/A': 'Н/Д', 'Unknown': 'Неизвестно', 'Timeout': 'Таймаут',
    },
  };
  function langNow() {
    var l = String((window.CarinoLang && window.CarinoLang.current) || document.documentElement.lang || 'en');
    return /^pt/i.test(l) ? 'pt-BR' : l.slice(0, 2).toLowerCase();
  }
  function tr(s) {
    if (typeof window.t === 'function') {
      try { var v = window.t(s); if (typeof v === 'string' && v && v !== s) return v; } catch (e) { /* not i18n */ }
    }
    var d = L10N[langNow()];
    return (d && d[s]) || s;
  }

  var RETRY_PATH = '<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>'
    + '<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>';

  var BOX = ''
    + '<div class="d-row d-head"><span class="d-lbl" data-cn-key="Last Check"></span>'
    + '<span class="d-val" id="cnDiagLast" style="color:' + A + '">--:--</span></div>'
    + '<div class="d-sec" data-cn-key="Network"></div>'
    + '<div class="d-row"><span class="d-lbl">IPv4</span><div class="d-grp">'
    + '<span class="d-val" id="cnDiagV4">--</span><span class="dot" id="cnDiagDot4"></span></div></div>'
    + '<div class="d-row"><span class="d-lbl">IPv6</span><div class="d-grp">'
    + '<span class="d-val" id="cnDiagV6">--</span><span class="dot" id="cnDiagDot6"></span></div></div>'
    + '<div class="d-row"><span class="d-lbl">ISP</span><span class="d-val" id="cnDiagISP">--</span></div>'
    + '<div class="d-row"><span class="d-lbl" data-cn-key="Conn"></span><span class="d-val" id="cnDiagConn">--</span></div>'
    + '<div class="d-row"><span class="d-lbl">RTT</span><span class="d-val" id="cnDiagPing">--</span></div>'
    + '<button class="d-btn" id="cnDiagRetry">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + RETRY_PATH + '</svg>'
    + '<span data-cn-key="Refresh"></span></button>';

  function $(id) { return document.getElementById(id); }
  function set(id, v) { var el = $(id); if (el) { el.textContent = v; el.removeAttribute('data-cn-key'); } }
  // A status word rather than a value: kept as its English key so a
  // language switch can translate it again.
  function say(id, key) { var el = $(id); if (el) { el.textContent = tr(key); el.setAttribute('data-cn-key', key); } }

  function relabel() {
    var btn = $('cnDiagBtn');
    if (btn) {
      btn.title = tr('Public IP and connection status');
      var l = btn.querySelector('.lbl');
      if (l) l.textContent = tr('Sys. Status');
    }
    var nodes = document.querySelectorAll('#cnDiagBox [data-cn-key]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = tr(nodes[i].getAttribute('data-cn-key'));
  }
  function dot(id, cls) { var el = $(id); if (el) el.className = 'dot' + (cls ? ' ' + cls : ''); }

  /* ---- probes (same providers and fallback order as the hub) ---- */

  function fetchWith(url, timeoutMs, read) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, timeoutMs || 4000);
    return fetch(url, { mode: 'cors', signal: ctrl.signal, cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return read(res);
      })
      .finally(function () { clearTimeout(t); });
  }
  function fetchJSON(url, timeoutMs) {
    return fetchWith(url, timeoutMs, function (r) { return r.json(); });
  }
  // Half the providers below answer in plain text rather than JSON — that is
  // the point of them: an address is a string, and a service that hands it over
  // without a JSON envelope has nothing to rate-limit and nothing to parse
  // wrong. Trimmed because a trailing newline is normal for these.
  function fetchText(url, timeoutMs) {
    return fetchWith(url, timeoutMs, function (r) { return r.text(); })
      .then(function (s) {
        var v = String(s).trim();
        if (!v) throw new Error('empty body');
        return v;
      });
  }
  // Cloudflare's trace endpoint: `key=value` lines, one per line.
  function fetchTrace(url, key, timeoutMs) {
    return fetchText(url, timeoutMs).then(function (body) {
      var lines = body.split('\n');
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf(key + '=') === 0) return lines[i].slice(key.length + 1).trim();
      }
      throw new Error('no ' + key + ' in trace');
    });
  }

  // An address service on the network the visitor is actually on. Off unless a
  // page asks for it — <script src="carino-diag.js" data-whoami="/whoami">, or
  // an absolute URL to the LAN box that answers. On an intranet this is the
  // only provider that can work at all, and where it is configured it runs
  // first so no third party is contacted for something the LAN already knows.
  // Caddy answers it in one line; see carino-offline.caddyfile.example in
  // MiguelCarino/Custom-Images.
  var WHOAMI = (function () {
    var s = document.currentScript ||
            document.querySelector('script[src*="carino-diag.js"]');
    return (s && s.getAttribute('data-whoami')) || null;
  })();

  // Walk the provider list in order, resolving on the first that answers.
  function tryProviders(list) {
    return list.reduce(function (chain, next) {
      return chain.catch(next);
    }, Promise.reject());
  }

  // Firefox's tracking protection blocks these endpoints outright, so a failure
  // there means "blocked", not "you have no address" — say so rather than
  // reporting a red failure the visitor cannot act on.
  var isFirefox = /Firefox\//.test(navigator.userAgent);

  function detectIPs() {
    set('cnDiagV4', '...'); set('cnDiagV6', '...');
    dot('cnDiagDot4', 'scan'); dot('cnDiagDot6', 'scan');

    // Every provider is wrapped in the family it is being asked for, and that
    // is a fix rather than a tidy-up. A provider can answer with whichever
    // family the browser happened to reach it over — `api64.ipify.org` says so
    // in its name, and a LAN endpoint has no say in it at all. A chain resolves
    // on its FIRST success, so a wrong-family answer used to end the chain and
    // then fail the dot/colon test below, reporting "Unavailable" without ever
    // trying the provider that would have answered correctly. Rejecting here
    // instead lets the chain carry on to the next one.
    //
    // The last entry in each chain is Cloudflare's trace over an IP LITERAL, so
    // it needs no DNS lookup to answer at all. On a site about what happens
    // when DNS is taken away, that is the one provider that still means
    // something.
    var only = function (want, get) {
      return function () {
        return get().then(function (ip) {
          var v = String(ip);
          var is6 = v.indexOf(':') > -1;
          if ((want === 6) !== is6) throw new Error('wrong family: ' + v);
          return v;
        });
      };
    };
    var whoami = function (want) {
      return WHOAMI ? [only(want, function () { return fetchText(WHOAMI); })] : [];
    };

    var v4 = tryProviders(whoami(4).concat([
      only(4, function () { return fetchJSON('https://api4.ipify.org?format=json').then(function (d) { return d.ip; }); }),
      only(4, function () { return fetchText('https://ipv4.icanhazip.com'); }),
      only(4, function () { return fetchText('https://4.ident.me'); }),
      only(4, function () { return fetchTrace('https://1.1.1.1/cdn-cgi/trace', 'ip'); })
    ]));
    var v6 = tryProviders(whoami(6).concat([
      only(6, function () { return fetchJSON('https://api6.ipify.org?format=json').then(function (d) { return d.ip; }); }),
      only(6, function () { return fetchText('https://ipv6.icanhazip.com'); }),
      only(6, function () { return fetchText('https://6.ident.me'); }),
      only(6, function () { return fetchTrace('https://[2606:4700:4700::1111]/cdn-cgi/trace', 'ip'); })
    ]));

    return Promise.allSettled([v4, v6]).then(function (r) {
      var a = r[0], b = r[1];
      if (a.status === 'fulfilled' && String(a.value).indexOf('.') > -1) {
        set('cnDiagV4', a.value); dot('cnDiagDot4', 'ok');
      } else {
        say('cnDiagV4', isFirefox ? 'Blocked by browser' : 'Unavailable');
        dot('cnDiagDot4', isFirefox ? '' : 'bad');
      }
      if (b.status === 'fulfilled' && String(b.value).indexOf(':') > -1) {
        set('cnDiagV6', b.value); dot('cnDiagDot6', 'ok');
      } else {
        say('cnDiagV6', isFirefox ? 'Blocked by browser' : 'Not detected');
        dot('cnDiagDot6', '');
      }
    });
  }

  // ipapi.co is no longer first. It is the only row that ever had a single
  // provider, its free tier is the tightest of the three, and it answers 429
  // often enough that the ISP line was the one that went "Unavailable" while
  // everything above it worked. ipwho.is needs no key and, asked for just the
  // two fields, returns the operator name and the ASN directly; ipinfo.io
  // prefixes the same name with the AS number, which is what the strip is for.
  function detectISP() {
    set('cnDiagISP', '...');
    return tryProviders([
      function () {
        return fetchJSON('https://ipwho.is/?fields=ip,connection', 5000).then(function (d) {
          var c = d && d.connection;
          return (c && (c.isp || c.org)) || '';
        });
      },
      function () {
        return fetchJSON('https://ipinfo.io/json', 5000).then(function (d) { return d.org || ''; });
      },
      function () {
        return fetchJSON('https://ipapi.co/json/', 5000).then(function (d) { return d.org || ''; });
      }
    ].map(function (get) {
      // An empty name is a failed lookup, not an ISP called nothing: throw so
      // the chain moves on rather than printing a blank line as a result.
      return function () {
        return get().then(function (org) {
          var name = String(org).replace(/^AS\d+\s+/i, '').trim();
          if (!name) throw new Error('no org');
          return name;
        });
      };
    })).then(function (name) {
      set('cnDiagISP', name);
    }).catch(function () {
      say('cnDiagISP', isFirefox ? 'Blocked by browser' : 'Unavailable');
    });
  }

  function detectConn() {
    var c = navigator.connection;
    if (!c) { say('cnDiagConn', 'N/A'); return; }
    var type = (c.type && c.type !== 'unknown') ? c.type : (c.effectiveType || null);
    if (type) set('cnDiagConn', String(type).toUpperCase()); else say('cnDiagConn', 'Unknown');
  }

  // Round-trip to this same page: no third party, and it measures the path the
  // visitor actually cares about.
  function checkPing() {
    var start = performance.now();
    return fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
      .then(function () { set('cnDiagPing', Math.round(performance.now() - start) + ' ms'); })
      .catch(function () { say('cnDiagPing', 'Timeout'); });
  }

  var running = false;
  function refresh() {
    if (running) return;
    running = true;
    detectConn();
    Promise.allSettled([detectIPs(), detectISP(), checkPing()]).then(function () {
      var d = new Date();
      set('cnDiagLast', String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
      running = false;
    });
  }

  /* ---- wiring ---- */

  function build(nav) {
    if ($('cnDiagBtn')) return;

    var style = document.createElement('style');
    style.id = 'carino-diag-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.id = 'cnDiagBtn';
    btn.type = 'button';
    btn.innerHTML = '<span class="lbl"></span><span class="cn-pulse"></span>';

    // Sit to the LEFT of the social icons, matching the hub's ordering.
    var right = nav.querySelector('.cn-right');
    if (!right) return;
    var social = right.querySelector('.social-row');
    if (social) right.insertBefore(btn, social); else right.appendChild(btn);

    var box = document.createElement('div');
    box.id = 'cnDiagBox';
    box.innerHTML = BOX;
    document.body.appendChild(box);
    relabel();
    // A tick late, once the site's own handler has switched window.t; and
    // once on DOMContentLoaded, by when the site's i18n.js has loaded.
    var later = function () { setTimeout(relabel, 0); };
    window.addEventListener('carino:langchange', later);
    document.addEventListener('DOMContentLoaded', later);

    var loaded = false;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = box.classList.toggle('open');
      // Lazy: the first open is what triggers any outbound request.
      if (open && !loaded) { loaded = true; refresh(); }
    });

    $('cnDiagRetry').addEventListener('click', function (e) { e.stopPropagation(); refresh(); });
    box.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { box.classList.remove('open'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') box.classList.remove('open');
    });
  }

  // carino-navbar.js injects #carinoNav on DOMContentLoaded; both scripts are
  // deferred so order is not guaranteed. Watch for the navbar instead of
  // assuming it is already there.
  function start() {
    var nav = document.getElementById('carinoNav');
    if (nav) { build(nav); return; }
    var obs = new MutationObserver(function () {
      var n = document.getElementById('carinoNav');
      if (n) { obs.disconnect(); build(n); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 10000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
