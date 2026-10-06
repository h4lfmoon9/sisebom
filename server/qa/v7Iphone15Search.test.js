'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchVariants } = require('../providers/browserCollector');
const { normalizeBrowserCard } = require('../providers/browserCollectorCore');

test('V8 아이폰 15 기본 검색은 넓은 모델명이 우선이고 용량 조건은 없다', () => {
  const variants = buildSearchVariants('아이폰 15');
  assert.ok(variants.length >= 4);
  assert.equal(variants[0], '아이폰 15');
  assert.ok(variants.every(v => !/(?:128|256|512)\s*(?:GB|G|기가)/i.test(v)));
});

for (const capacity of [128, 256, 512]) {
  test(`아이폰 15 ${capacity}GB 입력도 매물 검색에서는 용량을 제거한다`, () => {
    const variants = buildSearchVariants(`아이폰 15 ${capacity}GB`);
    assert.ok(variants.length >= 2);
    assert.ok(variants.every(v => !new RegExp(`${capacity}\\s*(?:GB|G|기가)`, 'i').test(v)));
  });
}

test('검색어에 용량이 있어도 카드 자체가 미표기면 storage는 null이다', () => {
  const raw = {
    url: 'https://www.daangn.com/kr/buy-sell/test-iphone15-123456/',
    title: '아이폰15 블루 판매합니다',
    text: '아이폰15 블루 판매합니다 650,000원 안양동 · 3시간 전',
    searchQuery: '아이폰 15 128GB'
  };
  const item = normalizeBrowserCard('daangn', raw, '아이폰 15', 0);
  assert.equal(item.storage, null);
});
