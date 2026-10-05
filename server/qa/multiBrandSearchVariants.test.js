'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchVariants } = require('../providers/browserCollector');

for (const q of ['갤럭시 S24 Ultra','샤오미 14','Redmi Note 14 Pro','POCO F6','motorola edge 50']) {
  test(`${q} 용량 포함 정확 검색어 우선`, () => {
    const variants = buildSearchVariants(q);
    assert.ok(variants.length >= 3);
    assert.match(variants[0], /(?:128|256|512)GB/i);
  });
}

test('샤오미 한글/영문 검색 변형', () => {
  const variants = buildSearchVariants('샤오미 14');
  assert.ok(variants.some(v => /Xiaomi 14/i.test(v)));
});

test('갤럭시 한글/영문 검색 변형', () => {
  const variants = buildSearchVariants('갤럭시 S24');
  assert.ok(variants.some(v => /Galaxy S24/i.test(v)));
});
