# Selling Insert Generator — v1 SPA Spec

A **client-side single-page app** for generating thermal-printable 4×6 package insert PDFs for online seller storefronts. Fully configurable, runs entirely in the browser — no server required.

Deployed for free on Cloudflare Pages. All data persists in browser localStorage.

> **Context:** This is a pivot from the original FastAPI/Docker spec (`spec.md`). The decision to go client-side eliminates hosting costs and operational overhead entirely — no server to maintain, no Docker, no Python. The tradeoff is browser-local config (no cross-device sync in v1) and PNG/JPG-only logos (pdf-lib cannot render SVG).

---

## Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Build | **Vite** | Dev server + bundling; `dist/` deploys directly to Cloudflare Pages |
| PDF generation | **pdf-lib** | Pure JS, runs in browser, Courier fonts built-in as StandardFonts |
| Frontend | **Vanilla JS + CSS** | No framework; single HTML file with two views |
| Config persistence | **localStorage** | No server needed; survives page reloads |
| Logo storage | **localStorage** (base64 data URL) | Stored separately from config; max 500 KB |
| Deployment | **Cloudflare Pages** | Free tier, static hosting, zero configuration |

---

## Project Structure

```
selling-insert-generator/
├── index.html              # SPA entry point — contains both views (main + settings)
├── src/
│   ├── app.js              # Entry: view switching, event wiring, initialization
│   ├── config.js           # localStorage config CRUD, DEFAULT_CONFIG, validation
│   ├── preview.js          # HTML/CSS live preview rendering
│   ├── pdf-generator.js    # pdf-lib PDF generation + download trigger
│   └── style.css           # All styles
├── tests/
│   ├── config.test.js
│   └── pdf-generator.test.js
├── docs/
│   ├── spec.md             # Original FastAPI/Docker spec (reference)
│   └── spec-spa.md         # This document
├── package.json
├── vite.config.js
├── README.md
└── LICENSE
```

---

## Configuration Schema

Stored in `localStorage` under key `insertgen_config`. Logo stored separately under `insertgen_logo`.

```json
{
  "store_name": "Your Store Name",
  "platform": "eBay",
  "taglines": [
    "Inspected, tested, and packed with care.",
    "Thank you!"
  ],
  "footer_lines": [
    "Feedback appreciated",
    "Questions? Message us on {platform}"
  ],
  "colors": {
    "store_name": "#333333",
    "item_label": "#555555",
    "tagline": "#444444",
    "footer": "#444444",
    "border": "#000000",
    "divider": "#888888"
  },
  "page": {
    "width_inches": 4,
    "height_inches": 6
  }
}
```

### Config behavior

- `{platform}` token in `footer_lines` is replaced at render time.
- Logo is stored separately as a base64 data URL. Absent key = no logo — insert renders without the circle.
- `taglines`: 0–4 entries. Each on its own line below the item name.
- `footer_lines`: 0–3 entries. Each centered below the divider.
- Colors must be valid hex. UI warns (non-blocking) if any text color is lighter than `#666666`.
- Fonts fixed to Courier / Courier-Bold (pdf-lib `StandardFonts`). Not configurable in v1.
- `loadConfig()` deep-merges saved config with `DEFAULT_CONFIG` to handle schema evolution.

---

## Module API

### `src/config.js`

```js
DEFAULT_CONFIG          // default config object
loadConfig()            // → config (merged with defaults)
saveConfig(config)      // validates + writes localStorage; throws on invalid
resetConfig()           // clears key, returns DEFAULT_CONFIG
validateConfig(config)  // → { valid, errors[], warnings[] }
getLogoDataUrl()        // → string | null
saveLogoDataUrl(url)    // persist logo data URL
removeLogo()            // clear logo key
```

### `src/pdf-generator.js`

```js
generateInsertPdf(config, formData, logoDataUrl)  // → Promise<Uint8Array>
triggerDownload(pdfBytes, filename)               // browser download via Blob + <a>
```

`formData`: `{ item_name, order_number?, buyer_name?, custom_note? }`

### `src/preview.js`

```js
renderPreview(container, config, formData, logoDataUrl)  // mutates container DOM
```

---

## PDF Layout Spec

### Design constants

| Property | Value |
|----------|-------|
| Font family | Courier / Courier-Bold (pdf-lib StandardFonts) |
| Border | 2.5pt solid, `colors.border`, inset 0.15in |
| Content margin | 0.3in from page edge |
| Logo circle | 2.0pt stroke, `colors.border`, radius 0.65in, centered |
| Divider rule | 1.2pt, `colors.divider` |

### Thermal printing constraints

- No font below 8.5pt
- No line weight below 1.2pt
- UI warns (non-blocking) on text colors lighter than `#666666`
- Logo must be PNG or JPG — pdf-lib does not support SVG rendering

### Layout (top to bottom)

1. **Logo** — PNG/JPG inside a circle, centered. If absent, skip circle and shift content up.
2. **Store name** — Courier 11pt, centered, `colors.store_name`
3. **ITEM label** — Courier-Bold 10pt, left-aligned, `colors.item_label`
4. **Item name** — Courier-Bold 13pt, left-aligned, black
5. **Optional fields** — Courier 9pt, `colors.item_label`. Format: `ORDER: …`, `BUYER: …`, or raw note.
6. **Taglines** — Courier-Bold 10pt, left-aligned, `colors.tagline`
7. **Breathing room** — flexible space
8. **Divider rule** — full content width
9. **Footer lines** — Courier 8.5pt, centered, `colors.footer`. `{platform}` replaced.

### Y-positioning (PDF points, origin bottom-left, 72pt/inch)

Fixed offsets from top for items 1–6; fixed from bottom for 8–9. Breathing room absorbs the middle.

| Element | PDF Y (pt) |
|---------|-----------|
| Logo circle center | `PAGE_H - 32.4 - 46.8` |
| Store name (with logo) | `circle_cy - 46.8 - 17.28` |
| Store name (no logo) | `PAGE_H - BORDER_INSET - 0.45×72` |
| ITEM label | `store_y - 34.56` |
| Item name | `item_y - 19.44` |
| Optional fields | 14.4pt spacing each |
| Taglines | 12.96pt spacing |
| Divider | `BORDER_INSET + 39.6` = 50.4pt |
| Footer line 1 | `BORDER_INSET + 27.36` = 38.16pt |
| Footer line spacing | 11.52pt |

---

## Live Preview

- HTML/CSS replica (not PDF render). `<div>` with `aspect-ratio: 2/3`, elements positioned absolutely.
- Percentage-based positioning derived from PDF coordinates.
- Updates on every `input` event — no debounce.
- Logo rendered as `<img src="[dataUrl]">`.
- Font: `'Courier New', Courier, monospace`.
- Fidelity goal: confirm item name fits, layout looks right, optional fields appear correctly.

---

## Views

Both views in `index.html`. `data-view` attribute on `<body>` controls visibility via CSS.

### Main (`data-view="main"`)

Two-column desktop layout, stacked on mobile (≤768px).

- **Form:** item_name (required, max 80), order_number, buyer_name, custom_note (optional, max 60 each). Download PDF button (disabled until item_name non-empty).
- **Preview:** live HTML/CSS insert, `aspect-ratio: 2/3`, styled as thermal paper with decorative printer-feed strips.

### Settings (`data-view="settings"`)

Single-column, max-width ~720px.

- Store name, platform dropdown (eBay / Etsy / Mercari / Poshmark / Amazon / Facebook Marketplace / Other + freetext)
- Logo upload (PNG/JPG, max 500 KB) with thumbnail + remove button
- Taglines dynamic list (add/remove, max 4)
- Footer lines dynamic list (add/remove, max 3, `{platform}` token noted)
- 6 color pickers + hex inputs with thermal-safe warnings
- Page dimensions (width × height inches, 2–8 range)
- Save + Reset to Defaults (with `confirm()` guard)

---

## Input Validation

| Field | Rule |
|-------|------|
| `item_name` | Required, max 80 chars |
| `order_number`, `buyer_name`, `custom_note` | Optional, max 60 chars each |
| Logo | PNG or JPG only, max 500 KB |
| Colors | Valid hex (#rrggbb); warn if text color lighter than #666666 |
| Page dimensions | 2–8 inches |
| Taglines | Max 4 entries |
| Footer lines | Max 3 entries |

---

## Logo Handling

- **Formats:** PNG and JPG only. SVG not supported (pdf-lib limitation).
- **Max size:** 500 KB enforced at upload.
- **Storage:** base64 data URL in localStorage (`insertgen_logo`), separate from config.
- **PDF:** decoded to `Uint8Array` → `pdfDoc.embedPng()` or `pdfDoc.embedJpg()` → drawn scaled to 0.82in inside the circle.
- **Clipping:** pdf-lib has no circular clip path API. Logo corners may protrude beyond the circle. PNG with transparent background recommended.

---

## Deployment

### Cloudflare Pages

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | None |

`vite.config.js` sets `base: './'` — required for relative asset paths on Cloudflare Pages.

### Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest
npm run build    # → dist/
```

---

## Testing

| File | Coverage |
|------|----------|
| `tests/config.test.js` | DEFAULT_CONFIG shape, validateConfig (hex, dimensions, list limits, thermal warnings), loadConfig (defaults, merge, parse error), saveConfig (round-trip, throws), resetConfig, logo helpers — 18 tests |
| `tests/pdf-generator.test.js` | Returns Uint8Array, starts with %PDF, no-logo, all optional fields, empty arrays, platform token, custom dimensions, size comparison — 8 tests |

---

## Differences from Original FastAPI Spec

| Concern | Original (spec.md) | This spec |
|---------|-------------------|-----------|
| Runtime | Python / FastAPI / Docker | Browser-only |
| PDF library | ReportLab + svglib | pdf-lib (JS) |
| Logo formats | SVG + PNG | PNG + JPG only |
| Config storage | `data/config.json` on Docker volume | localStorage |
| Logo storage | `data/uploads/` directory | localStorage (base64) |
| Cross-device sync | Yes (shared volume) | No (v1 limitation) |
| Hosting cost | Self-hosted server | Free (Cloudflare Pages) |
| Build step | None (FastAPI serves templates) | Vite |

---

## What's NOT in v1 (deferred)

- Batch mode (N items → multi-page PDF)
- Multi-store profiles
- SVG logo support
- Cloud config sync / cross-device settings
- Direct thermal printer integration
- QR codes
- Order import from platform APIs
