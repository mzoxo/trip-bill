import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { CategoryChip, RecordListLink, RefreshButton, SaveOverlay, StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import { getAppData } from '../../lib/gas/client.js';
import { formatCurrency, toNumber } from '../../lib/domain/format.js';
import {
  createRateMap,
  getBaseYear,
  getEstimatedRecordTwdCost,
  getRecordJpyAmount,
} from '../../lib/domain/calcOverview.js';

export function PaymentPage() {
  const paymentPlan = useMemo(
    () => new URLSearchParams(window.location.search).get('payment') || '',
    [],
  );
  const [state, setState] = useState({
    loading: true,
    message: '',
    records: [],
    latestRate: 0,
    baseYear: new Date().getFullYear(),
    rateMap: {},
    isPaypay: false,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function load(forceRefresh = false) {
    if (!hasAppSettings()) {
      window.location.href = '/settings.html';
      return;
    }

    const settings = getAppSettings();
    const result = await getAppData(settings.webAppUrl, settings.token, { forceRefresh });
    const latestRateData = result.data?.latestRate;
    const latestRate = toNumber(latestRateData?.rate);
    const baseYear = getBaseYear(latestRateData?.date);
    const rateMap = createRateMap(result.data?.rateHistory ?? []);
    const paymentRules = result.data?.paymentRules ?? [];
    const isPaypay = paymentRules.some(
      (r) => r.paymentPlan === paymentPlan && r.paymentType === 'paypay',
    );
    const records = (result.data?.shoppingRecords ?? [])
      .filter((record) => record.payment === paymentPlan)
      .sort((left, right) => String(right.date).localeCompare(String(left.date)));

    setState({
      loading: false,
      message: result.message || '',
      records,
      latestRate,
      baseYear,
      rateMap,
      isPaypay,
    });
  }

  useEffect(() => {
    load();
  }, [paymentPlan]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await load(true);
    } finally {
      setIsRefreshing(false);
    }
  }

  const groupedRecords = groupRecordsByDate(state.records, state.rateMap, state.latestRate, state.baseYear, state.isPaypay);

  return (
    <AppShell
      backHref="/assets.html"
      title={paymentPlan || '支付明細'}
      currentPath=""
      hideNavigation
      actions={(
        <RefreshButton isRefreshing={isRefreshing} onRefresh={handleRefresh} />
      )}
    >
      {isRefreshing ? <SaveOverlay>重新抓取資料中</SaveOverlay> : null}
      {state.message ? <StatusBanner>{state.message}</StatusBanner> : null}
      {state.loading ? (
        <SaveOverlay>載入資料中</SaveOverlay>
      ) : groupedRecords.length === 0 ? (
        <StatusBanner tone="neutral">目前沒有這個支付方式的消費紀錄</StatusBanner>
      ) : (
        <section className="grid gap-3">
          <div className="grid gap-6">
            {groupedRecords.map((group) => (
              <section className="grid gap-[10px]" key={group.date}>
                <header className="flex items-center justify-between gap-3 text-[14px]">
                  <strong>{group.date}</strong>
                  <span className="whitespace-nowrap text-[var(--line)]">
                    <span className="text-[var(--warning)]">
                      -{formatCurrency(group.expenseTwd, 'TWD')}
                    </span>
                  </span>
                </header>
                <div className="grid gap-[10px]">
                  {group.records.map((record) => (
                    <RecordListLink
                      key={record.rowNumber}
                      href={`/record.html?row=${record.rowNumber}`}
                      title={record.name || record.store}
                      meta={(
                        <>
                          {record.category ? (
                            <CategoryChip>{record.category}</CategoryChip>
                          ) : null}
                          {record.store ? (
                            <span className="text-[var(--muted)]">{record.store}</span>
                          ) : null}
                        </>
                      )}
                      primary={formatCurrency(
                        state.isPaypay && toNumber(record.twdAmount) > 0
                          ? toNumber(record.twdAmount)
                          : getEstimatedRecordTwdCost(record, state.rateMap, state.latestRate),
                        'TWD',
                      )}
                      secondary={formatCurrency(getRecordJpyAmount(record), 'JPY')}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function groupRecordsByDate(records, rateMap, fallbackRate, baseYear, isPaypay) {
  const grouped = records.reduce((accumulator, record) => {
    const date = record.date || '未知日期';
    const current = accumulator[date] ?? {
      date,
      records: [],
      expenseTwd: 0,
    };

    current.records.push(record);
    const twd = isPaypay && toNumber(record.twdAmount) > 0
      ? toNumber(record.twdAmount)
      : Math.abs(getEstimatedRecordTwdCost(record, rateMap, fallbackRate, baseYear));
    current.expenseTwd += twd;
    accumulator[date] = current;
    return accumulator;
  }, {});

  return Object.values(grouped).sort((left, right) => right.date.localeCompare(left.date));
}
