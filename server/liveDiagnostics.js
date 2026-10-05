const REQUEST_TIMEOUT_MS = 9000;
const TAVILY_TIMEOUT_MS = 10000;
const TAVILY_ENDPOINT = "https://api.tavily.com/search";

const SOURCES = {
  daangn: {
    name: "당근",
    makeUrl(q, region = "") {
      const url = new URL("https://www.daangn.com/kr/buy-sell/");
      url.searchParams.set("search", q);
      if (region) url.searchParams.set("in", region);
      return url.toString();
    },
    linkPatterns: [/\/kr\/buy-sell\//gi, /\/articles\/\d+/gi],
    domain: "daangn.com",
    isListingUrl(url) {
      try {
        const u = new URL(url);
        return /(^|\.)daangn\.com$/i.test(u.hostname) &&
          (/\/kr\/buy-sell\/[^/?#]+/i.test(u.pathname) || /\/articles\/\d+/i.test(u.pathname));
      } catch (_) { return false; }
    }
  },
  bunjang: {
    name: "번개장터",
    makeUrl(q) {
      return `https://m.bunjang.co.kr/keywords/${encodeURIComponent(q)}`;
    },
    linkPatterns: [/\/products\/\d+/gi],
    domain: "bunjang.co.kr",
    isListingUrl(url) {
      try {
        const u = new URL(url);
        return /(^|\.)bunjang\.co\.kr$/i.test(u.hostname) && /\/products\/\d+/i.test(u.pathname);
      } catch (_) { return false; }
    }
  },
  joongna: {
    name: "중고나라",
    makeUrl(q) {
      return `https://web.joongna.com/search/${encodeURIComponent(q)}`;
    },
    linkPatterns: [/\/product\/\d+/gi],
    domain: "joongna.com",
    isListingUrl(url) {
      try {
        const u = new URL(url);
        return /(^|\.)joongna\.com$/i.test(u.hostname) && /\/product\/\d+/i.test(u.pathname);
      } catch (_) { return false; }
    }
  }
};

function escapeRegExp(text = "") {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(text, regex) {
  const matches = String(text || "").match(regex);
  return matches ? matches.length : 0;
}

function decodeHtml(text = "") {
  return String(text)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(text = "") {
  return decodeHtml(String(text)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractAttribute(attrs = "", name = "") {
  const re = new RegExp(`(?:^|\\s)${escapeRegExp(name)}\\s*=\\s*["']([^"']*)["']`, "i");
  const match = String(attrs).match(re);
  return match ? decodeHtml(match[1]).trim() : "";
}

function getTitle(html = "") {
  const match = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]).slice(0, 180) : "";
}

function getSampleLinks(html = "", source, max = 5) {
  const samples = [];
  const seen = new Set();
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html))) && samples.length < max) {
    const href = decodeHtml(match[1]);
    if (!source.linkPatterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(href);
    })) continue;
    const text = stripTags(match[2]).slice(0, 140);
    const key = `${href}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    samples.push({ href: href.slice(0, 300), text });
  }
  return samples;
}

function getAnyAnchorSamples(html = "", max = 12) {
  const samples = [];
  const seen = new Set();
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html))) && samples.length < max) {
    const href = extractAttribute(match[1], "href");
    if (!href || href.startsWith("javascript:")) continue;
    const text = stripTags(match[2]).slice(0, 100);
    const key = `${href}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    samples.push({ href: href.slice(0, 300), text });
  }
  return samples;
}

function detectBlockPage(html = "", status = 0) {
  const text = String(html).toLowerCase();
  const words = [
    "access denied", "forbidden", "captcha", "cloudflare", "bot detected",
    "automated", "비정상적인 접근", "접근이 제한", "요청이 차단", "로봇"
  ];
  return status === 401 || status === 403 || status === 429 || words.some((word) => text.includes(word));
}

function summarizeJsonValue(value) {
  if (Array.isArray(value)) return { topLevelType: "array", topLevelLength: value.length, topLevelKeys: [] };
  if (value && typeof value === "object") {
    return { topLevelType: "object", topLevelLength: null, topLevelKeys: Object.keys(value).slice(0, 40) };
  }
  return { topLevelType: value === null ? "null" : typeof value, topLevelLength: null, topLevelKeys: [] };
}

function countSourceListingPatterns(text = "", source) {
  return source.linkPatterns.reduce((sum, pattern) => {
    pattern.lastIndex = 0;
    return sum + countMatches(text, pattern);
  }, 0);
}

function getScriptSamples(html = "", source, query, max = 12) {
  const samples = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(String(html))) && samples.length < max) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const type = extractAttribute(attrs, "type");
    const id = extractAttribute(attrs, "id");
    const src = extractAttribute(attrs, "src");
    const queryMentions = query
      ? countMatches(body.toLowerCase(), new RegExp(escapeRegExp(query.toLowerCase()), "g"))
      : 0;

    const item = {
      type: type || null,
      id: id || null,
      src: src ? src.slice(0, 500) : null,
      bodyBytes: Buffer.byteLength(body, "utf8"),
      queryMentions,
      listingPathMatches: countSourceListingPatterns(body, source),
      wonTexts: countMatches(body, /\d[\d,]{2,}\s*원/g)
    };

    if (/application\/(?:json|ld\+json)/i.test(type || "") && body.trim()) {
      try {
        const parsed = JSON.parse(decodeHtml(body.trim()));
        Object.assign(item, summarizeJsonValue(parsed));
        item.jsonParseOk = true;
      } catch (error) {
        item.jsonParseOk = false;
        item.jsonError = String(error.message || "JSON parse failed").slice(0, 160);
      }
    }
    samples.push(item);
  }
  return samples;
}

function getMetaSamples(html = "", max = 12) {
  const samples = [];
  const re = /<meta\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(String(html))) && samples.length < max) {
    const attrs = match[1] || "";
    const name = extractAttribute(attrs, "name") || extractAttribute(attrs, "property");
    const content = extractAttribute(attrs, "content");
    if (!name || !content) continue;
    if (!/(description|title|og:|twitter:)/i.test(name)) continue;
    samples.push({ name: name.slice(0, 120), content: content.slice(0, 300) });
  }
  return samples;
}

function getRenderingAssessment({ status, blockedHint, markers }) {
  if (blockedHint) return {
    mode: "blocked",
    usableFromPublicHtml: false,
    reason: `HTTP ${status || "?"} 또는 차단 페이지로 판단됩니다.`
  };
  if (markers.listingPathMatches > 0 || markers.wonTexts > 0 || markers.imgTags > 0) {
    return {
      mode: "server-html-has-listing-signals",
      usableFromPublicHtml: true,
      reason: "공개 HTML 안에 매물 링크/가격/이미지 신호가 있습니다."
    };
  }
  if (markers.jsonScripts > 0) {
    return {
      mode: "shell-with-json",
      usableFromPublicHtml: "unknown",
      reason: "공개 HTML에 JSON 스크립트는 있지만 매물 링크/가격 신호는 없습니다."
    };
  }
  return {
    mode: "client-rendered-shell",
    usableFromPublicHtml: false,
    reason: "공개 HTML에는 검색 페이지 껍데기만 있고 매물 링크/가격/이미지가 포함되지 않은 것으로 보입니다."
  };
}

function summarizeHtml(html = "", source, query, status = 0) {
  const jsonScripts = countMatches(html, /<script\b[^>]*type=["']application\/(?:json|ld\+json)["'][^>]*>/gi);
  const nextData = countMatches(html, /__NEXT_DATA__/g);
  const nextFlight = countMatches(html, /self\.__next_f\.push/g);
  const scriptTags = countMatches(html, /<script\b/gi);
  const anchorTags = countMatches(html, /<a\b/gi);
  const imgTags = countMatches(html, /<img\b/gi);
  const wonTexts = countMatches(html, /\d[\d,]{2,}\s*원/g);
  const queryMentions = query ? countMatches(html.toLowerCase(), new RegExp(escapeRegExp(query.toLowerCase()), "g")) : 0;
  const listingPathMatches = countSourceListingPatterns(html, source);
  const blockedHint = detectBlockPage(html, status);
  const markers = { scriptTags, jsonScripts, nextData, nextFlight, anchorTags, imgTags, wonTexts, queryMentions, listingPathMatches };

  return {
    title: getTitle(html),
    htmlBytes: Buffer.byteLength(String(html), "utf8"),
    markers,
    sampleLinks: getSampleLinks(html, source),
    deep: {
      assessment: getRenderingAssessment({ status, blockedHint, markers }),
      visibleTextSample: stripTags(html).slice(0, 500),
      anchorSamples: getAnyAnchorSamples(html),
      scriptSamples: getScriptSamples(html, source, query),
      metaSamples: getMetaSamples(html)
    }
  };
}

async function diagnoseOne(platform, query, { region = "" } = {}) {
  const source = SOURCES[platform];
  if (!source) return { platform, ok: false, error: "지원하지 않는 플랫폼" };
  const q = String(query || "").trim();
  if (!q) return { platform: source.name, ok: false, error: "검색어가 필요합니다." };

  const sourceUrl = source.makeUrl(q, region);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();
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
    const html = await response.text();
    const blockedHint = detectBlockPage(html, response.status);
    const summary = summarizeHtml(html, source, q, response.status);
    return {
      platform: source.name,
      key: platform,
      ok: response.ok,
      status: response.status,
      sourceUrl,
      finalUrl: response.url,
      contentType: response.headers.get("content-type") || "",
      elapsedMs: Date.now() - startedAt,
      blockedHint,
      ...summary
    };
  } catch (error) {
    return {
      platform: source.name,
      key: platform,
      ok: false,
      status: null,
      sourceUrl,
      elapsedMs: Date.now() - startedAt,
      blockedHint: false,
      error: error?.name === "AbortError" ? "응답 시간 초과" : (error?.message || "요청 실패")
    };
  } finally {
    clearTimeout(timer);
  }
}

function parsePrice(text = "") {
  const raw = String(text || "").replace(/\s+/g, " ");
  let match = raw.match(/(\d{1,3}(?:,\d{3})+)\s*원/);
  if (match) return Number(match[1].replace(/,/g, ""));
  match = raw.match(/(?:^|\D)(\d+(?:\.\d+)?)\s*만원(?:\D|$)/);
  if (match) return Math.round(Number(match[1]) * 10000);
  match = raw.match(/(?:^|\D)(\d+(?:\.\d+)?)\s*천원(?:\D|$)/);
  if (match) return Math.round(Number(match[1]) * 1000);
  return null;
}

function parseStorage(text = "") {
  const raw = String(text || "");
  let match = raw.match(/(?:^|\D)(1|2)\s*(?:TB|테라)(?:\D|$)/i);
  if (match) return Number(match[1]) * 1024;
  match = raw.match(/(?:^|\D)(64|128|256|512|1024|2048)\s*(?:GB|G|기가)?(?:\D|$)/i);
  return match ? Number(match[1]) : null;
}

function isUnavailable(text = "") {
  return /(예약\s*중|판매\s*완료|거래\s*완료|판매종료|거래종료|sold\s*out|soldout|reserved)/i.test(String(text));
}

function isWanted(text = "") {
  return /(^|\s)(삽니다|구매합니다|구해요|구합니다)(\s|$)|매입\s*(?:합니다|해요|중|문의|전문)|최고가\s*매입/i.test(String(text));
}

function isAccessory(text = "") {
  return /(케이스|강화\s*유리|보호\s*필름|액정\s*필름|카메라\s*보호|렌즈\s*보호|맥세이프\s*(?:케이스|링|거치대)|휴대폰\s*스트랩|폰\s*케이스|충전\s*케이블|빈\s*박스|공박스)/i.test(String(text));
}

function normalizeSearchResult(item, source, query) {
  const url = String(item?.url || "").trim();
  const title = stripTags(item?.title || "");
  const description = stripTags(item?.content || item?.description || item?.snippet || "");
  const combined = `${title} ${description}`.trim();
  if (!url || !source.isListingUrl(url)) return { excluded: "notListing" };
  if (isUnavailable(combined)) return { excluded: "unavailable" };
  if (isWanted(combined)) return { excluded: "wanted" };
  if (isAccessory(combined)) return { excluded: "accessory" };

  return {
    item: {
      platform: source.name,
      title: title || description || query,
      description: description.slice(0, 280),
      url,
      price: parsePrice(combined),
      storage: parseStorage(combined),
      indexedResult: true,
      relevance: Number.isFinite(Number(item?.score)) ? Number(item.score) : null
    }
  };
}

async function tavilyWebSearch(query, maxResults = 20) {
  const key = String(process.env.TAVILY_API_KEY || "").trim();
  if (!key) {
    const error = new Error("TAVILY_API_KEY 환경변수가 설정되지 않았습니다.");
    error.code = "TAVILY_NOT_CONFIGURED";
    throw error;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);
  try {
    const response = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: Math.max(1, Math.min(20, Number(maxResults) || 20)),
        include_answer: false,
        include_raw_content: false,
        include_images: false,
        include_domains: Object.values(SOURCES).map((source) => source.domain)
      })
    });

    const body = await response.text();
    let data = null;
    try { data = JSON.parse(body); } catch (_) {}
    if (!response.ok) {
      const detail = data?.detail || data?.message || data?.error || `HTTP ${response.status}`;
      const error = new Error(`Tavily Search API 오류: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
      error.status = response.status;
      throw error;
    }
    return data || {};
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Tavily Search API 응답 시간이 초과되었습니다.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function sourceForUrl(url) {
  for (const [key, source] of Object.entries(SOURCES)) {
    if (source.isListingUrl(url)) return { key, source };
  }
  return null;
}

async function discoverIndexedListings(query, { perPlatform = 10 } = {}) {
  const q = String(query || "").trim();
  const configured = Boolean(String(process.env.TAVILY_API_KEY || "").trim());
  if (!configured) {
    return {
      configured: false,
      provider: "Tavily Search API",
      message: "Render 환경변수 TAVILY_API_KEY를 설정하면 공개 검색 색인에서 매물 URL 탐색을 시작합니다.",
      results: []
    };
  }

  const keys = ["daangn", "bunjang", "joongna"];
  const grouped = Object.fromEntries(keys.map((key) => [key, []]));
  const excluded = Object.fromEntries(keys.map((key) => [key, { notListing: 0, unavailable: 0, wanted: 0, accessory: 0 }]));
  const seen = new Set();
  const searchQuery = `${q} 중고거래`;

  try {
    const data = await tavilyWebSearch(searchQuery, 20);
    const raw = Array.isArray(data?.results) ? data.results : [];

    for (const result of raw) {
      const match = sourceForUrl(String(result?.url || ""));
      if (!match) continue;
      const { key, source } = match;
      const normalized = normalizeSearchResult(result, source, q);
      if (normalized.excluded) {
        excluded[key][normalized.excluded] = (excluded[key][normalized.excluded] || 0) + 1;
        continue;
      }
      if (!normalized.item || seen.has(normalized.item.url)) continue;
      seen.add(normalized.item.url);
      if (grouped[key].length < perPlatform) grouped[key].push(normalized.item);
    }

    const output = keys.map((key) => {
      const source = SOURCES[key];
      const items = grouped[key];
      return {
        platform: source.name,
        key,
        ok: true,
        count: items.length,
        pricedCount: items.filter((x) => Number.isFinite(x.price)).length,
        excluded: excluded[key],
        listings: items
      };
    });

    return {
      configured: true,
      provider: "Tavily Search API",
      mode: "public-index-discovery",
      searchDepth: "basic",
      checkedAt: new Date().toISOString(),
      query: q,
      searchQuery,
      rawCount: raw.length,
      results: output,
      total: output.reduce((sum, x) => sum + Number(x.count || 0), 0),
      pricedTotal: output.reduce((sum, x) => sum + Number(x.pricedCount || 0), 0)
    };
  } catch (error) {
    return {
      configured: true,
      provider: "Tavily Search API",
      mode: "public-index-discovery",
      checkedAt: new Date().toISOString(),
      query: q,
      error: error?.message || "검색 실패",
      results: keys.map((key) => ({
        platform: SOURCES[key].name,
        key,
        ok: false,
        count: 0,
        listings: []
      })),
      total: 0,
      pricedTotal: 0
    };
  }
}

async function diagnosePublicSearch(query, options = {}) {
  const q = String(query || "").trim();
  const keys = ["daangn", "bunjang", "joongna"];
  const [results, searchDiscovery] = await Promise.all([
    Promise.all(keys.map((key) => diagnoseOne(key, q, options))),
    discoverIndexedListings(q, { perPlatform: 10 })
  ]);

  return {
    ok: true,
    query: q,
    checkedAt: new Date().toISOString(),
    diagnosticsVersion: 4,
    note: "공개 검색 HTML과 Tavily의 공개 웹 검색 결과만 분석합니다. 로그인·차단 우회·비공개 API 분석은 하지 않습니다.",
    searchDiscovery,
    results
  };
}

module.exports = { diagnoseOne, diagnosePublicSearch, discoverIndexedListings };
