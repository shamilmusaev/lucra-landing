import { createDemoCursor } from './cursor';
import { onPanelLive } from './panelGate';

export function initDashboard(): void {
  // Dashboard — count the metric values up from zero, then run a pointer-driven
  // walkthrough: AI Insights opens collapsed, the pointer expands and explains
  // it, then scrolls down narrating the metrics and the income/cost chart.
  var panel = document.querySelector('.demo-panel[data-panel="dashboard"]') as HTMLElement | null;
  if (!panel) return;
  var panelEl = panel;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var numbers = panelEl.querySelectorAll('.metric .num[data-count]') as NodeListOf<HTMLElement>;
  // Compact (<1200px): the dashboard is shown statically, so render the final
  // figures up front and skip the activation-driven count-up + tour entirely.
  if (window.matchMedia('(max-width: 1199px)').matches) {
    numbers.forEach(function(element) { element.textContent = element.dataset.count || element.textContent; });
    return;
  }

  var cur = createDemoCursor();
  var aiInsights = panelEl.querySelector('.ai-insights') as HTMLElement | null;
  var aiHead     = panelEl.querySelector('.ai-head') as HTMLElement | null;
  var aiTitles   = panelEl.querySelector('.ai-titles') as HTMLElement | null;
  var firstMetric= panelEl.querySelector('.metric') as HTMLElement | null;
  var chartHead  = panelEl.querySelector('.chart-card-head') as HTMLElement | null;
  var tip1 = document.querySelector('[data-tour-tip="dash-1"]') as HTMLElement | null;
  var tip2 = document.querySelector('[data-tour-tip="dash-2"]') as HTMLElement | null;
  var tip3 = document.querySelector('[data-tour-tip="dash-3"]') as HTMLElement | null;

  var gen = 0;
  var timers: ReturnType<typeof setTimeout>[] = [];
  var rafIds: number[] = [];
  function clearTimers() {
    timers.forEach(function(t) { clearTimeout(t); }); timers = [];
    rafIds.forEach(function(id) { cancelAnimationFrame(id); }); rafIds = [];
  }
  function wait(ms: number) { return new Promise<void>(function(res) { timers.push(setTimeout(res, ms)); }); }

  function countUp() {
    numbers.forEach(function(element, index) {
      var target = parseInt(element.dataset.count || '0', 10);
      if (reduce) { element.textContent = String(target); return; }
      // Stagger each card's count-up by index so the dashboard powers on
      // left-to-right / top-to-bottom rather than flashing all at once.
      timers.push(setTimeout(function() {
        var startTime = performance.now();
        var duration = 620;
        function step(now: number) {
          var progress = Math.min(1, (now - startTime) / duration);
          var eased = 1 - Math.pow(1 - progress, 3);
          element.textContent = String(Math.round(target * eased));
          if (progress < 1) rafIds.push(requestAnimationFrame(step));
        }
        rafIds.push(requestAnimationFrame(step));
      }, index * 70));
    });
  }

  async function play() {
    var myGen = ++gen;
    panelEl.scrollTop = 0;
    if (reduce || !cur.ok || !aiInsights || !aiHead) { countUp(); return; }
    aiInsights.classList.add('is-collapsed');
    countUp();
    await wait(520); if (myGen !== gen) return;
    cur.moveTo(aiHead, false);
    cur.show();
    await wait(300); if (myGen !== gen) return;
    // Anchor to the right of the title so the tip never overlaps the list that
    // unfolds below the header once Insights expands.
    cur.showTip(tip1, aiTitles || aiHead, 'right', 14, 0);
    await wait(1500); if (myGen !== gen) return;
    cur.press();
    await wait(150); if (myGen !== gen) return;
    // Hide the tip as the list unfolds, so it never overlaps the rows below.
    cur.hideTips();
    aiInsights.classList.remove('is-collapsed');
    await wait(900); if (myGen !== gen) return;
    cur.scrollPanelTo(panelEl, firstMetric, 80);
    await wait(480); if (myGen !== gen) return;
    cur.moveTo(firstMetric, true);
    await wait(260); if (myGen !== gen) return;
    cur.showTip(tip2, firstMetric, 'below', 0, 10);
    await wait(1500); if (myGen !== gen) return;
    cur.hideTips();
    cur.scrollPanelTo(panelEl, chartHead, 80);
    await wait(480); if (myGen !== gen) return;
    cur.moveTo(chartHead, true);
    await wait(260); if (myGen !== gen) return;
    cur.showTip(tip3, chartHead, 'below', 0, 10);
    await wait(1500); if (myGen !== gen) return;
    cur.hideTips();
    cur.hide();
  }

  function stop() {
    gen++;
    clearTimers();
    cur.reset();
    if (aiInsights) aiInsights.classList.remove('is-collapsed');
    panelEl.scrollTop = 0;
  }

  onPanelLive(panelEl, play, stop);
}
