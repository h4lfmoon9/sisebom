'use strict';

const { normalizeImage } = require('./browserCollectorCore');

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function metaAttributes(tag = '') {
  const attrs = {};
  for (const m of String(tag).matchAll(/([a-zA-Z_:.-]+)\s*=\s*(["'])(.*?)\2/g)) {
    attrs[m[1].toLowerCase()] = decodeHtml(m[3]);
  }
  return attrs;
}

function parseFirstImageFromHtml(html = '') {
  const source = String(html);

  for (const m of source.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = metaAttributes(m[0]);
    const key = String(attrs.property || attrs.name || '').toLowerCase();
    if ((key === 'og:image' || key === 'og:image:url' || key === 'twitter:image') && attrs.content) {
      return attrs.content;
    }
  }

  return '';
}

async function fetchFirstPublicListingImage(source, listingUrl, options = {}) {
  const timeoutMs = Math.max(800, Math.min(5000, Number(options.timeoutMs) || 2600));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(listingUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) return '';

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return '';
    }

    const html = await response.text();
    const candidate = parseFirstImageFromHtml(html);
    if (!candidate) return '';

    // The image is accepted only when it came from the listing's own public page
    // and passes the existing per-platform image validation.
    return normalizeImage(source, listingUrl, candidate);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function enrichRawListingImages(source, rawListings = [], options = {}) {
  const limit = Math.max(1, Math.min(24, Number(options.limit) || 12));
  const concurrency = Math.max(1, Math.min(4, Number(options.concurrency) || 3));
  const candidates = rawListings.filter(item => item?.url && !item?.image).slice(0, limit);

  let cursor = 0;
  let enriched = 0;

  async function worker() {
    while (cursor < candidates.length) {
      const index = cursor++;
      const item = candidates[index];
      const image = await fetchFirstPublicListingImage(source, item.url, {
        timeoutMs: options.timeoutMs
      });
      if (image) {
        item.image = image;
        enriched++;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length || 1) }, () => worker()));

  return {
    attempted: candidates.length,
    enriched
  };
}

module.exports = {
  metaAttributes,
  parseFirstImageFromHtml,
  fetchFirstPublicListingImage,
  enrichRawListingImages
};
