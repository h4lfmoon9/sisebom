'use strict';

const fs = require('fs');
const path = require('path');
const { discoverOfficialCatalog } = require('./catalogDiscovery');
const { mergeDiscovered } = require('./catalogRules');
const { applyAutoProfileCatalog } = require('./catalogAutoProfile');

const DATA_DIR = path.join(__dirname, 'data');
const DISCOVERY_TTL_MS = Math.max(
  60 * 60 * 1000,
  Math.min(7 * 24 * 60 * 60 * 1000, Number(process.env.SISEBOM_CATALOG_TTL_MS) || 24 * 60 * 60 * 1000)
);

let staticCache = null;
let discoveryRecordsCache = [];
let discoveryPromise = null;
let lastScanAt = 0;
let lastMergedCount = 0;
let lastScanStatus = {
  scannedAt: null,
  discovered: 0,
  added: 0,
  enriched: 0,
  perBrand: {}
};

function readStaticCatalog() {
  const files = fs.existsSync(DATA_DIR)
    ? fs.readdirSync(DATA_DIR).filter(name => name.endsWith('.json')).sort()
    : [];

  const phones = [];

  for (const file of files) {
    if (file === 'manufacturers.json') continue;

    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
      if (Array.isArray(parsed)) phones.push(...parsed);
    } catch (error) {
      console.error(`[catalog] ${file} 읽기 실패:`, error.message);
    }
  }

  return applyAutoProfileCatalog(phones);
}

function getStaticCatalog() {
  if (!staticCache) staticCache = readStaticCatalog();
  return staticCache;
}

function shouldRefresh(force = false) {
  return force || !lastScanAt || Date.now() - lastScanAt > DISCOVERY_TTL_MS;
}

async function refreshDiscovery(force = false) {
  if (!shouldRefresh(force)) return discoveryRecordsCache;
  if (discoveryPromise) return discoveryPromise;

  discoveryPromise = (async () => {
    const staticPhones = getStaticCatalog();
    const result = await discoverOfficialCatalog();

    discoveryRecordsCache = applyAutoProfileCatalog(result.records || []);
    const merged = mergeDiscovered(staticPhones, discoveryRecordsCache);

    lastMergedCount = merged.length;
    lastScanAt = Date.now();
    lastScanStatus = {
      scannedAt: result.scannedAt,
      discovered: discoveryRecordsCache.length,
      added: Math.max(0, merged.length - staticPhones.length),
      enriched: Math.max(0, discoveryRecordsCache.length - Math.max(0, merged.length - staticPhones.length)),
      perBrand: result.perBrand || {}
    };

    return discoveryRecordsCache;
  })().catch(error => {
    lastScanAt = Date.now();
    lastScanStatus = {
      scannedAt: new Date().toISOString(),
      discovered: discoveryRecordsCache.length,
      added: 0,
      enriched: 0,
      perBrand: {},
      error: error?.message || 'catalog discovery failed'
    };
    return discoveryRecordsCache;
  }).finally(() => {
    discoveryPromise = null;
  });

  return discoveryPromise;
}

function startDiscovery(force = false) {
  if (shouldRefresh(force) && !discoveryPromise) {
    void refreshDiscovery(force);
  }
  return getCatalogStatus();
}

async function getLiveCatalog({ force = false, wait = false } = {}) {
  if (wait) await refreshDiscovery(force);
  else startDiscovery(force);

  return applyAutoProfileCatalog(
    mergeDiscovered(getStaticCatalog(), discoveryRecordsCache)
  );
}

function getCatalogStatus() {
  const staticCount = getStaticCatalog().length;
  const mergedCount = lastMergedCount || mergeDiscovered(getStaticCatalog(), discoveryRecordsCache).length;

  return {
    staticCount,
    discoveryRecordCount: discoveryRecordsCache.length,
    totalCount: mergedCount,
    ttlMs: DISCOVERY_TTL_MS,
    scanning: Boolean(discoveryPromise),
    ...lastScanStatus
  };
}

module.exports = {
  getStaticCatalog,
  getLiveCatalog,
  getCatalogStatus,
  refreshDiscovery,
  startDiscovery
};
