import { createDemoCursor } from './cursor';
import { onPanelLive } from './panelGate';

export function initAskDoc(): void {
  // "Fråga om dokument" — a focused chat scene: the pointer drags the source
  // document into the input, then types a question and the AI answers. The
  // sidebar is collapsed by the controller while this panel is active.
  var panel = document.querySelector('.demo-panel[data-panel="ask"]') as HTMLElement | null;
  if (!panel) return;
  var panelEl = panel;
  if (window.matchMedia('(max-width: 1199px)').matches) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cur = createDemoCursor();
  var stage   = panelEl.querySelector('.askdoc-stage') as HTMLElement | null;
  var card    = panelEl.querySelector('[data-askdoc]') as HTMLElement | null;
  var input   = panelEl.querySelector('[data-askdoc-input]') as HTMLElement | null;
  var drop    = panelEl.querySelector('[data-askdoc-drop]') as HTMLElement | null;
  var typed   = panelEl.querySelector('[data-askdoc-typed]') as HTMLElement | null;
  var source  = panelEl.querySelector('[data-askdoc-source]') as HTMLElement | null;
  var thread  = panelEl.querySelector('[data-askdoc-thread]') as HTMLElement | null;
  var qTpl    = panelEl.querySelector('[data-tpl="q"]') as HTMLElement | null;
  var aiTpl   = panelEl.querySelector('[data-tpl="ai"]') as HTMLElement | null;
  var payload = document.querySelector('[data-askdoc-payload]') as HTMLElement | null;
  var tip     = document.querySelector('[data-tour-tip="ask-1"]') as HTMLElement | null;

  var QUESTION = (card && card.dataset.q) || '';
  var ANSWER   = (card && card.dataset.a) || '';

  var gen = 0;
  var timers: ReturnType<typeof setTimeout>[] = [];
  function clearTimers() { timers.forEach(function(t) { clearTimeout(t); }); timers = []; }
  function wait(ms: number) { return new Promise<void>(function(res) { timers.push(setTimeout(res, ms)); }); }

  // Type `text` into `el` char by char (mirrors the chat typing cadence).
  async function typeInto(el: HTMLElement, text: string, myGen: number) {
    for (var n = 0; n < text.length; n++) {
      var ch = text[n];
      await wait(/\s/.test(ch) ? 50 : /[.,:?]/.test(ch) ? 110 : 34);
      if (myGen !== gen) return false;
      el.textContent = text.slice(0, n + 1);
    }
    return true;
  }

  // Reveal an already-rendered answer word by word via inline opacity (inline
  // styles dodge Astro's scoped-class hashing on JS-created spans).
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
          })(span, counter.i * 55);
          counter.i++;
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1) {
        var elem = child as HTMLElement;
        if (elem.tagName === 'LI') {
          elem.style.opacity = '0';
          elem.style.transition = 'opacity .26s ease';
          (function(target: HTMLElement, delay: number) {
            timers.push(setTimeout(function() { target.style.opacity = '1'; }, delay));
          })(elem, counter.i * 55);
        }
        revealWords(child, counter);
      }
    });
  }

  function addUser(text: string) {
    if (!thread || !qTpl) return;
    var el = qTpl.cloneNode(true) as HTMLElement;
    el.removeAttribute('data-tpl');
    (el.querySelector('.qtext') as HTMLElement).textContent = text;
    thread.appendChild(el);
  }
  function addAI() {
    var el = aiTpl!.cloneNode(true) as HTMLElement;
    el.removeAttribute('data-tpl');
    var ans = el.querySelector('.askdoc-answer') as HTMLElement;
    var dots = el.querySelector('.askdoc-dots') as HTMLElement;
    dots.classList.add('show');
    thread!.appendChild(el);
    return { ans: ans, dots: dots };
  }

  function reset() {
    clearTimers();
    (window as any).lucraCoachBusy = false;
    if (stage) stage.classList.remove('show-source', 'grabbed');
    if (card) card.classList.remove('is-asked');
    if (input) input.classList.remove('is-armed', 'has-doc', 'is-typing', 'has-text');
    if (typed) typed.textContent = '';
    if (thread) thread.innerHTML = '';
    if (payload) payload.classList.remove('is-on');
    cur.reset();
    cur.carry(null);
  }

  function showFinal() {
    // Static end state for reduced motion: doc attached, question + answer shown.
    if (input) input.classList.add('has-doc', 'has-text');
    if (typed) typed.textContent = QUESTION;
    if (card) card.classList.add('is-asked');
    addUser(QUESTION);
    if (thread && aiTpl) {
      var el = aiTpl.cloneNode(true) as HTMLElement;
      el.removeAttribute('data-tpl');
      (el.querySelector('.askdoc-answer') as HTMLElement).innerHTML = ANSWER;
      thread.appendChild(el);
    }
  }

  async function play() {
    var myGen = ++gen;
    reset();
    if (reduce || !cur.ok || !stage || !input || !source || !card || !typed) { showFinal(); return; }
    (window as any).lucraCoachBusy = true;

    stage.classList.add('show-source');
    await wait(520); if (myGen !== gen) return;
    cur.moveTo(source, false); cur.show();
    await wait(420); if (myGen !== gen) return;
    cur.moveTo(source, true);
    await wait(720); if (myGen !== gen) return;
    cur.press(); // grab
    await wait(240); if (myGen !== gen) return;

    // Lift the payload out of the source and carry it to the input.
    if (payload) {
      cur.carry(payload);
      cur.moveTo(source, false); // snap payload onto the source position
      payload.classList.add('is-on');
    }
    stage.classList.add('grabbed');
    await wait(140); if (myGen !== gen) return;
    input.classList.add('is-armed');
    cur.moveTo(drop || input, true);
    await wait(820); if (myGen !== gen) return;
    cur.press(); // drop
    await wait(240); if (myGen !== gen) return;
    cur.carry(null);
    if (payload) payload.classList.remove('is-on');
    input.classList.remove('is-armed');
    input.classList.add('has-doc'); // chip in, dropzone out
    await wait(720); if (myGen !== gen) return;

    // Type the question, then send.
    cur.moveTo(input, true);
    await wait(420); if (myGen !== gen) return;
    cur.hide();
    input.classList.add('is-typing');
    if (!(await typeInto(typed, QUESTION, myGen))) return;
    await wait(440); if (myGen !== gen) return;
    input.classList.remove('is-typing');

    // Move the question into the thread and let the AI answer.
    typed.textContent = '';
    card.classList.add('is-asked');
    addUser(QUESTION);
    var ai = addAI();
    await wait(950); if (myGen !== gen) return;
    ai.dots.remove();
    ai.ans.innerHTML = ANSWER;
    var counter = { i: 0 };
    revealWords(ai.ans, counter);
    await wait(counter.i * 55 + 1500); if (myGen !== gen) return;

    // Close with one explainer tip.
    cur.show();
    cur.moveTo(card, true);
    await wait(360); if (myGen !== gen) return;
    cur.showTip(tip, input, 'below', 6, 12);
    await wait(3400); if (myGen !== gen) return;
    cur.hideTips();
    cur.hide();
    (window as any).lucraCoachBusy = false;
  }

  function stop() {
    gen++;
    reset();
  }

  onPanelLive(panelEl, play, stop);
}
