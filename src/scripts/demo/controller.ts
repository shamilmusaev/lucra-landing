export function initController(): void {
    // Product demo — tabs reveal as the frame scrolls in, hide on scroll back up,
    // then auto-rotate continuously (chat → dashboard → files → chat …). Each tab
    // shows for a fixed duration sized to outlast its guided tour; a fill in the
    // active "bubble" counts that duration down so the viewer sees time-to-next.
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
    var compact = window.matchMedia('(max-width: 1199px)');
    // Visibility is keyed off the window's position so tabs + CTA reveal only once
    // the frame is scrolled into focus, and hide again at the hero top or after the
    // frame leaves upward (scroll-gated, both directions).
    var chromeEl = (wrapEl.querySelector('.browser-chrome') as HTMLElement | null) || tabBarEl;
    var idx = 0;
    var hintTimer: ReturnType<typeof setTimeout> | null = null;
    var ctaTimer: ReturnType<typeof setTimeout> | null = null;
    var visible = false;
    var auto = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var reduceMotion = !auto;
    // Curtain wipe between tabs — a sheet sweeps across while the panel swaps under it.
    var curtain = wrapEl.querySelector('.panel-curtain') as HTMLElement | null;
    var currentKey = tabs[idx].dataset.panel || '';
    var wiping = false;

    // Per-tab display duration (ms). Each is sized to comfortably outlast that
    // panel's guided tour, so the tour always finishes before the switch. The
    // active bubble's fill counts this down, showing the viewer time-to-next.
    var indFill = wrapEl.querySelector('.demo-tab-ind-fill') as HTMLElement | null;
    var HOLD: { [key: string]: number } = { chat: 17000, dashboard: 9500, docs: 10500 };
    var DEFAULT_HOLD = 10000;
    var holdStart = 0;
    var holdRaf: number | null = null;
    function setFill(progress: number) {
      if (indFill) indFill.style.width = Math.max(0, Math.min(1, progress)) * 100 + '%';
    }
    function stopHold() {
      if (holdRaf) { cancelAnimationFrame(holdRaf); holdRaf = null; }
      holdStart = 0;
      setFill(0);
    }
    function holdTick(now: number) {
      if (!auto || !visible) { holdRaf = null; return; }
      if (holdStart === 0) holdStart = now;
      var total = HOLD[currentKey] || DEFAULT_HOLD;
      var progress = (now - holdStart) / total;
      setFill(progress);
      if (progress >= 1) { activate((idx + 1) % tabs.length); return; } // loop; activate restarts the hold
      holdRaf = requestAnimationFrame(holdTick);
    }
    function startHold() {
      if (!auto || !visible) return;
      holdStart = 0;
      if (holdRaf) cancelAnimationFrame(holdRaf);
      holdRaf = requestAnimationFrame(holdTick);
    }

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
      tabs.forEach(function(t, j) { t.classList.toggle('is-active', j === i); });
      // Wipe only on a real, animated change; first reveal and reduced-motion swap instantly.
      if (animate !== false && !reduceMotion && key !== currentKey) {
        runWipe(function() { swapPanels(key); });
      } else {
        swapPanels(key);
      }
      moveIndicator(animate !== false);
      startHold(); // (re)start this tab's countdown; no-op while !auto or !visible
    }

    function setStaticPreviewState() {
      visible = false;
      stopHold();
      if (hintTimer) clearTimeout(hintTimer);
      hintTimer = null;
      if (ctaTimer) clearTimeout(ctaTimer);
      ctaTimer = null;
      wrapEl.classList.remove('tabs-visible', 'hint-dismissed');
      if (ind) ind.classList.remove('ready');
      if (curtain) {
        curtain.style.transition = 'none';
        curtain.style.transform = 'translateX(-100%)';
      }
      wiping = false;
      var dashIdx = Array.prototype.findIndex.call(tabs, function (t: HTMLElement) { return t.dataset.panel === 'dashboard'; });
      if (dashIdx >= 0) activate(dashIdx, false);
      wrapEl.querySelectorAll<HTMLElement>('.metric .num[data-count]').forEach(function (element) {
        element.textContent = element.dataset.count || element.textContent;
      });
    }

    tabs.forEach(function(t, i) {
      t.addEventListener('click', function() {
        var wasCurrent = tabs[i].dataset.panel === currentKey;
        activate(i);
        // Clicking the already-active tab can't change is-active, so the panel-live
        // observer won't replay its tour — ask the panel to replay it explicitly.
        if (wasCurrent) {
          var p = Array.prototype.find.call(panels, function(pp: HTMLElement) { return pp.dataset.panel === currentKey; }) as HTMLElement | undefined;
          if (p) p.dispatchEvent(new Event('lucra:replay'));
        }
      });
    });
    window.addEventListener('resize', function() {
      if (compact.matches) { setStaticPreviewState(); return; }
      moveIndicator(false);
      onScroll();
    });

    function setVisible(v: boolean) {
      if (compact.matches) v = false;
      if (v === visible) return;
      visible = v;
      wrapEl.classList.toggle('tabs-visible', v);
      if (v) {
        moveIndicator(false);
        startHold();
        // Show the "switch tab" hint long enough to read, then retire it for good.
        if (!hintTimer && !wrapEl.classList.contains('hint-dismissed')) {
          hintTimer = setTimeout(function() { wrapEl.classList.add('hint-dismissed'); }, 7000);
        }
        // Reveal the bottom CTA band only after the viewer has dwelt in the demo
        // for a few seconds — not the instant the frame scrolls into focus.
        if (!ctaTimer && !wrapEl.classList.contains('cta-band-in')) {
          ctaTimer = setTimeout(function() { wrapEl.classList.add('cta-band-in'); }, 2000);
        }
      } else {
        stopHold();
        // Reset the hint when the demo leaves the viewport, so it shows again
        // (and re-arms its auto-hide) the next time the user scrolls back to it.
        if (hintTimer) clearTimeout(hintTimer);
        hintTimer = null;
        wrapEl.classList.remove('hint-dismissed');
        // Cancel the dwell timer only while still pending — once the band has
        // appeared it stays for good (no re-arming, no hide on scroll away).
        if (ctaTimer) clearTimeout(ctaTimer);
        ctaTimer = null;
      }
    }
    function onScroll() {
      if (compact.matches) {
        setStaticPreviewState();
        return;
      }
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
