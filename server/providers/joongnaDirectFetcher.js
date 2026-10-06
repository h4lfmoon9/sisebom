'use strict';

const { extractJoongnaCardsFromHtml } = require('./joongnaDynamicParser');

const DIRECT_TIMEOUT_MS = Math.max(3000, Math.min(15000, Number(process.env.SISEBOM_JOONGNA_DIRECT_TIMEOUT_MS) || 8000));
const DIRECT_SORTS = ['', 'RECENT_SORT'];

function totalFromHtml(html = '') {
  const source = String(html || '');
  const patterns = [
    /총\s*([\d,]+)\s*개/i,
    /([\d,]+)\s*개의\s*(?:상품|매물|검색\s*결과)/i,
    /검색\s*결과\s*([\d,]+)\s*개/i,
    /"total(?:Count|Elements|ProductCount)?"\s*:\s*(\d+)/i
  ];
  for (const re of patterns) {
    const m = source.match(re);
    if (!m) continue;
    const n = Number(String(m[1]).replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function buildDirectUrls(query = '') {
  const encoded = encodeURIComponent(String(query || '').trim());
  const base = `https://web.joongna.com/search/${encoded}`;
  return DIRECT_SORTS.map(sort => sort ? `${base}?sort=${encodeURIComponent(sort)}` : base);
}

async function fetchHtml(url, timeoutMs = DIRECT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        'pragma': 'no-cache'
      }
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, url: response.url || url, text };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJoongnaDirect(query = '', options = {}) {
  const urls = buildDirectUrls(query);
  const unique = new Map();
  const attempts = [];
  let reportedTotal = null;

  for (const url of urls) {
    if (options.deadline && Date.now() >= options.deadline) break;
    try {
      const result = await fetchHtml(url, options.timeoutMs || DIRECT_TIMEOUT_MS);
      const cards = result.ok ? extractJoongnaCardsFromHtml(result.text) : [];
      const total = result.ok ? totalFromHtml(result.text) : null;
      if (total) reportedTotal = Math.max(reportedTotal || 0, total);

      for (const card of cards) {
        const key = String(card?.url || '').split('?')[0];
        if (key && !unique.has(key)) unique.set(key, card);
      }

      attempts.push({ url, status: result.status, count: cards.length });

      // If the plain page is blocked, the sorted version is normally blocked too.
      if ([401, 403, 429].includes(result.status)) break;
    } catch (error) {
      attempts.push({ url, status: null, count: 0, error: error?.name === 'AbortError' ? 'timeout' : (error?.message || 'fetch failed') });
    }
  }

  return {
    cards: [...unique.values()],
    reportedTotal,
    attempts,
    count: unique.size
  };
}

module.exports = {
  fetchJoongnaDirect,
  buildDirectUrls,
  totalFromHtml,
  DIRECT_TIMEOUT_MS
};
