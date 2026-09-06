const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ========================================
   phones.json 읽기
======================================== */

const phonesFile = path.join(__dirname, "phones.json");

function getPhones() {
  try {
    const data = fs.readFileSync(phonesFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("phones.json 읽기 오류:", error.message);
    return [];
  }
}


/* ========================================
   기본 함수
======================================== */

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/-/g, "")
    .replace(/_/g, "");
}


function findPhone(searchText) {
  const phones = getPhones();

  const keyword = normalize(searchText);

  return phones.find((phone) => {

    const names = [
      phone.name,
      ...(phone.aliases || [])
    ];

    return names.some((name) => {
      const normalizedName = normalize(name);

      return (
        normalizedName.includes(keyword) ||
        keyword.includes(normalizedName)
      );
    });

  });
}


function won(price) {

  if (price === null || price === undefined) {
    return null;
  }

  return Math.round(price);
}


/* ========================================
   매물 필터
======================================== */

function filterListings(phone, query) {

  let listings = phone.listings || [];

  const {
    platform,
    storage,
    min,
    max,
    sort
  } = query;


  if (platform && platform !== "all") {

    listings = listings.filter((item) =>
      item.platform === platform
    );

  }


  if (storage && storage !== "all") {

    listings = listings.filter((item) =>
      Number(item.storage) === Number(storage)
    );

  }


  if (min) {

    listings = listings.filter((item) =>
      item.price >= Number(min)
    );

  }


  if (max) {

    listings = listings.filter((item) =>
      item.price <= Number(max)
    );

  }


  listings = [...listings];


  if (sort === "high") {

    listings.sort((a, b) =>
      b.price - a.price
    );

  }

  else if (sort === "new") {

    listings.sort((a, b) =>
      (a.minutes || 0) - (b.minutes || 0)
    );

  }

  else {

    listings.sort((a, b) =>
      a.price - b.price
    );

  }


  return listings;
}


/* ========================================
   시세 계산
======================================== */

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


  const prices = listings.map((item) =>
    Number(item.price)
  );


  const min = Math.min(...prices);

  const max = Math.max(...prices);

  const average =
    prices.reduce((sum, price) =>
      sum + price, 0
    ) / prices.length;


  const spread =
    average === 0
      ? 0
      : (max - min) / average;


  const cheapCount =
    prices.filter((price) =>
      price <= average * 0.9
    ).length;


  let buyScore =
    70 +
    cheapCount * 4 -
    spread * 15;


  buyScore = Math.round(
    Math.max(
      0,
      Math.min(100, buyScore)
    )
  );


  return {

    count: listings.length,

    min: won(min),

    average: won(average),

    max: won(max),

    buyScore

  };
}


/* ========================================
   구매점수 설명
======================================== */

function getBuyText(score) {

  if (score >= 70) {

    return {
      status: "good",
      title: "구매하기 좋은 편",
      text: "현재 시세 기준으로 비교적 괜찮은 가격의 매물이 있습니다."
    };

  }


  if (score >= 40) {

    return {
      status: "normal",
      title: "조금 더 비교",
      text: "가격 차이가 있으므로 여러 매물을 더 비교해보는 것이 좋습니다."
    };

  }


  return {

    status: "bad",
    title: "구매 비추천",
    text: "현재 가격대에서는 구매를 서두르지 않는 편이 좋습니다."
  };

}


/* ========================================
   서버 상태
======================================== */

app.get("/api/health", (req, res) => {

  res.json({

    ok: true,

    message: "시세봄 서버 정상 작동"

  });

});


/* ========================================
   모든 스마트폰 목록
======================================== */

app.get("/api/phones", (req, res) => {

  const phones = getPhones();

  res.json(phones);

});


/* ========================================
   스마트폰 검색

   예:
   /api/search?q=아이폰15
======================================== */

app.get("/api/search", (req, res) => {

  const searchText = req.query.q;

  if (!searchText) {

    return res.status(400).json({

      error: "검색어가 필요합니다."

    });

  }


  const phone = findPhone(searchText);


  if (!phone) {

    return res.status(404).json({

      error: "등록되지 않은 스마트폰입니다."

    });

  }


  res.json(phone);

});


/* ========================================
   ID로 스마트폰 정보 가져오기

   예:
   /api/phones/iphone15
======================================== */

app.get("/api/phones/:id", (req, res) => {

  const phones = getPhones();


  const phone = phones.find((item) =>
    item.id === req.params.id
  );


  if (!phone) {

    return res.status(404).json({

      error: "제품을 찾을 수 없습니다."

    });

  }


  res.json(phone);

});


/* ========================================
   특정 제품 매물

   예:
   /api/listings/iphone15

   필터:
   ?storage=256
   ?platform=당근
   ?min=300000
   ?max=700000
   ?sort=cheap
======================================== */

app.get("/api/listings/:id", (req, res) => {

  const phones = getPhones();


  const phone = phones.find((item) =>
    item.id === req.params.id
  );


  if (!phone) {

    return res.status(404).json({

      error: "제품을 찾을 수 없습니다."

    });

  }


  const listings =
    filterListings(phone, req.query);


  res.json({

    phone: phone.name,

    count: listings.length,

    listings

  });

});


/* ========================================
   시세 분석

   예:
   /api/market/iphone15
======================================== */

app.get("/api/market/:id", (req, res) => {

  const phones = getPhones();


  const phone = phones.find((item) =>
    item.id === req.params.id
  );


  if (!phone) {

    return res.status(404).json({

      error: "제품을 찾을 수 없습니다."

    });

  }


  const listings =
    filterListings(phone, req.query);


  const market =
    calculateMarket(listings);


  const judgement =
    getBuyText(market.buyScore);


  res.json({

    phone: phone.name,

    market,

    judgement

  });

});


/* ========================================
   제품 비교

   예:
   /api/compare?a=iphone15&b=galaxy-s24
======================================== */

app.get("/api/compare", (req, res) => {

  const {
    a,
    b
  } = req.query;


  const phones = getPhones();


  const phoneA =
    phones.find((phone) =>
      phone.id === a
    );


  const phoneB =
    phones.find((phone) =>
      phone.id === b
    );


  if (!phoneA || !phoneB) {

    return res.status(404).json({

      error: "비교할 제품을 찾을 수 없습니다."

    });

  }


  res.json({

    phoneA: {

      id: phoneA.id,

      name: phoneA.name,

      scores: phoneA.scores,

      launchPrices: phoneA.launchPrices

    },


    phoneB: {

      id: phoneB.id,

      name: phoneB.name,

      scores: phoneB.scores,

      launchPrices: phoneB.launchPrices

    }

  });

});


/* ========================================
   AI 구매판단 자리

   지금은 규칙 기반
   나중에 OpenAI API 연결
======================================== */

app.post("/api/ai/judge", (req, res) => {

  const {
    phoneId,
    storage
  } = req.body;


  const phones = getPhones();


  const phone =
    phones.find((item) =>
      item.id === phoneId
    );


  if (!phone) {

    return res.status(404).json({

      error: "제품을 찾을 수 없습니다."

    });

  }


  const listings =
    filterListings(phone, {

      storage:
        storage || "all"

    });


  const market =
    calculateMarket(listings);


  const judgement =
    getBuyText(market.buyScore);


  res.json({

    ai: false,

    mode: "temporary",

    phone: phone.name,

    market,

    judgement,

    message:
      "현재는 시세봄 계산식으로 판단하고 있습니다. 나중에 AI API가 연결되면 이 부분을 AI 설명으로 교체합니다."

  });

});


/* ========================================
   존재하지 않는 API
======================================== */

app.use((req, res) => {

  res.status(404).json({

    error: "존재하지 않는 API입니다."

  });

});


/* ========================================
   서버 오류
======================================== */

app.use((error, req, res, next) => {

  console.error(error);


  res.status(500).json({

    error: "서버 오류가 발생했습니다."

  });

});


/* ========================================
   서버 실행
======================================== */

app.listen(PORT, () => {

  console.log("");

  console.log("================================");

  console.log("🌱 시세봄 서버 실행 완료");

  console.log(`http://localhost:${PORT}`);

  console.log("================================");

  console.log("");

});