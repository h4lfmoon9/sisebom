const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const phonesFile = path.join(__dirname, "phones.json");

app.use(cors());
app.use(express.json());

function getPhones() {
  try {
    return JSON.parse(fs.readFileSync(phonesFile, "utf-8"));
  } catch (error) {
    console.error("phones.json 읽기 오류:", error.message);
    return [];
  }
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/gb/g, "")
    .replace(/기가/g, "")
    .replace(/[\s\-_]/g, "");
}

function removeStorage(text) {
  return String(text || "")
    .replace(/(?:^|\s)(64|128|256|512|1024)\s*(?:gb|기가)?(?:\s|$)/gi, " ")
    .trim();
}

function findPhone(searchText) {
  const keyword = normalize(removeStorage(searchText));
  if (!keyword) return null;
  const phones = getPhones();

  let phone = phones.find((p) => [p.name, ...(p.aliases || [])].some((n) => normalize(n) === keyword));
  if (phone) return phone;

  return phones.find((p) => [p.name, ...(p.aliases || [])].some((n) => {
    const x = normalize(n);
    return x.includes(keyword) || keyword.includes(x);
  })) || null;
}

function filterListings(phone, query = {}) {
  let items = [...(phone.listings || [])];
  const { platform, storage, min, max, sort } = query;

  if (platform && platform !== "all") items = items.filter((x) => x.platform === platform);
  if (storage && storage !== "all") items = items.filter((x) => Number(x.storage) === Number(storage));
  if (min !== undefined && min !== "") items = items.filter((x) => Number(x.price) >= Number(min));
  if (max !== undefined && max !== "") items = items.filter((x) => Number(x.price) <= Number(max));

  if (sort === "high") items.sort((a,b) => Number(b.price)-Number(a.price));
  else if (sort === "new") items.sort((a,b) => Number(a.minutes || 0)-Number(b.minutes || 0));
  else items.sort((a,b) => Number(a.price)-Number(b.price));

  return items;
}

function median(numbers) {
  if (!numbers.length) return 0;
  const s = [...numbers].sort((a,b) => a-b);
  const m = Math.floor(s.length/2);
  return s.length % 2 ? s[m] : (s[m-1]+s[m])/2;
}

function calculateMarket(items) {
  if (!items.length) return { count:0, min:null, average:null, max:null, buyScore:0 };
  const prices = items.map((x) => Number(x.price));
  const min = Math.min(...prices), max = Math.max(...prices);
  const average = prices.reduce((a,b) => a+b,0)/prices.length;
  const med = median(prices);
  const cheapCount = prices.filter((p) => p <= med*0.95).length;
  const spread = average === 0 ? 0 : (max-min)/average;
  let buyScore = 72 + Math.min(16, cheapCount*3) - Math.min(22, spread*18);
  buyScore = Math.max(0, Math.min(100, Math.round(buyScore)));
  return { count:items.length, min:Math.round(min), average:Math.round(average), max:Math.round(max), buyScore };
}

function getBuyText(score) {
  if (score >= 70) return { status:"good", title:"구매하기 좋은 편", text:"현재 시세 기준으로 비교적 괜찮은 가격의 매물이 있습니다." };
  if (score >= 40) return { status:"normal", title:"조금 더 비교", text:"가격 차이가 있으므로 여러 매물을 더 비교해보는 것이 좋습니다." };
  return { status:"bad", title:"구매 비추천", text:"현재 가격대에서는 구매를 서두르지 않는 편이 좋습니다." };
}

app.get("/", (req,res) => res.json({ name:"시세봄 API", ok:true }));
app.get("/api/health", (req,res) => res.json({ ok:true, message:"시세봄 서버 정상 작동" }));
app.get("/api/phones", (req,res) => res.json(getPhones()));

app.get("/api/search", (req,res) => {
  if (!req.query.q) return res.status(400).json({ error:"검색어가 필요합니다." });
  const phone = findPhone(req.query.q);
  if (!phone) return res.status(404).json({ error:"등록되지 않은 스마트폰입니다." });
  res.json(phone);
});

app.get("/api/phones/:id", (req,res) => {
  const phone = getPhones().find((x) => x.id === req.params.id);
  if (!phone) return res.status(404).json({ error:"제품을 찾을 수 없습니다." });
  res.json(phone);
});

app.get("/api/listings/:id", (req,res) => {
  const phone = getPhones().find((x) => x.id === req.params.id);
  if (!phone) return res.status(404).json({ error:"제품을 찾을 수 없습니다." });
  const listings = filterListings(phone, req.query);
  res.json({ phone:phone.name, count:listings.length, listings });
});

app.get("/api/market/:id", (req,res) => {
  const phone = getPhones().find((x) => x.id === req.params.id);
  if (!phone) return res.status(404).json({ error:"제품을 찾을 수 없습니다." });
  const listings = filterListings(phone, req.query);
  const market = calculateMarket(listings);
  res.json({ phone:phone.name, market, judgement:getBuyText(market.buyScore) });
});

app.get("/api/compare", (req,res) => {
  const phones = getPhones();
  const phoneA = phones.find((x) => x.id === req.query.a);
  const phoneB = phones.find((x) => x.id === req.query.b);
  if (!phoneA || !phoneB) return res.status(404).json({ error:"비교할 제품을 찾을 수 없습니다." });
  res.json({ phoneA, phoneB });
});

app.post("/api/ai/judge", (req,res) => {
  const phone = getPhones().find((x) => x.id === req.body?.phoneId);
  if (!phone) return res.status(404).json({ error:"제품을 찾을 수 없습니다." });
  const listings = filterListings(phone, { storage:req.body?.storage || "all" });
  const market = calculateMarket(listings);
  res.json({ ai:false, mode:"rule-based", phone:phone.name, market, judgement:getBuyText(market.buyScore), message:"현재는 규칙 기반 판단입니다. 실제 AI 연결 시 이 응답을 AI 설명으로 교체할 수 있습니다." });
});

app.use((req,res) => res.status(404).json({ error:"존재하지 않는 API입니다." }));
app.use((error,req,res,next) => { console.error(error); res.status(500).json({ error:"서버 오류가 발생했습니다." }); });

app.listen(PORT, () => {
  console.log("================================");
  console.log("🌱 시세봄 서버 실행 완료");
  console.log(`http://localhost:${PORT}`);
  console.log("================================");
});
