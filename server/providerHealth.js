'use strict';

function textOf(value) {
  return String(value || '');
}

function isBlocked(input = {}) {
  const status = Number(input?.responseStatus || input?.statusCode || 0);
  const message = `${textOf(input?.error)} ${textOf(input?.message)}`;
  return status === 403 || /\b403\b|forbidden|access\s*denied|접근\s*제한|차단/i.test(message);
}

function fromProviderData(data = {}) {
  const count = Array.isArray(data.listings) ? data.listings.length : Number(data.count) || 0;
  const collectionStatus = data.collectionStatus || (data.collecting ? 'running' : 'done');
  const blocked = isBlocked(data);
  const hardFailure = collectionStatus === 'failed' && count === 0;

  return {
    ok: !hardFailure,
    count,
    sourceUrl: data.sourceUrl,
    excluded: data.excluded || {},
    collecting: Boolean(data.collecting),
    collectionStatus,
    candidateCount: Number(data.candidateCount) || 0,
    targetCount: Number(data.targetCount) || 0,
    queriesTried: Array.isArray(data.queriesTried) ? data.queriesTried : [],
    responseStatus: Number(data.responseStatus) || null,
    imageEnrichedCount: Number(data.imageEnrichedCount) || 0,
    blocked,
    message: blocked
      ? '공개 페이지 접근 제한'
      : hardFailure
        ? '공개 페이지 수집 실패'
        : collectionStatus === 'partial'
          ? '일부 매물만 수집'
          : undefined,
    error: data.error || undefined
  };
}

function fromProviderError(error) {
  const blocked = isBlocked({
    responseStatus: error?.responseStatus,
    statusCode: error?.statusCode,
    error: error?.message
  });

  return {
    ok: false,
    count: 0,
    collecting: false,
    collectionStatus: 'failed',
    blocked,
    message: blocked ? '공개 페이지 접근 제한' : '불러오기 실패',
    error: error?.message || '불러오기 실패'
  };
}

module.exports = {
  isBlocked,
  fromProviderData,
  fromProviderError
};
