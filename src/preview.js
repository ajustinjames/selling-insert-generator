/**
 * Renders a live HTML/CSS preview of the insert into the given container.
 * Positions are percentage-based, derived from the PDF coordinate system
 * (4×6 inch page, 72pt/in, origin bottom-left → converted to top-left % here).
 *
 * PDF coords (pt):  PAGE_W=288, PAGE_H=432, MARGIN=21.6, BORDER_INSET=10.8
 * Preview:          width=100%, height follows aspect-ratio:2/3
 */

function pct(ptVal, dimension) {
  return `${(ptVal / dimension) * 100}%`;
}

function cqh(ptVal, dimension) {
  return `${(ptVal / dimension) * 100}cqh`;
}

function replacePlatform(text, platform) {
  return text.replaceAll('{platform}', platform);
}

/**
 * Converts a bottom-left PDF y-coordinate to a CSS top percentage.
 * In the PDF, y increases upward. In CSS, top increases downward.
 * textHeightPt approximates the element height in PDF points.
 */
function pdfYtoTopPct(pdfY, pageH, textHeightPt = 0) {
  const cssY = pageH - pdfY - textHeightPt;
  return pct(cssY, pageH);
}

function el(tag, cls, styles = {}, text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  Object.assign(e.style, styles);
  if (text) e.textContent = text;
  return e;
}

export function renderPreview(container, config, formData, logoDataUrl) {
  // Safe DOM clear — no innerHTML with untrusted content
  container.replaceChildren();

  const PAGE_W = 288; // 4in * 72pt
  const PAGE_H = 432; // 6in * 72pt
  const MARGIN = 21.6;
  const BORDER_INSET = 10.8;
  const CIRCLE_R = 46.8; // 0.65in * 72
  const RULE_Y = BORDER_INSET + 0.55 * 72; // 50.4

  // ── Border ──────────────────────────────────────────────────
  const border = el('div', 'pi-border', {
    left: pct(BORDER_INSET, PAGE_W),
    top: pct(BORDER_INSET, PAGE_H),
    right: pct(BORDER_INSET, PAGE_W),
    bottom: pct(BORDER_INSET, PAGE_H),
    border: `1.5px solid ${config.colors.border}`,
  });
  container.appendChild(border);

  let contentStartY; // PDF Y of store name baseline

  // ── Logo circle ──────────────────────────────────────────────
  if (logoDataUrl) {
    const circle_cx = PAGE_W / 2;
    const circle_cy = PAGE_H - 0.45 * 72 - CIRCLE_R; // 352.8

    const circleSize = pct(CIRCLE_R * 2, PAGE_W);
    const circleLeft = pct(circle_cx - CIRCLE_R, PAGE_W);
    const circleTop = pdfYtoTopPct(circle_cy - CIRCLE_R, PAGE_H, CIRCLE_R * 2);

    const circle = el('div', 'pi-circle', {
      left: circleLeft,
      top: circleTop,
      width: circleSize,
      aspectRatio: '1',
      border: `1.5px solid ${config.colors.border}`,
    });

    const img = document.createElement('img');
    // logoDataUrl is a browser-generated data URL from FileReader — safe to use as src
    img.src = logoDataUrl;
    img.alt = '';
    circle.appendChild(img);
    container.appendChild(circle);

    contentStartY = circle_cy - CIRCLE_R - 0.24 * 72; // 288.72
  } else {
    contentStartY = PAGE_H - BORDER_INSET - 0.45 * 72;
  }

  // ── Store name ───────────────────────────────────────────────
  container.appendChild(el('div', 'pi-text', {
    left: '6%',
    right: '6%',
    top: pdfYtoTopPct(contentStartY, PAGE_H, 11),
    textAlign: 'center',
    fontSize: cqh(11, PAGE_H),
    fontWeight: '400',
    color: config.colors.store_name,
  }, config.store_name));

  // ── Flow content container (ITEM label → taglines) ───────────
  // Uses flexbox so wrapped text pushes subsequent items down naturally.
  const item_y = contentStartY - 0.48 * 72;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'pi-content';
  Object.assign(contentDiv.style, {
    top: pdfYtoTopPct(item_y, PAGE_H, 0),
    bottom: pct(RULE_Y + 8, PAGE_H),
    left: pct(MARGIN, PAGE_W),
    right: pct(MARGIN, PAGE_W),
  });

  // ITEM label
  contentDiv.appendChild(el('div', 'pi-flow-text', {
    fontSize: cqh(10, PAGE_H),
    fontWeight: '700',
    color: config.colors.item_label,
  }, 'ITEM'));

  // Item name
  contentDiv.appendChild(el('div', 'pi-flow-text pi-item-name', {
    fontSize: cqh(13, PAGE_H),
    fontWeight: '700',
    color: formData.item_name ? '#1a1410' : '#bbb',
  }, formData.item_name || 'Item name\u2026'));

  // Optional fields
  if (formData.order_number) {
    contentDiv.appendChild(el('div', 'pi-flow-text', {
      fontSize: cqh(9, PAGE_H),
      color: config.colors.item_label,
    }, `ORDER: ${formData.order_number}`));
  }
  if (formData.buyer_name) {
    contentDiv.appendChild(el('div', 'pi-flow-text', {
      fontSize: cqh(9, PAGE_H),
      color: config.colors.item_label,
    }, `BUYER: ${formData.buyer_name}`));
  }
  if (formData.custom_note) {
    contentDiv.appendChild(el('div', 'pi-flow-text', {
      fontSize: cqh(9, PAGE_H),
      color: config.colors.item_label,
    }, formData.custom_note));
  }

  // Taglines
  for (const tagline of config.taglines) {
    contentDiv.appendChild(el('div', 'pi-flow-text pi-tagline', {
      fontSize: cqh(10, PAGE_H),
      fontWeight: '700',
      color: config.colors.tagline,
    }, tagline));
  }

  container.appendChild(contentDiv);

  // ── Divider rule ─────────────────────────────────────────────
  container.appendChild(el('div', 'pi-line', {
    top: pdfYtoTopPct(RULE_Y, PAGE_H, 0),
    borderTopWidth: '1px',
    borderTopColor: config.colors.divider,
  }));

  // ── Footer lines ─────────────────────────────────────────────
  const footerBaseY = BORDER_INSET + 0.38 * 72; // 38.16
  const footerSpacing = 11.52;
  const footerLines = config.footer_lines.map(line =>
    replacePlatform(line, config.platform)
  );

  for (let i = 0; i < footerLines.length; i++) {
    container.appendChild(el('div', 'pi-text', {
      left: '6%',
      right: '6%',
      top: pdfYtoTopPct(footerBaseY - i * footerSpacing, PAGE_H, 8.5),
      textAlign: 'center',
      fontSize: cqh(8.5, PAGE_H),
      color: config.colors.footer,
    }, footerLines[i]));
  }
}
