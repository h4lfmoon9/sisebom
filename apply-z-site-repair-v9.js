#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function write(p, s) {
  fs.writeFileSync(p, s, 'utf8');
}

function backup(p) {
  const b = `${p}.before-site-repair-v9.bak`;
  if (!exists(b)) fs.copyFileSync(p, b);
  return b;
}

function findServer() {
  const candidates = [
    path.join(ROOT, 'server', 'server.js'),
    path.join(ROOT, 'server.js')
  ];
  return candidates.find(exists) || null;
}

function findFrontendIndex() {
  const fixed = [
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'public', 'index.html'),
    path.join(ROOT, 'docs', 'index.html'),
    path.join(ROOT, 'frontend', 'index.html'),
    path.join(ROOT, 'client', 'index.html')
  ];
  const hit = fixed.find(exists);
  if (hit) return hit;

  // 최대 2단계까지만 찾아서 node_modules 같은 큰 폴더는 건드리지 않는다.
  const skip = new Set(['node_modules', '.git', 'backups', 'manager', 'logs']);
  function walk(dir, depth) {
    if (depth > 2) return null;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const e of entries) {
      if (skip.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isFile() && e.name.toLowerCase() === 'index.html') return p;
    }
    for (const e of entries) {
      if (!e.isDirectory() || skip.has(e.name)) continue;
      const p = walk(path.join(dir, e.name), depth + 1);
      if (p) return p;
    }
    return null;
  }
  return walk(ROOT, 0);
}

function detectExpressApp(source) {
  const patterns = [
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*express\s*\(\s*\)\s*;?/,
    /\b([A-Za-z_$][\w$]*)\s*=\s*express\s*\(\s*\)\s*;?/
  ];
  for (const re of patterns) {
    const m = source.match(re);
    if (m) return { name: m[1], match: m[0], index: m.index };
  }
  return null;
}

function patchServer(serverPath, frontendDir) {
  let s = read(serverPath);
  if (s.includes('SISEBOM_SITE_REPAIR_V9')) {
    console.log('ℹ️ server.js에는 이미 V9 사이트 복구 패치가 적용되어 있습니다.');
    return false;
  }

  const app = detectExpressApp(s);
  if (!app) {
    throw new Error('Express app 생성부(express())를 찾지 못했습니다. server.js 구조 확인이 필요합니다.');
  }

  const serverDir = path.dirname(serverPath);
  let rel = path.relative(serverDir, frontendDir).replace(/\\/g, '/');
  if (!rel) rel = '.';

  // __dirname 기준으로 절대 경로를 만들어 PC 위치가 바뀌어도 동작하게 한다.
  const staticExpr =
    rel === '.'
      ? "__dirname"
      : `require('path').resolve(__dirname, ${JSON.stringify(rel)})`;

  const block = `
/* SISEBOM_SITE_REPAIR_V9
   API 서버와 시세봄 화면을 같은 주소에서 제공.
   API 라우트보다 먼저 등록되어 / 요청은 index.html을 우선 반환한다. */
const __sisebomFrontendDirV9 = ${staticExpr};
${app.name}.use(express.static(__sisebomFrontendDirV9, {
  index: 'index.html',
  extensions: ['html'],
  fallthrough: true
}));
/* /SISEBOM_SITE_REPAIR_V9 */
`;

  const insertAt = app.index + app.match.length;
  s = s.slice(0, insertAt) + block + s.slice(insertAt);

  backup(serverPath);
  write(serverPath, s);
  console.log(`✅ 정적 사이트 제공 추가: ${path.relative(ROOT, frontendDir) || '.'}`);
  return true;
}

function patchFrontendApi(frontendDir) {
  const candidates = [
    path.join(frontendDir, 'script.js'),
    path.join(ROOT, 'script.js')
  ];
  const scriptPath = candidates.find(exists);
  if (!scriptPath) {
    console.log('ℹ️ script.js를 찾지 못해 API 주소 패치는 건너뜁니다.');
    return false;
  }

  let s = read(scriptPath);
  if (s.includes('SISEBOM_API_ORIGIN_V9')) {
    console.log('ℹ️ script.js에는 이미 V9 API 주소 패치가 적용되어 있습니다.');
    return false;
  }

  const oldExact =
`const ONLINE_API='https://sisebom.onrender.com';
const LOCAL_API='http://localhost:3000';
const API_BASE=['localhost','127.0.0.1'].includes(location.hostname)?LOCAL_API:ONLINE_API;`;

  const replacement =
`const ONLINE_API='https://sisebom.onrender.com';
const LOCAL_API='http://localhost:3000';
/* SISEBOM_API_ORIGIN_V9
   localhost/127.0.0.1/trycloudflare에서는 화면을 연 바로 그 서버를 API로 사용한다. */
const __sisebomSameOriginV9 =
  ['localhost','127.0.0.1'].includes(location.hostname) ||
  location.hostname.endsWith('.trycloudflare.com') ||
  location.port === '3000';
const API_BASE=__sisebomSameOriginV9 ? location.origin : ONLINE_API;`;

  if (s.includes(oldExact)) {
    backup(scriptPath);
    s = s.replace(oldExact, replacement);
    write(scriptPath, s);
    console.log('✅ localhost/Cloudflare Tunnel에서 같은 주소의 API를 사용하도록 수정');
    return true;
  }

  // 공백이나 포맷이 조금 달라도 잡는 보조 패턴.
  const re = /const\s+ONLINE_API\s*=\s*['"]https:\/\/sisebom\.onrender\.com['"]\s*;\s*const\s+LOCAL_API\s*=\s*['"]http:\/\/localhost:3000['"]\s*;\s*const\s+API_BASE\s*=\s*\[['"]localhost['"],['"]127\.0\.0\.1['"]\]\.includes\(location\.hostname\)\s*\?\s*LOCAL_API\s*:\s*ONLINE_API\s*;/m;
  if (re.test(s)) {
    backup(scriptPath);
    s = s.replace(re, replacement);
    write(scriptPath, s);
    console.log('✅ API 주소 로직 수정(호환 패턴)');
    return true;
  }

  console.log('⚠️ script.js의 기존 API_BASE 형식이 예상과 달라 자동 수정하지 않았습니다.');
  console.log('   그래도 localhost 화면 제공 패치는 적용됩니다.');
  return false;
}

function main() {
  console.log('');
  console.log('시세봄 사이트 복구 V9 적용 시작');
  console.log('--------------------------------');

  const serverPath = findServer();
  if (!serverPath) {
    throw new Error('server/server.js 또는 server.js를 찾지 못했습니다. 시세봄 프로젝트 최상단에서 실행하세요.');
  }

  const indexPath = findFrontendIndex();
  if (!indexPath) {
    throw new Error(
      'index.html을 찾지 못했습니다. 현재 폴더가 시세봄 프로젝트 전체가 맞는지 확인해야 합니다.'
    );
  }

  const frontendDir = path.dirname(indexPath);

  patchServer(serverPath, frontendDir);
  patchFrontendApi(frontendDir);

  console.log('');
  console.log('✅ V9 사이트 복구 적용 완료');
  console.log(`- 서버: ${path.relative(ROOT, serverPath)}`);
  console.log(`- 화면: ${path.relative(ROOT, indexPath)}`);
  console.log('- 이제 시세봄 서버를 재시작한 뒤 http://localhost:3000 을 여세요.');
  console.log('- 정상이라면 JSON 대신 시세봄 화면이 바로 나옵니다.');
  console.log('- Cloudflare Quick Tunnel 주소에서도 같은 화면/API를 함께 사용합니다.');
  console.log('');
}

try {
  main();
} catch (e) {
  console.error('');
  console.error('❌ 적용 실패:', e && e.message ? e.message : e);
  process.exitCode = 1;
}
