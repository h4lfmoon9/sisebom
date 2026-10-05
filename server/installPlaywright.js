'use strict';

const { spawnSync } = require('child_process');

process.env.PLAYWRIGHT_BROWSERS_PATH = '0';

let cli;
try {
  cli = require.resolve('playwright/cli');
} catch (error) {
  console.error('Playwright CLI를 찾지 못했습니다:', error.message);
  process.exit(1);
}

console.log('[시세봄] Playwright Chromium을 node_modules 내부에 설치합니다...');

const result = spawnSync(
  process.execPath,
  [cli, 'install', 'chromium'],
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
