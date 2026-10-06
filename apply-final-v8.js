'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const file = rel => path.join(ROOT, ...rel.split('/'));

for (const rel of [
  'script.js',
  'server/providers/browserCollector.js',
  'server/providers/browserCollectorCore.js',
  'server/qa/v8MaxListings.test.js'
]) {
  if (!fs.existsSync(file(rel))) throw new Error(`${rel} 파일이 없습니다. ZIP 전체를 저장소 루트에 풀어주세요.`);
}

// Combined live search should ask every marketplace for the V8 deep-scan ceiling.
// Older server.js versions passed a smaller local `limit` variable even when the
// frontend requested more results, so patch the known combined-provider calls too.
const serverPath = file('server/server.js');
if (fs.existsSync(serverPath)) {
  let serverJs = fs.readFileSync(serverPath, 'utf8');
  serverJs = serverJs
    .replace('fetchDaangnListings(q, { limit, region, force: forceRefresh })', 'fetchDaangnListings(q, { limit: 5000, region, force: forceRefresh })')
    .replace('fetchJoongnaListings(q, { limit, force: forceRefresh })', 'fetchJoongnaListings(q, { limit: 5000, force: forceRefresh })')
    .replace('fetchBunjangListings(q, { limit, force: forceRefresh })', 'fetchBunjangListings(q, { limit: 5000, force: forceRefresh })')
    .replace('fetchDaangnListings(q, { limit, region })', 'fetchDaangnListings(q, { limit: 5000, region })')
    .replace('fetchJoongnaListings(q, { limit })', 'fetchJoongnaListings(q, { limit: 5000 })')
    .replace('fetchBunjangListings(q, { limit })', 'fetchBunjangListings(q, { limit: 5000 })');
  fs.writeFileSync(serverPath, serverJs, 'utf8');
}

const pkgPath = file('server/package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = '2.2.0';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

console.log('');
console.log('✅ 시세봄 FINAL V8 최대 매물 수집 적용 완료');
console.log('- 용량을 중고매물 검색/필터 조건에서 제거');
console.log('- 128/256/512GB가 검색 결과를 나누지 않음');
console.log('- 매물 자체에 적힌 용량은 정보 표시용 메타데이터로만 유지');
console.log('- 각 플랫폼에서 새 매물이 더 나오지 않을 때까지 스크롤/더보기 반복');
console.log('- 플랫폼당 5,000개 안전 상한 적용 (환경변수로 최대 10,000개까지 조정 가능)');
console.log('- 공개 페이지의 403/차단은 우회하지 않음');
console.log('');
console.log('확인: cd server && node --test qa/v8MaxListings.test.js');
