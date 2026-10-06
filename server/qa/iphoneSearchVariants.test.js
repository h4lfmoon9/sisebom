'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchVariants } = require('../providers/browserCollector');

for (const gen of [12,13,14,15]) {
  test(`아이폰 ${gen} 검색은 용량 없이 넓은 모델명으로만 검색한다`, () => {
    const variants = buildSearchVariants(`아이폰 ${gen}`);
    assert.ok(variants.length >= 4);
    assert.ok(variants[0] === `아이폰 ${gen}` || variants[0] === `아이폰${gen}`);
    assert.ok(variants.every(v => !/(?:32|64|128|256|512|1024|2048)\s*(?:GB|G|기가)|(?:1|2)\s*(?:TB|테라)/i.test(v)));
  });
}

test('아이폰 12 프로는 프로 검색어를 유지한다', () => {
  const variants = buildSearchVariants('아이폰 12 프로');
  assert.ok(variants.some(v => /12.*프로/i.test(v)));
});

test('아이폰 15 256GB를 입력해도 실제 매물 검색어에서는 용량을 제거한다', () => {
  const variants = buildSearchVariants('아이폰 15 256GB');
  assert.ok(variants.length >= 2);
  assert.ok(variants.every(v => !/256\s*(?:GB|G|기가)/i.test(v)));
});
