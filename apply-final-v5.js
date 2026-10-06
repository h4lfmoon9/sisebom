'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const file = rel => path.join(ROOT, ...rel.split('/'));
const read = rel => fs.readFileSync(file(rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(file(rel), value, 'utf8');

// Keep every FINAL V4 behavior first.
if (fs.existsSync(file('apply-final-v4.js'))) {
  require('./apply-final-v4.js');
}

if (!fs.existsSync(file('server/data/final-v5-expanded-smartphones.json'))) {
  throw new Error('server/data/final-v5-expanded-smartphones.json 파일이 없습니다. ZIP 전체를 저장소 루트에 풀어주세요.');
}

// catalog.js: dedupe old catalog + huge V5 seed while preserving old verified records.
let catalog = read('server/catalog.js');
if (!catalog.includes('FINAL_V5_STATIC_MERGE')) {
  catalog = catalog.replace(
    "const { applyAutoProfileCatalog } = require('./catalogAutoProfile');",
    "const { applyAutoProfileCatalog } = require('./catalogAutoProfile');\nconst { mergeStaticCatalogV5 } = require('./catalogV5Merge');\n// FINAL_V5_STATIC_MERGE"
  );
  catalog = catalog.replace(
    'return applyAutoProfileCatalog(phones);',
    'return applyAutoProfileCatalog(mergeStaticCatalogV5(phones));'
  );
}
write('server/catalog.js', catalog);

// package.json: syntax checker covers V5 merge + matcher.
const pkgPath = file('server/package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (pkg.scripts?.check) {
  if (!pkg.scripts.check.includes('catalogV5Merge.js')) {
    pkg.scripts.check = pkg.scripts.check.replace(
      'node --check catalog.js',
      'node --check catalog.js && node --check catalogV5Merge.js'
    );
  }
  if (!pkg.scripts.check.includes('modelMatchLoose.js')) {
    pkg.scripts.check = pkg.scripts.check.replace(
      'node --check listingQuality.js',
      'node --check listingQuality.js && node --check modelMatchLoose.js'
    );
  }
}
pkg.version = '1.9.0';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// release marker
let serverJs = read('server/server.js');
serverJs = serverJs.replace(/release:\s*"final-v4"/g, 'release: "final-v5"');
serverJs = serverJs.replace(/release:\s*"final-v3"/g, 'release: "final-v5"');
write('server/server.js', serverJs);

console.log('');
console.log('✅ 시세봄 FINAL V5 전체 스마트폰 카탈로그 확장 완료');
console.log('- 2,000개+ 스마트폰 시드 모델 + 기존 DB 자동 병합/중복 제거');
console.log('- 삼성: S/Z/Note/A/M/F/J/C/On/Grand/Core/Ace/XCover/W/Wide/Jump/Quantum/Buddy/Jean 등');
console.log('- Xiaomi/Redmi/POCO/Black Shark 전 주요 스마트폰 계열');
console.log('- Motorola Edge/Razr/Moto G/Moto E/One/X/Z/Defy/ThinkPhone 등');
console.log('- Pixel/LG/Sony/OnePlus/OPPO/vivo/iQOO/realme/HONOR/Huawei/ASUS/Nothing/CMF 등 확장');
console.log('- Nokia/HMD/ZTE/nubia/REDMAGIC/Meizu/TCL/Sharp/HTC/Lenovo/TECNO/Infinix/itel/Fairphone 등 확장');
console.log('- 판매자 축약명 + 한국 통신사 전용명 검색 보강');
console.log('- 기본형에 Pro/Plus/Ultra/FE가 섞이는 오탐 방지 유지');
console.log('- 태블릿/워치/이어폰은 추가하지 않음');
console.log('');
console.log('다음 명령으로 확인: cd server && npm test');
console.log('GitHub Desktop에서 Commit / Push 하세요.');
