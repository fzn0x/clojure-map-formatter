'use strict';

// Run with: node --test tests/*.test.js   (Node 20+, no dependencies)

const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.window = globalThis;
require('../js/edn.js');
require('../js/examples.js');

const { parse, beautify, minify, tokenize, nodeAtSource, describe, looksLikeJson, jsonToEdn } = globalThis.EDN;

const pretty = (src, opts) => beautify(parse(src).forms, opts).text;
const mini = (src, opts) => minify(parse(src).forms, opts).text;
const errorOf = (src) => {
  try { parse(src); } catch (e) { return e; }
  assert.fail(`expected a parse error for ${src}`);
};

// ------------------------------------------------------------------ reading

test('reads every EDN collection and atom', () => {
  const { forms } = parse('{:a [1 2] :b (x y) :c #{:k} :d "s" :e \\c :f nil :g true :h 1/2 :i 1N :j 1.5M :k ##Inf :l sym :m :ns/kw}');
  assert.equal(forms.length, 1);
  assert.equal(forms[0].t, 'map');
  assert.equal(describe(forms[0]).count, 13);
});

test('reads tagged literals, metadata, discards and comments', () => {
  const src = '^{:doc "x"} {:at #inst "2024-01-01T00:00:00Z" :id #uuid "7d2f6c1e-3b8a-4c55-9e0d-2a6f1b9c4e71" #_ :gone :geo #geo/point [1 2]} ; tail';
  const { forms } = parse(src);
  assert.equal(forms.length, 2);
  assert.equal(forms[0].t, 'meta');
  assert.equal(forms[1].t, 'comment');
});

test('#_#_ discards two forms', () => {
  assert.equal(mini('{:a 1 #_#_ :b 2 :c 3}'), '{:a 1 :c 3}');
});

test('commas are whitespace', () => {
  assert.equal(mini('{:a 1, :b 2,}'), '{:a 1 :b 2}');
});

test('namespaced maps and reader conditionals', () => {
  assert.equal(mini('#:user{:id 1 :name "x"}'), '#:user{:id 1 :name "x"}');
  assert.equal(mini('#?(:clj 1 :cljs 2)'), '#?(:clj 1 :cljs 2)');
});

// ------------------------------------------------------------------ validation

test('errors name the line and column', () => {
  const e = errorOf('{:a 1\n :b [1 2}');
  assert.match(e.message, /Mismatched \}/);
  assert.equal(e.line, 2);
  assert.equal(e.col, 9);
});

test('unclosed collections point at the opening bracket', () => {
  const e = errorOf('{:a\n {:b 1}');
  assert.match(e.message, /Unclosed \{ opened on line 1/);
  assert.equal(e.line, 1);
});

test('a map key without a value is an error', () => {
  assert.match(errorOf('{:a 1 :b}').message, /odd number of forms/);
});

test('duplicate map keys and set elements are errors', () => {
  const k = errorOf('{:a 1\n :a 2}');
  assert.match(k.message, /Duplicate key :a: already used on line 1/);
  assert.equal(k.line, 2);
  assert.match(errorOf('#{1 2 1}').message, /Duplicate set element 1/);
  assert.match(errorOf('{{:x 1} 1 {:x 1} 2}').message, /Duplicate key \{:x 1\}/);
});

test('rejects malformed atoms and stray closers', () => {
  assert.match(errorOf('"open').message, /Unterminated string/);
  assert.match(errorOf('[1 2]]').message, /Unexpected \]/);
  assert.match(errorOf('12abc').message, /Invalid number/);
  assert.match(errorOf(':').message, /Invalid keyword/);
  assert.match(errorOf('\\nope').message, /Unsupported character/);
  assert.match(errorOf('#unknown').message, /Expected a value after the tag/);
});

// ------------------------------------------------------------------ beautify

test('aligns map values in a column', () => {
  assert.equal(pretty('{:id 1 :name "Ada" :roles #{:admin}}', { width: 20 }),
    '{:id    1\n :name  "Ada"\n :roles #{:admin}}');
});

test('alignment can be turned off', () => {
  assert.equal(pretty('{:id 1 :name "Ada" :roles #{:admin}}', { width: 20, align: false }),
    '{:id 1\n :name "Ada"\n :roles #{:admin}}');
});

test('collections that fit stay on one line', () => {
  assert.equal(pretty('{:a [1 2 3]   :b {:c 1}}', { width: 80 }), '{:a [1 2 3] :b {:c 1}}');
});

test('nested values hang beside their key by default', () => {
  assert.equal(pretty('{:user {:id 1 :name "Ada"}}', { width: 20 }),
    '{:user {:id   1\n        :name "Ada"}}');
});

test('nested "below" moves breaking collections under the key by the indent size', () => {
  const src = '{:user {:id 1 :name "Ada"}}';
  assert.equal(pretty(src, { width: 20, nested: 'below', indent: 2 }), '{:user\n   {:id   1\n    :name "Ada"}}');
  assert.equal(pretty(src, { width: 20, nested: 'below', indent: 4 }), '{:user\n     {:id   1\n      :name "Ada"}}');
});

test('indent sets the body indent of code-like lists', () => {
  assert.equal(pretty('(defn greet [name] (str "Hello, " name "!" "and more text here"))', { width: 30, indent: 4 }),
    '(defn greet\n    [name]\n    (str "Hello, "\n         name\n         "!"\n         "and more text here"))');
});

test('sorts keys on request, keeping comments with their entry', () => {
  assert.equal(pretty('{:b 2\n ;; about a\n :a 1}', { sortKeys: true }), '{;; about a\n :a 1\n :b 2}');
});

test('keeps comments, discards and blank-line groups', () => {
  assert.equal(pretty(';; head\n{:a 1 ; one\n\n :b #_2 3}', { width: 40 }),
    ';; head\n{:a 1 ; one\n\n :b #_2 3}');
});

test('strings and special characters survive byte for byte', () => {
  const src = '{:s "tab\\there \\"q\\" \\u00e9 ünï € 🚀" :c [\\a \\newline \\u2603 \\space]}';
  const out = pretty(src, { width: 30 });
  assert.ok(out.includes('"tab\\there \\"q\\" \\u00e9 ünï € 🚀"'));
  assert.ok(out.includes('\\a \\newline \\u2603 \\space'));
  assert.equal(mini(out), mini(src));
});

test('a multi-line string stays beside its key', () => {
  assert.equal(pretty('{:a 1 :text "line one\nline two"}', { width: 20 }), '{:a    1\n :text "line one\nline two"}');
});

test('hiccup-style vectors keep the tag and attributes together', () => {
  assert.equal(pretty('[:div {:class "card"} [:h2 "Title"] [:p "Body text"]]', { width: 30 }),
    '[:div {:class "card"}\n [:h2 "Title"]\n [:p "Body text"]]');
});

// ------------------------------------------------------------------ minify

test('minify drops whitespace only beside brackets', () => {
  assert.equal(mini('{:a [1 2] :b "x" :c #inst "2024" :d #{:k}}'), '{:a[1 2]:b "x" :c #inst "2024" :d #{:k}}');
});

test('minify removes comments and discarded forms', () => {
  const r = minify(parse(';; c\n{:a 1 ; c\n #_ :b :c 2}').forms);
  assert.equal(r.text, '{:a 1 :c 2}');
  assert.equal(r.stripped, 3);
});

test('beautified and minified output read back as the same data', () => {
  for (const ex of globalThis.EXAMPLES) {
    if (ex.id === 'broken') continue;
    const m = mini(ex.src);
    assert.equal(mini(pretty(ex.src, { width: 60 })), m, ex.id);
    assert.equal(mini(m), m, ex.id);
  }
});

test('the broken example really is broken', () => {
  const ex = globalThis.EXAMPLES.find((x) => x.id === 'broken');
  assert.match(errorOf(ex.src).message, /Mismatched/);
});

// ------------------------------------------------------------------ JSON

test('detects JSON objects and arrays only', () => {
  assert.equal(looksLikeJson('{"a": 1}'), true);
  assert.equal(looksLikeJson(' [1, 2] '), true);
  assert.equal(looksLikeJson('42'), false);
  assert.equal(looksLikeJson('{:a 1}'), false);
});

test('converts JSON to EDN', () => {
  assert.equal(jsonToEdn('{"id": 1, "first name": "Ada", "tags": ["a", null], "ok": true, "ns/key": 2.5}'),
    '{:id 1 "first name" "Ada" :tags ["a" nil] :ok true :ns/key 2.5}');
  assert.equal(mini(jsonToEdn('[{"a": {"b": []}}]')), '[{:a{:b[]}}]');
});

test('JSON big integers keep their digits where the engine allows', () => {
  const supportsSource = (() => {
    let seen = false;
    JSON.parse('1', (k, v, ctx) => { seen = !!(ctx && ctx.source); return v; });
    return seen;
  })();
  if (!supportsSource) return; // JSON.parse source text access landed in Node 21
  assert.equal(jsonToEdn('{"id": 9007199254740993}'), '{:id 9007199254740993}');
});

// ------------------------------------------------------------------ navigation

test('every node knows its get-in path', () => {
  const src = '{:user {:roles #{:admin :ops}} :cart [{:sku "x"}]}';
  const { forms } = parse(src);
  assert.deepEqual(nodeAtSource(forms, src.indexOf('#{')).path, [':user', ':roles']);
  assert.deepEqual(nodeAtSource(forms, src.indexOf('"x"')).path, [':cart', '0', ':sku']);
});

test('the input tokenizer marks map keys', () => {
  const keys = tokenize('{:a 1 :b {:c "x" "s" 2} ^:m :d #inst "2020" #_ :x :e #uuid "u"}')
    .filter((t) => t.c && t.c.includes('key'))
    .map((t) => t.s);
  assert.deepEqual(keys, [':a', ':b', ':c', '"s"', ':d', ':e']);
});

test('the tokenizer never throws on broken input', () => {
  const toks = tokenize('{:a [1 2} "unterminated');
  assert.ok(toks.some((t) => t.c === 'bad'));
  assert.equal(toks.map((t) => t.s).join(''), '{:a [1 2} "unterminated');
});
