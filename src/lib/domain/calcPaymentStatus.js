import { getEstimatedRecordTwdCost } from './calcOverview.js';
import { toNumber } from './format.js';

function clampRemaining(limit, used) {
  if (limit === null || limit === undefined || limit === '') {
    return null;
  }

  return Math.max(toNumber(limit) - toNumber(used), 0);
}

export function calcPaymentStatus(records, suicaRecords, rules, options = {}) {
  const rateMap = options.rateMap ?? {};
  const fallbackRate = toNumber(options.fallbackRate);
  const baseYear = options.baseYear ?? new Date().getFullYear();
  const paypaySet = new Set(
    rules.filter((r) => r.paymentType === 'paypay').map((r) => r.paymentPlan),
  );

  const usageByPayment = records.reduce((accumulator, record) => {
    const payment = record.payment || '未分類';
    const current = accumulator[payment] ?? {
      usedTwd: 0,
      recordCount: 0,
      maxSingleSpentTwd: 0,
    };
    const recordCost = getEstimatedRecordTwdCost(record, rateMap, fallbackRate, baseYear, paypaySet);

    current.usedTwd += recordCost;
    current.recordCount += 1;
    current.maxSingleSpentTwd = Math.max(current.maxSingleSpentTwd, recordCost);
    accumulator[payment] = current;
    return accumulator;
  }, {});

  const suicaRemainingJpy = suicaRecords.reduce(
    (sum, record) => sum + toNumber(record.remainingJpy),
    0,
  );

  return rules.map((rule) => {
    const usage = usageByPayment[rule.paymentPlan] ?? {
      usedTwd: 0,
      recordCount: 0,
      maxSingleSpentTwd: 0,
    };
    const singleLimitTwd = rule.singleLimitTwd ? toNumber(rule.singleLimitTwd) : null;
    const cumulativeLimitTwd = rule.cumulativeLimitTwd ? toNumber(rule.cumulativeLimitTwd) : null;
    const usedTwd = usage.usedTwd;

    return {
      paymentPlan: rule.paymentPlan,
      paymentTool: rule.paymentTool,
      usedTwd,
      recordCount: usage.recordCount,
      rewardRate: toNumber(rule.effectiveRewardRate),
      singleLimitTwd,
      maxSingleSpentTwd: usage.maxSingleSpentTwd,
      singleRemainingTwd: singleLimitTwd === null
        ? null
        : Math.max(singleLimitTwd - usage.maxSingleSpentTwd, 0),
      hasReachedSingleLimit: singleLimitTwd === null
        ? false
        : usage.maxSingleSpentTwd >= singleLimitTwd,
      cumulativeLimitTwd,
      cumulativeRemainingTwd: clampRemaining(cumulativeLimitTwd, usedTwd),
      cumulativeUsageRate: cumulativeLimitTwd
        ? Math.min(usedTwd / cumulativeLimitTwd, 1)
        : null,
      hasReachedCumulativeLimit: cumulativeLimitTwd === null
        ? false
        : usedTwd >= cumulativeLimitTwd,
      suicaRemainingJpy: rule.paymentPlan === 'Suica' ? suicaRemainingJpy : null,
      campaignUrl: rule.campaignUrl || '',
      description: rule.description,
    };
  });
}
