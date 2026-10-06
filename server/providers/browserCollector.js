'use strict';
// FINAL_V5_ALL_SMARTPHONE_SEARCH

// Render build/runtime에서 같은 Chromium 경로를 사용.
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';

const { chromium } = require('playwright');
const {
  CONFIG,
  canonicalUrl,
  normalizeBrowserCard
} = require('./browserCollectorCore');
const { enrichRawListingImages } = require('./listingImageEnricher');

const DEFAULT_TARGET = Math.max(40, Math.min(500, Number(process.env.SISEBOM_COLLECT_LIMIT) || 200));
const MAX_SCROLL_ROUNDS = Math.max(5, Math.min(30, Number(process.env.SISEBOM_SCROLL_ROUNDS) || 12));
const PAGE_TIMEOUT_MS = Math.max(6000, Math.min(30000, Number(process.env.SISEBOM_PAGE_TIMEOUT_MS) || 12000));
const MAX_BROWSER_CONCURRENCY = Math.max(1, Math.min(3, Number(process.env.SISEBOM_BROWSER_CONCURRENCY) || 2));

// server.js의 기존 9초 provider timeout 안에서 첫 응답을 돌려주기 위한 제한.
// 실제 심층 수집은 뒤에서 계속 진행한다.
const FIRST_RESPONSE_WAIT_MS = Math.max(2500, Math.min(7800, Number(process.env.SISEBOM_FIRST_RESPONSE_WAIT_MS) || 6200));
const DEEP_JOB_MAX_MS = Math.max(15000, Math.min(180000, Number(process.env.SISEBOM_DEEP_JOB_MAX_MS) || 70000));
const JOB_TTL_MS = Math.max(60000, Math.min(3600000, Number(process.env.SISEBOM_JOB_TTL_MS) || 30 * 60 * 1000));
const IMAGE_ENRICH_LIMIT = Math.max(4, Math.min(24, Number(process.env.SISEBOM_IMAGE_ENRICH_LIMIT) || 12));

let browserPromise = null;
let activeSlots = 0;
const slotWaiters = [];
const jobs = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
      args: [
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check'
      ]
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

function extractAppleQueryInfo(query = '') {
  const raw = String(query || '').trim();
  const compact = raw.toLowerCase().replace(/\s+/g, '');

  const isApple = /(?:아이폰|iphone)/i.test(raw);
  if (!isApple) return null;

  const gen = compact.match(/(?:아이폰|iphone)(\d{1,2})/)?.[1] || null;
  const se = /(?:아이폰|iphone)se/i.test(compact);
  const variant =
    /promax|프로맥스/i.test(compact) ? 'promax' :
    /pro|프로/i.test(compact) ? 'pro' :
    /plus|플러스/i.test(compact) ? 'plus' :
    /mini|미니/i.test(compact) ? 'mini' :
    /air|에어/i.test(compact) ? 'air' :
    /(?:아이폰|iphone)\d{1,2}e/i.test(compact) ? 'e' :
    'base';

  return { raw, gen, se, variant };
}

function appleCapacityHints(info) {
  if (!info) return [];

  if (info.se) return ['64GB', '128GB', '256GB'];
  const g = Number(info.gen || 0);

  if (g >= 17) return ['256GB', '512GB', '1TB'];
  if (g >= 13) return ['128GB', '256GB', '512GB'];
  if (g === 12) return info.variant === 'pro' || info.variant === 'promax'
    ? ['128GB', '256GB', '512GB']
    : ['64GB', '128GB', '256GB'];
  if (g >= 11) return ['64GB', '128GB', '256GB'];
  return ['64GB', '128GB', '256GB'];
}

function canonicalAppleQueries(info) {
  if (!info?.gen) return [];

  const suffixKo =
    info.variant === 'promax' ? ' 프로맥스' :
    info.variant === 'pro' ? ' 프로' :
    info.variant === 'plus' ? ' 플러스' :
    info.variant === 'mini' ? ' 미니' :
    info.variant === 'air' ? ' 에어' :
    info.variant === 'e' ? 'e' : '';

  const suffixEn =
    info.variant === 'promax' ? ' Pro Max' :
    info.variant === 'pro' ? ' Pro' :
    info.variant === 'plus' ? ' Plus' :
    info.variant === 'mini' ? ' mini' :
    info.variant === 'air' ? ' Air' :
    info.variant === 'e' ? 'e' : '';

  return [
    `아이폰 ${info.gen}${suffixKo}`,
    `아이폰${info.gen}${suffixKo.replace(/\s+/g, '')}`,
    `iPhone ${info.gen}${suffixEn}`,
    `iPhone${info.gen}${suffixEn.replace(/\s+/g, '')}`
  ];
}

function brandQueryVariants(query = '') {
  const q = String(query || '').trim();
  const out = [];
  const add = v => {
    const s = String(v || '').trim();
    if (s && !out.some(x => x.toLowerCase() === s.toLowerCase())) out.push(s);
  };

  add(q);
  add(compactPhoneQuery(q));

  const swaps = [
    [/샤오미/ig, 'Xiaomi'], [/xiaomi/ig, '샤오미'],
    [/레드미/ig, 'Redmi'], [/redmi/ig, '레드미'],
    [/포코/ig, 'POCO'], [/poco/ig, '포코'],
    [/모토로라/ig, 'Motorola'], [/motorola/ig, '모토로라'],
    [/갤럭시/ig, 'Galaxy'], [/galaxy/ig, '갤럭시'],
    [/픽셀/ig, 'Pixel'], [/\bPixel\b/ig, '픽셀'],
    [/엑스페리아/ig, 'Xperia']
  ];
  for (const [re, replacement] of swaps) {
    if (re.test(q)) add(q.replace(re, replacement));
  }

  // Marketplace sellers often omit the manufacturer/family prefix.
  add(q.replace(/^(?:갤럭시|Galaxy)\s*/i, ''));
  add(q.replace(/^(?:모토로라|Motorola)\s*/i, ''));
  add(q.replace(/^Google\s+/i, ''));
  add(q.replace(/^Sony\s+/i, ''));
  add(q.replace(/^LG\s+/i, ''));

  // Korean carrier / family spellings.
  const familySwaps = [
    [/와이드/ig, 'Wide'], [/\bWide\b/ig, '와이드'],
    [/점프/ig, 'Jump'], [/\bJump\b/ig, '점프'],
    [/퀀텀/ig, 'Quantum'], [/\bQuantum\b/ig, '퀀텀'],
    [/버디/ig, 'Buddy'], [/\bBuddy\b/ig, '버디'],
    [/폴드/ig, 'Fold'], [/\bFold\b/ig, '폴드'],
    [/플립/ig, 'Flip'], [/\bFlip\b/ig, '플립'],
    [/울트라/ig, 'Ultra'], [/\bUltra\b/ig, '울트라']
  ];
  for (const [re, replacement] of familySwaps) {
    if (re.test(q)) add(q.replace(re, replacement));
  }

  return out;
}

function capacityHintsForQuery(query = '') {
  const q = String(query || '').toLowerCase();

  if (/(?:아이폰|iphone)\s*12\b/.test(q) && !/(?:pro|프로)/.test(q)) {
    return ['64GB', '128GB', '256GB'];
  }
  if (/(?:아이폰|iphone)/.test(q)) return ['128GB', '256GB', '512GB'];

  if (/(?:galaxy|갤럭시)\s*z|fold|flip|폴드|플립|ultra|울트라/.test(q)) {
    return ['256GB', '512GB', '128GB'];
  }
  if (/(?:galaxy|갤럭시)\s*[sam]\s*\d/i.test(q)) {
    return ['128GB', '256GB', '512GB'];
  }
  if (/(?:xiaomi|샤오미|redmi|레드미|poco|포코)/.test(q)) {
    return ['256GB', '128GB', '512GB'];
  }
  if (/(?:motorola|모토로라|moto|razr|edge)/.test(q)) {
    return ['256GB', '128GB', '512GB'];
  }
  if (/(?:pixel|픽셀|sony|xperia|oneplus|oppo|vivo|iqoo|realme|honor|huawei|asus|rog|zenfone|nothing|cmf|nokia|hmd|zte|nubia|redmagic|meizu|tcl|alcatel|sharp|htc|lenovo|tecno|infinix|itel|fairphone|lg\s)/.test(q)) {
    return ['128GB', '256GB', '512GB', '64GB'];
  }

  return ['128GB', '256GB', '512GB', '64GB'];
}

function buildSearchVariants(query = '') {
  const q = String(query).trim();
  const variants = [];
  const add = value => {
    const v = String(value || '').trim();
    if (v && !variants.some(x => x.toLowerCase() === v.toLowerCase())) variants.push(v);
  };

  const apple = extractAppleQueryInfo(q);
  const explicitStorage = hasStorageToken(q);

  // FINAL V7: iPhone searches start with the broad model name so a marketplace
  // that does not index capacity text cannot make the whole search look empty.
  // When a capacity is explicitly selected, every variant keeps that capacity
  // so 128/256/512GB results never bleed into each other.
  if (apple?.gen) {
    const canonical = canonicalAppleQueries(apple);

    if (explicitStorage) {
      const storage = String(q).match(/(?:32|64|128|256|512|1024|2048)\s*(?:gb|g|기가)?\b|(?:1|2)\s*(?:tb|테라)\b/i)?.[0]
        ?.replace(/기가/i, 'GB')
        ?.replace(/\s+/g, '') || '';
      for (const base of canonical) add(`${base} ${storage}`);
      for (const base of brandQueryVariants(q)) add(base);
      return variants.filter(v => hasStorageToken(v)).slice(0, 14);
    }

    for (const base of canonical) add(base);
    for (const base of brandQueryVariants(q)) add(base);
    for (const storage of appleCapacityHints(apple)) {
      for (const base of canonical.slice(0, 2)) add(`${base} ${storage}`);
    }
    return variants.slice(0, 14);
  }

  const baseVariants = brandQueryVariants(q);
  if (explicitStorage) {
    for (const base of baseVariants) add(base);
    return variants.filter(v => hasStorageToken(v)).slice(0, 14);
  }

  for (const base of baseVariants) add(base);
  for (const storage of capacityHintsForQuery(q)) {
    for (const base of baseVariants.slice(0, 4)) add(`${base} ${storage}`);
  }
  return variants.slice(0, 14);
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
        anchor.closest('[class*="card" i]') ||
        anchor.closest('[class*="item" i]') ||
        anchor;

      const titleNode =
        anchor.querySelector('h1,h2,h3,h4') ||
        card.querySelector('h1,h2,h3,h4') ||
        anchor.querySelector('[class*="title" i]') ||
        card.querySelector('[class*="title" i]');

      const imageNode =
        anchor.querySelector('img') ||
        card.querySelector('img');

      const srcset =
        imageNode?.getAttribute('srcset') ||
        anchor.querySelector('source[srcset]')?.getAttribute('srcset') ||
        card.querySelector('source[srcset]')?.getAttribute('srcset') ||
        '';

      const srcsetImage = srcset
        ? String(srcset).split(',').map(x => x.trim().split(/\s+/)[0]).filter(Boolean).pop() || ''
        : '';

      let backgroundImage = '';
      if (!imageNode) {
        const candidates = [anchor, card, ...card.querySelectorAll('[style*="background" i]')].slice(0, 24);
        for (const el of candidates) {
          const bg = getComputedStyle(el).backgroundImage || '';
          const m = bg.match(/url\(["']?(.+?)["']?\)/i);
          if (m?.[1]) {
            backgroundImage = m[1];
            break;
          }
        }
      }

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
          srcsetImage ||
          backgroundImage ||
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
      .find(el => visible(el) && /^(더\s*보기|more|매물\s*더\s*보기)$/i.test(String(el.innerText || '').trim()));

    if (!button) return false;
    button.click();
    return true;
  }).catch(() => false);
}

function jobKey(source, query) {
  return `${source}|${String(query).trim().toLowerCase()}`;
}

function pruneJobs() {
  const now = Date.now();
  for (const [key, job] of jobs) {
    if (job.status !== 'running' && now - job.updatedAt > JOB_TTL_MS) {
      jobs.delete(key);
    }
  }
}

function makeJob(source, query, options = {}) {
  const cfg = CONFIG[source];
  const target = Math.max(DEFAULT_TARGET, Number(options.limit) || 0);

  return {
    key: jobKey(source, query),
    source,
    platform: cfg.name,
    query,
    target,
    sourceUrl: cfg.searchUrl(query),
    status: 'running',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    finishedAt: null,
    queriesTried: [],
    seen: new Map(),
    excluded: {
      notListing: 0,
      noPrice: 0,
      duplicate: 0
    },
    responseStatus: null,
    imageEnrichedCount: 0,
    error: '',
    promise: null
  };
}

function snapshotJob(job) {
  const listings = [];
  let index = 0;
  let noPrice = 0;
  let notListing = 0;

  for (const raw of job.seen.values()) {
    const item = normalizeBrowserCard(job.source, raw, job.query, index++);
    if (!item) {
      notListing++;
      continue;
    }
    if (item.excluded === 'noPrice') {
      noPrice++;
      continue;
    }
    listings.push(item);
  }

  return {
    query: job.query,
    platform: job.platform,
    source: job.source,
    sourceUrl: job.sourceUrl,
    via: 'sisebom-public-browser-deep',
    fetchedAt: new Date().toISOString(),
    responseStatus: job.responseStatus,
    imageEnrichedCount: Number(job.imageEnrichedCount) || 0,
    candidateCount: job.seen.size,
    targetCount: job.target,
    count: listings.length,
    listings,
    excluded: {
      ...job.excluded,
      notListing: job.excluded.notListing + notListing,
      noPrice: job.excluded.noPrice + noPrice
    },
    collecting: job.status === 'running',
    collectionStatus: job.status,
    queriesTried: [...job.queriesTried],
    elapsedMs: Date.now() - job.createdAt,
    error: job.error || undefined
  };
}

async function collectVariant(page, cfg, searchQuery, job, deadline) {
  const url = cfg.searchUrl(searchQuery);
  const response = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: PAGE_TIMEOUT_MS
  });

  const status = response?.status?.() ?? null;
  job.responseStatus = status;
  job.updatedAt = Date.now();

  if (status && status >= 400) {
    const e = new Error(`${cfg.name} 공개 검색 페이지 HTTP ${status}`);
    e.statusCode = status === 403 ? 503 : 502;
    throw e;
  }

  await page.waitForTimeout(500);

  let unchangedRounds = 0;

  for (let round = 0; round < MAX_SCROLL_ROUNDS; round++) {
    if (Date.now() >= deadline || job.seen.size >= job.target) break;

    const cards = await collectVisibleCards(page, cfg);
    const before = job.seen.size;

    for (const card of cards) {
      const urlKey = canonicalUrl(card.url || '');

      if (!urlKey || !cfg.isListing(urlKey)) {
        job.excluded.notListing++;
        continue;
      }

      if (job.seen.has(urlKey)) {
        job.excluded.duplicate++;
        continue;
      }

      job.seen.set(urlKey, { ...card, url: urlKey, searchQuery });
      job.updatedAt = Date.now();

      if (job.seen.size >= job.target) break;
    }

    if (job.seen.size === before) unchangedRounds++;
    else unchangedRounds = 0;

    if (job.seen.size >= job.target || unchangedRounds >= 3) break;

    const clicked = await clickPublicMoreButton(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await page.waitForTimeout(clicked ? 520 : 320);
  }
}

async function runDeepJob(job) {
  const cfg = CONFIG[job.source];
  const variants = buildSearchVariants(job.query);
  const deadline = Date.now() + DEEP_JOB_MAX_MS;

  try {
    await withBrowserSlot(async () => {
      const browser = await getBrowser();
      const context = await browser.newContext({
        locale: 'ko-KR',
        viewport: { width: 1365, height: 900 }
      });
      const page = await context.newPage();
      page.setDefaultTimeout(PAGE_TIMEOUT_MS);

      try {
        let emptyVariantStreak = 0;

        for (const variant of variants) {
          if (Date.now() >= deadline || job.seen.size >= job.target) break;

          const before = job.seen.size;
          job.queriesTried.push(variant);
          job.updatedAt = Date.now();

          try {
            await collectVariant(page, cfg, variant, job, deadline);
          } catch (error) {
            // 공개 페이지가 명시적으로 403/차단되면 그 플랫폼 작업을 끝낸다.
            if (error?.statusCode === 503 || /HTTP\s*403/i.test(error?.message || '')) {
              throw error;
            }
            // 다른 일시 오류는 다음 공개 검색 변형으로 넘어간다.
            job.error = error?.message || '수집 중 일부 오류';
          }

          if (job.seen.size === before) emptyVariantStreak++;
          else emptyVariantStreak = 0;

          // FINAL V7: do not abort an iPhone search just because the first
          // marketplace spelling variants were empty. This was causing iPhone 15
          // to stop before reaching a useful broad/compact spelling.
          if (!extractAppleQueryInfo(job.query) && emptyVariantStreak >= 4) break;
        }
      } finally {
        await context.close().catch(() => {});
      }
    });

    // Search cards sometimes hide the real listing photo (notably Daangn).
    // For a small number of missing-photo results, read only the public
    // listing page's own og:image/twitter:image. No login or blocking bypass.
    if (job.seen.size && ['daangn', 'joongna'].includes(job.source)) {
      try {
        const imageResult = await enrichRawListingImages(
          job.source,
          [...job.seen.values()],
          { limit: IMAGE_ENRICH_LIMIT, concurrency: 3, timeoutMs: 2400 }
        );
        job.imageEnrichedCount += imageResult.enriched;
        job.updatedAt = Date.now();
      } catch {}
    }

    job.status = 'done';
  } catch (error) {
    job.status = job.seen.size ? 'partial' : 'failed';
    job.error = error?.message || '수집 실패';
  } finally {
    job.updatedAt = Date.now();
    job.finishedAt = Date.now();
  }

  return snapshotJob(job);
}

function startOrGetJob(source, query, options = {}) {
  pruneJobs();

  const key = jobKey(source, query);
  let job = jobs.get(key);

  // refresh=1 should actually collect again after a completed/failed job.
  // Never start a duplicate browser job while the same query is still running.
  if (job && options.force && job.status !== 'running') {
    jobs.delete(key);
    job = null;
  }

  if (job) return job;

  job = makeJob(source, query, options);
  jobs.set(key, job);

  job.promise = runDeepJob(job).catch(error => {
    job.status = job.seen.size ? 'partial' : 'failed';
    job.error = error?.message || '수집 실패';
    job.updatedAt = Date.now();
    job.finishedAt = Date.now();
    return snapshotJob(job);
  });

  return job;
}

async function waitForUsefulSnapshot(job) {
  const started = Date.now();

  while (Date.now() - started < FIRST_RESPONSE_WAIT_MS) {
    // 후보가 어느 정도 모이면 서버의 9초 timeout 전에 먼저 보여준다.
    if (job.seen.size >= 12 || job.status !== 'running') break;
    await sleep(220);
  }

  return snapshotJob(job);
}

async function fetchBrowserListings(source, query, options = {}) {
  const cfg = CONFIG[source];
  if (!cfg) throw new Error(`지원하지 않는 플랫폼: ${source}`);

  const q = String(query || '').trim();
  if (!q) {
    const e = new Error('검색어가 필요합니다.');
    e.statusCode = 400;
    throw e;
  }

  const job = startOrGetJob(source, q, options);

  // 완료된 작업은 즉시 반환.
  if (job.status !== 'running') return snapshotJob(job);

  // 첫 검색은 최대 약 6.2초만 기다리고, 심층수집은 뒤에서 계속한다.
  return waitForUsefulSnapshot(job);
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
  closeBrowser,
  buildSearchVariants,
  getBrowser
};
