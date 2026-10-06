'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const collector = fs.readFileSync(path.join(__dirname, '..', 'providers', 'browserCollector.js'), 'utf8');
const core = fs.readFileSync(path.join(__dirname, '..', 'providers', 'browserCollectorCore.js'), 'utf8');

test('Joongna search URL does not use assumed RECENT_SORT token', () => {
  assert.equal(core.includes('RECENT_SORT'), false);
});

test('Joongna collector handles numbered pagination buttons', () => {
  assert.match(collector, /clickJoongnaNextNumberedPage/);
  assert.match(collector, /\^\\d\+\$/);
});

test('Joongna waits for listing signature to change', () => {
  assert.match(collector, /joongnaListingSignature/);
  assert.match(collector, /after !== before/);
});

test('Joongna zero results records diagnostics', () => {
  assert.match(collector, /Render 브라우저 접근을 제한/);
  assert.match(collector, /페이지 구조 변경 가능성/);
});
