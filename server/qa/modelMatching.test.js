'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalModelKey, matchesRequestedModel, filterAndDedupeListings } = require('../listingQuality');

test('iPhone 일반/Pro/Pro Max 구분', () => {
  assert.equal(matchesRequestedModel('아이폰15 128GB', '아이폰 15'), true);
  assert.equal(matchesRequestedModel('아이폰15 프로 128GB', '아이폰 15'), false);
  assert.equal(matchesRequestedModel('아이폰15 프로맥스 256GB', '아이폰 15 프로맥스'), true);
});

test('Galaxy S Ultra/FE/기본형 구분', () => {
  assert.equal(canonicalModelKey('Galaxy S26 Ultra'), 'samsung:s26:ultra');
  assert.equal(matchesRequestedModel('갤럭시 S26 울트라 256GB', '갤럭시 S26 Ultra'), true);
  assert.equal(matchesRequestedModel('갤럭시 S26 FE 256GB', '갤럭시 S26 Ultra'), false);
  assert.equal(matchesRequestedModel('갤럭시 S26 256GB', '갤럭시 S26'), true);
});

test('Galaxy Z Fold/Flip 구분', () => {
  assert.equal(matchesRequestedModel('갤럭시 Z Fold8 512GB', 'Galaxy Z Fold8'), true);
  assert.equal(matchesRequestedModel('갤럭시 Z Flip8 256GB', 'Galaxy Z Fold8'), false);
});

test('Xiaomi/Redmi/POCO 구분', () => {
  assert.equal(matchesRequestedModel('Xiaomi 16 Ultra 512GB', 'Xiaomi 16 Ultra'), true);
  assert.equal(matchesRequestedModel('Xiaomi 16 Pro 512GB', 'Xiaomi 16 Ultra'), false);
  assert.equal(matchesRequestedModel('Redmi Note 15 Pro 5G', 'Redmi Note 15 Pro'), true);
  assert.equal(matchesRequestedModel('POCO X8 Pro 512GB', 'POCO X8 Pro'), true);
});

test('Motorola 구분', () => {
  assert.equal(matchesRequestedModel('moto g77 256GB', 'moto g77'), true);
  assert.equal(matchesRequestedModel('motorola edge 50 Pro', 'motorola edge 50 Pro'), true);
  assert.equal(matchesRequestedModel('motorola razr 60 Ultra', 'motorola razr 60'), false);
});

test('본문 케이스 언급 정상매물 유지', () => {
  const result = filterAndDedupeListings([{
    source:'daangn', platform:'당근', title:'갤럭시 S26 256GB',
    modelText:'갤럭시 S26 256GB', description:'케이스 같이 드립니다',
    status:'판매중', price:700000, url:'https://example.com/1'
  }], '갤럭시 S26');
  assert.equal(result.listings.length, 1);
});
