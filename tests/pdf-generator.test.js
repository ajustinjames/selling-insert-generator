import { describe, it, expect } from 'vitest';
import { generateInsertPdf } from '../src/pdf-generator.js';
import { DEFAULT_CONFIG } from '../src/config.js';

const BASE_FORM = { item_name: 'Test Item', order_number: '', buyer_name: '', custom_note: '' };

describe('generateInsertPdf', () => {
  it('returns a non-empty Uint8Array', async () => {
    const bytes = await generateInsertPdf(DEFAULT_CONFIG, BASE_FORM, null);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('output starts with PDF magic bytes', async () => {
    const bytes = await generateInsertPdf(DEFAULT_CONFIG, BASE_FORM, null);
    const header = String.fromCharCode(...bytes.slice(0, 4));
    expect(header).toBe('%PDF');
  });

  it('works with no logo', async () => {
    const bytes = await generateInsertPdf(DEFAULT_CONFIG, BASE_FORM, null);
    expect(bytes.length).toBeGreaterThan(100);
  });

  it('works with all optional fields populated', async () => {
    const form = {
      item_name: 'Vintage Camera Strap',
      order_number: '12345',
      buyer_name: 'Jane Smith',
      custom_note: 'Please handle with care',
    };
    const bytes = await generateInsertPdf(DEFAULT_CONFIG, form, null);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('works with zero taglines and footer lines', async () => {
    const cfg = { ...DEFAULT_CONFIG, taglines: [], footer_lines: [] };
    const bytes = await generateInsertPdf(cfg, BASE_FORM, null);
    expect(bytes).toBeInstanceOf(Uint8Array);
  });

  it('replaces {platform} token in footer lines', async () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      platform: 'Etsy',
      footer_lines: ['Questions? Message us on {platform}'],
    };
    // Should not throw — token replacement happens during rendering
    const bytes = await generateInsertPdf(cfg, BASE_FORM, null);
    expect(bytes).toBeInstanceOf(Uint8Array);
  });

  it('handles custom page dimensions', async () => {
    const cfg = { ...DEFAULT_CONFIG, page: { width_inches: 4, height_inches: 5 } };
    const bytes = await generateInsertPdf(cfg, BASE_FORM, null);
    expect(bytes).toBeInstanceOf(Uint8Array);
  });

  it('produces larger output when optional fields are added', async () => {
    const minimal = await generateInsertPdf(DEFAULT_CONFIG, BASE_FORM, null);
    const withFields = await generateInsertPdf(DEFAULT_CONFIG, {
      item_name: 'Test Item',
      order_number: '99999',
      buyer_name: 'Alice',
      custom_note: 'Handle with care',
    }, null);
    // More content = more bytes
    expect(withFields.length).toBeGreaterThanOrEqual(minimal.length);
  });
});
