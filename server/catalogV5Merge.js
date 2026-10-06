'use strict';

// FINAL V5: existing static catalog + large smartphone seed catalog dedupe/merge.
// Existing records win for verified specs/images; V5 only fills missing metadata/aliases.

function norm(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/samsung/g, 'samsung')
    .replace(/galaxy|갤럭시/g, 'galaxy')
    .replace(/iphone|아이폰/g, 'iphone')
    .replace(/xiaomi|샤오미/g, 'xiaomi')
    .replace(/redmi|레드미/g, 'redmi')
    .replace(/poco|포코/g, 'poco')
    .replace(/motorola|모토로라/g, 'motorola')
    .replace(/google/g, 'google')
    .replace(/pixel|픽셀/g, 'pixel')
    .replace(/울트라/g, 'ultra')
    .replace(/프로\s*맥스/g, 'promax')
    .replace(/pro\s*max/g, 'promax')
    .replace(/프로/g, 'pro')
    .replace(/플러스/g, 'plus')
    .replace(/\+/g, 'plus')
    .replace(/폴드/g, 'fold')
    .replace(/플립/g, 'flip')
    .replace(/와이드/g, 'wide')
    .replace(/점프/g, 'jump')
    .replace(/퀀텀/g, 'quantum')
    .replace(/버디/g, 'buddy')
    .replace(/[^a-z0-9가-힣]/g, '');
}

function keyOf(phone = {}) {
  const brand = norm(phone.brand || '');
  let name = norm(phone.name || '');

  // Existing Samsung records commonly use Korean "갤럭시", seed uses "Galaxy".
  // Xiaomi seed may use English while existing records use Korean.
  if (brand === 'samsung' && name.startsWith('samsung')) name = name.slice('samsung'.length);
  return `${brand}|${name}`;
}

function useful(v) {
  return !(v == null || v === '' || v === '정보 확인 중');
}

function mergeObjectsPreferOld(oldObj = {}, newObj = {}) {
  const out = { ...newObj, ...oldObj };
  for (const [k, v] of Object.entries(newObj || {})) {
    if (!useful(out[k]) && useful(v)) out[k] = v;
  }
  return out;
}

function mergeRecords(old = {}, incoming = {}) {
  const aliases = [...new Set([...(old.aliases || []), ...(incoming.aliases || [])].filter(Boolean))];
  const storage = Array.isArray(old.storage) && old.storage.length
    ? old.storage
    : (Array.isArray(incoming.storage) ? incoming.storage : []);

  return {
    ...incoming,
    ...old,
    id: old.id || incoming.id,
    name: old.name || incoming.name,
    brand: old.brand || incoming.brand,
    series: old.series || incoming.series,
    aliases,
    storage,
    launchPrices: Object.keys(old.launchPrices || {}).length ? old.launchPrices : (incoming.launchPrices || {}),
    specs: mergeObjectsPreferOld(old.specs || {}, incoming.specs || {}),
    scores: mergeObjectsPreferOld(old.scores || {}, incoming.scores || {}),
    colors: Array.isArray(old.colors) && old.colors.length ? old.colors : (incoming.colors || []),
    officialSource: old.officialSource || incoming.officialSource || null,
    image: old.image || incoming.image || '',
    imageVerified: Boolean(old.imageVerified || incoming.imageVerified),
    imageMode: old.imageMode || incoming.imageMode || '',
    catalogExpansion: old.catalogExpansion || incoming.catalogExpansion || null
  };
}

function mergeStaticCatalogV5(phones = []) {
  const out = [];
  const index = new Map();

  for (const phone of Array.isArray(phones) ? phones : []) {
    if (!phone || !phone.name) continue;
    const key = keyOf(phone);
    if (!key || key.endsWith('|')) continue;

    const oldIndex = index.get(key);
    if (oldIndex == null) {
      index.set(key, out.length);
      out.push({ ...phone });
      continue;
    }

    out[oldIndex] = mergeRecords(out[oldIndex], phone);
  }

  return out;
}

module.exports = {
  norm,
  keyOf,
  mergeRecords,
  mergeStaticCatalogV5
};
