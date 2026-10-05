'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchVariants } = require('./variantHelper');

test('아이폰 15 전체 검색은 여러 용량 변형으로 넓힌다', () => {
  const q = buildSearchVariants('아이폰 15');
  assert.ok(q.includes('아이폰 15'));
  assert.ok(q.includes('아이폰15'));
  assert.ok(q.includes('아이폰 15 128GB'));
  assert.ok(q.includes('아이폰 15 256GB'));
  assert.ok(q.includes('아이폰 15 512GB'));
});

test('이미 용량을 지정했으면 불필요한 다른 용량 검색을 추가하지 않는다', () => {
  const q = buildSearchVariants('아이폰 15 256GB');
  assert.ok(q.length <= 2);
  assert.equal(q.some(x => /128GB/i.test(x)), false);
});

test('갤럭시 검색도 같은 수집엔진에서 compact 변형을 만든다', () => {
  const q = buildSearchVariants('갤럭시 S25');
  assert.ok(q.includes('갤럭시S25'));
});
