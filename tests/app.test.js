// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(__dirname, '../index.html'), 'utf-8');
const bodyMatch = indexHtml.match(/<body[^>]*>([\s\S]*)<\/body>/)[1]
  .replace(/<script[\s\S]*?<\/script>/g, '');

function resetFixture() {
  document.body.replaceChildren();
  const parsed = new DOMParser().parseFromString(`<body>${bodyMatch}</body>`, 'text/html');
  document.body.append(...Array.from(parsed.body.childNodes));
}

// ── Module mocks ─────────────────────────────────────────────────
vi.mock('@ajustinjames/hardline-tokens/css', () => ({}));
vi.mock('@ajustinjames/hardline-tokens/css-dark', () => ({}));
vi.mock('@ajustinjames/hardline-components', () => ({}));
vi.mock('lucide', () => ({
  createElement: vi.fn((icon, attrs) => {
    const el = document.createElement('svg');
    el.dataset.icon = icon;
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }),
  Moon: 'moon',
  Sun: 'sun',
}));

const DEFAULT_CONFIG = {
  store_name: 'Your Store Name',
  platform: 'eBay',
  taglines: ['Thanks for your purchase!', 'Please leave feedback'],
  footer_lines: ['Sold on {platform}', 'Follow us for more'],
  colors: {
    store_name: '#000000',
    item_label: '#000000',
    tagline: '#000000',
    footer: '#000000',
    border: '#000000',
    divider: '#000000',
  },
  page: { width_inches: 4, height_inches: 6 },
};

const configMocks = {
  loadConfig: vi.fn(() => ({ ...DEFAULT_CONFIG })),
  saveConfig: vi.fn(c => ({ ...c })),
  resetConfig: vi.fn(() => ({ ...DEFAULT_CONFIG })),
  validateConfig: vi.fn(() => ({ valid: true, errors: [], warnings: [] })),
  getLogoDataUrl: vi.fn(() => null),
  saveLogoDataUrl: vi.fn(),
  removeLogo: vi.fn(),
};
vi.mock('../src/config.js', () => configMocks);

const renderPreview = vi.fn();
vi.mock('../src/preview.js', () => ({ renderPreview }));

const generateInsertPdf = vi.fn(async () => new Uint8Array([1, 2, 3]));
const triggerDownload = vi.fn();
vi.mock('../src/pdf-generator.js', () => ({ generateInsertPdf, triggerDownload }));

async function loadApp() {
  resetFixture();
  vi.resetModules();
  await import('../src/app.js');
}

beforeEach(() => {
  vi.clearAllMocks();
  configMocks.loadConfig.mockReturnValue({ ...DEFAULT_CONFIG });
  configMocks.getLogoDataUrl.mockReturnValue(null);
  localStorage.clear();
});

// ── Theme toggle ──────────────────────────────────────────────────
describe('theme toggle', () => {
  it('defaults to light when nothing is stored', async () => {
    await loadApp();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.getElementById('theme-toggle').getAttribute('aria-pressed')).toBe('false');
  });

  it('honors a stored dark theme on init', async () => {
    localStorage.setItem('insertgen_theme', 'dark');
    await loadApp();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.getElementById('theme-toggle').getAttribute('aria-pressed')).toBe('true');
  });

  it('falls back to light for an unrecognized stored value', async () => {
    localStorage.setItem('insertgen_theme', 'sepia');
    await loadApp();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('flips the theme, persists it, and updates aria attributes + icon on click', async () => {
    await loadApp();
    const toggle = document.getElementById('theme-toggle');

    toggle.click();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('insertgen_theme')).toBe('dark');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(toggle.querySelector('.theme-toggle-icon').firstChild.dataset.icon).toBe('sun');

    toggle.click();

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('insertgen_theme')).toBe('light');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Switch to dark mode');
    expect(toggle.querySelector('.theme-toggle-icon').firstChild.dataset.icon).toBe('moon');
  });
});

// ── Download/print button state ───────────────────────────────────
describe('download button enable/disable', () => {
  it('stays disabled while item name is empty and enables once filled', async () => {
    await loadApp();
    const itemName = document.getElementById('item_name');
    const downloadBtn = document.getElementById('download-btn');
    const printBtn = document.getElementById('print-btn');

    expect(downloadBtn.disabled).toBe(true);
    expect(printBtn.disabled).toBe(true);
    expect(downloadBtn.closest('hl-btn').hasAttribute('disabled')).toBe(true);

    itemName.value = 'Vintage Camera Strap';
    itemName.dispatchEvent(new Event('input'));

    expect(downloadBtn.disabled).toBe(false);
    expect(printBtn.disabled).toBe(false);
    expect(downloadBtn.closest('hl-btn').hasAttribute('disabled')).toBe(false);

    itemName.value = '';
    itemName.dispatchEvent(new Event('input'));

    expect(downloadBtn.disabled).toBe(true);
    expect(downloadBtn.closest('hl-btn').hasAttribute('disabled')).toBe(true);
  });
});

describe('download button busy-state lifecycle', () => {
  it('disables and relabels during generation, then restores on success', async () => {
    let resolveGenerate;
    generateInsertPdf.mockReturnValue(new Promise(resolve => { resolveGenerate = resolve; }));

    await loadApp();
    const itemName = document.getElementById('item_name');
    const downloadBtn = document.getElementById('download-btn');
    itemName.value = 'Vintage Camera Strap';
    itemName.dispatchEvent(new Event('input'));

    downloadBtn.click();

    expect(downloadBtn.disabled).toBe(true);
    expect(downloadBtn.querySelector('.btn-label').textContent).toBe('GENERATING...');

    resolveGenerate(new Uint8Array([1, 2, 3]));
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));

    expect(triggerDownload).toHaveBeenCalled();
    expect(downloadBtn.disabled).toBe(false);
    expect(downloadBtn.querySelector('.btn-label').textContent).toBe('DOWNLOAD PDF');
  });

  it('shows an error message and restores the button label when generation fails', async () => {
    generateInsertPdf.mockRejectedValue(new Error('boom'));

    await loadApp();
    const itemName = document.getElementById('item_name');
    const downloadBtn = document.getElementById('download-btn');
    const errEl = document.getElementById('download-error');
    itemName.value = 'Vintage Camera Strap';
    itemName.dispatchEvent(new Event('input'));

    downloadBtn.click();
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));

    expect(errEl.hidden).toBe(false);
    expect(errEl.textContent).toBe('Error: boom');
    expect(downloadBtn.disabled).toBe(false);
    expect(downloadBtn.querySelector('.btn-label').textContent).toBe('DOWNLOAD PDF');
  });

  it('blocks submission and shows a required-field error when item name is empty', async () => {
    await loadApp();
    const downloadBtn = document.getElementById('download-btn');
    const errEl = document.getElementById('download-error');

    // bypass the disabled attribute to exercise the handler's own guard
    downloadBtn.disabled = false;
    downloadBtn.click();

    expect(errEl.hidden).toBe(false);
    expect(errEl.textContent).toBe('Item name is required.');
    expect(generateInsertPdf).not.toHaveBeenCalled();
  });
});

// ── Dynamic lists (taglines / footer lines) ──────────────────────
describe('dynamic list management', () => {
  it('hides the add button once the max item count is reached', async () => {
    configMocks.loadConfig.mockReturnValue({
      ...DEFAULT_CONFIG,
      taglines: ['a', 'b', 'c', 'd'],
    });
    await loadApp();

    document.querySelector('.nav-btn[data-nav="settings"]').click();

    const list = document.getElementById('taglines-list');
    const addBtn = document.getElementById('add-tagline-btn');

    expect(list.children.length).toBe(4);
    expect(addBtn.hidden).toBe(true);
    expect(addBtn.closest('hl-btn').hasAttribute('hidden')).toBe(true);
  });

  it('shows the add button again after removing an item past the limit', async () => {
    configMocks.loadConfig.mockReturnValue({
      ...DEFAULT_CONFIG,
      taglines: ['a', 'b', 'c', 'd'],
    });
    await loadApp();
    document.querySelector('.nav-btn[data-nav="settings"]').click();

    const list = document.getElementById('taglines-list');
    const addBtn = document.getElementById('add-tagline-btn');

    list.querySelector('.dynamic-list-item .list-remove-btn').click();

    expect(list.children.length).toBe(3);
    expect(addBtn.hidden).toBe(false);
    expect(addBtn.closest('hl-btn').hasAttribute('hidden')).toBe(false);
  });

  it('adds a new row when the add button is clicked below the max', async () => {
    await loadApp();
    document.querySelector('.nav-btn[data-nav="settings"]').click();

    const list = document.getElementById('footer-list');
    const before = list.children.length;
    document.getElementById('add-footer-btn').click();

    expect(list.children.length).toBe(before + 1);
  });
});
