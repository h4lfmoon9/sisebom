'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const collector = fs.readFileSync(path.join(__dirname, '../providers/browserCollector.js'), 'utf8');
const core = fs.readFileSync(path.join(__dirname, '../providers/browserCollectorCore.js'), 'utf8');
const frontend = fs.readFileSync(path.join(__dirname, '../../script.js'), 'utf8');

test('V8.1 중고나라는 page=N 페이지를 순차 수집한다', () => {
  assert.match(collector, /MAX_JOONGNA_PAGES/);
  assert.match(collector, /searchParams\.set\('page'/);
  assert.match(collector, /collectJoongnaPages/);
  assert.match(collector, /reportedTotal/);
  assert.match(collector, /expectedPages\s*=\s*Math\.ceil\(total\s*\/\s*pageSize\)/);
});

test('V8.1 중고나라 검색은 최신순을 사용한다', () => {
  assert.match(core, /sort=RECENT_SORT/);
});

test('V8.1 기본 수집 상한과 작업 시간이 확대됐다', () => {
  assert.match(collector, /SISEBOM_MAX_LISTINGS[^\n]*20000/);
  assert.match(collector, /SISEBOM_DEEP_JOB_MAX_MS[^\n]*1800000/);
});

test('V8.1 프론트는 장기 수집을 계속 폴링한다', () => {
  assert.match(frontend, /liveState\.collecting\?180/);
  assert.match(frontend, /api\/live\/combined[^\n]*limit=20000/);
});
