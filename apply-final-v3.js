'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const file = rel => path.join(ROOT, ...rel.split('/'));
const read = rel => fs.readFileSync(file(rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(file(rel), value, 'utf8');

function replaceBetween(source, startText, endText, replacement) {
  const start = source.indexOf(startText);
  if (start < 0) throw new Error(`시작 문자열을 찾지 못함: ${startText}`);
  const end = source.indexOf(endText, start);
  if (end < 0) throw new Error(`끝 문자열을 찾지 못함: ${endText}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

// catalogRules.js
let rules = read('server/catalogRules.js');

if (!rules.includes('FINAL_V3_MULTIBRAND')) {
  rules = rules.replace(
    ".replace(/motorola/g, '모토로라')",
    ".replace(/motorola/g, '모토로라')\n    .replace(/샤오미/g, 'xiaomi')\n    .replace(/레드미/g, 'redmi')\n    .replace(/포코/g, 'poco')"
  );

  rules = rules.replace(
    "  } else if (manufacturer === 'xiaomi') {\n    out.push(n.toLowerCase());\n  }",
    "  } else if (manufacturer === 'xiaomi') {\n    out.push(n.toLowerCase());\n    if (/^Xiaomi/i.test(n)) { out.push(n.replace(/^Xiaomi/i, '샤오미')); out.push(n.replace(/^Xiaomi/i, '샤오미').replace(/\\s+/g, '')); }\n    if (/^Redmi/i.test(n)) { out.push(n.replace(/^Redmi/i, '레드미')); out.push(n.replace(/^Redmi/i, '레드미').replace(/\\s+/g, '')); }\n    if (/^POCO/i.test(n)) { out.push(n.replace(/^POCO/i, '포코')); out.push(n.replace(/^POCO/i, '포코').replace(/\\s+/g, '')); }\n  }"
  );

  const newBuild = `function buildDiscoveredRecord(manufacturer, name, sourceUrl, details = {}, discoveredAt = new Date().toISOString()) {
  const cfg = MANUFACTURERS[manufacturer];
  if (!cfg) return null;

  const cleanName = clean(name);
  if (!cleanName) return null;

  const detailsSpecs = details.specs || {};
  const image = String(details.image || '').trim();

  return {
    id: idFor(manufacturer, cleanName),
    name: cleanName,
    brand: cfg.brand,
    series: seriesFor(manufacturer, cleanName),
    aliases: aliasesFor(manufacturer, cleanName),
    releaseYear: null,
    verified: Boolean(details.verified),
    autoDiscovered: true,
    discoveryStatus: 'official-catalog-detected',
    discoveredAt,
    storage: Array.isArray(details.storage) ? details.storage : [],
    launchPrices: {},
    specs: {
      chipset: detailsSpecs.chipset || null,
      display: detailsSpecs.display || null,
      camera: detailsSpecs.camera || null,
      charging: detailsSpecs.charging || null,
      frame: detailsSpecs.frame || null
    },
    scores: { performance: null, daily: null, gaming: null, camera: null },
    colors: [],
    officialSource: sourceUrl || cfg.urls[0],
    listings: [],
    imageMode: image ? 'official-catalog' : 'official-catalog-no-image',
    image,
    imageVerified: Boolean(image)
  };
}`;
  rules = replaceBetween(rules, 'function buildDiscoveredRecord(', '\n\nfunction recordKeys', newBuild);

  const newMerge = `function useful(v) {
  return !(v == null || v === '' || v === '정보 확인 중');
}

function mergeObjectMissing(existing = {}, incoming = {}) {
  const out = { ...existing };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (!useful(out[key]) && useful(value)) out[key] = value;
  }
  return out;
}

function mergeDiscovered(staticPhones = [], discoveredPhones = []) {
  const result = staticPhones.map(phone => ({ ...phone }));
  const indexByKey = new Map();

  const register = (phone, index) => {
    if (phone.id) indexByKey.set(\`id:\${phone.id}\`, index);
    for (const key of recordKeys(phone)) indexByKey.set(key, index);
  };

  result.forEach(register);

  for (const incoming of discoveredPhones) {
    const keys = recordKeys(incoming);
    let index = incoming.id ? indexByKey.get(\`id:\${incoming.id}\`) : undefined;

    if (index == null) {
      for (const key of keys) {
        if (indexByKey.has(key)) { index = indexByKey.get(key); break; }
      }
    }

    if (index == null) {
      result.push({ ...incoming });
      register(incoming, result.length - 1);
      continue;
    }

    const old = result[index];
    const merged = {
      ...old,
      aliases: [...new Set([...(old.aliases || []), ...(incoming.aliases || [])])],
      storage: old.storage?.length ? old.storage : (incoming.storage || []),
      launchPrices: Object.keys(old.launchPrices || {}).length ? old.launchPrices : (incoming.launchPrices || {}),
      specs: mergeObjectMissing(old.specs || {}, incoming.specs || {}),
      scores: mergeObjectMissing(old.scores || {}, incoming.scores || {}),
      officialSource: old.officialSource || incoming.officialSource || '',
      image: old.image || incoming.image || '',
      imageMode: old.imageMode || incoming.imageMode || '',
      imageVerified: Boolean(old.imageVerified || incoming.imageVerified),
      autoDiscovered: Boolean(old.autoDiscovered || incoming.autoDiscovered),
      discoveredAt: old.discoveredAt || incoming.discoveredAt || null
    };

    result[index] = merged;
    register(merged, index);
  }

  return result;
}`;
  rules = replaceBetween(rules, 'function mergeDiscovered(', '\n\nmodule.exports =', newMerge);
  rules = rules.replace("'use strict';", "'use strict';\n// FINAL_V3_MULTIBRAND");
}
write('server/catalogRules.js', rules);

// catalogDiscovery.js
let discovery = read('server/catalogDiscovery.js');

if (!discovery.includes('FINAL_V3_OFFICIAL_ENRICH')) {
  discovery = discovery.replace(
    "const { MANUFACTURERS, extractNames, officialUrl, buildDiscoveredRecord } = require('./catalogRules');",
    "const { MANUFACTURERS, extractNames, officialUrl, buildDiscoveredRecord } = require('./catalogRules');\nconst { extractQuickSpecsFromText } = require('./catalogAutoProfile');"
  );

  const newCollect = `async function collectTextNodes(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('h1,h2,h3,h4,a,[data-testid*="product" i],[class*="product" i]')];

    return nodes.slice(0, 3500).map(el => {
      const anchor = el.closest('a') || el.querySelector?.('a') || el;
      const card =
        el.closest('article') ||
        el.closest('li') ||
        el.closest('[class*="product" i]') ||
        el.closest('[data-testid*="product" i]') ||
        el.parentElement ||
        el;

      const img = card?.querySelector?.('img') || el.querySelector?.('img');
      const srcset = img?.getAttribute?.('srcset') || '';
      const srcsetImage = srcset
        ? String(srcset).split(',').map(x => x.trim().split(/\\s+/)[0]).filter(Boolean).pop() || ''
        : '';

      return {
        text: String(el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim(),
        contextText: String(card?.innerText || card?.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 1200),
        href: anchor?.href || anchor?.getAttribute?.('href') || '',
        image: img?.currentSrc || img?.src || img?.getAttribute?.('data-src') || img?.getAttribute?.('data-original') || srcsetImage || ''
      };
    }).filter(x => x.text);
  });
}`;
  discovery = replaceBetween(discovery, 'async function collectTextNodes(page) {', '\n\nasync function scanUrl', newCollect);

  discovery = discovery.replace(
    "candidates.push({ name, sourceUrl: officialUrl(manufacturer, node.href, url) });",
    "candidates.push({ name, sourceUrl: officialUrl(manufacturer, node.href, url), image: node.image || '', contextText: node.contextText || node.text });"
  );

  discovery = discovery.replace(
    "const record = buildDiscoveredRecord(manufacturer, candidate.name, candidate.sourceUrl);",
    "const record = buildDiscoveredRecord(manufacturer, candidate.name, candidate.sourceUrl, { image: candidate.image, imageVerified: Boolean(candidate.image), specs: extractQuickSpecsFromText(candidate.contextText) });"
  );

  discovery = discovery.replace('if (records.length >= 4) break;', 'if (records.length >= 24) break;');
  discovery = discovery.replace("'use strict';", "'use strict';\n// FINAL_V3_OFFICIAL_ENRICH");
}
write('server/catalogDiscovery.js', discovery);

// listingQuality.js
let quality = read('server/listingQuality.js');
if (!quality.includes('FINAL_V3_MULTIBRAND_MATCH')) {
  quality = quality.replace(
    ".replace(/motorola/g, '모토로라')",
    ".replace(/motorola/g, '모토로라')\n    .replace(/샤오미/g, 'xiaomi')\n    .replace(/레드미/g, 'redmi')\n    .replace(/포코/g, 'poco')"
  );
  quality = quality.replace("'use strict';", "'use strict';\n// FINAL_V3_MULTIBRAND_MATCH");
}
write('server/listingQuality.js', quality);

// server.js
let serverJs = read('server/server.js');
if (!serverJs.includes('FINAL_V3_SERVER')) {
  serverJs = serverJs.replace(
    ".replace(/프로\\s*맥스/g, \"promax\")",
    ".replace(/iphone/g, \"아이폰\")\n    .replace(/galaxy/g, \"갤럭시\")\n    .replace(/xiaomi/g, \"샤오미\")\n    .replace(/redmi/g, \"레드미\")\n    .replace(/poco/g, \"포코\")\n    .replace(/motorola/g, \"모토로라\")\n    .replace(/프로\\s*맥스/g, \"promax\")"
  );
  serverJs = serverJs.replace(/release:\s*"30-final"/g, 'release: "final-v3"');
  serverJs = serverJs.replace("'use strict';", "'use strict';\n// FINAL_V3_SERVER");
}
write('server/server.js', serverJs);

// index.html
let index = read('index.html');
index = index.replace(
  '<div class="image-note">사용자가 제공한 제품 이미지만 사용</div>',
  '<div id="imageNote" class="image-note">공식 제조사 이미지 우선 · 없으면 실제 매물 사진</div>'
);
write('index.html', index);

// style.css
let style = read('style.css');
if (!style.includes('FINAL_V3_MULTIBRAND')) {
  style += '\n/* FINAL_V3_MULTIBRAND */\n.model-card img,.product-image-card img{object-position:center}\n.image-note{min-height:18px}\n';
}
write('style.css', style);

console.log('');
console.log('✅ 시세봄 FINAL V3 멀티브랜드 자동화 적용 완료');
console.log('- Galaxy/Xiaomi/Redmi/POCO/Motorola 자동 성능점수/용량 프로필');
console.log('- 공식 제조사 페이지 새 모델 자동 감지 + 공식 이미지 우선');
console.log('- 공식 카드에서 확인 가능한 스펙 자동 추출');
console.log('- 새 시리즈도 중고 통합검색용 정확 검색어 자동 생성');
console.log('- 공식 이미지가 없으면 실제 매물 첫 사진을 대표이미지로 사용');
console.log('');
console.log('GitHub Desktop에서 Commit / Push 하세요.');
