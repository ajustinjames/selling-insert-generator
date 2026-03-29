const CONFIG_KEY = 'insertgen_config';
const LOGO_KEY = 'insertgen_logo';

export const DEFAULT_CONFIG = {
  store_name: 'Your Store Name',
  platform: 'eBay',
  taglines: [
    'Inspected, tested, and packed with care.',
    'Thank you!',
  ],
  footer_lines: [
    'Feedback appreciated',
    'Questions? Message us on {platform}',
  ],
  colors: {
    store_name: '#333333',
    item_label: '#555555',
    tagline: '#444444',
    footer: '#444444',
    border: '#000000',
    divider: '#888888',
  },
  page: {
    width_inches: 4,
    height_inches: 6,
  },
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Lighter than #666666 means any channel > 0x66 (102)
  return r > 0x66 || g > 0x66 || b > 0x66;
}

export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  const colorFields = ['store_name', 'item_label', 'tagline', 'footer', 'border', 'divider'];
  const textColorFields = ['store_name', 'item_label', 'tagline', 'footer'];

  for (const field of colorFields) {
    const val = config.colors?.[field];
    if (!val || !HEX_RE.test(val)) {
      errors.push(`colors.${field} must be a valid hex color (e.g. #333333)`);
    } else if (textColorFields.includes(field) && isLightColor(val)) {
      warnings.push(`colors.${field} (${val}) may be too light for thermal printing`);
    }
  }

  const w = config.page?.width_inches;
  const h = config.page?.height_inches;
  if (typeof w !== 'number' || w < 2 || w > 8) errors.push('page.width_inches must be between 2 and 8');
  if (typeof h !== 'number' || h < 2 || h > 8) errors.push('page.height_inches must be between 2 and 8');

  if (!Array.isArray(config.taglines) || config.taglines.length > 4) {
    errors.push('taglines must be an array with at most 4 entries');
  }
  if (!Array.isArray(config.footer_lines) || config.footer_lines.length > 3) {
    errors.push('footer_lines must be an array with at most 3 entries');
  }
  if (!config.store_name || typeof config.store_name !== 'string') {
    errors.push('store_name is required');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const saved = JSON.parse(raw);
    // Deep merge with defaults to handle schema evolution
    const merged = {
      ...DEFAULT_CONFIG,
      ...saved,
      colors: { ...DEFAULT_CONFIG.colors, ...saved.colors },
      page: { ...DEFAULT_CONFIG.page, ...saved.page },
    };
    // Validate merged config to guard against tampered localStorage values
    const { valid } = validateConfig(merged);
    return valid ? merged : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config) {
  const { valid, errors } = validateConfig(config);
  if (!valid) throw new Error(errors.join('\n'));
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  return config;
}

export function resetConfig() {
  localStorage.removeItem(CONFIG_KEY);
  return { ...DEFAULT_CONFIG };
}

export function getLogoDataUrl() {
  return localStorage.getItem(LOGO_KEY) || null;
}

export function saveLogoDataUrl(dataUrl) {
  localStorage.setItem(LOGO_KEY, dataUrl);
}

export function removeLogo() {
  localStorage.removeItem(LOGO_KEY);
}
