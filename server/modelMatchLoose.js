'use strict';

// FINAL V5: broad model matching for old/new, regional, carrier and global phone families.
// This is intentionally conservative around suffix variants (Ultra/Pro/Plus/FE/etc.).

function n(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/\b5g\b/g, '')
    .replace(/\blte\b/g, '')
    .replace(/(\d+)\s*(?:gb|기가|g)\b/g, '')
    .replace(/(?:1|2)\s*(?:tb|테라)\b/g, '')
    .replace(/samsung/g, 'samsung')
    .replace(/galaxy|갤럭시/g, 'galaxy')
    .replace(/iphone|아이폰/g, 'iphone')
    .replace(/xiaomi|샤오미/g, 'xiaomi')
    .replace(/redmi|레드미/g, 'redmi')
    .replace(/poco|포코/g, 'poco')
    .replace(/motorola|모토로라/g, 'motorola')
    .replace(/google/g, 'google')
    .replace(/pixel|픽셀/g, 'pixel')
    .replace(/sony/g, 'sony')
    .replace(/엑스페리아/g, 'xperia')
    .replace(/oneplus/g, 'oneplus')
    .replace(/울트라/g, 'ultra')
    .replace(/프로\s*맥스/g, 'promax')
    .replace(/pro\s*max/g, 'promax')
    .replace(/프로\s*플러스/g, 'proplus')
    .replace(/pro\s*\+/g, 'proplus')
    .replace(/프로/g, 'pro')
    .replace(/플러스/g, 'plus')
    .replace(/\+/g, 'plus')
    .replace(/폴드/g, 'fold')
    .replace(/플립/g, 'flip')
    .replace(/미니/g, 'mini')
    .replace(/라이트/g, 'lite')
    .replace(/울트라/g, 'ultra')
    .replace(/에어/g, 'air')
    .replace(/와이드/g, 'wide')
    .replace(/점프/g, 'jump')
    .replace(/퀀텀/g, 'quantum')
    .replace(/버디/g, 'buddy')
    .replace(/노트/g, 'note')
    .replace(/자급제|공기계|풀박스|판매|팝니다|상태좋음/g, '')
    .replace(/[^a-z0-9가-힣]/g, '');
}

const VARIANTS = [
  'promax','proplus','ultra','plus','pro','fe','lite','mini','air','fusion','neo','stylus','power','play'
];

const BRAND_MARKERS = [
  'iphone','galaxy','xiaomi','redmi','poco','motorola','pixel','xperia',
  'oneplus','oppo','vivo','iqoo','realme','honor','huawei','asus','nothing',
  'cmf','nokia','hmd','zte','nubia','redmagic','meizu','tcl','alcatel',
  'sharp','htc','lenovo','tecno','infinix','itel','fairphone','blackberry'
];

function brandMarker(s = '') {
  const x = n(s);
  return BRAND_MARKERS.find(b => x.includes(b)) || '';
}

function targetCandidates(query = '') {
  const q = n(query);
  const out = [q];

  const rules = [
    [/^samsunggalaxy/, 'galaxy'],
    [/^samsung/, ''],
    [/^galaxy/, ''],
    [/^motorola/, ''],
    [/^google/, ''],
    [/^sonyxperia/, 'xperia'],
    [/^sony/, ''],
    [/^lg/, '']
  ];

  for (const [re, replacement] of rules) {
    if (re.test(q)) out.push(q.replace(re, replacement));
  }

  // Korean carrier models and Samsung family names are commonly listed without "Galaxy".
  if (q.startsWith('galaxy')) out.push(q.slice('galaxy'.length));

  return [...new Set(out.filter(x => x.length >= 3))].sort((a,b) => b.length - a.length);
}

function explicitVariant(s = '') {
  const x = n(s);
  return VARIANTS.find(v => x.includes(v)) || 'base';
}

function tailHasCompetingVariant(tail = '', targetVariant = 'base') {
  const found = VARIANTS.find(v => tail.startsWith(v));
  if (!found) return false;
  return found !== targetVariant;
}

function candidateMatches(evidenceNorm, candidate, queryNorm) {
  let start = evidenceNorm.indexOf(candidate);
  if (start < 0) return false;

  const targetVariant = explicitVariant(queryNorm);

  // Search all occurrences: one may be a false prefix, a later one can be exact.
  while (start >= 0) {
    const tail = evidenceNorm.slice(start + candidate.length, start + candidate.length + 16);

    if (targetVariant === 'base') {
      if (!VARIANTS.some(v => tail.startsWith(v))) return true;
    } else {
      // If candidate already contains the suffix, make sure it is not only a prefix
      // of a stronger sibling (Pro -> Pro Max / Pro Plus).
      if (candidate.includes(targetVariant)) {
        if (targetVariant === 'pro' && /^(?:max|plus)/.test(tail)) {
          // keep looking for a cleaner occurrence
        } else {
          return true;
        }
      }
      if (tail.startsWith(targetVariant) && !tailHasCompetingVariant(tail, targetVariant)) return true;
    }

    start = evidenceNorm.indexOf(candidate, start + 1);
  }
  return false;
}

function matchesRequestedModelLoose(evidence = '', query = '') {
  const e = n(evidence);
  const q = n(query);
  if (!e || !q) return false;

  const qb = brandMarker(q);
  const eb = brandMarker(e);

  // Strong conflicting brands are rejected.
  if (qb && eb && qb !== eb) {
    // Galaxy/Samsung normalization or Xiaomi sub-brands should not cross-match.
    const sameGroup =
      (['xiaomi','redmi','poco'].includes(qb) && ['xiaomi','redmi','poco'].includes(eb));
    if (!sameGroup) return false;
  }

  for (const candidate of targetCandidates(query)) {
    if (candidateMatches(e, candidate, q)) return true;
  }
  return false;
}

module.exports = {
  n,
  brandMarker,
  targetCandidates,
  explicitVariant,
  matchesRequestedModelLoose
};
