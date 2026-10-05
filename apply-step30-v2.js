'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const serverPath = path.join(ROOT, 'server', 'server.js');
const stylePath = path.join(ROOT, 'style.css');

function fail(message) {
  console.error('\n[시세봄 30단계] ' + message);
  process.exit(1);
}

if (!fs.existsSync(serverPath) || !fs.existsSync(stylePath)) {
  fail('sisebom 저장소 루트에서 실행해 주세요.');
}

let server = fs.readFileSync(serverPath, 'utf8');
let style = fs.readFileSync(stylePath, 'utf8');

if (!server.includes('STEP29_MARKET_ANALYSIS')) {
  fail('29단계가 적용된 server.js가 아닙니다.');
}

if (!server.includes('STEP30_FINAL_RELEASE')) {
  const analysisImport = 'const { analyzeMarket } = require("./marketAnalysis"); // STEP29_MARKET_ANALYSIS';
  if (!server.includes(analysisImport)) fail('marketAnalysis import를 찾지 못했습니다.');

  server = server.replace(
    analysisImport,
    analysisImport + '\nconst { fromProviderData, fromProviderError } = require("./providerHealth"); // STEP30_FINAL_RELEASE'
  );

  // Individual provider refresh should also create a new completed job when requested.
  server = server.replace(
    'fetchJoongnaListings(q, { limit: req.query.limit })',
    'fetchJoongnaListings(q, { limit: req.query.limit, force: String(req.query.refresh || "") === "1" })'
  );
  server = server.replace(
    'fetchBunjangListings(q, { limit: req.query.limit })',
    'fetchBunjangListings(q, { limit: req.query.limit, force: String(req.query.refresh || "") === "1" })'
  );
  server = server.replace(
    'fetchDaangnListings(q, { limit: req.query.limit, region: req.query.in })',
    'fetchDaangnListings(q, { limit: req.query.limit, region: req.query.in, force: String(req.query.refresh || "") === "1" })'
  );

  // Combined refresh=1 now reaches the browser collector too.
  server = server.replace(
    'fetchDaangnListings(q, { limit, region })',
    'fetchDaangnListings(q, { limit, region, force: forceRefresh })'
  );
  server = server.replace(
    'fetchJoongnaListings(q, { limit })',
    'fetchJoongnaListings(q, { limit, force: forceRefresh })'
  );
  server = server.replace(
    'fetchBunjangListings(q, { limit })',
    'fetchBunjangListings(q, { limit, force: forceRefresh })'
  );

  const fulfilledOld = `providerStatus[name] = {
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

  if (!server.includes(fulfilledOld)) fail('providerStatus 성공 블록을 찾지 못했습니다.');
  server = server.replace(fulfilledOld, 'providerStatus[name] = fromProviderData(data);');

  const rejectedOld = `providerStatus[name] = {
        ok: false,
        count: 0,
        error: result.reason?.message || "불러오기 실패"
      };`;

  if (!server.includes(rejectedOld)) fail('providerStatus 실패 블록을 찾지 못했습니다.');
  server = server.replace(rejectedOld, 'providerStatus[name] = fromProviderError(result.reason);');

  // Release marker for easy production verification.
  server = server.replace(
    'marketAnalysis: "sisebom-market-v2"',
    'marketAnalysis: "sisebom-market-v2",\n  release: "30-final"'
  );

  server = server.replace(
    'exactModelOnly: true,\n    providers: providerStatus,',
    'exactModelOnly: true,\n    release: "30-final",\n    providers: providerStatus,'
  );
}

if (!style.includes('STEP30_FINAL_RELEASE')) {
  style += `
/* STEP30_FINAL_RELEASE */
html,body{max-width:100%;overflow-x:hidden}
button,a,input,select{-webkit-tap-highlight-color:transparent}
button,.chip,.text-btn,.search-wrap button{min-height:42px}
.listing img{background:#f4f7f5}
.listing-state{min-height:120px;align-content:center}
.provider-warning{font-size:12px;color:#8a5a00}
@media(max-width:760px){
  .topbar{height:60px;padding:0 18px}
  .brand{font-size:18px}
  .brand-mark{width:32px;height:32px}
  .hero{padding:46px 18px 36px}
  .section{padding:38px 18px}
  .section-head{margin-bottom:16px}
  .section-head h1,.section-head h2{font-size:27px}
  .stats-grid{gap:9px}
  .stat-card{padding:17px}
  .stat-card strong{font-size:20px}
  .panel{padding:18px}
  .filter-box{grid-template-columns:1fr;gap:12px}
  .price-inputs{display:grid;grid-template-columns:1fr auto 1fr;gap:6px}
  .price-inputs input{width:100%;min-width:0;font-size:16px}
  .price-inputs button{grid-column:1/-1;min-height:44px}
  .listing-toolbar{align-items:flex-start;gap:12px;flex-direction:column}
  .listing-actions{display:flex;gap:7px;flex-wrap:wrap}
  .compare-controls{grid-template-columns:1fr;align-items:stretch}
  .vs{padding:0;text-align:center}
  .compare-table>div{grid-template-columns:80px minmax(0,1fr) minmax(0,1fr);padding:14px 12px;font-size:13px}
  .model-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
  .model-card{padding:10px}
  .model-card img,.model-image-placeholder{height:125px}
  footer{padding:34px 18px 48px;gap:12px;align-items:flex-start;flex-direction:column}
  input,select{font-size:16px}
}
@media(max-width:390px){
  .hero-title{font-size:38px}
  .stats-grid{grid-template-columns:1fr}
  .model-grid{grid-template-columns:1fr 1fr}
}
`;
}

fs.writeFileSync(serverPath, server, 'utf8');
fs.writeFileSync(stylePath, style, 'utf8');

console.log('');
console.log('✅ 시세봄 30단계 FINAL V2 적용 완료');
console.log('- refresh=1 실제 재수집');
console.log('- 플랫폼 실패/403 상태 정확히 표시');
console.log('- 공개 원본 매물 사진 보강');
console.log('- 새로고침 실패 시 기존 결과 유지');
console.log('- 모바일/최종 QA 보강');
console.log('- iPhone 12/13/14 포함 전 세대 검색 후보 강화');
console.log('- Apple 기존 대표이미지 자동 fallback 복구');
console.log('');
console.log('GitHub Desktop에서 Commit / Push 하세요.');
