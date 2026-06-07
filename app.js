// ---------- intro: initiation (matrix network -> paradise bloom) ----------
(function () {
  try {
    var intro = document.getElementById('intro');
    if (!intro) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.add('intro-on');
    document.body.classList.add('intro-on');
    var cv = document.getElementById('introNet'), ctx = cv ? cv.getContext('2d') : null;
    var W, H, nodes = [], parts = [], raf, done = false;
    function size(){ W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    function init(){
      size();
      var n = Math.max(40, Math.min(120, Math.floor(W * H / 14000)));
      nodes = []; for (var i=0;i<n;i++) nodes.push({ x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-0.5)*0.5, vy:(Math.random()-0.5)*0.5 });
      var pn = Math.max(24, Math.min(70, Math.floor(W / 26)));
      parts = []; for (var k=0;k<pn;k++) parts.push({ x:Math.random()*W, y:Math.random()*H, r:Math.random()*2+0.8, v:Math.random()*0.5+0.22, a:Math.random()*0.5+0.3, ph:Math.random()*6.28 });
    }
    function draw(){
      ctx.clearRect(0,0,W,H);
      var i, j;
      for (i=0;i<nodes.length;i++){ var a=nodes[i]; a.x+=a.vx; a.y+=a.vy; if(a.x<0||a.x>W)a.vx*=-1; if(a.y<0||a.y>H)a.vy*=-1; }
      ctx.lineWidth = 1;
      for (i=0;i<nodes.length;i++) for (j=i+1;j<nodes.length;j++){
        var dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y, d=Math.sqrt(dx*dx+dy*dy);
        if (d<150){ var al=(1-d/150)*0.4; ctx.strokeStyle='rgba(150,120,235,'+al+')'; ctx.beginPath(); ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(nodes[j].x,nodes[j].y); ctx.stroke(); }
      }
      ctx.fillStyle='rgba(227,201,119,0.9)';
      for (i=0;i<nodes.length;i++){ ctx.beginPath(); ctx.arc(nodes[i].x,nodes[i].y,1.6,0,6.3); ctx.fill(); }
      ctx.shadowColor='rgba(130,205,255,0.9)'; ctx.shadowBlur=12;
      for (i=0;i<parts.length;i++){ var p=parts[i]; p.y-=p.v; p.x+=Math.sin((p.y*0.012)+p.ph)*0.35; if(p.y<-12){ p.y=H+12; p.x=Math.random()*W; }
        ctx.globalAlpha = p.a*(0.55+0.45*Math.sin(Date.now()*0.002+p.ph)); ctx.fillStyle='rgba(140,210,255,0.95)';
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.3); ctx.fill(); }
      ctx.globalAlpha=1; ctx.shadowBlur=0;
      raf = requestAnimationFrame(draw);
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
