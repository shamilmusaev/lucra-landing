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
  /** Hero-only: cursor makes nearby dots grow + glow cyan, and softens the wipe. Default false. */
  interactiveBloom?: boolean;
  /** Bloom only: CSS selector for elements whose area must stay calm (dots there don't grow/glow). */
  bloomExcludeSelector?: string;
  /** Bloom only: intensity multiplier for the outline thickness, dot size and glow. Default 1. */
  bloomStrength?: number;
  /** Bloom only: restrict the bloom to while the cursor is over this element; outside it the field wipes. */
  bloomZoneSelector?: string;
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

  const bloomEnabled = !!opts.interactiveBloom;
  const TRI_H = 260;                    // bloom silhouette height (CSS px) — Lucra delta mark
  const TRI_W = TRI_H * 1.1;            // base width (logo aspect ≈ 1.1)
  const TRI_FEATHER = 22;               // px: soft rim so the outline edge isn't a hard cut
  const TRI_STROKE = 32;                // px: outline thickness — hollow inside, like the logo mark
  const BLOOM_SCALE = 2.8;              // max dot-size multiplier under the cursor
  const BLOOM_A = 0.9;                  // peak cyan alpha of a bloomed dot
  const STR = Math.max(0.1, opts.bloomStrength ?? 1);  // per-section intensity multiplier
  const TRI_STROKE_EFF = TRI_STROKE * STR;             // thicker outline at higher strength
  const BLOOM_SCALE_EFF = 1 + (BLOOM_SCALE - 1) * STR; // dots grow more
  const BLOOM_A_EFF = Math.min(1, BLOOM_A * STR);      // and glow brighter (capped)
  const BLOOM_FEATHER = 56;             // px: soft ramp around keep-out zones (no hard dot-line)
  const TWINKLE_SPEED = 0.0024;         // bloom: per-dot shimmer speed (rad/ms)
  const TWINKLE_MIN = 0.4;              // bloom: dimmest a twinkling dot gets (1 = no twinkle)
  const FOLLOW = bloomEnabled ? 0.14 : 0.22;  // glow trailing speed (lower = smoother)
  const BLOOM_EXCLUDE = opts.bloomExcludeSelector ?? '';  // areas (text/orb/UI) kept calm
  const BLOOM_ZONE = bloomEnabled ? (opts.bloomZoneSelector ?? '') : '';  // bloom only over this element

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
  const bloom = document.createElement('canvas');
  const bctx = bloom.getContext('2d');
  if (!ctx || !pctx || !fctx || !bctx) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  let px = 0, py = 0, hasPrev = false;  // previous pointer position (device px)
  let dirtyUntil = 0;                   // keep animating until this timestamp
  let running = false;
  let gx = 0, gy = 0, glowA = 0;        // eased glow position + intensity (0..1)
  let curBrush = BRUSH_MIN;             // eased brush radius (px, CSS)
  let lastMoveT = 0;                    // timestamp of previous pointermove
  let firstResize = true;               // first sizing decides fogged vs cleared
  let holdUntil = 0;                    // pause fog regrowth until this time (clear hold)
  // Clear-sweep wavefront, shared with frame() so it can tint dots cyan at the
  // expanding edge (dots flash blue just before the wipe erases them).
  let sweepActive = false, sweepX = 0, sweepY = 0, sweepR = 0;
  let pointerInside = false;            // bloom: hold the glow alive while the cursor hovers
  // Whether the bloom (triangle) is currently the active mode. With a bloom zone
  // set, this toggles on pointermove by cursor position; otherwise it follows
  // bloomEnabled. When false the field behaves as the classic wipe.
  let bloomActive = bloomEnabled && !BLOOM_ZONE;
  let zoneElems: Element[] | null = null;  // cached bloom-zone elements (any may host the bloom)
  let activeZone: Element | null = null;   // the zone the cursor is currently inside
  let excludeRects: number[][] = [];    // bloom: [x0,y0,x1,y1] device-px boxes (text/orb/UI) to skip
  let excludeFresh = false;             // bloom: recompute exclude boxes once after layout settles

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
    bloom.width = W; bloom.height = H;
    fctx!.globalCompositeOperation = 'source-over';
    buildPattern();
    hasPrev = false;
    refreshExclude();
    excludeFresh = false;
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

  // Bloom: snapshot the no-bloom zones (text/orb/UI) as device-px boxes relative
  // to the surface. Scroll-invariant (element and surface move together), so this
  // only needs refreshing on layout changes — call it on resize + once on first move.
  function refreshExclude(): void {
    if (!bloomEnabled || !BLOOM_EXCLUDE) { excludeRects = []; return; }
    const sr = surface.getBoundingClientRect();
    const pad = 6 * dpr;
    excludeRects = Array.from(document.querySelectorAll(BLOOM_EXCLUDE)).map((el) => {
      const r = el.getBoundingClientRect();
      return [
        (r.left - sr.left) * dpr - pad,
        (r.top - sr.top) * dpr - pad,
        (r.right - sr.left) * dpr + pad,
        (r.bottom - sr.top) * dpr + pad,
      ];
    });
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

  // Signed perpendicular distance from (x,y) to the line through P→Q (device px);
  // the sign flips across the line, so combined with a reference sign it tells
  // which side of a triangle edge a point lies on. Used by the bloom silhouette.
  function edgeDist(pxv: number, pyv: number, qxv: number, qyv: number, x: number, y: number): number {
    const ex = qxv - pxv, ey = qyv - pyv;
    const len = Math.hypot(ex, ey) || 1;
    return ((x - pxv) * ey - (y - pyv) * ex) / len;
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

  // Bloom: the Lucra delta silhouette centred on the cursor. Dots along the
  // outline grow + glow cyan and twinkle; drawn on its own layer, masked by the
  // fog, and clipped to the bloom zone so it never spills past the table/card.
  function drawBloomTriangle(): void {
    const s = DOT * dpr;                 // grid spacing in device px
    const triH = TRI_H * dpr, triW = TRI_W * dpr, triF = TRI_FEATHER * dpr;
    const triStroke = TRI_STROKE_EFF * dpr;
    const vax = gx,            vay = gy - triH * 2 / 3;  // apex (top)
    const vbx = gx + triW / 2, vby = gy + triH / 3;      // base-right
    const vcx = gx - triW / 2, vcy = gy + triH / 3;      // base-left
    // Reference signs (the centroid = cursor is inside) make each edge distance
    // positive on the interior side; the min of the three = distance to the
    // nearest edge (>=0 inside, <0 outside).
    const sAB = Math.sign(edgeDist(vax, vay, vbx, vby, gx, gy)) || 1;
    const sBC = Math.sign(edgeDist(vbx, vby, vcx, vcy, gx, gy)) || 1;
    const sCA = Math.sign(edgeDist(vcx, vcy, vax, vay, gx, gy)) || 1;
    bctx!.globalCompositeOperation = 'source-over';
    bctx!.clearRect(0, 0, W, H);
    // Clip the silhouette to the bloom zone (the table/card) so it never spills
    // outside even when the cursor sits near an edge. Box in surface device-px.
    let zx0 = -Infinity, zy0 = -Infinity, zx1 = Infinity, zy1 = Infinity;
    if (BLOOM_ZONE && activeZone) {
      const sr = surface.getBoundingClientRect();
      const zr = activeZone.getBoundingClientRect();
      zx0 = (zr.left - sr.left) * dpr;  zy0 = (zr.top - sr.top) * dpr;
      zx1 = (zr.right - sr.left) * dpr; zy1 = (zr.bottom - sr.top) * dpr;
    }
    const iMin = Math.floor((gx - triW / 2 - triF - s / 2) / s);
    const iMax = Math.ceil((gx + triW / 2 + triF - s / 2) / s);
    const jMin = Math.floor((vay - triF - s / 2) / s);
    const jMax = Math.ceil((vby + triF - s / 2) / s);
    const now = performance.now();   // drives the per-dot twinkle
    for (let i = iMin; i <= iMax; i++) {
      const x = s / 2 + i * s;
      if (x < 0 || x > W) continue;
      if (x < zx0 || x > zx1) continue;    // clip to the bloom zone — x
      for (let j = jMin; j <= jMax; j++) {
        const y = s / 2 + j * s;
        if (y < 0 || y > H) continue;
        if (y < zy0 || y > zy1) continue;  // clip to the bloom zone — y
        const sd = Math.min(
          edgeDist(vax, vay, vbx, vby, x, y) * sAB,
          edgeDist(vbx, vby, vcx, vcy, x, y) * sBC,
          edgeDist(vcx, vcy, vax, vay, x, y) * sCA,
        );
        if (sd < -triF || sd > triStroke + triF) continue;  // outside, or the hollow interior
        // Feathered keep-out: dots inside a text/orb/UI box stay silent; just
        // outside they ramp back over BLOOM_FEATHER px, so there is no hard
        // dot-line hugging the box edge.
        let mask = 1;
        const feather = BLOOM_FEATHER * dpr;
        for (let k = 0; k < excludeRects.length; k++) {
          const er = excludeRects[k];
          const ox = Math.max(er[0] - x, 0, x - er[2]);
          const oy = Math.max(er[1] - y, 0, y - er[3]);
          const od = Math.hypot(ox, oy);
          if (od <= 0) { mask = 0; break; }
          const tt = Math.min(1, od / feather);
          const m = tt * tt * (3 - 2 * tt);
          if (m < mask) mask = m;
        }
        if (mask <= 0) continue;
        // Outline profile: ramp in across the outer rim, full through the wall
        // thickness, ramp down across the inner rim into the empty middle.
        const wall = sd < 0
          ? (sd + triF) / triF
          : sd <= triStroke
            ? 1
            : 1 - (sd - triStroke) / triF;
        const f = Math.max(0, Math.min(1, wall));
        const ease = f * f * (3 - 2 * f) * mask;  // outline ramp × keep-out feather
        // Twinkle: independent shimmer per dot. Phase is hashed from the grid
        // index (not the triangle), so dots flicker in place as the shape moves.
        const hash = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
        const phase = (hash - Math.floor(hash)) * Math.PI * 2;
        const tw = TWINKLE_MIN + (1 - TWINKLE_MIN) * (0.5 + 0.5 * Math.sin(now * TWINKLE_SPEED + phase));
        const rad = DOT_R * dpr * (1 + (BLOOM_SCALE_EFF - 1) * ease);
        bctx!.fillStyle = 'rgba(' + CYAN + ',' + (BLOOM_A_EFF * ease * glowA * tw).toFixed(3) + ')';
        bctx!.beginPath();
        bctx!.arc(x, y, rad, 0, Math.PI * 2);
        bctx!.fill();
      }
    }
    bctx!.globalCompositeOperation = 'destination-in';
    bctx!.drawImage(fog, 0, 0);
    bctx!.globalCompositeOperation = 'source-over';
    ctx!.globalCompositeOperation = 'source-over';
    ctx!.drawImage(bloom, 0, 0);
  }

  // Clear sweep: the dots in a band just ahead of the wavefront grow and glow
  // cyan, then vanish the instant the front reaches them — each dot "pops"
  // before it's wiped, rather than a smooth halo.
  function drawSweepPops(): void {
    const s = DOT * dpr;
    const BURST = 130 * dpr;          // band width ahead of the front where dots pop
    const POP_SCALE = BLOOM_SCALE;    // swell to the same size as bloom (triangle) dots
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

  // Radial cyan glow under the cursor — wipe mode only. In bloom mode it would
  // wash a round halo over the dots and drown the triangle silhouette.
  function drawCursorGlow(): void {
    const gr = GLOW_R * dpr;
    ctx!.globalCompositeOperation = 'source-atop';
    const gt = ctx!.createRadialGradient(gx, gy, 0, gx, gy, gr);
    gt.addColorStop(0, 'rgba(' + CYAN + ',' + (GLOW_TINT * glowA).toFixed(3) + ')');
    gt.addColorStop(0.7, 'rgba(' + CYAN + ',' + (GLOW_TINT * glowA * 0.35).toFixed(3) + ')');
    gt.addColorStop(1, 'rgba(' + CYAN + ',0)');
    ctx!.fillStyle = gt;
    ctx!.fillRect(0, 0, W, H);
    ctx!.globalCompositeOperation = 'source-over';
    const gw = ctx!.createRadialGradient(gx, gy, 0, gx, gy, gr * 0.82);
    gw.addColorStop(0, 'rgba(' + CYAN + ',' + (GLOW_WASH * glowA).toFixed(3) + ')');
    gw.addColorStop(1, 'rgba(' + CYAN + ',0)');
    ctx!.fillStyle = gw;
    ctx!.fillRect(0, 0, W, H);
  }

  // Per-frame orchestrator: regrow + compose, then layer the active passes.
  function frame(): void {
    // Don't paint while the field is offscreen or the tab is backgrounded —
    // the canvas keeps its last frame, so this is invisible when it returns.
    if (!visible()) { running = false; return; }

    regrowAndComposeDots();

    // Ease the glow position toward the pointer; bloom holds the glow alive while
    // the cursor rests inside (keeps the loop running for the twinkle).
    gx += (px - gx) * FOLLOW;
    gy += (py - gy) * FOLLOW;
    if (bloomActive && pointerInside) { glowA = 1; kick(700); }

    if (bloomActive && glowA > 0.01) drawBloomTriangle();
    if (sweepActive) drawSweepPops();
    if (glowA > 0.004) {
      if (!bloomActive) drawCursorGlow();
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

    // Bloom zone: the triangle is active only while the cursor is over the
    // configured element (e.g. the comparison table); outside it the field wipes.
    if (bloomEnabled && BLOOM_ZONE) {
      if (!zoneElems) zoneElems = Array.from(document.querySelectorAll(BLOOM_ZONE));
      activeZone = null;
      for (const el of zoneElems) {
        const zr = el.getBoundingClientRect();
        if (event.clientX >= zr.left && event.clientX <= zr.right
          && event.clientY >= zr.top && event.clientY <= zr.bottom) { activeZone = el; break; }
      }
      bloomActive = !!activeZone;
    }

    if (!bloomActive) eraseSegment(px, py, x, y, curBrush);  // bloom mode: no wipe, dots stay intact
    if (bloomEnabled && !excludeFresh) { refreshExclude(); excludeFresh = true; }  // catch settled layout
    px = x; py = y;
    glowA = 1;                  // light up the glow under the cursor
    pointerInside = true;
    kick(2800);                 // keep refogging running for a bit after we stop
  }, { passive: true });
  pointer.addEventListener('pointerleave', function () { hasPrev = false; pointerInside = false; kick(2800); }, { passive: true });

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
