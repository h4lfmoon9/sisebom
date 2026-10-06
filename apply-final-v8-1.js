'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const file = rel => path.join(ROOT, ...rel.split('/'));

for (const rel of [
  'script.js',
  'server/providers/browserCollector.js',
  'server/providers/browserCollectorCore.js',
  'server/qa/v81JoongnaPagination.test.js'
]) {
  if (!fs.existsSync(file(rel))) throw new Error(`${rel} 파일이 없습니다. ZIP 전체를 저장소 루트에 풀어주세요.`);
}

// 서버의 combined route가 예전 작은 limit을 전달하는 경우도 최대 수집값으로 올린다.
const serverPath = file('server/server.js');
if (fs.existsSync(serverPath)) {
  let serverJs = fs.readFileSync(serverPath, 'utf8');
  serverJs = serverJs
    .replace(/fetchDaangnListings\(q, \{ limit: \d+, region, force: forceRefresh \}\)/g, 'fetchDaangnListings(q, { limit: 20000, region, force: forceRefresh })')
    .replace(/fetchJoongnaListings\(q, \{ limit: \d+, force: forceRefresh \}\)/g, 'fetchJoongnaListings(q, { limit: 20000, force: forceRefresh })')
    .replace(/fetchBunjangListings\(q, \{ limit: \d+, force: forceRefresh \}\)/g, 'fetchBunjangListings(q, { limit: 20000, force: forceRefresh })')
    .replace(/fetchDaangnListings\(q, \{ limit, region, force: forceRefresh \}\)/g, 'fetchDaangnListings(q, { limit: 20000, region, force: forceRefresh })')
    .replace(/fetchJoongnaListings\(q, \{ limit, force: forceRefresh \}\)/g, 'fetchJoongnaListings(q, { limit: 20000, force: forceRefresh })')
    .replace(/fetchBunjangListings\(q, \{ limit, force: forceRefresh \}\)/g, 'fetchBunjangListings(q, { limit: 20000, force: forceRefresh })')
    .replace(/fetchDaangnListings\(q, \{ limit: \d+, region \}\)/g, 'fetchDaangnListings(q, { limit: 20000, region })')
    .replace(/fetchJoongnaListings\(q, \{ limit: \d+ \}\)/g, 'fetchJoongnaListings(q, { limit: 20000 })')
    .replace(/fetchBunjangListings\(q, \{ limit: \d+ \}\)/g, 'fetchBunjangListings(q, { limit: 20000 })')
    .replace(/fetchDaangnListings\(q, \{ limit, region \}\)/g, 'fetchDaangnListings(q, { limit: 20000, region })')
    .replace(/fetchJoongnaListings\(q, \{ limit \}\)/g, 'fetchJoongnaListings(q, { limit: 20000 })')
    .replace(/fetchBunjangListings\(q, \{ limit \}\)/g, 'fetchBunjangListings(q, { limit: 20000 })');
  fs.writeFileSync(serverPath, serverJs, 'utf8');
}

const pkgPath = file('server/package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = '2.3.0';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

console.log('');
console.log('✅ 시세봄 FINAL V8.1 중고나라 전체 페이지 수집 보강 완료');
console.log('- 중고나라 첫 화면만 읽던 방식을 ?page=N 전체 페이지 순회 방식으로 변경');
console.log('- 중고나라 공개 검색의 총 결과 수를 읽어 마지막 페이지까지 계속 수집');
console.log('- 빈 페이지/중복 페이지만 반복될 때 자동 종료');
console.log('- 당근/번개장터는 기존 장기 스크롤 수집 유지');
console.log('- 기본 안전 상한 플랫폼당 20,000개, 환경변수로 최대 50,000개');
console.log('- 심층 수집 기본 30분, 최대 2시간까지 조정 가능');
console.log('- 용량은 검색 조건으로 사용하지 않음');
console.log('');
console.log('확인: cd server && node --test qa/v81JoongnaPagination.test.js qa/v8MaxListings.test.js');
