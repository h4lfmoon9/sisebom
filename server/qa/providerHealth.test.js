'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isBlocked, fromProviderData, fromProviderError } = require('../providerHealth');

test('HTTP 403 공개 페이지 제한을 blocked로 표시한다', () => {
  assert.equal(isBlocked({ responseStatus: 403 }), true);
  const status = fromProviderData({
    collectionStatus: 'failed',
    responseStatus: 403,
    listings: [],
    error: '중고나라 공개 검색 페이지 HTTP 403'
  });
  assert.equal(status.ok, false);
  assert.equal(status.blocked, true);
  assert.equal(status.message, '공개 페이지 접근 제한');
});

test('완료됐고 결과가 0개인 정상 검색은 실패로 만들지 않는다', () => {
  const status = fromProviderData({
    collectionStatus: 'done',
    listings: [],
    candidateCount: 0
  });
  assert.equal(status.ok, true);
  assert.equal(status.blocked, false);
});

test('일반 예외는 실패로 표시한다', () => {
  const status = fromProviderError(new Error('timeout'));
  assert.equal(status.ok, false);
  assert.equal(status.collectionStatus, 'failed');
});
