import { createDemoCursor } from './cursor';
import { onPanelLive } from './panelGate';

export function initFiles(): void {
  // Files — Company / Conversation tabs (file count + total size), plus a
  // pointer-driven intro that mirrors the real app: the cursor presses "Add
  // files" (the upload dropzone unfolds), drops a file (upload → complete, a new
  // row streams into the list), then opens "Conversation Files" to show that
  // files shared in chat live in the conversation's memory.
  var panel = document.querySelector('.demo-panel[data-panel="docs"]') as HTMLElement | null;
  if (!panel) return;
  if (window.matchMedia('(max-width: 1199px)').matches) return; // files panel hidden below 1200px
  var panelEl = panel;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tabs = panelEl.querySelectorAll('.files-tab') as NodeListOf<HTMLElement>;
  var lists = panelEl.querySelectorAll('[data-flist]') as NodeListOf<HTMLElement>;
  var countEl = panelEl.querySelector('[data-files-count]') as HTMLElement | null;
  var sizeEl = panelEl.querySelector('[data-files-size]') as HTMLElement | null;
  var totals: { [key: string]: { count: string; size: string } } = {
    company: { count: '(10)', size: '4.58 MB' },
    conversation: { count: '(7)', size: '1.89 MB' },
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

  // ----- Guided tour -----
  var cur = createDemoCursor();
  var addBtn = panelEl.querySelector('[data-files-add]') as HTMLElement | null;
  var addLabel = panelEl.querySelector('[data-files-add-label]') as HTMLElement | null;
  var convTab = panelEl.querySelector('.files-tab[data-ftab="conversation"]') as HTMLElement | null;
  var companyList = panelEl.querySelector('[data-flist="company"]') as HTMLElement | null;
  var upload = panelEl.querySelector('[data-files-upload]') as HTMLElement | null;
  var dropzone = panelEl.querySelector('[data-fu-dropzone]') as HTMLElement | null;
  var statusText = panelEl.querySelector('[data-fu-status-text]') as HTMLElement | null;
  var tip1 = document.querySelector('[data-tour-tip="files-1"]') as HTMLElement | null;
  var tip2 = document.querySelector('[data-tour-tip="files-2"]') as HTMLElement | null;

  var gen = 0;
  var timers: ReturnType<typeof setTimeout>[] = [];
  function clearTimers() { timers.forEach(function(t) { clearTimeout(t); }); timers = []; }
  function wait(ms: number) { return new Promise<void>(function(res) { timers.push(setTimeout(res, ms)); }); }

  function setUploadLabel(text: string | undefined) { if (addLabel && text) addLabel.textContent = text; }
  function showDropzone() { if (upload) upload.classList.remove('is-uploading', 'is-done'); }
  function showUploadStatus(done: boolean) {
    if (!upload) return;
    upload.classList.toggle('is-uploading', !done);
    upload.classList.toggle('is-done', done);
    if (statusText) statusText.textContent = (done ? upload.dataset.done : upload.dataset.uploading) || '';
  }
  function removeAddedRow() {
    var added = panelEl.querySelector('[data-files-added]');
    if (added && added.parentNode) added.parentNode.removeChild(added);
  }
  function addRow() {
    // Clone an existing row so Astro's scoped styles (file icon sizing, layout)
    // apply — building markup via innerHTML would render unstyled, oversized SVGs.
    if (!companyList) return;
    var template = companyList.querySelector('.files-row') as HTMLElement | null;
    if (!template) return;
    var row = template.cloneNode(true) as HTMLElement;
    row.setAttribute('data-files-added', '');
    row.classList.add('is-new');
    var fname = row.querySelector('.fname') as HTMLElement | null;
    if (fname && fname.lastChild) fname.lastChild.textContent = 'Avtal_Kund_Norrsken_2026.pdf';
    var fsize = row.querySelector('.fsize') as HTMLElement | null;
    if (fsize) fsize.textContent = '1.12 MB';
    companyList.insertBefore(row, companyList.firstChild);
  }
  function resetUpload() {
    if (upload) upload.classList.remove('is-open', 'is-armed', 'is-uploading', 'is-done');
    setUploadLabel(addBtn ? addBtn.dataset.labelAdd : undefined);
  }

  async function play() {
    var myGen = ++gen;
    panelEl.scrollTop = 0;
    select('company');
    removeAddedRow();
    resetUpload();
    if (reduce || !cur.ok || !addBtn || !upload) return;
    (window as any).lucraCoachBusy = true; // hold auto-rotation during the tour
    await wait(820); if (myGen !== gen) return;
    cur.moveTo(addBtn, false);
    cur.show();
    await wait(420); if (myGen !== gen) return;
    cur.showTip(tip1, addBtn, 'below', -150, 12);
    await wait(1700); if (myGen !== gen) return;
    // Press "Add files" → the dropzone unfolds, button turns into "Cancel".
    cur.press();
    await wait(260); if (myGen !== gen) return;
    cur.hideTips();
    upload.classList.add('is-open');
    setUploadLabel(addBtn.dataset.labelCancel);
    await wait(900); if (myGen !== gen) return;
    // Move onto the dropzone and "drop" a file.
    if (dropzone) cur.moveTo(dropzone, true);
    await wait(640); if (myGen !== gen) return;
    upload.classList.add('is-armed');
    cur.press();
    await wait(360); if (myGen !== gen) return;
    upload.classList.remove('is-armed');
    showUploadStatus(false); // uploading…
    await wait(1500); if (myGen !== gen) return;
    showUploadStatus(true); // complete!
    await wait(1100); if (myGen !== gen) return;
    // Collapse, drop the new row into the list, bump the counters.
    upload.classList.remove('is-open');
    setUploadLabel(addBtn.dataset.labelAdd);
    showDropzone();
    addRow();
    if (countEl) countEl.textContent = '(11)';
    if (sizeEl) sizeEl.textContent = '5.70 MB';
    await wait(1100); if (myGen !== gen) return;
    // Open Conversation Files to show that chat-shared files live in memory.
    if (convTab) {
      cur.moveTo(convTab, true);
      await wait(560); if (myGen !== gen) return;
      cur.press();
      await wait(180); if (myGen !== gen) return;
      select('conversation');
    }
    cur.showTip(tip2, convTab || addBtn, 'below', 6, 12);
    await wait(2400); if (myGen !== gen) return;
    cur.hideTips();
    cur.hide();
    (window as any).lucraCoachBusy = false;
  }

  function stop() {
    gen++;
    clearTimers();
    cur.reset();
    removeAddedRow();
    resetUpload();
    (window as any).lucraCoachBusy = false;
    panelEl.scrollTop = 0;
    select('company');
  }

  onPanelLive(panelEl, play, stop);
}
