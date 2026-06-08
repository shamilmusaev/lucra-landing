// Shared cursor-reactive dot-field ("fog wipe"). Ported from the hero module
// (originally inline in HeroParticles) and generalised so it can be mounted on
// any container — the hero, the comparison table, the pricing cards, etc.
//
// The dots are drawn on a canvas and treated like mist on glass: the cursor
// erases them along its path with a soft brush, and the cleared trail slowly
// fogs back over ~1.6s. A separate single-channel "fog" buffer tracks how
// misted each pixel is (1 = full fog, 0 = wiped); the visible canvas = dot
// pattern masked by that buffer.
//
// Hero-specific choreography (intro reveal from the orb, orb-click sweep, the
// window.lucraFogIntro hook) lives in HeroParticles.astro, which drives this
// core through the returned controller's reveal()/clear() methods.

export interface ParticleFieldOptions {
  /** Canvas is injected here and the static CSS dot fallback is cleared from it. */
  canvasParent: HTMLElement;
  /** Element whose rect defines width/height + coordinate origin. Default: canvasParent. */
  surface?: HTMLElement;
  /** Element that listens for pointermove (lets content above the field still wipe). Default: surface. */
  pointer?: HTMLElement;
  /** Class for the injected canvas. */
  canvasClass: string;
  /** Start fully cleared and wait for reveal() (hero intro). Default: false → start fogged (dots visible). */
  startCleared?: boolean;
  /** Dot opacity when fully fogged (0..1). Default 0.24. */
  dotAlpha?: number;
  /** Dot RGB triple, e.g. '255,255,255' for dark panels. Default '61,80,109' (slate, for the light page). */
  dotColor?: string;
}

export interface ParticleFieldController {
  /** Fog condenses outward from a centre point, materialising the dots once. */
  reveal(getCenter: () => { x: number; y: number }): void;
  /** Wipe the whole field clean from a centre point, then hold cleared for holdMs before refogging. */
  clear(getCenter: () => { x: number; y: number }, holdMs?: number): void;
  resize(): void;
}

export function initParticleField(opts: ParticleFieldOptions): ParticleFieldController | null {
  const canvasParent = opts.canvasParent;
  const surface = opts.surface ?? canvasParent;
  const pointer = opts.pointer ?? surface;
  if (typeof document.createElement('canvas').getContext !== 'function') return null;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  const DOT = 24;                       // grid spacing (matches the CSS fallback)
  const DOT_R = 1.05;                   // dot radius
  const DOT_RGB = opts.dotColor ?? '61,80,109';  // Lucra slate (light page); pass light rgb for dark panels
  const DOT_A = opts.dotAlpha ?? 0.24;  // dot opacity when fully fogged
  const REFOG = 0.012;                  // per-frame fog regrowth (lower = slower, smoother return)
  const BRUSH_MIN = 92;                 // wipe radius when moving slowly (precise)
  const BRUSH_MAX = 210;                // wipe radius when moving fast (sweeping)
  const CYAN = '86,179,235';            // Lucra accent #56B3EB — glow / wiped-edge tint
  const GLOW_R = 175;                   // cursor glow radius (px)
  const GLOW_TINT = 0.55;               // how strongly the rim dots go cyan
  const GLOW_WASH = 0.06;               // faint cyan light in the cleared centre
  const FOLLOW = 0.22;                  // glow trailing speed (lower = smoother)

  const canvas = document.createElement('canvas');
  canvas.className = opts.canvasClass;
  canvasParent.appendChild(canvas);
  canvasParent.style.backgroundImage = 'none';   // canvas replaces the static fallback
  const ctx = canvas.getContext('2d');

  // Offscreen layers: a tiled dot pattern + the fog buffer.
  const pat = document.createElement('canvas');
  const pctx = pat.getContext('2d');
  const fog = document.createElement('canvas');
  const fctx = fog.getContext('2d');
  if (!ctx || !pctx || !fctx) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  let px = 0, py = 0, hasPrev = false;  // previous pointer position (device px)
  let dirtyUntil = 0;                   // keep animating until this timestamp
  let running = false;
  // Cap to 60fps: this is the heaviest loop (full-canvas fog fill + composite).
  // The drift/glow reads the same at 60 as at 120 on this slow background, while
  // halving the per-second paint work on ProMotion displays.
  const FRAME_INTERVAL = 1000 / 60;
  let lastRender = 0;
  let gx = 0, gy = 0, glowA = 0;        // eased glow position + intensity (0..1)
  let curBrush = BRUSH_MIN;             // eased brush radius (px, CSS)
  let lastMoveT = 0;                    // timestamp of previous pointermove
  let firstResize = true;               // first sizing decides fogged vs cleared
  let holdUntil = 0;                    // pause fog regrowth until this time (clear hold)
  // Clear-sweep wavefront, shared with frame() so it can tint dots cyan at the
  // expanding edge (dots flash blue just before the wipe erases them).
  let sweepActive = false, sweepX = 0, sweepY = 0, sweepR = 0;

  function buildPattern(): void {
    const s = DOT * dpr;
    pat.width = s; pat.height = s;
    pctx!.clearRect(0, 0, s, s);
    pctx!.fillStyle = 'rgba(' + DOT_RGB + ',' + DOT_A + ')';
    pctx!.beginPath();
    pctx!.arc(s / 2, s / 2, DOT_R * dpr, 0, Math.PI * 2);
    pctx!.fill();
  }

  function resize(): void {
    // Use the untransformed layout size (clientWidth/Height ignore CSS
    // transforms) — getBoundingClientRect would bake in any in-flight reveal
    // scale (e.g. the CTA panel's scale(.96)), leaving the canvas undersized.
    const cw = surface.clientWidth;
    const ch = surface.clientHeight;
    W = Math.max(1, Math.round(cw * dpr));
    H = Math.max(1, Math.round(ch * dpr));
    canvas.width = W; canvas.height = H;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    fog.width = W; fog.height = H;
    fctx!.globalCompositeOperation = 'source-over';
    buildPattern();
    buildGlowGradients();
    hasPrev = false;
    if (firstResize && opts.startCleared) {
      // First load (hero): start cleared and WAIT — reveal() bursts the dots in.
      firstResize = false;
      fctx!.clearRect(0, 0, W, H);
      kick(200);
    } else {
      // Start (or re-init on resize) fully fogged: dots visible.
      firstResize = false;
      fctx!.fillStyle = '#fff';
      fctx!.fillRect(0, 0, W, H);
      kick(900);
    }
  }

  // Convert a CSS-px centre (relative to the surface) into device-px.
  function toDevice(c: { x: number; y: number }): { x: number; y: number } {
    return { x: c.x * dpr, y: c.y * dpr };
  }

  // Intro — fog condenses outward from a centre, materialising the dots once.
  function reveal(getCenter: () => { x: number; y: number }): void {
    const c = toDevice(getCenter()), ox = c.x, oy = c.y;
    const maxR = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) + 8 * dpr;
    const t0 = performance.now();
    const DUR = 1000;
    (function grow() {
      const t = Math.min(1, (performance.now() - t0) / DUR);
      const R = (1 - Math.pow(1 - t, 3)) * maxR;      // ease-out expansion
      fctx!.globalCompositeOperation = 'source-over';
      const g = fctx!.createRadialGradient(ox, oy, Math.max(0, R - 70 * dpr), ox, oy, R);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      fctx!.fillStyle = g;
      fctx!.beginPath();
      fctx!.arc(ox, oy, R, 0, Math.PI * 2);
      fctx!.fill();
      kick(200);
      if (t < 1) { requestAnimationFrame(grow); }
      else { fctx!.fillStyle = '#fff'; fctx!.fillRect(0, 0, W, H); kick(200); }
    })();
  }

  // Sweep the whole field clean from a centre, then let the fog drift back in.
  function clear(getCenter: () => { x: number; y: number }, holdMs?: number): void {
    const c = toDevice(getCenter()), ox = c.x, oy = c.y;
    const maxR = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) + 8 * dpr;
    const hold = holdMs ?? 8000;
    const t0 = performance.now();
    // Constant wavefront speed (CSS px/ms) so the sweep reads the same regardless
    // of canvas height — on a tall hero a fixed duration made maxR huge and the
    // visible area cleared in a flash. Lower = slower, more visible spread.
    const SWEEP_SPEED = 0.62;
    const DUR = (maxR / dpr) / SWEEP_SPEED;
    holdUntil = performance.now() + hold;
    (function grow() {
      const t = Math.min(1, (performance.now() - t0) / DUR);
      const R = t * maxR;                            // constant-speed wavefront from the orb
      fctx!.globalCompositeOperation = 'destination-out';
      const g = fctx!.createRadialGradient(ox, oy, Math.max(0, R - 150 * dpr), ox, oy, R);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      fctx!.fillStyle = g;
      fctx!.beginPath();
      fctx!.arc(ox, oy, R, 0, Math.PI * 2);
      fctx!.fill();
      sweepActive = true; sweepX = ox; sweepY = oy; sweepR = R;  // feed the cyan-edge tint
      kick(300);
      if (t < 1) requestAnimationFrame(grow);
      else { sweepActive = false; kick(hold + 3800); }            // hold cleared, then refog
    })();
  }

  function eraseSegment(x0: number, y0: number, x1: number, y1: number, brushCss: number): void {
    // Stamp soft brush dabs from the previous point to the current one so
    // fast moves still clear a continuous stroke.
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const br = (brushCss || BRUSH_MIN) * dpr;
    const step = Math.max(br * 0.28, 1);
    const n = Math.max(1, Math.ceil(dist / step));
    fctx!.globalCompositeOperation = 'destination-out';
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + dx * t, y = y0 + dy * t;
      const g = fctx!.createRadialGradient(x, y, 0, x, y, br);
      g.addColorStop(0, 'rgba(0,0,0,0.92)');
      g.addColorStop(0.45, 'rgba(0,0,0,0.6)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      fctx!.fillStyle = g;
      fctx!.beginPath();
      fctx!.arc(x, y, br, 0, Math.PI * 2);
      fctx!.fill();
    }
  }

  // Fog slowly regrows everywhere (alpha climbs back toward 1) — unless a clear()
  // is holding the field clear — then compose the visible canvas: the full dot
  // pattern masked by the fog alpha.
  function regrowAndComposeDots(): void {
    if (performance.now() >= holdUntil) {
      fctx!.globalCompositeOperation = 'source-over';
      fctx!.fillStyle = 'rgba(255,255,255,' + REFOG + ')';
      fctx!.fillRect(0, 0, W, H);
    }
    ctx!.globalCompositeOperation = 'source-over';
    ctx!.clearRect(0, 0, W, H);
    const pattern = ctx!.createPattern(pat, 'repeat');
    ctx!.fillStyle = pattern!;
    ctx!.fillRect(0, 0, W, H);
    ctx!.globalCompositeOperation = 'destination-in';
    ctx!.drawImage(fog, 0, 0);
  }

  // Clear sweep: the dots in a band just ahead of the wavefront grow and glow
  // cyan, then vanish the instant the front reaches them — each dot "pops"
  // before it's wiped, rather than a smooth halo.
  function drawSweepPops(): void {
    const s = DOT * dpr;
    const BURST = 130 * dpr;          // band width ahead of the front where dots pop
    const POP_SCALE = 2.8;            // swell factor for a popping dot
    const rOut = sweepR + BURST;
    const iLo = Math.max(0, Math.floor((sweepX - rOut) / s));
    const iHi = Math.min(Math.ceil(W / s), Math.ceil((sweepX + rOut) / s));
    const jLo = Math.max(0, Math.floor((sweepY - rOut) / s));
    const jHi = Math.min(Math.ceil(H / s), Math.ceil((sweepY + rOut) / s));
    ctx!.globalCompositeOperation = 'source-over';
    for (let i = iLo; i <= iHi; i++) {
      const x = s / 2 + i * s;
      for (let j = jLo; j <= jHi; j++) {
        const y = s / 2 + j * s;
        const d = Math.hypot(x - sweepX, y - sweepY);
        if (d < sweepR || d > rOut) continue;   // only surviving dots ahead of the front
        const f = 1 - (d - sweepR) / BURST;      // 1 at the front, 0 at the band's outer edge
        const ease = f * f * (3 - 2 * f);
        const rad = DOT_R * dpr * (1 + (POP_SCALE - 1) * ease);
        ctx!.fillStyle = 'rgba(' + CYAN + ',' + (0.9 * ease).toFixed(3) + ')';
        ctx!.beginPath();
        ctx!.arc(x, y, rad, 0, Math.PI * 2);
        ctx!.fill();
      }
    }
  }

  // Cursor-glow gradients are positioned at the origin and rebuilt only on resize
  // (radius depends on the constant GLOW_R * dpr). drawCursorGlow translates them
  // under the pointer and scales intensity via globalAlpha, so no gradient is
  // allocated per frame during hover.
  let glowGrad: CanvasGradient | null = null;
  let washGrad: CanvasGradient | null = null;
  function buildGlowGradients(): void {
    const gr = GLOW_R * dpr;
    glowGrad = ctx!.createRadialGradient(0, 0, 0, 0, 0, gr);
    glowGrad.addColorStop(0, 'rgba(' + CYAN + ',' + GLOW_TINT.toFixed(3) + ')');
    glowGrad.addColorStop(0.7, 'rgba(' + CYAN + ',' + (GLOW_TINT * 0.35).toFixed(3) + ')');
    glowGrad.addColorStop(1, 'rgba(' + CYAN + ',0)');
    washGrad = ctx!.createRadialGradient(0, 0, 0, 0, 0, gr * 0.82);
    washGrad.addColorStop(0, 'rgba(' + CYAN + ',' + GLOW_WASH.toFixed(3) + ')');
    washGrad.addColorStop(1, 'rgba(' + CYAN + ',0)');
  }

  // Radial cyan glow under the cursor.
  function drawCursorGlow(): void {
    if (!glowGrad || !washGrad) return;
    ctx!.save();
    ctx!.translate(gx, gy);
    ctx!.globalAlpha = glowA;
    ctx!.globalCompositeOperation = 'source-atop';
    ctx!.fillStyle = glowGrad;
    ctx!.fillRect(-gx, -gy, W, H);
    ctx!.globalCompositeOperation = 'source-over';
    ctx!.fillStyle = washGrad;
    ctx!.fillRect(-gx, -gy, W, H);
    ctx!.restore();
  }

  // Per-frame orchestrator: regrow + compose, then layer the active passes.
  function frame(): void {
    // Don't paint while the field is offscreen or the tab is backgrounded —
    // the canvas keeps its last frame, so this is invisible when it returns.
    if (!visible()) { running = false; return; }
    const now = performance.now();
    if (now - lastRender < FRAME_INTERVAL) { requestAnimationFrame(frame); return; }
    lastRender = now;

    regrowAndComposeDots();

    // Ease the glow position toward the pointer.
    gx += (px - gx) * FOLLOW;
    gy += (py - gy) * FOLLOW;

    if (sweepActive) drawSweepPops();
    if (glowA > 0.004) {
      drawCursorGlow();
      glowA *= 0.9;
    }
    ctx!.globalCompositeOperation = 'source-over';

    if (performance.now() < dirtyUntil || glowA > 0.02) {
      requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }

  function kick(ms: number): void {
    dirtyUntil = Math.max(dirtyUntil, performance.now() + (ms || 1700));
    if (!running && visible()) { running = true; requestAnimationFrame(frame); }
  }

  // Render-gate: only animate while the field is on-screen and the tab is active.
  let onScreen = true;
  const visible = (): boolean => onScreen && !document.hidden;
  function resume(): void {
    if (!running && visible() && (performance.now() < dirtyUntil || glowA > 0.02)) {
      running = true;
      requestAnimationFrame(frame);
    }
  }
  const fieldObserver = new IntersectionObserver((entries) => {
    onScreen = entries.some((entry) => entry.isIntersecting);
    if (onScreen) resume();
  });
  fieldObserver.observe(surface);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });

  pointer.addEventListener('pointermove', function (event: PointerEvent) {
    const r = surface.getBoundingClientRect();
    const x = (event.clientX - r.left) * dpr;
    const y = (event.clientY - r.top) * dpr;
    const now = performance.now();
    if (!hasPrev) { px = x; py = y; gx = x; gy = y; hasPrev = true; lastMoveT = now; }

    // Velocity-aware brush: fast cursor → wider, sweeping wipe; slow → tighter.
    const dt = Math.max(1, now - lastMoveT);
    const speed = Math.hypot(x - px, y - py) / dpr / dt;     // CSS px per ms
    const target = BRUSH_MIN + (BRUSH_MAX - BRUSH_MIN) * Math.min(1, speed / 2.4);
    curBrush += (target - curBrush) * 0.35;                  // ease to avoid jitter
    lastMoveT = now;

    eraseSegment(px, py, x, y, curBrush);
    px = x; py = y;
    glowA = 1;                  // light up the glow under the cursor
    kick(2800);                 // keep refogging running for a bit after we stop
  }, { passive: true });
  pointer.addEventListener('pointerleave', function () { hasPrev = false; kick(2800); }, { passive: true });

  let rt: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 150);
  });
  // Re-sync the canvas to the surface's real (untransformed) box whenever it
  // settles — covers the post-reveal scale snap-back and any later reflow.
  // Skip ResizeObserver's mandatory initial callback: the sync resize() below
  // already sizes correctly (clientWidth ignores transforms), and a second
  // resize() at mount would re-fog the hero and clobber its intro reveal().
  if (typeof ResizeObserver === 'function') {
    let roPrimed = false;
    new ResizeObserver(() => { if (roPrimed) resize(); else roPrimed = true; }).observe(surface);
  }
  resize();

  return { reveal, clear, resize };
}
