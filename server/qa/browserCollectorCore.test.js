'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canonicalUrl,
  parsePrice,
  parseStorage,
  parseRegion,
  normalizeImage,
  normalizeBrowserCard
} = require('../providers/browserCollectorCore');

test('검색 매물 URL의 추적 파라미터를 제거한다', () => {
  assert.equal(
    canonicalUrl('https://m.bunjang.co.kr/products/12345?utm_source=x#top'),
    'https://m.bunjang.co.kr/products/12345'
  );
});

test('원 단위와 만원 단위 가격을 읽는다', () => {
  assert.equal(parsePrice('', '아이폰15 57만9천원', '아이폰 15'), 579000);
  assert.equal(parsePrice('', '아이폰15 590,000원', '아이폰 15'), 590000);
});

test('용량을 읽는다', () => {
  assert.equal(parseStorage('아이폰15 256GB'), 256);
  assert.equal(parseStorage('아이폰 15 Pro 1TB'), 1024);
});

test('당근 카드의 동네/시간 형태에서 지역을 읽는다', () => {
  assert.equal(parseRegion('daangn', '아이폰15 500,000원 호계동 · 3시간 전'), '호계동');
});

test('사이트 로고는 이미지로 사용하지 않는다', () => {
  assert.equal(
    normalizeImage('daangn', 'https://www.daangn.com/kr/buy-sell/x', 'https://www.daangn.com/assets/logo.png'),
    ''
  );
});

test('브라우저 카드 하나를 시세봄 매물 형식으로 변환한다', () => {
  const item = normalizeBrowserCard('daangn', {
    url: 'https://www.daangn.com/kr/buy-sell/iphone-15-test',
    title: '아이폰 15 128GB 블루',
    text: '아이폰 15 128GB 블루\n500,000원\n호계동 · 3시간 전',
    image: 'https://dnvefa72aowie.cloudfront.net/origin/article/test.webp'
  }, '아이폰 15', 0);

  assert.equal(item.platform, '당근');
  assert.equal(item.price, 500000);
  assert.equal(item.storage, 128);
  assert.equal(item.region, '호계동');
  assert.equal(item.timeText, '3시간전');
  assert.ok(item.image.includes('cloudfront.net'));
});
