'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('실제 매물 이미지 대표이미지 fallback 존재', () => {
  const s = fs.readFileSync(path.join(__dirname,'..','..','script.js'),'utf8');
  assert.match(s, /function maybeAdoptLiveRepresentativeImage/);
  assert.match(s, /current\.imageMode='live-listing'/);
});

test('샤오미 한글 검색 정규화 존재', () => {
  const s = fs.readFileSync(path.join(__dirname,'..','..','script.js'),'utf8');
  assert.match(s, /replace\(\/샤오미\/g,'xiaomi'\)/);
});
