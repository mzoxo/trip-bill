import { toNumber } from './format.js';

export function calcOverview(records, suicaRecords, options = {}) {
  const rateMap = options.rateMap ?? {};
  const fallbackRate = toNumber(options.fallbackRate);
  const baseYear = options.baseYear ?? new Date().getFullYear();

  const totals = records.reduce(
    (accumulator, record) => {
      const twdCost = getEstimatedRecordTwdCost(record, rateMap, fallbackRate, baseYear);
      accumulator.totalJpy += getRecordJpyAmount(record);
      accumulator.totalTwd += toNumber(record.twdAmount);
      accumulator.totalFee += toNumber(record.fee);
      accumulator.totalCost += twdCost;

      const payment = record.payment || '未分類';
      const current = accumulator.byPayment[payment] ?? {
        count: 0,
        totalJpy: 0,
        totalTwd: 0,
        totalFee: 0,
        totalCost: 0,
      };

      current.count += 1;
      current.totalJpy += getRecordJpyAmount(record);
      current.totalTwd += toNumber(record.twdAmount);
      current.totalFee += toNumber(record.fee);
      current.totalCost += twdCost;
      accumulator.byPayment[payment] = current;
      return accumulator;
    },
    {
      totalJpy: 0,
      totalTwd: 0,
      totalFee: 0,
      totalCost: 0,
      byPayment: {},
    },
  );

  totals.suicaRemainingJpy = suicaRecords.reduce(
    (sum, record) => sum + toNumber(record.remainingJpy),
    0,
  );

  totals.suicaChargeCostTwd = suicaRecords.reduce(
    (sum, record) => sum + toNumber(record.actualCostTwd),
    0,
  );

  return totals;
}

export function getEstimatedRecordTwdCost(record, rateMap = {}, fallbackRate = 0, baseYear) {
  if (usesDirectTwdAmount(record.payment)) {
    return getRecordTwdAmount(record);
  }

  const rate = getRecordRate(record.date, rateMap, fallbackRate, baseYear);
  return getRecordJpyAmount(record) * rate;
}

export function getRecordJpyAmount(record) {
  return firstNonZero([
    record.total,
    record.jpyAmount,
    record.jpyNet,
  ]);
}

export function getRecordTwdAmount(record) {
  return firstNonZero([
    record.twdTotal,
    record.twdAmount,
    record.total,
  ]);
}

export function usesDirectTwdAmount(payment) {
  return [
    '全盈+PAY',
    '全盈+PAY玉山',
    '全盈+PAY國泰',
    '全支付',
    '全支付國泰',
  ].includes(payment);
}

export function getRecordRate(value, rateMap = {}, fallbackRate = 0, baseYear) {
  const normalizedDate = normalizeRecordDate(value, baseYear);
  if (!normalizedDate) {
    return fallbackRate;
  }

  return toNumber(rateMap[normalizedDate]) || fallbackRate;
}

export function normalizeRecordDate(value, baseYear = new Date().getFullYear()) {
  if (!value) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const match = String(value).match(/^(\d{2})\/(\d{2})/);
  if (!match) {
    return '';
  }

  return `${baseYear}-${match[1]}-${match[2]}`;
}

export function getBaseYear(dateText) {
  if (dateText && /^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return Number(dateText.slice(0, 4));
  }

  return new Date().getFullYear();
}

export function createRateMap(rateHistory) {
  return rateHistory.reduce((accumulator, item) => {
    const normalizedDate = normalizeRecordDate(item.date, getBaseYear(item.date));
    if (normalizedDate && item.rate) {
      accumulator[normalizedDate] = toNumber(item.rate);
    }

    return accumulator;
  }, {});
}

function firstNonZero(values) {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed !== 0) {
      return parsed;
    }
  }

  return 0;
}
