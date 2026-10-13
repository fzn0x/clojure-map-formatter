# Clojure Map Formatter

Format and beautify Clojure maps with proper indentation, or minify them for production. Works with nested maps, vectors, lists, and the rest of EDN.

**[Open the formatter →](https://fzn0x.github.io/clojure-map-formatter/)**

![Clojure Map Formatter: a pasted REPL dump on the left, the same map beautified with aligned values on the right, and a yellow sign above the output showing the get-in path [:user :roles]](docs/screenshot.png)

It's a code playground for Clojure data. Paste a one-line REPL dump, a `deps.edn`, or an API response, and read it aligned the way you'd write it by hand. Or squeeze it down to the fewest bytes any EDN reader will accept. Everything runs in your browser; nothing you paste leaves the page.

## Features

- **Beautify** with proper indentation. Map values line up in a column, collections stay on one line while they fit, and code-like lists such as `(defn …)` get body indentation.
- **Minify** for production. Comments and `#_` forms are removed, and whitespace is dropped only beside brackets, so every EDN reader reads the result back as the same data.
- **Nested maps, vectors, lists and sets**, plus the rest of EDN: keywords and namespaced keywords, symbols, strings, characters, ratios, `N`/`M` numbers, `##Inf`, tagged literals (`#inst`, `#uuid`, custom tags), metadata, `#:ns{}` maps, reader conditionals, `#_` discards and `;` comments.
- **Strings and special characters stay intact.** Escapes, Unicode, emoji, character literals and multi-line strings come out byte for byte.
- **Customizable indentation.** Choose indent size 1, 2 or 4, nest collections beside or below their key, turn value alignment on or off, set the line width (or let it fit the pane), and sort map keys.
- **Syntax validation with locations.** It catches unbalanced and mismatched brackets, unterminated strings, keys without values, duplicate map keys and set elements, and malformed numbers, keywords and characters. Each error names its line and column, and you can jump to it.
- **JSON to EDN.** Paste JSON and the output shows it as EDN: keys become keywords, `null` becomes `nil`, and big integers keep their digits.
- **Find your way in big data.** Move the caret in the input or point at anything in the output, and a sign shows its `get-in` path (`[:user :roles]`), what it is, and which way to scroll. Click a path segment to jump to that level.
- **Files and sharing.** Open or drop `.edn`, `.clj`, `.cljs` and `.json` files, download the output as `.edn`, or copy a share link. The link carries your input inside the URL itself, with no server involved.
- **Built-in examples.** Eight examples show input and output side by side, including one that's broken on purpose so you can see the error reporting.
- Day and night themes, keyboard shortcuts, and a layout that works on phones.

### Keyboard shortcuts

| Keys | Action |
| --- | --- |
| <kbd>Alt</kbd> <kbd>B</kbd> | Beautify |
| <kbd>Alt</kbd> <kbd>M</kbd> | Minify |
| <kbd>Alt</kbd> <kbd>C</kbd> | Copy output |
| <kbd>Tab</kbd> | Indent inside the input editor (<kbd>Esc</kbd> then <kbd>Tab</kbd> moves focus on) |

## Example

Input, straight out of `prn`:

```clojure
{:user {:id 42, :email "ada@example.com", :roles #{:admin :billing}, :prefs {:theme :dark, :notify? true}}, :status :active}
```

Beautified (width 60):

```clojure
{:user   {:id    42
          :email "ada@example.com"
          :roles #{:admin :billing}
          :prefs {:theme :dark :notify? true}}
 :status :active}
```

Minified:

```clojure
{:user{:id 42 :email "ada@example.com" :roles #{:admin :billing}:prefs{:theme :dark :notify? true}}:status :active}
```

## Run it locally

There is no build step and there are no dependencies. Clone the repository and open `index.html` in a browser:

```sh
git clone https://github.com/fzn0x/clojure-map-formatter.git
cd clojure-map-formatter
# open index.html, or serve the folder:
python -m http.server 8000   # then visit http://localhost:8000
```

Any static host works the same way: GitHub Pages, Netlify, Vercel, or an S3 bucket.

## Development

```sh
npm test      # or: node --test tests/*.test.js   (Node 20+)
```

| Path | What it holds |
| --- | --- |
| `index.html` | The page: markup, icon sprite, and the Content-Security-Policy |
| `js/edn.js` | The EDN reader, beautifier, minifier, JSON converter and input tokenizer. No DOM access, so it's tested directly in Node |
| `js/app.js` | The playground UI: editors, sign, options, files, sharing, themes |
| `js/examples.js` | The example roster |
| `css/styles.css` | Tokens, components, themes and responsive rules |
| `css/fonts.css` | Font faces, with the Latin subsets embedded so the page renders from `file://` |
| `tests/` | Unit tests for the engine, using Node's built-in test runner |
| `DESIGN.md` | The design system (palette, type, components, rules) |

The scripts are plain classic scripts, not ES modules, so the page keeps working when you open it straight from disk.

## Contributing

Bug reports, ideas and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first. To report a security problem, follow [SECURITY.md](SECURITY.md) rather than opening a public issue.

## Privacy

The formatter makes no network requests. Parsing, formatting, file opening and share links all happen inside the page. The only things it stores are your last input and settings, in your browser's `localStorage`.

## License

[MIT](LICENSE) © fzn0x

Bundled fonts: [Signika](https://github.com/googlefonts/Signika) and [Atkinson Hyperlegible Mono](https://github.com/googlefonts/atkinson-hyperlegible-next-mono), both under the [SIL Open Font License 1.1](fonts/). This project isn't affiliated with Clojure or its maintainers.
