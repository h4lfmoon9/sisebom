'use strict';

function n(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/iphone|아이폰/g, 'iphone')
    .replace(/galaxy|갤럭시/g, 'galaxy')
    .replace(/xiaomi|샤오미/g, 'xiaomi')
    .replace(/redmi|레드미/g, 'redmi')
    .replace(/poco|포코/g, 'poco')
    .replace(/motorola|모토로라|moto/g, 'motorola')
    .replace(/울트라/g, 'ultra')
    .replace(/프로\s*맥스/g, 'promax')
    .replace(/pro\s*max/g, 'promax')
    .replace(/프로/g, 'pro')
    .replace(/플러스/g, 'plus')
    .replace(/\+/g, 'plus')
    .replace(/폴드/g, 'fold')
    .replace(/플립/g, 'flip')
    .replace(/노트/g, 'note')
    .replace(/미니/g, 'mini')
    .replace(/에어/g, 'air')
    .replace(/[^a-z0-9가-힣]/g, '');
}

function variantFromTail(tail = '') {
  if (/promax/.test(tail)) return 'promax';
  if (/ultra|^u(?:\d|$)/.test(tail)) return 'ultra';
  if (/proplus/.test(tail)) return 'proplus';
  if (/pro/.test(tail)) return 'pro';
  if (/plus/.test(tail)) return 'plus';
  if (/fe/.test(tail)) return 'fe';
  if (/mini/.test(tail)) return 'mini';
  return 'base';
}

function sameVariant(target, actual) {
  if (target === actual) return true;
  if (target === 'plus' && actual === 'proplus') return false;
  return false;
}

function hasCompetingBrand(e, allowed) {
  const brands = ['iphone','galaxy','xiaomi','redmi','poco','motorola'];
  return brands.some(b => b !== allowed && e.includes(b));
}

function parseTarget(query = '') {
  const q = n(query);

  let m = q.match(/galaxy(s|a|m)(\d{2})(ultra|plus|fe)?/);
  if (m) return { brand:'galaxy', family:`${m[1]}${m[2]}`, variant:m[3] || 'base' };

  m = q.match(/galaxy(?:z)?(fold|flip)(\d{1,2})(ultra|fe)?/);
  if (m) return { brand:'galaxy', family:`${m[1]}${m[2]}`, variant:m[3] || 'base' };

  m = q.match(/xiaomi(\d{2}[a-z]?)(ultra|pro|lite)?/);
  if (m) return { brand:'xiaomi', family:m[1], variant:m[2] || 'base' };

  m = q.match(/redmi(note)?(\d{1,2}[a-z]?)(proplus|pro|plus)?/);
  if (m) return { brand:'redmi', family:`${m[1] ? 'note' : ''}${m[2]}`, variant:m[3] || 'base' };

  m = q.match(/poco([fxm]\d{1,2})(pro)?/);
  if (m) return { brand:'poco', family:m[1], variant:m[2] || 'base' };

  m = q.match(/motorola(edge|razr)(\d{1,3})(ultra|pro|fusion|neo)?/);
  if (m) return { brand:'motorola', family:`${m[1]}${m[2]}`, variant:m[3] || 'base' };

  m = q.match(/motorolag(\d{1,3})/);
  if (m) return { brand:'motorola', family:`g${m[1]}`, variant:'base' };

  return null;
}

function actualForTarget(evidence = '', target) {
  const e = n(evidence);

  if (target.brand === 'galaxy') {
    let re;
    if (/^(s|a|m)\d{2}$/.test(target.family)) {
      re = new RegExp(`(?:galaxy)?${target.family}(ultra|u|plus|fe)?`);
    } else {
      re = new RegExp(`(?:galaxy(?:z)?)?${target.family}(ultra|fe)?`);
    }

    const m = e.match(re);
    if (!m) return null;

    let variant = m[1] || 'base';
    if (variant === 'u') variant = 'ultra';
    return { brand:'galaxy', family:target.family, variant };
  }

  if (target.brand === 'xiaomi') {
    if (hasCompetingBrand(e, 'xiaomi')) return null;
    const m = e.match(new RegExp(`(?:xiaomi)?${target.family}(ultra|pro|lite)?`));
    if (!m) return null;
    return { brand:'xiaomi', family:target.family, variant:m[1] || 'base' };
  }

  if (target.brand === 'redmi') {
    if (hasCompetingBrand(e, 'redmi')) return null;
    const m = e.match(new RegExp(`(?:redmi)?${target.family}(proplus|pro|plus)?`));
    if (!m) return null;
    return { brand:'redmi', family:target.family, variant:m[1] || 'base' };
  }

  if (target.brand === 'poco') {
    if (hasCompetingBrand(e, 'poco')) return null;
    const m = e.match(new RegExp(`(?:poco)?${target.family}(pro)?`));
    if (!m) return null;
    return { brand:'poco', family:target.family, variant:m[1] || 'base' };
  }

  if (target.brand === 'motorola') {
    if (hasCompetingBrand(e, 'motorola')) return null;
    const m = e.match(new RegExp(`(?:motorola)?${target.family}(ultra|pro|fusion|neo)?`));
    if (!m) return null;
    return { brand:'motorola', family:target.family, variant:m[1] || 'base' };
  }

  return null;
}

function matchesRequestedModelLoose(evidence = '', query = '') {
  const target = parseTarget(query);
  if (!target) return false;

  const actual = actualForTarget(evidence, target);
  if (!actual) return false;

  return actual.brand === target.brand &&
    actual.family === target.family &&
    sameVariant(target.variant, actual.variant);
}

module.exports = {
  n,
  parseTarget,
  matchesRequestedModelLoose
};
