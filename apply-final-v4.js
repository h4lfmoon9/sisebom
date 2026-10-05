'use strict';

// FINAL V4 includes all FINAL V3 server patches.
// Safe to run even if FINAL V3 was already applied.
require('./apply-final-v3.js');

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const file = rel => path.join(ROOT, ...rel.split('/'));
const read = rel => fs.readFileSync(file(rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(file(rel), value, 'utf8');

// listingQuality.js: seller shorthand fallback
let quality = read('server/listingQuality.js');

if (!quality.includes('FINAL_V4_LOOSE_MODEL_MATCH')) {
  quality = quality.replace(
    "'use strict';",
    "'use strict';\n// FINAL_V4_LOOSE_MODEL_MATCH\nconst { matchesRequestedModelLoose } = require('./modelMatchLoose');"
  );

  const oldBlock = `    if (!matchesRequestedModel(evidence, query)) {
      excluded.wrongModel++;
      continue;
    }`;

  const newBlock = `    if (!matchesRequestedModel(evidence, query) && !matchesRequestedModelLoose(evidence, query)) {
      excluded.wrongModel++;
      continue;
    }`;

  if (!quality.includes(oldBlock)) {
    throw new Error('listingQuality.js의 모델 필터 블록을 찾지 못했습니다.');
  }

  quality = quality.replace(oldBlock, newBlock);
}

write('server/listingQuality.js', quality);

// style.css: desktop exactly 3 columns, pagination controls
let style = read('style.css');

if (!style.includes('FINAL_V4_3X3_PAGINATION')) {
  style += `
/* FINAL_V4_3X3_PAGINATION */
@media(min-width:981px){
  .listing-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
}
.listing-pagination{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  flex-wrap:wrap;
  margin:22px 0 6px;
}
.listing-pagination[hidden]{display:none!important}
.listing-pagination button{
  min-width:42px;
  height:42px;
  border:1px solid var(--line);
  background:#fff;
  color:var(--text);
  border-radius:12px;
  font-weight:800;
  cursor:pointer;
}
.listing-pagination button:hover{border-color:var(--green);color:var(--green)}
.listing-pagination button.active{
  background:var(--green);
  border-color:var(--green);
  color:#fff;
}
.listing-pagination button:disabled{
  opacity:.38;
  cursor:default;
}
.page-gap{color:var(--muted);padding:0 2px}
.page-count{
  width:100%;
  text-align:center;
  color:var(--muted);
  font-size:12px;
  margin-top:3px;
}
@media(max-width:640px){
  .listing-pagination{gap:5px}
  .listing-pagination button{min-width:38px;height:40px;padding:0 9px}
}
`;
}

write('style.css', style);

// server release marker
let serverJs = read('server/server.js');
serverJs = serverJs.replace(/release:\s*"final-v3"/g, 'release: "final-v4"');
write('server/server.js', serverJs);

console.log('');
console.log('✅ 시세봄 FINAL V4 전체 모델/용량/3x3 페이지 적용 완료');
console.log('- 용량 선택: 모델별 64/128/256/512GB, 1TB 선택지는 숨김');
console.log('- 1페이지 매물 9개 = 가로 3 × 세로 3');
console.log('- 이전/다음 + 페이지 번호 직접 선택');
console.log('- 갤럭시/샤오미/Redmi/POCO/Motorola 판매자 축약명도 정확 모델로 인식');
console.log('- 용량 미표기 매물도 선택한 용량 검색 결과에서 사라지지 않음');
console.log('- 0개일 때 자동 재확인 횟수 증가');
console.log('');
console.log('GitHub Desktop에서 Commit / Push 하세요.');
