'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractJoongnaCardsFromHtml } = require('../providers/joongnaDynamicParser');
const { fetchJoongnaDirect, totalFromHtml, buildDirectUrls } = require('../providers/joongnaDirectFetcher');

const html = String.raw`<html><body><div>총 4,116개</div><script>self.__next_f.push([1,"{\\"items\\":[{\\"seq\\":232647914,\\"price\\":580000,\\"title\\":\\"아이폰15 256 블랙\\",\\"url\\":\\"https://img2.joongna.com/a.jpg\\",\\"state\\":0},{\\"seq\\":232647915,\\"price\\":400000,\\"title\\":\\"아이폰15 블루 256GB\\",\\"url\\":\\"https://img2.joongna.com/b.jpg\\",\\"state\\":0}],\\"changedProductFilterType\\":null}"])</script></body></html>`;

test('SSR HTML items are parsed into Joongna product cards', () => {
  const cards = extractJoongnaCardsFromHtml(html);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].url, 'https://web.joongna.com/product/232647914');
  assert.match(cards[0].title, /아이폰15/);
});

test('reported total is read from public search HTML', () => {
  assert.equal(totalFromHtml(html), 4116);
});

test('direct fetch uses plain and recent public search URLs', () => {
  const urls = buildDirectUrls('아이폰 15');
  assert.equal(urls.length, 2);
  assert.match(urls[0], /web\.joongna\.com\/search/);
  assert.match(urls[1], /RECENT_SORT/);
});

test('direct fetch works without Playwright when public HTML is available', async () => {
  const originalFetch = global.fetch;
  global.fetch = async url => ({
    ok: true,
    status: 200,
    url: String(url),
    async text() { return html; }
  });

  try {
    const result = await fetchJoongnaDirect('아이폰 15');
    assert.equal(result.count, 2);
    assert.equal(result.reportedTotal, 4116);
    assert.ok(result.attempts.every(x => x.status === 200));
  } finally {
    global.fetch = originalFetch;
  }
});
