// A demo panel's scripted animation (chat playback, dashboard count-up + tour,
// files tour) must run only while the panel is the active tab AND the demo
// frame is scrolled into focus. The controller marks the wrap `.tabs-visible`
// for the latter. Without the focus gate the default-active chat panel plays on
// load while the demo is still only peeking in at the bottom of the viewport.
export function onPanelLive(panel: HTMLElement, onPlay: () => void, onStop: () => void): void {
  const wrap = document.querySelector('.hero-chrome-wrap');
  const live = (): boolean =>
    panel.classList.contains('is-active') && (!wrap || wrap.classList.contains('tabs-visible'));
  let on = false;
  const sync = (): void => {
    const want = live();
    if (want === on) return;
    on = want;
    if (want) onPlay(); else onStop();
  };
  const observer = new MutationObserver(sync);
  observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  if (wrap) observer.observe(wrap, { attributes: true, attributeFilter: ['class'] });
  sync();
}
