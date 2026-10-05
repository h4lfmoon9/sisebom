'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('frontend has Apple local representative image fallbacks', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', '..', 'script.js'), 'utf8');
  assert.match(script, /images\/apple\/\$\{key\}\.png/);
  assert.match(script, /images\/apple\/provided\/\$\{key\}\.png/);
  assert.match(script, /function productImageCandidates/);
});
