import { toNumber } from './format.js';

function includesPayment(allowedPayments, paymentPlan) {
  if (!allowedPayments.length) {
    return true;
  }

  return allowedPayments.includes(paymentPlan);
}

export function getPaymentAdvice({ amountTwd, allowedPayments, rules, suicaRemainingJpy }) {
  return rules
    .filter((rule) => rule.enabled)
    .filter((rule) => includesPayment(allowedPayments, rule.paymentPlan))
    .map((rule) => {
      const reasons = [];
      const amount = toNumber(amountTwd);
      const reward = amount * toNumber(rule.effectiveRewardRate);

      if (amount < toNumber(rule.minSpendTwd)) {
        reasons.push('未達最低消費門檻');
      }

      if (rule.singleLimitTwd && amount > toNumber(rule.singleLimitTwd)) {
        reasons.push('超過單筆建議上限');
      }

      if (rule.paymentPlan === 'Suica' && amount > toNumber(suicaRemainingJpy) * 0.22) {
        reasons.push('Suica 餘額可能不足');
      }

      if (!reasons.length) {
        reasons.push('符合目前條件');
      }

      return {
        paymentPlan: rule.paymentPlan,
        paymentTool: rule.paymentTool,
        reward,
        effectiveRewardRate: toNumber(rule.effectiveRewardRate),
        reasons,
      };
    })
    .sort((left, right) => right.effectiveRewardRate - left.effectiveRewardRate);
}
