'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesRequestedModelLoose } = require('../modelMatchLoose');

const yes = [
  ['S24 울트라 256GB 자급제', '갤럭시 S24 Ultra'],
  ['갤럭시 S24U 팝니다', '갤럭시 S24 Ultra'],
  ['폴드6 512기가 판매', '갤럭시 Z Fold6'],
  ['A55 128GB 공기계', '갤럭시 A55'],
  ['샤오미14 프로 256', 'Xiaomi 14 Pro'],
  ['14 Pro 256GB 미개봉', 'Xiaomi 14 Pro'],
  ['노트14 프로 256 판매', 'Redmi Note 14 Pro'],
  ['F6 Pro 512GB', 'POCO F6 Pro'],
  ['edge 50 pro 256GB', 'motorola edge 50 Pro']
];

for (const [evidence, query] of yes) {
  test(`${query} <- ${evidence}`, () => {
    assert.equal(matchesRequestedModelLoose(evidence, query), true);
  });
}

const no = [
  ['S24 울트라 256GB', '갤럭시 S24'],
  ['S24 플러스 256GB', '갤럭시 S24'],
  ['아이폰 14 256GB', 'Xiaomi 14'],
  ['Redmi Note 14 Pro', 'Xiaomi 14 Pro'],
  ['POCO F6 Pro', 'POCO F6']
];

for (const [evidence, query] of no) {
  test(`reject ${query} <- ${evidence}`, () => {
    assert.equal(matchesRequestedModelLoose(evidence, query), false);
  });
}
