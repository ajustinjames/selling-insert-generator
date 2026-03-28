import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

function replacePlatform(text, platform) {
  return text.replaceAll('{platform}', platform);
}

async function embedLogoImage(pdfDoc, dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  if (header.includes('image/png')) {
    return pdfDoc.embedPng(bytes);
  } else if (header.includes('image/jpeg') || header.includes('image/jpg')) {
    return pdfDoc.embedJpg(bytes);
  }
  throw new Error('Unsupported logo format. Use PNG or JPG.');
}

export async function generateInsertPdf(config, formData, logoDataUrl) {
  const PT = 72; // points per inch
  const PAGE_W = config.page.width_inches * PT;
  const PAGE_H = config.page.height_inches * PT;
  const MARGIN = 0.3 * PT;        // 21.6
  const BORDER_INSET = 0.15 * PT; // 10.8

  const pdfDoc = await PDFDocument.create();
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // 1. Border
  page.drawRectangle({
    x: BORDER_INSET,
    y: BORDER_INSET,
    width: PAGE_W - 2 * BORDER_INSET,
    height: PAGE_H - 2 * BORDER_INSET,
    borderColor: hexToRgb(config.colors.border),
    borderWidth: 2.5,
  });

  // Y cursor starts from top content area
  const CIRCLE_R = 0.65 * PT; // 46.8
  let contentStartY;

  // 2. Logo circle + image
  if (logoDataUrl) {
    const circle_cx = PAGE_W / 2;
    const circle_cy = PAGE_H - 0.45 * PT - CIRCLE_R;

    page.drawCircle({
      x: circle_cx,
      y: circle_cy,
      size: CIRCLE_R,
      borderColor: hexToRgb(config.colors.border),
      borderWidth: 2.0,
      color: rgb(1, 1, 1),
    });

    try {
      const logoImage = await embedLogoImage(pdfDoc, logoDataUrl);
      const LOGO_SIZE = 0.82 * PT; // 59.04
      const { width: imgW, height: imgH } = logoImage.scale(1);
      const scale = LOGO_SIZE / Math.max(imgW, imgH);
      const scaledW = imgW * scale;
      const scaledH = imgH * scale;
      page.drawImage(logoImage, {
        x: circle_cx - scaledW / 2,
        y: circle_cy - scaledH / 2 - 0.02 * PT,
        width: scaledW,
        height: scaledH,
      });
    } catch {
      // Logo failed to render — continue without it
    }

    contentStartY = circle_cy - CIRCLE_R - 0.24 * PT;
  } else {
    // No logo: shift store name to top of content area
    contentStartY = PAGE_H - BORDER_INSET - 0.45 * PT;
  }

  // 3. Store name (Courier 11pt, centered)
  const store_y = contentStartY;
  const storeNameWidth = courier.widthOfTextAtSize(config.store_name, 11);
  page.drawText(config.store_name, {
    x: PAGE_W / 2 - storeNameWidth / 2,
    y: store_y,
    size: 11,
    font: courier,
    color: hexToRgb(config.colors.store_name),
  });

  // 4. ITEM label (Courier-Bold 10pt, left)
  const item_y = store_y - 0.48 * PT;
  page.drawText('ITEM', {
    x: MARGIN,
    y: item_y,
    size: 10,
    font: courierBold,
    color: hexToRgb(config.colors.item_label),
  });

  // 5. Item name (Courier-Bold 13pt, left)
  const itemNameY = item_y - 0.27 * PT;
  page.drawText(formData.item_name || '', {
    x: MARGIN,
    y: itemNameY,
    size: 13,
    font: courierBold,
    color: rgb(0, 0, 0),
  });

  // 6. Optional fields (Courier 9pt, left)
  let optY = itemNameY - 14.4;
  const optSpacing = 14.4;

  if (formData.order_number) {
    page.drawText(`ORDER: ${formData.order_number}`, {
      x: MARGIN, y: optY, size: 9,
      font: courier,
      color: hexToRgb(config.colors.item_label),
    });
    optY -= optSpacing;
  }
  if (formData.buyer_name) {
    page.drawText(`BUYER: ${formData.buyer_name}`, {
      x: MARGIN, y: optY, size: 9,
      font: courier,
      color: hexToRgb(config.colors.item_label),
    });
    optY -= optSpacing;
  }
  if (formData.custom_note) {
    page.drawText(formData.custom_note, {
      x: MARGIN, y: optY, size: 9,
      font: courier,
      color: hexToRgb(config.colors.item_label),
    });
  }

  // 7. Taglines (Courier-Bold 10pt, left) — rendered below optional fields
  // Start taglines after item name + optional fields area
  const taglineStartY = itemNameY - 0.27 * PT;
  const optCount = [formData.order_number, formData.buyer_name, formData.custom_note].filter(Boolean).length;
  let tagY = taglineStartY - optCount * optSpacing;
  const tagSpacing = 12.96;

  for (const tagline of config.taglines) {
    page.drawText(tagline, {
      x: MARGIN, y: tagY, size: 10,
      font: courierBold,
      color: hexToRgb(config.colors.tagline),
    });
    tagY -= tagSpacing;
  }

  // 8. Divider rule (anchored from bottom)
  const rule_y = BORDER_INSET + 0.55 * PT; // 50.4
  page.drawLine({
    start: { x: MARGIN, y: rule_y },
    end: { x: PAGE_W - MARGIN, y: rule_y },
    thickness: 1.2,
    color: hexToRgb(config.colors.divider),
  });

  // 9. Footer lines (Courier 8.5pt, centered, anchored from bottom)
  const footerSpacing = 11.52;
  const footerBaseY = BORDER_INSET + 0.38 * PT; // 38.16 for first line
  const footerLines = config.footer_lines.map(line =>
    replacePlatform(line, config.platform)
  );

  for (let i = 0; i < footerLines.length; i++) {
    const lineWidth = courier.widthOfTextAtSize(footerLines[i], 8.5);
    page.drawText(footerLines[i], {
      x: PAGE_W / 2 - lineWidth / 2,
      y: footerBaseY - i * footerSpacing,
      size: 8.5,
      font: courier,
      color: hexToRgb(config.colors.footer),
    });
  }

  return pdfDoc.save();
}

export function triggerDownload(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
