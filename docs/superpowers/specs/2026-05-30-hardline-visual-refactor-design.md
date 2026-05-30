# Hardline Visual Refactor Design

## Goal

Refactor the Selling Insert Generator UI to use the public `@ajustinjames/hardline-tokens` and `@ajustinjames/hardline-components` packages while preserving the stable application workflow and generated PDF output.

## Scope

This is a visual refactor only. The app keeps its current two-view model:

- Generator view: item details, live preview, Print, and Download PDF.
- Settings view: store identity, logo, taglines, footer lines, colors, and page size.
- Header navigation and footer links.

The refactor may substantially change markup and CSS around those views, but it must not change the app's fundamental behavior, storage model, validation rules, print/download behavior, or PDF generation.

## Architecture

The app remains a static Vite SPA. `index.html` remains the visible UI skeleton, and `src/app.js` remains the controller for event handlers, view switching, form collection, settings persistence, preview updates, and PDF actions.

Add public package dependencies on:

- `@ajustinjames/hardline-tokens`
- `@ajustinjames/hardline-components`

Import Hardline tokens before Hardline components from the app entry path. The source should use public package names, not local sibling-repo imports, so the app builds reproducibly outside this machine.

Hardline custom elements should wrap native controls where needed. Native `input`, `select`, `button`, and file controls remain the real interactive controls so existing browser behavior and `src/app.js` event listeners stay predictable.

## UI Structure

Use strict Hardline styling as the default visual language:

- Light industrial background.
- White Hardline surfaces.
- Black borders.
- Orange primary action.
- Zero-radius geometry.
- Hardline font and spacing tokens.
- Hardline component shadows and interaction states where provided.

The dark brown/gold thermal-workshop palette is removed from the app shell. App-specific CSS should only provide layout, responsive composition, preview framing, protected preview styles, and small compatibility overrides.

The Generator view becomes a Hardline workbench:

- Item Details is presented as a Hardline surface.
- Labels, inputs, helper text, errors, and buttons use Hardline components.
- Print and Download remain the primary actions and stay disabled until item name is present.
- The preview sits in a Hardline inspection surface with helper text.

The Settings view keeps the existing section order:

1. Store Identity
2. Logo
3. Taglines
4. Footer Lines
5. Colors
6. Page Size

Each section becomes a Hardline-styled surface. Native color inputs remain native controls with Hardline-compatible framing because Hardline does not provide a color picker. Dynamic tagline/footer rows keep native inputs and remove buttons inside Hardline wrappers.

## Behavior Boundary

No fundamental behavior changes are allowed.

Preserve these selectors and contracts:

- Existing control IDs used by `src/app.js`, including `item_name`, `order_number`, `buyer_name`, `custom_note`, `print-btn`, `download-btn`, `download-error`, `preview-container`, `save-btn`, `reset-btn`, `save-feedback`, all settings IDs, logo IDs, dynamic list containers, and color input data attributes.
- Existing `data-nav` attributes for view switching.
- Existing localStorage keys and config validation rules from `src/config.js`.
- Existing logo upload limits and supported MIME types.
- Existing tagline and footer item limits.
- Existing `{platform}` replacement behavior.
- Existing thermal color warning behavior.
- Existing generated filenames and fallback download behavior.

If nested Hardline button markup makes direct `textContent` mutation fragile during generation, introduce a small helper in `src/app.js` that updates a dedicated label span. This helper must preserve the current disabled/loading behavior and final button labels.

## Protected Preview And PDF Output

The inner insert preview and generated PDF are protected output surfaces.

Do not change `src/pdf-generator.js` as part of this visual refactor unless a test reveals an accidental visual-shell coupling that must be isolated. The current `main` branch includes PDF item-title wrapping coverage, so preserving PDF tests is required.

Do not change the coordinate/layout contract in `src/preview.js`. The `#preview-container` element may sit inside a new Hardline-styled frame, but generated `.pi-*` elements must continue to render the 4 x 6 inch white insert using the existing PDF-mirroring measurements and absolute positioning.

The preview paper may keep its own white background, `Courier New` typography, paper shadow, and print-preview CSS because it represents the PDF output rather than the app chrome.

## Error Handling And Compatibility

Existing error and feedback logic remains in `src/app.js` and `src/config.js`. Hardline components may change how messages are displayed, but not when messages appear or which state triggers them.

Compatibility requirements:

- Keep the CSP compatible with bundled Vite CSS and JavaScript.
- Do not add backend calls, API calls, CDN assets, external fonts, or runtime network dependencies.
- Preserve label associations, helper text, error text, disabled states, and file upload accessibility.
- Keep the app fully client-side.

## Testing

Required automated checks:

```bash
npm test
npm run lint
npm run build
```

Manual browser checks:

- Generator view loads with Hardline styling.
- Item name enables Print and Download.
- Preview updates when item fields change.
- Download and print still use the existing PDF path.
- Settings view loads all sections.
- Save and reset still work.
- Logo validation still rejects unsupported type and oversized files.
- Dynamic tagline/footer rows still add and remove correctly.
- Color warnings still appear for thermal-risk colors.
- Page size fields still persist through existing config validation.
- The inner 4 x 6 insert preview remains visually consistent with the existing output contract.

Because this is a visual refactor, capture screenshots of Generator and Settings after implementation and inspect that the app shell changed to Hardline while the insert paper remained stable.
