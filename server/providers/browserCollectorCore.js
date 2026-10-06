'use strict';

const MAX_PHONE_PRICE = 5_000_000;

const CONFIG = {
  daangn: {
    name: '당근',
    searchUrl(query) {
      const u = new URL('https://www.daangn.com/kr/search/buy-sell/');
      u.searchParams.set('q', query);
      return u.toString();
    },
    selector: 'a[href*="/kr/buy-sell/"],a[href*="/articles/"]',
    isListing(url) {
      return /daangn\.com\/(?:kr\/buy-sell\/|articles\/)/i.test(String(url));
    }
  },
  bunjang: {
    name: '번개장터',
    searchUrl(query) {
      return `https://m.bunjang.co.kr/keywords/${encodeURIComponent(query)}`;
    },
    selector: 'a[href*="/products/"]',
    isListing(url) {
      return /bunjang\.co\.kr\/products\/\d+/i.test(String(url));
    }
  },
  joongna: {
    name: '중고나라',
    searchUrl(query) {
      return `https://web.joongna.com/search/${encodeURIComponent(query)}`;
    },
    selector: 'a[href*="/product/"]',
    isListing(url) {
      return /joongna\.com\/product\/\d+/i.test(String(url));
    }
  }
};

function cleanText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function canonicalUrl(value = '') {
  try {
    const u = new URL(String(value));
    u.hash = '';
    u.search = '';
    return u.toString();
  } catch {
    return String(value || '').split('?')[0].split('#')[0];
  }
}

function minimumPlausiblePrice(query = '') {
  const q = String(query).toLowerCase().replace(/\s+/g, '');
  const m = q.match(/(?:아이폰|iphone)(\d{1,2})/);
  if (m) {
    const g = Number(m[1]);
    if (g >= 17) return 150000;
    if (g >= 15) return 100000;
    if (g >= 13) return 70000;
    if (g >= 11) return 40000;
    if (g >= 8) return 20000;
  }
  if (/(갤럭시|galaxy)/i.test(q)) return 10000;
  if (/(아이폰x|iphonex|아이폰xr|iphonexr|아이폰xs|iphonexs)/i.test(q)) return 20000;
  return 5000;
}

function collectPriceCandidates(text = '') {
  const s = String(text);
  const out = [];
  const push = (index, raw, multiplier = 1, extra = 0) => {
    const n = Number(String(raw).replace(/,/g, ''));
    const value = Math.round(n * multiplier + extra);
    if (Number.isFinite(value) && value > 0 && value <= MAX_PHONE_PRICE) {
      out.push({ index, value });
    }
  };

  for (const m of s.matchAll(/(?:^|\D)(\d{1,3})\s*만\s*(\d{1,3})\s*천(?:원)?(?:\D|$)/g)) {
    push(m.index, m[1], 10000, Number(m[2]) * 1000);
  }
  for (const m of s.matchAll(/(?:^|\D)(\d{1,3}(?:\.\d+)?)\s*만(?:원)?(?:\D|$)/g)) {
    push(m.index, m[1], 10000);
  }
  for (const m of s.matchAll(/(\d{1,3}(?:,\d{3})+)\s*원/g)) {
    push(m.index, m[1]);
  }
  for (const m of s.matchAll(/(?:^|\D)(\d{4,9})\s*원(?:\D|$)/g)) {
    push(m.index, m[1]);
  }

  return out.sort((a, b) => a.index - b.index);
}

function parsePrice(title = '', text = '', query = '') {
  const min = minimumPlausiblePrice(query);
  const a = collectPriceCandidates(title).find(x => x.value >= min);
  if (a) return a.value;
  const b = collectPriceCandidates(text).find(x => x.value >= min);
  return b?.value || null;
}

function parseStorage(text = '') {
  const s = String(text);

  let m = s.match(/(?:^|\D)(1|2)\s*(?:TB|테라)(?:\D|$)/i);
  if (m) return Number(m[1]) * 1024;

  m = s.match(/(?:^|\D)(32|64|128|256|512|1024|2048)\s*(?:GB|G|기가)?(?:\D|$)/i);
  return m ? Number(m[1]) : null;
}

function parseTimeText(text = '') {
  const m = String(text).match(/(?:방금|\d+\s*(?:분|시간|일|주|달|개월)\s*전)/);
  return m ? m[0].replace(/\s+/g, '') : '';
}

function parseMinutes(text = '') {
  const s = String(text);
  if (/방금/.test(s)) return 0;

  let m = s.match(/(\d+)\s*분\s*전/);
  if (m) return Number(m[1]);

  m = s.match(/(\d+)\s*시간\s*전/);
  if (m) return Number(m[1]) * 60;

  m = s.match(/(\d+)\s*일\s*전/);
  if (m) return Number(m[1]) * 1440;

  m = s.match(/(\d+)\s*주\s*전/);
  if (m) return Number(m[1]) * 10080;

  m = s.match(/(\d+)\s*(?:달|개월)\s*전/);
  if (m) return Number(m[1]) * 43200;

  return 999999;
}

function parseRegion(source, text = '') {
  const s = cleanText(text);

  if (source === 'daangn') {
    const line = s.match(/((?:[가-힣]{2,12}(?:시|군|구)\s*)?[가-힣A-Za-z0-9·.\-]{1,24}(?:동|읍|면|리))\s*[·|]\s*(?:방금|\d+\s*(?:분|시간|일|주)\s*전)/);
    if (line) return cleanText(line[1]);

    // 카드에 시간 없이 "삼성2동 ·", "사당동 ·"처럼 표시되는 경우도 지역으로 사용.
    const loose = s.match(/(?:^|\s)([가-힣A-Za-z0-9.\-]{1,24}(?:동|읍|면|리))\s*[·|](?:\s|$)/);
    if (loose) return cleanText(loose[1]);

    const nearby = s.match(/([가-힣]{2,20}(?:시|군|구)(?:\s+[가-힣]{1,20}(?:시|군|구|동|읍|면)){0,3})\s*근처/);
    if (nearby) return cleanText(nearby[1]);
  }

  if (source === 'bunjang') {
    const m = s.match(/직거래\s*장소\s*[:：]?\s*([^|#]{2,50}?)(?=\s*(?:배송|택배|구매하기|$))/i);
    if (m) return cleanText(m[1]);
  }

  if (source === 'joongna') {
    const m = s.match(/(?:거래\s*지역|직거래\s*장소|거래\s*장소)\s*[:：]\s*([^|#]{2,50}?)(?=\s*(?:배송|택배|거래방법|$))/i);
    if (m) return cleanText(m[1]);
  }

  return '';
}

function unavailableStatus(text = '') {
  const s = String(text);
  if (/예약\s*중|예약중/i.test(s)) return '예약중';
  if (/판매\s*완료|판매완료|거래\s*완료|거래완료|sold\s*out/i.test(s)) return '판매완료';
  return '판매중';
}

function looksLikeSiteAsset(url = '') {
  try {
    const u = new URL(url);
    const v = `${u.hostname}${u.pathname}`.toLowerCase();
    return /(logo|favicon|avatar|profile|sprite|placeholder|default[-_ ]?(?:image|og)|app[-_]?icon|site[-_]?icon)/i.test(v);
  } catch {
    return true;
  }
}

function normalizeImage(source, listingUrl = '', imageUrl = '') {
  if (!imageUrl) return '';
  try {
    const image = new URL(String(imageUrl), listingUrl);
    if (!/^https?:$/.test(image.protocol)) return '';
    if (looksLikeSiteAsset(image.toString())) return '';

    if (source === 'bunjang' && image.hostname === 'media.bunjang.co.kr') {
      const listingId = String(listingUrl).match(/\/products\/(\d+)/i)?.[1];
      const imageId = image.pathname.match(/\/product\/(\d+)_/i)?.[1];
      if (listingId && imageId && listingId !== imageId) return '';
    }

    return image.toString();
  } catch {
    return '';
  }
}

function firstUsefulLine(text = '', query = '') {
  const lines = String(text)
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean)
    .filter(line => !/^\d[\d,]*\s*원$/.test(line))
    .filter(line => !/^(방금|\d+\s*(분|시간|일|주)\s*전)$/.test(line));

  const q = String(query).toLowerCase().replace(/\s+/g, '');
  const modelWords = q
    .replace(/(\d+)(gb|기가|tb)/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

  const matched = lines.find(line => {
    const n = line.toLowerCase().replace(/\s+/g, '').replace(/[^\p{L}\p{N}]/gu, '');
    return modelWords && (n.includes(modelWords) || modelWords.includes(n));
  });

  return (matched || lines[0] || '').slice(0, 120);
}

function normalizeBrowserCard(source, raw = {}, query = '', index = 0) {
  const cfg = CONFIG[source];
  if (!cfg) return null;

  const url = canonicalUrl(raw.url || '');
  if (!url || !cfg.isListing(url)) return null;

  const text = String(raw.text || '').trim();
  let title = cleanText(raw.title || '');

  if (!title || title.length < 3 || /^(당근|번개장터|중고나라)$/i.test(title)) {
    title = firstUsefulLine(text, query);
  }

  const price = parsePrice(title, text, query);
  if (!price) return { excluded: 'noPrice' };

  const timeText = parseTimeText(text);

  return {
    id: `${source}-${index + 1}`,
    platform: cfg.name,
    source,
    title: title || query,
    description: cleanText(text).slice(0, 500),
    modelText: `${title} ${cleanText(text).slice(0, 220)}`,
    price,
    // FINAL V8: capacity is metadata only, never a search/filter condition.
    // Use only what the listing itself states; do not infer it from the query.
    storage: parseStorage(`${title} ${text}`),
    image: normalizeImage(source, url, raw.image || ''),
    url,
    region: parseRegion(source, text),
    timeText,
    minutes: parseMinutes(timeText),
    status: unavailableStatus(`${title} ${text}`),
    browserCollected: true
  };
}

module.exports = {
  CONFIG,
  cleanText,
  canonicalUrl,
  minimumPlausiblePrice,
  collectPriceCandidates,
  parsePrice,
  parseStorage,
  parseTimeText,
  parseMinutes,
  parseRegion,
  unavailableStatus,
  normalizeImage,
  firstUsefulLine,
  normalizeBrowserCard
};
