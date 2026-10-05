'use strict';

const API = 'https://api.tavily.com/search';
const TIMEOUT_MS = 10000;
const MAX_PHONE_PRICE = 5_000_000;

const CONFIG = {
  daangn: {
    name: '당근', domain: 'daangn.com',
    sourceUrl: q => {
      const u = new URL('https://www.daangn.com/kr/search/buy-sell/');
      u.searchParams.set('q', q);
      return u.toString();
    },
    searchQuery: q => `"${q}" 당근 중고거래 판매`,
    isListing: u => /daangn\.com\/(?:kr\/buy-sell\/|articles\/)/i.test(u)
  },
  bunjang: {
    name: '번개장터', domain: 'bunjang.co.kr',
    sourceUrl: q => `https://m.bunjang.co.kr/keywords/${encodeURIComponent(q)}`,
    searchQuery: q => `"${q}" 번개장터 중고거래 판매`,
    isListing: u => /bunjang\.co\.kr\/products\/\d+/i.test(u)
  },
  joongna: {
    name: '중고나라', domain: 'joongna.com',
    sourceUrl: q => `https://web.joongna.com/search/${encodeURIComponent(q)}`,
    searchQuery: q => `"${q}" 중고나라 중고거래 판매`,
    isListing: u => /joongna\.com\/product\/\d+/i.test(u)
  }
};

function cleanText(value = '') {
  return String(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
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
  if (/(아이폰x|iphonex|아이폰xr|iphonexr|아이폰xs|iphonexs)/i.test(q)) return 20000;
  return 10000;
}

function collectPriceCandidates(text = '') {
  const s = String(text);
  const out = [];

  const push = (index, raw, multiplier = 1, extra = 0) => {
    const value = Math.round(Number(String(raw).replace(/,/g, '')) * multiplier + extra);
    if (Number.isFinite(value) && value > 0 && value <= MAX_PHONE_PRICE) out.push({ index, value });
  };

  for (const m of s.matchAll(/(?:^|\D)(\d{1,3})\s*만\s*(\d{1,3})\s*천(?:원)?(?:\D|$)/g)) {
    push(m.index, m[1], 10000, Number(m[2]) * 1000);
  }
  for (const m of s.matchAll(/(?:^|\D)(\d{1,3}(?:\.\d+)?)\s*만(?:원)?(?:\D|$)/g)) {
    push(m.index, m[1], 10000);
  }
  for (const m of s.matchAll(/(\d{1,3}(?:,\d{3})+)\s*원/g)) push(m.index, m[1]);
  for (const m of s.matchAll(/(?:^|\D)(\d{4,9})\s*원(?:\D|$)/g)) push(m.index, m[1]);
  for (const m of s.matchAll(/(?:^|\D)(\d+(?:\.\d+)?)\s*천원(?:\D|$)/g)) push(m.index, m[1], 1000);

  const seen = new Set();
  return out.sort((a, b) => a.index - b.index).filter(x => {
    const key = `${x.index}:${x.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePrice(title = '', description = '', query = '') {
  const min = minimumPlausiblePrice(query);
  const a = collectPriceCandidates(title).filter(x => x.value >= min);
  if (a.length) return a[0].value;
  const b = collectPriceCandidates(description).filter(x => x.value >= min);
  return b.length ? b[0].value : null;
}

function parseStorage(text = '') {
  const s = String(text);
  let m = s.match(/(?:^|\D)(1|2)\s*(?:TB|테라)(?:\D|$)/i);
  if (m) return Number(m[1]) * 1024;
  m = s.match(/(?:^|\D)(64|128|256|512|1024|2048)\s*(?:GB|G|기가)?(?:\D|$)/i);
  return m ? Number(m[1]) : null;
}

function parseTimeText(text = '') {
  const m = String(text).match(/(?:방금|\d+\s*(?:분|시간|일|달|개월)\s*전)/);
  return m ? m[0].replace(/\s+/g, '') : '';
}

function parseMinutes(text = '') {
  const s = String(text);
  if (/방금/.test(s)) return 0;
  let m = s.match(/(\d+)\s*분\s*전/);
  if (m) return +m[1];
  m = s.match(/(\d+)\s*시간\s*전/);
  if (m) return +m[1] * 60;
  m = s.match(/(\d+)\s*일\s*전/);
  if (m) return +m[1] * 1440;
  m = s.match(/(\d+)\s*(?:달|개월)\s*전/);
  if (m) return +m[1] * 43200;
  return 999999;
}

function canonicalUrl(v = '') {
  try {
    const u = new URL(String(v));
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return String(v || '').split('?')[0].split('#')[0];
  }
}

function cleanRegion(value = '') {
  return cleanText(value)
    .replace(/^[·•\-–—|\s]+|[·•\-–—|\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60)
    .trim();
}

function parseRegion(source, description = '') {
  const s = cleanText(description);
  if (!s) return '';

  if (source === 'daangn') {
    // 당근 공개 페이지에 자주 나오는 구조:
    // "## 충북 청주시 서원구 사창동 근처 인기 중고거래"
    const nearby = s.match(/##\s*([^#]{2,70}?)\s*근처\s*인기\s*중고거래/i);
    if (nearby) return cleanRegion(nearby[1]);

    const place = s.match(/(?:거래\s*희망\s*장소|거래\s*장소)\s*[:：]?\s*([^#|]{2,50}?)(?=\s*(?:채팅|관심|조회|$))/i);
    if (place) return cleanRegion(place[1]);
  }

  if (source === 'bunjang') {
    const direct = s.match(/직거래\s*장소\s*[:：]?\s*([^#|]{2,60}?)(?=\s*(?:구매하기|택배|배송|신고하기|상품\s*정보|$))/i);
    if (direct) return cleanRegion(direct[1]);
  }

  if (source === 'joongna') {
    const direct = s.match(/(?:직거래\s*장소|거래\s*지역|거래\s*장소)\s*[:：]\s*([^#|]{2,60}?)(?=\s*(?:택배|배송|거래방법|$))/i);
    if (direct) return cleanRegion(direct[1]);
  }

  return '';
}

function extractListingImage(source, listingUrl = '', rawContent = '') {
  // 안전하게 "현재 매물과 ID가 직접 연결되는 이미지"만 사용한다.
  // 지금은 번개장터 media URL이 product ID를 포함해서 정확한 연결 검증이 가능하다.
  if (source !== 'bunjang') return '';

  const idMatch = String(listingUrl).match(/\/products\/(\d+)/i);
  if (!idMatch) return '';

  const productId = idMatch[1];
  const content = String(rawContent || '').replace(/&amp;/g, '&');

  const urlRe = /https?:\/\/media\.bunjang\.co\.kr\/product\/[^\s)"'<>\]]+/ig;
  const candidates = content.match(urlRe) || [];

  for (const raw of candidates) {
    const candidate = raw.replace(/[.,;:]+$/g, '');
    try {
      const u = new URL(candidate);
      if (u.hostname !== 'media.bunjang.co.kr') continue;
      if (!u.pathname.startsWith(`/product/${productId}_`)) continue;
      if (!/\.(?:jpe?g|png|webp)$/i.test(u.pathname)) continue;
      return u.toString();
    } catch {}
  }

  return '';
}

const MODEL_RE = /(?:애플\s*)?(?:아이폰|iphone)\s*(?:air|에어|se\s*(?:[123]|[123]\s*세대)?|xs\s*max|xs|xr|x|3gs|3g|4s|5c|5s|6s|\d{1,2}(?:e)?)(?:\s*(?:프로\s*맥스|pro\s*max|프로|pro|플러스|plus|미니|mini|에어|air))?/ig;

function modelSnippet(text = '', query = '') {
  const s = cleanText(text);
  if (!s) return '';

  const matches = [...s.matchAll(MODEL_RE)];
  if (!matches.length) return '';

  const qn = String(query).toLowerCase().replace(/\s+/g, '');
  let chosen = matches[0];

  for (const m of matches) {
    const mn = m[0].toLowerCase().replace(/\s+/g, '');
    if (qn.includes(mn) || mn.includes(qn)) {
      chosen = m;
      break;
    }
  }

  const start = Math.max(0, chosen.index || 0);
  const end = Math.min(s.length, start + 150);
  let snippet = s.slice(start, end);
  snippet = snippet.split(/\s*(?:-\s*\d+번째\s*이미지|Image\s*\d+\s*:|Image\s*\d+\b)/i)[0];

  return snippet.replace(/^[|·,.;:\-\s]+|[|·,.;:\-\s]+$/g, '').trim();
}

function queryModel(query = '') {
  const n = String(query).toLowerCase().replace(/\s+/g, '');

  if (/(?:아이폰|iphone)(?:air|에어)/i.test(n)) {
    return { generation: 'air', variant: 'air' };
  }

  const legacy = n.match(/(?:아이폰|iphone)(3gs|3g|4s|5c|5s|6s)(plus|플러스)?/i);
  if (legacy) {
    return {
      generation: legacy[1].toLowerCase(),
      variant: legacy[2] ? 'plus' : 'base'
    };
  }

  const m = n.match(/(?:아이폰|iphone)(\d{1,2})(e)?/);
  if (!m) return null;

  let variant = m[2] ? 'e' : 'base';
  if (/프로맥스|promax/.test(n)) variant = 'promax';
  else if (/프로|pro/.test(n)) variant = 'pro';
  else if (/플러스|plus/.test(n)) variant = 'plus';
  else if (/미니|mini/.test(n)) variant = 'mini';
  else if (/에어|air/.test(n)) variant = 'air';

  return { generation: m[1], variant };
}

function variantEvidenceForBunjang(description = '', query = '') {
  const target = queryModel(query);
  if (!target) return '';

  if (!/^\d+$/.test(String(target.generation))) return '';

  const early = cleanText(description).slice(0, 650);
  const gen = target.generation;

  const patterns = [
    ['promax', new RegExp(`(?:아이폰|iphone)\\s*${gen}\\s*(?:프로\\s*맥스|pro\\s*max)`, 'i')],
    ['pro', new RegExp(`(?:아이폰|iphone)\\s*${gen}\\s*(?:프로|pro)`, 'i')],
    ['plus', new RegExp(`(?:아이폰|iphone)\\s*${gen}\\s*(?:플러스|plus)`, 'i')],
    ['mini', new RegExp(`(?:아이폰|iphone)\\s*${gen}\\s*(?:미니|mini)`, 'i')],
    ['air', new RegExp(`(?:아이폰|iphone)\\s*${gen}\\s*(?:에어|air)`, 'i')]
  ];

  for (const [variant, re] of patterns) {
    const m = early.match(re);
    if (m) return `아이폰${gen}${variant === 'promax' ? 'promax' : variant}`;
  }

  return '';
}

function isGenericPlatformTitle(rawTitle = '', platform = '') {
  const t = cleanText(rawTitle);
  return !t || t === platform || /^(번개장터|중고나라|당근|bunjang|joongna)$/i.test(t);
}

function earlySnippetContamination(source, rawTitle = '', description = '') {
  if (source !== 'bunjang') return null;
  if (!isGenericPlatformTitle(rawTitle, '번개장터')) return null;

  const early = cleanText(description).slice(0, 220);

  if (/가장\s*비슷한\s*상품|비슷한\s*상품을\s*앱에서|추천\s*상품/i.test(early)) {
    return 'related-products-only';
  }
  if (/판매\s*완료|거래\s*완료|sold\s*out/i.test(early)) {
    return 'current-item-unavailable';
  }
  return null;
}

function displayTitle(rawTitle = '', description = '', query = '', platform = '') {
  const t = cleanText(rawTitle);
  if (!isGenericPlatformTitle(t, platform)) return t;

  const snippet = modelSnippet(description, query);
  return (snippet || query).slice(0, 100);
}

async function tavilySearch(query, domain) {
  const key = String(process.env.TAVILY_API_KEY || '').trim();
  if (!key) {
    const e = new Error('TAVILY_API_KEY 환경변수가 설정되지 않았습니다.');
    e.statusCode = 503;
    throw e;
  }

  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(API, {
      method: 'POST',
      signal: c.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        max_results: 20,
        include_answer: false,
        include_raw_content: false,
        include_images: false,
        include_domains: [domain]
      })
    });

    const body = await r.text();
    let data = {};
    try { data = JSON.parse(body); } catch {}

    if (!r.ok) {
      const d = data?.detail || data?.message || data?.error || `HTTP ${r.status}`;
      const e = new Error(`Tavily Search API 오류: ${typeof d === 'string' ? d : JSON.stringify(d)}`);
      e.statusCode = 502;
      throw e;
    }
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') {
      const x = new Error('Tavily Search API 응답 시간이 초과되었습니다.');
      x.statusCode = 504;
      throw x;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchIndexedListings(source, query, { limit = 30 } = {}) {
  const cfg = CONFIG[source];
  if (!cfg) throw new Error(`지원하지 않는 플랫폼: ${source}`);

  const q = String(query || '').trim();
  if (!q) {
    const e = new Error('검색어가 필요합니다.');
    e.statusCode = 400;
    throw e;
  }

  const data = await tavilySearch(cfg.searchQuery(q), cfg.domain);
  const raw = Array.isArray(data?.results) ? data.results : [];
  const listings = [];
  const seen = new Set();

  const excluded = {
    notListing: 0,
    noPrice: 0,
    suspiciousPrice: 0,
    contaminatedSnippet: 0,
    unavailable: 0
  };

  for (const result of raw) {
    const url = canonicalUrl(result?.url || '');
    if (!url || !cfg.isListing(url)) {
      excluded.notListing++;
      continue;
    }

    const rawTitle = cleanText(result?.title || '');
    const rawContent = String(result?.content || result?.description || result?.snippet || '');
    const description = cleanText(rawContent);

    const contamination = earlySnippetContamination(source, rawTitle, description);
    if (contamination === 'related-products-only') {
      excluded.contaminatedSnippet++;
      continue;
    }
    if (contamination === 'current-item-unavailable') {
      excluded.unavailable++;
      continue;
    }

    const title = displayTitle(rawTitle, description, q, cfg.name);
    let evidence = modelSnippet(`${rawTitle} ${description}`, q);

    // 번개장터에서 현재 상품 정보에 Pro/Pro Max 등이 명확히 나오면
    // 짧은 앞부분의 '아이폰15'보다 실제 변형 정보를 우선한다.
    if (source === 'bunjang') {
      const variantEvidence = variantEvidenceForBunjang(description, q);
      if (variantEvidence) evidence = variantEvidence;
    }

    if (!evidence) {
      excluded.contaminatedSnippet++;
      continue;
    }

    const price = parsePrice(rawTitle, description, q);
    if (!Number.isFinite(price)) {
      const pcs = collectPriceCandidates(`${rawTitle} ${description}`);
      pcs.length ? excluded.suspiciousPrice++ : excluded.noPrice++;
      continue;
    }

    if (seen.has(url)) continue;
    seen.add(url);

    const timeText = parseTimeText(description);

    listings.push({
      id: `${source}-${listings.length + 1}`,
      platform: cfg.name,
      source,
      title,
      description: description.slice(0, 280),
      modelText: evidence.slice(0, 160),
      price,
      storage: parseStorage(`${title} ${evidence}`),
      image: extractListingImage(source, url, rawContent),
      url,
      region: parseRegion(source, description),
      timeText,
      minutes: parseMinutes(timeText),
      status: '판매중',
      indexedResult: true,
      relevance: Number.isFinite(Number(result?.score)) ? Number(result.score) : null
    });

    if (listings.length >= Math.max(1, Math.min(50, Number(limit) || 30))) break;
  }

  return {
    query: q,
    platform: cfg.name,
    source,
    sourceUrl: cfg.sourceUrl(q),
    via: 'tavily-public-index',
    fetchedAt: new Date().toISOString(),
    rawCount: raw.length,
    count: listings.length,
    listings,
    excluded,
    sampleUrls: raw.slice(0, 8).map(x => String(x?.url || '')).filter(Boolean)
  };
}

module.exports = { fetchIndexedListings, minimumPlausiblePrice, parseRegion, extractListingImage };
