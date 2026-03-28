import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_CONFIG,
  validateConfig,
  loadConfig,
  saveConfig,
  resetConfig,
  getLogoDataUrl,
  saveLogoDataUrl,
  removeLogo,
} from '../src/config.js';

// ── localStorage mock ─────────────────────────────────────────────
const store = {};
const localStorageMock = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  vi.stubGlobal('localStorage', localStorageMock);
});

// ── DEFAULT_CONFIG ────────────────────────────────────────────────
describe('DEFAULT_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_CONFIG.store_name).toBe('Your Store Name');
    expect(DEFAULT_CONFIG.platform).toBe('eBay');
    expect(DEFAULT_CONFIG.taglines).toHaveLength(2);
    expect(DEFAULT_CONFIG.footer_lines).toHaveLength(2);
    expect(DEFAULT_CONFIG.page.width_inches).toBe(4);
    expect(DEFAULT_CONFIG.page.height_inches).toBe(6);
    expect(Object.keys(DEFAULT_CONFIG.colors)).toHaveLength(6);
  });
});

// ── validateConfig ────────────────────────────────────────────────
describe('validateConfig', () => {
  it('accepts valid default config', () => {
    const { valid, errors } = validateConfig(DEFAULT_CONFIG);
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid hex color', () => {
    const bad = { ...DEFAULT_CONFIG, colors: { ...DEFAULT_CONFIG.colors, border: 'red' } };
    const { valid, errors } = validateConfig(bad);
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('colors.border'))).toBe(true);
  });

  it('rejects page width below 2', () => {
    const bad = { ...DEFAULT_CONFIG, page: { width_inches: 1, height_inches: 6 } };
    const { valid } = validateConfig(bad);
    expect(valid).toBe(false);
  });

  it('rejects page height above 8', () => {
    const bad = { ...DEFAULT_CONFIG, page: { width_inches: 4, height_inches: 9 } };
    const { valid } = validateConfig(bad);
    expect(valid).toBe(false);
  });

  it('rejects more than 4 taglines', () => {
    const bad = { ...DEFAULT_CONFIG, taglines: ['a', 'b', 'c', 'd', 'e'] };
    const { valid } = validateConfig(bad);
    expect(valid).toBe(false);
  });

  it('rejects more than 3 footer lines', () => {
    const bad = { ...DEFAULT_CONFIG, footer_lines: ['a', 'b', 'c', 'd'] };
    const { valid } = validateConfig(bad);
    expect(valid).toBe(false);
  });

  it('warns on light text color', () => {
    const light = { ...DEFAULT_CONFIG, colors: { ...DEFAULT_CONFIG.colors, store_name: '#aaaaaa' } };
    const { valid, warnings } = validateConfig(light);
    expect(valid).toBe(true); // warning only, not error
    expect(warnings.some(w => w.includes('store_name'))).toBe(true);
  });

  it('does not warn on dark text color', () => {
    const dark = { ...DEFAULT_CONFIG, colors: { ...DEFAULT_CONFIG.colors, store_name: '#333333' } };
    const { warnings } = validateConfig(dark);
    expect(warnings.some(w => w.includes('store_name'))).toBe(false);
  });
});

// ── loadConfig ────────────────────────────────────────────────────
describe('loadConfig', () => {
  it('returns defaults when localStorage is empty', () => {
    const cfg = loadConfig();
    expect(cfg.store_name).toBe(DEFAULT_CONFIG.store_name);
    expect(cfg.platform).toBe(DEFAULT_CONFIG.platform);
  });

  it('merges saved config with defaults', () => {
    store['insertgen_config'] = JSON.stringify({ store_name: 'My Shop', platform: 'Etsy' });
    const cfg = loadConfig();
    expect(cfg.store_name).toBe('My Shop');
    expect(cfg.platform).toBe('Etsy');
    // Colors should still come from defaults
    expect(cfg.colors.border).toBe(DEFAULT_CONFIG.colors.border);
  });

  it('returns defaults on parse error', () => {
    store['insertgen_config'] = 'not json {{{';
    const cfg = loadConfig();
    expect(cfg.store_name).toBe(DEFAULT_CONFIG.store_name);
  });
});

// ── saveConfig ────────────────────────────────────────────────────
describe('saveConfig', () => {
  it('round-trips correctly', () => {
    const modified = { ...DEFAULT_CONFIG, store_name: 'Round Trip Store' };
    saveConfig(modified);
    const loaded = loadConfig();
    expect(loaded.store_name).toBe('Round Trip Store');
  });

  it('throws on invalid config', () => {
    const bad = { ...DEFAULT_CONFIG, page: { width_inches: 0, height_inches: 6 } };
    expect(() => saveConfig(bad)).toThrow();
  });
});

// ── resetConfig ───────────────────────────────────────────────────
describe('resetConfig', () => {
  it('clears localStorage and returns defaults', () => {
    store['insertgen_config'] = JSON.stringify({ store_name: 'Custom' });
    const cfg = resetConfig();
    expect(cfg.store_name).toBe(DEFAULT_CONFIG.store_name);
    expect(store['insertgen_config']).toBeUndefined();
  });
});

// ── Logo helpers ──────────────────────────────────────────────────
describe('logo helpers', () => {
  it('returns null when no logo stored', () => {
    expect(getLogoDataUrl()).toBeNull();
  });

  it('saves and retrieves logo data URL', () => {
    saveLogoDataUrl('data:image/png;base64,abc123');
    expect(getLogoDataUrl()).toBe('data:image/png;base64,abc123');
  });

  it('removes logo', () => {
    saveLogoDataUrl('data:image/png;base64,abc123');
    removeLogo();
    expect(getLogoDataUrl()).toBeNull();
  });
});
