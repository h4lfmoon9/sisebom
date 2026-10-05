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

test('unknown storage listings stay visible in capacity search', () => {
  assert.match(script, /x\.storage==null\|\|String\(x\.storage\)===String\(filters\.storage\)/);
});

test('numbered pagination exists', () => {
  assert.match(script, /function renderListingPagination/);
  assert.match(script, /data-page/);
});
