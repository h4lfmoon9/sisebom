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

function countMatches(text, regex) {
  const matches = String(text || "").match(regex);
  return matches ? matches.length : 0;
}

function stripTags(text = "") {
  return String(text)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
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
    const href = match[1];
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

function detectBlockPage(html = "", status = 0) {
  const text = String(html).toLowerCase();
  const words = [
    "access denied", "forbidden", "captcha", "cloudflare", "bot detected",
    "automated", "비정상적인 접근", "접근이 제한", "요청이 차단", "로봇"
  ];
  return status === 401 || status === 403 || status === 429 || words.some((word) => text.includes(word));
}

function summarizeHtml(html = "", source, query) {
  const jsonScripts = countMatches(html, /<script\b[^>]*type=["']application\/(?:json|ld\+json)["'][^>]*>/gi);
  const nextData = countMatches(html, /__NEXT_DATA__/g);
  const nextFlight = countMatches(html, /self\.__next_f\.push/g);
  const scriptTags = countMatches(html, /<script\b/gi);
  const anchorTags = countMatches(html, /<a\b/gi);
  const imgTags = countMatches(html, /<img\b/gi);
  const wonTexts = countMatches(html, /\d[\d,]{2,}\s*원/g);
  const queryMentions = query ? countMatches(html.toLowerCase(), new RegExp(escapeRegExp(query.toLowerCase()), "g")) : 0;
  const listingPathMatches = source.linkPatterns.reduce((sum, pattern) => {
    pattern.lastIndex = 0;
    return sum + countMatches(html, pattern);
  }, 0);

  return {
    title: getTitle(html),
    htmlBytes: Buffer.byteLength(String(html), "utf8"),
    markers: {
      scriptTags,
      jsonScripts,
      nextData,
      nextFlight,
      anchorTags,
      imgTags,
      wonTexts,
      queryMentions,
      listingPathMatches
    },
    sampleLinks: getSampleLinks(html, source)
  };
}

function escapeRegExp(text = "") {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    const summary = summarizeHtml(html, source, q);
    return {
      platform: source.name,
      key: platform,
      ok: response.ok,
      status: response.status,
      sourceUrl,
      finalUrl: response.url,
      contentType: response.headers.get("content-type") || "",
      elapsedMs: Date.now() - startedAt,
      blockedHint: detectBlockPage(html, response.status),
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
    note: "공개 검색 페이지의 응답 구조만 점검합니다. 로그인·차단 우회는 하지 않습니다.",
    results
  };
}

module.exports = { diagnoseOne, diagnosePublicSearch };
