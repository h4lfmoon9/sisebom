'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  extractJoongnaCardsFromHtml,
  extractJoongnaCardsFromJson
} = require('../providers/joongnaDynamicParser');

const collectorSource = fs.readFileSync(path.join(__dirname, '../providers/browserCollector.js'), 'utf8');

test('V8.2: Joongna embedded items are parsed even without visible product anchors', () => {
  const items = [
    { seq: 232599927, title: '아이폰15 128g 블랙', price: 580000, url: 'https://img2.joongna.com/media/original/a.jpg', state: 0 },
    { seq: 232599732, title: '아이폰15 128g 핑크', price: 560000, url: 'https://img2.joongna.com/media/original/b.jpg', state: 0 }
  ];
  const html = `<script>window.__DATA__=${JSON.stringify({items, changedProductFilterType:null})}</script>`;
  const cards = extractJoongnaCardsFromHtml(html);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].url, 'https://web.joongna.com/product/232599927');
  assert.match(cards[0].text, /580,000원/);
});

test('V8.2: Joongna public JSON feed objects are discovered recursively and deduped', () => {
  const result = extractJoongnaCardsFromJson({
    data: {
      totalCount: 3529,
      items: [
        { seq: 10, title: '아이폰 15 블랙', price: 500000, url: 'https://img2.joongna.com/a.jpg', state: 0 },
        { seq: 11, title: '아이폰15 핑크', price: 520000, url: 'https://img2.joongna.com/b.jpg', state: 0 },
        { seq: 10, title: '아이폰 15 블랙', price: 500000, url: 'https://img2.joongna.com/a.jpg', state: 0 }
      ]
    }
  });
  assert.equal(result.reportedTotal, 3529);
  assert.equal(result.cards.length, 2);
});

test('V8.2 collector listens to Joongna public XHR/fetch responses and keeps dynamic loading', () => {
  assert.match(collectorSource, /page\.on\('response', onResponse\)/);
  assert.match(collectorSource, /\['xhr', 'fetch'\]\.includes\(type\)/);
  assert.match(collectorSource, /extractJoongnaCardsFromJson\(payload\)/);
  assert.match(collectorSource, /extractJoongnaCardsFromHtml\(html\)/);
  assert.match(collectorSource, /JOONGNA_IDLE_ROUNDS/);
  assert.doesNotMatch(collectorSource, /joongnaPagedUrl/);
});

test('V8.2 capacity stays out of marketplace search variants', () => {
  assert.match(collectorSource, /storage is not a search condition/);
  assert.match(collectorSource, /replace\(\/\(\?:\^\|\\s\).*128/);
});
