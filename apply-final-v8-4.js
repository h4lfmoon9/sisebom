'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const file = rel => path.join(ROOT, ...rel.split('/'));

if (fs.existsSync(file('apply-final-v8-3.js'))) {
  require('./apply-final-v8-3.js');
}

if (!fs.existsSync(file('server/providers/joongnaDirectFetcher.js'))) {
  throw new Error('server/providers/joongnaDirectFetcher.js 파일이 없습니다. ZIP 전체를 저장소 루트에 풀어주세요.');
}

const pkgPath = file('server/package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.scripts?.check && !pkg.scripts.check.includes('joongnaDirectFetcher.js')) {
    pkg.scripts.check = pkg.scripts.check.replace(
      'node --check providers/joongnaDynamicParser.js',
      'node --check providers/joongnaDynamicParser.js && node --check providers/joongnaDirectFetcher.js'
    );
  }
  pkg.version = '2.5.0';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

const serverPath = file('server/server.js');
if (fs.existsSync(serverPath)) {
  let s = fs.readFileSync(serverPath, 'utf8');
  s = s.replace(/release:\s*"final-v8-3"/g, 'release: "final-v8-4"');
  s = s.replace(/release:\s*"final-v8-2"/g, 'release: "final-v8-4"');
  fs.writeFileSync(serverPath, s, 'utf8');
}

console.log('');
console.log('✅ 시세봄 FINAL V8.4 중고나라 직접 HTML fallback 적용 완료');
console.log('- Playwright보다 먼저 중고나라 공개 SSR HTML을 직접 읽어 매물 시드 확보');
console.log('- Chromium/브라우저 수집 실패 시에도 이미 확보한 중고나라 매물은 화면에 반환');
console.log('- 기본 검색 + 최신순 공개 HTML을 합쳐 중복 제거');
console.log('- 이후 기존 번호 페이지 브라우저 수집도 계속 시도');
console.log('');
console.log('확인: cd server && npm test');
