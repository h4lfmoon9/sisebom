'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const file = rel => path.join(ROOT, ...rel.split('/'));
const read = rel => fs.readFileSync(file(rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(file(rel), value, 'utf8');

if (fs.existsSync(file('apply-final-v5.js'))) {
  require('./apply-final-v5.js');
}

if (!fs.existsSync(file('server/catalogVisualProfile.js'))) {
  throw new Error('server/catalogVisualProfile.js 파일이 없습니다. ZIP 전체를 저장소 루트에 풀어주세요.');
}

let auto = read('server/catalogAutoProfile.js');
if (!auto.includes("catalogVisualProfile")) {
  auto = auto.replace("'use strict';\n", "'use strict';\n\nconst { applyVisualProfile } = require('./catalogVisualProfile');\n");
  auto = auto.replace("  if (!out.scoreSource && inferred) out.scoreSource = 'sisebom-auto-profile-v1';\n  return out;\n}", "  if (!out.scoreSource && inferred) out.scoreSource = 'sisebom-auto-profile-v1';\n  return applyVisualProfile(out);\n}\n");
}
write('server/catalogAutoProfile.js', auto);

const pkgPath = file('server/package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.scripts?.check && !pkg.scripts.check.includes('catalogVisualProfile.js')) {
    pkg.scripts.check = pkg.scripts.check.replace(
      'node --check catalogV5Merge.js',
      'node --check catalogV5Merge.js && node --check catalogVisualProfile.js'
    );
  }
  pkg.version = '2.0.0';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

if (fs.existsSync(file('server/server.js'))) {
  let serverJs = read('server/server.js');
  serverJs = serverJs.replace(/release:\s*"final-v5"/g, 'release: "final-v6"');
  serverJs = serverJs.replace(/release:\s*"final-v4"/g, 'release: "final-v6"');
  write('server/server.js', serverJs);
}

console.log('');
console.log('✅ 시세봄 FINAL V6 제품정보/대표이미지 자동 보강 적용 완료');
console.log('- 아이폰 제외 전 브랜드 모델에 칩셋/화면/카메라/충전/프레임 자동 보강');
console.log('- 삼성/샤오미/Redmi/POCO/모토로라/Pixel 계열 우선 규칙 보강');
console.log('- 이미지가 비어 있으면 모델명 기반 대표 이미지 자동 생성');
console.log('- 기존 공식 이미지/사용자 제공 이미지/매물 사진이 있으면 그대로 유지');
console.log('');
console.log('다음 명령으로 확인: cd server && npm test');
