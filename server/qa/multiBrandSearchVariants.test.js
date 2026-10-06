'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchVariants } = require('../providers/browserCollector');

for (const q of ['갤럭시 S24 Ultra','샤오미 14','Redmi Note 14 Pro','POCO F6','motorola edge 50']) {
  test(`${q} 모델명 중심 검색`, () => {
    const variants = buildSearchVariants(q);
    assert.ok(variants.length >= 1);
    assert.ok(variants.every(v => !/(?:32|64|128|256|512|1024|2048)\s*(?:GB|G|기가)|(?:1|2)\s*(?:TB|테라)/i.test(v)));
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
