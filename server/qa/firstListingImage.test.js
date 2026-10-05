'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractFirstImageFromHtml,
  validateListingImage,
  shouldFetchListingImage
} = require('../providers/tavilyIndex');

test('당근 원본 페이지의 og:image를 첫 매물 사진으로 사용한다', () => {
  const page = 'https://www.daangn.com/kr/buy-sell/iphone-example';
  const html = `
    <html><head>
      <meta property="og:image" content="https://dnvefa72aowie.cloudfront.net/origin/article/202610/abc123.webp">
    </head></html>
  `;
  assert.equal(
    extractFirstImageFromHtml('daangn', page, html),
    'https://dnvefa72aowie.cloudfront.net/origin/article/202610/abc123.webp'
  );
});

test('중고나라 원본 페이지의 twitter:image도 사용할 수 있다', () => {
  const page = 'https://web.joongna.com/product/232863901';
  const html = `
    <meta name="twitter:image" content="https://img.example-cdn.com/joongna/232863901/1.jpg">
  `;
  assert.equal(
    extractFirstImageFromHtml('joongna', page, html),
    'https://img.example-cdn.com/joongna/232863901/1.jpg'
  );
});

test('번개장터는 현재 상품 ID가 같은 첫 사진만 허용한다', () => {
  const page = 'https://m.bunjang.co.kr/products/432805568';

  assert.equal(
    validateListingImage(
      'bunjang',
      page,
      'https://media.bunjang.co.kr/product/432805568_1_1785393225_w900.jpg'
    ),
    'https://media.bunjang.co.kr/product/432805568_1_1785393225_w900.jpg'
  );

  assert.equal(
    validateListingImage(
      'bunjang',
      page,
      'https://media.bunjang.co.kr/product/999999999_1_1_w900.jpg'
    ),
    ''
  );
});

test('로고/기본 이미지 같은 사이트 자산은 매물 사진으로 쓰지 않는다', () => {
  const page = 'https://web.joongna.com/product/123';
  const html = `<meta property="og:image" content="https://web.joongna.com/images/default-og-image.png">`;
  assert.equal(extractFirstImageFromHtml('joongna', page, html), '');
});

test('다른 모델/액세서리 매물은 원본 이미지 fetch 대상에서 제외한다', () => {
  assert.equal(shouldFetchListingImage({
    source: 'daangn',
    title: '아이폰 15 프로 케이스',
    modelText: '아이폰 15 프로 케이스',
    url: 'https://www.daangn.com/kr/buy-sell/x',
    status: '판매중'
  }, '아이폰 15'), false);

  assert.equal(shouldFetchListingImage({
    source: 'daangn',
    title: '아이폰 15 128GB 블루',
    modelText: '아이폰 15 128GB 블루',
    url: 'https://www.daangn.com/kr/buy-sell/y',
    status: '판매중'
  }, '아이폰 15'), true);
});
