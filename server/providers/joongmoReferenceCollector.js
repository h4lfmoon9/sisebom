'use strict';

const JOONGMO_HOME = 'https://www.joongmo.com/';
const JOONGMO_MAX_ROUNDS = Math.max(20, Math.min(1200, Number(process.env.SISEBOM_JOONGMO_MAX_ROUNDS) || 500));
const JOONGMO_DELAY_MS = Math.max(500, Math.min(4000, Number(process.env.SISEBOM_JOONGMO_DELAY_MS) || 900));
const JOONGMO_IDLE_ROUNDS = Math.max(5, Math.min(30, Number(process.env.SISEBOM_JOONGMO_IDLE_ROUNDS) || 8));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isJoongmoJoongnaUrl(url = '') {
  return /(?:^|\.)joongmo\.com\/detail\/joonggonara\/\d+/i.test(String(url));
}

async function collectCards(page) {
  return page.evaluate(() => {
    const text = el => String(el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
    const links = [...document.querySelectorAll('a[href*="/detail/joonggonara/"]')];
    const out = [];
    const seen = new Set();

    for (const a of links) {
      const href = a.href || a.getAttribute('href') || '';
      if (!href || seen.has(href)) continue;
      seen.add(href);

      let card = a.closest('article,li,[class*="card" i],[class*="product" i],[class*="item" i]');
      if (!card) card = a.parentElement?.parentElement || a.parentElement || a;

      const titleNode =
        a.querySelector('h1,h2,h3,h4,[class*="title" i]') ||
        card.querySelector?.('h1,h2,h3,h4,[class*="title" i]');

      const imageNode = a.querySelector('img') || card.querySelector?.('img');
      const srcset = imageNode?.getAttribute('srcset') || '';
      const srcsetImage = srcset
        ? String(srcset).split(',').map(x => x.trim().split(/\s+/)[0]).filter(Boolean).pop() || ''
        : '';

      out.push({
        url: href,
        title: text(titleNode) || a.getAttribute('aria-label') || a.getAttribute('title') || '',
        text: text(card) || text(a),
        image:
          imageNode?.currentSrc ||
          imageNode?.src ||
          imageNode?.getAttribute('data-src') ||
          srcsetImage ||
          ''
      });
    }

    return out;
  });
}

async function findSearchInput(page) {
  const candidates = [
    'input[placeholder*="아이폰" i]',
    'input[placeholder*="검색" i]',
    'input[type="search"]',
    'input[name*="search" i]',
    'input'
  ];

  for (const selector of candidates) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) {
      const visible = await locator.isVisible().catch(() => false);
      if (visible) return locator;
    }
  }
  return null;
}

async function submitSearch(page, query) {
  const input = await findSearchInput(page);
  if (!input) throw new Error('중고닷 검색 입력창을 찾지 못했습니다.');

  await input.fill(query);
  await input.press('Enter').catch(() => {});
  await page.waitForTimeout(1100).catch(() => {});

  if ((await page.locator('a[href*="/detail/joonggonara/"]').count().catch(() => 0)) > 0) return;

  const searchButtons = [
    page.getByRole('button', { name: /^검색$/ }),
    page.getByRole('button', { name: /검색/ }),
    page.locator('button:has-text("검색")').first()
  ];

  for (const button of searchButtons) {
    if (await button.count().catch(() => 0)) {
      if (await button.isVisible().catch(() => false)) {
        await button.click().catch(() => {});
        await page.waitForTimeout(1200).catch(() => {});
        break;
      }
    }
  }

  // If Joongna was not selected by default, turn it on once and retry.
  if ((await page.locator('a[href*="/detail/joonggonara/"]').count().catch(() => 0)) === 0) {
    const checkbox = page.getByRole('checkbox', { name: /중고나라/ }).first();
    if (await checkbox.count().catch(() => 0)) {
      const checked = await checkbox.isChecked().catch(() => false);
      if (!checked) await checkbox.check().catch(() => checkbox.click().catch(() => {}));
    } else {
      const candidate = page.getByText('중고나라', { exact: true }).first();
      if (await candidate.count().catch(() => 0) && await candidate.isVisible().catch(() => false)) {
        const pressed = await candidate.getAttribute('aria-pressed').catch(() => null);
        const state = await candidate.getAttribute('data-state').catch(() => null);
        if (pressed === 'false' || state === 'unchecked' || state === 'off') {
          await candidate.click().catch(() => {});
        }
      }
    }
    await input.press('Enter').catch(() => {});
    await page.waitForTimeout(1200).catch(() => {});
  }
}

async function clickMoreOrNext(page) {
  // Prefer an explicit "more" button when present.
  const clickedMore = await page.evaluate(() => {
    const visible = el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    const nodes = [...document.querySelectorAll('button,a')].filter(visible);
    const more = nodes.find(el => /^(더\s*보기|매물\s*더\s*보기|more)$/i.test(String(el.innerText || '').trim()));
    if (more) {
      more.click();
      return 'more';
    }
    return '';
  }).catch(() => '');
  if (clickedMore) return clickedMore;

  // Otherwise try numbered pagination if the result page exposes it.
  const clickedPage = await page.evaluate(() => {
    const visible = el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    const nodes = [...document.querySelectorAll('button,a')].filter(visible);
    const numbered = nodes.map(el => ({
      el,
      n: /^\d+$/.test(String(el.innerText || '').trim()) ? Number(String(el.innerText || '').trim()) : null,
      current: el.getAttribute('aria-current') === 'page' || /active|selected|current/i.test(String(el.className || '')),
      disabled: Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true'
    })).filter(x => Number.isFinite(x.n));

    if (!numbered.length) return '';
    const current = numbered.find(x => x.current)?.n || numbered.find(x => x.disabled)?.n || 1;
    const next = numbered.filter(x => !x.disabled && x.n > current).sort((a,b) => a.n - b.n)[0];
    if (!next) return '';
    next.el.click();
    return `page-${next.n}`;
  }).catch(() => '');

  return clickedPage;
}

async function collectJoongmoJoongna(page, query, options = {}) {
  const deadline = Number(options.deadline) || (Date.now() + 10 * 60 * 1000);
  const target = Math.max(1, Number(options.target) || 20000);
  const unique = new Map();
  const attempts = [];

  const response = await page.goto(JOONGMO_HOME, {
    waitUntil: 'domcontentloaded',
    timeout: Number(options.timeoutMs) || 15000
  });

  attempts.push({
    url: JOONGMO_HOME,
    status: response?.status?.() ?? null,
    count: 0
  });

  const status = response?.status?.() ?? null;
  if (status && status >= 400) {
    const e = new Error(`중고닷 공개 페이지 HTTP ${status}`);
    e.statusCode = status === 403 || status === 429 ? 503 : 502;
    throw e;
  }

  await page.waitForTimeout(700).catch(() => {});
  await submitSearch(page, query);

  let idle = 0;
  let rounds = 0;

  for (let round = 0; round < JOONGMO_MAX_ROUNDS; round++) {
    if (Date.now() >= deadline || unique.size >= target) break;
    rounds = round + 1;

    const before = unique.size;
    const cards = await collectCards(page).catch(() => []);
    for (const card of cards) {
      if (!isJoongmoJoongnaUrl(card?.url)) continue;
      const key = String(card.url).split('?')[0].split('#')[0];
      if (!unique.has(key)) unique.set(key, { ...card, url: key, joongmoReference: true });
      if (unique.size >= target) break;
    }

    if (unique.size > before) idle = 0;
    else idle++;

    if (idle >= JOONGMO_IDLE_ROUNDS) break;
    if (unique.size >= target) break;

    const action = await clickMoreOrNext(page).catch(() => '');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await sleep(action ? JOONGMO_DELAY_MS : Math.max(JOONGMO_DELAY_MS, 1100));
  }

  attempts[0].count = unique.size;
  return {
    cards: [...unique.values()],
    count: unique.size,
    rounds,
    attempts,
    sourceUrl: JOONGMO_HOME
  };
}

module.exports = {
  JOONGMO_HOME,
  isJoongmoJoongnaUrl,
  collectJoongmoJoongna
};
