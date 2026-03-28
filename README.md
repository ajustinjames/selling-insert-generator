# Selling Insert Generator

A client-side web app for generating thermal-printable 4×6 package insert PDFs for online seller storefronts. Fully configurable — runs entirely in the browser, no server required.

Deployable for free on Cloudflare Pages. Works on eBay, Etsy, Mercari, Poshmark, and similar platforms.

## Features

- **Live preview** — see your insert update as you type
- **Configurable branding** — store name, logo, colors, taglines, footer text
- **Multi-platform** — swap between eBay, Etsy, Mercari, and more with a dropdown
- **Thermal-safe output** — Courier font, enforced minimum line weights and text contrast warnings
- **No server** — runs entirely in the browser; all data stored in localStorage
- **Free hosting** — deploy to Cloudflare Pages in minutes

## Quick Start (local dev)

```bash
git clone https://github.com/ajustinjames/selling-insert-generator.git
cd selling-insert-generator
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deploy to Cloudflare Pages

1. Push the repo to GitHub
2. In the Cloudflare Pages dashboard, connect the repository
3. Set **Build command**: `npm run build`
4. Set **Build output directory**: `dist`
5. Deploy — that's it

No environment variables or server configuration needed.

## Usage

1. Enter an item name (plus optional order number, buyer name, or custom note)
2. The live preview updates as you type
3. Click **Download PDF** to generate and save the 4×6 insert
4. Click **Settings** to configure your store name, logo, colors, and text

## Configuration

All settings are stored in your browser's **localStorage**. Clearing browser data will reset to defaults.

You can configure:
- Store name and selling platform
- Logo (PNG or JPG, max 500 KB, displayed inside a circle)
- Taglines (up to 4 lines below the item name)
- Footer lines (up to 3 lines, supports `{platform}` token)
- Colors for each text element, border, and divider
- Page dimensions (default 4×6 inches)

> **Note:** Logo files are stored as base64 data URLs in localStorage. If you switch devices or browsers, re-upload your logo in Settings.

## Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite |
| PDF generation | pdf-lib (browser-native) |
| Frontend | Vanilla JS + CSS |
| Config persistence | localStorage |
| Deployment | Cloudflare Pages (static) |

## Development

```bash
npm run dev      # start local dev server (localhost:5173)
npm run build    # build to dist/
npm run preview  # preview the built output
npm test         # run Vitest tests
```

## License

MIT
