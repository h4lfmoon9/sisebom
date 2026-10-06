'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isJoongmoJoongnaUrl, JOONGMO_HOME } = require('../providers/joongmoReferenceCollector');
const { CONFIG } = require('../providers/browserCollectorCore');

test('Joongmo Joongna detail URLs are recognized', () => {
  assert.equal(isJoongmoJoongnaUrl('https://www.joongmo.com/detail/joonggonara/227647956'), true);
  assert.equal(isJoongmoJoongnaUrl('https://www.joongmo.com/detail/bungaejangtu/394153402'), false);
  assert.equal(CONFIG.joongna.isListing('https://www.joongmo.com/detail/joonggonara/227647956'), true);
  assert.equal(CONFIG.joongna.isListing('https://web.joongna.com/product/227647956'), true);
  assert.equal(JOONGMO_HOME, 'https://www.joongmo.com/');
});
