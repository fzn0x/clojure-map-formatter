/*
 * EDN reader + printer.
 *
 * parse(src)          -> { forms, nodes }   (throws EdnError with line/col)
 * beautify(forms, o)  -> { text, tokens, strands, lines, maxDepth }
 * minify(forms)       -> { text, tokens, maxDepth }
 * tokenize(src)       -> tokens for highlighting text that may not parse
 *
 * Tokens are { s, c, id } where c is a highlight class and id points back
 * into `nodes`, so the view can map any output character to its form.
 */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------- errors

  function lineCol(src, offset) {
    let line = 1, col = 1;
    const end = Math.min(offset, src.length);
    for (let i = 0; i < end; i++) {
      if (src.charCodeAt(i) === 10) { line++; col = 1; } else col++;
    }
    return { line, col };
  }

  class EdnError extends Error {
    constructor(message, offset, src) {
      super(message);
      this.name = 'EdnError';
      this.offset = offset;
      const lc = lineCol(src, offset);
      this.line = lc.line;
      this.col = lc.col;
    }
  }

  // ---------------------------------------------------------------- chars

  const isWs = (ch) => ch === ' ' || ch === ',' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f' || ch === '\v' || ch === ' ';
  const TERMINATING = new Set(['"', ';', '@', '^', '`', '~', '(', ')', '[', ']', '{', '}', '\\']);
  const isTokenChar = (ch) => ch !== undefined && !isWs(ch) && !TERMINATING.has(ch);

  const NUMBER_RE = /^[+-]?(?:0[xX][0-9a-fA-F]+N?|\d+[rR][0-9a-zA-Z]+|\d+\/\d+|\d+N|\d+(?:\.\d*)?(?:[eE][+-]?\d+)?M?)$/;
  const NAMED_CHARS = new Set(['newline', 'space', 'tab', 'backspace', 'formfeed', 'return']);
  const CLOSE_FOR = { '(': ')', '[': ']', '{': '}' };
  const KIND_NAME = { map: 'map', vector: 'vector', list: 'list', set: 'set' };

  const COLL = new Set(['map', 'vector', 'list', 'set']);
  const isColl = (n) => COLL.has(n.t);
  // Forms that carry data. Comments and #_ discards do not.
  const isSignificant = (n) => n.t !== 'comment' && n.t !== 'discard';

  // ---------------------------------------------------------------- reader

  function parse(src) {
    let i = 0;
    const n = src.length;
    const nodes = [];

    const err = (msg, at) => { throw new EdnError(msg, at == null ? i : at, src); };
    const mk = (node) => { node.id = nodes.length; nodes.push(node); return node; };
    const lineOf = (at) => lineCol(src, at).line;

    function skipWs() { while (i < n && isWs(src[i])) i++; }

    function countNewlines(a, b) {
      let c = 0;
      for (let k = a; k < b; k++) if (src.charCodeAt(k) === 10) c++;
      return c;
    }

    // A form that must follow a prefix such as ^, #_, ' or a tag.
    function readTarget(what, prefixAt) {
      for (;;) {
        skipWs();
        if (i >= n) err(`Expected ${what}, but the input ended`, prefixAt);
        const ch = src[i];
        if (ch === ')' || ch === ']' || ch === '}') err(`Expected ${what}, found ${ch}`);
        if (ch === ';') { readComment(i); continue; }
        return readForm();
      }
    }

    function readChildren(close, openAt, openStr) {
      const kids = [];
      for (;;) {
        const wsStart = i;
        skipWs();
        if (i >= n) {
          err(`Unclosed ${openStr} opened on line ${lineOf(openAt)}: expected ${close} before the end of input`, openAt);
        }
        const ch = src[i];
        if (ch === close) { i++; return kids; }
        if (ch === ')' || ch === ']' || ch === '}') {
          err(`Mismatched ${ch}: the ${openStr} opened on line ${lineOf(openAt)} needs ${close} first`);
        }
        const nl = countNewlines(wsStart, i);
        const node = readForm();
        node.nl = kids.length === 0 ? 0 : nl;
        if (node.t === 'comment') node.trailing = kids.length > 0 && nl === 0;
        kids.push(node);
      }
    }

    function coll(t, open, close, start) {
      const node = mk({ t, open, close, start, children: null, end: 0 });
      node.children = readChildren(close, start, open);
      node.end = i;
      if (t === 'map') {
        const sig = node.children.filter(isSignificant);
        if (sig.length % 2 === 1) {
          const lone = sig[sig.length - 1];
          err(`Map literal has an odd number of forms: ${src.slice(lone.start, Math.min(lone.end, lone.start + 40))} has no value`, lone.start);
        }
      }
      if (t === 'map' || t === 'set') checkDuplicates(node, t === 'map' ? 2 : 1);
      return node;
    }

    // The reader rejects {:a 1 :a 2} and #{1 1}; so does this one.
    function checkDuplicates(node, step) {
      const sig = node.children.filter(isSignificant);
      const seen = new Map();
      for (let k = 0; k < sig.length; k += step) {
        const item = sig[k];
        const text = minifyText(item);
        const first = seen.get(text);
        if (first) {
          const shown = text.length > 40 ? text.slice(0, 37) + '…' : text;
          err(`Duplicate ${step === 2 ? 'key' : 'set element'} ${shown}: already used on line ${lineOf(first.start)}`, item.start);
        }
        seen.set(text, item);
      }
    }

    function readString(start, t) {
      i++; // opening quote
      while (i < n) {
        const ch = src[i];
        if (ch === '\\') { i += 2; continue; }
        if (ch === '"') {
          i++;
          return mk({ t, text: src.slice(start, i), start, end: i });
        }
        i++;
      }
      return err(`Unterminated ${t === 'regex' ? 'regex' : 'string'} starting on line ${lineOf(start)}`, start);
    }

    function readComment(start) {
      while (i < n && src[i] !== '\n') i++;
      return mk({ t: 'comment', text: src.slice(start, i).replace(/\s+$/, ''), start, end: i });
    }

    function readChar(start) {
      i++; // backslash
      if (i >= n) err('A character literal needs a character after \\', start);
      i++; // first char is always taken
      while (i < n && isTokenChar(src[i])) i++;
      const tok = src.slice(start + 1, i);
      const ok = tok.length === 1 || NAMED_CHARS.has(tok) || /^u[0-9a-fA-F]{4}$/.test(tok) || /^o[0-7]{1,3}$/.test(tok);
      if (!ok) err(`Unsupported character literal \\${tok}`, start);
      return mk({ t: 'char', text: src.slice(start, i), start, end: i });
    }

    function readRawToken() {
      const s = i;
      while (i < n && isTokenChar(src[i])) i++;
      return src.slice(s, i);
    }

    function readToken(start) {
      const tok = readRawToken();
      if (tok === 'nil') return mk({ t: 'nil', text: tok, start, end: i });
      if (tok === 'true' || tok === 'false') return mk({ t: 'boolean', text: tok, start, end: i });
      const c0 = tok[0];
      const startsNumeric = (c0 >= '0' && c0 <= '9') || ((c0 === '+' || c0 === '-') && tok[1] >= '0' && tok[1] <= '9');
      if (startsNumeric) {
        if (!NUMBER_RE.test(tok)) err(`Invalid number: ${tok}`, start);
        return mk({ t: 'number', text: tok, start, end: i });
      }
      if (c0 === ':') {
        if (tok === ':' || tok === '::' || tok.endsWith(':') || tok.indexOf('::', 1) !== -1) err(`Invalid keyword: ${tok}`, start);
        return mk({ t: 'keyword', text: tok, start, end: i });
      }
      return mk({ t: 'symbol', text: tok, start, end: i });
    }

    function prefixed(prefix, start, what) {
      i += prefix.length;
      const form = readTarget(what, start);
      return mk({ t: 'prefix', prefix, form, start, end: i });
    }

    function readDispatch(start) {
      const c = src[i + 1];
      if (c === '{') { i += 2; return coll('set', '#{', '}', start); }
      if (c === '(') { i += 2; return coll('list', '#(', ')', start); }
      if (c === '"') { i += 1; const r = readString(i, 'regex'); r.text = '#' + r.text; r.start = start; return r; }
      if (c === '_') {
        i += 2;
        const form = readTarget('a form to discard after #_', start);
        // #_#_ a b discards two forms: the inner #_ takes a, this one takes b.
        const next = form.t === 'discard' ? readTarget('a second form to discard after #_#_', start) : null;
        return mk({ t: 'discard', form, next, start, end: i });
      }
      if (c === "'") return prefixed("#'", start, "a var name after #'");
      if (c === '=') return prefixed('#=', start, 'a form after #=');
      if (c === '!') return readComment(start);
      if (c === '^') {
        i += 2;
        const meta = readTarget('metadata after #^', start);
        const form = readTarget('a form for the metadata to attach to', start);
        return mk({ t: 'meta', meta, form, start, end: i });
      }
      if (c === '#') {
        i += 2;
        const tok = readRawToken();
        if (tok !== 'Inf' && tok !== '-Inf' && tok !== 'NaN') err(`Unknown symbolic value ##${tok}`, start);
        return mk({ t: 'number', text: '##' + tok, start, end: i });
      }
      if (c === '?') {
        i += 2;
        let open = '#?(';
        if (src[i] === '@') { open = '#?@('; i++; }
        skipWs();
        if (src[i] !== '(') err('A reader conditional must be followed by a list', start);
        i++;
        return coll('list', open, ')', start);
      }
      if (c === ':') {
        i += 2;
        let auto = '';
        if (src[i] === ':') { auto = ':'; i++; }
        const ns = readRawToken();
        if (!auto && !ns) err('A namespaced map needs a namespace, like #:user{...}', start);
        skipWs();
        if (src[i] !== '{') err(`#:${auto}${ns} must be followed by a map`, start);
        i++;
        return coll('map', `#:${auto}${ns}{`, '}', start);
      }
      if (isTokenChar(c) && c !== '#') {
        i += 1;
        const tag = readRawToken();
        const form = readTarget(`a value after the tag #${tag}`, start);
        return mk({ t: 'tagged', tag: '#' + tag, form, start, end: i });
      }
      if (c === undefined) return err('Unexpected # at the end of input', start);
      return err(`Unknown dispatch #${c}`, start);
    }

    function readForm() {
      const start = i;
      const ch = src[i];
      switch (ch) {
        case '(': i++; return coll('list', '(', ')', start);
        case '[': i++; return coll('vector', '[', ']', start);
        case '{': i++; return coll('map', '{', '}', start);
        case ')': case ']': case '}':
          return err(`Unexpected ${ch}: there is no open ${({ ')': '(', ']': '[', '}': '{' })[ch]} to close`);
        case '"': return readString(start, 'string');
        case ';': return readComment(start);
        case '\\': return readChar(start);
        case '#': return readDispatch(start);
        case '^': {
          i++;
          const meta = readTarget('metadata after ^', start);
          const form = readTarget('a form for the metadata to attach to', start);
          return mk({ t: 'meta', meta, form, start, end: i });
        }
        case "'": return prefixed("'", start, "a form after '");
        case '`': return prefixed('`', start, 'a form after `');
        case '@': return prefixed('@', start, 'a form after @');
        case '~': return src[i + 1] === '@'
          ? prefixed('~@', start, 'a form after ~@')
          : prefixed('~', start, 'a form after ~');
        default: return readToken(start);
      }
    }

    const forms = [];
    for (;;) {
      const wsStart = i;
      skipWs();
      if (i >= n) break;
      const nl = countNewlines(wsStart, i);
      const node = readForm();
      node.nl = forms.length === 0 ? 0 : nl;
      if (node.t === 'comment') node.trailing = forms.length > 0 && nl === 0;
      forms.push(node);
    }

    assignPaths(forms, nodes);
    return { forms, nodes };
  }

  // ---------------------------------------------------------------- paths

  // Every node learns where it lives as a get-in path, plus its depth.
  function assignPaths(forms, nodes) {
    let top = 0;
    for (const f of forms) {
      if (!isSignificant(f)) { walk(f, null, null, 0, false, null); continue; }
      walk(f, [], top++, 0, false, null);
    }

    function walk(node, path, topIndex, depth, discarded, parent) {
      node.path = discarded ? null : path;
      node.top = topIndex;
      node.depth = depth;
      node.parent = parent;
      if (node.t === 'discard') {
        walk(node.form, null, topIndex, depth, true, node);
        if (node.next) walk(node.next, null, topIndex, depth, true, node);
        return;
      }
      if (node.t === 'tagged' || node.t === 'prefix') return walk(node.form, path, topIndex, depth, discarded, node);
      if (node.t === 'meta') {
        walk(node.meta, null, topIndex, depth, true, node);
        return walk(node.form, path, topIndex, depth, discarded, node);
      }
      if (!isColl(node)) return;
      const d = depth + 1;
      if (node.t === 'map') {
        for (const e of entries(node)) {
          for (const p of e.pre.concat(e.mid)) walk(p, null, topIndex, d, true, node);
          const label = labelOf(e.key);
          const p2 = path && path.concat([label]);
          e.key.isKey = true;
          walk(e.key, p2, topIndex, d, discarded, node);
          walk(e.value, p2, topIndex, d, discarded, node);
          if (e.post) walk(e.post, null, topIndex, d, true, node);
        }
        for (const c of node._tail) walk(c, null, topIndex, d, true, node);
        return;
      }
      let idx = 0;
      for (const c of node.children) {
        if (!isSignificant(c)) { walk(c, null, topIndex, d, true, node); continue; }
        const label = node.t === 'set' ? labelOf(c) : String(idx);
        walk(c, path && path.concat([label]), topIndex, d, discarded, node);
        idx++;
      }
    }
  }

  function labelOf(node) {
    const s = minifyText(node);
    return s.length > 48 ? s.slice(0, 45) + '…' : s;
  }

  // ---------------------------------------------------------------- map entries

  // Pair a map's children into entries, carrying comments and #_ forms
  // along with the entry they sit in front of.
  function entries(node) {
    if (node._entries) return node._entries;
    const out = [];
    let pre = [];
    let pending = null; // entry waiting for its value
    let blank = false;
    for (const c of node.children) {
      if (c.t === 'comment' && c.trailing && out.length && !pending && pre.length === 0 && !out[out.length - 1].post) {
        out[out.length - 1].post = c;
        continue;
      }
      if (!isSignificant(c)) {
        // A #_ between a key and its value stays between them.
        if (pending && c.t === 'discard') { pending.mid.push(c); continue; }
        if (pre.length === 0 && !pending && c.nl > 1) blank = true;
        pre.push(c);
        continue;
      }
      if (!pending) {
        if (pre.length === 0 && c.nl > 1) blank = true;
        pending = { pre, key: c, mid: [], value: null, post: null, blank };
        pre = [];
        blank = false;
      } else {
        // Comments between a key and its value move in front of the key.
        pending.pre = pending.pre.concat(pre);
        pre = [];
        pending.value = c;
        out.push(pending);
        pending = null;
      }
    }
    node._entries = out;
    node._tail = pre; // comments after the last entry
    return out;
  }

  const TYPE_RANK = { keyword: 0, symbol: 1, string: 2, number: 3 };
  function sortKey(n) {
    const inner = n.t === 'meta' ? n.form : n;
    return { rank: TYPE_RANK[inner.t] ?? 4, text: minifyText(inner).replace(/^:+/, '') };
  }
  const collator = typeof Intl !== 'undefined' ? new Intl.Collator('en', { numeric: true, sensitivity: 'base' }) : null;

  function orderedEntries(node, sort) {
    const es = entries(node);
    if (!sort) return es;
    return es
      .map((e, ix) => ({ e, ix, k: sortKey(e.key) }))
      .sort((a, b) => (a.k.rank - b.k.rank)
        || (collator ? collator.compare(a.k.text, b.k.text) : (a.k.text < b.k.text ? -1 : a.k.text > b.k.text ? 1 : 0))
        || (a.ix - b.ix))
      .map((x) => x.e);
  }

  // ---------------------------------------------------------------- token emitter

  function Emitter() {
    this.tokens = [];
    this.text = '';
    this.line = 0;
    this.col = 0;
  }
  Emitter.prototype.tok = function (s, c, id) {
    this.tokens.push({ s, c, id });
    this.text += s;
    const nl = s.lastIndexOf('\n');
    if (nl === -1) this.col += s.length;
    else {
      for (let k = 0; k < s.length; k++) if (s.charCodeAt(k) === 10) this.line++;
      this.col = s.length - nl - 1;
    }
  };
  Emitter.prototype.ws = function (s) { if (s) this.tok(s, null, -1); };
  Emitter.prototype.newline = function (indent) { this.ws('\n' + ' '.repeat(Math.max(0, indent))); };
  Emitter.prototype.blank = function (indent) { this.ws('\n'); this.newline(indent); };
  Emitter.prototype.padTo = function (col) { this.ws(' '.repeat(Math.max(1, col - this.col))); };

  function atomClass(node) {
    switch (node.t) {
      case 'keyword': {
        const k = node.isKey ? 'kw key' : 'kw';
        return k;
      }
      case 'string': return node.isKey ? 'str key' : 'str';
      case 'number': return 'num';
      case 'char': return 'chr';
      case 'nil': case 'boolean': return 'lit';
      case 'regex': return 'rx';
      case 'symbol': return node.isKey ? 'sym key' : 'sym';
      case 'comment': return 'cmt';
      default: return 'sym';
    }
  }

  function emitAtom(em, node, extra) {
    if (node.t === 'keyword') {
      // :ns/name renders its namespace quieter than its name
      const slash = node.text.indexOf('/', 1);
      if (slash !== -1 && slash < node.text.length - 1) {
        em.tok(node.text.slice(0, slash + 1), atomClass(node) + ' ns' + (extra || ''), node.id);
        em.tok(node.text.slice(slash + 1), atomClass(node) + (extra || ''), node.id);
        return;
      }
    }
    em.tok(node.text, atomClass(node) + (extra || ''), node.id);
  }

  const brk = (depth) => 'brk d' + (depth % 6);

  // ---------------------------------------------------------------- minify

  // Minified text of a node, used for labels and sort keys (memoised).
  function minifyText(node) {
    if (node._min !== undefined) return node._min;
    const em = new Emitter();
    emitMin(em, node, false);
    node._min = em.text;
    return em.text;
  }

  // Minify only drops whitespace beside brackets. Every EDN reader treats
  // ( ) [ ] { } as delimiters; not all of them treat a quote that way, so
  // `:name"Ada"` would be smaller but not portable.
  function startsDelimited(node) {
    return isColl(node) && node.open[0] !== '#';
  }
  function endsDelimited(node) {
    if (isColl(node)) return true;
    if (node.t === 'tagged' || node.t === 'prefix' || node.t === 'meta') return endsDelimited(node.form);
    return false;
  }

  function emitMin(em, node, sort) {
    switch (node.t) {
      case 'map': case 'vector': case 'list': case 'set': {
        em.tok(node.open, brk(node.depth || 0), node.id);
        let prev = null;
        const kids = node.t === 'map'
          ? orderedEntries(node, sort).flatMap((e) => [e.key, e.value])
          : node.children.filter(isSignificant);
        for (const c of kids) {
          if (prev && !(endsDelimited(prev) || startsDelimited(c))) em.ws(' ');
          emitMin(em, c, sort);
          prev = c;
        }
        em.tok(node.close, brk(node.depth || 0), node.id);
        return;
      }
      case 'tagged':
        em.tok(node.tag, 'tag', node.id);
        if (!startsDelimited(node.form)) em.ws(' ');
        return emitMin(em, node.form, sort);
      case 'meta':
        em.tok('^', 'meta', node.id);
        emitMetaBody(em, node.meta, sort);
        if (!(endsDelimited(node.meta) || startsDelimited(node.form))) em.ws(' ');
        return emitMin(em, node.form, sort);
      case 'prefix':
        em.tok(node.prefix, 'meta', node.id);
        return emitMin(em, node.form, sort);
      case 'discard':
        em.tok('#_', 'dis', node.id);
        emitMin(em, node.form, sort);
        if (node.next) { em.ws(' '); emitMin(em, node.next, sort); }
        return;
      default:
        return emitAtom(em, node);
    }
  }

  function emitMetaBody(em, meta, sort) {
    if (meta.t === 'keyword') return em.tok(meta.text, 'meta', meta.id);
    return emitMin(em, meta, sort);
  }

  function minify(forms, opts) {
    const sort = !!(opts && opts.sortKeys);
    const em = new Emitter();
    let prev = null;
    let stripped = 0;
    let maxDepth = 0;
    for (const f of forms) {
      if (!isSignificant(f)) { stripped++; continue; }
      if (prev) em.ws(' ');
      emitMin(em, f, sort);
      prev = f;
    }
    // Count what the minifier dropped inside collections, and how deep it went.
    (function scan(list) {
      for (const node of list) {
        if (!node) continue;
        if (node.t === 'comment' || node.t === 'discard') { stripped++; continue; }
        if (isColl(node)) { maxDepth = Math.max(maxDepth, (node.depth || 0) + 1); scan(node.children); }
        else if (node.form) scan([node.form]);
      }
    })(forms.filter(isSignificant));
    return { text: em.text, tokens: em.tokens, stripped, maxDepth, strands: [], lines: 1 };
  }

  // ---------------------------------------------------------------- beautify

  const BODY_FORMS = new Set([
    'def', 'defn', 'defn-', 'defmacro', 'defmethod', 'defmulti', 'defonce', 'defprotocol', 'defrecord', 'deftype',
    'fn', 'let', 'letfn', 'loop', 'binding', 'when', 'when-not', 'when-let', 'when-some', 'when-first', 'if-let',
    'if-some', 'do', 'doseq', 'dotimes', 'for', 'ns', 'try', 'catch', 'finally', 'with-open', 'with-redefs',
    'case', 'cond', 'condp', 'cond->', 'cond->>', 'comment', 'reify', 'proxy', 'extend-type', 'extend-protocol',
    'deftest', 'testing', 'go', 'go-loop', 'future', 'delay', 'locking'
  ]);

  function beautify(forms, opts) {
    // nested: 'beside' hangs a breaking collection beside its key (Clojure's
    // usual shape); 'below' moves it under the key, indented by `indent`.
    const o = Object.assign({ width: 80, indent: 2, align: true, sortKeys: false, nested: 'beside' }, opts || {});
    const em = new Emitter();
    const strands = [];
    let maxDepth = 0;

    // Flat single-line rendering, or null when a comment forbids it.
    function flat(node) {
      if (node._flat !== undefined) return node._flat;
      let r;
      switch (node.t) {
        case 'comment': r = null; break;
        case 'map': {
          const es = orderedEntries(node, o.sortKeys);
          if (node._tail.some((c) => c.t === 'comment')) { r = null; break; }
          const parts = [];
          for (const e of es) {
            if (e.post) { r = null; break; }
            for (const p of e.pre) { const f = flat(p); if (f === null) { parts.length = 0; r = null; break; } parts.push(f); }
            if (r === null) break;
            const k = flat(e.key), v = flat(e.value);
            if (k === null || v === null) { r = null; break; }
            parts.push(k);
            for (const m of e.mid) parts.push(flat(m));
            parts.push(v);
          }
          if (r === null) break;
          for (const p of node._tail) parts.push(flat(p));
          r = node.open + parts.join(' ') + node.close;
          break;
        }
        case 'vector': case 'list': case 'set': {
          const parts = [];
          for (const c of node.children) {
            const f = flat(c);
            if (f === null) { r = null; break; }
            parts.push(f);
          }
          if (r === null) break;
          r = node.open + parts.join(' ') + node.close;
          break;
        }
        case 'tagged': { const f = flat(node.form); r = f === null ? null : node.tag + ' ' + f; break; }
        case 'meta': {
          const m = flat(node.meta), f = flat(node.form);
          r = m === null || f === null ? null : '^' + m + ' ' + f;
          break;
        }
        case 'prefix': { const f = flat(node.form); r = f === null ? null : node.prefix + f; break; }
        case 'discard': {
          const f = flat(node.form), g = node.next ? flat(node.next) : '';
          r = f === null || g === null ? null : '#_' + f + (node.next ? ' ' + g : '');
          break;
        }
        default: r = node.text;
      }
      node._flat = r;
      return r;
    }

    const fitsAt = (node, col) => {
      const f = flat(node);
      return f !== null && f.indexOf('\n') === -1 && col + f.length <= o.width;
    };
    const flatWidth = (node) => {
      const f = flat(node);
      return f === null || f.indexOf('\n') !== -1 ? Infinity : f.length;
    };

    function print(node, depth) {
      switch (node.t) {
        case 'map': case 'vector': case 'list': case 'set':
          return printColl(node, depth);
        case 'tagged':
          em.tok(node.tag, 'tag', node.id);
          em.ws(' ');
          return print(node.form, depth);
        case 'meta': {
          const startCol = em.col;
          em.tok('^', 'meta', node.id);
          if (node.meta.t === 'keyword') em.tok(node.meta.text, 'meta', node.meta.id);
          else print(node.meta, depth);
          // Long metadata on a collection that has to break goes on its own line.
          if (isColl(unwrap(node.form)) && !fitsAt(node.form, em.col + 1) && em.col - startCol > 12) em.newline(startCol);
          else em.ws(' ');
          return print(node.form, depth);
        }
        case 'prefix':
          em.tok(node.prefix, 'meta', node.id);
          return print(node.form, depth);
        case 'discard':
          em.tok('#_', 'dis', node.id);
          printDim(node.form);
          if (node.next) { em.ws(' '); printDim(node.next); }
          return;
        case 'comment':
          return em.tok(node.text, 'cmt', node.id);
        default:
          return emitAtom(em, node);
      }
    }

    // Discarded forms print in their minified shape, dimmed as one unit.
    function printDim(node) {
      const f = flat(node);
      em.tok(f === null ? minifyText(node) : f, 'dis', node.id);
    }

    function printFlat(node, depth) {
      if (!isColl(node)) return print(node, depth);
      em.tok(node.open, brk(depth), node.id);
      const kids = node.t === 'map'
        ? orderedEntries(node, o.sortKeys).flatMap((e) => e.pre.concat([e.key], e.mid, [e.value]))
        : node.children;
      kids.forEach((c, ix) => {
        if (ix) em.ws(' ');
        printFlat(c, depth + 1);
      });
      if (node.t === 'map') for (const t of node._tail) { em.ws(' '); printFlat(t, depth + 1); }
      em.tok(node.close, brk(depth), node.id);
    }

    function printColl(node, depth) {
      maxDepth = Math.max(maxDepth, depth + 1);
      if (fitsAt(node, em.col)) return printFlat(node, depth);
      const startLine = em.line;
      const openCol = em.col;
      em.tok(node.open, brk(depth), node.id);
      const inner = openCol + node.open.length;
      let endsInComment;
      if (node.t === 'map') endsInComment = printMapBody(node, depth, inner, openCol);
      else if (isCallForm(node)) endsInComment = printCallBody(node, depth, inner, openCol);
      else endsInComment = printSeqBody(node, depth, inner);
      if (endsInComment) em.newline(inner);
      em.tok(node.close, brk(depth), node.id);
      strands.push({ id: node.id, depth, from: startLine, to: em.line, col: openCol });
    }

    function printLeading(items, depth, indent) {
      for (const p of items) {
        print(p, depth + 1);
        em.newline(indent);
      }
    }

    function printMapBody(node, depth, inner) {
      const es = orderedEntries(node, o.sortKeys);
      const ALIGN_MAX = 28;
      let keyCol = -1;
      if (o.align && es.length > 1) {
        let max = 0;
        for (const e of es) {
          const w = flatWidth(e.key);
          if (w <= ALIGN_MAX) max = Math.max(max, w);
        }
        if (max > 0) keyCol = inner + max + 1;
      }
      let last = null;
      es.forEach((e, ix) => {
        if (ix) {
          if (e.blank && !o.sortKeys) em.blank(inner);
          else em.newline(inner);
        }
        printLeading(e.pre, depth, inner);
        print(e.key, depth + 1);
        for (const m of e.mid) { em.ws(' '); print(m, depth + 1); }
        const natural = em.col + 1;
        const aligned = keyCol > 0 && !e.mid.length && flatWidth(e.key) <= ALIGN_MAX ? keyCol : natural;
        let vw = flatWidth(e.value);
        // A string with line breaks is measured by its first line; it stays
        // beside its key like any other atom.
        if (vw === Infinity && !isColl(unwrap(e.value)) && flat(e.value) !== null) vw = flat(e.value).indexOf('\n');
        const flowCol = inner + o.indent;
        const hang = o.width * 0.55;
        let target;
        if (aligned + vw <= o.width) target = aligned;
        else if (isColl(unwrap(e.value))) {
          // A collection that must break hangs from the value column while
          // there is room for it, and flows under its key once there is not.
          if (o.nested === 'below') target = -1;
          else target = aligned < hang ? aligned : natural < hang ? natural : -1;
        } else if (natural + vw <= o.width) target = natural;
        else target = flowCol < natural ? -1 : natural; // under the key overflows less
        if (target === -1) em.newline(flowCol);
        else em.padTo(target);
        print(e.value, depth + 1);
        if (e.post) { em.ws(' '); print(e.post, depth + 1); }
        last = e;
      });
      const tail = node._tail;
      for (const t of tail) {
        if (last || t !== tail[0]) em.newline(inner);
        print(t, depth + 1);
      }
      if (tail.length) return tail[tail.length - 1].t === 'comment';
      return !!(last && last.post);
    }

    function unwrap(node) {
      while (node.t === 'tagged' || node.t === 'meta' || node.t === 'prefix') node = node.form;
      return node;
    }

    function isCallForm(node) {
      if (node.t !== 'list') return false;
      const first = node.children.find(isSignificant);
      return !!first && first.t === 'symbol' && node.children[0] === first;
    }

    function printCallBody(node, depth, inner, openCol) {
      const kids = node.children;
      const head = kids[0];
      print(head, depth + 1);
      const body = BODY_FORMS.has(head.text) || head.text.startsWith('def') || head.text.startsWith('with-');
      const rest = kids.slice(1);
      if (!rest.length) return false;
      const alignCol = em.col + 1;
      const bodyCol = openCol + o.indent;
      let restCol;
      let start = 0;
      if (body || alignCol > o.width * 0.4) {
        // header argument stays on the first line, the body indents
        if (rest[0].t !== 'comment' && fitsAt(rest[0], alignCol)) {
          em.ws(' ');
          print(rest[0], depth + 1);
          start = 1;
        }
        restCol = bodyCol;
      } else {
        if (rest[0].t !== 'comment') {
          em.ws(' ');
          print(rest[0], depth + 1);
          start = 1;
        }
        restCol = alignCol;
      }
      return printChildrenLines(rest.slice(start), depth, restCol, start === 0 ? -1 : 0);
    }

    // One child per line, with comments kept in place.
    function printChildrenLines(kids, depth, col, firstSameLine) {
      let lastComment = false;
      kids.forEach((c, ix) => {
        if (c.t === 'comment' && c.trailing && (ix > 0 || firstSameLine === 0)) {
          em.ws(' ');
        } else if (ix > 0 || firstSameLine !== 1) {
          if (c.nl > 1) em.blank(col); else em.newline(col);
        }
        print(c, depth + 1);
        lastComment = c.t === 'comment';
      });
      return lastComment;
    }

    function printSeqBody(node, depth, inner) {
      const kids = node.children;
      if (!kids.length) return false;
      const simple = kids.every((c) => c.t !== 'comment' && !isColl(unwrap(c)) && flatWidth(c) !== Infinity);
      if (simple) {
        // fill: as many atoms per line as the width allows
        kids.forEach((c, ix) => {
          const w = flatWidth(c);
          if (ix) {
            if (em.col + 1 + w > o.width && em.col > inner) em.newline(inner);
            else em.ws(' ');
          }
          print(c, depth + 1);
        });
        return false;
      }
      // A leading atom keeps its first companion on the opening line:
      // hiccup's [:div {:class ...}, reitit's ["/api" {...}.
      const [a, b] = kids;
      if (node.t === 'vector' && kids.length > 2 && !isColl(unwrap(a)) && isSignificant(a) && b.t !== 'comment' &&
          em.col + flatWidth(a) + 1 + flatWidth(b) <= o.width) {
        print(a, depth + 1);
        em.ws(' ');
        print(b, depth + 1);
        return printChildrenLines(kids.slice(2), depth, inner, 0);
      }
      return printChildrenLines(kids, depth, inner, 1);
    }

    let prev = null;
    for (const f of forms) {
      if (prev) {
        if (f.t === 'comment' && f.trailing) em.ws(' ');
        else if (f.nl > 1 || (isColl(unwrap(f)) && prev.t !== 'comment' && prev.t !== 'discard')) em.blank(0);
        else em.newline(0);
      }
      print(f, 0);
      prev = f;
    }

    return { text: em.text, tokens: em.tokens, strands, maxDepth, lines: em.line + 1 };
  }

  // ---------------------------------------------------------------- lenient tokenizer

  // Highlights text that may not parse yet (the input editor while typing).
  // Never throws; unmatched closers get class 'bad'. Map keys are tracked by
  // position so Input colours them the way Output does.
  function tokenize(src) {
    const out = [];
    const stack = [];      // expected closers
    const frames = [];     // per open collection: { map, count, skip }
    let i = 0;
    const n = src.length;
    let lastWs = 0;
    let prefixed = false;  // a tag or quote is waiting for the form it prefixes
    const push = (s, c) => out.push({ s, c });
    const flushWs = () => { if (i > lastWs) push(src.slice(lastWs, i), null); };
    // Count a form starting at the current level; true when it sits in key position.
    const formStart = () => {
      if (prefixed) { prefixed = false; return false; }
      const f = frames[frames.length - 1];
      if (!f) return false;
      if (f.skip) { f.skip--; return false; }
      const key = f.map && f.count % 2 === 0;
      f.count++;
      return key;
    };
    const prefix = () => { if (!prefixed) { const k = formStart(); prefixed = true; return k; } return false; };
    const skipNext = () => { const f = frames[frames.length - 1]; if (f) f.skip++; };
    const open = (s, close, map) => {
      formStart();
      push(s, brk(stack.length));
      stack.push(close);
      frames.push({ map, count: 0, skip: 0 });
    };
    while (i < n) {
      const ch = src[i];
      if (isWs(ch)) { i++; continue; }
      flushWs();
      const start = i;
      if (ch === ';' || (ch === '#' && src[i + 1] === '!')) {
        while (i < n && src[i] !== '\n') i++;
        push(src.slice(start, i), 'cmt');
      } else if (ch === '"' || (ch === '#' && src[i + 1] === '"')) {
        i += ch === '#' ? 2 : 1;
        while (i < n && src[i] !== '"') i += src[i] === '\\' ? 2 : 1;
        i = Math.min(n, i + 1);
        const key = formStart();
        push(src.slice(start, i), ch === '#' ? 'rx' : key ? 'str key' : 'str');
      } else if (ch === '(' || ch === '[' || ch === '{') {
        i++;
        open(ch, CLOSE_FOR[ch], ch === '{');
      } else if (ch === '#' && (src[i + 1] === '{' || src[i + 1] === '(')) {
        i += 2;
        open(src.slice(start, i), src[i - 1] === '{' ? '}' : ')', false);
      } else if (ch === '#' && src[i + 1] === ':') {
        i += 2;
        while (i < n && isTokenChar(src[i])) i++;
        push(src.slice(start, i), 'tag');
        if (src[i] === '{') { i++; open('{', '}', true); }
      } else if (ch === ')' || ch === ']' || ch === '}') {
        i++;
        prefixed = false;
        if (stack.length && stack[stack.length - 1] === ch) {
          stack.pop();
          frames.pop();
          push(ch, brk(stack.length));
        } else push(ch, 'bad');
      } else if (ch === '\\') {
        i += 2;
        while (i < n && isTokenChar(src[i])) i++;
        formStart();
        push(src.slice(start, i), 'chr');
      } else if (ch === '^') {
        i++;
        push('^', 'meta');
        skipNext(); // the metadata form; the form after it is the one that counts
      } else if (ch === "'" || ch === '`' || ch === '@' || ch === '~') {
        i += ch === '~' && src[i + 1] === '@' ? 2 : 1;
        push(src.slice(start, i), 'meta');
        prefix();
      } else if (ch === '#' && src[i + 1] === '_') {
        i += 2;
        push('#_', 'dis');
        skipNext();
      } else if (ch === '#' && src[i + 1] === '?') {
        i += src[i + 2] === '@' ? 3 : 2;
        push(src.slice(start, i), 'tag');
        prefix();
      } else if (ch === '#') {
        i++;
        if (src[i] === '#' || src[i] === "'" || src[i] === '^' || src[i] === '=') i++;
        while (i < n && isTokenChar(src[i])) i++;
        const s = src.slice(start, i);
        if (s.startsWith('##')) { formStart(); push(s, 'num'); } else { push(s, 'tag'); prefix(); }
      } else {
        while (i < n && isTokenChar(src[i])) i++;
        const tok = src.slice(start, i);
        const key = formStart();
        let c = 'sym';
        if (tok === 'nil' || tok === 'true' || tok === 'false') c = 'lit';
        else if (tok[0] === ':') c = 'kw';
        else if (/^[+-]?\d/.test(tok)) c = 'num';
        push(tok, key && (c === 'kw' || c === 'sym') ? `${c} key` : c);
      }
      lastWs = i;
    }
    flushWs();
    return out;
  }

  // ---------------------------------------------------------------- lookup

  // Deepest node whose source span contains `offset`.
  function nodeAtSource(forms, offset) {
    let list = forms;
    let found = null;
    for (;;) {
      const hit = list.find((n) => n.start <= offset && offset < n.end);
      if (!hit) return found;
      found = hit;
      if (isColl(hit)) list = hit.children;
      else if (hit.t === 'meta') list = [hit.meta, hit.form];
      else if (hit.form) list = [hit.form];
      else return found;
    }
  }

  function describe(node) {
    if (!node) return null;
    const inner = node.t === 'meta' || node.t === 'tagged' || node.t === 'prefix' ? node.form : node;
    const kind = {
      map: 'map', vector: 'vector', list: 'list', set: 'set', keyword: 'keyword', symbol: 'symbol',
      string: 'string', number: 'number', char: 'char', nil: 'nil', boolean: 'boolean', regex: 'regex',
      comment: 'comment', discard: 'discarded'
    }[inner.t] || inner.t;
    let count = null;
    if (isColl(inner)) {
      const sig = inner.children.filter(isSignificant).length;
      count = inner.t === 'map' ? sig / 2 : sig;
    }
    return { kind, count, tag: node.t === 'tagged' ? node.tag : null };
  }

  // ---------------------------------------------------------------- JSON

  const KEYWORD_SAFE = /^[A-Za-z*+!_?<>=-][A-Za-z0-9*+!_?<>=.'-]*(?:\/[A-Za-z*+!_?<>=-][A-Za-z0-9*+!_?<>=.'-]*)?$/;

  // Is this text JSON that is not also EDN? Only objects and arrays count.
  function looksLikeJson(text) {
    const t = text.trim();
    if (!(t.startsWith('{') || t.startsWith('['))) return false;
    try { JSON.parse(t); return true; } catch (e) { return false; }
  }

  // JSON text -> EDN text. Object keys become keywords when they can be
  // written as one and stay strings otherwise; null becomes nil. Numbers
  // keep their source digits where the engine exposes them, so big integers
  // survive. Throws SyntaxError when the text is not JSON.
  function jsonToEdn(text) {
    const exact = new WeakSet();
    const value = JSON.parse(text, function (key, v, context) {
      if (typeof v === 'number' && context && typeof context.source === 'string') {
        const box = { source: context.source };
        exact.add(box);
        return box;
      }
      return v;
    });
    const emit = (v) => {
      if (v === null) return 'nil';
      if (typeof v === 'boolean') return String(v);
      if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'nil';
      if (typeof v === 'string') return JSON.stringify(v);
      if (exact.has(v)) return v.source;
      if (Array.isArray(v)) return '[' + v.map(emit).join(' ') + ']';
      return '{' + Object.keys(v).map((k) => (KEYWORD_SAFE.test(k) ? ':' + k : JSON.stringify(k)) + ' ' + emit(v[k])).join(' ') + '}';
    };
    return emit(value);
  }

  global.EDN = {
    parse, beautify, minify, tokenize, nodeAtSource, describe, EdnError, isColl, minifyText, lineCol,
    looksLikeJson, jsonToEdn
  };
})(typeof window !== 'undefined' ? window : globalThis);
