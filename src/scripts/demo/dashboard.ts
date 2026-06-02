export function initDashboard(): void {
  // Dashboard — count the metric values up from zero and reset the scroll to the
  // top each time the panel becomes active (sparkline / chart draw is CSS-driven).
  var panel = document.querySelector('.demo-panel[data-panel="dashboard"]') as HTMLElement | null;
  if (!panel) return;
  var panelEl = panel;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var numbers = panelEl.querySelectorAll('.metric .num[data-count]') as NodeListOf<HTMLElement>;
  // Compact (<1200px): the dashboard is shown statically, so render the final
  // figures up front and skip the activation-driven count-up entirely.
  if (window.matchMedia('(max-width: 1199px)').matches) {
    numbers.forEach(function(element) { element.textContent = element.dataset.count || element.textContent; });
    return;
  }
  function countUp() {
    numbers.forEach(function(element, index) {
      var target = parseInt(element.dataset.count || '0', 10);
      if (reduce) { element.textContent = String(target); return; }
      // Stagger each card's count-up by index so the dashboard powers on
      // left-to-right / top-to-bottom rather than flashing all at once.
      setTimeout(function() {
        var startTime = performance.now();
        var duration = 950;
        function step(now: number) {
          var progress = Math.min(1, (now - startTime) / duration);
          var eased = 1 - Math.pow(1 - progress, 3);
          element.textContent = String(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }, index * 70);
    });
  }
  function onActivate() { panelEl.scrollTop = 0; countUp(); }
  var wasActive = panelEl.classList.contains('is-active');
  var observer = new MutationObserver(function() {
    var active = panelEl.classList.contains('is-active');
    if (active === wasActive) return;
    wasActive = active;
    if (active) onActivate();
  });
  observer.observe(panelEl, { attributes: true, attributeFilter: ['class'] });
  if (wasActive) onActivate();
}
