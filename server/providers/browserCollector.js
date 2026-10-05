'use strict';

const { chromium } = require('playwright');
const {
  CONFIG,
  canonicalUrl,
  normalizeBrowserCard
} = require('./browserCollectorCore');

const DEFAULT_TARGET = Math.max(40, Math.min(500, Number(process.env.SISEBOM_COLLECT_LIMIT) || 200));
const MAX_SCROLL_ROUNDS = Math.max(6, Math.min(40, Number(process.env.SISEBOM_SCROLL_ROUNDS) || 22));
const PAGE_TIMEOUT_MS = Math.max(6000, Math.min(30000, Number(process.env.SISEBOM_PAGE_TIMEOUT_MS) || 14000));
const MAX_BROWSER_CONCURRENCY = Math.max(1, Math.min(3, Number(process.env.SISEBOM_BROWSER_CONCURRENCY) || 2));

let browserPromise = null;
let activeSlots = 0;
const slotWaiters = [];

function acquireSlot() {
  if (activeSlots < MAX_BROWSER_CONCURRENCY) {
    activeSlots++;
    return Promise.resolve();
  }
  return new Promise(resolve => slotWaiters.push(resolve));
}

function releaseSlot() {
  const next = slotWaiters.shift();
  if (next) {
    next();
    return;
  }
  activeSlots = Math.max(0, activeSlots - 1);
}

async function withBrowserSlot(fn) {
  await acquireSlot();
  try {
    return await fn();
  } finally {
    releaseSlot();
  }
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage']
    }).then(browser => {
      browser.on('disconnected', () => {
        browserPromise = null;
      });
      return browser;
    }).catch(error => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
}

async function collectVisibleCards(page, cfg) {
  return page.evaluate(({ selector }) => {
    const pickText = el => String(el?.innerText || el?.textContent || '').trim();
    const links = [...document.querySelectorAll(selector)];

    return links.map(anchor => {
      const card =
        anchor.closest('article') ||
        anchor.closest('li') ||
        anchor.closest('[data-testid*="card" i]') ||
        anchor.closest('[data-testid*="item" i]') ||
        anchor;

      const titleNode =
        anchor.querySelector('h1,h2,h3,h4') ||
        card.querySelector('h1,h2,h3,h4') ||
        anchor.querySelector('[class*="title" i]') ||
        card.querySelector('[class*="title" i]');

      const imageNode =
        anchor.querySelector('img') ||
        card.querySelector('img');

      return {
        url: anchor.href || anchor.getAttribute('href') || '',
        title:
          pickText(titleNode) ||
          anchor.getAttribute('aria-label') ||
          anchor.getAttribute('title') ||
          '',
        text: pickText(card) || pickText(anchor),
        image:
          imageNode?.currentSrc ||
          imageNode?.src ||
          imageNode?.getAttribute('data-src') ||
          imageNode?.getAttribute('data-original') ||
          ''
      };
    });
  }, { selector: cfg.selector });
}

async function clickPublicMoreButton(page) {
  return page.evaluate(() => {
    const visible = el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };

    const button = [...document.querySelectorAll('button,a')]
      .find(el => visible(el) && /^(더\s*보기|more)$/i.test(String(el.innerText || '').trim()));

    if (!button) return false;
    button.click();
    return true;
  }).catch(() => false);
}

async function collectOnePlatform(source, query, options = {}) {
  const cfg = CONFIG[source];
  if (!cfg) throw new Error(`지원하지 않는 플랫폼: ${source}`);

  const q = String(query || '').trim();
  if (!q) {
    const e = new Error('검색어가 필요합니다.');
    e.statusCode = 400;
    throw e;
  }

  const requested = Number(options.limit) || 0;
  const target = Math.max(DEFAULT_TARGET, requested);
  const sourceUrl = cfg.searchUrl(q);

  return withBrowserSlot(async () => {
    const browser = await getBrowser();
    const context = await browser.newContext({
      locale: 'ko-KR',
      viewport: { width: 1365, height: 900 }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);

    const found = new Map();
    const excluded = {
      notListing: 0,
      noPrice: 0,
      duplicate: 0
    };

    let responseStatus = null;

    try {
      const response = await page.goto(sourceUrl, {
        waitUntil: 'domcontentloaded',
        timeout: PAGE_TIMEOUT_MS
      });

      responseStatus = response?.status?.() ?? null;

      if (responseStatus && responseStatus >= 400) {
        const e = new Error(`${cfg.name} 공개 검색 페이지 HTTP ${responseStatus}`);
        e.statusCode = responseStatus === 403 ? 503 : 502;
        throw e;
      }

      await page.waitForTimeout(900);

      let unchangedRounds = 0;

      for (let round = 0; round < MAX_SCROLL_ROUNDS && found.size < target; round++) {
        const cards = await collectVisibleCards(page, cfg);

        const before = found.size;

        for (const card of cards) {
          const url = canonicalUrl(card.url || '');

          if (!url || !cfg.isListing(url)) {
            excluded.notListing++;
            continue;
          }

          if (found.has(url)) {
            excluded.duplicate++;
            continue;
          }

          found.set(url, { ...card, url });
          if (found.size >= target) break;
        }

        if (found.size === before) unchangedRounds++;
        else unchangedRounds = 0;

        if (found.size >= target || unchangedRounds >= 4) break;

        const clicked = await clickPublicMoreButton(page);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
        await page.waitForTimeout(clicked ? 650 : 420);
      }

      const listings = [];
      let index = 0;

      for (const raw of found.values()) {
        const item = normalizeBrowserCard(source, raw, q, index++);

        if (!item) {
          excluded.notListing++;
          continue;
        }

        if (item.excluded === 'noPrice') {
          excluded.noPrice++;
          continue;
        }

        listings.push(item);
      }

      return {
        query: q,
        platform: cfg.name,
        source,
        sourceUrl,
        via: 'sisebom-public-browser',
        fetchedAt: new Date().toISOString(),
        responseStatus,
        candidateCount: found.size,
        count: listings.length,
        listings,
        excluded
      };
    } finally {
      await context.close().catch(() => {});
    }
  });
}

async function fetchBrowserListings(source, query, options = {}) {
  return collectOnePlatform(source, query, options);
}

async function closeBrowser() {
  if (!browserPromise) return;

  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {}

  browserPromise = null;
}

process.once('SIGTERM', () => {
  closeBrowser().finally(() => process.exit(0));
});

process.once('SIGINT', () => {
  closeBrowser().finally(() => process.exit(0));
});

module.exports = {
  fetchBrowserListings,
  closeBrowser
};
