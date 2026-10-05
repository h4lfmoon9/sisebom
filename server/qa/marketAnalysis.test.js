'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { robustMarketStats, analyzeMarket } = require('../marketAnalysis');

test('IQR 방식으로 극단적인 가격 하나를 시세 계산에서 제외한다', () => {
  const prices = [470000, 490000, 500000, 510000, 520000, 530000, 540000, 2200000];
  const listings = prices.map((price, i) => ({
    price,
    platform: i % 2 ? '당근' : '번개장터',
    minutes: 30
  }));

  const stats = robustMarketStats(listings);
  assert.equal(stats.count, 8);
  assert.equal(stats.outlierCount, 1);
  assert.ok(stats.median >= 490000 && stats.median <= 530000);
});

test('매물이 충분한 경우 분석 점수와 신뢰도를 만든다', () => {
  const listings = Array.from({ length: 24 }, (_, i) => ({
    price: 450000 + (i % 8) * 10000,
    platform: ['당근', '번개장터', '중고나라'][i % 3],
    minutes: i * 20
  }));

  const analysis = analyzeMarket(listings, {
    query: '아이폰 15 128GB',
    phone: { launchPrices: { '128': 1250000 } }
  });

  assert.ok(analysis.score >= 70);
  assert.equal(analysis.confidence.level, 'high');
  assert.equal(analysis.stats.count, 24);
  assert.ok(analysis.summary.includes('중앙값'));
});

test('매물이 없으면 분석 대기로 반환한다', () => {
  const analysis = analyzeMarket([], { query: '갤럭시 S25' });
  assert.equal(analysis.score, 0);
  assert.equal(analysis.judgement.title, '분석 대기');
});
