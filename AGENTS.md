# AGENTS.md

Repository instructions for AI coding agents working in this project.

## Commands

```bash
npm run dev        # Start Vite dev server with hot reload
npm run build      # Production build to dist/
npm run preview    # Serve production build locally
npm test           # Run all tests with Vitest
npm run lint       # Lint src/ and tests/
```

To run a single test file:

```bash
npx vitest run tests/config.test.js
```

## Architecture

This is a fully client-side SPA. There is no backend and there are no API calls. Everything runs in the browser.

Module responsibilities:

- `src/app.js` - UI controller: event handlers, form collection, orchestrates the other modules
- `src/config.js` - Config schema, validation, and localStorage persistence (`insertgen_config`, `insertgen_logo`)
- `src/pdf-generator.js` - Generates PDF bytes using pdf-lib; called on download button click
- `src/preview.js` - Renders a live HTML/CSS preview that mirrors the PDF layout

Data flow:

1. User fills form; `app.js` collects values and calls `renderPreview()` on every change.
2. `preview.js` converts PDF coordinate space, in points with a bottom-left origin, to CSS percentages.
3. On download, `app.js` calls `generateInsertPdf()`, pdf-lib creates bytes, and the app triggers a blob download.
4. Settings form values are validated by `config.js` and saved to localStorage.

## Constraints

- The PDF and HTML preview must stay visually synchronized. `preview.js` uses the same measurements, 4 x 6 inches and 72 pt/in, as `pdf-generator.js`. Changes to layout in one must be mirrored in the other.
- `config.js` is the single source of truth for the config schema and validation rules. Thermal color warnings, page dimension limits, tagline limits, and footer limits are enforced there.
- The `{platform}` token in footer lines is replaced at render time in both `pdf-generator.js` and `preview.js`.
- Logo images are stored as base64 data URLs in localStorage under `insertgen_logo`, separate from config JSON to avoid size issues.
- Output format is a 4 x 6 inch thermal-printable PDF using Courier fonts and minimum 1.2 pt line weights. pdf-lib is the only production dependency for PDF generation.
- The app shell UI uses `@ajustinjames/hardline-components`, `@ajustinjames/hardline-tokens`, and `lucide` as production dependencies for layout, theming, and icons. New UI dependencies are acceptable when they serve the app shell; PDF generation must remain pdf-lib only.
- New behavior in `app.js` (e.g. theme toggling, button state helpers, dynamic list management) should be covered by tests alongside the existing config/pdf-generator suites.
