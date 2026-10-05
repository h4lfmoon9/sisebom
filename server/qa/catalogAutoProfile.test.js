'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { applyAutoProfile, estimatePerformance, extractQuickSpecsFromText } = require('../catalogAutoProfile');

test('Galaxy S24 Ultra 자동 프로필', () => {
  const p = applyAutoProfile({ name:'갤럭시 S24 Ultra', brand:'Samsung', series:'Galaxy S', storage:[], scores:{} });
  assert.deepEqual(p.storage, [256,512,1024]);
  assert.ok(p.scores.performance >= 85);
});

test('Xiaomi 14 자동 프로필', () => {
  const p = applyAutoProfile({ name:'Xiaomi 14', brand:'Xiaomi', series:'Xiaomi', storage:[], scores:{} });
  assert.ok(p.storage.includes(256));
  assert.ok(p.scores.performance >= 90);
});

test('공식 카드 텍스트 스펙 추출', () => {
  const s = extractQuickSpecsFromText('Snapdragon 8 Gen 3 · 6.8인치 AMOLED 120Hz · 200MP 카메라 · 45W 고속 충전');
  assert.match(s.chipset, /Snapdragon/i);
  assert.match(s.display, /AMOLED/i);
  assert.equal(s.camera, '200MP 카메라');
  assert.equal(s.charging, '45W 충전');
});

test('Motorola Razr 자동 점수', () => {
  assert.ok(estimatePerformance({ name:'motorola razr 60 Ultra', brand:'Motorola' }) >= 80);
});
