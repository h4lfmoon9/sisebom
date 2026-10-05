'use strict';

const API = 'https://api.tavily.com/search';

const CONFIG = {
  daangn: {
    name: '당근',
    domain: 'daangn.com',
    searchQuery: q => `${q} 당근 중고거래 판매`,
    isListing: u => /daangn\.com\/(?:kr\/buy-sell\/|articles\/)/i.test(u)
  },
  bunjang: {
    name: '번개장터',
    domain: 'bunjang.co.kr',
    searchQuery: q => `${q} 번개장터 중고거래 판매`,
    isListing: u => /bunjang\.co\.kr\/products\/\d+/i.test(u)
  },
  joongna: {
    name: '중고나라',
    domain: 'joongna.com',
    searchQuery: q => `${q} 중고나라 중고거래 판매`,
    isListing: u => /joongna\.com\/product\/\d+/i.test(u)
  }
};

function parsePrice(text = '') {
  const s = String(text);
  let m = s.match(/(\d{1,3}(?:,\d{3})+)\s*원/);
  if (m) return Number(m[1].replace(/,/g, ''));
  m = s.match(/(?:^|\D)(\d+(?:\.\d+)?)\s*만원(?:\D|$)/);
  if (m) return Math.round(Number(m[1]) * 10000);
  m = s.match(/(?:^|\D)(\d{4,9})\s*원(?:\D|$)/);
  return m ? Number(m[1]) : null;
}

function parseStorage(text = '') {
  let m = String(text).match(/(?:^|\D)(1|2)\s*(?:TB|테라)(?:\D|$)/i);
  if (m) return Number(m[1]) * 1024;
  m = String(text).match(/(?:^|\D)(64|128|256|512|1024|2048)\s*(?:GB|G|기가)?(?:\D|$)/i);
  return m ? Number(m[1]) : null;
}

function cleanText(text = '') {
  return String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function canonicalUrl(url = '') {
  try {
    const u = new URL(String(url));
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return String(url).split('?')[0].split('#')[0];
  }
}

async function tavilySearch(query, domain) {
  const key = String(process.env.TAVILY_API_KEY || '').trim();
  if (!key) {
    const e = new Error('TAVILY_API_KEY 환경변수가 설정되지 않았습니다.');
    e.statusCode = 503;
    throw e;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
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

    const body = await response.text();
    let data = {};
    try { data = JSON.parse(body); } catch {}

    if (!response.ok) {
      const detail = data?.detail || data?.message || data?.error || `HTTP ${response.status}`;
      const e = new Error(`Tavily Search API 오류: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
      e.statusCode = 502;
      throw e;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchIndexedListings(source, query, { limit = 30 } = {}) {
  const cfg = CONFIG[source];
  if (!cfg) throw new Error('지원하지 않는 플랫폼');

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
  const excluded = { notListing: 0, noPrice: 0 };

  for (const result of raw) {
    const url = canonicalUrl(result?.url || '');
    if (!cfg.isListing(url)) {
      excluded.notListing++;
      continue;
    }

    const title = cleanText(result?.title || '');
    const content = cleanText(result?.content || '');
    const combined = `${title} ${content}`.trim();
    const price = parsePrice(combined);

    if (!Number.isFinite(price) || price <= 0) {
      excluded.noPrice++;
      continue;
    }

    if (seen.has(url)) continue;
    seen.add(url);

    listings.push({
      id: `${source}-${listings.length + 1}`,
      platform: cfg.name,
      source,
      title: title || q,
      price,
      storage: parseStorage(combined),
      image: '',
      url,
      region: '',
      timeText: '',
      minutes: 999999,
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
    sourceUrl: '',
    via: 'tavily-public-index',
    fetchedAt: new Date().toISOString(),
    rawCount: raw.length,
    count: listings.length,
    listings,
    excluded,
    sampleUrls: raw.slice(0, 8).map(x => String(x?.url || '')).filter(Boolean)
  };
}

module.exports = { fetchIndexedListings };
