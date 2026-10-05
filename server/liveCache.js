"use strict";

const cache = new Map();

// 첫 검색은 빠른 부분 결과를 반환하고 자체수집기는 뒤에서 계속 모은다.
// 따라서 12초 뒤에는 combined API가 provider의 더 풍부한 스냅샷을 다시 읽도록 한다.
const TTL_MS = 12 * 1000;
const STALE_MS = 2 * 60 * 60 * 1000;

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

  if (now() - item.savedAt > STALE_MS) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

function setCache(key, value) {
  cache.set(key, { savedAt: now(), value });

  if (cache.size > 150) {
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

module.exports = {
  makeKey,
  getFresh,
  getStale,
  setCache,
  withTimeout,
  TTL_MS,
  STALE_MS
};
