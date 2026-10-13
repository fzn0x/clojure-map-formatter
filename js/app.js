(function () {
  'use strict';

  const E = window.EDN;
  const EXAMPLES = window.EXAMPLES;
  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------- elements

  const ta = $('input');
  const inPre = $('in-pre');
  const inHl = $('in-hl');
  const outScroll = $('out-scroll');
  const outGrid = outScroll.querySelector('.out-grid');
  const outCode = $('out');
  const gut = $('gut');
  const emptyEl = $('empty');
  const sign = $('sign');
  const signGo = $('sign-go');
  const signUse = $('sign-icon').querySelector('use');
  const signBody = sign.querySelector('.sign-body');
  const signPath = $('sign-path');
  const signMeta = $('sign-meta');
  const signCopy = $('sign-copy');
  const signConvert = $('sign-convert');
  const signStat = $('sign-stat');
  const statBig = $('stat-big');
  const statSmall = $('stat-small');
  const stState = $('st-state');
  const stPos = $('st-pos');
  const stBytes = $('st-bytes');
  const exList = $('examples');
  const optAlign = $('opt-align');
  const optWidth = $('opt-width');
  const optSort = $('opt-sort');
  const optNested = $('opt-nested');
  const optIndent = $('opt-indent');
  const fileInput = $('file');
  const dropEl = $('drop');
  const paneIn = document.querySelector('.pane-in');
  const toastEl = $('toast');
  const toastText = $('toast-text');
  const toastUse = $('toast-icon').querySelector('use');
  const toastAction = $('toast-action');
  const announceEl = $('announce');

  const STORE = 'cmf:v1';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stacked = window.matchMedia('(max-width: 820px)');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const PASTE_KEY = isMac ? '⌘V' : 'Ctrl+V';
  const COPY_KEY = isMac ? '⌘C' : 'Ctrl+C';

  const state = {
    mode: 'beautify',
    align: true,
    indent: 2,
    width: 'auto',
    sortKeys: false,
    nested: 'beside',
    autoWidth: 80,
    fileName: null,   // name of the opened file, for downloads
    fromJson: false,  // the input is JSON, shown as EDN
    jsonEdn: null,    // that EDN text
    exampleId: null,
    parsed: null,     // last successful parse of the current document
    result: null,     // printer output for `parsed`
    error: null,
    excerpt: false,   // output shows the error excerpt instead of stale output
    active: null,     // node pinned by the input caret or an output click
    hover: null,      // node under the pointer in the output
    lines: null,      // node id -> [first, last] output line
    marked: [],
    markedLines: [],
    inBytes: 0,
    outBytes: 0,
  };

  // ---------------------------------------------------------------- helpers

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nf = new Intl.NumberFormat('en');
  const encoder = new TextEncoder();
  const byteLen = (s) => encoder.encode(s).length;
  const fmtBytes = (n) => n < 100000 ? `${nf.format(n)} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
  const plural = (n, one, many) => `${nf.format(n)} ${n === 1 ? one : many}`;
  const isWs = (c) => c === undefined || c === ' ' || c === ',' || c === '\n' || c === '\t' || c === '\r';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function lineIndexAt(src, offset) {
    let n = 0;
    for (let i = 0; i < offset && i < src.length; i++) if (src.charCodeAt(i) === 10) n++;
    return n;
  }

  // ---------------------------------------------------------------- storage

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch (e) { return null; }
  }
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify({
          input: ta.value.length <= 400000 ? ta.value : '',
          exampleId: state.exampleId,
          mode: state.mode, align: state.align, indent: state.indent, width: state.width, sortKeys: state.sortKeys,
          nested: state.nested,
        }));
      } catch (e) { /* storage unavailable: the page still works */ }
    }, 300);
  }

  // ---------------------------------------------------------------- examples

  function renderExamples() {
    exList.innerHTML = EXAMPLES.map((ex) => `
      <li><button class="ex" type="button" data-id="${ex.id}" aria-pressed="false">
        <span class="ex-code" aria-hidden="true">${ex.icon ? `<svg><use href="#i-${ex.icon}"/></svg>` : esc(ex.code)}</span>
        <span class="ex-title">${esc(ex.title)}</span>
        <span class="ex-note">${esc(ex.note)}</span>
      </button></li>`).join('');
  }

  function markExamples() {
    for (const b of exList.querySelectorAll('.ex')) b.setAttribute('aria-pressed', String(b.dataset.id === state.exampleId));
  }

  function loadExample(id) {
    const ex = EXAMPLES.find((x) => x.id === id);
    if (!ex) return;
    setInput(ex.src);
    state.exampleId = id;
    markExamples();
    const at = ex.focus ? ex.src.indexOf(ex.focus) : -1;
    if (at >= 0) ta.setSelectionRange(at, at);
    run();
  }

  exList.addEventListener('click', (e) => {
    const b = e.target.closest('.ex');
    if (b) loadExample(b.dataset.id);
  });

  // Replace the whole document: drop the previous parse so nothing stale shows.
  function setInput(text, fileName) {
    ta.value = text;
    state.fileName = fileName || null;
    state.fromJson = false;
    ta.setSelectionRange(0, 0);
    ta.scrollTop = 0;
    state.exampleId = null;
    state.parsed = null;
    state.result = null;
    state.active = null;
    state.hover = null;
    outScroll.scrollTop = 0;
    outScroll.scrollLeft = 0;
    markExamples();
    renderInput();
  }

  // ---------------------------------------------------------------- options

  const beautifyOnly = [optAlign.closest('.opt'), optNested, optIndent, optWidth.closest('.opt')];

  function syncControls() {
    for (const r of document.querySelectorAll('input[name="mode"]')) r.checked = r.value === state.mode;
    for (const r of document.querySelectorAll('input[name="indent"]')) r.checked = +r.value === state.indent;
    for (const r of document.querySelectorAll('input[name="nested"]')) r.checked = r.value === state.nested;
    optAlign.checked = state.align;
    optSort.checked = state.sortKeys;
    optWidth.value = String(state.width);
    const off = state.mode === 'minify';
    for (const el of beautifyOnly) {
      el.classList.toggle('is-off', off);
      for (const input of el.querySelectorAll('input, select')) input.disabled = off;
    }
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    state.mode = mode;
    syncControls();
    outScroll.scrollTop = 0;
    outScroll.scrollLeft = 0;
    run();
  }

  for (const r of document.querySelectorAll('input[name="mode"]')) r.addEventListener('change', () => setMode(r.value));
  for (const r of document.querySelectorAll('input[name="indent"]')) r.addEventListener('change', () => { state.indent = +r.value; run(); });
  for (const r of document.querySelectorAll('input[name="nested"]')) r.addEventListener('change', () => { state.nested = r.value; run(); });
  optAlign.addEventListener('change', () => { state.align = optAlign.checked; run(); });
  optSort.addEventListener('change', () => { state.sortKeys = optSort.checked; run(); });
  optWidth.addEventListener('change', () => {
    state.width = optWidth.value === 'auto' ? 'auto' : +optWidth.value;
    run();
  });

  // "Fit" measures how many code columns the output pane shows.
  let charW = 8.4;
  function measureChar() {
    const probe = document.createElement('pre');
    probe.className = 'out';
    probe.style.cssText = 'position:absolute;visibility:hidden;padding:0;margin:0;left:-9999px;top:0;white-space:pre';
    probe.textContent = '0'.repeat(200);
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width / 200;
    probe.remove();
    if (w > 0) charW = w;
  }
  const outPre = $('out-pre');
  function fitWidth() {
    measureChar();
    const cs = getComputedStyle(outPre);
    const avail = outScroll.clientWidth - gut.offsetWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
    return clamp(Math.floor(avail / charW), 30, 160);
  }
  function engineOpts() {
    return {
      width: state.width === 'auto' ? state.autoWidth : state.width,
      indent: state.indent,
      align: state.align,
      sortKeys: state.sortKeys,
      nested: state.nested,
    };
  }

  // ---------------------------------------------------------------- pipeline

  let runTimer = 0;
  let pending = false;
  let excerptTimer = 0;

  function schedule() {
    pending = true;
    clearTimeout(runTimer);
    runTimer = setTimeout(run, ta.value.length > 60000 ? 260 : 60);
  }

  function run() {
    pending = false;
    clearTimeout(runTimer);
    clearTimeout(excerptTimer);
    const src = ta.value;
    let parsed = null;
    let error = null;
    state.fromJson = false;
    try {
      parsed = E.parse(src);
    } catch (e) {
      if (e && e.name === 'EdnError') error = e;
      else { console.error(e); error = { message: `Unexpected failure: ${e && e.message}`, offset: 0, line: 1, col: 1 }; }
    }
    // Not EDN but valid JSON: show it as EDN and offer to keep that.
    if (error && E.looksLikeJson(src)) {
      try {
        const edn = E.jsonToEdn(src);
        parsed = E.parse(edn);
        state.fromJson = true;
        state.jsonEdn = edn;
        error = null;
      } catch (e) { /* keep the EDN error */ }
    }
    state.error = error;
    state.inBytes = byteLen(src);
    if (state.width === 'auto') state.autoWidth = fitWidth();

    if (parsed) {
      state.parsed = parsed;
      state.excerpt = false;
      state.result = state.mode === 'minify' ? E.minify(parsed.forms, engineOpts()) : E.beautify(parsed.forms, engineOpts());
      state.outBytes = byteLen(state.result.text);
      renderOutput();
      state.active = null;
      state.hover = null;
      resolveCaret();
    } else if (state.parsed && state.result) {
      // Mid-edit: keep the last good output, dimmed, and show the excerpt
      // once typing settles.
      outGrid.classList.add('stale');
      clearMarks();
      excerptTimer = setTimeout(showExcerpt, 1400);
    } else {
      showExcerpt();
    }

    emptyEl.hidden = !(parsed && parsed.forms.length === 0);
    renderInput();
    renderStatus();
    updateSign(true);
    announceError();
    save();
  }

  function showExcerpt() {
    if (!state.error) return;
    state.excerpt = true;
    state.lines = null;
    clearMarks();
    renderErrorExcerpt(state.error);
    updateSign(false);
  }

  // ---------------------------------------------------------------- output

  function renderOutput() {
    const r = state.result;
    outGrid.classList.toggle('wrap', state.mode === 'minify');
    outGrid.classList.remove('stale');
    const lines = new Map();
    const parts = ['<div class="l">'];
    let line = 0;
    for (const t of r.tokens) {
      if (t.c === null) {
        if (t.s.indexOf('\n') === -1) { parts.push(t.s); continue; }
        const segs = t.s.split('\n');
        for (let k = 0; k < segs.length; k++) {
          if (k) { parts.push('</div><div class="l">'); line++; }
          parts.push(segs[k]);
        }
        continue;
      }
      let rec = lines.get(t.id);
      if (!rec) { rec = [line, line]; lines.set(t.id, rec); }
      const segs = esc(t.s).split('\n');
      for (let k = 0; k < segs.length; k++) {
        if (k) { parts.push('</div><div class="l">'); line++; }
        if (segs[k]) parts.push(`<span class="${t.c}" data-i="${t.id}">${segs[k]}</span>`);
      }
      rec[1] = line;
    }
    parts.push('</div>');
    outCode.innerHTML = parts.join('');
    const count = r.text ? line + 1 : 0;
    let g = '';
    for (let i = 1; i <= count; i++) g += `<div>${i}</div>`;
    gut.innerHTML = g;
    state.lines = lines;
    state.lineCount = count;
    state.marked = [];
    state.markedLines = [];
    requestAnimationFrame(updateEdgeCue);
  }

  function renderErrorExcerpt(err) {
    outGrid.classList.remove('wrap', 'stale');
    const lines = ta.value.split('\n');
    const L = clamp(err.line - 1, 0, lines.length - 1);
    const from = Math.max(0, L - 2);
    const to = Math.min(lines.length - 1, L + 2);
    let code = '';
    let g = '';
    for (let i = from; i <= to; i++) {
      let text = lines[i];
      let caretCol = err.col - 1;
      if (text.length > 110) {
        // keep a window around the error on very long lines
        const start = i === L ? Math.max(0, caretCol - 50) : 0;
        text = (start ? '…' : '') + text.slice(start, start + 100) + (text.length > start + 100 ? '…' : '');
        if (i === L) caretCol = caretCol - start + (start ? 1 : 0);
      }
      code += `<div class="l${i === L ? ' xl' : ''}">${esc(text)}</div>`;
      g += `<div${i === L ? ' class="bad-ln"' : ''}>${i + 1}</div>`;
      if (i === L) {
        code += `<div class="l xc">${' '.repeat(Math.max(0, caretCol))}<span class="xcaret">^</span> <span class="xmsg">here</span></div>`;
        g += '<div></div>';
      }
    }
    outCode.innerHTML = code;
    gut.innerHTML = g;
    requestAnimationFrame(updateEdgeCue);
  }

  // Lines an output node covers, wrappers included.
  function rangeOf(node) {
    const L = state.lines;
    if (!L) return null;
    const first = L.get(node.id);
    if (!first) return null;
    let last = first[1];
    let n = node;
    while (n.t === 'tagged' || n.t === 'meta' || n.t === 'prefix') {
      n = n.form;
      const r = L.get(n.id);
      if (r) last = Math.max(last, r[1]);
    }
    return [first[0], last];
  }

  function clearMarks() {
    for (const el of state.marked) el.classList.remove('on');
    const gl = gut.children;
    for (const i of state.markedLines) if (gl[i]) gl[i].classList.remove('rt');
    state.marked = [];
    state.markedLines = [];
  }

  function mark(node) {
    clearMarks();
    if (!node || state.error || !state.lines) return;
    const ids = [node.id];
    let n = node;
    while (n.t === 'tagged' || n.t === 'meta' || n.t === 'prefix') {
      if (n.t === 'meta') ids.push(n.meta.id);
      n = n.form;
      ids.push(n.id);
    }
    for (const id of ids) {
      for (const el of outCode.querySelectorAll(`[data-i="${id}"]`)) {
        el.classList.add('on');
        state.marked.push(el);
      }
    }
    if (state.mode === 'minify') return;
    const r = rangeOf(node);
    if (!r) return;
    const gl = gut.children;
    const end = Math.min(r[1], r[0] + 5000);
    for (let i = r[0]; i <= end; i++) {
      if (gl[i]) { gl[i].classList.add('rt'); state.markedLines.push(i); }
    }
  }

  function firstElOf(node) {
    return node ? outCode.querySelector(`[data-i="${node.id}"]`) : null;
  }

  // Where the node sits relative to the visible output. Arrows lock to an
  // edge: up and down point past the panel, right points into the line.
  function directionOf(node) {
    const el = firstElOf(node);
    if (!el) return 'right';
    const box = outScroll.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.bottom < box.top + 6) return 'up';
    if (r.top > box.bottom - 6) return 'down';
    return 'right';
  }

  function scrollOutputTo(node) {
    const el = firstElOf(node);
    if (!el) return;
    const box = outScroll.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const top = outScroll.scrollTop + (r.top - box.top) - box.height / 3;
    const left = r.left - box.left < 60 || r.right > box.right ? Math.max(0, outScroll.scrollLeft + (r.left - box.left) - 80) : outScroll.scrollLeft;
    outScroll.scrollTo({ top: Math.max(0, top), left, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    outScroll.classList.remove('flash');
    void outScroll.offsetWidth;
    outScroll.classList.add('flash');
  }

  outCode.addEventListener('mouseover', (e) => {
    if (state.error || !state.parsed) return;
    const t = e.target.closest('[data-i]');
    const node = t ? state.parsed.nodes[+t.dataset.i] : null;
    if (!node || node === state.hover) return;
    state.hover = node;
    queueSign();
  });
  outScroll.addEventListener('mouseleave', () => {
    if (!state.hover) return;
    state.hover = null;
    queueSign();
  });
  outCode.addEventListener('click', (e) => {
    if (state.error || !state.parsed) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString()) return; // the visitor is selecting text
    const t = e.target.closest('[data-i]');
    if (!t) return;
    pin(state.parsed.nodes[+t.dataset.i], { scrollInput: true });
  });

  // An arrow on the right edge while output continues past it.
  const edgeCue = $('edge-cue');
  function updateEdgeCue() {
    edgeCue.hidden = !(outScroll.scrollWidth - outScroll.scrollLeft - outScroll.clientWidth > 2);
  }
  edgeCue.addEventListener('click', () => {
    outScroll.scrollBy({ left: outScroll.clientWidth * 0.6, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });

  let scrollRaf = 0;
  outScroll.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; updateArrow(); updateEdgeCue(); });
  }, { passive: true });

  // ---------------------------------------------------------------- input editor

  let inTokens = null;
  let inTokensSrc = null;
  const PLAIN_LIMIT = 200000;

  function renderInput() {
    const src = ta.value;
    const plain = src.length > PLAIN_LIMIT;
    ta.classList.toggle('plain', plain);
    if (plain) { inHl.textContent = ''; return; }
    if (src !== inTokensSrc) { inTokens = E.tokenize(src); inTokensSrc = src; }
    const band = state.active && !state.error && !pending && !state.fromJson && src.length <= 120000 ? [state.active.start, state.active.end] : null;
    const err = state.error;
    const errOff = err ? Math.min(err.offset, src.length) : -1;
    const errLine = err ? err.line - 1 : -1;
    const parts = [`<div class="l${errLine === 0 ? ' el' : ''}">`];
    let line = 0;
    let off = 0;
    for (const t of inTokens) {
      const s = t.s;
      const start = off;
      off += s.length;
      let cls = t.c || '';
      if (band && start >= band[0] && off <= band[1]) cls += ' on';
      if (err && t.c && errOff >= start && errOff < off) cls += ' err';
      cls = cls.trim();
      if (s.indexOf('\n') === -1) {
        parts.push(cls ? `<span class="${cls}">${esc(s)}</span>` : esc(s));
        continue;
      }
      const segs = s.split('\n');
      for (let k = 0; k < segs.length; k++) {
        if (k) { line++; parts.push(`</div><div class="l${line === errLine ? ' el' : ''}">`); }
        if (segs[k]) parts.push(cls ? `<span class="${cls}">${esc(segs[k])}</span>` : esc(segs[k]));
      }
    }
    parts.push('</div>');
    inHl.innerHTML = parts.join('');
    syncScroll();
  }

  function syncScroll() {
    inPre.scrollTop = ta.scrollTop;
    inPre.scrollLeft = ta.scrollLeft;
  }
  ta.addEventListener('scroll', syncScroll, { passive: true });

  ta.addEventListener('input', () => {
    if (state.exampleId) {
      const ex = EXAMPLES.find((x) => x.id === state.exampleId);
      if (!ex || ex.src !== ta.value) { state.exampleId = null; markExamples(); }
    }
    state.active = null;
    pending = true;
    renderInput(); // the highlight must follow every keystroke
    updatePos();
    schedule();
  });

  let tabFree = false;
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { tabFree = true; return; }
    if (e.key === 'Tab' && !tabFree && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      if (!document.execCommand('insertText', false, '  ')) {
        ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end');
        ta.dispatchEvent(new Event('input'));
      }
      return;
    }
    if (e.key !== 'Tab') tabFree = false;
  });
  ta.addEventListener('blur', () => { tabFree = false; });

  function caretOffset() {
    const src = ta.value;
    let off = ta.selectionStart;
    // A caret resting just after a token belongs to that token.
    if (off > 0 && !isWs(src[off - 1]) && isWs(src[off])) off -= 1;
    return off;
  }

  function resolveCaret() {
    updatePos();
    if (!state.parsed || state.error || pending || state.fromJson) return;
    const node = E.nodeAtSource(state.parsed.forms, caretOffset());
    if (node === state.active) return;
    state.active = node;
    if (!state.hover) mark(node);
    renderInput();
    updateSign(true);
  }

  let selRaf = 0;
  document.addEventListener('selectionchange', () => {
    if (document.activeElement !== ta || selRaf) return;
    selRaf = requestAnimationFrame(() => { selRaf = 0; resolveCaret(); });
  });

  function pin(node, o) {
    if (!node) return;
    state.active = node;
    state.hover = null;
    mark(node);
    renderInput();
    updateSign(true);
    if (o && o.scrollInput && !state.fromJson) {
      if (document.activeElement !== ta) ta.setSelectionRange(node.start, node.start);
      scrollInputTo(node.start);
    }
    if (o && o.scrollOutput) scrollOutputTo(node);
  }

  function scrollInputTo(offset) {
    const line = lineIndexAt(ta.value, offset);
    const el = inHl.children[line];
    if (!el) return;
    const top = el.offsetTop;
    const h = ta.clientHeight;
    if (top < ta.scrollTop + 16 || top > ta.scrollTop + h - 48) {
      ta.scrollTop = Math.max(0, top - h / 3);
      syncScroll();
    }
  }

  function goToError() {
    const err = state.error;
    if (!err) return;
    ta.focus();
    const at = Math.min(err.offset, ta.value.length);
    ta.setSelectionRange(at, Math.min(at + 1, ta.value.length));
    scrollInputTo(at);
  }

  // ---------------------------------------------------------------- the sign

  let signRaf = 0;
  function queueSign() {
    if (signRaf) return;
    signRaf = requestAnimationFrame(() => {
      signRaf = 0;
      mark(state.hover || state.active);
      updateSign(true);
    });
  }

  // What a node is, said the way the sign says it.
  function contextOf(node) {
    if (node.t === 'comment') return 'comment';
    for (let n = node; n; n = n.parent) {
      if (n.t === 'discard') return 'discard';
      if (n.parent && n.parent.t === 'meta' && n.parent.meta === n) return 'meta';
    }
    return null;
  }

  function kindLine(node) {
    const d = E.describe(node);
    if (!d) return '';
    let s;
    if (d.kind === 'map') s = `map · ${plural(d.count, 'entry', 'entries')}`;
    else if (d.count !== null) s = `${d.kind} · ${plural(d.count, 'item', 'items')}`;
    else if (d.kind === 'string') {
      const inner = node.t === 'tagged' ? node.form : node;
      s = `string · ${plural(Math.max(0, inner.text.length - 2), 'char', 'chars')}`;
    } else s = d.kind;
    if (d.tag) s = `${d.tag} ${s}`;
    if (node.isKey) s = `key · ${s}`;
    return s;
  }

  function linesLabel(node) {
    if (state.mode === 'minify') return '';
    const r = rangeOf(node);
    if (!r) return '';
    return r[0] === r[1] ? `line ${r[0] + 1}` : `lines ${r[0] + 1}–${r[1] + 1}`;
  }

  function ancestorAtDepth(node, k) {
    let target = null;
    for (let n = node; n; n = n.parent) {
      if (n.path && n.path.length === k && !n.isKey) target = n;
    }
    return target;
  }

  function pathHTML(node) {
    const p = node.path;
    if (!p.length) return '<span class="plain">Top level</span>';
    const segs = p.map((label, k) => {
      const here = k === p.length - 1;
      return `<button type="button" class="seg-btn" data-k="${k + 1}"${here ? ' aria-current="location"' : ''}>${esc(label)}</button>`;
    });
    return `<span class="br">[</span>${segs.join('<span class="sp"> </span>')}<span class="br">]</span>`;
  }

  let lastSignKey = '';
  let lastFlap = 0;

  function setSign(icon, dir, html, meta, flap) {
    signUse.setAttribute('href', `#i-${icon}`);
    signGo.dataset.dir = dir;
    const key = html;
    if (key !== lastSignKey) {
      signPath.innerHTML = html;
      lastSignKey = key;
      fitSignPath();
      const now = performance.now();
      if (flap && !reduceMotion.matches && now - lastFlap > 110) {
        signBody.classList.remove('flap');
        void signBody.offsetWidth;
        signBody.classList.add('flap');
        lastFlap = now;
      }
    }
    signMeta.textContent = meta;
  }

  // One message per sign line: a long path steps its type down to fit.
  function fitSignPath() {
    signPath.style.fontSize = '';
    if (sign.classList.contains('is-error')) return;
    const avail = signPath.clientWidth;
    const need = signPath.scrollWidth;
    if (avail > 0 && need > avail) {
      const size = parseFloat(getComputedStyle(signPath).fontSize);
      signPath.style.fontSize = `${Math.max(14, Math.floor(size * avail / need))}px`;
    }
  }

  function updateSign(flap) {
    sign.classList.remove('is-error', 'is-empty');
    sign.classList.toggle('is-json', state.fromJson && !state.error);
    signConvert.hidden = !(state.fromJson && !state.error);
    const forms = state.parsed ? state.parsed.forms.filter((f) => f.t !== 'comment' && f.t !== 'discard') : [];

    if (state.error) {
      sign.classList.add('is-error');
      signGo.setAttribute('aria-label', 'Go to the error in Input');
      setSign('alert', 'none', `<span class="plain">${esc(state.error.message)}</span>`,
        `Line ${state.error.line}, column ${state.error.col} in Input`, flap);
      signStat.hidden = true;
      return;
    }
    if (!state.parsed || !forms.length) {
      sign.classList.add('is-empty');
      signGo.setAttribute('aria-label', 'Go to Input');
      setSign('arrow', stacked.matches ? 'up' : 'left', '<span class="plain">Waiting for input</span>',
        'Paste EDN or choose an example', flap);
      signStat.hidden = true;
      return;
    }

    signStat.hidden = false;
    renderStat();

    const node = state.hover || state.active;
    if (!node && state.fromJson) {
      signGo.setAttribute('aria-label', 'Back to the top of the output');
      setSign('json', 'none', '<span class="plain">Read as JSON</span>',
        'Shown as EDN · keys became keywords · null became nil', flap);
      return;
    }
    if (!node) {
      signGo.setAttribute('aria-label', 'Back to the top of the output');
      setSign('pin', 'none', '<span class="plain">Top level</span>',
        [plural(forms.length, 'form', 'forms'), `depth ${state.result.maxDepth}`].join(' · '), flap);
      return;
    }

    const ctx = contextOf(node);
    let html;
    let meta;
    if (ctx === 'comment') { html = '<span class="plain">Comment</span>'; meta = [state.mode === 'minify' ? 'removed by Minify' : '', linesLabel(node)]; }
    else if (ctx === 'discard') { html = '<span class="plain">Discarded with #_</span>'; meta = ['not part of the data', state.mode === 'minify' ? 'removed by Minify' : linesLabel(node)]; }
    else if (ctx === 'meta') { html = '<span class="plain">Metadata</span>'; meta = ['attached to the next form', linesLabel(node)]; }
    else {
      html = pathHTML(node);
      meta = [kindLine(node), linesLabel(node)];
      if (forms.length > 1 && node.top !== null) meta.push(`form ${node.top + 1} of ${forms.length}`);
    }
    const dir = directionOf(node);
    signGo.setAttribute('aria-label', dir === 'right' ? 'Highlight this form in the output' : `Scroll ${dir} to this form`);
    setSign('arrow', dir, html, meta.filter(Boolean).join(' · '), flap);
  }

  function updateArrow() {
    const node = state.hover || state.active;
    if (!node || state.error || !state.parsed) return;
    signGo.dataset.dir = directionOf(node);
  }

  function renderStat() {
    const inB = state.inBytes;
    const outB = state.outBytes;
    if (state.mode === 'minify') {
      const pct = inB ? ((outB - inB) / inB) * 100 : 0;
      const sign = pct < 0 ? '−' : pct > 0 ? '+' : '';
      statBig.textContent = `${sign}${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`;
      const stripped = state.result.stripped;
      statSmall.textContent = `${pct <= 0 ? 'smaller' : 'larger'} than input${stripped ? ` · ${plural(stripped, 'comment', 'comments')} dropped` : ''}`;
    } else {
      statBig.textContent = nf.format(state.lineCount);
      statSmall.textContent = state.lineCount === 1 ? 'line' : 'lines';
    }
  }

  signGo.addEventListener('click', () => {
    if (state.error) return goToError();
    if (!state.parsed || !state.parsed.forms.length) { ta.focus(); return; }
    const node = state.hover || state.active;
    if (!node) { outScroll.scrollTo({ top: 0, left: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' }); return; }
    scrollOutputTo(node);
  });

  signPath.addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b || b.hasAttribute('aria-current')) return;
    const node = state.hover || state.active;
    const target = node && ancestorAtDepth(node, +b.dataset.k);
    if (target) pin(target, { scrollInput: true, scrollOutput: true });
  });

  signCopy.addEventListener('click', async () => {
    const node = state.active;
    const path = node && node.path ? `[${node.path.join(' ')}]` : '[]';
    const ok = await copyText(path);
    toast(ok ? `Copied ${path.length > 60 ? 'path' : path}` : 'The browser blocked the copy', ok ? 'check' : 'alert');
  });

  // ---------------------------------------------------------------- status

  function updatePos() {
    const src = ta.value;
    const a = ta.selectionStart;
    const b = ta.selectionEnd;
    let line = 1;
    let col = 1;
    for (let i = 0; i < a; i++) {
      if (src.charCodeAt(i) === 10) { line++; col = 1; } else col++;
    }
    stPos.textContent = `Ln ${nf.format(line)}, Col ${nf.format(col)}${b > a ? ` (${nf.format(b - a)} selected)` : ''}`;
  }

  function renderBytes() {
    if (state.error || !state.result || !state.result.text) { stBytes.textContent = ''; return; }
    const inB = state.inBytes;
    const outB = state.outBytes;
    const pct = inB ? ((outB - inB) / inB) * 100 : 0;
    const sign = pct < 0 ? '−' : pct > 0 ? '+' : '±';
    stBytes.textContent = `${fmtBytes(inB)} → ${fmtBytes(outB)} · ${sign}${Math.abs(pct).toFixed(1)}%`;
  }

  function renderStatus() {
    renderBytes();
    const err = state.error;
    stState.classList.toggle('is-error', !!err);
    if (err) {
      stState.innerHTML = `<span class="st-sq"><svg aria-hidden="true"><use href="#i-alert"/></svg></span>
        <span class="st-msg">Not valid EDN</span>
        <button class="st-jump" type="button">Line ${err.line}, col ${err.col}</button>`;
      stState.querySelector('.st-jump').addEventListener('click', goToError);
      return;
    }
    const forms = state.parsed ? state.parsed.forms.filter((f) => f.t !== 'comment' && f.t !== 'discard').length : 0;
    const msg = !forms ? 'Ready'
      : state.fromJson ? `Valid JSON, shown as EDN · depth ${state.result.maxDepth}`
      : `Valid EDN · ${plural(forms, 'form', 'forms')} · depth ${state.result.maxDepth}`;
    stState.innerHTML = `<span class="st-sq"><svg aria-hidden="true"><use href="#i-check"/></svg></span><span class="st-msg">${msg}</span>`;
  }

  let announceTimer = 0;
  let lastAnnounced = '';
  function announceError() {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      const msg = state.error ? `Error on line ${state.error.line}: ${state.error.message}` : '';
      if (msg !== lastAnnounced) { announceEl.textContent = msg; lastAnnounced = msg; }
    }, 1500);
  }

  // ---------------------------------------------------------------- clipboard, share

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const t = document.createElement('textarea');
      t.value = text;
      t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(t);
      t.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      t.remove();
      return ok;
    }
  }

  $('copy').addEventListener('click', async () => {
    if (state.error) { toast('The input has an error, so there is no current output to copy', 'alert', 'Show error', goToError); return; }
    if (!state.result || !state.result.text) { toast('Nothing to copy yet', 'alert'); return; }
    const ok = await copyText(state.result.text);
    toast(ok ? `Copied ${state.mode === 'minify' ? 'minified' : 'beautified'} output · ${fmtBytes(state.outBytes)}`
      : `The browser blocked the copy. Select the output and press ${COPY_KEY}.`, ok ? 'check' : 'alert');
  });

  function b64url(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64url(str) {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const u8 = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  }

  async function encodeShare() {
    const payload = encoder.encode(JSON.stringify({
      s: ta.value, m: state.mode, a: state.align, i: state.indent, w: state.width, k: state.sortKeys, n: state.nested,
    }));
    if (window.CompressionStream) {
      const stream = new Blob([payload]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return 'z' + b64url(new Uint8Array(await new Response(stream).arrayBuffer()));
    }
    return 'p' + b64url(payload);
  }

  // A link is data from a stranger: cap what it may expand to.
  const SHARE_LIMIT = 8 * 1024 * 1024;
  async function readCapped(stream, cap) {
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > cap) { reader.cancel(); throw new Error('share link expands past the size limit'); }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) { out.set(c, at); at += c.length; }
    return out;
  }

  async function decodeShare(code) {
    if (code.length > SHARE_LIMIT) throw new Error('share link too long');
    const kind = code[0];
    let bytes = fromB64url(code.slice(1));
    if (kind === 'z') {
      bytes = await readCapped(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')), SHARE_LIMIT);
    } else if (kind !== 'p') throw new Error('unknown share format');
    const d = JSON.parse(new TextDecoder().decode(bytes));
    if (!d || typeof d !== 'object') throw new Error('malformed share link');
    return d;
  }

  $('share').addEventListener('click', async () => {
    if (!ta.value.trim()) { toast('Add some input first, then share it', 'alert'); return; }
    let code;
    try { code = await encodeShare(); } catch (e) { toast('This browser could not build the link', 'alert'); return; }
    const url = `${location.href.split('#')[0]}#${code}`;
    try { history.replaceState(null, '', `#${code}`); } catch (e) { /* file:// may refuse */ }
    const ok = await copyText(url);
    if (!ok) { toast('The browser blocked the copy. The link is in the address bar.', 'alert'); return; }
    toast(url.length > 8000
      ? `Link copied. It is long (${fmtBytes(url.length)}), and some chat apps cut long links.`
      : 'Link copied. The input travels inside the link, not through a server.', 'link');
  });

  // ---------------------------------------------------------------- toast

  let toastTimer = 0;
  function toast(msg, icon, actionLabel, action) {
    toastText.textContent = msg;
    toastUse.setAttribute('href', `#i-${icon || 'check'}`);
    if (actionLabel) {
      toastAction.hidden = false;
      toastAction.textContent = actionLabel;
      toastAction.onclick = () => { hideToast(); action(); };
    } else {
      toastAction.hidden = true;
      toastAction.onclick = null;
    }
    toastEl.hidden = false;
    toastEl.style.animation = 'none';
    void toastEl.offsetWidth;
    toastEl.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, actionLabel ? 6000 : 3200);
  }
  function hideToast() { toastEl.hidden = true; }

  // ---------------------------------------------------------------- input actions

  $('paste').addEventListener('click', async () => {
    let text;
    try {
      text = await navigator.clipboard.readText();
    } catch (e) {
      ta.focus();
      toast(`The browser blocked clipboard access. Press ${PASTE_KEY} in Input instead.`, 'alert');
      return;
    }
    if (!text) { toast('The clipboard is empty', 'alert'); return; }
    setInput(text);
    run();
  });

  // ---------------------------------------------------------------- files

  const FILE_LIMIT = 20 * 1024 * 1024;

  async function openFile(file) {
    if (!file) return;
    if (file.size > FILE_LIMIT) {
      toast(`${file.name} is ${fmtBytes(file.size)}; files up to ${fmtBytes(FILE_LIMIT)} open here`, 'alert');
      return;
    }
    let text;
    try { text = await file.text(); } catch (e) { toast(`Could not read ${file.name}`, 'alert'); return; }
    setInput(text, file.name);
    run();
    toast(`Opened ${file.name} · ${fmtBytes(file.size)}`, 'open');
  }

  $('open').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    openFile(fileInput.files[0]);
    fileInput.value = '';
  });

  const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  let dragDepth = 0;
  paneIn.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
    dropEl.hidden = false;
  });
  paneIn.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  paneIn.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) dropEl.hidden = true;
  });
  paneIn.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    dropEl.hidden = true;
    openFile(e.dataTransfer.files[0]);
  });
  // A file dropped anywhere else should not navigate away from the page.
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => { if (hasFiles(e)) e.preventDefault(); });

  $('download').addEventListener('click', () => {
    if (state.error) { toast('The input has an error, so there is no current output to save', 'alert', 'Show error', goToError); return; }
    if (!state.result || !state.result.text) { toast('Nothing to download yet', 'alert'); return; }
    const base = (state.fileName || 'data').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-') || 'data';
    const name = `${base}${state.mode === 'minify' ? '.min' : ''}.edn`;
    const url = URL.createObjectURL(new Blob([state.result.text.endsWith('\n') ? state.result.text : state.result.text + '\n'], { type: 'application/edn' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Saved ${name}`, 'download');
  });

  signConvert.addEventListener('click', () => {
    if (!state.fromJson || !state.jsonEdn) return;
    const prev = ta.value;
    const prevName = state.fileName;
    setInput(state.jsonEdn, prevName && prevName.replace(/\.json$/i, '.edn'));
    run();
    toast('Input replaced with EDN', 'check', 'Undo', () => { setInput(prev, prevName); run(); });
  });

  $('clear').addEventListener('click', () => {
    if (!ta.value) { ta.focus(); return; }
    const prev = ta.value;
    const prevExample = state.exampleId;
    setInput('');
    run();
    ta.focus();
    toast('Input cleared', 'clear', 'Undo', () => {
      setInput(prev);
      state.exampleId = prevExample;
      markExamples();
      run();
    });
  });

  // ---------------------------------------------------------------- theme

  const themeBtn = $('theme');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function currentTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function syncTheme() {
    const t = currentTheme();
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to day theme' : 'Switch to night theme');
    themeMeta.setAttribute('content', t === 'dark' ? '#111111' : '#FFCC00');
  }
  themeBtn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('cmf:theme', next); } catch (e) { /* fine */ }
    syncTheme();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);

  // ---------------------------------------------------------------- keys

  document.addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.code === 'KeyB') { e.preventDefault(); setMode('beautify'); }
    else if (e.code === 'KeyM') { e.preventDefault(); setMode('minify'); }
    else if (e.code === 'KeyC') { e.preventDefault(); $('copy').click(); }
  });

  stacked.addEventListener('change', () => updateSign(false));

  // ---------------------------------------------------------------- resize

  let resizeTimer = 0;
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (state.width !== 'auto' || state.error) return;
      const w = fitWidth();
      if (w === state.autoWidth) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const keep = state.active;
        run();
        if (keep && state.parsed) resolveCaret();
      }, 120);
    }).observe(outScroll);
    new ResizeObserver(fitSignPath).observe(sign);
    new ResizeObserver(() => updateEdgeCue()).observe(outScroll);
  }

  // ---------------------------------------------------------------- boot

  function applySettings(s) {
    if (!s) return;
    if (s.mode === 'beautify' || s.mode === 'minify') state.mode = s.mode;
    if (typeof s.align === 'boolean') state.align = s.align;
    if ([1, 2, 4].includes(s.indent)) state.indent = s.indent;
    if (s.width === 'auto' || [60, 80, 100, 120].includes(s.width)) state.width = s.width;
    if (typeof s.sortKeys === 'boolean') state.sortKeys = s.sortKeys;
    if (s.nested === 'beside' || s.nested === 'below') state.nested = s.nested;
  }

  async function boot() {
    renderExamples();
    measureChar();
    syncTheme();
    const saved = loadSaved();
    applySettings(saved);

    const hash = location.hash.slice(1);
    let loaded = false;
    if (hash) {
      try {
        const d = await decodeShare(hash);
        applySettings({ mode: d.m, align: d.a, indent: d.i, width: d.w, sortKeys: d.k, nested: d.n });
        syncControls();
        setInput(String(d.s || ''));
        run();
        loaded = true;
      } catch (e) {
        toast('That share link could not be read, so the last session is shown instead', 'alert');
      }
    }
    if (!loaded) {
      syncControls();
      if (saved && saved.exampleId && EXAMPLES.some((x) => x.id === saved.exampleId)) loadExample(saved.exampleId);
      else if (saved && typeof saved.input === 'string' && saved.input.trim()) { setInput(saved.input); run(); }
      else loadExample('repl');
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        const before = charW;
        measureChar();
        if (Math.abs(before - charW) > 0.05 && state.width === 'auto') run();
      });
    }
  }

  boot();
})();
