export function initController(): void {
    // Product demo — tabs reveal as the frame scrolls in, hide on scroll back up,
    // autorotate + click. Active state is a single "bubble" that flows tab-to-tab.
    // Each panel's own intro (chat/dashboard/files) plays via the shared pointer.
    var wrap = document.querySelector('.hero-chrome-wrap') as HTMLElement | null;
    if (!wrap) return;
    if (window.matchMedia('(max-width: 1199px)').matches) return; // static dashboard — no tabs/rotation
    var wrapEl = wrap;
    var tabBar   = wrapEl.querySelector('.demo-tabs');
    var tabs     = wrapEl.querySelectorAll('.demo-tab') as NodeListOf<HTMLElement>;
    var panels   = wrapEl.querySelectorAll('.demo-panel') as NodeListOf<HTMLElement>;
    var sideItems= wrapEl.querySelectorAll('.sidebar-item[data-panel]') as NodeListOf<HTMLElement>;
    var ind      = wrapEl.querySelector('.demo-tab-ind') as (HTMLElement & { _settle?: ReturnType<typeof setTimeout> }) | null;
    if (!tabBar || !tabs.length || !panels.length) return;
    var tabBarEl = tabBar;
    // Visibility is keyed off the window's position so tabs + CTA reveal only
    // once the frame is scrolled into focus, and hide again at the hero top or
    // after the frame leaves upward (scroll-gated, both directions).
    var chromeEl = (wrapEl.querySelector('.browser-chrome') as HTMLElement | null) || tabBarEl;
    var ROT_MS = 5500;
    var idx = 0;
    var timer: ReturnType<typeof setTimeout> | null = null;
    var hintTimer: ReturnType<typeof setTimeout> | null = null;
    var visible = false;
    // Panels shown during the current focus session — once all three have played
    // through, the rotation ends and the outro takes over instead of looping.
    var visited = new Set<string>();
    var auto = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var reduceMotion = !auto;
    // Curtain wipe between tabs — a sheet sweeps across while the panel swaps under it.
    var curtain = wrapEl.querySelector('.panel-curtain') as HTMLElement | null;
    var shellInner = wrapEl.querySelector('.product-shell-inner') as HTMLElement | null;
    var currentKey = tabs[idx].dataset.panel || '';
    var wiping = false;

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
    function swapPanels(key: string | undefined) {
      // Match panels/sidebar by data-panel (not index) so the DOM order of
      // panels is independent of the tab order.
      panels.forEach(function(p) { p.classList.toggle('is-active', p.dataset.panel === key); });
      sideItems.forEach(function(s) { s.classList.toggle('active', s.dataset.panel === key); });
      // The "ask" tab is a focused chat — collapse the sidebar for it.
      if (shellInner) shellInner.classList.toggle('focus-mode', key === 'ask');
      currentKey = key || '';
    }
    function runWipe(swap: () => void) {
      if (!curtain) { swap(); return; }
      if (wiping) { swap(); return; } // mid-wipe re-entry: just swap, don't stack sheets
      wiping = true;
      var sheet = curtain;
      // Close: slide the sheet in from the left until it covers the panel.
      sheet.style.transition = 'transform .26s cubic-bezier(.5,.0,.5,1)';
      sheet.style.transform = 'translateX(0)';
      setTimeout(function() {
        swap(); // swap panels while fully covered
        // Open: continue off to the right, revealing the new panel.
        sheet.style.transition = 'transform .34s cubic-bezier(.4,0,.2,1)';
        sheet.style.transform = 'translateX(100%)';
        setTimeout(function() {
          // Park back off-left for the next switch, without animating the reset.
          sheet.style.transition = 'none';
          sheet.style.transform = 'translateX(-100%)';
          void sheet.offsetWidth;
          wiping = false;
        }, 340);
      }, 260);
    }
    function activate(i: number, animate?: boolean) {
      idx = i;
      var key = tabs[i].dataset.panel;
      if (key) visited.add(key);
      tabs.forEach(function(t, j) { t.classList.toggle('is-active', j === i); });
      // Wipe only on a real, animated change; first reveal and reduced-motion swap instantly.
      if (animate !== false && !reduceMotion && key !== currentKey) {
        runWipe(function() { swapPanels(key); });
      } else {
        swapPanels(key);
      }
      moveIndicator(animate !== false);
    }
    function endDemo() {
      if (timer) { clearTimeout(timer); timer = null; }
      wrapEl.classList.add('demo-ended');
      (window as any).lucraCoachBusy = false;
    }
    function replay() {
      wrapEl.classList.remove('demo-ended');
      visited.clear();
      activate(0); // back to the first tab (chat)
      tick();
    }
    function tick() {
      if (!auto || !visible) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function() {
        // Hold on the current tab while its guided-tour pointer is still playing
        // out, so nothing is cut off mid-stream.
        if ((window as any).lucraChatBusy || (window as any).lucraCoachBusy) { tick(); return; }
        var next = (idx + 1) % tabs.length;
        // A full loop is complete once we'd wrap back to the first tab having
        // shown them all — end the demo and reveal the outro instead.
        if (next === 0 && visited.size >= tabs.length) { endDemo(); return; }
        activate(next);
        tick();
      }, ROT_MS);
    }

    tabs.forEach(function(t, i) {
      t.addEventListener('click', function() {
        // Clicking a tab never stops the demo — it just jumps there and restarts
        // the rotation countdown from the clicked tab. If the outro is up, it
        // dismisses it (the click is the user choosing to keep exploring).
        if (wrapEl.classList.contains('demo-ended')) {
          wrapEl.classList.remove('demo-ended');
          visited.clear();
        }
        activate(i);
        tick();
      });
    });
    window.addEventListener('resize', function() { moveIndicator(false); });

    var replayBtn = wrapEl.querySelector('.demo-outro-replay') as HTMLElement | null;
    if (replayBtn) replayBtn.addEventListener('click', replay);

    function setVisible(v: boolean) {
      if (v === visible) return;
      visible = v;
      wrapEl.classList.toggle('tabs-visible', v);
      if (v) {
        // Seed the cycle tracker with whatever tab is showing on entry.
        var startKey = tabs[idx].dataset.panel;
        if (startKey) visited.add(startKey);
        moveIndicator(false);
        tick();
        // Show the "switch tab" hint long enough to read, then retire it for good.
        if (!hintTimer && !wrapEl.classList.contains('hint-dismissed')) {
          hintTimer = setTimeout(function() { wrapEl.classList.add('hint-dismissed'); }, 7000);
        }
      } else {
        if (timer) clearTimeout(timer);
        timer = null;
        // Reset the hint when the demo leaves the viewport, so it shows again
        // (and re-arms its auto-hide) the next time the user scrolls back to it.
        if (hintTimer) clearTimeout(hintTimer);
        hintTimer = null;
        wrapEl.classList.remove('hint-dismissed');
        // Re-arm the outro for the next visit.
        wrapEl.classList.remove('demo-ended');
        visited.clear();
      }
    }
    function onScroll() {
      // Tabs + CTA reveal once the window is scrolled into focus, and hide again
      // at the hero top or after the window leaves upward. Not visible on load
      // (scrollY ≈ 0), so the frame reads as a calm mockup until the user scrolls.
      var rect = chromeEl.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      setVisible(window.scrollY > 60 && rect.top < vh * 0.6 && rect.bottom > vh * 0.25);
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
