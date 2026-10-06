'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const file = rel => path.join(ROOT, ...rel.split('/'));

for (const rel of [
  'script.js',
  'server/providers/browserCollector.js',
  'server/providers/browserCollectorCore.js',
  'server/providers/joongnaDynamicParser.js',
  'server/qa/v82JoongnaDynamicLoad.test.js'
]) {
  if (!fs.existsSync(file(rel))) throw new Error(`${rel} 파일이 없습니다. ZIP 전체를 저장소 루트에 풀어주세요.`);
}

// Keep the V8/V8.1 high collection ceiling even if an older server.js is in the repo.
const serverPath = file('server/server.js');
if (fs.existsSync(serverPath)) {
  let serverJs = fs.readFileSync(serverPath, 'utf8');
  serverJs = serverJs
    .replace(/fetchDaangnListings\(q, \{ limit: \d+, region, force: forceRefresh \}\)/g, 'fetchDaangnListings(q, { limit: 20000, region, force: forceRefresh })')
    .replace(/fetchJoongnaListings\(q, \{ limit: \d+, force: forceRefresh \}\)/g, 'fetchJoongnaListings(q, { limit: 20000, force: forceRefresh })')
    .replace(/fetchBunjangListings\(q, \{ limit: \d+, force: forceRefresh \}\)/g, 'fetchBunjangListings(q, { limit: 20000, force: forceRefresh })')
    .replace(/fetchDaangnListings\(q, \{ limit, region, force: forceRefresh \}\)/g, 'fetchDaangnListings(q, { limit: 20000, region, force: forceRefresh })')
    .replace(/fetchJoongnaListings\(q, \{ limit, force: forceRefresh \}\)/g, 'fetchJoongnaListings(q, { limit: 20000, force: forceRefresh })')
    .replace(/fetchBunjangListings\(q, \{ limit, force: forceRefresh \}\)/g, 'fetchBunjangListings(q, { limit: 20000, force: forceRefresh })');
  fs.writeFileSync(serverPath, serverJs, 'utf8');
}

const pkgPath = file('server/package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = '2.4.0';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

console.log('');
console.log('✅ 시세봄 FINAL V8.2 중고나라 실제 동적 로딩 수집 보강 완료');
console.log('- 중고나라 ?page=N 추측 방식 제거');
console.log('- 첫 검색 HTML에 포함된 실제 items 데이터 직접 읽기');
console.log('- 중고나라 화면이 사용하는 공개 XHR/fetch 응답에서 매물 자동 수집');
console.log('- 스크롤/더보기/End 반복으로 새 매물이 안 나올 때까지 장기 수집');
console.log('- URL 기준 중복 제거, 판매중 후보 중심 유지');
console.log('- 용량은 검색 조건으로 사용하지 않음');
console.log('- 플랫폼당 기본 안전 상한 20,000개, 최대 50,000개 설정 가능');
console.log('- 심층 수집 기본 45분, 환경변수로 최대 2시간 조정 가능');
console.log('');
console.log('확인: cd server && node --test qa/v82JoongnaDynamicLoad.test.js qa/v8MaxListings.test.js');
