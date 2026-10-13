# Contributing

Thanks for helping improve Clojure Map Formatter. This guide covers how to report problems, propose changes, and get a pull request merged.

## Ways to help

- **Report a bug.** Open an issue with the input that misbehaves, what you expected, and what you got. A failing input is the most useful thing you can send. If it's sensitive, trim it down to a synthetic one that still fails.
- **Suggest a feature.** Open an issue that describes the problem you're trying to solve before you write code, so we can agree on the approach.
- **Improve the docs or the examples.** Small fixes can go straight to a pull request.
- **Report a security problem** privately, as described in [SECURITY.md](SECURITY.md). Please don't use a public issue.

## Development setup

You need a browser, and Node.js 20 or newer to run the tests. There's nothing to install.

```sh
git clone https://github.com/fzn0x/clojure-map-formatter.git
cd clojure-map-formatter
npm test                     # or: node --test tests/*.test.js
python -m http.server 8000   # optional: serve the folder at http://localhost:8000
```

Opening `index.html` straight from disk works too. Keep it that way; see the constraints below.

## Project layout

- `js/edn.js`: the engine (reader, beautifier, minifier, JSON converter, input tokenizer). It has no DOM access. Most changes to formatting behaviour belong here, along with a test.
- `js/app.js`: the playground UI.
- `js/examples.js`: the example roster. Examples are synthetic; use `example.com` addresses and made-up data only.
- `css/styles.css`: design tokens, components, themes and breakpoints.
- `tests/edn.test.js`: engine tests, run with Node's built-in `node:test`.
- `DESIGN.md`: the design system. Read it before changing anything visual.

## Ground rules

These constraints keep the tool simple, private and easy to host:

1. **No build step and no runtime dependencies.** The site is static files.
2. **Classic scripts, not ES modules.** Browsers block module scripts on `file://`, and opening `index.html` directly must keep working.
3. **No network requests at runtime.** Don't add CDNs, analytics, web fonts from third-party hosts, or remote APIs. User data never leaves the page.
4. **Respect the Content-Security-Policy** in `index.html`. That means no inline `<script>` blocks, no inline `style="…"` attributes in markup, and no `eval`. Put code in `js/` and styles in `css/`.
5. **Escape everything that reaches `innerHTML`.** Input is untrusted. Use the existing `esc()` helper, or `textContent`.
6. **Output must read back as the same data.** Beautify and minify may change whitespace and layout, never meaning. The round-trip test enforces this; add your case to it when you touch the printer.
7. **Accessibility is part of done.** Every control is reachable by keyboard and has a visible focus state and an accessible name. Motion respects `prefers-reduced-motion`.
8. **Follow the design system.** Yellow is reserved for wayfinding: map keys, the active route, and the sign. New UI reuses the tokens and components in `DESIGN.md`.

## Making a change

1. Fork the repository and create a branch from `main`, for example `fix/odd-map-error` or `feat/edn-sets-sort`.
2. Make your change. Add or update tests in `tests/` for any engine behaviour.
3. Run `npm test` and make sure everything passes.
4. Check the page by hand in a browser: both themes (the moon/sun button), a narrow window (about 390px wide), and the "Broken on purpose" example for error states.
5. Open a pull request against `main` and fill in the template. Describe what changed and why, and attach a screenshot for visual changes.

Keep pull requests focused: one fix or feature each. Use plain, imperative commit messages, such as `Keep #_ forms between a key and its value`.

## Code style

- Two-space indentation, semicolons, single quotes, and `const`/`let` (never `var` in new code). `.editorconfig` covers the basics.
- Keep functions small and name them for what they do. Add a comment where the *why* isn't obvious from the code.
- Match the surrounding code rather than introducing a new pattern.

## Conduct

Be kind and assume good faith. Harassment, insults and personal attacks aren't welcome in issues, pull requests or discussions. The maintainer may remove comments or block participants who don't follow this.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
