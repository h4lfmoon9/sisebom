'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const file = rel => path.join(ROOT, ...rel.split('/'));

for (const rel of [
  'server/providers/browserCollector.js',
  'server/providers/browserCollectorCore.js',
  'server/providers/joongnaDynamicParser.js'
]) {
  if (!fs.existsSync(file(rel))) throw new Error(`${rel} 파일이 없습니다. ZIP 전체를 저장소 루트에 풀어주세요.`);
}

const pkgPath = file('server/package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = '2.5.0';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

console.log('');
console.log('✅ 시세봄 FINAL V8.3 중고나라 번호 페이지 수집 수정 완료');
console.log('- 중고나라 검색 URL의 추정 sort 파라미터 제거');
console.log('- 현재 공개 검색 화면의 번호 페이지(1,2,3...)를 직접 클릭하며 수집');
console.log('- URL 이동 대신 상품 링크 묶음 변경을 감지해 다음 페이지 로딩 확인');
console.log('- 각 페이지에서 렌더된 상품 링크 + 포함 데이터 + 공개 XHR 결과를 함께 수집');
console.log('- 중고나라 0개일 때 차단/구조변경 진단 메시지 기록');
console.log('- 기존 최대 수집/중복제거/용량 비조건 정책 유지');
