'use strict';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function validListings(listings = []) {
  return (Array.isArray(listings) ? listings : []).filter(item => {
    const price = Number(item?.price);
    return Number.isFinite(price) && price > 0;
  });
}

function robustMarketStats(listings = []) {
  const valid = validListings(listings);
  const prices = valid.map(x => Number(x.price)).sort((a, b) => a - b);

  if (!prices.length) {
    return {
      count: 0,
      usedCount: 0,
      outlierCount: 0,
      min: 0,
      average: 0,
      max: 0,
      median: 0,
      q1: 0,
      q3: 0,
      lowFence: 0,
      highFence: 0,
      spread: 0
    };
  }

  const q1 = quantile(prices, 0.25);
  const q3 = quantile(prices, 0.75);
  const iqr = q3 - q1;

  let lowFence = prices[0];
  let highFence = prices[prices.length - 1];
  let used = valid;

  if (prices.length >= 5 && iqr > 0) {
    lowFence = Math.max(1000, q1 - 1.5 * iqr);
    highFence = q3 + 1.5 * iqr;

    const core = valid.filter(item => {
      const p = Number(item.price);
      return p >= lowFence && p <= highFence;
    });

    if (core.length >= Math.max(3, Math.ceil(valid.length * 0.6))) {
      used = core;
    }
  }

  const usedPrices = used.map(x => Number(x.price)).sort((a, b) => a - b);
  const median = quantile(usedPrices, 0.5);
  const average = usedPrices.reduce((sum, p) => sum + p, 0) / usedPrices.length;
  const min = Math.min(...usedPrices);
  const max = Math.max(...usedPrices);
  const robustQ1 = quantile(usedPrices, 0.25);
  const robustQ3 = quantile(usedPrices, 0.75);
  const spread = median > 0 ? (robustQ3 - robustQ1) / median : 0;

  return {
    count: valid.length,
    usedCount: used.length,
    outlierCount: valid.length - used.length,
    min: Math.round(min),
    average: Math.round(average),
    max: Math.round(max),
    median: Math.round(median),
    q1: Math.round(robustQ1),
    q3: Math.round(robustQ3),
    lowFence: Math.round(lowFence),
    highFence: Math.round(highFence),
    spread: Number(spread.toFixed(4))
  };
}

function platformCounts(listings = []) {
  const result = {};
  for (const item of validListings(listings)) {
    const key = String(item?.platform || '기타');
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function extractStorageFromQuery(query = '') {
  const s = String(query);

  let m = s.match(/(?:^|\D)(1|2)\s*(?:TB|테라)(?:\D|$)/i);
  if (m) return Number(m[1]) * 1024;

  m = s.match(/(?:^|\D)(32|64|128|256|512|1024|2048)\s*(?:GB|G|기가)?(?:\D|$)/i);
  return m ? Number(m[1]) : null;
}

function launchPriceFor(phone, query = '') {
  if (!phone) return 0;

  const storage = extractStorageFromQuery(query);
  const launchPrices = phone.launchPrices || {};

  if (storage != null) {
    const exact = Number(launchPrices[String(storage)] ?? launchPrices[storage]);
    if (Number.isFinite(exact) && exact > 0) return exact;
  }

  const candidates = Object.values(launchPrices).map(Number).filter(x => Number.isFinite(x) && x > 0);
  if (candidates.length) return Math.min(...candidates);

  const direct = Number(phone.newPrice);
  return Number.isFinite(direct) && direct > 0 ? direct : 0;
}

function recentCount(listings = []) {
  return validListings(listings).filter(item => {
    const minutes = Number(item?.minutes);
    return Number.isFinite(minutes) && minutes <= 1440;
  }).length;
}

function confidenceFor(stats, platforms) {
  const platformCount = Object.values(platforms).filter(v => v > 0).length;
  let points = 0;

  points += clamp(stats.usedCount * 2.2, 0, 55);
  points += clamp(platformCount * 12, 0, 30);
  points += stats.outlierCount <= Math.max(2, stats.count * 0.2) ? 15 : 7;

  points = Math.round(clamp(points, 0, 100));

  if (points >= 75) return { score: points, level: 'high', label: '신뢰도 높음' };
  if (points >= 45) return { score: points, level: 'medium', label: '신뢰도 보통' };
  return { score: points, level: 'low', label: '신뢰도 낮음' };
}

function buyJudgement(score) {
  if (score >= 70) return { status: 'green', title: '구매하기 좋은 편' };
  if (score >= 40) return { status: 'yellow', title: '조금 더 비교' };
  return { status: 'red', title: '구매 비추천' };
}

function analyzeMarket(listings = [], options = {}) {
  const phone = options.phone || null;
  const query = String(options.query || phone?.name || '');
  const stats = robustMarketStats(listings);
  const platforms = platformCounts(listings);
  const platformCount = Object.values(platforms).filter(v => v > 0).length;
  const recent = recentCount(listings);
  const confidence = confidenceFor(stats, platforms);
  const launchPrice = launchPriceFor(phone, query);

  if (!stats.usedCount) {
    return {
      engine: 'sisebom-market-v2',
      score: 0,
      judgement: { status: 'none', title: '분석 대기' },
      confidence,
      stats,
      platformCounts: platforms,
      recentCount: recent,
      launchPrice,
      summary: '현재 조건에서 시세를 계산할 판매중 매물이 없습니다.',
      reasons: []
    };
  }

  let score = 50;

  // 표본이 많고 여러 플랫폼에서 확인될수록 판단 신뢰도를 올린다.
  score += clamp(stats.usedCount * 0.65, 0, 14);
  score += clamp(platformCount * 2.5, 0, 7.5);
  score += clamp(recent * 0.35, 0, 6);

  // 중앙 50% 가격대가 지나치게 넓으면 시장 가격이 불안정하다고 본다.
  score -= clamp((stats.spread - 0.18) * 24, 0, 14);

  // 이상치 비중이 너무 높으면 점수를 조금 낮춘다.
  const outlierRatio = stats.count ? stats.outlierCount / stats.count : 0;
  score -= clamp((outlierRatio - 0.12) * 25, 0, 7);

  // 출시가가 확인되는 모델은 중고 중앙값과 비교한다.
  let discountRate = null;
  if (launchPrice > 0 && stats.median > 0) {
    discountRate = 1 - stats.median / launchPrice;
    score += clamp(discountRate * 28, -10, 20);
  }

  if (stats.usedCount < 5) score -= 10;
  score = Math.round(clamp(score, 1, 100));

  const judgement = buyJudgement(score);
  const reasons = [];

  reasons.push(`판매중 매물 ${stats.count}개 중 ${stats.usedCount}개를 시세 계산에 사용`);
  if (platformCount > 0) reasons.push(`${platformCount}개 플랫폼의 매물 반영`);
  if (recent > 0) reasons.push(`최근 24시간 내 매물 ${recent}개`);
  if (stats.outlierCount > 0) reasons.push(`극단값 ${stats.outlierCount}개는 시세 계산에서 제외`);
  if (discountRate != null) reasons.push(`출시가 대비 중고 중앙값 약 ${Math.round(discountRate * 100)}% 낮음`);

  const summaryParts = [
    `${query || '검색 제품'}의 판매중 매물 ${stats.count}개를 확인했고`,
    `${stats.usedCount}개 기준 중앙값은 ${stats.median.toLocaleString('ko-KR')}원입니다.`
  ];

  if (stats.outlierCount) {
    summaryParts.push(`가격 왜곡을 줄이기 위해 극단값 ${stats.outlierCount}개는 시세 계산에서 제외했습니다.`);
  }

  summaryParts.push(`${confidence.label} 기준으로 ${judgement.title}입니다.`);

  return {
    engine: 'sisebom-market-v2',
    score,
    judgement,
    confidence,
    stats,
    platformCounts: platforms,
    recentCount: recent,
    launchPrice,
    discountRate: discountRate == null ? null : Number(discountRate.toFixed(4)),
    summary: summaryParts.join(' '),
    reasons
  };
}

module.exports = {
  quantile,
  robustMarketStats,
  analyzeMarket,
  platformCounts,
  buyJudgement,
  launchPriceFor
};
