'use strict';

const API = 'https://api.tavily.com/search';
const TIMEOUT_MS = 10000;
const MIN_PHONE_PRICE = 10000;
const MAX_PHONE_PRICE = 5000000;

const CONFIG = {
  daangn: {
    name: '당근',
    domain: 'daangn.com',
    sourceUrl: q => {
      const u = new URL('https://www.daangn.com/kr/search/buy-sell/');
      u.searchParams.set('q', q);
      return u.toString();
    },
    searchQuery: q => `${q} 당근 중고거래 판매`,
    isListing: u => /daangn\.com\/(?:kr\/buy-sell\/|articles\/)/i.test(u)
  },
  bunjang: {
    name: '번개장터',
    domain: 'bunjang.co.kr',
    sourceUrl: q => `https://m.bunjang.co.kr/keywords/${encodeURIComponent(q)}`,
    searchQuery: q => `${q} 번개장터 중고거래 판매`,
    isListing: u => /bunjang\.co\.kr\/products\/\d+/i.test(u)
  },
  joongna: {
    name: '중고나라',
    domain: 'joongna.com',
    sourceUrl: q => `https://web.joongna.com/search/${encodeURIComponent(q)}`,
    searchQuery: q => `${q} 중고나라 중고거래 판매`,
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

function collectPriceCandidates(text = '') {
  const s = String(text);
  const found = [];

  function push(index, rawValue, multiplier = 1) {
    const value = Math.round(Number(String(rawValue).replace(/,/g, '')) * multiplier);
    if (!Number.isFinite(value)) return;
    found.push({ index, value });
  }

  for (const m of s.matchAll(/(\d{1,3}(?:,\d{3})+)\s*원/g)) push(m.index, m[1]);
  for (const m of s.matchAll(/(?:^|\D)(\d{4,9})\s*원(?:\D|$)/g)) push(m.index, m[1]);
  for (const m of s.matchAll(/(?:^|\D)(\d+(?:\.\d+)?)\s*만원(?:\D|$)/g)) push(m.index, m[1], 10000);
  for (const m of s.matchAll(/(?:^|\D)(\d+(?:\.\d+)?)\s*천원(?:\D|$)/g)) push(m.index, m[1], 1000);

  return found
    .filter(x => x.value >= MIN_PHONE_PRICE && x.value <= MAX_PHONE_PRICE)
    .sort((a, b) => a.index - b.index);
}

function parsePrice(text = '') {
  const candidates = collectPriceCandidates(text);
  return candidates.length ? candidates[0].value : null;
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
  if (m) return Number(m[1]);

  m = s.match(/(\d+)\s*시간\s*전/);
  if (m) return Number(m[1]) * 60;

  m = s.match(/(\d+)\s*일\s*전/);
  if (m) return Number(m[1]) * 1440;

  m = s.match(/(\d+)\s*(?:달|개월)\s*전/);
  if (m) return Number(m[1]) * 43200;

  return 999999;
}

function canonicalUrl(value = '') {
  try {
    const u = new URL(String(value));
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch (_) {
    return String(value || '').split('?')[0].split('#')[0];
  }
}

async function tavilySearch(query, domain) {
  const key = String(process.env.TAVILY_API_KEY || '').trim();
  if (!key) {
    const error = new Error('TAVILY_API_KEY 환경변수가 설정되지 않았습니다.');
    error.statusCode = 503;
    throw error;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(API, {
      method: 'POST',
      signal: controller.signal,
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

    const rawBody = await response.text();
    let data = {};
    try { data = JSON.parse(rawBody); } catch (_) {}

    if (!response.ok) {
      const detail = data?.detail || data?.message || data?.error || `HTTP ${response.status}`;
      const error = new Error(`Tavily Search API 오류: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
      error.statusCode = response.status === 401 || response.status === 403 ? 502 : response.status;
      throw error;
    }

    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeout = new Error('Tavily Search API 응답 시간이 초과되었습니다.');
      timeout.statusCode = 504;
      throw timeout;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchIndexedListings(source, query, { limit = 30 } = {}) {
  const cfg = CONFIG[source];
  if (!cfg) {
    const error = new Error(`지원하지 않는 플랫폼: ${source}`);
    error.statusCode = 400;
    throw error;
  }

  const q = String(query || '').trim();
  if (!q) {
    const error = new Error('검색어가 필요합니다.');
    error.statusCode = 400;
    throw error;
  }

  const data = await tavilySearch(cfg.searchQuery(q), cfg.domain);
  const raw = Array.isArray(data?.results) ? data.results : [];
  const listings = [];
  const seen = new Set();
  const excluded = { notListing: 0, noPrice: 0 };

  for (const result of raw) {
    const url = canonicalUrl(result?.url || '');

    if (!url || !cfg.isListing(url)) {
      excluded.notListing++;
      continue;
    }

    const title = cleanText(result?.title || '');
    const description = cleanText(result?.content || result?.description || result?.snippet || '');
    const combined = `${title} ${description}`.trim();
    const price = parsePrice(combined);

    if (!Number.isFinite(price)) {
      excluded.noPrice++;
      continue;
    }

    if (seen.has(url)) continue;
    seen.add(url);

    const timeText = parseTimeText(combined);

    listings.push({
      id: `${source}-${listings.length + 1}`,
      platform: cfg.name,
      source,
      title: title || description.slice(0, 140) || q,
      price,
      storage: parseStorage(combined),
      image: '',
      url,
      region: '',
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
    sampleUrls: raw.slice(0, 8).map(item => String(item?.url || '')).filter(Boolean)
  };
}

module.exports = { fetchIndexedListings };
