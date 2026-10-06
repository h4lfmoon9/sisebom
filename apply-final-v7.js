'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const file = rel => path.join(ROOT, ...rel.split('/'));
const copy = rel => {
  const src = path.join(__dirname, rel);
  const dst = file(rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (path.resolve(src) !== path.resolve(dst)) fs.copyFileSync(src, dst);
};

// V7 is designed to be extracted over the repository root. These files are
// already in their final paths; this script mainly verifies the patch and bumps metadata.
for (const rel of [
  'script.js',
  'server/providers/browserCollector.js',
  'server/providers/browserCollectorCore.js',
  'server/modelMatchLoose.js',
  'server/catalogVisualProfile.js',
  'server/qa/iphoneSearchVariants.test.js',
  'server/qa/v7Iphone15Search.test.js'
]) {
  if (!fs.existsSync(file(rel))) throw new Error(`${rel} 파일이 없습니다. ZIP 전체를 저장소 루트에 풀어주세요.`);
}

const pkgPath = file('server/package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = '2.1.0';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

console.log('');
console.log('✅ 시세봄 FINAL V7 아이폰15 중고매물 검색 수정 완료');
console.log('- 아이폰15 기본 검색어를 용량 검색보다 먼저 시도');
console.log('- 128GB / 256GB / 512GB 검색 완전 분리');
console.log('- 카드에 용량이 없어도 용량별 검색 결과는 해당 용량으로 분류');
console.log('- 0개 결과 자동 재검색은 새 수집 작업을 강제 실행');
console.log('- iPhone 기본형에 Pro/Plus/Pro Max가 섞이지 않는 기존 모델 필터 유지');
console.log('- 대표이미지 자동 생성 기능 중단');
console.log('');
console.log('확인: cd server && node --test qa/v7Iphone15Search.test.js');
