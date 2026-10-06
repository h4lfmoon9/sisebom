'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeStaticCatalogV5 } = require('../catalogV5Merge');

test('Korean/English duplicate models merge and old verified data wins', () => {
  const old = {
    id:'galaxy-s24', name:'갤럭시 S24', brand:'Samsung', series:'Galaxy S',
    aliases:['갤럭시S24'], storage:[256,512], specs:{chipset:'Exynos 2400'},
    image:'images/user/s24.png', imageVerified:true
  };
  const seed = {
    id:'v5-samsung-galaxy-s24', name:'Galaxy S24', brand:'Samsung', series:'Galaxy S',
    aliases:['Galaxy S24','S24'], storage:[], specs:{chipset:null},
    image:'', imageVerified:false, catalogExpansion:'final-v5-all-smartphones'
  };
  const out = mergeStaticCatalogV5([old, seed]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'galaxy-s24');
  assert.equal(out[0].specs.chipset, 'Exynos 2400');
  assert.equal(out[0].image, 'images/user/s24.png');
  assert.ok(out[0].aliases.includes('S24'));
});
