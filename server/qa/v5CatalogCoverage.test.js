'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const file = path.join(__dirname, '..', 'data', 'final-v5-expanded-smartphones.json');
const phones = JSON.parse(fs.readFileSync(file, 'utf8'));

test('FINAL V5 catalog is broad and smartphone-only seed', () => {
  assert.ok(Array.isArray(phones));
  assert.ok(phones.length >= 2000, `expected >=2000, got ${phones.length}`);

  const names = new Set(phones.map(x => x.name));
  for (const required of [
    'Galaxy Wide7','Galaxy Jump3','Galaxy Quantum5','Galaxy Buddy3',
    'Galaxy S26 Ultra','Galaxy Z Fold8 Ultra','Galaxy Z Flip8',
    'Xiaomi 17 Ultra','Redmi Note 17 Pro 5G','POCO F9 Pro',
    'Motorola Edge 70','Motorola Razr 70 Ultra',
    'Google Pixel 11 Pro Fold','Sony Xperia VIII','LG V60 ThinQ',
    'OnePlus 15','OPPO Find N6','vivo X500 Pro Max','iQOO 16',
    'realme 16 Pro+','Huawei Mate 80 Pro Max','ASUS ROG Phone 9 Pro',
    'Nothing Phone (3)','CMF Phone 2 Pro','HMD Skyline',
    'REDMAGIC 11 Pro','TECNO Phantom V Fold2','Fairphone (Gen. 6)'
  ]) assert.ok(names.has(required), `missing ${required}`);

  for (const p of phones) {
    assert.equal(p.image || '', '');
    assert.equal(/tablet|watch|buds|pad/i.test(String(p.series || '')), false);
  }
});

test('FINAL V5 seed has no duplicate brand+name rows', () => {
  const seen = new Set();
  for (const p of phones) {
    const key = `${String(p.brand).toLowerCase()}|${String(p.name).toLowerCase()}`;
    assert.equal(seen.has(key), false, `duplicate ${key}`);
    seen.add(key);
  }
});
