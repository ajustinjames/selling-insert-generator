# Package Insert Generator — v1 Spec

A self-hosted web app for generating thermal-printable 4×6 package insert PDFs for online seller storefronts. Configurable for any store — no AI tokens required after deployment.

## Background

This project generalizes a Claude Code skill that generates package insert PDFs for a specific eBay store. The current skill is a Python/ReportLab script with hardcoded branding. This webapp makes every aspect configurable via a settings UI and serves inserts on demand through a browser form with live preview.

Public GitHub repository. MIT license. Designed for self-hosting on a home server (Proxmox LXC/VM) via Docker.

---

## Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend | **FastAPI** (Python 3.11+) | Lightweight, async, auto-generates OpenAPI docs |
| PDF generation | **ReportLab + svglib** | Proven pipeline — the original skill already uses this |
| Frontend | **Single HTML page** (Jinja2 template + vanilla JS) | No build step, no framework overhead |
| Config persistence | **Flat JSON file** on Docker volume | Simplest option; no database needed for single-store config |
| Deployment | **Docker** + `docker-compose.yml` | One command to run, volume-mounted `data/` for persistence |

---

## Project Structure

```
package-insert-generator/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI app, routes, static file serving
│   ├── pdf_generator.py       # ReportLab logic, fully parameterized
│   ├── config.py              # Pydantic models for config + form input
│   ├── templates/
│   │   ├── index.html         # Main page: item form + live preview
│   │   └── settings.html      # Settings/configuration page
│   └── static/
│       ├── style.css          # Shared styles
│       └── preview.js         # Live preview rendering logic
├── data/                      # Docker volume mount point
│   ├── config.json            # Persisted store settings (created on first save)
│   └── uploads/               # User-uploaded logos
│       └── .gitkeep
├── defaults/
│   └── config.json            # Default config shipped with repo (placeholder branding)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── README.md
└── LICENSE                    # MIT
```

---

## Configuration Schema

File: `data/config.json` (created from `defaults/config.json` on first run if missing)

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
  },
  "logo_path": null
}
```

### Config behavior

- `{platform}` token in `footer_lines` is replaced at render time with the `platform` value. E.g., if `platform` is `"Etsy"`, the footer reads `"Questions? Message us on Etsy"`.
- `logo_path` is relative to the `data/` directory. `null` means no logo — the insert renders without the logo circle.
- `taglines` is an array of strings. Each renders on its own line below the item name. Supports 0–4 lines.
- `footer_lines` is an array of strings. Each renders centered below the divider rule. Supports 0–3 lines.
- Colors must be hex strings. The UI should validate they are thermal-safe (warn if any text color is lighter than `#666666`).
- Fonts are fixed to `Courier` / `Courier-Bold` — these are thermal-safe monospace fonts baked into ReportLab. Not configurable in v1.

---

## API Endpoints

| Method | Path | Request | Response | Purpose |
|--------|------|---------|----------|---------|
| `GET` | `/` | — | HTML | Main page: item form + live preview |
| `GET` | `/settings` | — | HTML | Settings/configuration page |
| `GET` | `/api/config` | — | JSON (current config) | Feeds the live preview and settings form |
| `POST` | `/api/settings` | JSON body (config fields) | JSON (saved config) | Save config to `data/config.json` |
| `POST` | `/api/logo` | `multipart/form-data` (file upload) | JSON `{ "logo_path": "uploads/logo.svg" }` | Upload SVG or PNG logo |
| `DELETE` | `/api/logo` | — | JSON `{ "logo_path": null }` | Remove logo |
| `POST` | `/api/generate` | JSON `{ "item_name": "...", "order_number": "...", "buyer_name": "...", "custom_note": "..." }` | `application/pdf` binary | Generate and return PDF |

### Input validation

- `item_name` is **required**, max 80 characters.
- `order_number`, `buyer_name`, `custom_note` are **optional**. Max 60 characters each.
- Logo upload: accept `.svg` and `.png` only, max 2MB.
- Config save: validate all color fields are valid hex, page dimensions are between 2–8 inches.

---

## PDF Layout Spec

This is the exact layout the PDF generator must produce. All measurements assume 4×6 inch page (configurable via `page.width_inches` and `page.height_inches`).

### Design constants

| Property | Value |
|----------|-------|
| Font family | Courier / Courier-Bold |
| Border | 2.5pt solid, `colors.border`, inset 0.15in from page edge |
| Content margin | 0.3in from page edge |
| Logo circle | 2.0pt stroke, `colors.border`, radius 0.65in, centered horizontally |
| Divider rule | 1.2pt, `colors.divider` |

### Thermal printing constraints (enforced in generator)

- No font below 8.5pt
- No line weight below 1.2pt
- No text color lighter than `#666666` (warn in UI, but allow override)
- Logo is rendered from SVG/PNG — vector preferred for thermal crispness

### Layout (top to bottom)

1. **Logo** — SVG/PNG rendered inside a circle, centered. If no logo configured, skip the circle entirely and shift content up.
2. **Store name** — `store_name`, Courier 11pt, centered, `colors.store_name`
3. **ITEM label** — literal text "ITEM", Courier-Bold 10pt, left-aligned, `colors.item_label`
4. **Item name** — the per-insert input, Courier-Bold 13pt, left-aligned, black
5. **Optional fields** — if `order_number`, `buyer_name`, or `custom_note` are provided, render each on its own line below the item name. Courier 9pt, `colors.item_label`. Format: `ORDER: {value}`, `BUYER: {value}`, or just the custom note text.
6. **Taglines** — each entry in `taglines[]`, Courier-Bold 10pt, left-aligned, `colors.tagline`
7. **Breathing room** — flexible vertical space
8. **Divider rule** — 1.2pt, `colors.divider`, full content width
9. **Footer lines** — each entry in `footer_lines[]`, Courier 8.5pt, centered, `colors.footer`. Token `{platform}` is replaced.

### Y-positioning strategy

Use fixed offsets from the top for items 1–6, and fixed offsets from the bottom for items 8–9. Item 7 (breathing room) absorbs the difference. This ensures the footer stays anchored to the bottom border regardless of how many optional fields or taglines are present.

---

## Live Preview

The main page (`/`) includes a live preview panel that updates as the user types in the item name field.

### Implementation approach

- **HTML/CSS replica**, not a PDF render. Build a `<div>` styled to match the 4×6 PDF layout at a fixed aspect ratio.
- The preview reads config from `/api/config` on page load and from the form fields in real-time.
- The same config values drive both the preview CSS and the PDF generator, so they stay visually in sync.
- Preview should scale responsively — use CSS `aspect-ratio: 2/3` with a max-width, centered on page.
- Logo is displayed as an `<img>` tag pointing to the uploaded file (served as a static file from `data/uploads/`).
- Use `font-family: 'Courier New', Courier, monospace` in CSS to approximate the PDF's Courier font.

### Preview fidelity

The preview does NOT need to be pixel-perfect with the PDF. It needs to be close enough that the user can confirm:
- Their item name fits and looks right
- The overall layout and branding are correct
- Optional fields appear where expected

---

## Pages

### Main page (`/`)

Layout: two-column on desktop, stacked on mobile.

**Left column — Form:**
- Item name (text input, required)
- Order number (text input, optional)
- Buyer name (text input, optional)
- Custom note (text input, optional)
- "Download PDF" button (POST to `/api/generate`, trigger browser download)

**Right column — Preview:**
- Live-updating HTML/CSS preview of the insert
- Scaled to fit the column width, maintaining 2:3 aspect ratio

**Header:**
- App name / small branding
- Link to Settings page

### Settings page (`/settings`)

Single-column form:

- Store name (text input)
- Platform (dropdown: eBay, Etsy, Mercari, Poshmark, Amazon, Facebook Marketplace, Other + freetext)
- Logo upload (file input, shows current logo if set, with remove button)
- Taglines (dynamic list — add/remove lines, max 4)
- Footer lines (dynamic list — add/remove lines, max 3, note `{platform}` token support)
- Colors section (color pickers for each: store_name, item_label, tagline, footer, border, divider)
- Page size (width + height in inches, default 4×6)
- "Save" button
- "Reset to defaults" button (with confirmation)

---

## PDF Generator (`pdf_generator.py`)

Refactor of the original ReportLab script into a function:

```python
def generate_insert(
    config: StoreConfig,
    item_name: str,
    order_number: str | None = None,
    buyer_name: str | None = None,
    custom_note: str | None = None,
) -> bytes:
    """Generate a package insert PDF and return raw bytes."""
```

- Takes the full `StoreConfig` (Pydantic model parsed from `config.json`) plus per-insert fields.
- Returns PDF as `bytes` — the route handler wraps it in a `StreamingResponse`.
- Logo rendering: if `config.logo_path` exists, load with `svglib` (SVG) or `reportlab.lib.utils.ImageReader` (PNG) and draw inside the circle. If no logo, skip the circle.
- All text, colors, and layout values come from config — nothing hardcoded.

---

## Docker

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml

```yaml
services:
  insert-generator:
    build: .
    ports:
      - "8420:8000"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### First-run behavior

On startup, if `data/config.json` does not exist, copy `defaults/config.json` into `data/config.json`. This ensures the app works immediately with placeholder branding, and the user's config survives container rebuilds via the volume mount.

---

## requirements.txt

```
fastapi>=0.104
uvicorn[standard]>=0.24
python-multipart>=0.0.6
jinja2>=3.1
reportlab>=4.0
svglib>=0.19
pydantic>=2.0
```

---

## UI Design Notes

- Keep it minimal and functional. No CSS framework required — simple custom CSS is fine.
- Dark/light mode not needed for v1.
- The settings page is utility UI, not a showcase. Clean forms, clear labels, sensible defaults.
- The main page should feel fast — item name → preview updates instantly (JS `input` event, no debounce needed for this scale).
- Mobile-friendly: the preview stacks below the form on narrow screens.

---

## What's NOT in v1 (deferred)

- **Batch mode** — paste N item names, get a multi-page PDF
- **Multi-store profiles** — switch between different store configs
- **Authentication** — app is LAN-only, no auth needed
- **Direct thermal printer integration** — browser print dialog or CUPS integration
- **QR code on insert** — link to store page
- **Order import** — pull orders from eBay/Etsy API automatically

---

## Reference: Original Skill Script

The following Python script is the original implementation this project generalizes. Use it as the reference for the PDF layout, spacing, and ReportLab API usage. The logo SVG is a bold black "S" letterform.

```python
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF

SVG_PATH = '/home/claude/logo.svg'

PAGE_W = 4 * inch
PAGE_H = 6 * inch
MARGIN = 0.3 * inch
BORDER_INSET = 0.15 * inch
OUTPUT = "/mnt/user-data/outputs/iwanttosellmystuff_insert.pdf"

ITEM_NAME = "Item Name Goes Here"

c = canvas.Canvas(OUTPUT, pagesize=(PAGE_W, PAGE_H), pageCompression=0)

# Outer border
c.setStrokeColor(colors.black)
c.setLineWidth(2.5)
c.rect(BORDER_INSET, BORDER_INSET, PAGE_W - 2*BORDER_INSET, PAGE_H - 2*BORDER_INSET)

# Logo circle
CIRCLE_R = 0.65 * inch
circle_cx = PAGE_W / 2
circle_cy = PAGE_H - 0.45*inch - CIRCLE_R
c.setStrokeColor(colors.black)
c.setFillColor(colors.white)
c.setLineWidth(2.0)
c.circle(circle_cx, circle_cy, CIRCLE_R, stroke=1, fill=1)

# Draw SVG logo scaled to fit inside circle
drawing = svg2rlg(SVG_PATH)
svg_w, svg_h = drawing.width, drawing.height
LOGO_SIZE = 0.82 * inch
scale = LOGO_SIZE / max(svg_w, svg_h)
scaled_w = svg_w * scale
scaled_h = svg_h * scale
logo_x = circle_cx - scaled_w / 2
logo_y = circle_cy - scaled_h / 2 - 0.02*inch

c.saveState()
c.translate(logo_x, logo_y)
c.scale(scale, scale)
renderPDF.draw(drawing, c, 0, 0)
c.restoreState()

# Store name
c.setFont("Courier", 11)
c.setFillColor(colors.HexColor("#333333"))
store_y = circle_cy - CIRCLE_R - 0.24*inch
c.drawCentredString(PAGE_W / 2, store_y, "iwanttosellmystuff")
c.setFillColor(colors.black)

# Item label + name
item_y = store_y - 0.48*inch
c.setFont("Courier-Bold", 10)
c.setFillColor(colors.HexColor("#555555"))
c.drawString(MARGIN, item_y, "ITEM")
c.setFillColor(colors.black)
c.setFont("Courier-Bold", 13)
c.drawString(MARGIN, item_y - 0.27*inch, ITEM_NAME)

# Tagline
c.setFont("Courier-Bold", 10)
c.setFillColor(colors.HexColor("#444444"))
c.drawString(MARGIN, item_y - 0.54*inch, "Inspected, tested, and packed with care.")
c.drawString(MARGIN, item_y - 0.72*inch, "Thank you!")
c.setFillColor(colors.black)

# Divider rule
rule_y = BORDER_INSET + 0.55*inch
c.setLineWidth(1.2)
c.setStrokeColor(colors.HexColor("#888888"))
c.line(MARGIN, rule_y, PAGE_W - MARGIN, rule_y)

# Footer
c.setFont("Courier", 8.5)
c.setFillColor(colors.HexColor("#444444"))
c.drawCentredString(PAGE_W / 2, BORDER_INSET + 0.38*inch, "Feedback appreciated")
c.drawCentredString(PAGE_W / 2, BORDER_INSET + 0.22*inch, "Questions? Message us on eBay")
c.setFillColor(colors.black)

c.save()
```
