const BASE_URL = "https://web.joongna.com";
const CACHE_TTL_MS = 45_000;
const REQUEST_TIMEOUT_MS = 8_000;
const cache = new Map();

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(html = "") {
  return decodeHtml(
    String(html)
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(text = "") {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractAttribute(tag = "", name = "") {
  const re = new RegExp(`${escapeRegExp(name)}\\s*=\\s*["']([^"']*)["']`, "i");
  const match = String(tag).match(re);
  return match ? decodeHtml(match[1]) : "";
}

function toAbsoluteUrl(url = "") {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function parsePrice(text = "") {
  const match = String(text).match(/(?:^|\s)(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function parseStorage(text = "") {
  const raw = String(text);
  let match = raw.match(/(?:^|\D)(1|2)\s*(?:TB|테라)(?:\D|$)/i);
  if (match) return Number(match[1]) * 1024;
  match = raw.match(/(?:^|\D)(64|128|256|512|1024|2048)\s*(?:GB|G|기가)?(?:\D|$)/i);
  return match ? Number(match[1]) : null;
}

function parseMinutes(text = "") {
  const raw = String(text);
  let match = raw.match(/(\d+)\s*초\s*전/);
  if (match) return 0;
  match = raw.match(/(\d+)\s*분\s*전/);
  if (match) return Number(match[1]);
  match = raw.match(/(\d+)\s*시간\s*전/);
  if (match) return Number(match[1]) * 60;
  match = raw.match(/(\d+)\s*일\s*전/);
  if (match) return Number(match[1]) * 1440;
  return 999999;
}

function parseTimeText(text = "") {
  const match = String(text).match(/(?:방금|\d+\s*(?:초|분|시간|일)\s*전)/);
  return match ? match[0].replace(/\s+/g, "") : "";
}

function hasUnavailableStatus(text = "") {
  return /(예약\s*중|판매\s*완료|거래\s*완료|판매종료|거래종료|sold\s*out)/i.test(String(text));
}

function isWantedPost(title = "") {
  return /(삽니다|구매합니다|구해요|구합니다|매입|교환\s*원해|교환합니다)/i.test(String(title));
}

function isObviousAccessory(title = "") {
  const t = String(title);
  return /(케이스|강화\s*유리|보호\s*필름|액정\s*필름|카메라\s*보호|렌즈\s*보호|맥세이프\s*(?:케이스|링|거치대)|휴대폰\s*스트랩)/i.test(t);
}

function cleanTitle(text = "", price = null) {
  let title = String(text);
  if (price != null) {
    const formatted = Number(price).toLocaleString("ko-KR");
    title = title.split(`${formatted}원`)[0];
  }
  return title
    .replace(/^(?:안심결제|인증셀러|셀프검수|무료배송)\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(innerHtml = "") {
  const imgTag = String(innerHtml).match(/<img\b[^>]*>/i)?.[0] || "";
  if (!imgTag) return "";
  const src = extractAttribute(imgTag, "src") || extractAttribute(imgTag, "data-src");
  if (src && !src.startsWith("data:")) return toAbsoluteUrl(src);
  const srcset = extractAttribute(imgTag, "srcset");
  if (srcset) {
    const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
    if (first) return toAbsoluteUrl(first);
  }
  return "";
}

function parseSearchHtml(html, { limit = 30 } = {}) {
  const items = [];
  const seen = new Set();
  const anchorRe = /<a\b([^>]*\bhref\s*=\s*["'][^"']*\/product\/\d+[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  let excludedUnavailable = 0;
  let excludedWanted = 0;
  let excludedAccessory = 0;

  while ((match = anchorRe.exec(String(html))) && items.length < limit) {
    const openTag = `<a ${match[1]}>`;
    const href = extractAttribute(openTag, "href");
    if (!href) continue;
    const url = toAbsoluteUrl(href.split("?")[0]);
    if (seen.has(url)) continue;
    seen.add(url);

    const innerHtml = match[2];
    const text = stripTags(innerHtml);
    if (!text) continue;

    if (hasUnavailableStatus(text)) {
      excludedUnavailable++;
      continue;
    }

    const price = parsePrice(text);
    if (price == null) continue;

    const title = cleanTitle(text, price);
    if (!title) continue;
    if (isWantedPost(title)) {
      excludedWanted++;
      continue;
    }
    if (isObviousAccessory(title)) {
      excludedAccessory++;
      continue;
    }

    const productId = (url.match(/\/product\/(\d+)/) || [])[1] || url;
    items.push({
      id: `joongna-${productId}`,
      platform: "중고나라",
      source: "joongna",
      title,
      price,
      storage: parseStorage(title),
      image: extractImage(innerHtml),
      url,
      region: "",
      timeText: parseTimeText(text),
      minutes: parseMinutes(text),
      status: "판매중"
    });
  }

  return {
    items,
    excluded: {
      unavailable: excludedUnavailable,
      wanted: excludedWanted,
      accessory: excludedAccessory
    }
  };
}

async function fetchJoongnaListings(query, { limit = 30 } = {}) {
  const q = String(query || "").trim();
  if (!q) throw new Error("검색어가 필요합니다.");

  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 30));
  const cacheKey = `${q}|${safeLimit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.value;

  const sourceUrl = `${BASE_URL}/search/${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(sourceUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ko-KR,ko;q=0.9,en;q=0.7",
        "cache-control": "no-cache",
        "user-agent": "Sisebom/1.0 (+public search aggregation; contact via project repository)"
      }
    });

    if (!response.ok) {
      const error = new Error(`중고나라 응답 오류: HTTP ${response.status}`);
      error.statusCode = 502;
      throw error;
    }

    const html = await response.text();
    const parsed = parseSearchHtml(html, { limit: safeLimit });
    const value = {
      platform: "중고나라",
      query: q,
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      count: parsed.items.length,
      availableOnly: true,
      excluded: parsed.excluded,
      listings: parsed.items
    };
    cache.set(cacheKey, { savedAt: Date.now(), value });
    return value;
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("중고나라 응답 시간이 초과되었습니다.");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  fetchJoongnaListings,
  parseSearchHtml,
  hasUnavailableStatus
};
