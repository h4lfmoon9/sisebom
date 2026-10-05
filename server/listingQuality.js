'use strict';

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/iphone/g, '아이폰')
    .replace(/프로\s*맥스/g, 'promax')
    .replace(/pro\s*max/g, 'promax')
    .replace(/프로/g, 'pro')
    .replace(/플러스/g, 'plus')
    .replace(/미니/g, 'mini')
    .replace(/에어/g, 'air')
    .replace(/에스\s*이/g, 'se')
    .replace(/[\s_\-\/()\[\]{}.,:;|'"+]/g, '');
}

function hasUnavailableStatus(value = '') {
  return /(예약\s*중|예약중|판매\s*완료|판매완료|거래\s*완료|거래완료|판매\s*종료|거래\s*종료|sold\s*out|soldout|reserved)/i.test(String(value));
}

function isWantedPost(value = '') {
  return /(삽니다|사요|구해요|구합니다|구매\s*(?:원해|희망|합니다)|매입\s*(?:합니다|해요|중|문의|전문|가능)?|최고가\s*매입|폰\s*매입)/i.test(String(value));
}

function isAccessory(value = '') {
  const text = String(value);
  return /(케이스|범퍼|강화\s*유리|보호\s*필름|액정\s*필름|카메라\s*보호|렌즈\s*보호|맥세이프\s*(?:케이스|링|거치대|충전기)|휴대폰\s*스트랩|폰\s*스트랩|공\s*박스|빈\s*박스|박스\s*만|충전\s*케이블|라이트닝\s*케이블|usb[- ]?c\s*케이블|충전기\s*만|어댑터\s*만|액정\s*만|디스플레이\s*만|배터리\s*만|부품\s*만)/i.test(text);
}

function isCatalogAd(value = '') {
  const text = String(value);
  if (/(재고\s*정리|선착순|중고폰\s*전문|휴대폰\s*전문|전기종|전\s*기종|모든\s*기종|시리즈\s*다량|대량\s*판매)/i.test(text)) return true;
  if (/\[(?:\s*\d{1,2}\s*,){2,}\s*\d{1,2}\s*\]/.test(text)) return true;
  if (/\+(?:\s*\d{1,2}\s*,){2,}/.test(text)) return true;
  return false;
}

function parseTarget(query = '') {
  const raw = String(query);
  const n = normalizeText(raw);

  let model = null;
  if (/아이폰se(?:1|2|3|1세대|2세대|3세대)?/.test(n)) {
    const se = n.match(/아이폰se([123])/);
    model = { family: 'se', generation: se ? `se${se[1]}` : 'se', variant: 'se' };
  } else if (/아이폰(?:xsmax|xs|xr|x)/.test(n)) {
    const m = n.match(/아이폰(xsmax|xs|xr|x)/);
    model = { family: m[1], generation: m[1], variant: m[1] === 'xsmax' ? 'max' : 'base' };
  } else {
    const m = n.match(/아이폰(\d{1,2})(e)?/);
    if (m) {
      const generation = m[1];
      let variant = m[2] ? 'e' : 'base';
      if (n.includes('promax')) variant = 'promax';
      else if (n.includes('pro')) variant = 'pro';
      else if (n.includes('plus')) variant = 'plus';
      else if (n.includes('mini')) variant = 'mini';
      else if (n.includes('air')) variant = 'air';
      model = { family: 'number', generation, variant };
    }
  }
  return model;
}

function titleGenerationInfo(title = '') {
  const n = normalizeText(title);
  if (/아이폰se3/.test(n) || /아이폰se3세대/.test(n)) return { generation: 'se3', variant: 'se' };
  if (/아이폰se2/.test(n) || /아이폰se2세대/.test(n)) return { generation: 'se2', variant: 'se' };
  if (/아이폰se1/.test(n) || /아이폰se1세대/.test(n)) return { generation: 'se1', variant: 'se' };
  if (/아이폰xsmax/.test(n)) return { generation: 'xsmax', variant: 'max' };
  if (/아이폰xs/.test(n)) return { generation: 'xs', variant: 'base' };
  if (/아이폰xr/.test(n)) return { generation: 'xr', variant: 'base' };
  if (/아이폰x(?!s|r)/.test(n)) return { generation: 'x', variant: 'base' };

  const m = n.match(/아이폰(\d{1,2})(e)?/);
  if (!m) return null;
  let variant = m[2] ? 'e' : 'base';
  const tail = n.slice(m.index + m[0].length);
  if (tail.includes('promax')) variant = 'promax';
  else if (tail.includes('pro')) variant = 'pro';
  else if (tail.includes('plus')) variant = 'plus';
  else if (tail.includes('mini')) variant = 'mini';
  else if (tail.includes('air')) variant = 'air';
  return { generation: m[1], variant };
}

function matchesRequestedModel(title = '', query = '') {
  const target = parseTarget(query);
  if (!target) return true;
  const actual = titleGenerationInfo(title);
  if (!actual) return false;

  if (target.family === 'se') {
    if (!String(actual.generation).startsWith('se')) return false;
    return target.generation === 'se' || actual.generation === target.generation;
  }

  if (['x', 'xr', 'xs', 'xsmax'].includes(target.family)) {
    return actual.generation === target.generation;
  }

  return actual.generation === target.generation && actual.variant === target.variant;
}

function normalizeTitleKey(title = '') {
  return normalizeText(title)
    .replace(/(미개봉|새상품|중고|판매|팝니다|급처|자급제|공기계|단말기|정상해지)/g, '')
    .slice(0, 120);
}

function filterAndDedupeListings(listings = [], query = '') {
  const kept = [];
  const seenUrl = new Set();
  const seenExact = new Set();
  const excluded = {
    unavailable: 0,
    wanted: 0,
    accessory: 0,
    catalog: 0,
    wrongModel: 0,
    invalidPrice: 0,
    duplicate: 0
  };

  for (const item of listings) {
    const title = String(item?.title || '').trim();
    const statusText = `${item?.status || ''} ${title}`;
    const price = Number(item?.price);

    if (!title || !Number.isFinite(price) || price <= 0 || price > 5_000_000) {
      excluded.invalidPrice++;
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
    if (!matchesRequestedModel(title, query)) {
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
  parseTarget,
  matchesRequestedModel,
  hasUnavailableStatus,
  isWantedPost,
  isAccessory,
  isCatalogAd,
  filterAndDedupeListings
};
