'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesRequestedModelLoose } = require('../modelMatchLoose');

test('Samsung carrier names and shorthand match', () => {
  assert.equal(matchesRequestedModelLoose('갤럭시 와이드7 128기가 판매', '갤럭시 와이드7'), true);
  assert.equal(matchesRequestedModelLoose('점프3 128GB 상태좋음', '갤럭시 점프3'), true);
  assert.equal(matchesRequestedModelLoose('퀀텀5 공기계', '갤럭시 퀀텀5'), true);
});

test('variant isolation remains strict', () => {
  assert.equal(matchesRequestedModelLoose('S24 256GB', '갤럭시 S24'), true);
  assert.equal(matchesRequestedModelLoose('S24 울트라 256GB', '갤럭시 S24'), false);
  assert.equal(matchesRequestedModelLoose('POCO F6 Pro 512GB', 'POCO F6'), false);
  assert.equal(matchesRequestedModelLoose('edge 50 pro', 'Motorola Edge 50'), false);
  assert.equal(matchesRequestedModelLoose('픽셀 9 프로', 'Google Pixel 9'), false);
  assert.equal(matchesRequestedModelLoose('아이폰15 프로맥스', '아이폰15 프로'), false);
});

test('Xiaomi and Motorola shorthand works', () => {
  assert.equal(matchesRequestedModelLoose('레드미 노트14 프로 256기가', 'Redmi Note 14 Pro'), true);
  assert.equal(matchesRequestedModelLoose('edge 50 256GB', 'Motorola Edge 50'), true);
  assert.equal(matchesRequestedModelLoose('razr 60 ultra', 'Motorola Razr 60 Ultra'), true);
});
