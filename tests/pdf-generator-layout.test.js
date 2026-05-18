import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config.js';

const drawTextCalls = [];

vi.mock('pdf-lib', () => {
  const font = {
    widthOfTextAtSize: (text, size) => text.length * size * 0.6,
  };

  return {
    StandardFonts: {
      Courier: 'Courier',
      CourierBold: 'CourierBold',
    },
    rgb: (r, g, b) => ({ r, g, b }),
    PDFDocument: {
      create: vi.fn(async () => ({
        embedFont: vi.fn(async () => font),
        addPage: vi.fn(() => ({
          drawRectangle: vi.fn(),
          drawCircle: vi.fn(),
          drawImage: vi.fn(),
          drawLine: vi.fn(),
          drawText: vi.fn((text, options) => {
            drawTextCalls.push({ text, options });
          }),
        })),
        save: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
      })),
    },
  };
});

const { generateInsertPdf } = await import('../src/pdf-generator.js');

describe('generateInsertPdf layout', () => {
  it('wraps long item names inside the printable content width', async () => {
    drawTextCalls.length = 0;
    const itemName = 'Logitech PRO X SUPERLIGHT Wireless Gaming Mouse';

    await generateInsertPdf(DEFAULT_CONFIG, {
      item_name: itemName,
      order_number: '20-14627-62037',
      buyer_name: 'oli_31929',
      custom_note: '',
    }, null);

    const itemNameLines = drawTextCalls.filter(call => (
      call.options.size === 13 &&
      Math.abs(call.options.x - 21.6) < 0.001
    ));

    expect(itemNameLines.map(call => call.text)).toEqual([
      'Logitech PRO X SUPERLIGHT',
      'Wireless Gaming Mouse',
    ]);

    const maxContentWidth = 288 - 21.6 * 2;
    for (const line of itemNameLines) {
      expect(line.text.length * 13 * 0.6).toBeLessThanOrEqual(maxContentWidth);
    }

    const orderLine = drawTextCalls.find(call => call.text === 'ORDER: 20-14627-62037');
    expect(orderLine.options.y).toBeLessThan(itemNameLines.at(-1).options.y);
  });
});
