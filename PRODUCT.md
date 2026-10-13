# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS. No build step, no runtime dependencies; deployable to any static host by copying the folder.

## Users

Clojure and ClojureScript developers, in four situations (all confirmed):

- Reading REPL or log dumps: a huge single-line map pasted from a REPL, log line, or API response that needs to become readable.
- Tidying config EDN: cleaning up `deps.edn`, `shadow-cljs.edn`, or app config before committing.
- Minifying payloads: shrinking EDN for transport, fixtures, or embedding inside strings.
- Learning and sharing: showing what Clojure data looks like, or producing a formatted snippet to paste elsewhere.

## Product Purpose

Format and beautify Clojure data with proper indentation, or minify it for production. Works with nested maps, vectors, lists, and the rest of EDN. Success means pasting messy data and getting correct, idiomatic output immediately, without installing anything or leaving the browser.

## Positioning

A dedicated playground for Clojure *data* (EDN), not a general code formatter: it understands EDN's reader syntax fully and lays out maps the way Clojure developers write them, including aligned map values.

## Operating Context

Used alongside an editor, REPL, terminal, or log viewer; input arrives by paste and output leaves by copy. The page itself is shaped like a code playground: input editor, output editor, controls, and example data to try.

## Capabilities and Constraints

- Input: full EDN: maps, vectors, lists, sets `#{}`, keywords and namespaced keywords, symbols, strings, characters, numbers (ints, ratios, bigint/bigdec suffixes), `nil`/booleans, tagged literals (`#inst`, `#uuid`, custom), metadata `^`, `#_` discard, and `;` comments.
- Output modes: beautify and minify.
- Beautify is configurable: aligned map values by default, with options to turn alignment off and to set indent width (1/2/4), line width, and sorted keys.
- Parse errors must point to a location in the input.
- Runs fully client-side. Nothing is sent anywhere.
- Ships with example inputs and their outputs so the tool demonstrates itself.

## Evidence on Hand

None. No users, testimonials, metrics, or adoption figures exist; do not fabricate any.

## Product Principles

1. Correctness over cleverness: output must read back as the same data, and comments and tagged literals survive.
2. Paste to answer in one motion: no setup or submit ritual, so formatting happens as you type.
3. Idiomatic output: lay data out the way experienced Clojure developers would by hand.
4. Private by construction: everything runs locally in the page.
