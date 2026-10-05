'use strict';

const MANUFACTURERS = {
  apple: {
    brand: 'Apple',
    urls: [
      'https://www.apple.com/kr/iphone/',
      'https://www.apple.com/kr/shop/buy-iphone'
    ],
    allowedHosts: ['apple.com', 'www.apple.com']
  },
  samsung: {
    brand: 'Samsung',
    urls: [
      'https://www.samsung.com/sec/smartphones/',
      'https://www.samsung.com/sec/smartphones/all-smartphones/'
    ],
    allowedHosts: ['samsung.com', 'www.samsung.com']
  },
  xiaomi: {
    brand: 'Xiaomi',
    urls: [
      'https://www.mi.com/kr/product-list/phone/',
      'https://www.mi.com/kr/phone/'
    ],
    allowedHosts: ['mi.com', 'www.mi.com']
  },
  motorola: {
    brand: 'Motorola',
    urls: [
      'https://www.motorola.com/kr/ko/motorola',
      'https://kr.motorola.com/motorola',
      'https://www.motorola.com/kr/ko/moto-g-family'
    ],
    allowedHosts: ['motorola.com', 'www.motorola.com', 'kr.motorola.com']
  }
};

function clean(value = '') {
  return String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizedKey(value = '') {
  return clean(value)
    .toLowerCase()
    .replace(/iphone/g, '아이폰')
    .replace(/galaxy/g, '갤럭시')
    .replace(/motorola/g, '모토로라')
    .replace(/\+/g, 'plus')
    .replace(/프로\s*맥스/g, 'promax')
    .replace(/pro\s*max/g, 'promax')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function slug(value = '') {
  return clean(value)
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function pretty(value = '') {
  return clean(value)
    .replace(/\bpro max\b/ig, 'Pro Max')
    .replace(/\bpro\b/ig, 'Pro')
    .replace(/\bultra\b/ig, 'Ultra')
    .replace(/\bplus\b/ig, 'Plus')
    .replace(/\bmini\b/ig, 'mini')
    .replace(/\bair\b/ig, 'Air')
    .replace(/\bduo\b/ig, 'Duo')
    .replace(/\blite\b/ig, 'Lite')
    .replace(/\bfe\b/ig, 'FE')
    .replace(/\bfold\b/ig, 'Fold')
    .replace(/\bflip\b/ig, 'Flip')
    .replace(/\b5g\b/ig, '5G');
}

function extractApple(text = '') {
  const out = [];
  const re = /iPhone\s*(?:Duo|Air|SE(?:\s*\d(?:세대)?)?|\d{1,2}(?:e)?)(?:\s*(?:Pro\s*Max|Pro|Plus|mini))?/ig;
  for (const m of clean(text).matchAll(re)) {
    out.push(clean(pretty(m[0]).replace(/^iphone/i, 'iPhone')));
  }
  return out;
}

function extractSamsung(text = '') {
  const source = clean(text);
  const out = [];

  for (const m of source.matchAll(/(?:Galaxy|갤럭시)\s*(S\d{1,2}|A\d{1,2}|M\d{1,2})(?:\s*(Ultra|울트라|FE|\+|Plus))?(?:\s*5G)?/ig)) {
    let variant = m[2] || '';
    if (variant === '+') variant = '+';
    else if (/울트라/i.test(variant)) variant = 'Ultra';
    else variant = pretty(variant);
    out.push(clean(`갤럭시 ${m[1].toUpperCase()}${variant ? ` ${variant}` : ''}`));
  }

  for (const m of source.matchAll(/(?:Galaxy|갤럭시)\s*Z\s*(Fold|폴드|Flip|플립)\s*(\d{1,2})(?:\s*(Ultra|울트라|FE))?/ig)) {
    const kind = /fold|폴드/i.test(m[1]) ? 'Fold' : 'Flip';
    const variant = m[3] ? (/울트라/i.test(m[3]) ? 'Ultra' : pretty(m[3])) : '';
    out.push(clean(`갤럭시 Z ${kind}${m[2]}${variant ? ` ${variant}` : ''}`));
  }

  return out;
}

function extractXiaomi(text = '') {
  const source = clean(text);
  const out = [];

  for (const m of source.matchAll(/Xiaomi\s+\d{1,2}[A-Za-z]?(?:\s+(?:Ultra|Pro|Lite))?/ig)) {
    if (!/\bPad\b/i.test(m[0])) out.push(pretty(m[0]).replace(/^xiaomi/i, 'Xiaomi'));
  }

  for (const m of source.matchAll(/REDMI\s+Note\s+\d{1,2}(?:\s+Pro\+?|\s+Pro|\s+\+)?(?:\s+5G)?/ig)) {
    out.push(pretty(m[0]).replace(/^redmi/i, 'Redmi'));
  }

  for (const m of source.matchAll(/REDMI\s+\d{1,2}[A-Za-z]?(?:\s+(?:Pro|5G)){0,2}/ig)) {
    if (!/\bPad\b/i.test(m[0])) out.push(pretty(m[0]).replace(/^redmi/i, 'Redmi'));
  }

  for (const m of source.matchAll(/POCO\s+[A-Z]\d{1,2}(?:\s+Pro)?(?:\s+5G)?/ig)) {
    out.push(pretty(m[0]).replace(/^poco/i, 'POCO'));
  }

  return out;
}

function extractMotorola(text = '') {
  const source = clean(text);
  const out = [];

  for (const m of source.matchAll(/moto\s+g\d{1,3}(?:\s+5G)?/ig)) {
    out.push(pretty(m[0]).replace(/^moto/i, 'moto'));
  }

  for (const m of source.matchAll(/(?:motorola|moto)\s+edge\s+\d{1,3}(?:\s+(?:Pro|Ultra|Fusion|Neo))?/ig)) {
    out.push(pretty(m[0]).replace(/^moto\s+edge/i, 'motorola edge').replace(/^motorola/i, 'motorola'));
  }

  for (const m of source.matchAll(/(?:motorola\s+)?razr\s+\d{1,3}(?:\s+Ultra)?/ig)) {
    out.push(pretty(m[0]).replace(/^motorola/i, 'motorola').replace(/^razr/i, 'motorola razr'));
  }

  return out;
}

function extractNames(manufacturer, text = '') {
  let names = [];
  if (manufacturer === 'apple') names = extractApple(text);
  else if (manufacturer === 'samsung') names = extractSamsung(text);
  else if (manufacturer === 'xiaomi') names = extractXiaomi(text);
  else if (manufacturer === 'motorola') names = extractMotorola(text);

  const seen = new Set();
  return names.map(clean).filter(name => {
    const key = normalizedKey(name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function seriesFor(manufacturer, name = '') {
  const n = clean(name);
  if (manufacturer === 'apple') return 'iPhone';
  if (manufacturer === 'samsung') {
    if (/갤럭시\s+S/i.test(n)) return 'Galaxy S';
    if (/갤럭시\s+Z/i.test(n)) return 'Galaxy Z';
    if (/갤럭시\s+A/i.test(n)) return 'Galaxy A';
    if (/갤럭시\s+M/i.test(n)) return 'Galaxy M';
    return 'Galaxy';
  }
  if (manufacturer === 'xiaomi') {
    if (/^Redmi\s+Note/i.test(n)) return 'Redmi Note';
    if (/^Redmi/i.test(n)) return 'Redmi';
    if (/^POCO/i.test(n)) return 'POCO';
    return 'Xiaomi';
  }
  if (manufacturer === 'motorola') {
    if (/razr/i.test(n)) return 'Motorola Razr';
    if (/edge/i.test(n)) return 'Motorola Edge';
    if (/moto\s+g/i.test(n)) return 'Moto G';
    return 'Motorola';
  }
  return '';
}

function idFor(manufacturer, name = '') {
  const n = clean(name);
  if (manufacturer === 'apple') return slug(n.replace(/^iPhone/i, 'iphone'));
  return slug(n);
}

function aliasesFor(manufacturer, name = '') {
  const n = clean(name);
  const out = [n, n.replace(/\s+/g, '')];

  if (manufacturer === 'apple') {
    out.push(n.toLowerCase());
    out.push(n.replace(/^iPhone/i, '아이폰'));
    out.push(n.replace(/^iPhone/i, '아이폰').replace(/\s+/g, ''));
  } else if (manufacturer === 'samsung') {
    out.push(n.replace(/^갤럭시/i, 'Galaxy'));
    out.push(n.replace(/^갤럭시/i, 'Galaxy').replace(/\s+/g, ''));
  } else if (manufacturer === 'xiaomi') {
    out.push(n.toLowerCase());
  } else if (manufacturer === 'motorola') {
    out.push(n.toLowerCase());
    out.push(n.replace(/^motorola/i, '모토로라'));
  }

  const seen = new Set();
  return out.map(clean).filter(v => {
    const key = normalizedKey(v);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function officialUrl(manufacturer, href = '', fallback = '') {
  const cfg = MANUFACTURERS[manufacturer];
  if (!cfg) return fallback || '';

  try {
    const u = new URL(href || fallback || cfg.urls[0], fallback || cfg.urls[0]);
    if (!cfg.allowedHosts.includes(u.hostname)) return fallback || cfg.urls[0];
    return u.toString();
  } catch {
    return fallback || cfg.urls[0];
  }
}

function buildDiscoveredRecord(manufacturer, name, sourceUrl, discoveredAt = new Date().toISOString()) {
  const cfg = MANUFACTURERS[manufacturer];
  if (!cfg) return null;

  const cleanName = clean(name);
  if (!cleanName) return null;

  return {
    id: idFor(manufacturer, cleanName),
    name: cleanName,
    brand: cfg.brand,
    series: seriesFor(manufacturer, cleanName),
    aliases: aliasesFor(manufacturer, cleanName),
    releaseYear: null,
    verified: false,
    autoDiscovered: true,
    discoveryStatus: 'official-catalog-name-detected',
    discoveredAt,
    storage: [],
    launchPrices: {},
    specs: { chipset: null, display: null, camera: null, charging: null, frame: null },
    scores: { performance: null, daily: null, gaming: null, camera: null },
    colors: [],
    officialSource: sourceUrl || cfg.urls[0],
    listings: [],
    imageMode: 'no-image-until-approved',
    image: '',
    imageVerified: false
  };
}

function recordKeys(phone = {}) {
  return [phone.name, ...(phone.aliases || [])].map(normalizedKey).filter(Boolean);
}

function mergeDiscovered(staticPhones = [], discoveredPhones = []) {
  const result = [...staticPhones];
  const known = new Set();

  for (const phone of staticPhones) {
    if (phone.id) known.add(`id:${phone.id}`);
    for (const key of recordKeys(phone)) known.add(key);
  }

  for (const phone of discoveredPhones) {
    const keys = recordKeys(phone);
    if ((phone.id && known.has(`id:${phone.id}`)) || keys.some(k => known.has(k))) continue;

    result.push(phone);
    if (phone.id) known.add(`id:${phone.id}`);
    for (const key of keys) known.add(key);
  }

  return result;
}

module.exports = {
  MANUFACTURERS,
  clean,
  normalizedKey,
  extractNames,
  seriesFor,
  idFor,
  aliasesFor,
  officialUrl,
  buildDiscoveredRecord,
  mergeDiscovered
};
