'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeBrowserCard } = require('../providers/browserCollectorCore');

const collectorSource = fs.readFileSync(path.join(__dirname, '../providers/browserCollector.js'), 'utf8');
const frontendSource = fs.readFileSync(path.join(__dirname, '../../script.js'), 'utf8');

test('V8 수집기는 플랫폼당 기본 5000개 안전 상한을 사용한다', () => {
  assert.match(collectorSource, /SISEBOM_MAX_LISTINGS[^\n]*5000/);
  assert.match(collectorSource, /MAX_SCROLL_ROUNDS[^\n]*240/);
  assert.match(collectorSource, /DEEP_JOB_MAX_MS[^\n]*900000/);
});

test('V8 프론트는 라이브 검색 요청에 5000개 상한을 요청한다', () => {
  assert.match(frontendSource, /api\/live\/combined[^\n]*limit=5000/);
});

test('V8 용량 선택은 중고매물 검색 조건에서 제거됐다', () => {
  assert.match(frontendSource, /function liveSearchQuery\(\)\{[\s\S]*return buildListingQuery\(current\);/);
  assert.doesNotMatch(frontendSource, /if\(filters\.storage!==['"]all['"]\)a=a\.filter/);
});

test('V8 용량은 매물 자체에 적혀 있을 때만 메타데이터로 기록한다', () => {
  const noCapacity = normalizeBrowserCard('daangn', {
    url:'https://www.daangn.com/kr/buy-sell/iphone15-test-111111/',
    title:'아이폰15 블루 판매',
    text:'아이폰15 블루 판매 650,000원 안양동 · 1시간 전',
    searchQuery:'아이폰 15 128GB'
  }, '아이폰 15', 0);
  assert.equal(noCapacity.storage, null);

  const withCapacity = normalizeBrowserCard('daangn', {
    url:'https://www.daangn.com/kr/buy-sell/iphone15-test-222222/',
    title:'아이폰15 256GB 블루',
    text:'아이폰15 256GB 블루 700,000원 안양동 · 1시간 전'
  }, '아이폰 15', 1);
  assert.equal(withCapacity.storage, 256);
});
