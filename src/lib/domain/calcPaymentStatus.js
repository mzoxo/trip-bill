import { toNumber } from './format.js';

function clampRemaining(limit, used) {
  if (limit === null || limit === undefined || limit === '') {
    return null;
  }

  return Math.max(toNumber(limit) - toNumber(used), 0);
}

export function calcPaymentStatus(records, suicaRecords, rules) {
  const usageByPayment = records.reduce((accumulator, record) => {
    const payment = record.payment || '未分類';
    accumulator[payment] = (accumulator[payment] ?? 0) + toNumber(record.twdTotal);
    return accumulator;
  }, {});

  const suicaRemainingJpy = suicaRecords.reduce(
    (sum, record) => sum + toNumber(record.remainingJpy),
    0,
  );

  return rules.map((rule) => {
    const usedTwd = usageByPayment[rule.paymentPlan] ?? 0;

    return {
      paymentPlan: rule.paymentPlan,
      paymentTool: rule.paymentTool,
      usedTwd,
      rewardRate: toNumber(rule.effectiveRewardRate),
      singleRemainingTwd: clampRemaining(rule.singleLimitTwd, usedTwd),
      cumulativeRemainingTwd: clampRemaining(rule.cumulativeLimitTwd, usedTwd),
      suicaRemainingJpy: rule.paymentPlan === 'Suica' ? suicaRemainingJpy : null,
      description: rule.description,
    };
  });
}
