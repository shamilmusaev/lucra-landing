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
  var MAX_BLUR = 8;   // px the hero copy blurs by at full zoom
  var ticking = false;

  function clamp01(v: number) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function update() {
    ticking = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var r = chromeEl.getBoundingClientRect();
    // p = 0 while the window is still low in the viewport, 1 once it reaches the top.
    var start = vh * 0.72;   // begin zooming when the window top passes here
    var end = vh * 0.08;     // fully zoomed when it nears the top
    var p = clamp01((start - r.top) / (start - end));
    // Shape the raw linear progress with an ease-out so the window decelerates
    // into its final size instead of tracking the scrollbar 1:1. Stays monotonic
    // (reversible on scroll-up). Nav focus below keeps the raw p so it never lags.
    var pe = 1 - Math.pow(1 - p, 2.2);
    var scale = MIN + (MAX - MIN) * pe;
    chromeEl.style.transform = 'scale(' + scale.toFixed(4) + ')';
    // Depth-of-field: as the window advances, the copy above it recedes — blur + slight fade.
    if (inner) {
      inner.style.filter = pe > 0 ? 'blur(' + (pe * MAX_BLUR).toFixed(2) + 'px)' : '';
      inner.style.opacity = (1 - pe * 0.5).toFixed(3);
    }
    // Nav slides up out of view (it does NOT fade) while the window's TOP edge is in
    // the collision zone near the top. As that edge scrolls above the top, focus drops
    // and the nav slides back — by then it's scrolled, so it returns as the compact pill.
    // We move it via `top`, not `transform`: a transform would disable the nav-inner's
    // backdrop-filter (glassmorphism). top keeps the blur intact the whole way.
    if (nav) {
      var focus = p * clamp01(1 + r.top / (vh * 0.30));
      nav.style.top = (-focus * 110).toFixed(1) + 'px';
      if (navInner) navInner.style.pointerEvents = focus > 0.5 ? 'none' : 'auto';
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  chromeEl.style.transformOrigin = 'center center';
  chromeEl.style.willChange = 'transform';
  if (inner) inner.style.willChange = 'filter, opacity';
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}
