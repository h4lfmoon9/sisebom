const fs = require("fs");
const path = require("path");

const target = path.join(process.cwd(), "server", "liveDiagnostics.js");

if (!fs.existsSync(target)) {
  console.error("오류: server/liveDiagnostics.js를 찾을 수 없습니다.");
  console.error("이 파일은 반드시 sisebom 폴더에서 실행하세요.");
  process.exit(1);
}

let text = fs.readFileSync(target, "utf8");

function replaceBetween(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`패치 위치를 찾지 못했습니다: ${startMarker}`);
  }
  return source.slice(0, start) + replacement.trim() + "\n\n" + source.slice(end);
}

const tavilyFn = String.raw`
async function tavilyWebSearch(query, maxResults = 20, domains = []) {
  const key = String(process.env.TAVILY_API_KEY || "").trim();
  if (!key) {
    const error = new Error("TAVILY_API_KEY 환경변수가 설정되지 않았습니다.");
    error.code = "TAVILY_NOT_CONFIGURED";
    throw error;
  }

  const includeDomains = Array.isArray(domains) && domains.length
    ? domains
    : Object.values(SOURCES).map((source) => source.domain);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);
  try {
    const response = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "authorization": \`Bearer \${key}\`
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: Math.max(1, Math.min(20, Number(maxResults) || 20)),
        include_answer: false,
        include_raw_content: false,
        include_images: false,
        include_domains: includeDomains
      })
    });

    const body = await response.text();
    let data = null;
    try { data = JSON.parse(body); } catch (_) {}
    if (!response.ok) {
      const detail = data?.detail || data?.message || data?.error || \`HTTP \${response.status}\`;
      const error = new Error(\`Tavily Search API 오류: \${typeof detail === "string" ? detail : JSON.stringify(detail)}\`);
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
}`;

const discoverFn = String.raw`
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
  const output = [];
  let rawTotal = 0;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const source = SOURCES[key];
    const searchQuery = \`\${q} \${source.name} 중고거래 판매\`;
    const excluded = {
      notListing: 0,
      unavailable: 0,
      wanted: 0,
      accessory: 0
    };

    try {
      const data = await tavilyWebSearch(searchQuery, 20, [source.domain]);
      const raw = Array.isArray(data?.results) ? data.results : [];
      rawTotal += raw.length;

      const items = [];
      const seen = new Set();

      for (const result of raw) {
        const normalized = normalizeSearchResult(result, source, q);

        if (normalized.excluded) {
          excluded[normalized.excluded] = (excluded[normalized.excluded] || 0) + 1;
          continue;
        }

        if (!normalized.item || seen.has(normalized.item.url)) continue;
        seen.add(normalized.item.url);
        items.push(normalized.item);

        if (items.length >= perPlatform) break;
      }

      output.push({
        platform: source.name,
        key,
        ok: true,
        domain: source.domain,
        searchQuery,
        rawCount: raw.length,
        count: items.length,
        pricedCount: items.filter((x) => Number.isFinite(x.price)).length,
        excluded,
        sampleUrls: raw.slice(0, 8).map((x) => String(x?.url || "")).filter(Boolean),
        listings: items
      });
    } catch (error) {
      output.push({
        platform: source.name,
        key,
        ok: false,
        domain: source.domain,
        searchQuery,
        rawCount: 0,
        count: 0,
        pricedCount: 0,
        excluded,
        error: error?.message || "검색 실패",
        sampleUrls: [],
        listings: []
      });
    }

    if (i < keys.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return {
    configured: true,
    provider: "Tavily Search API",
    mode: "public-index-discovery",
    searchMode: "per-platform-domain",
    searchDepth: "basic",
    checkedAt: new Date().toISOString(),
    query: q,
    rawCount: rawTotal,
    results: output,
    total: output.reduce((sum, x) => sum + Number(x.count || 0), 0),
    pricedTotal: output.reduce((sum, x) => sum + Number(x.pricedCount || 0), 0)
  };
}`;

try {
  text = replaceBetween(
    text,
    "async function tavilyWebSearch(",
    "function sourceForUrl(",
    tavilyFn
  );

  text = replaceBetween(
    text,
    "async function discoverIndexedListings(",
    "async function diagnosePublicSearch(",
    discoverFn
  );

  if (!text.includes("diagnosticsVersion: 4")) {
    console.error("오류: diagnosticsVersion: 4를 찾지 못했습니다.");
    process.exit(1);
  }

  text = text.replace("diagnosticsVersion: 4", "diagnosticsVersion: 5");

  const backup = target + ".step10-backup";
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(target, backup);
  }

  fs.writeFileSync(target, text, "utf8");

  console.log("");
  console.log("시세봄 11단계 적용 완료");
  console.log("- Tavily를 플랫폼별 도메인 검색으로 변경");
  console.log("- 진단 결과에 sampleUrls 추가");
  console.log("- diagnosticsVersion: 5");
  console.log("");
  console.log("이제 GitHub Desktop에서 Commit -> Push origin 하세요.");
} catch (error) {
  console.error("패치 실패:", error.message);
  process.exit(1);
}