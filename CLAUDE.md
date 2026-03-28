# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (hot reload)
npm run build      # Production build → dist/
npm run preview    # Serve production build locally
npm test           # Run all tests with Vitest
```

To run a single test file:
```bash
npx vitest run tests/config.test.js
```

## Architecture

This is a fully client-side SPA — no backend, no API calls. Everything runs in the browser.

**Module responsibilities:**

- `src/app.js` — UI controller: event handlers, form collection, orchestrates the other modules
- `src/config.js` — Config schema, validation, and localStorage persistence (`insertgen_config`, `insertgen_logo`)
- `src/pdf-generator.js` — Generates PDF bytes using pdf-lib; called on download button click
- `src/preview.js` — Renders a live HTML/CSS preview that mirrors the PDF layout

**Data flow:**

1. User fills form → `app.js` collects values → calls `renderPreview()` on every change
2. `preview.js` converts PDF coordinate space (points, bottom-left origin) to CSS percentages
3. On download: `app.js` calls `generateInsertPdf()` → pdf-lib creates bytes → blob download
4. Settings form → `config.js` validates → saved to localStorage

**Key constraints to maintain:**

- The PDF and HTML preview must stay visually synchronized. `preview.js` uses the same measurements (4×6 in, 72 pt/in) as `pdf-generator.js`. Changes to layout in one must be mirrored in the other.
- `config.js` is the single source of truth for the config schema and validation rules. Thermal color warnings (lightness < `#666666`), page dimension limits (2–8 in), tagline limits (0–4), footer limits (0–3) are all enforced there.
- The `{platform}` token in footer lines is replaced at render time in both `pdf-generator.js` and `preview.js`.
- Logo images are stored as base64 data URLs in localStorage under `insertgen_logo` (separate from config JSON to avoid size issues).

**Output format:** 4×6 inch thermal-printable PDF, Courier font, minimum 1.2 pt line weights. pdf-lib is the only production dependency.
