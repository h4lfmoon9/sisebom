'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchVariants } = require('../providers/browserCollector');

for (const gen of [12,13,14,15]) {
  test(`아이폰 ${gen} 기본형은 넓은 검색이 용량 검색보다 먼저 나온다`, () => {
    const variants = buildSearchVariants(`아이폰 ${gen}`);
    assert.ok(variants.length >= 4);
    assert.ok(variants[0] === `아이폰 ${gen}` || variants[0] === `아이폰${gen}`);
    const capacity = variants.findIndex(v => /(?:64|128|256|512)GB/i.test(v));
    assert.ok(capacity > 0);
  });
}

test('아이폰 12 프로는 프로 검색어를 유지한다', () => {
  const variants = buildSearchVariants('아이폰 12 프로');
  assert.ok(variants.some(v => /12.*프로/i.test(v)));
});

test('아이폰 15 256GB는 모든 검색 변형이 256GB를 유지한다', () => {
  const variants = buildSearchVariants('아이폰 15 256GB');
  assert.ok(variants.length >= 2);
  assert.ok(variants.every(v => /256\s*(?:GB|G|기가)/i.test(v)));
});
