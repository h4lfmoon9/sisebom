'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  metaAttributes,
  parseFirstImageFromHtml
} = require('../providers/listingImageEnricher');

test('og:image를 속성 순서와 관계없이 읽는다', () => {
  const a = '<meta property="og:image" content="https://example.com/item.jpg">';
  const b = '<meta content="https://example.com/item2.jpg" property="og:image">';
  assert.equal(parseFirstImageFromHtml(a), 'https://example.com/item.jpg');
  assert.equal(parseFirstImageFromHtml(b), 'https://example.com/item2.jpg');
});

test('twitter:image도 읽고 HTML entity를 해제한다', () => {
  const html = '<meta name="twitter:image" content="https://example.com/a.jpg?x=1&amp;y=2">';
  assert.equal(parseFirstImageFromHtml(html), 'https://example.com/a.jpg?x=1&y=2');
});

test('관계없는 meta는 이미지로 쓰지 않는다', () => {
  assert.equal(parseFirstImageFromHtml('<meta name="description" content="hello">'), '');
});

test('meta attribute parser', () => {
  const attrs = metaAttributes('<meta content="abc" property="og:image">');
  assert.equal(attrs.property, 'og:image');
  assert.equal(attrs.content, 'abc');
});
