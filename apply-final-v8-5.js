'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const file = rel => path.join(ROOT, ...rel.split('/'));

if (fs.existsSync(file('apply-final-v8-4.js'))) {
  require('./apply-final-v8-4.js');
}

if (!fs.existsSync(file('server/providers/joongmoReferenceCollector.js'))) {
  throw new Error('server/providers/joongmoReferenceCollector.js 파일이 없습니다. ZIP 전체를 저장소 루트에 풀어주세요.');
}

const pkgPath = file('server/package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.scripts?.check && !pkg.scripts.check.includes('joongmoReferenceCollector.js')) {
    pkg.scripts.check = pkg.scripts.check.replace(
      'node --check providers/joongnaDirectFetcher.js',
      'node --check providers/joongnaDirectFetcher.js && node --check providers/joongmoReferenceCollector.js'
    );
  }
  pkg.version = '2.6.0';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

const serverPath = file('server/server.js');
if (fs.existsSync(serverPath)) {
  let s = fs.readFileSync(serverPath, 'utf8');
  s = s.replace(/release:\s*"final-v8-4"/g, 'release: "final-v8-5"');
  s = s.replace(/release:\s*"final-v8-3"/g, 'release: "final-v8-5"');
  fs.writeFileSync(serverPath, s, 'utf8');
}

console.log('');
console.log('✅ 시세봄 FINAL V8.5 중고닷 참고 수집 적용 완료');
console.log('- 중고나라 매물 수집 시 중고닷(joongmo.com)을 1순위 공개 참고 소스로 사용');
console.log('- 중고닷 결과 중 /detail/joonggonara/ 매물만 중고나라로 분류');
console.log('- 중고닷 검색 결과를 스크롤/더보기/번호 페이지로 가능한 만큼 계속 수집');
console.log('- 중고닷 실패 시 기존 중고나라 직접 HTML + 브라우저 fallback도 유지');
console.log('- 용량은 검색 조건으로 사용하지 않음');
console.log('');
console.log('확인: cd server && npm test');
