'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const collector = fs.readFileSync(path.join(__dirname, '../providers/browserCollector.js'), 'utf8');
const direct = fs.readFileSync(path.join(__dirname, '../providers/joongnaDirectFetcher.js'), 'utf8');
const frontend = fs.readFileSync(path.join(__dirname, '../../script.js'), 'utf8');

test('중고나라는 번호 페이지를 순차 탐색하고 직접 HTML fallback도 사용한다', () => {
  assert.match(collector, /MAX_JOONGNA_PAGES/);
  assert.match(collector, /clickJoongnaNextNumberedPage/);
  assert.match(collector, /reportedTotal/);
  assert.match(collector, /collectJoongnaDirectFallback/);
});

test('중고나라 직접 HTML fallback은 기본 검색과 최신순을 함께 시도한다', () => {
  assert.match(direct, /RECENT_SORT/);
  assert.match(direct, /web\.joongna\.com\/search/);
});

test('기본 수집 상한과 작업 시간이 확대됐다', () => {
  assert.match(collector, /SISEBOM_MAX_LISTINGS[^\n]*20000/);
  assert.match(collector, /SISEBOM_DEEP_JOB_MAX_MS[^\n]*2700000/);
});

test('프론트는 장기 수집을 계속 폴링한다', () => {
  assert.match(frontend, /liveState\.collecting\?180/);
  assert.match(frontend, /api\/live\/combined[^\n]*limit=20000/);
});
