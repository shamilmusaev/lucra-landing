export function initScrollZoom(): void {
  // Scroll-zoom — the demo window starts slightly pushed back and grows toward
  // the viewer as you scroll, settling at its natural size right as the hero
  // hands off to the next section. Scale never exceeds 1, so edges never clip.
  var chrome = document.querySelector('.browser-chrome') as HTMLElement | null;
  if (!chrome) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 1199px)').matches) return; // static dashboard — no scroll-zoom
  var chromeEl = chrome;
  var inner = document.querySelector('.hero-inner') as HTMLElement | null; // text above the window — blurs as the window comes forward
  var nav = document.getElementById('nav');           // fixed top nav — steps aside while the demo is in focus
  var navInner = nav && (nav.querySelector('.nav-inner') as HTMLElement | null);

  var MIN = 0.9, MAX = 1.0;
  var MOTION_VIEWPORT_MAX_HEIGHT = 900;
  var MAX_BLUR = 8;   // px the hero copy blurs by at full zoom
  var ticking = false;
  // Last values written to the DOM. Re-applying an unchanged style still costs a
  // repaint (blur especially), so each frame writes only what actually changed —
  // and the blur is stepped to 0.5px so a slow scroll repaints the hero copy a
  // handful of times across the whole zoom instead of on every frame.
  var lastScale = -1, lastBlur = -1, lastOpacity = -1, lastTop = NaN;

  function clamp01(v: number) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function update() {
    ticking = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    // Keep tall desktop viewports from starting the zoom/blur while the page is
    // still at the top.
    var motionVh = Math.min(vh, MOTION_VIEWPORT_MAX_HEIGHT);
    var r = chromeEl.getBoundingClientRect();
    // p = 0 while the window is still low in the viewport, 1 once it reaches the top.
    var start = motionVh * 0.72;   // begin zooming when the window top passes here
    var end = motionVh * 0.08;     // fully zoomed when it nears the top
    var p = clamp01((start - r.top) / (start - end));
    // Shape the raw linear progress with an ease-out so the window decelerates
    // into its final size instead of tracking the scrollbar 1:1. Stays monotonic
    // (reversible on scroll-up). Nav focus below keeps the raw p so it never lags.
    var pe = 1 - Math.pow(1 - p, 2.2);
    var scale = MIN + (MAX - MIN) * pe;
    if (scale !== lastScale) {
      chromeEl.style.transform = 'scale(' + scale.toFixed(4) + ')';
      lastScale = scale;
    }
    // Depth-of-field: as the window advances, the copy above it recedes — blur + slight fade.
    if (inner) {
      var blur = Math.round(pe * MAX_BLUR * 2) / 2;   // 0.5px steps
      if (blur !== lastBlur) {
        inner.style.filter = blur > 0 ? 'blur(' + blur + 'px)' : '';
        lastBlur = blur;
      }
      var opacity = Math.round((1 - pe * 0.5) * 100) / 100;
      if (opacity !== lastOpacity) {
        inner.style.opacity = String(opacity);
        lastOpacity = opacity;
      }
    }
    // Nav slides up out of view (it does NOT fade) while the window's TOP edge is in
    // the collision zone near the top. As that edge scrolls above the top, focus drops
    // and the nav slides back — by then it's scrolled, so it returns as the compact pill.
    // We move it via `top`, not `transform`: a transform would disable the nav-inner's
    // backdrop-filter (glassmorphism). top keeps the blur intact the whole way.
    if (nav) {
      var focus = p * clamp01(1 + r.top / (vh * 0.30));
      var top = Math.round(focus * 110 * 10) / 10;
      if (top !== lastTop) {
        nav.style.top = (-top) + 'px';
        lastTop = top;
      }
      if (navInner) navInner.style.pointerEvents = focus > 0.5 ? 'none' : 'auto';
    }
  }
  var active = false;
  function onScroll() {
    if (!active) return;            // no rAF work while the demo is far offscreen
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  var io = new IntersectionObserver(function (entries) {
    active = entries.some(function (e) { return e.isIntersecting; });
    chromeEl.style.willChange = active ? 'transform' : '';
    if (inner) inner.style.willChange = active ? 'filter, opacity' : '';
    if (active) onScroll();
  }, { rootMargin: '300px 0px' });

  chromeEl.style.transformOrigin = 'center center';
  io.observe(chromeEl);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
}
