export interface Coach {
  play(key: string | undefined, isVisible: () => boolean): void;
  clear(): void;
}

export function createCoach(wrapEl: HTMLElement, chromeEl: HTMLElement | null): Coach {
  var coachReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coachLayers = wrapEl.querySelectorAll('.coach-layer[data-coach-group]') as NodeListOf<HTMLElement>;
  var coachTimers: ReturnType<typeof setTimeout>[] = [];
  var coachActive: string | null = null;

  function liveScale(): number {
    if (!chromeEl) return 1;
    var w = chromeEl.offsetWidth;
    return w ? chromeEl.getBoundingClientRect().width / w : 1;
  }
  function positionCoach(coach: HTMLElement, target: Element) {
    if (!chromeEl) return;
    var scale = liveScale();
    var cr = chromeEl.getBoundingClientRect();
    var tr = target.getBoundingClientRect();
    var side = coach.dataset.side || 'bottom';
    var pillH = coach.offsetHeight, halfW = coach.offsetWidth / 2;
    var localW = cr.width / scale;
    var cx = (tr.left + tr.width / 2 - cr.left) / scale;
    cx = Math.max(halfW + 12, Math.min(localW - halfW - 12, cx));
    var top = side === 'top'
      ? (tr.top - cr.top) / scale - pillH - 11
      : (tr.bottom - cr.top) / scale + 11;
    coach.style.left = cx + 'px';
    coach.style.top = Math.max(8, top) + 'px';
  }
  function clearCoaches() {
    coachTimers.forEach(function(t) { clearTimeout(t); });
    coachTimers = [];
    coachLayers.forEach(function(layer) {
      layer.querySelectorAll('.coach').forEach(function(c) { (c as HTMLElement).classList.remove('is-shown'); });
    });
    (window as any).lucraCoachBusy = false;
    coachActive = null;
  }
  function bringIntoView(panel: HTMLElement | null, target: Element) {
    if (!panel || panel.scrollHeight <= panel.clientHeight + 4) return;
    var scale = liveScale();
    var pr = panel.getBoundingClientRect();
    var tr = target.getBoundingClientRect();
    var relTop = (tr.top - pr.top) / scale;
    // Only scroll when the target's TOP edge isn't already on screen with a bit
    // of breathing room. Requiring just the top (not the whole element) means a
    // tall card like AI Insights won't drag the dashboard header ("Senast
    // synkad" etc.) out of view the moment the panel opens.
    var minVisible = 96;
    if (relTop >= 12 && relTop <= panel.clientHeight - minVisible) return;
    var top = Math.max(0, panel.scrollTop + relTop - 70);
    // Smoothly glide the panel to the next callout target instead of jumping —
    // an abrupt scrollTop set reads as janky for a product demo.
    panel.scrollTo({ top: top, behavior: coachReduce ? 'auto' : 'smooth' });
  }
  function playCoaches(key: string | undefined, isVisible: () => boolean) {
    clearCoaches();
    if (!isVisible() || !key) return;
    var layer = wrapEl.querySelector('.coach-layer[data-coach-group="' + key + '"]') as HTMLElement | null;
    if (!layer) return;
    var steps = Array.prototype.slice.call(layer.querySelectorAll('.coach')) as HTMLElement[];
    if (!steps.length) return;
    coachActive = key;
    (window as any).lucraCoachBusy = true;
    var panel = wrapEl.querySelector('.demo-panel[data-panel="' + key + '"]') as HTMLElement | null;
    var maxStep = coachReduce ? 1 : steps.length;
    var dwell = 2300;
    steps.slice(0, maxStep).forEach(function(coach, stepIdx) {
      coachTimers.push(setTimeout(function() {
        if (coachActive !== key) return;
        var target = (panel && panel.querySelector(coach.dataset.target || '')) || wrapEl.querySelector(coach.dataset.target || '');
        if (!target) return;
        // One callout at a time: hide the previous, scroll the next target into
        // view, then place + reveal — a guided tour that never orphans a pill.
        steps.forEach(function(s) { s.classList.remove('is-shown'); });
        bringIntoView(panel, target);
        coachTimers.push(setTimeout(function() {
          if (coachActive !== key) return;
          positionCoach(coach, target as Element);
          coach.classList.add('is-shown');
          if (stepIdx === maxStep - 1) {
            coachTimers.push(setTimeout(function() { (window as any).lucraCoachBusy = false; }, 2000));
          }
        }, 90));
      }, 1000 + stepIdx * dwell));
    });
  }

  (window as any).lucraClearCoaches = clearCoaches;
  return {
    play: function(key, isVisible) { playCoaches(key, isVisible); },
    clear: clearCoaches,
  };
}
