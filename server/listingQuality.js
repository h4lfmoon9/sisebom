'use strict';

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/iphone/g, '아이폰')
    .replace(/galaxy/g, '갤럭시')
    .replace(/motorola/g, '모토로라')
    .replace(/울트라/g, 'ultra')
    .replace(/폴드/g, 'fold')
    .replace(/플립/g, 'flip')
    .replace(/\+/g, 'plus')
    .replace(/프로\s*맥스/g, 'promax')
    .replace(/pro\s*max/g, 'promax')
    .replace(/프로/g, 'pro')
    .replace(/플러스/g, 'plus')
    .replace(/미니/g, 'mini')
    .replace(/에어/g, 'air')
    .replace(/에스\s*이/g, 'se')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function minimumPlausiblePrice(query = '') {
  const q = String(query).toLowerCase().replace(/\s+/g, '');
  const m = q.match(/(?:아이폰|iphone)(\d{1,2})/);

  if (m) {
    const g = +m[1];
    if (g >= 17) return 150000;
    if (g >= 15) return 100000;
    if (g >= 13) return 70000;
    if (g >= 11) return 40000;
    if (g >= 8) return 20000;
  }

  if (/(아이폰x|iphonex|아이폰xr|iphonexr|아이폰xs|iphonexs)/i.test(q)) return 20000;
  if (/(갤럭시|galaxy|xiaomi|redmi|poco|motorola|moto|모토로라)/i.test(q)) return 10000;
  return 10000;
}

function hasUnavailableStatus(v = '') {
  return /(예약\s*중|예약중|판매\s*완료|판매완료|거래\s*완료|거래완료|판매\s*종료|거래\s*종료|sold\s*out|soldout|reserved)/i.test(String(v));
}

function isWantedPost(v = '') {
  return /(삽니다|사요|구해요|구합니다|구매\s*(?:원해|희망|합니다)|매입\s*(?:합니다|해요|중|문의|전문|가능)?|최고가\s*매입|폰\s*매입)/i.test(String(v));
}

function isAccessory(v = '') {
  return /(케이스|범퍼|강화\s*유리|보호\s*필름|액정\s*필름|카메라\s*보호|렌즈\s*보호|맥세이프\s*(?:케이스|링|거치대|충전기)|휴대폰\s*스트랩|폰\s*스트랩|공\s*박스|빈\s*박스|박스\s*만|충전\s*케이블|라이트닝\s*케이블|usb[- ]?c\s*케이블|충전기\s*만|어댑터\s*만|액정\s*만|디스플레이\s*만|배터리\s*만|부품\s*만|부품용|파손폰|고장폰)/i.test(String(v));
}

function isCatalogAd(v = '') {
  const t = String(v);
  return /(재고\s*정리|선착순|중고폰\s*전문|휴대폰\s*전문|전기종|전\s*기종|모든\s*기종|시리즈\s*다량|대량\s*판매)/i.test(t)
    || /\[(?:\s*\d{1,2}\s*,){2,}\s*\d{1,2}\s*\]/.test(t)
    || /\+(?:\s*\d{1,2}\s*,){2,}/.test(t);
}

function iphoneKey(text = '') {
  const n = normalizeText(text);

  if (/아이폰duo/.test(n)) return 'apple:duo';
  if (/아이폰air/.test(n)) return 'apple:air';
  if (/아이폰se3(?:세대)?/.test(n)) return 'apple:se3';
  if (/아이폰se2(?:세대)?/.test(n)) return 'apple:se2';
  if (/아이폰se1(?:세대)?/.test(n)) return 'apple:se1';
  if (/아이폰se/.test(n)) return 'apple:se';
  if (/아이폰xsmax/.test(n)) return 'apple:xsmax';
  if (/아이폰xs/.test(n)) return 'apple:xs';
  if (/아이폰xr/.test(n)) return 'apple:xr';
  if (/아이폰x(?!s|r)/.test(n)) return 'apple:x';

  const legacy = n.match(/아이폰(3gs|3g|4s|5c|5s|6s)(plus)?/);
  if (legacy) return `apple:${legacy[1]}:${legacy[2] ? 'plus' : 'base'}`;

  const m = n.match(/아이폰(\d{1,2})(e)?/);
  if (!m) return null;

  let variant = m[2] ? 'e' : 'base';
  const tail = n.slice(m.index + m[0].length);

  if (tail.includes('promax')) variant = 'promax';
  else if (tail.includes('pro')) variant = 'pro';
  else if (tail.includes('plus')) variant = 'plus';
  else if (tail.includes('mini')) variant = 'mini';
  else if (tail.includes('air')) variant = 'air';

  return `apple:${m[1]}:${variant}`;
}

function samsungKey(text = '') {
  const n = normalizeText(text);

  let m = n.match(/갤럭시s(\d{1,2})(ultra|fe|plus)?/);
  if (m) return `samsung:s${m[1]}:${m[2] || 'base'}`;

  m = n.match(/갤럭시a(\d{1,2})(5g)?/);
  if (m) return `samsung:a${m[1]}`;

  m = n.match(/갤럭시m(\d{1,2})(5g)?/);
  if (m) return `samsung:m${m[1]}`;

  m = n.match(/갤럭시zfold(\d{1,2}?)(ultra|fe)?(?=(?:32|64|128|256|512|1024|2048|gb|$))/);
  if (m) return `samsung:zfold${m[1]}:${m[2] || 'base'}`;

  m = n.match(/갤럭시zflip(\d{1,2}?)(ultra|fe)?(?=(?:32|64|128|256|512|1024|2048|gb|$))/);
  if (m) return `samsung:zflip${m[1]}:${m[2] || 'base'}`;

  return null;
}

function xiaomiKey(text = '') {
  const n = normalizeText(text);

  let m = n.match(/xiaomi(\d{1,2}[a-z]?)(ultra|pro|lite)?/);
  if (m) return `xiaomi:${m[1]}:${m[2] || 'base'}`;

  m = n.match(/redminote(\d{1,2})(proplus|pro|plus)?(5g)?/);
  if (m) return `redmi:note${m[1]}:${m[2] || 'base'}`;

  m = n.match(/redmi(\d{1,2}[a-z]?)(pro|plus)?(5g)?/);
  if (m) return `redmi:${m[1]}:${m[2] || 'base'}`;

  m = n.match(/poco([a-z]\d{1,2})(pro)?(5g)?/);
  if (m) return `poco:${m[1]}:${m[2] || 'base'}`;

  return null;
}

function motorolaKey(text = '') {
  const n = normalizeText(text);

  let m = n.match(/motog(\d{1,3}?)(5g)?(?=(?:32|64|128|256|512|1024|2048|gb|$))/);
  if (m) return `motorola:g${m[1]}`;

  m = n.match(/(?:모토로라|moto)edge(\d{1,3}?)(pro|ultra|fusion|neo)?(?=(?:32|64|128|256|512|1024|2048|gb|$))/);
  if (m) return `motorola:edge${m[1]}:${m[2] || 'base'}`;

  m = n.match(/(?:모토로라)?razr(\d{1,3}?)(ultra)?(?=(?:32|64|128|256|512|1024|2048|gb|$))/);
  if (m) return `motorola:razr${m[1]}:${m[2] || 'base'}`;

  return null;
}

function canonicalModelKey(text = '') {
  return iphoneKey(text) || samsungKey(text) || xiaomiKey(text) || motorolaKey(text);
}

function parseTarget(query = '') {
  const key = canonicalModelKey(query);
  return key ? { key } : null;
}

function titleGenerationInfo(title = '') {
  const key = canonicalModelKey(title);
  return key ? { key } : null;
}

function matchesRequestedModel(text = '', query = '') {
  const target = canonicalModelKey(query);
  if (!target) return true;

  const actual = canonicalModelKey(text);
  if (!actual) return false;

  if (target === 'apple:se') return /^apple:se\d*$/.test(actual);
  return actual === target;
}

function normalizeTitleKey(t = '') {
  return normalizeText(t)
    .replace(/(미개봉|새상품|중고|판매|팝니다|급처|자급제|공기계|단말기|정상해지)/g, '')
    .slice(0, 120);
}

function filterAndDedupeListings(listings = [], query = '') {
  const kept = [];
  const seenUrl = new Set();
  const seenExact = new Set();
  const minPrice = minimumPlausiblePrice(query);

  const excluded = {
    unavailable: 0,
    wanted: 0,
    accessory: 0,
    catalog: 0,
    wrongModel: 0,
    invalidPrice: 0,
    suspiciousPrice: 0,
    duplicate: 0
  };

  for (const item of listings) {
    const title = String(item?.title || '').trim();
    const evidence = String(item?.modelText || item?.description || title).trim();
    const statusText = `${item?.status || ''} ${title}`;
    const price = Number(item?.price);

    if (!title || !Number.isFinite(price) || price <= 0 || price > 5000000) {
      excluded.invalidPrice++;
      continue;
    }

    if (price < minPrice) {
      excluded.suspiciousPrice++;
      continue;
    }

    if (hasUnavailableStatus(statusText)) {
      excluded.unavailable++;
      continue;
    }

    if (isWantedPost(title)) {
      excluded.wanted++;
      continue;
    }

    if (isAccessory(title)) {
      excluded.accessory++;
      continue;
    }

    if (isCatalogAd(title)) {
      excluded.catalog++;
      continue;
    }

    if (!matchesRequestedModel(evidence, query)) {
      excluded.wrongModel++;
      continue;
    }

    const urlKey = String(item?.url || '').split('?')[0];
    const exactKey = `${item?.source || item?.platform || ''}|${normalizeTitleKey(title)}|${price}`;

    if ((urlKey && seenUrl.has(urlKey)) || seenExact.has(exactKey)) {
      excluded.duplicate++;
      continue;
    }

    if (urlKey) seenUrl.add(urlKey);
    seenExact.add(exactKey);
    kept.push({ ...item, url: urlKey || item.url });
  }

  return { listings: kept, excluded };
}

module.exports = {
  normalizeText,
  canonicalModelKey,
  parseTarget,
  titleGenerationInfo,
  matchesRequestedModel,
  minimumPlausiblePrice,
  hasUnavailableStatus,
  isWantedPost,
  isAccessory,
  isCatalogAd,
  filterAndDedupeListings
};
