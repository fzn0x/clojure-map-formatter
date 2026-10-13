---
name: Clojure Map Formatter
description: An EDN playground dressed as an airport wayfinding sign system, in a yellow day livery and a black night livery.
colors:
  sign-yellow: "#FFCC00"
  sign-yellow-lift: "#FFD84A"
  sign-black: "#0B0B0B"
  sign-white: "#FFFFFF"
  sign-ink-umber: "#4A3B00"
  night-shell: "#111111"
  night-ink: "#F2F2F2"
  night-ink-muted: "#A9A9A9"
  night-rule: "#2C2C2C"
  panel-gutter: "#141414"
  panel-rule: "#262626"
  night-panel: "#070707"
  night-gutter: "#0F0F0F"
  code-text: "#E8E8E8"
  code-dim: "#8C8C8C"
  code-line-number: "#6E6E6E"
  syntax-keyword: "#8FC8FF"
  syntax-number: "#7FE0A4"
  syntax-literal: "#FF9E7A"
  syntax-symbol: "#BFC6CE"
  syntax-tag: "#D6B8FF"
  syntax-comment: "#8F8F8F"
  syntax-discard: "#767676"
  syntax-bracket: "#8A8A8A"
  alert-red: "#FF6A5C"
  route-tint: "rgba(255, 204, 0, 0.16)"
typography:
  display:
    fontFamily: "Signika, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "50px"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.03em"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  headline:
    fontFamily: "Signika, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(28px, 3.4vw, 44px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Signika, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.2
  sign-path:
    fontFamily: "Atkinson Mono, ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: "28px"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Signika, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "\"tnum\" 1"
  label:
    fontFamily: "Signika, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.2
  code:
    fontFamily: "Atkinson Mono, ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
    letterSpacing: "0"
    fontFeature: "\"tnum\" 0, \"calt\" 0"
  code-chip:
    fontFamily: "Atkinson Mono, ui-monospace, Cascadia Mono, Consolas, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
rounded:
  hair: "2px"
  sign: "3px"
  control: "4px"
  panel: "6px"
  switch: "11px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-yellow}"
    rounded: "{rounded.control}"
    padding: "0 14px 0 4px"
    height: "40px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.panel-rule}"
    textColor: "{colors.sign-yellow}"
  button-primary-night:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.sign-black}"
  button-primary-night-hover:
    backgroundColor: "{colors.sign-yellow-lift}"
  button-outline:
    textColor: "{colors.sign-black}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
    typography: "{typography.label}"
  button-small:
    textColor: "{colors.sign-black}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  segment-selected:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-yellow}"
    height: "42px"
    padding: "0 18px 0 14px"
  example-sign:
    textColor: "{colors.sign-black}"
    padding: "11px 16px"
  example-sign-active:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-yellow}"
  code-chip:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-white}"
    rounded: "{rounded.control}"
    size: "48px"
    typography: "{typography.code-chip}"
  pictogram-square:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-yellow}"
    rounded: "{rounded.sign}"
    size: "30px"
  code-panel:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.code-text}"
    rounded: "{rounded.panel}"
    typography: "{typography.code}"
  sign-band:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.sign-black}"
    rounded: "{rounded.sign}"
    padding: "10px 16px 10px 10px"
    height: "78px"
  sign-arrow:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-white}"
    rounded: "{rounded.sign}"
    size: "52px"
  edge-cue:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.sign-black}"
    rounded: "{rounded.sign}"
    size: "30px"
  toast:
    backgroundColor: "{colors.sign-black}"
    textColor: "{colors.sign-white}"
    rounded: "{rounded.control}"
    padding: "8px 10px 8px 8px"
  status-bar:
    textColor: "{colors.sign-black}"
    padding: "6px 16px"
    height: "36px"
---

# Design System: Clojure Map Formatter

## Overview

**Creative North Star: "Terminal Yellow"**

The interface is an airport wayfinding system applied to a code playground. The shell is the sign panel: in the day theme it is flat sign yellow carrying black type and black controls; in the night theme it goes near-black and the signs stay backlit yellow. Code lives on black inset backplates, the way flight boards sit inside a terminal wall. Everything that tells you where you are (the get-in path, the active route through the output, the direction to scroll) speaks in yellow and black, at sign scale, in a face drawn for wayfinding.

Density is operational, not editorial: a fixed-height app frame (top bar, example rail, two working panes, status bar) fills the viewport, and the explanatory directory sign sits below the fold. Controls are outlined in heavy 2px ink, filled solid when selected, and squared off with small corners. Pictograms always sit in a solid square, and arrows point at the edge they lead past. Motion is short and vertical: a split-flap roll when the sign changes, a brief flash when the output jumps to a form, nothing ambient.

**Key Characteristics:**
- Two liveries from one token set: yellow shell by day, black shell by night, with the sign band, code chips and code panels unchanged between them.
- Code on black backplates with a recessed gutter; line numbers become a solid yellow route bar on the active form.
- Signika for every interface word, at monumental scale for counts; Atkinson Hyperlegible Mono for code, paths and chip codes.
- Pictograms in solid squares; arrows rotate to point up, down or right toward the edge the target lies past.
- Flat, ink-ruled surfaces. Depth comes from inset black panels and solid fills, not shadow.

## Colors

A two-ink sign palette (yellow and black) with a cool, low-chroma syntax set confined to the code backplates.

### Primary
- **Sign Yellow** (`sign-yellow`): the day shell, the sign band above the output, the active route bar in the output gutter, map keys in code, the caret, focus rings inside code panels, and the night-theme filled controls. It is the colour of "you are here".
- **Lift Yellow** (`sign-yellow-lift`): hover state of filled controls in the night theme only.

### Neutral
- **Sign Black** (`sign-black`): all day-theme text and 2px control outlines, filled controls on the yellow shell, the code backplates, code chips, pictogram squares, and the toast.
- **Sign White** (`sign-white`): pictograms and chip codes on black squares, strings in code, toast text.
- **Umber Ink** (`sign-ink-umber`): secondary text on yellow (sub-lines, notes, sign meta, byte counts). Tinted from the yellow rather than a grey so it stays legible and warm on the panel.
- **Night Shell / Night Ink / Night Muted / Night Rule** (`night-shell`, `night-ink`, `night-ink-muted`, `night-rule`): the night livery's ground, primary text, secondary text, and hairline rules.
- **Panel Gutter / Panel Rule** (`panel-gutter`, `panel-rule`): the recessed line-number gutter and its 1px divider inside code panels; `panel-rule` also outlines night panels and is the day primary-button hover. Night uses the deeper `night-panel` and `night-gutter`.
- **Code Text / Code Dim / Line Number** (`code-text`, `code-dim`, `code-line-number`): default code, placeholders and empty-state sub-lines, and gutter numerals.

### Syntax (code panels only)
- **Keyword Blue** (`syntax-keyword`): keywords that are not map keys, and inline `code` in the directory sign.
- **Number Green** (`syntax-number`): numbers and characters.
- **Literal Coral** (`syntax-literal`): `nil`, booleans, `##Inf`, regexes.
- **Symbol Steel** (`syntax-symbol`), **Tag Lilac** (`syntax-tag`, tagged literals and metadata), **Comment Grey** (`syntax-comment`, italic), **Discard Grey** (`syntax-discard`, struck through), **Bracket Grey** (`syntax-bracket`).
- Map keys take Sign Yellow; namespaces are dimmed to 68% opacity.

### Alert
- **Alert Red** (`alert-red`): parse errors only. It fills the error line number (black numeral on red), the bad token, the status-bar square, and the wavy underline at the error; the error line in output carries a 14% red wash. The sign band stays yellow in error and turns its arrow square's pictogram red.

### Named Rules
**The Wayfinding Yellow Rule.** Inside the code panels yellow means only one thing: where you are or what is a key. It marks map keys, the active route (gutter bar, 16% `route-tint` wash with a 45% yellow hairline), the caret, the focus ring, and the edge cue. It is never a decorative highlight.

**The Two Liveries Rule.** Themes swap the shell, not the signs. The sign band, code chips, edge cue, toast, and code backplates keep the same colours in both themes; only the shell tokens and filled-control polarity invert (black-on-yellow by day, yellow-on-black by night).

## Typography

**Display Font:** Signika (with Segoe UI, system-ui)
**Body Font:** Signika (with Segoe UI, system-ui)
**Label/Mono Font:** Atkinson Hyperlegible Mono, self-hosted as "Atkinson Mono" (with ui-monospace, Cascadia Mono, Consolas)

**Character:** A humanist wayfinding sans set mostly at 600 to 700, paired with a legibility-first mono. The sans carries every word of interface; the mono carries every character of data, including the path on the sign and the codes in example chips.

### Hierarchy
- **Display** (700, 50px, 0.9, -0.03em, tabular lining figures): the monumental count in the sign band (line count, or the Minify percentage). Steps to 42px at 1240px and 34px at 560px.
- **Headline** (700, clamp(28px, 3.4vw, 44px), 1.05, balanced): the directory-sign heading below the app. The 30px empty-state line is the in-panel equivalent.
- **Title** (700, 19px): pane titles; brand name at 21px, rail title at 17px, directory row labels at 20px in yellow.
- **Sign path** (mono 700, 21px / 28px, -0.02em): the get-in path in the sign band; 18px on phones. Error messages in the sign switch to Signika 19px and wrap.
- **Body** (400, 15px, 1.45): base text, buttons at 600. Directory prose at 16px / 1.55, capped at 68ch.
- **Label** (600, 14px): option labels, small buttons, status bar (500), pane hints and sign meta in secondary ink at 13 to 15px.
- **Code** (mono 400, 14px / 22px; 13px / 21px under 560px): input and output, ligatures and contextual alternates off, tab size 2. Gutter numerals at 12.5px.
- **Code chip** (mono 700, 13px, -0.02em): codes in example chips, indent segments, width select, `kbd`.

### Named Rules
**The Steady Numerals Rule.** Any number that changes in place (stats, sign meta, status counts, gutter numbers, toast text) uses tabular lining figures so nothing shifts as you type.

**The Mono Means Data Rule.** Anything the visitor could paste back into Clojure is set in the mono; anything that describes it is set in Signika.

## Layout

A fixed app frame fills the viewport (`100dvh`, min 600px): a grid of top bar, a 264px example rail beside the work area, and a status bar, all on the shell. The work area splits Input and Output about 0.78 / 1.22 with a 12px gap, giving Output room for aligned values at Fit width. Each pane has a header strip (min 52px) with its pictogram square and title on the left and actions or options pushed right, above a black panel that fills the rest of the height and scrolls internally. The directory sign (max 1120px, centred, 56px top padding) follows below the frame.

Spacing steps in 6, 8, 12, 16 and 24px; 16px is the shell's edge inset and 12px the gap between panels and chips. Rules are ink hairlines: 2px under the top bar and above the directory, 1px for rail dividers and the status bar.

Responsive behaviour:
- **≤1240px:** brand sub-line drops; the sign stat steps down to 42px.
- **≤1100px:** the rail becomes a horizontal, scrolling strip of outlined chips (34px code square plus title); notes and the sign's Copy path drop.
- **≤820px:** the frame releases and the page scrolls. The mode switch takes a full-width row, panes stack (Input 42vh, Output 70vh), options wrap under the Output title, directory rows stack.
- **≤560px:** code drops to 13px / 21px, Share and Copy collapse to 40px icon buttons, the sign stat moves to its own row under a 2px black rule.
- Safe-area insets pad the top bar, status bar, toast and directory.

## Elevation & Depth

The system is flat. Depth is expressed by insetting: black code backplates sit into the shell, the line-number gutter is a darker strip inside them, and the sign band sits as a solid yellow plate at the top of the output panel. State is shown by filling (outline to solid), never by lifting. In the night theme the panels gain a 1px `panel-rule` outline so the black backplate still reads against the black shell.

### Shadow Vocabulary
- **Toast float** (`box-shadow: 0 10px 30px -8px rgba(0, 0, 0, .5)`): the one shadow, on the transient toast, because it floats over content.
- **Route hairline** (`box-shadow: 0 0 0 1px rgba(255, 204, 0, .45)`): outlines the active route in the output. A ring, not elevation.

### Named Rules
**The Inset Not Lifted Rule.** Surfaces at rest are flat; panels recede into the shell rather than float above it. Only the toast, which is temporarily on top of everything, casts a shadow.

## Shapes

Small, square-shouldered corners: 2px on inner details (button squares, status square, route marks, bad tokens), 3px on the sign band, its arrow square, pictogram squares, and compact controls, 4px on buttons, segments, chips and the toast, 6px on code panels and the directory. The only round forms are the toggle switch (11px pill with a circular knob) and the scrollbar thumb. Squares are the signature silhouette: brand mark, pictograms, code chips, the arrow and the edge cue are all solid squares holding a single SVG pictogram or a short code. Keycaps carry a 3px bottom border, as physical keys do.

## Components

### Buttons
Heavy-outlined sign controls that fill solid when they matter.
- **Shape:** 4px corners, 2px ink outline, 40px tall (32px small with a 1.5px outline).
- **Primary (Copy output):** solid fill in the filled-control colour (black by day, yellow by night) with an inset 28px outlined square holding the pictogram; 4px left padding so the square sits near the edge.
- **Outline:** transparent with an ink outline; hover adds an 8% ink wash, press 14% and a 1px drop.
- **Icon:** 40px square, used for the theme toggle.
- **Focus:** a 3px ink outline offset 2px on the shell; yellow inside code panels.
- **Disabled:** 45% opacity.

### Segmented controls
- **Mode (Beautify | Minify):** 42px tall, 16px/600 with a pictogram, joined outlines; the selected option fills solid. Full width on phones.
- **Indent (1 | 2 | 4):** 28px mono 700 segments with a 1.5px outline and 3px outer corners.

### Switches and selects
- **Switch:** 36 by 22px pill, 2px ink outline, ink knob; checked fills with the filled-control colour and the knob takes its ink.
- **Select:** 28px, 1.5px outline, 3px corners, mono 700, with a drawn SVG chevron that recolours per theme.
- **Off state:** options that do not apply (Minify mode) sit at 42% opacity with a not-allowed cursor.

### Example signs (rail)
A list of signs: a 48px black code chip (mono code or a pictogram in white), a 16px/600 title, and a one-line note in secondary ink, separated by 1px rules. Hover washes 8% ink; the active example fills solid with the chip inverting. Below 1100px they become outlined horizontal chips.

### Code panels
- **Corner Style:** 6px.
- **Background:** sign black (night: deeper black plus a 1px outline).
- **Gutter:** 48px recessed strip with a 1px rule and right-aligned 12.5px numerals; sticky on horizontal scroll in Output.
- **Input:** a transparent textarea over a highlighted mirror; yellow caret; a 2px yellow inner border on focus.
- **Error:** the error line number becomes a red badge, the bad token gets a red fill or a wavy red underline, and the output shows an excerpt with a red wash and a red caret marker.
- **Stale:** output fades to 32% and desaturates while the input is mid-error.

### Sign band (signature)
A yellow plate at the top of the output: a 52px black arrow square, the get-in path in 21px bold mono over a meta line (kind, size, line), an outlined Copy path button, and the monumental stat after a 2px black rule. The arrow rotates to point up, down or right depending on where the form lies relative to the visible output; clicking it scrolls there and flashes the route. Path segments are buttons that underline on hover and step out to that level. When the content changes, the body rolls in from below in a 200ms split-flap swap (none under reduced motion). In error it shows the message in Signika with a red alert pictogram.

### Edge cue
A 56px strip pinned to the right edge of the output, fading from transparent into the panel colour, holding a 30px yellow square with a black right arrow. It appears only while output continues past the right edge, and clicking it scrolls 60% of a panel width. It is pointer-only (`tabindex="-1"`): the output region itself is focusable and scrolls with the keyboard.

### Route marking
The form under the caret or pointer is marked in the output: its gutter numbers become a solid yellow bar with black bold numerals, its text gets the 16% yellow wash with a 45% yellow hairline, and its brackets turn yellow at 800 weight. Jumping to a form flashes the wash to 55% for 900ms.

### Status bar
36px, 1px top rule, 14px/500 on the shell: a 20px square (check, or red alert) with the validity message, bytes in to out with the percentage, caret position, and the local-only note. In error, a bold underlined link jumps to the error.

### Toast
Black, 4px corners, centred above the status bar: a 30px yellow pictogram square, 15px/500 text, and an optional yellow-outlined action (Undo, Show error). Slides up 12px over 220ms.

### Directory sign
The explanatory section below the app is a black board of rows: yellow pictogram square plus a 20px yellow label on the left (240px column), 16px prose on the right, inline code in keyword blue on a raised dark chip, and keycaps outlined in grey with a 3px bottom edge.

## Do's and Don'ts

### Do:
- **Do** put every pictogram in a solid square (black with yellow or white by day, yellow with black on dark grounds) and draw it as inline SVG.
- **Do** point arrows at the edge the target lies past: up and down for off-screen forms, right for in-view or overflowing content.
- **Do** show selection by filling a control solid in the filled-control colour, with its ink inverting.
- **Do** keep code on black backplates in both themes, with map keys in Sign Yellow and the syntax colours listed above.
- **Do** use tabular lining figures for any number that updates live.
- **Do** keep motion to short vertical swaps and flashes (140 to 220ms, `cubic-bezier(.2, .8, .2, 1)` or `cubic-bezier(.16, 1, .3, 1)`), all collapsed under reduced motion.

### Don't:
- **Don't** use yellow inside code panels for anything but keys, the active route, the caret, focus, and the edge cue.
- **Don't** change the sign band, code chips, or code panels between themes; only the shell and the filled-control polarity swap.
- **Don't** add shadows to resting surfaces; the toast is the only floating element.
- **Don't** round corners past 6px, except the toggle switch.
- **Don't** set data in Signika or interface prose in the mono.
