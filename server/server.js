const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { fetchJoongnaListings } = require("./providers/joongna");
const { fetchBunjangListings } = require("./providers/bunjang");
const { fetchDaangnListings } = require("./providers/daangn");
const { filterAndDedupeListings } = require("./listingQuality");
const { makeKey, getFresh, getStale, setCache, withTimeout } = require("./liveCache");
const { diagnoseOne, diagnosePublicSearch } = require("./liveDiagnostics");
const { getStaticCatalog, getLiveCatalog, getCatalogStatus } = require("./catalog"); // STEP28_CATALOG
const { analyzeMarket } = require("./marketAnalysis"); // STEP29_MARKET_ANALYSIS
const { fromProviderData, fromProviderError } = require("./providerHealth"); // STEP30_FINAL_RELEASE

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");

app.use(cors());
app.use(express.json());

function getPhones() {
  return getStaticCatalog();
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/iphone/g, "아이폰")
    .replace(/galaxy/g, "갤럭시")
    .replace(/xiaomi/g, "샤오미")
    .replace(/redmi/g, "레드미")
    .replace(/poco/g, "포코")
    .replace(/motorola/g, "모토로라")
    .replace(/iphone/g, "아이폰")
    .replace(/galaxy/g, "갤럭시")
    .replace(/xiaomi/g, "샤오미")
    .replace(/redmi/g, "레드미")
    .replace(/poco/g, "포코")
    .replace(/motorola/g, "모토로라")
    .replace(/iphone/g, "아이폰")
    .replace(/galaxy/g, "갤럭시")
    .replace(/xiaomi/g, "샤오미")
    .replace(/redmi/g, "레드미")
    .replace(/poco/g, "포코")
    .replace(/motorola/g, "모토로라")
    .replace(/iphone/g, "아이폰")
    .replace(/galaxy/g, "갤럭시")
    .replace(/xiaomi/g, "샤오미")
    .replace(/redmi/g, "레드미")
    .replace(/poco/g, "포코")
    .replace(/motorola/g, "모토로라")
    .replace(/프로\s*맥스/g, "promax")
    .replace(/프로/g, "pro")
    .replace(/플러스/g, "plus")
    .replace(/미니/g, "mini")
    .replace(/에어/g, "air")
    .replace(/에스\s*이/g, "se")
    .replace(/gb/g, "")
    .replace(/기가/g, "")
    .replace(/[+\s\-_]/g, "");
}

function removeStorage(text) {
  return String(text || "")
    .replace(/(?:^|\s)(64|128|256|512|1024|2048)\s*(?:gb|기가|tb)?(?:\s|$)/gi, " ")
    .trim();
}

function findPhone(searchText) {
  const phones = getPhones();
  let keyword = normalize(removeStorage(searchText));
  if (["iphone9", "아이폰9"].includes(keyword)) keyword = normalize("iPhone X");
  if (!keyword) return null;

  let phone = phones.find((item) => [item.name, ...(item.aliases || [])].some((name) => normalize(name) === keyword));
  if (phone) return phone;

  return phones.find((item) => [item.name, ...(item.aliases || [])].some((name) => {
    const normalized = normalize(name);
    return normalized.includes(keyword) || keyword.includes(normalized);
  })) || null;
}

function filterListings(phone, query = {}) {
  let listings = [...(phone.listings || [])];
  const { platform, storage, min, max, sort } = query;
  if (platform && platform !== "all") listings = listings.filter((item) => item.platform === platform);
  if (storage && storage !== "all") listings = listings.filter((item) => Number(item.storage) === Number(storage));
  if (min !== undefined && min !== "") listings = listings.filter((item) => Number(item.price) >= Number(min));
  if (max !== undefined && max !== "") listings = listings.filter((item) => Number(item.price) <= Number(max));
  if (sort === "high") listings.sort((a, b) => Number(b.price) - Number(a.price));
  else if (sort === "new") listings.sort((a, b) => Number(a.minutes || 0) - Number(b.minutes || 0));
  else listings.sort((a, b) => Number(a.price) - Number(b.price));
  return listings;
}

function median(numbers) {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function calculateMarket(listings) {
  if (!listings.length) return { count: 0, min: null, average: null, max: null, buyScore: 0 };
  const prices = listings.map((item) => Number(item.price)).filter(Number.isFinite);
  if (!prices.length) return { count: 0, min: null, average: null, max: null, buyScore: 0 };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const med = median(prices);
  const cheapCount = prices.filter((price) => price <= med * 0.95).length;
  const spread = average === 0 ? 0 : (max - min) / average;
  let buyScore = 72 + Math.min(16, cheapCount * 3) - Math.min(22, spread * 18);
  buyScore = Math.max(0, Math.min(100, Math.round(buyScore)));
  return { count: prices.length, min: Math.round(min), average: Math.round(average), max: Math.round(max), buyScore };
}

function getBuyText(score) {
  if (score >= 70) return { status: "good", title: "구매하기 좋은 편", text: "현재 시세 기준으로 비교적 괜찮은 가격의 매물이 있습니다." };
  if (score >= 40) return { status: "normal", title: "조금 더 비교", text: "가격 차이가 있으므로 여러 매물을 더 비교해보는 것이 좋습니다." };
  return { status: "bad", title: "구매 비추천", text: "현재 가격대에서는 구매를 서두르지 않는 편이 좋습니다." };
}

app.get("/", (req, res) => res.json({ name: "시세봄 API", ok: true, products: getPhones().length }));
app.get("/api/health", (req, res) => res.json({
  ok: true,
  message: "시세봄 서버 정상 작동",
  products: getPhones().length,
  liveProviders: ["당근", "번개장터", "중고나라"],
  liveCombined: true,
  diagnostics: true,
  marketAnalysis: "sisebom-market-v2",
  release: "final-v6"
}));

app.get("/api/live/status", (req, res) => res.json({
  ok: true,
  providers: {
    "당근": { loaded: typeof fetchDaangnListings === "function" },
    "번개장터": { loaded: typeof fetchBunjangListings === "function" },
    "중고나라": { loaded: typeof fetchJoongnaListings === "function" }
  },
  cache: { ttlMs: 90000, staleMs: 600000 },
  availableOnly: true,
  exactModelOnly: true,
  diagnostics: true
}));

app.get("/api/live/diagnose", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "검색어가 필요합니다." });
  const region = String(req.query.in || "").trim();
  try {
    res.set("Cache-Control", "no-store");
    return res.json(await diagnosePublicSearch(q, { region }));
  } catch (error) {
    return res.status(500).json({ error: "수집 진단 중 오류가 발생했습니다.", detail: error.message });
  }
});

app.get("/api/live/diagnose/:platform", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "검색어가 필요합니다." });
  const aliases = {
    daangn: "daangn", "당근": "daangn",
    bunjang: "bunjang", "번개장터": "bunjang",
    joongna: "joongna", "중고나라": "joongna"
  };
  const platform = aliases[String(req.params.platform || "").toLowerCase()] || aliases[req.params.platform];
  if (!platform) return res.status(400).json({ error: "지원 플랫폼: daangn, bunjang, joongna" });
  const region = String(req.query.in || "").trim();
  res.set("Cache-Control", "no-store");
  return res.json(await diagnoseOne(platform, q, { region }));
});

app.get("/api/phones", async (req, res) => {
  const live = String(req.query.live || "") === "1";
  const force = String(req.query.refresh || "") === "1";
  const wait = String(req.query.wait || "") === "1";

  if (!live) {
    res.set("Cache-Control", "public, max-age=300");
    return res.json(getPhones());
  }

  try {
    const phones = await getLiveCatalog({ force, wait });
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    return res.json(phones);
  } catch (error) {
    console.error("자동 제품 카탈로그 갱신 오류:", error.message);
    return res.json(getPhones());
  }
});

app.get("/api/catalog/status", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(getCatalogStatus());
});

app.get("/api/search", (req, res) => {
  if (!req.query.q) return res.status(400).json({ error: "검색어가 필요합니다." });
  const phone = findPhone(req.query.q);
  if (!phone) return res.status(404).json({ error: "등록되지 않은 스마트폰입니다." });
  res.json(phone);
});

app.get("/api/live/joongna", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "검색어가 필요합니다." });
  try {
    const result = await fetchJoongnaListings(q, { limit: req.query.limit, force: String(req.query.refresh || "") === "1" });
    res.set("Cache-Control", "public, max-age=30");
    return res.json(result);
  } catch (error) {
    console.error("중고나라 수집 오류:", error.message);
    return res.status(error.statusCode || 502).json({
      error: "중고나라 공개 검색 결과를 불러오지 못했습니다.",
      detail: error.message
    });
  }
});

app.get("/api/live/bunjang", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "검색어가 필요합니다." });
  try {
    const result = await fetchBunjangListings(q, { limit: req.query.limit, force: String(req.query.refresh || "") === "1" });
    res.set("Cache-Control", "public, max-age=30");
    return res.json(result);
  } catch (error) {
    console.error("번개장터 수집 오류:", error.message);
    return res.status(error.statusCode || 502).json({
      error: "번개장터 공개 검색 결과를 불러오지 못했습니다.",
      detail: error.message
    });
  }
});

app.get("/api/live/daangn", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "검색어가 필요합니다." });
  try {
    const result = await fetchDaangnListings(q, { limit: req.query.limit, region: req.query.in, force: String(req.query.refresh || "") === "1" });
    res.set("Cache-Control", "public, max-age=30");
    return res.json(result);
  } catch (error) {
    console.error("당근 수집 오류:", error.message);
    return res.status(error.statusCode || 502).json({
      error: "당근 공개 검색 결과를 불러오지 못했습니다.",
      detail: error.message
    });
  }
});

app.get("/api/live/combined", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "검색어가 필요합니다." });

  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 30));
  const region = String(req.query.in || "").trim();
  const forceRefresh = String(req.query.refresh || "") === "1";
  const key = makeKey(q, region, limit);

  if (!forceRefresh) {
    const cached = getFresh(key);
    if (cached) {
      res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      return res.json({ ...cached, cache: "hit" });
    }
  }

  const providers = [
    ["당근", () => withTimeout(fetchDaangnListings(q, { limit, region, force: forceRefresh }), 9000, "당근")],
    ["중고나라", () => withTimeout(fetchJoongnaListings(q, { limit, force: forceRefresh }), 9000, "중고나라")],
    ["번개장터", () => withTimeout(fetchBunjangListings(q, { limit, force: forceRefresh }), 9000, "번개장터")]
  ];

  const settled = await Promise.allSettled(providers.map(([, run]) => run()));
  const listings = [];
  const providerStatus = {};
  const seen = new Set();

  settled.forEach((result, index) => {
    const name = providers[index][0];
    if (result.status === "fulfilled") {
      const data = result.value || {};
      providerStatus[name] = fromProviderData(data);
      for (const item of data.listings || []) {
        const itemKey = item.url || `${item.source}:${item.id}`;
        if (!itemKey || seen.has(itemKey)) continue;
        seen.add(itemKey);
        listings.push(item);
      }
    } else {
      providerStatus[name] = fromProviderError(result.reason);
    }
  });

  if (!Object.values(providerStatus).some((x) => x.ok)) {
    const stale = getStale(key);
    if (stale) {
      res.set("Cache-Control", "no-cache");
      return res.json({
        ...stale,
        cache: "stale",
        stale: true,
        warning: "플랫폼 연결이 일시적으로 실패해 최근 정상 결과를 표시합니다.",
        providersNow: providerStatus
      });
    }
    return res.status(502).json({
      error: "실제 중고 매물을 불러오지 못했습니다.",
      providers: providerStatus,
      listings: []
    });
  }

  const quality = filterAndDedupeListings(listings, q);
  quality.listings.sort((a, b) => Number(a.minutes ?? 999999) - Number(b.minutes ?? 999999));

  const analysisPhone = findPhone(q);
  const analysis = analyzeMarket(quality.listings, { phone: analysisPhone, query: q });

  const payload = {
    query: q,
    fetchedAt: new Date().toISOString(),
    availableOnly: true,
    exactModelOnly: true,
    release: "final-v6",
    providers: providerStatus,
    excluded: quality.excluded,
    rawCount: listings.length,
    count: quality.listings.length,
    listings: quality.listings,
    analysis,
    cache: "miss",
    stale: false
  };
  setCache(key, payload);
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
  return res.json(payload);
});

app.get("/api/phones/:id", (req, res) => {
  const phone = getPhones().find((item) => item.id === req.params.id);
  if (!phone) return res.status(404).json({ error: "제품을 찾을 수 없습니다." });
  res.json(phone);
});

app.get("/api/listings/:id", (req, res) => {
  const phone = getPhones().find((item) => item.id === req.params.id);
  if (!phone) return res.status(404).json({ error: "제품을 찾을 수 없습니다." });
  const listings = filterListings(phone, req.query);
  res.json({ phone: phone.name, count: listings.length, listings });
});

app.get("/api/market/:id", (req, res) => {
  const phone = getPhones().find((item) => item.id === req.params.id);
  if (!phone) return res.status(404).json({ error: "제품을 찾을 수 없습니다." });
  const listings = filterListings(phone, req.query);
  const market = calculateMarket(listings);
  res.json({ phone: phone.name, market, judgement: getBuyText(market.buyScore) });
});

app.get("/api/compare", (req, res) => {
  const phones = getPhones();
  const phoneA = phones.find((phone) => phone.id === req.query.a);
  const phoneB = phones.find((phone) => phone.id === req.query.b);
  if (!phoneA || !phoneB) return res.status(404).json({ error: "비교할 제품을 찾을 수 없습니다." });
  res.json({ phoneA, phoneB });
});

app.post("/api/ai/judge", (req, res) => {
  const { phoneId, query = "", listings = [] } = req.body || {};
  const phone = getPhones().find((item) => item.id === phoneId) || findPhone(query);
  const safeListings = Array.isArray(listings) ? listings.slice(0, 500) : [];
  const analysis = analyzeMarket(safeListings, { phone, query: query || phone?.name || "" });

  res.json({
    ai: true,
    mode: "sisebom-market-v2",
    phone: phone?.name || query || null,
    analysis
  });
});

app.use((req, res) => res.status(404).json({ error: "존재하지 않는 API입니다." }));
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
});

app.listen(PORT, () => {
  console.log("================================");
  console.log("🌱 시세봄 서버 실행 완료");
  console.log(`제품 수: ${getPhones().length}`);
  console.log(`http://localhost:${PORT}`);
  console.log("================================");
});
