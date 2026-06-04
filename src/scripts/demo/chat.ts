import { createDemoCursor } from './cursor';
import { onPanelLive } from './panelGate';

export function initChat(): void {
    // Chat scene — a self-playing multi-turn conversation. When the Chat panel
    // is active: type the first question in the welcome input → open the thread →
    // for each exchange show a thinking beat then stream the answer word by word
    // (CSS-driven fade). Follow-up questions are typed in the bottom bar. Resets
    // when the panel leaves so it replays on return.
    var scene = document.querySelector('.chat-scene[data-chat]') as HTMLElement | null;
    if (!scene) return;
    if (window.matchMedia('(max-width: 1199px)').matches) return; // chat panel hidden below 1200px
    var sceneEl = scene;
    var panel = sceneEl.closest('.demo-panel') as HTMLElement | null;
    var welcomeTyped = sceneEl.querySelector('[data-chat-typed]') as HTMLElement | null;
    var barTyped = sceneEl.querySelector('[data-chat-typed2]') as HTMLElement | null;
    var thread = sceneEl.querySelector('[data-chat-thread]') as HTMLElement | null;
    if (!panel || !welcomeTyped || !barTyped || !thread) return;
    var panelEl = panel, welcomeTypedEl = welcomeTyped, barTypedEl = barTyped, threadEl = thread;
    var uinTpl = sceneEl.querySelector('[data-tpl="uin"]') as HTMLElement | null;
    var ainTpl = sceneEl.querySelector('[data-tpl="ain"]') as HTMLElement | null;
    if (!uinTpl || !ainTpl) return;
    var uinTplEl = uinTpl, ainTplEl = ainTpl;
    var TIMES = ['09:24', '09:25', '09:27'];
    // The sidebar "live" history row that demonstrates AI title generation.
    var histLive = document.querySelector('[data-hist-live]') as HTMLElement | null;
    // Guided-tour pieces — the shared pointer picks a company in the sidebar
    // before the first question types. All live outside the chat scene.
    var cur      = createDemoCursor();
    var coWrap   = document.querySelector('.sb-company-wrap') as HTMLElement | null;
    var coTrigger= document.querySelector('[data-co-trigger]') as HTMLElement | null;
    var coPick   = document.querySelector('[data-co-pick]') as HTMLElement | null;
    var coDrop   = document.querySelector('[data-co-dropdown]') as HTMLElement | null;
    var chatInput= sceneEl.querySelector('.chat-input') as HTMLElement | null;
    var tip1     = document.querySelector('[data-tour-tip="chat-1"]') as HTMLElement | null;
    var tip2     = document.querySelector('[data-tour-tip="chat-2"]') as HTMLElement | null;

    var EXCHANGES: { q: string; a: string }[] = [];
    for (var k = 1; k <= 2; k++) {
      var q = sceneEl.dataset['q' + k], a = sceneEl.dataset['a' + k];
      if (q && a) EXCHANGES.push({ q: q, a: a });
    }
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var gen = 0;
    var timers: ReturnType<typeof setTimeout>[] = [];
    function clearTimers() { timers.forEach(function(t) { clearTimeout(t); }); timers = []; }
    function wait(ms: number) { return new Promise<void>(function(res) { timers.push(setTimeout(res, ms)); }); }
    function scrollDown() { threadEl.scrollTop = threadEl.scrollHeight; }

    // Reveal each word of the (already-rendered) answer one by one via an
    // inline opacity transition. Inline styles avoid Astro's scoped-class
    // hashing, which would not apply to these JS-created word spans.
    function revealWords(node: Node, counter: { i: number }) {
      Array.prototype.slice.call(node.childNodes).forEach(function(child: Node) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          (child.textContent || '').split(/(\s+)/).forEach(function(part: string) {
            if (part === '' || /^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var span = document.createElement('span');
            span.textContent = part;
            span.style.opacity = '0';
            span.style.transform = 'translateY(4px)';
            span.style.transition = 'opacity .24s ease, transform .24s cubic-bezier(.22,1,.36,1)';
            frag.appendChild(span);
            (function(target: HTMLElement, delay: number) {
              timers.push(setTimeout(function() { target.style.opacity = '1'; target.style.transform = 'none'; }, delay));
            })(span, counter.i * 32);
            counter.i++;
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          // Hide list items until their first word is due, so empty bullets
          // never appear ahead of the streamed text.
          var elem = child as HTMLElement;
          if (elem.tagName === 'LI') {
            elem.style.opacity = '0';
            elem.style.transition = 'opacity .26s ease';
            (function(target: HTMLElement, delay: number) {
              timers.push(setTimeout(function() { target.style.opacity = '1'; }, delay));
            })(elem, counter.i * 32);
          }
          revealWords(child, counter);
        }
      });
    }
    // Clone the hashed templates so Astro's scoped styles apply to the messages.
    function addUser(text: string, time: string) {
      var el = uinTplEl.cloneNode(true) as HTMLElement;
      el.removeAttribute('data-tpl');
      (el.querySelector('.utext') as HTMLElement).textContent = text;
      (el.querySelector('.utime') as HTMLElement).textContent = time;
      threadEl.appendChild(el);
    }
    function addAI() {
      var el = ainTplEl.cloneNode(true) as HTMLElement;
      el.removeAttribute('data-tpl');
      var ans = el.querySelector('.chat-answer') as HTMLElement;
      var dots = el.querySelector('.chat-dots') as HTMLElement;
      dots.classList.add('show');
      threadEl.appendChild(el);
      // The answer avatar stays a static CSS ring (.ain-orb::before) — no live
      // WebGL orb per answer, to keep the chat off the GPU.
      return { ans: ans, dots: dots };
    }
    function reset() {
      clearTimers();
      (window as any).lucraChatBusy = false;
      sceneEl.classList.remove('is-typing', 'is-typing2', 'is-sent');
      welcomeTypedEl.textContent = '';
      barTypedEl.textContent = '';
      threadEl.innerHTML = '';
      if (histLive) { histLive.textContent = ''; histLive.classList.remove('is-new', 'is-generating'); }
      cur.reset();
      if (coWrap) coWrap.classList.remove('is-open');
    }
    // Pointer-driven intro: glide to the company switcher, explain it, open it,
    // pick Demobolaget AB, then move to the input and hand off to typing. Returns false
    // if the scene was reset mid-way.
    async function runTour(myGen: number) {
      if (reduce || !cur.ok || !coWrap || !coTrigger || !coPick) return true;
      // The pointer orb hatches out of the big welcome orb, then flies to the
      // company switcher. Falls back to a plain fade-in if the orb is absent.
      var welcomeOrb = document.querySelector('.welcome-orb') as HTMLElement | null;
      if (welcomeOrb) {
        cur.hatch(welcomeOrb);
      } else {
        cur.moveTo(chatInput, false);
        await wait(120); if (myGen !== gen) return false;
        cur.show();
      }
      await wait(520); if (myGen !== gen) return false;
      cur.moveTo(coTrigger, true);
      await wait(520); if (myGen !== gen) return false;
      cur.showTip(tip1, coTrigger, 'below', 0, 10);
      await wait(1500); if (myGen !== gen) return false;
      cur.press();
      await wait(130); if (myGen !== gen) return false;
      cur.hideTips();
      coWrap.classList.add('is-open');
      await wait(400); if (myGen !== gen) return false;
      cur.showTip(tip2, coDrop, 'right', 12, 0);
      cur.moveTo(coPick, true);
      await wait(1500); if (myGen !== gen) return false;
      cur.press();
      await wait(150); if (myGen !== gen) return false;
      cur.hideTips();
      coWrap.classList.remove('is-open');
      await wait(360); if (myGen !== gen) return false;
      cur.moveTo(chatInput, true);
      await wait(480); if (myGen !== gen) return false;
      cur.press();
      await wait(240); if (myGen !== gen) return false;
      cur.hide();
      await wait(200); if (myGen !== gen) return false;
      return true;
    }
    function showFinal() {
      sceneEl.classList.add('is-sent');
      threadEl.innerHTML = '';
      EXCHANGES.forEach(function(ex, i) {
        addUser(ex.q, TIMES[i] || '');
        var ai = addAI();
        ai.dots.remove();
        ai.ans.innerHTML = ex.a;
      });
      if (histLive) { histLive.textContent = histLive.dataset.title || ''; histLive.classList.add('is-new'); }
    }
    // Type `text` into `el` char by char; returns false if cancelled mid-way.
    async function typeInto(el: HTMLElement, text: string, myGen: number) {
      for (var n = 0; n < text.length; n++) {
        var ch = text[n];
        await wait(/\s/.test(ch) ? 30 : /[.,:]/.test(ch) ? 70 : 20); if (myGen !== gen) return false;
        el.textContent = text.slice(0, n + 1);
      }
      return true;
    }
    async function play() {
      var myGen = ++gen;
      reset();
      if (reduce) { showFinal(); return; }
      (window as any).lucraChatBusy = true;
      await wait(450); if (myGen !== gen) return;
      if (!(await runTour(myGen))) return;
      for (var i = 0; i < EXCHANGES.length; i++) {
        var ex = EXCHANGES[i];
        if (i === 0) {
          sceneEl.classList.add('is-typing');
          if (!(await typeInto(welcomeTypedEl, ex.q, myGen))) return;
          await wait(300); if (myGen !== gen) return;
          sceneEl.classList.remove('is-typing');
          sceneEl.classList.add('is-sent');
          // The conversation opened — seed the new history row.
          if (histLive) { histLive.textContent = histLive.dataset.default || ''; histLive.classList.add('is-new'); }
        } else {
          sceneEl.classList.add('is-typing2');
          if (!(await typeInto(barTypedEl, ex.q, myGen))) return;
          await wait(280); if (myGen !== gen) return;
          sceneEl.classList.remove('is-typing2');
          barTypedEl.textContent = '';
        }
        addUser(ex.q, TIMES[i] || '');
        var ai = addAI();
        scrollDown();
        await wait(620); if (myGen !== gen) return;
        ai.dots.remove();
        ai.ans.innerHTML = ex.a;
        var counter = { i: 0 };
        revealWords(ai.ans, counter);
        scrollDown();
        await wait(counter.i * 32 + 1000); if (myGen !== gen) return;
        scrollDown();
        // After the first answer, the app names the conversation: shimmer over the
        // default label, then "type" the generated title into the history row.
        if (i === 0 && histLive) {
          histLive.classList.add('is-generating');
          await wait(600); if (myGen !== gen) return;
          histLive.classList.remove('is-generating');
          histLive.textContent = '';
          if (!(await typeInto(histLive, histLive.dataset.title || '', myGen))) return;
        }
      }
      (window as any).lucraChatBusy = false;
    }

    onPanelLive(panelEl, play, function() { gen++; reset(); });
}
