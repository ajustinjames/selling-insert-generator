# Hardline Visual Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Selling Insert Generator app shell to use public Hardline tokens and components while preserving the current workflow, preview contract, and generated PDF output.

**Architecture:** Keep the app as a static Vite SPA with `index.html` as the UI skeleton and `src/app.js` as the controller. Import Hardline packages through the app entry path, rewrite the visible shell around `hl-*` custom elements, and reduce `src/style.css` to layout, preview framing, protected preview styles, and compatibility overrides.

**Tech Stack:** Vite, vanilla JavaScript modules, public `@ajustinjames/hardline-tokens`, public `@ajustinjames/hardline-components`, pdf-lib, Vitest, ESLint.

---

## File Structure

- Modify `package.json`: add public Hardline dependencies and any test script only if needed by existing tooling.
- Modify `package-lock.json`: update lockfile from `npm install`.
- Modify `src/app.js`: import Hardline tokens/components before app behavior and add tiny button-label helpers only if nested button markup needs stable loading labels.
- Modify `index.html`: replace hand-rolled visual markup with Hardline-first static markup while preserving IDs, `data-nav`, and form controls used by `src/app.js`.
- Modify `src/style.css`: remove app-owned theme tokens and most bespoke component styling; keep layout, responsive rules, Hardline compatibility overrides, and protected `.preview-insert` / `.pi-*` rendering styles.
- Do not modify `src/pdf-generator.js` for this visual refactor.
- Do not modify `src/preview.js` unless a Hardline wrapper accidentally changes the required `#preview-container` contract.

## Task 1: Install Public Hardline Packages

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Confirm the workspace starts clean and on the planning branch**

Run:

```bash
git status --short --branch
```

Expected: branch is `feat/hardline-visual-refactor-plan` or a fresh implementation branch based on it, with only the committed spec/plan docs present before implementation starts.

- [ ] **Step 2: Install public Hardline packages**

Run:

```bash
npm install @ajustinjames/hardline-tokens @ajustinjames/hardline-components
```

Expected: `package.json` gains dependencies for both packages, and `package-lock.json` records the package graph including Hardline's `lit` dependency.

- [ ] **Step 3: Run the existing automated baseline**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands pass. If `npm run build` fails because the package was not installed or the lockfile is inconsistent, fix the install before touching UI code.

- [ ] **Step 4: Commit dependency changes**

Run:

```bash
git add package.json package-lock.json
git commit -m "chore: add hardline design packages"
```

Expected: commit succeeds with only dependency files staged.

## Task 2: Register Hardline Before App Behavior

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Add Hardline imports at the top of `src/app.js`**

Change the top of `src/app.js` so the first imports are:

```js
import '@ajustinjames/hardline-tokens/css';
import '@ajustinjames/hardline-components';

import {
  loadConfig,
  saveConfig,
  resetConfig,
  validateConfig,
  getLogoDataUrl,
  saveLogoDataUrl,
  removeLogo,
} from './config.js';
```

Expected: Hardline CSS variables and custom elements are registered before DOM event handlers run.

- [ ] **Step 2: Run the fast build check**

Run:

```bash
npm run build
```

Expected: Vite resolves both Hardline imports and emits a production build.

- [ ] **Step 3: Commit Hardline registration**

Run:

```bash
git add src/app.js
git commit -m "chore: register hardline components"
```

Expected: commit includes only `src/app.js`.

## Task 3: Rewrite Static Shell Markup With Hardline Components

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Preserve all behavior-critical selectors before editing**

Run:

```bash
rg -n "id=\"|data-nav|preview-container|logo-input|data-color-key" index.html
```

Expected: capture the current IDs and `data-nav` attributes. Preserve them in the rewritten markup:

```text
view-main, view-settings, item_name, item_name_count, order_number, buyer_name, custom_note,
print-btn, download-btn, download-error, preview-container, reset-btn, save-btn, save-feedback,
s_store_name, s_platform, s_platform_other, logo-preview-wrap, logo-preview-img, logo-remove-btn,
logo-upload-area, logo-input, logo-error, taglines-list, add-tagline-btn, footer-list,
add-footer-btn, c_store_name, c_store_name_hex, warn_store_name, c_item_label,
c_item_label_hex, warn_item_label, c_tagline, c_tagline_hex, warn_tagline, c_footer,
c_footer_hex, warn_footer, c_border, c_border_hex, c_divider, c_divider_hex, s_width, s_height
```

- [ ] **Step 2: Replace the header with Hardline-styled app chrome**

Use this structure as the target shape, preserving `data-nav` and `.active`:

```html
<header class="app-header">
  <div class="header-inner">
    <div class="header-brand" aria-label="Selling Insert Generator">
      <hl-badge tone="neutral">SIG</hl-badge>
      <span class="brand-name">SELLING INSERT GENERATOR</span>
    </div>
    <nav class="header-nav" aria-label="Primary navigation">
      <hl-btn variant="ghost" size="sm">
        <button class="nav-btn active" type="button" data-nav="main">GENERATOR</button>
      </hl-btn>
      <hl-btn variant="ghost" size="sm">
        <button class="nav-btn" type="button" data-nav="settings">SETTINGS</button>
      </hl-btn>
    </nav>
  </div>
</header>
```

Expected: `document.querySelectorAll('.nav-btn')` still finds the native buttons.

- [ ] **Step 3: Replace Generator view panels with Hardline surfaces**

Use `hl-card` for the item details and preview panels. Keep all input IDs and button IDs. The item-name field should follow this pattern:

```html
<hl-input label-for="item_name">
  <label slot="label" for="item_name">
    ITEM NAME <span class="required">*</span>
  </label>
  <input
    id="item_name"
    type="text"
    placeholder="e.g. Vintage Camera Strap"
    maxlength="80"
    autocomplete="off"
  />
</hl-input>
<div class="field-counter"><span id="item_name_count">0</span>/80</div>
```

Use the same `hl-input` wrapper pattern for `order_number`, `buyer_name`, and `custom_note`.

For actions, use native buttons inside `hl-btn`:

```html
<div class="action-row">
  <hl-btn variant="primary">
    <button id="print-btn" type="button" disabled>
      <span class="btn-icon" aria-hidden="true">⎙</span>
      <span class="btn-label">PRINT</span>
    </button>
  </hl-btn>
  <hl-btn variant="default">
    <button id="download-btn" class="action-row-download" type="button" disabled>
      <span class="btn-icon" aria-hidden="true">⬇</span>
      <span class="btn-label">DOWNLOAD PDF</span>
    </button>
  </hl-btn>
</div>
```

Keep:

```html
<div id="download-error" class="field-error" hidden></div>
<div id="preview-container" class="preview-insert"></div>
```

Expected: `src/app.js` still finds every Generator view element by ID.

- [ ] **Step 4: Replace Settings sections with Hardline surfaces**

For each former `fieldset.settings-section`, use an `hl-card` with a native heading. Keep native controls and IDs. For store name:

```html
<hl-card class="settings-section" elevation="1">
  <h2 slot="header" class="section-legend">STORE IDENTITY</h2>
  <div class="field-group">
    <hl-input label-for="s_store_name">
      <label slot="label" for="s_store_name">STORE NAME</label>
      <input id="s_store_name" type="text" maxlength="60" />
    </hl-input>
  </div>
</hl-card>
```

For platform, preserve the select ID and the optional input:

```html
<hl-select label-for="s_platform">
  <label slot="label" for="s_platform">PLATFORM</label>
  <select id="s_platform">
    <option value="eBay">eBay</option>
    <option value="Etsy">Etsy</option>
    <option value="Mercari">Mercari</option>
    <option value="Poshmark">Poshmark</option>
    <option value="Amazon">Amazon</option>
    <option value="Facebook Marketplace">Facebook Marketplace</option>
    <option value="Other">Other…</option>
  </select>
</hl-select>
<hl-input label-for="s_platform_other" class="mt-sm">
  <label slot="label" for="s_platform_other">OTHER PLATFORM</label>
  <input id="s_platform_other" type="text" placeholder="Enter platform name" hidden />
</hl-input>
```

Expected: `populateSettingsForm()` still sets values and hidden states correctly.

- [ ] **Step 5: Keep logo, dynamic list, colors, and page size IDs intact**

Use Hardline wrappers for buttons and surfaces, but keep the native file input and dynamic containers:

```html
<div id="taglines-list" class="dynamic-list"></div>
<hl-btn variant="ghost" size="sm">
  <button id="add-tagline-btn" type="button" class="mt-sm">+ ADD TAGLINE</button>
</hl-btn>
```

For color fields, keep native color and hex inputs:

```html
<input id="c_store_name" type="color" class="color-picker" data-color-key="store_name" />
<input id="c_store_name_hex" type="text" class="color-hex" maxlength="7" data-color-key="store_name" />
<div class="thermal-warn" id="warn_store_name" hidden>⚠ May be too light for thermal</div>
```

Expected: `src/app.js` color and warning code still works without selector changes.

- [ ] **Step 6: Run behavior smoke checks in build**

Run:

```bash
npm run build
```

Expected: the rewritten HTML builds without invalid module or asset errors.

- [ ] **Step 7: Commit static markup rewrite**

Run:

```bash
git add index.html
git commit -m "refactor: adopt hardline static markup"
```

Expected: commit includes only `index.html`.

## Task 4: Reduce CSS To Layout, Compatibility, And Protected Preview Styles

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Remove app-owned font faces and old theme tokens**

Delete the `@font-face` declarations and old `:root` variables such as `--bg`, `--bg-2`, `--accent`, `--paper`, and `--font-mono`. Replace them with app layout variables derived from Hardline:

```css
:root {
  --app-page-max: 1200px;
  --app-preview-max: 320px;
  --app-header-height: 56px;
}
```

Expected: app chrome uses Hardline package fonts/tokens rather than local IBM Plex Mono styling.

- [ ] **Step 2: Keep a minimal reset and Hardline body foundation**

Use this foundation:

```css
*, *::before, *::after {
  box-sizing: border-box;
}

[hidden] {
  display: none !important;
}

html {
  font-size: 13px;
}

body {
  min-height: 100vh;
  margin: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  background: var(--hl-alias-surface-bg-alt);
  color: var(--hl-alias-text-main);
  font-family: var(--hl-alias-font-ui);
}
```

Expected: the app reads as default Hardline instead of the prior dark palette.

- [ ] **Step 3: Replace header, view, and layout CSS with Hardline-compatible layout only**

Use the existing layout classes but remove bespoke button/input styling:

```css
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--hl-alias-surface-bg);
  border-bottom: var(--hl-alias-surface-border-width) solid var(--hl-alias-surface-border);
}

.header-inner {
  max-width: var(--app-page-max);
  min-height: var(--app-header-height);
  margin: 0 auto;
  padding: 0 var(--hl-alias-space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hl-alias-space-4);
}

.header-brand,
.header-nav,
.action-row,
.settings-actions {
  display: flex;
  align-items: center;
  gap: var(--hl-alias-space-3);
}

.brand-name {
  font-family: var(--hl-alias-font-technical);
  font-size: 13px;
  font-weight: var(--hl-alias-font-weight-bold);
  letter-spacing: var(--hl-alias-tracking-wide);
}

.view {
  display: none;
  flex: 1;
}

[data-view="main"] #view-main,
[data-view="settings"] #view-settings {
  display: block;
}

.main-layout {
  max-width: var(--app-page-max);
  margin: 0 auto;
  padding: var(--hl-alias-space-8) var(--hl-alias-space-6);
  display: grid;
  grid-template-columns: minmax(300px, 360px) 1fr;
  gap: var(--hl-alias-space-8);
  align-items: start;
}

.settings-layout {
  max-width: 760px;
  margin: 0 auto;
  padding: var(--hl-alias-space-8) var(--hl-alias-space-6) 64px;
  display: flex;
  flex-direction: column;
  gap: var(--hl-alias-space-4);
}
```

Expected: layout remains familiar, but visual styling comes from Hardline components.

- [ ] **Step 4: Add compatibility styling for projected native controls**

Hardline components style many slotted controls, but native controls still need predictable sizing:

```css
input,
select,
button {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

hl-btn > button {
  width: 100%;
}

hl-input,
hl-select {
  width: 100%;
}

.field-group {
  margin-bottom: var(--hl-alias-space-4);
  position: relative;
}

.field-counter,
.field-hint,
.preview-note,
.legend-hint {
  color: var(--hl-alias-text-muted);
  font-family: var(--hl-alias-font-technical);
  font-size: 11px;
}

.field-error,
.thermal-warn {
  color: var(--hl-alias-status-error);
  font-family: var(--hl-alias-font-technical);
  font-size: 11px;
}
```

Expected: native controls remain usable and existing error/warning elements remain visible.

- [ ] **Step 5: Preserve preview paper and `.pi-*` styles**

Keep the current `.preview-insert`, `.pi-border`, `.pi-circle`, `.pi-text`, `.pi-content`, `.pi-flow-text`, `.pi-item-name`, `.pi-tagline`, and `.pi-line` rules functionally equivalent. The protected preview block must still include:

```css
.preview-insert {
  background: #ffffff;
  aspect-ratio: 2 / 3;
  width: 100%;
  position: relative;
  overflow: hidden;
  container-type: size;
  font-family: 'Courier New', Courier, monospace;
}
```

Expected: `renderPreview()` can still absolutely position PDF-mirroring elements inside `#preview-container`.

- [ ] **Step 6: Keep responsive behavior**

Preserve the current one-column mobile behavior:

```css
@media (max-width: 768px) {
  .main-layout {
    grid-template-columns: 1fr;
    padding: var(--hl-alias-space-6) var(--hl-alias-space-4);
  }

  .preview-slot {
    max-width: 280px;
  }

  .settings-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-actions {
    width: 100%;
  }
}
```

Expected: Generator and Settings remain usable on narrow screens.

- [ ] **Step 7: Run build after CSS refactor**

Run:

```bash
npm run build
```

Expected: build passes and CSS asset generation succeeds.

- [ ] **Step 8: Commit CSS refactor**

Run:

```bash
git add src/style.css
git commit -m "refactor: align app styles with hardline"
```

Expected: commit includes only `src/style.css`.

## Task 5: Stabilize Button Loading Labels If Needed

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Inspect whether current button text resets break nested markup**

Run:

```bash
rg -n "textContent = 'GENERATING|textContent = '⬇ DOWNLOAD PDF|textContent = '⎙ PRINT" src/app.js
```

Expected: find the current direct `textContent` updates for `download-btn` and `print-btn`.

- [ ] **Step 2: If nested `.btn-label` spans are present, add helper functions**

Add these helpers after `updateDownloadBtn()`:

```js
function setButtonLabel(buttonId, label) {
  const btn = document.getElementById(buttonId);
  const labelEl = btn?.querySelector('.btn-label');
  if (labelEl) {
    labelEl.textContent = label;
    return;
  }
  if (btn) btn.textContent = label;
}

function setButtonBusy(buttonId, isBusy, label) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.disabled = isBusy;
  btn.setAttribute('aria-busy', String(isBusy));
  setButtonLabel(buttonId, label);
}
```

Expected: nested icon markup remains intact when labels change.

- [ ] **Step 3: Replace direct loading label mutations**

For Download, replace:

```js
btn.disabled = true;
btn.textContent = 'GENERATING…';
```

with:

```js
setButtonBusy('download-btn', true, 'GENERATING…');
```

Replace the `finally` reset:

```js
btn.disabled = false;
btn.textContent = '⬇ DOWNLOAD PDF';
updateDownloadBtn();
```

with:

```js
setButtonBusy('download-btn', false, 'DOWNLOAD PDF');
updateDownloadBtn();
```

For Print, replace:

```js
btn.disabled = true;
btn.textContent = 'GENERATING…';
```

with:

```js
setButtonBusy('print-btn', true, 'GENERATING…');
```

Replace the `finally` reset:

```js
btn.disabled = false;
btn.textContent = '⎙ PRINT';
updateDownloadBtn();
```

with:

```js
setButtonBusy('print-btn', false, 'PRINT');
updateDownloadBtn();
```

Expected: behavior remains the same, but icons and nested label spans survive loading state changes.

- [ ] **Step 4: Run lint and tests**

Run:

```bash
npm run lint
npm test
```

Expected: lint and tests pass. Existing PDF layout tests must still pass.

- [ ] **Step 5: Commit JS compatibility change only if files changed**

Run:

```bash
git status --short
git add src/app.js
git commit -m "refactor: preserve hardline button labels"
```

Expected: commit is created only if `src/app.js` changed beyond the Hardline imports from Task 2.

## Task 6: Browser Verification

**Files:**
- No required source changes unless verification finds a regression.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 2: Open the app in the in-app browser**

Use the Browser plugin to navigate to the Vite URL.

Expected: Generator view loads with Hardline light industrial styling.

- [ ] **Step 3: Verify Generator behavior**

In the browser:

1. Confirm Print and Download are disabled on initial load.
2. Type `Vintage Camera Strap` into Item Name.
3. Confirm Print and Download become enabled.
4. Type sample values into Order Number, Buyer Name, and Custom Note.
5. Confirm the live insert preview updates and stays inside the white 4 x 6 surface.

Expected: no console errors and no visual overlap in the app shell.

- [ ] **Step 4: Verify Settings behavior**

In the browser:

1. Click Settings.
2. Confirm all six settings sections are visible.
3. Change Store Name.
4. Select `Other…` for Platform and confirm the custom platform input appears.
5. Add and remove a tagline.
6. Add and remove a footer line.
7. Change a color to a very light value such as `#ffffff` and confirm the thermal warning appears where expected.

Expected: existing settings interactions still work.

- [ ] **Step 5: Capture screenshots**

Use the Browser plugin to capture screenshots for:

- Generator view.
- Settings view.

Expected: screenshots show Hardline styling around the app shell and the protected insert preview still rendering as white paper.

- [ ] **Step 6: Stop the dev server**

Terminate the Vite process.

Expected: no background dev-server session remains running.

## Task 7: Final Automated Verification And Commit

**Files:**
- Any source files changed during fixes from browser verification.

- [ ] **Step 1: Run full automated verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all checks pass.

- [ ] **Step 2: Inspect the final diff**

Run:

```bash
git diff --stat
git diff --check
```

Expected: no whitespace errors. Diff should be limited to dependency files, `index.html`, `src/app.js`, and `src/style.css`, unless browser verification required a narrow compatibility fix.

- [ ] **Step 3: Commit final fixes if needed**

If browser verification or final checks required additional edits, run:

```bash
git add index.html src/app.js src/style.css package.json package-lock.json
git commit -m "fix: polish hardline visual refactor"
```

Expected: commit is created only if there are uncommitted implementation fixes.

- [ ] **Step 4: Prepare handoff summary**

Record:

- Final branch name.
- Commands run and pass/fail results.
- Screenshots captured.
- Any intentional visual exceptions for the protected insert preview.
- Confirmation that `src/pdf-generator.js` was not changed.

Expected: implementation can be reviewed without rediscovering the refactor boundaries.

## Self-Review

- Spec coverage: dependencies, Hardline registration, static markup, CSS reduction, behavior preservation, preview/PDF protection, accessibility compatibility, browser checks, and automated verification are covered.
- Placeholder scan: no TBD/TODO placeholders remain.
- Scope check: the plan covers one subsystem, the visual shell refactor, and explicitly excludes PDF generation changes.
- Type and selector consistency: task steps preserve the existing DOM IDs and `data-nav` selectors used by `src/app.js`.
