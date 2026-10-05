'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const serverPath = path.join(ROOT, 'server', 'server.js');
const indexPath = path.join(ROOT, 'index.html');
const stylePath = path.join(ROOT, 'style.css');

function fail(message) {
  console.error('\n[시세봄 29단계] ' + message);
  process.exit(1);
}

if (!fs.existsSync(serverPath) || !fs.existsSync(indexPath) || !fs.existsSync(stylePath)) {
  fail('sisebom 저장소 루트에서 실행해 주세요.');
}

let server = fs.readFileSync(serverPath, 'utf8');
let index = fs.readFileSync(indexPath, 'utf8');
let style = fs.readFileSync(stylePath, 'utf8');

// ---- server.js ----
if (!server.includes('STEP29_MARKET_ANALYSIS')) {
  const catalogImport = 'const { getStaticCatalog, getLiveCatalog, getCatalogStatus } = require("./catalog"); // STEP28_CATALOG';
  if (!server.includes(catalogImport)) fail('server.js에서 28단계 catalog import를 찾지 못했습니다.');

  server = server.replace(
    catalogImport,
    catalogImport + '\nconst { analyzeMarket } = require("./marketAnalysis"); // STEP29_MARKET_ANALYSIS'
  );

  // /api/phones?live=1 은 공식 카탈로그 스캔을 뒤에서 시작하고 즉시 현재 DB를 반환.
  server = server.replace(
    'const force = String(req.query.refresh || "") === "1";',
    'const force = String(req.query.refresh || "") === "1";\n  const wait = String(req.query.wait || "") === "1";'
  );
  server = server.replace(
    'const phones = await getLiveCatalog({ force });',
    'const phones = await getLiveCatalog({ force, wait });'
  );

  // 수집기의 진행상황을 프론트에 전달.
  const providerOld = `providerStatus[name] = {
        ok: true,
        count: data.listings?.length || 0,
        sourceUrl: data.sourceUrl,
        excluded: data.excluded || {}
      };`;

  const providerNew = `providerStatus[name] = {
        ok: true,
        count: data.listings?.length || 0,
        sourceUrl: data.sourceUrl,
        excluded: data.excluded || {},
        collecting: Boolean(data.collecting),
        collectionStatus: data.collectionStatus || (data.collecting ? "running" : "done"),
        candidateCount: Number(data.candidateCount) || 0,
        targetCount: Number(data.targetCount) || 0,
        queriesTried: Array.isArray(data.queriesTried) ? data.queriesTried : []
      };`;

  if (!server.includes(providerOld)) fail('server.js providerStatus 블록을 찾지 못했습니다.');
  server = server.replace(providerOld, providerNew);

  const payloadNeedle = `const payload = {
    query: q,`;

  if (!server.includes(payloadNeedle)) fail('server.js combined payload 위치를 찾지 못했습니다.');

  server = server.replace(
    payloadNeedle,
    `const analysisPhone = findPhone(q);
  const analysis = analyzeMarket(quality.listings, { phone: analysisPhone, query: q });

  const payload = {
    query: q,`
  );

  server = server.replace(
    `count: quality.listings.length,
    listings: quality.listings,`,
    `count: quality.listings.length,
    listings: quality.listings,
    analysis,`
  );

  // 기존 rule-based judge를 실제 라이브 매물도 받을 수 있는 분석 API로 교체.
  const aiRoute = /app\.post\("\/api\/ai\/judge",[\s\S]*?\n\}\);\n\napp\.use\(\(req, res\) =>/;
  if (!aiRoute.test(server)) fail('기존 /api/ai/judge 라우트를 찾지 못했습니다.');

  server = server.replace(aiRoute, `app.post("/api/ai/judge", (req, res) => {
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

app.use((req, res) =>`);

  // Health 정보에 분석 엔진 표시.
  server = server.replace(
    'diagnostics: true\n}));',
    'diagnostics: true,\n  marketAnalysis: "sisebom-market-v2"\n}));',
    1
  );
}

// ---- index.html ----
index = index.replace(
  'placeholder="예: 아이폰 15 256"',
  'placeholder="예: 아이폰 15 256 / 갤럭시 S25 울트라"'
);

index = index.replace(
  /<div class="quick-row">[\s\S]*?<\/div>\n<\/section>/,
  `<div class="quick-row"><span>빠른 검색</span><button data-quick="아이폰 15">iPhone 15</button><button data-quick="갤럭시 S25 울트라">Galaxy S25 Ultra</button><button data-quick="Redmi Note 14 Pro">Redmi Note 14 Pro</button><button data-quick="Motorola Razr 60 Ultra">Motorola Razr 60 Ultra</button></div>
</section>`
);

index = index.replace(
  '<div class="panel-head"><div><h3>AI 구매 판단</h3><p>가격 데이터를 먼저 계산한 뒤 쉽게 설명합니다.</p></div><span class="beta">BETA</span></div>',
  '<div class="panel-head"><div><h3>AI 구매 판단</h3><p>실제 매물의 중앙값·분포·표본 수를 종합해 자동 판단합니다.</p></div><div class="analysis-badges"><span id="analysisConfidence" class="confidence low">분석 중</span><span class="beta">BETA</span></div></div>'
);

index = index.replace('<h2>iPhone 비교</h2><p class="muted">현재 모델과 다른 iPhone을 빠르게 비교합니다.</p>', '<h2>스마트폰 비교</h2><p class="muted">현재 모델과 등록된 다른 스마트폰을 빠르게 비교합니다.</p>');

index = index.replace(
  '<section class="section models-section"><div class="section-head"><div><p class="eyebrow">IPHONE DATABASE</p><h2>등록된 iPhone 모델</h2><p class="muted"><span id="modelCount">0</span>개 모델 등록</p></div></div><div id="modelGrid" class="model-grid"></div></section>',
  '<section class="section models-section"><div class="section-head"><div><p class="eyebrow">PHONE DATABASE</p><h2>등록된 스마트폰 모델</h2><p class="muted"><span id="modelCount">0</span>개 모델 표시</p></div></div><div id="brandFilters" class="brand-filters chips"></div><div id="modelGrid" class="model-grid"></div></section>'
);

// ---- style.css ----
if (!style.includes('STEP29_FINAL_UI')) {
  style += `
/* STEP29_FINAL_UI */
.analysis-badges{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.confidence{padding:7px 10px;border-radius:999px;font-size:12px;font-weight:800}
.confidence.high{background:#e8f7ef;color:#087642}
.confidence.medium{background:#fff5d8;color:#8a5a00}
.confidence.low{background:#f3f4f6;color:#6b7280}
.brand-filters{margin:-4px 0 16px}
.suggestions button{display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px}
.suggestions button b{font-size:13px}
.suggestions button span{font-size:11px;color:var(--muted)}
.suggestion-empty{padding:14px 16px;color:var(--muted);font-size:13px}
.listing-state{grid-column:1/-1;background:#fff;border:1px solid var(--line);border-radius:18px;padding:28px;display:grid;gap:7px;text-align:center;color:var(--muted)}
.listing-state b{color:var(--text)}
.listing-state.error{background:#fff7f7;border-color:#fecaca}
.model-image-placeholder{width:100%;height:150px;display:grid;place-items:center;background:linear-gradient(145deg,#f8faf9,#eef3f0);border-radius:12px;color:var(--muted);font-size:12px}
@media(max-width:640px){
  .analysis-badges{justify-content:flex-start}
  .section-head{align-items:flex-start}
}
`;
}

fs.writeFileSync(serverPath, server, 'utf8');
fs.writeFileSync(indexPath, index, 'utf8');
fs.writeFileSync(stylePath, style, 'utf8');

console.log('');
console.log('✅ 시세봄 29단계 적용 완료');
console.log('- 서버 시세 분석 엔진 연결');
console.log('- 심층수집 진행상태 전달');
console.log('- 공식 신제품 스캔 비동기화');
console.log('- 멀티브랜드 UI 최종 통합');
console.log('');
console.log('GitHub Desktop에서 Commit / Push 하세요.');
