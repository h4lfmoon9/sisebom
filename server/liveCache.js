"use strict";

const cache = new Map();
const TTL_MS = 90 * 1000;
const STALE_MS = 10 * 60 * 1000;

function now() { return Date.now(); }
function makeKey(query, region, limit) {
  return `${String(query).trim().toLowerCase()}|${String(region || "")}|${Number(limit) || 30}`;
}
function getFresh(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (now() - item.savedAt > TTL_MS) return null;
  return item.value;
}
function getStale(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (now() - item.savedAt > STALE_MS) { cache.delete(key); return null; }
  return item.value;
}
function setCache(key, value) {
  cache.set(key, { savedAt: now(), value });
  if (cache.size > 120) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const e = new Error(`${label} 응답 시간 초과`);
      e.statusCode = 504;
      reject(e);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
module.exports = { makeKey, getFresh, getStale, setCache, withTimeout, TTL_MS, STALE_MS };
