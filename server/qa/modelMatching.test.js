'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseTarget,
  titleGenerationInfo,
  matchesRequestedModel,
  filterAndDedupeListings
} = require('../listingQuality');

test('iPhone 15 일반형과 Pro/Pro Max를 구분한다', () => {
  assert.equal(matchesRequestedModel('아이폰15 128GB 블루', '아이폰 15'), true);
  assert.equal(matchesRequestedModel('아이폰15 프로 128GB', '아이폰 15'), false);
  assert.equal(matchesRequestedModel('아이폰15 프로맥스 256GB', '아이폰 15'), false);
  assert.equal(matchesRequestedModel('아이폰15 프로 128GB', '아이폰 15 프로'), true);
  assert.equal(matchesRequestedModel('아이폰15 프로맥스 256GB', '아이폰 15 프로'), false);
});

test('구형 S/C/G/GS 모델을 서로 섞지 않는다', () => {
  assert.equal(matchesRequestedModel('아이폰 3GS 32GB', '아이폰 3GS'), true);
  assert.equal(matchesRequestedModel('아이폰 3G 16GB', '아이폰 3GS'), false);

  assert.equal(matchesRequestedModel('아이폰 5s 64GB', '아이폰 5s'), true);
  assert.equal(matchesRequestedModel('아이폰 5c 32GB', '아이폰 5s'), false);
  assert.equal(matchesRequestedModel('아이폰 5 32GB', '아이폰 5s'), false);

  assert.equal(matchesRequestedModel('아이폰 6s Plus 128GB', '아이폰 6s Plus'), true);
  assert.equal(matchesRequestedModel('아이폰 6 Plus 128GB', '아이폰 6s Plus'), false);
  assert.equal(matchesRequestedModel('아이폰 6s 128GB', '아이폰 6s Plus'), false);
});

test('iPhone Air는 다른 숫자 모델과 분리한다', () => {
  assert.deepEqual(parseTarget('아이폰 에어'), { family: 'air', generation: 'air', variant: 'air' });
  assert.deepEqual(titleGenerationInfo('Apple iPhone Air 256GB'), { generation: 'air', variant: 'air' });
  assert.equal(matchesRequestedModel('Apple iPhone Air 256GB', '아이폰 에어'), true);
  assert.equal(matchesRequestedModel('아이폰 17 256GB', '아이폰 에어'), false);
});

test('SE 세대를 정확히 구분한다', () => {
  assert.equal(matchesRequestedModel('아이폰 SE 3세대 128GB', '아이폰 SE 3세대'), true);
  assert.equal(matchesRequestedModel('아이폰 SE 2세대 128GB', '아이폰 SE 3세대'), false);
});

test('본문의 케이스/예약중 추천문구 때문에 정상 휴대폰을 버리지 않는다', () => {
  const rows = [{
    source: 'daangn',
    platform: '당근',
    title: '아이폰 15 128GB 블랙',
    modelText: '아이폰 15 128GB 블랙',
    description: '케이스 같이 드려요. 주변 인기 매물 예약중',
    status: '판매중',
    price: 500000,
    url: 'https://example.com/1'
  }];

  const result = filterAndDedupeListings(rows, '아이폰 15');
  assert.equal(result.listings.length, 1);
  assert.equal(result.excluded.accessory, 0);
  assert.equal(result.excluded.unavailable, 0);
});

test('실제 판매완료 상태와 너무 싼 iPhone 15 가격은 제거한다', () => {
  const rows = [
    {
      source: 'x', platform: '당근', title: '아이폰 15 128GB',
      modelText: '아이폰 15 128GB', status: '판매완료',
      price: 500000, url: 'https://example.com/a'
    },
    {
      source: 'x', platform: '중고나라', title: '아이폰 15 128GB',
      modelText: '아이폰 15 128GB', status: '판매중',
      price: 20000, url: 'https://example.com/b'
    }
  ];

  const result = filterAndDedupeListings(rows, '아이폰 15');
  assert.equal(result.listings.length, 0);
  assert.equal(result.excluded.unavailable, 1);
  assert.equal(result.excluded.suspiciousPrice, 1);
});
