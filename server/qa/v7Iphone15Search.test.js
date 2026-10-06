'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchVariants } = require('../providers/browserCollector');
const { normalizeBrowserCard } = require('../providers/browserCollectorCore');

test('아이폰 15 기본 검색은 넓은 모델명이 용량 검색보다 먼저다', () => {
  const variants = buildSearchVariants('아이폰 15');
  assert.ok(variants.length >= 4);
  assert.equal(variants[0], '아이폰 15');
  const firstCapacity = variants.findIndex(v => /(?:128|256|512)GB/i.test(v));
  assert.ok(firstCapacity > 0);
});

for (const capacity of [128, 256, 512]) {
  test(`아이폰 15 ${capacity}GB 검색은 다른 용량과 섞이지 않는다`, () => {
    const variants = buildSearchVariants(`아이폰 15 ${capacity}GB`);
    assert.ok(variants.length >= 2);
    assert.ok(variants.every(v => new RegExp(`${capacity}\\s*(?:GB|G|기가)`, 'i').test(v)));
    for (const other of [128, 256, 512].filter(x => x !== capacity)) {
      assert.ok(variants.every(v => !new RegExp(`${other}\\s*(?:GB|G|기가)`, 'i').test(v)));
    }
  });
}

test('카드에 용량이 없어도 128GB 검색에서 수집된 매물은 128GB로 분류한다', () => {
  const raw = {
    url: 'https://www.daangn.com/kr/buy-sell/test-iphone15-123456/',
    title: '아이폰15 블루 판매합니다',
    text: '아이폰15 블루 판매합니다 650,000원 안양동 · 3시간 전',
    searchQuery: '아이폰 15 128GB'
  };
  const item = normalizeBrowserCard('daangn', raw, '아이폰 15 128GB', 0);
  assert.equal(item.storage, 128);
});
