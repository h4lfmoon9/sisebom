'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchVariants } = require('../providers/browserCollector');

for (const gen of [12,13,14,15]) {
  test(`아이폰 ${gen} 기본형은 용량 검색이 넓은 검색보다 먼저 나온다`, () => {
    const variants = buildSearchVariants(`아이폰 ${gen}`);
    assert.ok(variants.length >= 4);
    assert.ok(variants[0].includes(`아이폰 ${gen}`) || variants[0].includes(`아이폰${gen}`));
    assert.match(variants[0], /(?:64|128|256|512)GB/i);
    const broad = variants.findIndex(v => v === `아이폰 ${gen}`);
    assert.ok(broad === -1 || broad > 0);
  });
}

test('아이폰 12 프로는 프로 검색어를 유지한다', () => {
  const variants = buildSearchVariants('아이폰 12 프로');
  assert.ok(variants.some(v => /12.*프로.*128GB/i.test(v)));
});
