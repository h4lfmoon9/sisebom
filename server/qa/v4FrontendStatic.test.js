'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const script = fs.readFileSync(path.join(__dirname,'..','..','script.js'),'utf8');

test('9 listings per page', () => {
  assert.match(script, /const LISTINGS_PER_PAGE=9/);
  assert.match(script, /slice\(startIndex,startIndex\+LISTINGS_PER_PAGE\)/);
});

test('1TB hidden from storage choices', () => {
  assert.match(script, /x<=512/);
  assert.match(script, /v<=512/);
});

test('V8 이후 용량은 중고매물 필터 조건으로 사용하지 않는다', () => {
  assert.doesNotMatch(script, /if\(filters\.storage!==['"]all['"]\)a=a\.filter/);
  assert.match(script, /function liveSearchQuery\(\)\{[\s\S]*return buildListingQuery\(current\);/);
});

test('numbered pagination exists', () => {
  assert.match(script, /function renderListingPagination/);
  assert.match(script, /data-page/);
});
