const REQUEST_TIMEOUT_MS = 9000;

const SOURCES = {
  daangn: {
    name: "당근",
    makeUrl(q, region = "") {
      const url = new URL("https://www.daangn.com/kr/buy-sell/");
      url.searchParams.set("search", q);
      if (region) url.searchParams.set("in", region);
      return url.toString();
    },
    linkPatterns: [/\/kr\/buy-sell\//gi, /\/articles\/\d+/gi]
  },
  bunjang: {
    name: "번개장터",
    makeUrl(q) {
      return `https://m.bunjang.co.kr/keywords/${encodeURIComponent(q)}`;
    },
    linkPatterns: [/\/products\/\d+/gi]
  },
  joongna: {
    name: "중고나라",
    makeUrl(q) {
      return `https://web.joongna.com/search/${encodeURIComponent(q)}`;
    },
    linkPatterns: [/\/product\/\d+/gi]
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
  if (Array.isArray(value)) {
    return {
      topLevelType: "array",
      topLevelLength: value.length,
      topLevelKeys: []
    };
  }
  if (value && typeof value === "object") {
    return {
      topLevelType: "object",
      topLevelLength: null,
      topLevelKeys: Object.keys(value).slice(0, 40)
    };
  }
  return {
    topLevelType: value === null ? "null" : typeof value,
    topLevelLength: null,
    topLevelKeys: []
  };
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
      reason: "공개 HTML에 JSON 스크립트는 있지만 매물 링크/가격 신호는 없습니다. JSON 구조 확인이 필요합니다."
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
  const markers = {
    scriptTags,
    jsonScripts,
    nextData,
    nextFlight,
    anchorTags,
    imgTags,
    wonTexts,
    queryMentions,
    listingPathMatches
  };

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

async function diagnosePublicSearch(query, options = {}) {
  const q = String(query || "").trim();
  const keys = ["daangn", "bunjang", "joongna"];
  const results = await Promise.all(keys.map((key) => diagnoseOne(key, q, options)));
  return {
    ok: true,
    query: q,
    checkedAt: new Date().toISOString(),
    diagnosticsVersion: 2,
    note: "공개 검색 HTML만 분석합니다. 로그인·차단 우회·비공개 API 분석은 하지 않습니다.",
    results
  };
}

module.exports = { diagnoseOne, diagnosePublicSearch };
