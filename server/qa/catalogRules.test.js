'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { extractNames, buildDiscoveredRecord, mergeDiscovered } = require('../catalogRules');

test('Apple 공식 페이지 문구에서 새 iPhone 모델을 찾는다', () => {
  const names = extractNames('apple', 'New iPhone Duo / iPhone 18 Pro 및 iPhone 18 Pro Max / iPhone Air');
  assert.ok(names.includes('iPhone Duo'));
  assert.ok(names.includes('iPhone 18 Pro'));
  assert.ok(names.includes('iPhone 18 Pro Max'));
  assert.ok(names.includes('iPhone Air'));
});

test('Samsung 공식 페이지 문구에서 S/Z/A 모델을 찾는다', () => {
  const names = extractNames('samsung', 'Galaxy S26 Ultra Galaxy S26 FE Galaxy Z Fold8 Galaxy A37 5G');
  assert.ok(names.includes('갤럭시 S26 Ultra'));
  assert.ok(names.includes('갤럭시 S26 FE'));
  assert.ok(names.includes('갤럭시 Z Fold8'));
  assert.ok(names.includes('갤럭시 A37'));
});

test('Xiaomi/Redmi/POCO를 찾고 Pad를 넣지 않는다', () => {
  const names = extractNames('xiaomi', 'Xiaomi 16 Ultra REDMI Note 15 Pro 5G POCO X8 Pro Xiaomi Pad Mini');
  assert.ok(names.includes('Xiaomi 16 Ultra'));
  assert.ok(names.some(x => /^Redmi Note 15 Pro/i.test(x)));
  assert.ok(names.includes('POCO X8 Pro'));
  assert.equal(names.some(x => /Pad/i.test(x)), false);
});

test('Motorola g/edge/razr를 찾는다', () => {
  const names = extractNames('motorola', 'moto g77 motorola edge 50 pro motorola razr 60 ultra');
  assert.ok(names.includes('moto g77'));
  assert.ok(names.includes('motorola edge 50 Pro'));
  assert.ok(names.includes('motorola razr 60 Ultra'));
});

test('기존 모델은 자동발견으로 중복 추가하지 않는다', () => {
  const existing = [{ id: 'iphone-18-pro', name: 'iPhone 18 Pro', aliases: ['아이폰 18 프로'] }];
  const found = [
    buildDiscoveredRecord('apple', 'iPhone 18 Pro', 'https://www.apple.com/kr/iphone/'),
    buildDiscoveredRecord('apple', 'iPhone Duo', 'https://www.apple.com/kr/iphone/')
  ];
  const merged = mergeDiscovered(existing, found);
  assert.equal(merged.length, 2);
});
