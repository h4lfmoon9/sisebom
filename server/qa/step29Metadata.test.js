'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRegion } = require('../providers/browserCollectorCore');

test('당근 카드에 시간 없이 동네와 점만 있어도 지역을 읽는다', () => {
  assert.equal(parseRegion('daangn', '아이폰 15 500,000원 삼성2동 ·'), '삼성2동');
  assert.equal(parseRegion('daangn', '갤럭시 S25 900,000원 사당동 ·'), '사당동');
});
