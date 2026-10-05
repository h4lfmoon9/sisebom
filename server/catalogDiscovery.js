'use strict';
// FINAL_V3_OFFICIAL_ENRICH

const { getBrowser } = require('./providers/browserCollector');
const { MANUFACTURERS, extractNames, officialUrl, buildDiscoveredRecord } = require('./catalogRules');
const { extractQuickSpecsFromText } = require('./catalogAutoProfile');

const PAGE_TIMEOUT_MS = Math.max(6000, Math.min(30000, Number(process.env.SISEBOM_CATALOG_PAGE_TIMEOUT_MS) || 12000));
const PER_BRAND_MAX_MS = Math.max(8000, Math.min(45000, Number(process.env.SISEBOM_CATALOG_BRAND_MAX_MS) || 22000));

async function collectTextNodes(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('h1,h2,h3,h4,a,[data-testid*="product" i],[class*="product" i]')];

    return nodes.slice(0, 3500).map(el => {
      const anchor = el.closest('a') || el.querySelector?.('a') || el;
      const card =
        el.closest('article') ||
        el.closest('li') ||
        el.closest('[class*="product" i]') ||
        el.closest('[data-testid*="product" i]') ||
        el.parentElement ||
        el;

      const img = card?.querySelector?.('img') || el.querySelector?.('img');
      const srcset = img?.getAttribute?.('srcset') || '';
      const srcsetImage = srcset
        ? String(srcset).split(',').map(x => x.trim().split(/\s+/)[0]).filter(Boolean).pop() || ''
        : '';

      return {
        text: String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(),
        contextText: String(card?.innerText || card?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 1200),
        href: anchor?.href || anchor?.getAttribute?.('href') || '',
        image: img?.currentSrc || img?.src || img?.getAttribute?.('data-src') || img?.getAttribute?.('data-original') || srcsetImage || ''
      };
    }).filter(x => x.text);
  });
}

async function scanUrl(browser, manufacturer, url, deadline) {
  const context = await browser.newContext({ locale: 'ko-KR', viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    const status = response?.status?.() ?? null;
    if (status && status >= 400) return { url, status, candidates: [], error: `HTTP ${status}` };

    await page.waitForTimeout(900);
    if (Date.now() < deadline) {
      await page.evaluate(() => window.scrollTo(0, Math.min(document.body.scrollHeight, 5000))).catch(() => {});
      await page.waitForTimeout(450);
    }

    const nodes = await collectTextNodes(page);
    const candidates = [];
    const seen = new Set();

    for (const node of nodes) {
      for (const name of extractNames(manufacturer, node.text)) {
        const key = name.toLowerCase().replace(/\s+/g, '');
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({ name, sourceUrl: officialUrl(manufacturer, node.href, url), image: node.image || '', contextText: node.contextText || node.text });
      }
    }

    return { url, status, candidates, error: '' };
  } catch (error) {
    return { url, status: null, candidates: [], error: error?.message || 'scan failed' };
  } finally {
    await context.close().catch(() => {});
  }
}

async function scanManufacturer(manufacturer) {
  const cfg = MANUFACTURERS[manufacturer];
  if (!cfg) return { manufacturer, ok: false, count: 0, records: [], error: 'unknown manufacturer' };

  const startedAt = Date.now();
  const deadline = startedAt + PER_BRAND_MAX_MS;
  const browser = await getBrowser();
  const records = [];
  const seen = new Set();
  const attempts = [];

  for (const url of cfg.urls) {
    if (Date.now() >= deadline) break;

    const result = await scanUrl(browser, manufacturer, url, deadline);
    attempts.push({ url, status: result.status, count: result.candidates.length, error: result.error || undefined });

    for (const candidate of result.candidates) {
      const key = candidate.name.toLowerCase().replace(/\s+/g, '');
      if (seen.has(key)) continue;
      seen.add(key);

      const record = buildDiscoveredRecord(manufacturer, candidate.name, candidate.sourceUrl, { image: candidate.image, imageVerified: Boolean(candidate.image), specs: extractQuickSpecsFromText(candidate.contextText) });
      if (record) records.push(record);
    }

    if (records.length >= 24) break;
  }

  return {
    manufacturer,
    brand: cfg.brand,
    ok: records.length > 0,
    count: records.length,
    records,
    attempts,
    elapsedMs: Date.now() - startedAt
  };
}

async function discoverOfficialCatalog() {
  const order = ['apple', 'samsung', 'xiaomi', 'motorola'];
  const perBrand = {};
  const records = [];

  // 무료 Render 메모리를 고려해 순차 스캔
  for (const manufacturer of order) {
    try {
      const result = await scanManufacturer(manufacturer);
      perBrand[manufacturer] = {
        ok: result.ok,
        count: result.count,
        attempts: result.attempts,
        elapsedMs: result.elapsedMs
      };
      records.push(...result.records);
    } catch (error) {
      perBrand[manufacturer] = { ok: false, count: 0, error: error?.message || 'scan failed' };
    }
  }

  return { scannedAt: new Date().toISOString(), records, perBrand };
}

module.exports = { scanManufacturer, discoverOfficialCatalog };
