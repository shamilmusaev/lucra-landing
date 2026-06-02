export function initFiles(): void {
  // Files — switch between the Uploaded / Generated lists (updating the file
  // count + total size), and reset to the Uploaded tab when the panel re-enters.
  var panel = document.querySelector('.demo-panel[data-panel="docs"]') as HTMLElement | null;
  if (!panel) return;
  if (window.matchMedia('(max-width: 1199px)').matches) return; // files panel hidden below 1200px
  var panelEl = panel;
  var tabs = panelEl.querySelectorAll('.files-tab') as NodeListOf<HTMLElement>;
  var lists = panelEl.querySelectorAll('[data-flist]') as NodeListOf<HTMLElement>;
  var countEl = panelEl.querySelector('[data-files-count]') as HTMLElement | null;
  var sizeEl = panelEl.querySelector('[data-files-size]') as HTMLElement | null;
  var totals: { [key: string]: { count: string; size: string } } = {
    uploaded: { count: '(10)', size: '4.58 MB' },
    generated: { count: '(7)', size: '1.89 MB' },
  };
  function select(key: string) {
    tabs.forEach(function(tab) { tab.classList.toggle('is-active', tab.dataset.ftab === key); });
    lists.forEach(function(list) { list.hidden = list.dataset.flist !== key; });
    if (countEl && totals[key]) countEl.textContent = totals[key].count;
    if (sizeEl && totals[key]) sizeEl.textContent = totals[key].size;
  }
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() { if (tab.dataset.ftab) select(tab.dataset.ftab); });
  });
  var wasActive = panelEl.classList.contains('is-active');
  var observer = new MutationObserver(function() {
    var active = panelEl.classList.contains('is-active');
    if (active === wasActive) return;
    wasActive = active;
    if (active) { panelEl.scrollTop = 0; select('uploaded'); }
  });
  observer.observe(panelEl, { attributes: true, attributeFilter: ['class'] });
}
