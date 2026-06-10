// ADAMAS — immersive 3D matrix background (shared by index.html + de.html)
// Fixed Three.js code-rain behind the site; camera flies deeper as you scroll.
// Theme-aware (gold dark / green matrix); hidden in light theme. 2D #rain is the fallback.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

(function () {
  const canvas = document.getElementById('bg3d');
  if (!canvas) return;
  let renderer, scene, camera, composer, rain, W, H, DPR, ok = false;
  let scrollT = 0, targetT = 0, mouseX = 0, mouseY = 0, t0 = performance.now();
  let lastFrame = 0;  // must be initialized before init() calls loop() below
  const uColor = { value: new THREE.Color(0xc9a84c) };

  function accent() {
    const c = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#c9a84c').trim();
    try { return new THREE.Color(c); } catch (e) { return new THREE.Color(0xc9a84c); }
  }
  function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }

  function glyphAtlas() {
    const grid = 8, cell = 64, size = grid * cell;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d');
    x.clearRect(0, 0, size, size);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 46px ui-monospace, "SF Mono", monospace';
    const glyphs = 'アカサタナハマヤラワABCDEFGHJKLMNPQRSTUVWXYZ0123456789@#$%&*+'.split('');
    for (let i = 0; i < grid * grid; i++) {
      const g = glyphs[i % glyphs.length], col = i % grid, row = (i / grid) | 0;
      x.fillText(g, col * cell + cell / 2, row * cell + cell / 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  try { init(); ok = true; canvas.dataset.active = '1'; document.dispatchEvent(new CustomEvent('bg3d:active')); } catch (e) { console.warn('WebGL bg unavailable', e); canvas.style.display = 'none'; }

  function init() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'default' });
    renderer.setPixelRatio(DPR);
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0072);

    camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1600);
    camera.position.set(0, 4, 130);

    const small = window.innerWidth < 760;
    const NC = small ? 90 : 150;     // columns
    const S = 16;                    // glyphs per column
    const N = NC * S, RANGE = 380, GAP = 8.0;
    const aX = new Float32Array(N), aZ = new Float32Array(N), aSlot = new Float32Array(N);
    const aSpeed = new Float32Array(N), aPhase = new Float32Array(N), aSize = new Float32Array(N);
    const aCell = new Float32Array(N), aBright = new Float32Array(N), aHead = new Float32Array(N);
    let k = 0;
    for (let c = 0; c < NC; c++) {
      const cx = (Math.random() - 0.5) * 440;
      const cz = -Math.random() * 620 - 20;
      const sp = 26 + Math.random() * 40, ph = Math.random() * RANGE, bs = 19 + Math.random() * 11;
      for (let s = 0; s < S; s++) {
        aX[k] = cx; aZ[k] = cz; aSlot[k] = s; aSpeed[k] = sp; aPhase[k] = ph; aSize[k] = bs;
        aCell[k] = Math.floor(Math.random() * 64);
        aHead[k] = s === 0 ? 1 : 0;
        aBright[k] = s === 0 ? 1.0 : Math.max(0.18, 1.0 - s / (S * 1.1));
        k++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aX', new THREE.BufferAttribute(aX, 1));
    g.setAttribute('aZ', new THREE.BufferAttribute(aZ, 1));
    g.setAttribute('aSlot', new THREE.BufferAttribute(aSlot, 1));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    g.setAttribute('aCell', new THREE.BufferAttribute(aCell, 1));
    g.setAttribute('aBright', new THREE.BufferAttribute(aBright, 1));
    g.setAttribute('aHead', new THREE.BufferAttribute(aHead, 1));

    uColor.value = accent();
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uDPR: { value: DPR }, uAtlas: { value: glyphAtlas() },
        uRange: { value: RANGE }, uGap: { value: GAP }, uColor },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime,uDPR,uRange,uGap;
        attribute float aX,aZ,aSlot,aSpeed,aPhase,aSize,aCell,aBright,aHead;
        varying float vFade,vBright,vHead; varying vec2 vOrigin;
        void main(){
          float total = aSlot*uGap + uTime*aSpeed + aPhase;
          float y = uRange*0.5 - mod(total, uRange);
          vec4 mv = modelViewMatrix * vec4(vec3(aX,y,aZ),1.0);
          gl_PointSize = aSize*uDPR*(320.0/-mv.z);
          vFade = smoothstep(720.0, 30.0, -mv.z);
          vBright = aBright; vHead = aHead;
          float grid=8.0; vOrigin = vec2(mod(aCell,grid), floor(aCell/grid))/grid;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uAtlas; uniform vec3 uColor;
        varying float vFade,vBright,vHead; varying vec2 vOrigin;
        void main(){
          vec2 uv = vOrigin + vec2(gl_PointCoord.x, 1.0-gl_PointCoord.y)/8.0;
          float a = texture2D(uAtlas, uv).a * vFade;
          if(a < 0.02) discard;
          vec3 col = uColor*vBright + vec3(vHead)*0.45;
          gl_FragColor = vec4(col*a, a);
        }`
    });
    rain = new THREE.Points(g, mat);
    rain.frustumCulled = false;
    scene.add(rain);

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.5, 0.0));

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', e => { mouseX = e.clientX / W - 0.5; mouseY = e.clientY / H - 0.5; }, { passive: true });
    // theme changes -> recolor
    new MutationObserver(() => { uColor.value = accent(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // 3D is the background -> hide the 2D fallback rain
    const old = document.getElementById('rain'); if (old) old.style.display = 'none';

    loop();   // paint an immediate first frame, then run via rAF
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H); composer.setSize(W, H);
    camera.aspect = W / H; camera.updateProjectionMatrix();
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (isLight()) return;                                // skip in light theme (rAF auto-pauses in hidden tabs)
    if (ts - lastFrame < 33) return;                      // cap to ~30fps
    lastFrame = ts;
    const time = (performance.now() - t0) / 1000;
    const docH = Math.max(1, document.body.scrollHeight - window.innerHeight);
    targetT = Math.min(1, Math.max(0, window.scrollY / docH));
    scrollT += (targetT - scrollT) * 0.06;
    rain.material.uniforms.uTime.value = time;
    camera.position.z = 130 - scrollT * 250;
    camera.position.y = 4 + Math.sin(time * 0.32) * 1.4;
    camera.position.x += (mouseX * 24 - camera.position.x) * 0.04;
    camera.rotation.z = mouseX * 0.018;
    camera.lookAt(camera.position.x * 0.3, 2, camera.position.z - 120);
    composer.render();
  }
})();
