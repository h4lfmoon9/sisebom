'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('대표이미지는 실제 매물 사진으로 자동 교체하지 않는다', () => {
  const s = fs.readFileSync(path.join(__dirname,'..','..','script.js'),'utf8');
  assert.match(s, /function maybeAdoptLiveRepresentativeImage/);
  assert.match(s, /대표이미지 자동 삽입 중단/);
  assert.doesNotMatch(s, /current\.imageMode='live-listing'/);
});

test('샤오미 한글 검색 정규화 존재', () => {
  const s = fs.readFileSync(path.join(__dirname,'..','..','script.js'),'utf8');
  assert.match(s, /replace\(\/샤오미\/g,'xiaomi'\)/);
});
