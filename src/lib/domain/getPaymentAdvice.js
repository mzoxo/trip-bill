import { toNumber } from './format.js';

function includesPayment(allowedPayments, paymentPlan) {
  if (!allowedPayments.length) {
    return true;
  }

  return allowedPayments.includes(paymentPlan);
}

export function getPaymentAdvice({
  amountJpy,
  amountTwd,
  allowedPayments,
  rules,
  suicaRemainingJpy,
  paymentStatuses = [],
}) {
  const statusMap = new Map(paymentStatuses.map((status) => [status.paymentPlan, status]));

  return rules
    .filter((rule) => rule.enabled)
    .filter((rule) => includesPayment(allowedPayments, rule.paymentPlan))
    .map((rule) => {
      const amountInJpy = toNumber(amountJpy);
      const amountInTwd = toNumber(amountTwd);
      const reward = amountInTwd * toNumber(rule.effectiveRewardRate);
      const status = statusMap.get(rule.paymentPlan);
      const cumulativeRemainingTwd = status?.cumulativeRemainingTwd ?? null;

      const isBelowMinimum = amountInTwd < toNumber(rule.minSpendTwd);
      const exceedsSingleLimit = rule.singleLimitTwd && amountInTwd > toNumber(rule.singleLimitTwd);
      const hasInsufficientSuica = rule.paymentPlan === 'Suica' && amountInJpy > toNumber(suicaRemainingJpy);
      const hasNoCumulativeQuota = cumulativeRemainingTwd !== null
        && (cumulativeRemainingTwd <= 0 || amountInTwd > cumulativeRemainingTwd);

      if (isBelowMinimum || exceedsSingleLimit || hasInsufficientSuica || hasNoCumulativeQuota) {
        return null;
      }

      return {
        paymentPlan: rule.paymentPlan,
        paymentTool: rule.paymentTool,
        reward,
        effectiveRewardRate: toNumber(rule.effectiveRewardRate),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.effectiveRewardRate - left.effectiveRewardRate);
}
