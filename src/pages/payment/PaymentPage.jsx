import { RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { BackLink, CategoryChip, HeaderIconButton, RecordListLink, StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import { getAppData } from '../../lib/gas/client.js';
import { formatCurrency, toNumber } from '../../lib/domain/format.js';
import {
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
    rateMap: {},
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function load(forceRefresh = false) {
    if (!hasAppSettings()) {
      window.location.href = '/settings.html';
      return;
    }

    const settings = getAppSettings();
    const result = await getAppData(settings.webAppUrl, settings.token, { forceRefresh });
    const latestRate = toNumber(result.data?.latestRate?.rate);
    const rateMap = createRateMap(result.data?.rateHistory ?? []);
    const records = (result.data?.shoppingRecords ?? [])
      .filter((record) => record.payment === paymentPlan)
      .sort((left, right) => String(right.date).localeCompare(String(left.date)));

    setState({
      loading: false,
      message: result.message || '',
      records,
      latestRate,
      rateMap,
    });
  }

  useEffect(() => {
    load();
  }, [paymentPlan]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setState((current) => ({ ...current, message: '重新抓取資料中...' }));
    try {
      await load(true);
    } finally {
      setIsRefreshing(false);
    }
  }

  const groupedRecords = groupRecordsByDate(state.records, state.rateMap, state.latestRate);

  return (
    <AppShell
      title={paymentPlan || '支付明細'}
      currentPath=""
      hideNavigation
      actions={(
        <HeaderIconButton
          aria-label="重新抓取資料"
          title="重新抓取資料"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RotateCw className={isRefreshing ? 'animate-spin' : ''} size={16} strokeWidth={2.2} />
        </HeaderIconButton>
      )}
    >
      <BackLink href="/assets.html">返回資產</BackLink>
      {state.message ? <StatusBanner>{state.message}</StatusBanner> : null}
      {state.loading ? (
        <StatusBanner tone="neutral">正在整理資料...</StatusBanner>
      ) : groupedRecords.length === 0 ? (
        <StatusBanner tone="neutral">目前沒有這個支付方式的消費紀錄</StatusBanner>
      ) : (
        <section className="grid gap-3">
          <div className="grid gap-[14px]">
            {groupedRecords.map((group) => (
              <section className="grid gap-[10px]" key={group.date}>
                <header className="flex items-center justify-between gap-3 text-[14px]">
                  <strong>{group.date}</strong>
                  <span className="whitespace-nowrap text-[var(--line)]">
                    <span className="text-[#ef4444]">
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
                        getEstimatedRecordTwdCost(
                          record,
                          state.rateMap,
                          state.latestRate,
                        ),
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

function createRateMap(rateHistory) {
  return rateHistory.reduce((accumulator, item) => {
    if (item?.date && item?.rate) {
      accumulator[item.date] = toNumber(item.rate);
    }
    return accumulator;
  }, {});
}

function groupRecordsByDate(records, rateMap, fallbackRate) {
  const grouped = records.reduce((accumulator, record) => {
    const date = record.date || '未知日期';
    const current = accumulator[date] ?? {
      date,
      records: [],
      expenseTwd: 0,
    };

    current.records.push(record);
    current.expenseTwd += Math.abs(
      getEstimatedRecordTwdCost(record, rateMap, fallbackRate),
    );
    accumulator[date] = current;
    return accumulator;
  }, {});

  return Object.values(grouped).sort((left, right) => right.date.localeCompare(left.date));
}
