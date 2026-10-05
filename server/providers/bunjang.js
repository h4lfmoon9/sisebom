const BASE_URL = "https://m.bunjang.co.kr";
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
  ).replace(/\s+/g, " ").trim();
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

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = String(value ?? "").replace(/,/g, "").match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function parsePrice(text = "") {
  const raw = String(text).replace(/,/g, "");
  const match = raw.match(/(?:^|\s)(\d{3,9})\s*원(?:\s|$)/);
  return match ? Number(match[1]) : null;
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
  if (/방금|몇\s*초\s*전/.test(raw)) return 0;
  let match = raw.match(/(\d+)\s*초\s*전/);
  if (match) return 0;
  match = raw.match(/(\d+)\s*분\s*전/);
  if (match) return Number(match[1]);
  match = raw.match(/(\d+)\s*시간\s*전/);
  if (match) return Number(match[1]) * 60;
  match = raw.match(/(\d+)\s*일\s*전/);
  if (match) return Number(match[1]) * 1440;
  match = raw.match(/(\d+)\s*달\s*전/);
  if (match) return Number(match[1]) * 43200;
  match = raw.match(/(\d+)\s*개월\s*전/);
  if (match) return Number(match[1]) * 43200;
  return 999999;
}

function parseTimeText(text = "") {
  const match = String(text).match(/(?:방금|\d+\s*(?:초|분|시간|일|달|개월)\s*전)/);
  return match ? match[0].replace(/\s+/g, "") : "";
}

function hasUnavailableStatus(text = "") {
  return /(예약\s*중|예약중|판매\s*완료|판매완료|거래\s*완료|거래완료|판매종료|거래종료|sold\s*out|soldout|reserved)/i.test(String(text));
}

function isWantedPost(title = "") {
  return /(^|\s)(삽니다|구매합니다|구해요|구합니다)(\s|$)|매입\s*(?:합니다|해요|중|문의|전문)|최고가\s*매입/i.test(String(title));
}

function isObviousAccessory(title = "") {
  return /(케이스|강화\s*유리|보호\s*필름|액정\s*필름|카메라\s*보호|렌즈\s*보호|맥세이프\s*(?:케이스|링|거치대)|휴대폰\s*스트랩|폰\s*케이스)/i.test(String(title));
}

function cleanTitle(text = "", price = null) {
  let title = String(text);
  if (price != null) {
    const escaped = escapeRegExp(Number(price).toLocaleString("ko-KR"));
    title = title.replace(new RegExp(`${escaped}\\s*원`, "g"), " ");
    title = title.replace(new RegExp(`${price}\\s*원`, "g"), " ");
  }
  return title
    .replace(/(?:예약\s*중|판매\s*완료|거래\s*완료)/gi, " ")
    .replace(/(?:찜|조회)\s*\d+(?:개|회)?/gi, " ")
    .replace(/(?:방금|\d+\s*(?:초|분|시간|일|달|개월)\s*전)/g, " ")
    .replace(/^(?:번개페이|안전결제|택배거래|직거래|무료배송)\s*/g, "")
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

function getFirstString(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getFirstValue(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return null;
}

function statusTextFromObject(obj = {}) {
  const keys = ["status", "state", "trade_status", "tradeStatus", "sale_status", "saleStatus", "soldout", "soldOut", "isSoldOut", "reserved", "isReserved"];
  return keys.map((key) => obj[key]).filter((v) => v !== undefined && v !== null).join(" ");
}

function imageFromObject(obj = {}) {
  const direct = getFirstString(obj, ["image", "image_url", "imageUrl", "product_image", "productImage", "thumbnail", "thumbnailUrl", "thumbnail_url"]);
  if (direct) return toAbsoluteUrl(direct);
  const arrays = [obj.images, obj.imageUrls, obj.image_urls, obj.productImages, obj.thumbnails];
  for (const arr of arrays) {
    if (!Array.isArray(arr) || !arr.length) continue;
    const first = arr[0];
    if (typeof first === "string") return toAbsoluteUrl(first);
    if (first && typeof first === "object") {
      const nested = getFirstString(first, ["url", "src", "imageUrl", "image_url"]);
      if (nested) return toAbsoluteUrl(nested);
    }
  }
  return "";
}

function candidateFromObject(obj = {}) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const title = getFirstString(obj, ["name", "title", "product_name", "productName", "goodsName", "itemName"]);
  const price = toNumber(getFirstValue(obj, ["price", "product_price", "productPrice", "sale_price", "salePrice", "amount"]));
  let url = getFirstString(obj, ["url", "href", "link", "product_url", "productUrl", "webUrl", "web_url"]);
  const idValue = getFirstValue(obj, ["pid", "product_id", "productId", "goodsId", "itemId", "id"]);

  if (url) url = toAbsoluteUrl(url);
  if (!/\/products\/\d+/i.test(url) && idValue != null && /^\d+$/.test(String(idValue))) {
    url = `${BASE_URL}/products/${idValue}`;
  }

  if (!title || price == null || price <= 0 || !/\/products\/\d+/i.test(url)) return null;
  const statusText = statusTextFromObject(obj);
  if (hasUnavailableStatus(statusText)) return { excluded: "unavailable" };
  if (isWantedPost(title)) return { excluded: "wanted" };
  if (isObviousAccessory(title)) return { excluded: "accessory" };

  const productId = (url.match(/\/products\/(\d+)/i) || [])[1] || String(idValue || url);
  const region = getFirstString(obj, ["location", "region", "address", "place", "locationName", "regionName"]);
  const timeText = getFirstString(obj, ["timeText", "elapsedTime", "dateText", "updatedText", "createdText"]);
  return {
    item: {
      id: `bunjang-${productId}`,
      platform: "번개장터",
      source: "bunjang",
      title: cleanTitle(title, price),
      price,
      storage: parseStorage(title),
      image: imageFromObject(obj),
      url: url.split("?")[0],
      region,
      timeText,
      minutes: parseMinutes(timeText),
      status: "판매중"
    }
  };
}

function parseJsonScripts(html, { limit = 30 } = {}) {
  const items = [];
  const seen = new Set();
  const excluded = { unavailable: 0, wanted: 0, accessory: 0 };
  const scripts = [];
  const scriptRe = /<script\b[^>]*(?:id=["']__NEXT_DATA__["']|type=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(String(html)))) scripts.push(decodeHtml(match[1]).trim());

  function visit(value, depth = 0) {
    if (depth > 24 || items.length >= limit) return;
    if (Array.isArray(value)) {
      for (const child of value) {
        visit(child, depth + 1);
        if (items.length >= limit) break;
      }
      return;
    }
    if (!value || typeof value !== "object") return;

    const candidate = candidateFromObject(value);
    if (candidate?.excluded) excluded[candidate.excluded]++;
    if (candidate?.item && !seen.has(candidate.item.url)) {
      seen.add(candidate.item.url);
      items.push(candidate.item);
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") visit(child, depth + 1);
      if (items.length >= limit) break;
    }
  }

  for (const text of scripts) {
    if (!text) continue;
    try { visit(JSON.parse(text)); } catch (_) {}
    if (items.length >= limit) break;
  }
  return { items, excluded };
}

function parseAnchorCards(html, { limit = 30, seen = new Set() } = {}) {
  const items = [];
  const excluded = { unavailable: 0, wanted: 0, accessory: 0 };
  const anchorRe = /<a\b([^>]*\bhref\s*=\s*["'][^"']*\/products\/\d+[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRe.exec(String(html))) && items.length < limit) {
    const openTag = `<a ${match[1]}>`;
    const href = extractAttribute(openTag, "href");
    if (!href) continue;
    const url = toAbsoluteUrl(href.split("?")[0]);
    if (seen.has(url)) continue;

    const innerHtml = match[2];
    const text = stripTags(innerHtml);
    if (!text) continue;
    if (hasUnavailableStatus(text)) { excluded.unavailable++; continue; }

    const price = parsePrice(text);
    if (price == null || price <= 0) continue;
    const title = cleanTitle(text, price);
    if (!title) continue;
    if (isWantedPost(title)) { excluded.wanted++; continue; }
    if (isObviousAccessory(title)) { excluded.accessory++; continue; }

    const productId = (url.match(/\/products\/(\d+)/i) || [])[1] || url;
    seen.add(url);
    items.push({
      id: `bunjang-${productId}`,
      platform: "번개장터",
      source: "bunjang",
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
  return { items, excluded };
}

function mergeExcluded(a, b) {
  return {
    unavailable: Number(a.unavailable || 0) + Number(b.unavailable || 0),
    wanted: Number(a.wanted || 0) + Number(b.wanted || 0),
    accessory: Number(a.accessory || 0) + Number(b.accessory || 0)
  };
}

function parseSearchHtml(html, { limit = 30 } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 30));
  const json = parseJsonScripts(html, { limit: safeLimit });
  const seen = new Set(json.items.map((x) => x.url));
  const anchors = parseAnchorCards(html, { limit: Math.max(0, safeLimit - json.items.length), seen });
  return {
    items: [...json.items, ...anchors.items].slice(0, safeLimit),
    excluded: mergeExcluded(json.excluded, anchors.excluded)
  };
}

async function fetchBunjangListings(query, { limit = 30 } = {}) {
  const q = String(query || "").trim();
  if (!q) throw new Error("검색어가 필요합니다.");
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 30));
  const cacheKey = `${q}|${safeLimit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.value;

  const sourceUrl = `${BASE_URL}/keywords/${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(sourceUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ko-KR,ko;q=0.9,en;q=0.7",
        "cache-control": "no-cache",
        "user-agent": "Sisebom/1.0 (+public search aggregation; contact via project repository)"
      }
    });
    if (!response.ok) {
      const error = new Error(`번개장터 응답 오류: HTTP ${response.status}`);
      error.statusCode = 502;
      throw error;
    }

    const html = await response.text();
    const parsed = parseSearchHtml(html, { limit: safeLimit });
    const value = {
      platform: "번개장터",
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
      const timeoutError = new Error("번개장터 응답 시간이 초과되었습니다.");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  fetchBunjangListings,
  parseSearchHtml,
  hasUnavailableStatus
};
