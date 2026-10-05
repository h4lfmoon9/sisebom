'use strict';

const { spawnSync } = require('child_process');

process.env.PLAYWRIGHT_BROWSERS_PATH = '0';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

console.log('[시세봄] Playwright Chromium 설치 시작...');
console.log('[시세봄] PLAYWRIGHT_BROWSERS_PATH=0');

const result = spawnSync(
  npx,
  ['playwright', 'install', 'chromium'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: '0'
    }
  }
);

if (result.error) {
  console.error('[시세봄] Chromium 설치 실행 실패:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`[시세봄] Chromium 설치 실패 (exit ${result.status})`);
  process.exit(result.status || 1);
}

console.log('[시세봄] Chromium 설치 완료');
