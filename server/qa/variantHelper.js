'use strict';

function hasStorageToken(query = '') {
  return /(?:32|64|128|256|512|1024|2048)\s*(?:gb|g|기가)?\b|(?:1|2)\s*(?:tb|테라)\b/i.test(String(query));
}

function compactPhoneQuery(query = '') {
  return String(query)
    .trim()
    .replace(/아이폰\s+(\d|x|se|air)/ig, '아이폰$1')
    .replace(/iphone\s+(\d|x|se|air)/ig, 'iphone$1')
    .replace(/갤럭시\s+([a-z]\d)/ig, '갤럭시$1')
    .replace(/galaxy\s+([a-z]\d)/ig, 'galaxy$1')
    .replace(/\s{2,}/g, ' ');
}

function buildSearchVariants(query = '') {
  const q = String(query).trim();
  const variants = [];
  const add = value => {
    const v = String(value || '').trim();
    if (v && !variants.some(x => x.toLowerCase() === v.toLowerCase())) variants.push(v);
  };

  add(q);
  add(compactPhoneQuery(q));

  if (!hasStorageToken(q)) {
    for (const storage of ['128GB', '256GB', '512GB', '64GB']) add(`${q} ${storage}`);
  }

  return variants.slice(0, 6);
}

module.exports = { buildSearchVariants };
