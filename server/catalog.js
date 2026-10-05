'use strict';

const fs = require('fs');
const path = require('path');
const { discoverOfficialCatalog } = require('./catalogDiscovery');
const { mergeDiscovered } = require('./catalogRules');

const DATA_DIR = path.join(__dirname, 'data');
const DISCOVERY_TTL_MS = Math.max(
  60 * 60 * 1000,
  Math.min(7 * 24 * 60 * 60 * 1000, Number(process.env.SISEBOM_CATALOG_TTL_MS) || 24 * 60 * 60 * 1000)
);

let staticCache = null;
let discoveredCache = [];
let discoveryPromise = null;
let lastScanAt = 0;
let lastScanStatus = {
  scannedAt: null,
  discovered: 0,
  added: 0,
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

  return phones;
}

function getStaticCatalog() {
  if (!staticCache) staticCache = readStaticCatalog();
  return staticCache;
}

function shouldRefresh(force = false) {
  return force || !lastScanAt || Date.now() - lastScanAt > DISCOVERY_TTL_MS;
}

async function refreshDiscovery(force = false) {
  if (!shouldRefresh(force)) return discoveredCache;
  if (discoveryPromise) return discoveryPromise;

  discoveryPromise = (async () => {
    const staticPhones = getStaticCatalog();
    const result = await discoverOfficialCatalog();
    const merged = mergeDiscovered(staticPhones, result.records || []);

    discoveredCache = merged.slice(staticPhones.length);
    lastScanAt = Date.now();
    lastScanStatus = {
      scannedAt: result.scannedAt,
      discovered: (result.records || []).length,
      added: discoveredCache.length,
      perBrand: result.perBrand || {}
    };

    return discoveredCache;
  })().catch(error => {
    lastScanAt = Date.now();
    lastScanStatus = {
      scannedAt: new Date().toISOString(),
      discovered: 0,
      added: discoveredCache.length,
      perBrand: {},
      error: error?.message || 'catalog discovery failed'
    };
    return discoveredCache;
  }).finally(() => {
    discoveryPromise = null;
  });

  return discoveryPromise;
}

function startDiscovery(force = false) {
  if (shouldRefresh(force) && !discoveryPromise) {
    // 요청을 오래 붙잡지 않고 백그라운드에서 공식 카탈로그를 확인한다.
    void refreshDiscovery(force);
  }
  return getCatalogStatus();
}

async function getLiveCatalog({ force = false, wait = false } = {}) {
  if (wait) {
    await refreshDiscovery(force);
  } else {
    startDiscovery(force);
  }

  return mergeDiscovered(getStaticCatalog(), discoveredCache);
}

function getCatalogStatus() {
  return {
    staticCount: getStaticCatalog().length,
    discoveredCount: discoveredCache.length,
    totalCount: getStaticCatalog().length + discoveredCache.length,
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
