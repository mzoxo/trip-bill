import { toNumber } from './format.js';

export function calcOverview(records, suicaRecords) {
  const totals = records.reduce(
    (accumulator, record) => {
      accumulator.totalJpy += toNumber(record.jpyAmount);
      accumulator.totalTwd += toNumber(record.twdAmount);
      accumulator.totalFee += toNumber(record.fee);
      accumulator.totalCost += toNumber(record.twdTotal);

      const payment = record.payment || '未分類';
      const current = accumulator.byPayment[payment] ?? {
        count: 0,
        totalJpy: 0,
        totalTwd: 0,
        totalFee: 0,
        totalCost: 0,
      };

      current.count += 1;
      current.totalJpy += toNumber(record.jpyAmount);
      current.totalTwd += toNumber(record.twdAmount);
      current.totalFee += toNumber(record.fee);
      current.totalCost += toNumber(record.twdTotal);
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
