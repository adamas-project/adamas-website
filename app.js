// ---------- intro: initiation (matrix network -> paradise bloom) ----------
(function () {
  try {
    var intro = document.getElementById('intro');
    if (!intro) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.add('intro-on');
    document.body.classList.add('intro-on');
    var cv = document.getElementById('introNet'), ctx = cv ? cv.getContext('2d') : null;
    // colour the intro rain from the active theme (gold in dark, green in matrix)
    var ics = getComputedStyle(document.documentElement);
    var introAcc = (ics.getPropertyValue('--accent').trim() || '#c9a84c');
    var introBri = (ics.getPropertyValue('--accent-lt').trim() || '#efe1ad');
    var introTrail = document.documentElement.getAttribute('data-theme') === 'matrix' ? 'rgba(0,8,2,0.12)' : 'rgba(6,6,5,0.12)';
    var W, H, cols = [], fontSize = 16, raf, done = false, introLast = 0;
    var glyphs = 'アカサタナハマヤラワABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&'.split('');
    function size(){ W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    function init(){ size(); cols = new Array(Math.floor(W / fontSize)).fill(0).map(function(){ return Math.random() * H / fontSize; }); }
    function draw(ts){
      raf = requestAnimationFrame(draw);
      if (ts - introLast < 42) return;                   // cap to ~24fps
      introLast = ts;
      ctx.fillStyle = introTrail; ctx.fillRect(0, 0, W, H);
      ctx.font = fontSize + "px 'JetBrains Mono', monospace";
      for (var i = 0; i < cols.length; i++) {
        var ch = glyphs[Math.floor(Math.random() * glyphs.length)], x = i * fontSize, y = cols[i] * fontSize;
        ctx.fillStyle = Math.random() > 0.97 ? introBri : introAcc;
        ctx.fillText(ch, x, y);
        if (y > H && Math.random() > 0.975) cols[i] = 0;
        cols[i] += 0.5;
      }
    }
    if (ctx && !reduce){ init(); draw(); window.addEventListener('resize', init); }
    function enter(){
      if (done) return; done = true;
      intro.classList.add('intro-exit');
      document.documentElement.classList.remove('intro-on');
      document.body.classList.remove('intro-on');
      document.body.classList.add('site-in');
      setTimeout(function(){ if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', init); if (intro.parentNode) intro.remove(); document.body.classList.remove('site-in'); }, 1500);
    }
    window.addEventListener('wheel', enter, { passive: true });
    window.addEventListener('touchmove', enter, { passive: true });
    window.addEventListener('keydown', function (e) { if (['ArrowDown','PageDown',' ','Spacebar','Enter'].indexOf(e.key) > -1) enter(); });
    var b = document.getElementById('introEnter'); if (b) b.addEventListener('click', enter);
  } catch (e) {
    var el = document.getElementById('intro'); if (el && el.parentNode) el.remove();
    document.documentElement.classList.remove('intro-on'); document.body.classList.remove('intro-on');
  }
})();

(function () {
      var lf = document.getElementById('leadForm');
      if (!lf) return;
      lf.addEventListener('submit', function (e) {
        e.preventDefault();
        var body = new URLSearchParams(new FormData(lf)).toString();
        function done() {
          lf.style.display = 'none';
          var ok = document.getElementById('leadOk');
          ok.style.display = 'block';
          ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
          .then(done).catch(done);
      });
    })();

const root = document.documentElement;

    // ---------- scroll reveal (set up first & independently so nothing can block it) ----------
    (function () {
      try {
        var fades = document.querySelectorAll('.fade');
        if ('IntersectionObserver' in window) {
          var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e, i) {
              if (e.isIntersecting) {
                setTimeout(function () { e.target.classList.add('vis'); }, (i % 6) * 60);
                obs.unobserve(e.target);
              }
            });
          }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
          fades.forEach(function (el) { if (!el.classList.contains('vis')) obs.observe(el); });
        } else {
          fades.forEach(function (el) { el.classList.add('vis'); });
        }
      } catch (err) {
        // never leave content hidden if the observer fails
        document.querySelectorAll('.fade').forEach(function (el) { el.classList.add('vis'); });
      }
    })();

    // ---------- mobile menu ----------
    try {
      document.querySelectorAll('#navlinks a').forEach(function (a) {
        a.addEventListener('click', function () { document.getElementById('navlinks').classList.remove('open'); });
      });
    } catch (e) {}

    // ---------- nav dropdown aria-expanded ----------
    try {
      document.querySelectorAll('.nav-dd').forEach(function (dd) {
        var trigger = dd.querySelector('.nav-dd-trigger');
        if (!trigger) return;
        function open()  { trigger.setAttribute('aria-expanded', 'true');  }
        function close() { trigger.setAttribute('aria-expanded', 'false'); }
        dd.addEventListener('mouseenter', open);
        dd.addEventListener('mouseleave', close);
        dd.addEventListener('focusin',    open);
        dd.addEventListener('focusout',   function (e) { if (!dd.contains(e.relatedTarget)) close(); });
      });
    } catch (e) {}

    // ---------- falling-code rain (runs in every theme, colored from the active palette) ----------
    var cv = document.getElementById('rain');
    var ctx = cv ? cv.getContext('2d') : null;
    var rainId = null, rainLastFrame = 0, cols = [], fontSize = 16;
    var glyphs = 'アカサタナハマヤラワABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&'.split('');
    var rainAccent = '#00ff41', rainBright = '#c6ffce', rainTrail = '0,6,0';
    function hexToRgb(hex) {
      hex = (hex || '').trim().replace('#', '');
      if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
      var n = parseInt(hex, 16);
      return isNaN(n) ? '0,0,0' : (((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255));
    }
    function refreshRainColors() {
      var cs = getComputedStyle(root);
      rainAccent = cs.getPropertyValue('--accent').trim() || rainAccent;   // gold / green per theme
      rainBright = cs.getPropertyValue('--accent-lt').trim() || rainBright; // lead-glyph highlight
      rainTrail = hexToRgb(cs.getPropertyValue('--bg'));                    // trail fades into the bg
    }
    function sizeRain() {
      cv.width = window.innerWidth; cv.height = window.innerHeight;
      var n = Math.floor(cv.width / fontSize);
      cols = new Array(n).fill(0).map(function () { return Math.random() * cv.height / fontSize; });
    }
    function drawRain(ts) {
      rainId = requestAnimationFrame(drawRain);
      if (ts - rainLastFrame < 42) return;               // cap to ~24fps
      rainLastFrame = ts;
      ctx.fillStyle = 'rgba(' + rainTrail + ', 0.09)';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.font = fontSize + "px 'JetBrains Mono', monospace";
      for (var i = 0; i < cols.length; i++) {
        var ch = glyphs[Math.floor(Math.random() * glyphs.length)];
        var x = i * fontSize, y = cols[i] * fontSize;
        ctx.fillStyle = Math.random() > 0.975 ? rainBright : rainAccent;
        ctx.fillText(ch, x, y);
        if (y > cv.height && Math.random() > 0.975) cols[i] = 0;
        cols[i] += 0.5;
      }
    }
    function startRain() {
      // Skip 2D rain when the 3D WebGL background has initialised and owns the backdrop.
      if (document.getElementById('bg3d')?.dataset.active) return;
      if (!ctx || rainId || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      sizeRain(); rainId = requestAnimationFrame(drawRain);
      window.addEventListener('resize', sizeRain);
    }
    function stopRain() {
      if (rainId) { cancelAnimationFrame(rainId); rainId = null; }
      window.removeEventListener('resize', sizeRain);
      if (ctx) ctx.clearRect(0, 0, cv.width, cv.height);
    }
    // When the 3D bg activates (desktop lazy-load), hand off cleanly
    document.addEventListener('bg3d:active', stopRain);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stopRain(); }
      else { refreshRainColors(); startRain(); }
    });

    // ---------- theme switching (last; rain helpers now exist) ----------
    try {
      var btns = document.querySelectorAll('.theme-btn');
      var applyTheme = function (t) {
        root.setAttribute('data-theme', t);
        try { localStorage.setItem('adamas-theme', t); } catch (e) {}
        btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setTheme === t)); });
        refreshRainColors();
        if (ctx) ctx.clearRect(0, 0, cv.width, cv.height); // wipe old-palette residue on switch
        startRain(); // rain now runs in dark, light, and matrix
      };
      btns.forEach(function (b) { b.addEventListener('click', function () { applyTheme(b.dataset.setTheme); }); });
      applyTheme(root.getAttribute('data-theme') || 'dark');
    } catch (e) {}

/* ---------- email gate for eBook / guide downloads ---------- */
(function () {
  try {
    var gate = document.getElementById('guideGate');
    if (!gate) return;
    var form = document.getElementById('gateForm');
    var emailEl = document.getElementById('gateEmail');
    var guideEl = document.getElementById('gateGuide');
    var nameEl = document.getElementById('gateName');
    var okEl = document.getElementById('gateOk');
    var dlEl = document.getElementById('gateDl');
    var pendingUrl = null;

    function isGuide(a) {
      // never re-intercept the gate's own links (the unlocked download + fallback link)
      if (a.hasAttribute('data-gate-dl') || (a.closest && a.closest('#guideGate'))) return false;
      var h = a && a.getAttribute && a.getAttribute('href');
      return h && /downloads\/ADAMAS-Guide-[^"']*\.pdf$/i.test(h);
    }
    function openGate(url, name) {
      pendingUrl = url;
      if (guideEl) guideEl.value = name;
      if (nameEl) nameEl.textContent = '“' + name + '”';
      okEl.hidden = true; form.hidden = false; form.reset();
      gate.hidden = false; document.body.style.overflow = 'hidden';
      setTimeout(function () { try { emailEl.focus(); } catch (e) {} }, 60);
    }
    function closeGate() { gate.hidden = true; document.body.style.overflow = ''; }
    function startDownload() {
      if (!pendingUrl) return;
      var a = document.createElement('a');
      a.href = pendingUrl; a.setAttribute('download', ''); a.rel = 'noopener';
      a.setAttribute('data-gate-dl', '1');
      document.body.appendChild(a); a.click(); a.remove();
    }

    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a || !isGuide(a)) return;
      e.preventDefault();
      var name = (a.textContent || '').trim() || a.getAttribute('href').split('/').pop();
      openGate(a.getAttribute('href'), name);
    });
    gate.querySelectorAll('[data-gate-close]').forEach(function (el) { el.addEventListener('click', closeGate); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !gate.hidden) closeGate(); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var body = new URLSearchParams(new FormData(form)).toString();
      function done() {
        form.hidden = true; okEl.hidden = false;
        if (dlEl && pendingUrl) dlEl.href = pendingUrl;
        startDownload();
      }
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(done).catch(done);
    });
  } catch (e) {}
})();

/* ---------- Plausible conversion events ---------- */
(function () {
  function fire(name, props) {
    try { window.plausible && window.plausible(name, props ? { props: props } : undefined); } catch (e) {}
  }

  // Clarity Audit form submit
  var lf = document.getElementById('leadForm');
  if (lf) lf.addEventListener('submit', function () { fire('Clarity Audit Submit'); });

  // Guide email-gate unlock — capture guide name at submit time
  var gf = document.getElementById('gateForm');
  if (gf) gf.addEventListener('submit', function () {
    var g = document.getElementById('gateGuide');
    fire('Guide Download', { guide: g ? g.value : 'unknown' });
  });

  // Book 30-min call + X profile clicks via event delegation
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('calendar.app.google') > -1) fire('Book 30-min Call');
    if (h.indexOf('x.com/THEGRANDFALCON') > -1) fire('X Profile Click');
  });
})();

/* Self-Serve waitlist mini-form: ajax submit + inline confirmation */
(function () {
  document.querySelectorAll('form.pc-wait').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var body = new URLSearchParams(new FormData(f)).toString();
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .finally(function () {
          var ok = document.createElement('p');
          ok.className = 'pc-wait-ok';
          ok.textContent = (document.documentElement.lang === 'de')
            ? 'Danke — Sie stehen auf der Warteliste.'
            : "Thanks — you're on the waitlist.";
          f.replaceWith(ok);
        });
    });
  });
})();
