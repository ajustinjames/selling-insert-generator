import {
  loadConfig,
  saveConfig,
  resetConfig,
  validateConfig,
  getLogoDataUrl,
  saveLogoDataUrl,
  removeLogo,
  DEFAULT_CONFIG,
} from './config.js';
import { renderPreview } from './preview.js';
import { generateInsertPdf, triggerDownload } from './pdf-generator.js';

// ── State ────────────────────────────────────────────────────────
let config = loadConfig();
let logoDataUrl = getLogoDataUrl();

// ── Helpers ──────────────────────────────────────────────────────
function getFormData() {
  return {
    item_name: document.getElementById('item_name').value.trim(),
    order_number: document.getElementById('order_number').value.trim(),
    buyer_name: document.getElementById('buyer_name').value.trim(),
    custom_note: document.getElementById('custom_note').value.trim(),
  };
}

function updatePreview() {
  const container = document.getElementById('preview-container');
  renderPreview(container, config, getFormData(), logoDataUrl);
}

function updateDownloadBtn() {
  const btn = document.getElementById('download-btn');
  const val = document.getElementById('item_name').value.trim();
  btn.disabled = val.length === 0;
}

// ── View switching ────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.nav;
    document.body.dataset.view = view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (view === 'settings') populateSettingsForm();
  });
});

// ── Main page ─────────────────────────────────────────────────────
document.getElementById('item_name').addEventListener('input', e => {
  document.getElementById('item_name_count').textContent = e.target.value.length;
  updateDownloadBtn();
  updatePreview();
});

['order_number', 'buyer_name', 'custom_note'].forEach(id => {
  document.getElementById(id).addEventListener('input', updatePreview);
});

document.getElementById('download-btn').addEventListener('click', async () => {
  const formData = getFormData();
  const errEl = document.getElementById('download-error');
  errEl.hidden = true;

  if (!formData.item_name) {
    errEl.textContent = 'Item name is required.';
    errEl.hidden = false;
    return;
  }

  const btn = document.getElementById('download-btn');
  btn.disabled = true;
  btn.textContent = 'GENERATING…';

  try {
    const pdfBytes = await generateInsertPdf(config, formData, logoDataUrl);
    const safeName = formData.item_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    triggerDownload(pdfBytes, `insert_${safeName}.pdf`);
  } catch (err) {
    errEl.textContent = `Error: ${err.message}`;
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = '⬇ DOWNLOAD PDF';
    updateDownloadBtn();
  }
});

// ── Settings: form population ─────────────────────────────────────
function populateSettingsForm() {
  document.getElementById('s_store_name').value = config.store_name;

  const platformSel = document.getElementById('s_platform');
  const platformOther = document.getElementById('s_platform_other');
  const builtInOptions = Array.from(platformSel.options).map(o => o.value);

  if (builtInOptions.includes(config.platform)) {
    platformSel.value = config.platform;
    platformOther.hidden = true;
  } else {
    platformSel.value = 'Other';
    platformOther.value = config.platform;
    platformOther.hidden = false;
  }

  populateDynamicList('taglines-list', config.taglines, 4, 'add-tagline-btn');
  populateDynamicList('footer-list', config.footer_lines, 3, 'add-footer-btn');

  Object.entries(config.colors).forEach(([key, hex]) => {
    const picker = document.querySelector(`.color-picker[data-color-key="${key}"]`);
    const hexInput = document.querySelector(`.color-hex[data-color-key="${key}"]`);
    if (picker) picker.value = hex;
    if (hexInput) hexInput.value = hex;
    checkThermalWarn(key, hex);
  });

  document.getElementById('s_width').value = config.page.width_inches;
  document.getElementById('s_height').value = config.page.height_inches;

  updateLogoUI();
}

// ── Settings: logo ────────────────────────────────────────────────
function updateLogoUI() {
  const previewWrap = document.getElementById('logo-preview-wrap');
  const uploadArea = document.getElementById('logo-upload-area');
  const previewImg = document.getElementById('logo-preview-img');

  if (logoDataUrl) {
    previewImg.src = logoDataUrl;
    previewWrap.hidden = false;
    uploadArea.hidden = true;
  } else {
    previewWrap.hidden = true;
    uploadArea.hidden = false;
  }
}

document.getElementById('logo-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const errEl = document.getElementById('logo-error');
  errEl.hidden = true;

  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    errEl.textContent = 'Only PNG and JPG files are supported.';
    errEl.hidden = false;
    e.target.value = '';
    return;
  }
  if (file.size > 500 * 1024) {
    errEl.textContent = 'Logo must be 500 KB or smaller.';
    errEl.hidden = false;
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    logoDataUrl = ev.target.result;
    saveLogoDataUrl(logoDataUrl);
    updateLogoUI();
    updatePreview();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

document.getElementById('logo-remove-btn').addEventListener('click', () => {
  logoDataUrl = null;
  removeLogo();
  updateLogoUI();
  updatePreview();
});

// ── Settings: platform dropdown ───────────────────────────────────
document.getElementById('s_platform').addEventListener('change', e => {
  const other = document.getElementById('s_platform_other');
  other.hidden = e.target.value !== 'Other';
});

// ── Settings: dynamic lists ───────────────────────────────────────
function populateDynamicList(listId, items, maxItems, addBtnId) {
  const list = document.getElementById(listId);
  list.replaceChildren();
  items.forEach(value => addListItem(list, value, maxItems, addBtnId));
  updateAddButton(list, maxItems, addBtnId);
}

function addListItem(list, value = '', maxItems, addBtnId) {
  const row = document.createElement('div');
  row.className = 'dynamic-list-item';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'field-input';
  input.value = value;
  input.maxLength = 100;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'list-remove-btn';
  removeBtn.setAttribute('aria-label', 'Remove');
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => {
    row.remove();
    updateAddButton(list, maxItems, addBtnId);
  });

  row.appendChild(input);
  row.appendChild(removeBtn);
  list.appendChild(row);
  updateAddButton(list, maxItems, addBtnId);
}

function updateAddButton(list, maxItems, addBtnId) {
  const btn = document.getElementById(addBtnId);
  if (btn) btn.hidden = list.children.length >= maxItems;
}

function getListValues(listId) {
  return Array.from(document.querySelectorAll(`#${listId} .field-input`))
    .map(i => i.value.trim())
    .filter(Boolean);
}

document.getElementById('add-tagline-btn').addEventListener('click', () => {
  const list = document.getElementById('taglines-list');
  addListItem(list, '', 4, 'add-tagline-btn');
});

document.getElementById('add-footer-btn').addEventListener('click', () => {
  const list = document.getElementById('footer-list');
  addListItem(list, '', 3, 'add-footer-btn');
});

// ── Settings: color pickers ───────────────────────────────────────
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function checkThermalWarn(key, hex) {
  const warnEl = document.getElementById(`warn_${key}`);
  if (!warnEl) return;
  if (!HEX_RE.test(hex)) { warnEl.hidden = true; return; }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  warnEl.hidden = !(r > 0x66 || g > 0x66 || b > 0x66);
}

document.querySelectorAll('.color-picker').forEach(picker => {
  picker.addEventListener('input', e => {
    const key = e.target.dataset.colorKey;
    const hex = e.target.value;
    const hexInput = document.querySelector(`.color-hex[data-color-key="${key}"]`);
    if (hexInput) hexInput.value = hex;
    checkThermalWarn(key, hex);
  });
});

document.querySelectorAll('.color-hex').forEach(hexInput => {
  hexInput.addEventListener('input', e => {
    const key = e.target.dataset.colorKey;
    const hex = e.target.value;
    if (HEX_RE.test(hex)) {
      const picker = document.querySelector(`.color-picker[data-color-key="${key}"]`);
      if (picker) picker.value = hex;
    }
    checkThermalWarn(key, hex);
  });
});

// ── Settings: save ────────────────────────────────────────────────
document.getElementById('save-btn').addEventListener('click', () => {
  const feedbackEl = document.getElementById('save-feedback');
  feedbackEl.hidden = true;
  feedbackEl.className = 'save-feedback';

  const platformSel = document.getElementById('s_platform');
  const platform = platformSel.value === 'Other'
    ? document.getElementById('s_platform_other').value.trim() || 'Other'
    : platformSel.value;

  const colors = {};
  document.querySelectorAll('.color-hex').forEach(el => {
    colors[el.dataset.colorKey] = el.value.trim();
  });

  const candidate = {
    store_name: document.getElementById('s_store_name').value.trim(),
    platform,
    taglines: getListValues('taglines-list'),
    footer_lines: getListValues('footer-list'),
    colors,
    page: {
      width_inches: parseFloat(document.getElementById('s_width').value),
      height_inches: parseFloat(document.getElementById('s_height').value),
    },
  };

  const { valid, errors, warnings } = validateConfig(candidate);

  if (!valid) {
    feedbackEl.textContent = errors.join(' · ');
    feedbackEl.classList.add('error');
    feedbackEl.hidden = false;
    return;
  }

  try {
    config = saveConfig(candidate);
    let msg = 'Settings saved.';
    if (warnings.length) msg += ' ⚠ ' + warnings.join(' · ');
    feedbackEl.textContent = msg;
    feedbackEl.classList.add('success');
    feedbackEl.hidden = false;
    updatePreview();
    setTimeout(() => { feedbackEl.hidden = true; }, 4000);
  } catch (err) {
    feedbackEl.textContent = err.message;
    feedbackEl.classList.add('error');
    feedbackEl.hidden = false;
  }
});

// ── Settings: reset ───────────────────────────────────────────────
document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
  config = resetConfig();
  logoDataUrl = null;
  removeLogo();
  populateSettingsForm();
  updatePreview();
});

// ── Init ──────────────────────────────────────────────────────────
updatePreview();
updateDownloadBtn();
