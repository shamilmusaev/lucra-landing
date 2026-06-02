import { mountOrb } from '../orb';

export function initDemoOrbs(): void {
  // The demo orbs (chat welcome + the AI Insights orb on the dashboard) are the
  // same WebGL orb as the hero, mounted as secondary instances (no load-intro,
  // no global pulse). Lazy + reduced-motion guarded, mirroring the CTA orb mount.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ric: (cb: () => void) => void =
      (window as any).requestIdleCallback
        ? (cb) => (window as any).requestIdleCallback(cb)
        : (cb) => { setTimeout(cb, 1); };
    ['chat-welcome-orb', 'dash-insights-orb'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const io = new IntersectionObserver((entries, obs) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          obs.disconnect();
          ric(() => { if (mountOrb(id, { intro: false, registerGlobalPulse: false })) el.classList.add('orb-live'); });
        }
      }, { rootMargin: '200px' });
      io.observe(el);
    });
    // Small WebGL orb on demand for chat answers (the chat IIFE lives in another
    // module). Returns a disposable handle so answer orbs are released on replay.
    (window as any).lucraMountAnswerOrb = (id: string) =>
      mountOrb(id, { intro: false, registerGlobalPulse: false, maxDpr: 1.5 });
  }
}
