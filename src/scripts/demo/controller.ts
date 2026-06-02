import { createCoach } from './coach';

export function initController(): void {
    // Product demo — tabs reveal as the frame scrolls in, hide on scroll back up,
    // autorotate + click. Active state is a single "bubble" that flows tab-to-tab.
    var wrap = document.querySelector('.hero-chrome-wrap') as HTMLElement | null;
    if (!wrap) return;
    if (window.matchMedia('(max-width: 1199px)').matches) return; // static dashboard — no tabs/rotation/coach
    var wrapEl = wrap;
    var tabBar   = wrapEl.querySelector('.demo-tabs');
    var tabs     = wrapEl.querySelectorAll('.demo-tab') as NodeListOf<HTMLElement>;
    var panels   = wrapEl.querySelectorAll('.demo-panel') as NodeListOf<HTMLElement>;
    var sideItems= wrapEl.querySelectorAll('.sidebar-item[data-panel]') as NodeListOf<HTMLElement>;
    var chromeEl = wrapEl.querySelector('.browser-chrome') as HTMLElement | null;
    var coach = createCoach(wrapEl, chromeEl);
    var ind      = wrapEl.querySelector('.demo-tab-ind') as (HTMLElement & { _settle?: ReturnType<typeof setTimeout> }) | null;
    if (!tabBar || !tabs.length || !panels.length) return;
    var tabBarEl = tabBar;
    var ROT_MS = 5500;
    var idx = 0;
    var timer: ReturnType<typeof setTimeout> | null = null;
    var visible = false;
    var auto = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var reduceMotion = !auto;

    function moveIndicator(animate: boolean) {
      if (!ind) return;
      var indEl = ind;
      var t = tabs[idx];
      var L = t.offsetLeft, W = t.offsetWidth;
      if (animate && indEl.classList.contains('ready')) {
        // Bubble flow: first stretch to span the current pill and the target,
        // then settle onto the target — reads as one bubble melting into the next.
        var curL = parseFloat(indEl.style.left) || L;
        var curW = parseFloat(indEl.style.width) || W;
        var spanL = Math.min(curL, L);
        var spanR = Math.max(curL + curW, L + W);
        indEl.style.left  = spanL + 'px';
        indEl.style.width = (spanR - spanL) + 'px';
        clearTimeout(indEl._settle);
        indEl._settle = setTimeout(function() {
          indEl.style.left  = L + 'px';
          indEl.style.width = W + 'px';
        }, 230);
      } else {
        indEl.style.left  = L + 'px';
        indEl.style.width = W + 'px';
      }
      indEl.classList.add('ready');
    }
    function activate(i: number, animate?: boolean) {
      idx = i;
      var key = tabs[i].dataset.panel;
      // Match panels/sidebar by data-panel (not index) so the DOM order of
      // panels is independent of the tab order.
      tabs.forEach(function(t, j) { t.classList.toggle('is-active', j === i); });
      panels.forEach(function(p) { p.classList.toggle('is-active', p.dataset.panel === key); });
      sideItems.forEach(function(s) { s.classList.toggle('active', s.dataset.panel === key); });
      coach.play(key, function() { return visible; });
      moveIndicator(animate !== false);
    }
    function tick() {
      if (!auto || !visible) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function() {
        // Hold on the current tab while the chat demo is still playing out or the
        // coach callouts are still narrating, so nothing is cut off mid-stream.
        if ((window as any).lucraChatBusy || (window as any).lucraCoachBusy) { tick(); return; }
        activate((idx + 1) % tabs.length);
        tick();
      }, ROT_MS);
    }

    tabs.forEach(function(t, i) {
      t.addEventListener('click', function() {
        // Clicking a tab never stops the demo — it just jumps there and restarts
        // the rotation countdown from the clicked tab.
        activate(i);
        tick();
      });
    });
    window.addEventListener('resize', function() { moveIndicator(false); });

    function setVisible(v: boolean) {
      if (v === visible) return;
      visible = v;
      wrapEl.classList.toggle('tabs-visible', v);
      if (v) {
        moveIndicator(false);
        coach.play(tabs[idx].dataset.panel, function() { return visible; });
        tick();
      } else {
        if (timer) clearTimeout(timer);
        timer = null;
        coach.clear();
      }
    }
    function onScroll() {
      // Start auto-rotation the moment the TAB BAR itself enters the viewport, and
      // pause it once the bar leaves — rotation is tied to the tabs being on screen.
      var rect = tabBarEl.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      setVisible(window.scrollY > 60 && rect.top < vh * 0.92 && rect.bottom > vh * 0.06);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    // Reduced-motion users get no rotation/autoplay, so default to the most
    // informative panel (Dashboard, fully static) instead of the chat welcome.
    if (reduceMotion) {
      var dashIdx = Array.prototype.findIndex.call(tabs, function (t: HTMLElement) { return t.dataset.panel === 'dashboard'; });
      if (dashIdx >= 0) { idx = dashIdx; activate(idx, false); }
    }
    // Seed the bubble under the default tab up front (tabs are laid out even while hidden).
    moveIndicator(false);
    onScroll();
}
