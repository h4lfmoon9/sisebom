const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");

function getPhones() {
  try {
    const files = fs
      .readdirSync(DATA_DIR)
      .filter((name) => name.endsWith(".json"))
      .sort();

    const phones = [];

    for (const file of files) {
      const fullPath = path.join(DATA_DIR, file);
      const parsed = JSON.parse(
        fs.readFileSync(fullPath, "utf-8")
      );

      if (Array.isArray(parsed)) {
        phones.push(...parsed);
      }
    }

    return phones;
  } catch (error) {
    console.error("제품 DB 읽기 오류:", error.message);
    return [];
  }
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/gb/g, "")
    .replace(/기가/g, "")
    .replace(/[+\s\-_]/g, "");
}

function removeStorage(text) {
  return String(text || "")
    .replace(
      /(?:^|\s)(64|128|256|512|1024|2048)\s*(?:gb|기가|tb)?(?:\s|$)/gi,
      " "
    )
    .trim();
}

function findPhone(searchText) {
  const phones = getPhones();
  const keyword = normalize(removeStorage(searchText));

  if (!keyword) return null;

  let phone = phones.find((item) => {
    const names = [item.name, ...(item.aliases || [])];
    return names.some((name) => normalize(name) === keyword);
  });

  if (phone) return phone;

  return (
    phones.find((item) => {
      const names = [item.name, ...(item.aliases || [])];

      return names.some((name) => {
        const normalized = normalize(name);
        return (
          normalized.includes(keyword) ||
          keyword.includes(normalized)
        );
      });
    }) || null
  );
}

function filterListings(phone, query = {}) {
  let listings = [...(phone.listings || [])];
  const { platform, storage, min, max, sort } = query;

  if (platform && platform !== "all") {
    listings = listings.filter(
      (item) => item.platform === platform
    );
  }

  if (storage && storage !== "all") {
    listings = listings.filter(
      (item) => Number(item.storage) === Number(storage)
    );
  }

  if (min !== undefined && min !== "") {
    listings = listings.filter(
      (item) => Number(item.price) >= Number(min)
    );
  }

  if (max !== undefined && max !== "") {
    listings = listings.filter(
      (item) => Number(item.price) <= Number(max)
    );
  }

  if (sort === "high") {
    listings.sort(
      (a, b) => Number(b.price) - Number(a.price)
    );
  } else if (sort === "new") {
    listings.sort(
      (a, b) =>
        Number(a.minutes || 0) - Number(b.minutes || 0)
    );
  } else {
    listings.sort(
      (a, b) => Number(a.price) - Number(b.price)
    );
  }

  return listings;
}

function median(numbers) {
  if (!numbers.length) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function calculateMarket(listings) {
  if (!listings.length) {
    return {
      count: 0,
      min: null,
      average: null,
      max: null,
      buyScore: 0
    };
  }

  const prices = listings.map((item) => Number(item.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const average =
    prices.reduce((sum, price) => sum + price, 0) /
    prices.length;

  const med = median(prices);

  const cheapCount = prices.filter(
    (price) => price <= med * 0.95
  ).length;

  const spread =
    average === 0 ? 0 : (max - min) / average;

  let buyScore =
    72 +
    Math.min(16, cheapCount * 3) -
    Math.min(22, spread * 18);

  buyScore = Math.max(
    0,
    Math.min(100, Math.round(buyScore))
  );

  return {
    count: listings.length,
    min: Math.round(min),
    average: Math.round(average),
    max: Math.round(max),
    buyScore
  };
}

function getBuyText(score) {
  if (score >= 70) {
    return {
      status: "good",
      title: "구매하기 좋은 편",
      text:
        "현재 시세 기준으로 비교적 괜찮은 가격의 매물이 있습니다."
    };
  }

  if (score >= 40) {
    return {
      status: "normal",
      title: "조금 더 비교",
      text:
        "가격 차이가 있으므로 여러 매물을 더 비교해보는 것이 좋습니다."
    };
  }

  return {
    status: "bad",
    title: "구매 비추천",
    text:
      "현재 가격대에서는 구매를 서두르지 않는 편이 좋습니다."
  };
}

app.get("/", (req, res) => {
  res.json({
    name: "시세봄 API",
    ok: true,
    products: getPhones().length
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "시세봄 서버 정상 작동",
    products: getPhones().length
  });
});

app.get("/api/phones", (req, res) => {
  res.json(getPhones());
});

app.get("/api/search", (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({
      error: "검색어가 필요합니다."
    });
  }

  const phone = findPhone(query);

  if (!phone) {
    return res.status(404).json({
      error: "등록되지 않은 스마트폰입니다."
    });
  }

  res.json(phone);
});

app.get("/api/phones/:id", (req, res) => {
  const phone = getPhones().find(
    (item) => item.id === req.params.id
  );

  if (!phone) {
    return res.status(404).json({
      error: "제품을 찾을 수 없습니다."
    });
  }

  res.json(phone);
});

app.get("/api/listings/:id", (req, res) => {
  const phone = getPhones().find(
    (item) => item.id === req.params.id
  );

  if (!phone) {
    return res.status(404).json({
      error: "제품을 찾을 수 없습니다."
    });
  }

  const listings = filterListings(phone, req.query);

  res.json({
    phone: phone.name,
    count: listings.length,
    listings
  });
});

app.get("/api/market/:id", (req, res) => {
  const phone = getPhones().find(
    (item) => item.id === req.params.id
  );

  if (!phone) {
    return res.status(404).json({
      error: "제품을 찾을 수 없습니다."
    });
  }

  const listings = filterListings(phone, req.query);
  const market = calculateMarket(listings);

  res.json({
    phone: phone.name,
    market,
    judgement: getBuyText(market.buyScore)
  });
});

app.get("/api/compare", (req, res) => {
  const { a, b } = req.query;
  const phones = getPhones();

  const phoneA = phones.find((phone) => phone.id === a);
  const phoneB = phones.find((phone) => phone.id === b);

  if (!phoneA || !phoneB) {
    return res.status(404).json({
      error: "비교할 제품을 찾을 수 없습니다."
    });
  }

  res.json({ phoneA, phoneB });
});

app.post("/api/ai/judge", (req, res) => {
  const {
    phoneId,
    storage = "all"
  } = req.body || {};

  const phone = getPhones().find(
    (item) => item.id === phoneId
  );

  if (!phone) {
    return res.status(404).json({
      error: "제품을 찾을 수 없습니다."
    });
  }

  const listings = filterListings(phone, { storage });
  const market = calculateMarket(listings);

  res.json({
    ai: false,
    mode: "rule-based",
    phone: phone.name,
    market,
    judgement: getBuyText(market.buyScore),
    message:
      "현재는 시세봄 계산식으로 판단합니다."
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "존재하지 않는 API입니다."
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: "서버 오류가 발생했습니다."
  });
});

app.listen(PORT, () => {
  console.log("");
  console.log("================================");
  console.log("🌱 시세봄 서버 실행 완료");
  console.log(`제품 수: ${getPhones().length}`);
  console.log(`http://localhost:${PORT}`);
  console.log("================================");
  console.log("");
});
