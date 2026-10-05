'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseRegion,
  extractListingImage
} = require('../providers/tavilyIndex');

test('당근 structured nearby heading에서 지역을 뽑는다', () => {
  const text = '채팅 5 관심 9 ## 충북 청주시 서원구 사창동 근처 인기 중고거래';
  assert.equal(parseRegion('daangn', text), '충북 청주시 서원구 사창동');
});

test('번개장터 직거래 장소를 뽑는다', () => {
  const text = '상품 판매 배송비 무료 배송 직거래 장소 경상남도 진주 성북동 구매하기';
  assert.equal(parseRegion('bunjang', text), '경상남도 진주 성북동');
});

test('번개장터 현재 product ID와 일치하는 이미지만 사용한다', () => {
  const listing = 'https://m.bunjang.co.kr/products/432805568';
  const raw = [
    '추천 이미지 https://media.bunjang.co.kr/product/111111111_1_1_w900.jpg',
    '현재 이미지 https://media.bunjang.co.kr/product/432805568_1_1785393225_w900.jpg'
  ].join(' ');
  assert.equal(
    extractListingImage('bunjang', listing, raw),
    'https://media.bunjang.co.kr/product/432805568_1_1785393225_w900.jpg'
  );
});

test('다른 상품 이미지만 있으면 빈 값으로 둔다', () => {
  const listing = 'https://m.bunjang.co.kr/products/432805568';
  const raw = 'https://media.bunjang.co.kr/product/999999999_1_1_w900.jpg';
  assert.equal(extractListingImage('bunjang', listing, raw), '');
});

test('ID 연결 검증이 어려운 플랫폼은 임의 이미지 사용 안 함', () => {
  const raw = 'https://example.com/phone.jpg';
  assert.equal(extractListingImage('daangn', 'https://www.daangn.com/kr/buy-sell/example', raw), '');
  assert.equal(extractListingImage('joongna', 'https://web.joongna.com/product/123', raw), '');
});
