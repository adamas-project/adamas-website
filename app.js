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

    // ---------- falling-code rain (runs in every theme, colored from the active palette) ----------
    var cv = document.getElementById('rain');
    var ctx = cv ? cv.getContext('2d') : null;
    var rainId = null, cols = [], fontSize = 16;
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
    function drawRain() {
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
      rainId = requestAnimationFrame(drawRain);
    }
    function startRain() {
      if (!ctx || rainId || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      sizeRain(); rainId = requestAnimationFrame(drawRain);
      window.addEventListener('resize', sizeRain);
    }
    function stopRain() {
      if (rainId) { cancelAnimationFrame(rainId); rainId = null; }
      window.removeEventListener('resize', sizeRain);
      if (ctx) ctx.clearRect(0, 0, cv.width, cv.height);
    }
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
