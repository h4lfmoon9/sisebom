'use strict';

const { applyVisualProfile } = require('./catalogVisualProfile');

function clamp(n, min = 1, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(n) || 0)));
}

function text(v = '') {
  return String(v || '').trim();
}

function normalizedName(phone = {}) {
  return `${text(phone.brand)} ${text(phone.series)} ${text(phone.name)}`
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/\s+/g, ' ');
}

function inferStorage(phone = {}) {
  const n = normalizedName(phone);

  if (/samsung|갤럭시|galaxy/.test(n)) {
    if (/z\s*(fold|폴드)|fold/.test(n)) return [256, 512, 1024];
    if (/z\s*(flip|플립)|flip/.test(n)) return [128, 256, 512];
    if (/ultra|울트라/.test(n)) return [256, 512, 1024];
    if (/galaxy\s*s|갤럭시\s*s/.test(n)) return [128, 256, 512];
    if (/galaxy\s*[am]|갤럭시\s*[am]/.test(n)) return [128, 256];
  }

  if (/xiaomi|샤오미/.test(n)) {
    if (/ultra/.test(n)) return [256, 512, 1024];
    return [128, 256, 512];
  }

  if (/redmi|레드미/.test(n)) return [128, 256, 512];
  if (/poco|포코/.test(n)) return [128, 256, 512];

  if (/motorola|모토로라|moto\s/.test(n)) {
    if (/razr|edge/.test(n)) return [256, 512];
    return [128, 256];
  }

  return [];
}

function samsungScore(n) {
  let m = n.match(/(?:galaxy|갤럭시)\s*s\s*(\d{2})/);
  if (m) {
    let score = 70 + (Number(m[1]) - 21) * 6;
    if (/plus/.test(n)) score += 1;
    if (/ultra|울트라/.test(n)) score += 3;
    if (/\bfe\b/.test(n)) score -= 5;
    return clamp(score);
  }

  m = n.match(/(?:galaxy|갤럭시)\s*a\s*(\d{2})/);
  if (m) {
    const model = Number(m[1]);
    const tier = Math.floor(model / 10);
    const generation = model % 10;
    return clamp(28 + tier * 7 + generation * 2);
  }

  m = n.match(/(?:galaxy|갤럭시)\s*m\s*(\d{2})/);
  if (m) {
    const model = Number(m[1]);
    return clamp(25 + Math.floor(model / 10) * 6 + (model % 10) * 2);
  }

  m = n.match(/(?:fold|폴드)\s*(\d{1,2})/);
  if (m) return clamp(70 + Number(m[1]) * 4);

  m = n.match(/(?:flip|플립)\s*(\d{1,2})/);
  if (m) return clamp(68 + Number(m[1]) * 4);

  return null;
}

function xiaomiScore(n) {
  let m = n.match(/(?:xiaomi|샤오미)\s*(\d{2})(?:t)?/);
  if (m) {
    let score = 82 + (Number(m[1]) - 12) * 5;
    if (/ultra/.test(n)) score += 4;
    else if (/\bpro\b/.test(n)) score += 2;
    if (/\blite\b/.test(n)) score -= 9;
    if (/\d{2}t/.test(n)) score -= 2;
    return clamp(score);
  }

  m = n.match(/(?:redmi|레드미)\s*note\s*(\d{2})/);
  if (m) {
    let score = 45 + (Number(m[1]) - 11) * 4;
    if (/pro\s*plus|pro\+/.test(n)) score += 7;
    else if (/\bpro\b/.test(n)) score += 5;
    return clamp(score);
  }

  m = n.match(/(?:poco|포코)\s*([fxm])\s*(\d{1,2})/);
  if (m) {
    const family = m[1];
    const gen = Number(m[2]);
    let base = family === 'f' ? 72 : family === 'x' ? 62 : 48;
    base += gen * 2.5;
    if (/\bpro\b/.test(n)) base += 5;
    return clamp(base);
  }

  return null;
}

function motorolaScore(n) {
  let m = n.match(/edge\s*(\d{2,3})/);
  if (m) {
    let score = 76 + Math.max(0, Number(m[1]) - 30) * 0.35;
    if (/ultra/.test(n)) score += 5;
    else if (/\bpro\b/.test(n)) score += 3;
    return clamp(score);
  }

  m = n.match(/razr\s*(\d{2,3})/);
  if (m) {
    let score = 78 + Math.max(0, Number(m[1]) - 40) * 0.4;
    if (/ultra/.test(n)) score += 4;
    return clamp(score);
  }

  m = n.match(/moto\s*g\s*(\d{1,3})/);
  if (m) return clamp(42 + Math.min(35, Number(m[1]) * 0.35));

  return null;
}

function estimatePerformance(phone = {}) {
  const n = normalizedName(phone);
  return samsungScore(n) ?? xiaomiScore(n) ?? motorolaScore(n);
}

function estimateScores(phone = {}) {
  const performance = estimatePerformance(phone);
  if (performance == null) return null;

  const n = normalizedName(phone);
  const flagshipCamera = /ultra|울트라|fold|폴드|\bpro\b|xiaomi|샤오미/.test(n);

  return {
    performance,
    daily: clamp(performance + 3),
    gaming: clamp(performance - 3),
    camera: clamp(performance + (flagshipCamera ? 2 : -5), 20, 100)
  };
}

function extractQuickSpecsFromText(value = '') {
  const s = text(value).replace(/\s+/g, ' ');
  const specs = { chipset: null, display: null, camera: null, charging: null, frame: null };

  let m = s.match(/\b(Snapdragon\s+[0-9A-Za-z+ -]{2,24}|Exynos\s+\d{3,5}|Dimensity\s+\d{3,5}[A-Za-z+ -]*|Helio\s+[A-Z]\d{2,4}|Tensor\s+G\d)\b/i);
  if (m) specs.chipset = text(m[1]);

  m = s.match(/(\d(?:\.\d{1,2})?)\s*(?:인치|inch|")\s*[^|]{0,40}?\b(AMOLED|OLED|LCD)\b[^|]{0,24}?(\d{2,3}\s*Hz)?/i);
  if (m) specs.display = text(`${m[1]}인치 ${m[2]}${m[3] ? ` ${m[3].replace(/\s+/g, '')}` : ''}`);

  m = s.match(/\b(\d{2,3})\s*MP\b[^|]{0,40}/i);
  if (m) specs.camera = `${m[1]}MP 카메라`;

  m = s.match(/\b(\d{2,3})\s*W\b[^|]{0,24}?(?:충전|charging)/i);
  if (m) specs.charging = `${m[1]}W 충전`;

  return specs;
}

function mergeMissingObject(existing = {}, incoming = {}) {
  const out = { ...existing };
  for (const [key, value] of Object.entries(incoming || {})) {
    const old = out[key];
    const oldMissing = old == null || old === '' || old === '정보 확인 중';
    if (oldMissing && value != null && value !== '') out[key] = value;
  }
  return out;
}

function applyAutoProfile(phone = {}) {
  const out = { ...phone };

  if (!Array.isArray(out.storage) || out.storage.length === 0) {
    out.storage = inferStorage(out);
  }

  const inferred = estimateScores(out);
  if (inferred) {
    out.scores = mergeMissingObject(out.scores || {}, inferred);
    if (out.performance == null && out.scores?.performance != null) {
      out.performance = out.scores.performance;
    }
  }

  out.specs = {
    chipset: null,
    display: null,
    camera: null,
    charging: null,
    frame: null,
    ...(out.specs || {})
  };

  if (!out.scoreSource && inferred) out.scoreSource = 'sisebom-auto-profile-v1';
  return applyVisualProfile(out);
}


function applyAutoProfileCatalog(phones = []) {
  return (Array.isArray(phones) ? phones : []).map(applyAutoProfile);
}

module.exports = {
  inferStorage,
  estimatePerformance,
  estimateScores,
  extractQuickSpecsFromText,
  applyAutoProfile,
  applyAutoProfileCatalog,
  mergeMissingObject
};
