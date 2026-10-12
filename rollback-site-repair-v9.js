'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SUFFIX = '.before-site-repair-v9.bak';
const SKIP = new Set(['node_modules', '.git', 'backups', 'manager', 'logs']);

function walk(dir, depth = 0, found = []) {
  if (depth > 3) return found;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return found; }

  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isFile() && e.name.endsWith(SUFFIX)) found.push(p);
  }

  for (const e of entries) {
    if (!e.isDirectory() || SKIP.has(e.name)) continue;
    walk(path.join(dir, e.name), depth + 1, found);
  }
  return found;
}

const backups = walk(ROOT);

if (!backups.length) {
  console.error('❌ V9 적용 전 백업 파일을 찾지 못했습니다.');
  console.error('현재 프로젝트 전체 ZIP을 ChatGPT에 올려서 직접 복구해야 합니다.');
  process.exit(1);
}

console.log('시세봄 V9 롤백 시작');
console.log('-------------------');

for (const bak of backups) {
  const original = bak.slice(0, -SUFFIX.length);
  fs.copyFileSync(bak, original);
  console.log('✅ 복구:', path.relative(ROOT, original));
}

const server = [
  path.join(ROOT, 'server', 'server.js'),
  path.join(ROOT, 'server.js')
].find(p => fs.existsSync(p));

if (server) {
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, ['--check', server], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true
  });
  if (r.status === 0) {
    console.log('✅ server.js 문법 검사 정상');
  } else {
    console.error('⚠️ server.js 문법 검사 실패');
    console.error(r.stderr || r.stdout || '');
  }
}

console.log('');
console.log('✅ V9 적용 전 상태로 되돌렸습니다.');
console.log('이제 시세봄 서버를 다시 켜세요.');
