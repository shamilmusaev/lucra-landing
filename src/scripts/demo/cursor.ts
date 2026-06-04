export interface DemoCursor {
  ok: boolean;
  moveTo(el: HTMLElement | null, animate: boolean): void;
  show(): void;
  hide(): void;
  hatch(anchor: HTMLElement | null): void;
  carry(el: HTMLElement | null): void;
  press(): void;
  showTip(tip: HTMLElement | null, anchor: HTMLElement | null, side?: 'below' | 'right', dx?: number, dy?: number): void;
  hideTips(): void;
  scrollPanelTo(panel: HTMLElement | null, target: HTMLElement | null, margin?: number): void;
  reset(): void;
}

// Shared guided-tour pointer. Several panel tours (chat, dashboard) drive the
// same soft dot + explainer tips that live in `.product-shell-inner`. Positions
// are computed from getBoundingClientRect (corrected for the chrome's live
// scroll-zoom scale) so they stay correct even while a panel scrolls internally.
export function createDemoCursor(): DemoCursor {
  var root   = document.querySelector('.product-shell-inner') as HTMLElement | null;
  var cursor = document.querySelector('[data-demo-cursor]') as HTMLElement | null;
  var chrome = document.querySelector('.browser-chrome') as HTMLElement | null;
  var tips   = document.querySelectorAll('.tour-tip') as NodeListOf<HTMLElement>;
  var pressTimer: ReturnType<typeof setTimeout> | null = null;
  var hatchTimers: ReturnType<typeof setTimeout>[] = [];
  var payload: HTMLElement | null = null; // an element that rides along with the cursor (drag)

  function liveScale(): number {
    if (!chrome) return 1;
    var w = chrome.offsetWidth;
    return w ? chrome.getBoundingClientRect().width / w : 1;
  }
  function rect(el: HTMLElement) {
    var scale = liveScale();
    var rr = (root as HTMLElement).getBoundingClientRect();
    var tr = el.getBoundingClientRect();
    return {
      left: (tr.left - rr.left) / scale,
      top: (tr.top - rr.top) / scale,
      right: (tr.right - rr.left) / scale,
      bottom: (tr.bottom - rr.top) / scale,
      cx: (tr.left + tr.width / 2 - rr.left) / scale,
      cy: (tr.top + tr.height / 2 - rr.top) / scale,
    };
  }

  return {
    ok: !!(root && cursor),
    moveTo: function (el, animate) {
      if (!cursor || !root || !el) return;
      var r = rect(el);
      if (!animate) cursor.style.transition = 'none';
      cursor.style.transform = 'translate(' + r.cx + 'px,' + r.cy + 'px)';
      // A carried payload (a dragged document) rides along, offset below-right of the orb.
      if (payload) {
        if (!animate) payload.style.transition = 'none';
        payload.style.transform = 'translate(' + (r.cx + 14) + 'px,' + (r.cy + 16) + 'px)';
        if (!animate) { void payload.offsetWidth; payload.style.transition = ''; }
      }
      if (!animate) { void cursor.offsetWidth; cursor.style.transition = ''; }
    },
    show: function () { if (cursor) cursor.classList.add('is-on'); },
    hide: function () { if (cursor) cursor.classList.remove('is-on'); },
    hatch: function (anchor) {
      // Spawn the pointer orb out of a larger parent orb (the chat welcome orb):
      // snap into its centre hidden, then visibly pop out and drift down while the
      // parent recoils + ripples, so it reads as a child being released.
      if (!cursor || !root || !anchor) return;
      hatchTimers.forEach(function (t) { clearTimeout(t); }); hatchTimers = [];
      var r = rect(anchor);
      cursor.style.transition = 'none';
      cursor.style.transform = 'translate(' + r.cx + 'px,' + r.cy + 'px)';
      void cursor.offsetWidth;
      cursor.classList.add('is-on', 'is-hatching');
      anchor.classList.add('is-emitting');
      // Emerge: drift out of the orb with a slight overshoot.
      cursor.style.transition = 'transform .5s cubic-bezier(.34,1.4,.5,1)';
      cursor.style.transform = 'translate(' + r.cx + 'px,' + (r.cy + 34) + 'px)';
      hatchTimers.push(setTimeout(function () { if (cursor) cursor.style.transition = ''; }, 520));
      hatchTimers.push(setTimeout(function () { if (cursor) cursor.classList.remove('is-hatching'); }, 650));
      hatchTimers.push(setTimeout(function () { anchor.classList.remove('is-emitting'); }, 700));
    },
    carry: function (el) {
      // Attach (or release) an element that follows the cursor on subsequent moveTo.
      payload = el;
    },
    press: function () {
      if (!cursor) return;
      cursor.classList.remove('is-pressing'); void cursor.offsetWidth;
      cursor.classList.add('is-pressing');
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = setTimeout(function () { if (cursor) cursor.classList.remove('is-pressing'); }, 500);
    },
    showTip: function (tip, anchor, side, dx, dy) {
      if (!tip || !anchor || !root) return;
      var r = rect(anchor);
      var ox = dx || 0, oy = dy || 0;
      tip.dataset.side = side === 'right' ? 'right' : 'below';  // aim the pointer arrow
      var left = side === 'right' ? r.right + ox : r.left + ox;
      var top = side === 'right' ? r.top + oy : r.bottom + oy;
      // Keep the pill inside the shell so it never spills past the window edge.
      var maxLeft = root.clientWidth - tip.offsetWidth - 8;
      tip.style.left = Math.max(8, Math.min(left, maxLeft)) + 'px';
      tip.style.top = top + 'px';
      tip.classList.add('is-shown');
    },
    hideTips: function () { tips.forEach(function (t) { t.classList.remove('is-shown'); }); },
    scrollPanelTo: function (panel, target, margin) {
      if (!panel || !target) return;
      var scale = liveScale();
      var pr = panel.getBoundingClientRect();
      var tr = target.getBoundingClientRect();
      var rel = (tr.top - pr.top) / scale;
      panel.scrollTo({ top: Math.max(0, panel.scrollTop + rel - (margin || 60)), behavior: 'smooth' });
    },
    reset: function () {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      hatchTimers.forEach(function (t) { clearTimeout(t); }); hatchTimers = [];
      payload = null;
      if (cursor) { cursor.classList.remove('is-on', 'is-pressing', 'is-hatching'); }
      tips.forEach(function (t) { t.classList.remove('is-shown'); });
    },
  };
}
