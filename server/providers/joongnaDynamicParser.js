'use strict';

const { canonicalUrl } = require('./browserCollectorCore');

function normalizeEscapedJsonText(value = '') {
  return String(value).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function extractBalancedJson(input = '', startIndex = 0, openChar = '[') {
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return input.slice(startIndex, i + 1);
    }
  }
  return null;
}

function extractJsonAfterMarker(html = '', marker = '"items":', openChar = '[') {
  const markers = [marker, marker.replaceAll('"', '\\"')];
  for (const candidate of markers) {
    const markerIndex = html.indexOf(candidate);
    if (markerIndex < 0) continue;
    const tail = html.slice(markerIndex + candidate.length);
    for (const value of [tail, normalizeEscapedJsonText(tail)]) {
      const startIndex = value.indexOf(openChar);
      if (startIndex < 0) continue;
      const jsonText = extractBalancedJson(value, startIndex, openChar);
      if (!jsonText) continue;
      try { return JSON.parse(jsonText); } catch {}
    }
  }
  return null;
}

function joongnaImageFromRaw(raw = {}) {
  const candidates = [
    raw.imageUrl,
    raw.image,
    raw.thumbnailUrl,
    raw.thumbnail,
    raw.url,
    Array.isArray(raw.images) ? raw.images[0] : '',
    Array.isArray(raw.imageUrls) ? raw.imageUrls[0] : ''
  ].filter(Boolean);

  return candidates.find(value => {
    const s = String(value || '');
    return /^https?:\/\//i.test(s) && (/img\d*\.joongna\.com/i.test(s) || /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(s));
  }) || '';
}

function joongnaRawToCard(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const seq = raw.seq ?? raw.productSeq ?? raw.productId ?? raw.productNo;
  const title = String(raw.title ?? raw.productTitle ?? raw.name ?? '').trim();
  const priceRaw = raw.price ?? raw.productPrice ?? raw.salePrice;
  const price = Number(String(priceRaw ?? '').replace(/[^0-9]/g, ''));

  if (!seq || !title || !Number.isFinite(price) || price <= 0) return null;

  const state = raw.state ?? raw.productStatus ?? raw.status;
  const sold = (typeof state === 'number' && state !== 0) || /sold|판매완료|거래완료/i.test(String(state ?? ''));
  const location = String(raw.mainLocationName || (Array.isArray(raw.locationNames) ? raw.locationNames[0] : '') || '').trim();
  const sortDate = String(raw.sortDate || raw.listedAt || raw.createdAt || '').trim();

  return {
    url: `https://web.joongna.com/product/${encodeURIComponent(String(seq))}`,
    title,
    text: `${title}\n${price.toLocaleString('ko-KR')}원${location ? `\n${location}` : ''}${sortDate ? `\n${sortDate}` : ''}${sold ? '\n판매완료' : ''}`,
    image: joongnaImageFromRaw(raw)
  };
}

function extractJoongnaCardsFromHtml(html = '') {
  const source = String(html || '');
  const attempts = [source, normalizeEscapedJsonText(source)];

  for (const value of attempts) {
    // The public Joongna SSR page currently serializes the search list as
    // "items":[...] immediately before changedProductFilterType. Prefer that
    // segment because pages can contain unrelated "items" arrays earlier.
    const starts = ['"items":', '\"items\":'];
    const ends = [',"changedProductFilterType"', ',\"changedProductFilterType\"'];

    for (const startMarker of starts) {
      const start = value.indexOf(startMarker);
      if (start < 0) continue;
      const contentStart = start + startMarker.length;

      for (const endMarker of ends) {
        const end = value.indexOf(endMarker, contentStart);
        if (end < 0) continue;
        let segment = value.slice(contentStart, end).trim();
        segment = normalizeEscapedJsonText(segment);
        try {
          const items = JSON.parse(segment);
          if (Array.isArray(items)) {
            const cards = items.map(joongnaRawToCard).filter(Boolean);
            if (cards.length) return cards;
          }
        } catch {}
      }
    }

    // Fallback for older/current variants where the closing marker changes.
    const items = extractJsonAfterMarker(value, '"items":', '[');
    if (!Array.isArray(items)) continue;
    const cards = items.map(joongnaRawToCard).filter(Boolean);
    if (cards.length) return cards;
  }
  return [];
}

function extractJoongnaCardsFromJson(payload) {
  const cards = [];
  const totals = [];
  const visited = new Set();

  const walk = (value, depth = 0) => {
    if (value == null || depth > 12 || typeof value !== 'object') return;
    if (visited.has(value)) return;
    visited.add(value);

    if (!Array.isArray(value)) {
      const card = joongnaRawToCard(value);
      if (card) cards.push(card);

      for (const [key, child] of Object.entries(value)) {
        if (/^(?:total|totalCount|totalElements|totalProductCount|resultCount|productCount)$/i.test(key)) {
          const n = Number(child);
          if (Number.isFinite(n) && n > 0 && n <= 1000000) totals.push(n);
        }
        walk(child, depth + 1);
      }
      return;
    }

    for (const child of value) walk(child, depth + 1);
  };

  walk(payload);

  const unique = new Map();
  for (const card of cards) {
    const key = canonicalUrl(card.url || '');
    if (key && !unique.has(key)) unique.set(key, card);
  }

  return {
    cards: [...unique.values()],
    reportedTotal: totals.length ? Math.max(...totals) : null
  };
}

module.exports = {
  extractJoongnaCardsFromHtml,
  extractJoongnaCardsFromJson,
  joongnaRawToCard
};
