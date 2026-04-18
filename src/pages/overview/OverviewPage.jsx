import { useEffect, useState } from 'react';
import breadIcon from '../../assets/openmoji/bread.svg';
import candyIcon from '../../assets/openmoji/candy.svg';
import cookieIcon from '../../assets/openmoji/cookie.svg';
import drinkIcon from '../../assets/openmoji/drink.svg';
import electricPlugIcon from '../../assets/openmoji/electric-plug.svg';
import framedPictureIcon from '../../assets/openmoji/framed-picture.svg';
import giftIcon from '../../assets/openmoji/gift.svg';
import glassesIcon from '../../assets/openmoji/glasses.svg';
import hamburgerIcon from '../../assets/openmoji/hamburger.svg';
import handbagIcon from '../../assets/openmoji/handbag.svg';
import lipstickIcon from '../../assets/openmoji/lipstick.svg';
import potOfFoodIcon from '../../assets/openmoji/pot-of-food.svg';
import prayerBeadsIcon from '../../assets/openmoji/prayer-beads.svg';
import shoppingBagsIcon from '../../assets/openmoji/shopping-bags.svg';
import shortcakeIcon from '../../assets/openmoji/shortcake.svg';
import tshirtIcon from '../../assets/openmoji/t-shirt.svg';
import ticketsIcon from '../../assets/openmoji/tickets.svg';
import trainIcon from '../../assets/openmoji/train.svg';
import { AppShell } from '../../shared/AppShell.jsx';
import { CategoryChip, PanelCard, RecordListLink, RefreshButton, StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import { getAppData } from '../../lib/gas/client.js';
import {
  calcOverview,
  createRateMap,
  getBaseYear,
  getEstimatedRecordTwdCost,
  getRecordJpyAmount,
  normalizeRecordDate,
} from '../../lib/domain/calcOverview.js';
import { formatCurrency, toNumber } from '../../lib/domain/format.js';

const DEFAULT_BUDGET_TWD = 23000;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const CATEGORY_ICON_MAP = {
  餅乾: cookieIcon,
  糖果: candyIcon,
  伴手禮: giftIcon,
  甜食: shortcakeIcon,
  飲料: drinkIcon,
  生活用品: shoppingBagsIcon,
  眼鏡: glassesIcon,
  門票: ticketsIcon,
  紀念品: framedPictureIcon,
  交通: trainIcon,
  公車: trainIcon,
  麵包: breadIcon,
  食材: potOfFoodIcon,
  包包: handbagIcon,
  電器: electricPlugIcon,
  代買: shoppingBagsIcon,
  上供: prayerBeadsIcon,
  藥妝: lipstickIcon,
  食物: hamburgerIcon,
  衣物: tshirtIcon,
};

export function OverviewPage() {
  const [state, setState] = useState({
    loading: true,
    message: '',
    overview: null,
    groupedRecords: [],
    rateInfo: null,
    rateMap: {},
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function load(forceRefresh = false) {
    if (!hasAppSettings()) {
      window.location.href = '/settings.html';
      return;
    }

    const settings = getAppSettings();
    const appDataResult = await getAppData(settings.webAppUrl, settings.token, { forceRefresh });
    const records = appDataResult.data?.shoppingRecords ?? [];
    const suicaRecords = appDataResult.data?.suicaRecords ?? [];
    const latestRate = appDataResult.data?.latestRate ?? null;
    const baseYear = getBaseYear(latestRate?.date);
    const rateMap = createRateMap(appDataResult.data?.rateHistory ?? []);

    setState({
      loading: false,
      message: appDataResult.message || '',
      overview: calcOverview(records, suicaRecords, {
        rateMap,
        fallbackRate: latestRate?.rate,
        baseYear,
      }),
      groupedRecords: groupRecordsByDate(records, {
        rateMap,
        fallbackRate: latestRate?.rate,
        baseYear,
      }),
      rateInfo: latestRate,
      rateMap,
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    setState((current) => ({ ...current, message: '重新抓取資料中...' }));
    try {
      await load(true);
    } finally {
      setIsRefreshing(false);
    }
  }

  const overview = state.overview;
  const budget = DEFAULT_BUDGET_TWD;
  const remaining = Math.max(budget - (overview?.totalCost ?? 0), 0);
  const overspend = Math.max((overview?.totalCost ?? 0) - budget, 0);
  const progress = Math.min(Math.round(((overview?.totalCost ?? 0) / budget) * 100), 999);
  const ringProgress = Math.min(Math.max(progress, 0), 100);
  const ringClassName = getBudgetRingClassName(overview?.totalCost ?? 0, overspend);
  const isOverBudget = overspend > 0;

  return (
    <AppShell
      title={(
        <span className="inline-flex items-baseline gap-2">
          <span>總覽</span>
          {state.rateInfo ? (
            <span className="text-[12px] font-medium text-[var(--muted)]">匯率 {state.rateInfo.rate.toFixed(4)}</span>
          ) : null}
        </span>
      )}
      subtitle=""
      currentPath="/index.html"
      actions={<RefreshButton isRefreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      {state.message ? <StatusBanner>{state.message}</StatusBanner> : null}
      {state.loading || !overview ? (
        <StatusBanner tone="neutral">正在整理資料...</StatusBanner>
      ) : (
        <>
          <PanelCard className="px-4 py-3">
            <div className="flex items-center gap-[14px]">
              <div
                className={ringClassName}
                style={{ '--budget-progress': `${ringProgress}%` }}
              >
                <span className="relative z-[1]">{progress}%</span>
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-2">
                <div className="grid gap-[6px]">
                  <p className="m-0 text-[14px]">
                    預算 <span className="text-[var(--muted)]">{formatCurrency(budget, 'TWD')}</span>
                  </p>
                  <p className="m-0 text-[14px]">
                    {isOverBudget ? '超支' : '剩餘'}{' '}
                    <span className={isOverBudget ? 'inline-block rounded-full bg-[#ffefef] px-[10px] text-[#ef4444] font-bold' : 'inline-block rounded-full bg-[#f3f4f6] px-[10px] text-[#4b5563] font-bold'}>
                      {formatCurrency(isOverBudget ? overspend : remaining, 'TWD')}
                    </span>
                  </p>
                </div>
                <div className="grid gap-[6px]">
                  <p className="m-0 text-[14px]">
                    支出 <span className="text-[var(--muted)]">{formatCurrency(overview.totalCost, 'TWD')}</span>
                  </p>
                  <p className="m-0 text-[14px]">
                    收入 <span className="text-[var(--muted)]">{formatCurrency(0, 'TWD')}</span>
                  </p>
                </div>
              </div>
            </div>
          </PanelCard>
          <section className="grid gap-3">
            <div className="grid gap-[14px]">
              {state.groupedRecords.map((group) => (
                <section className="grid gap-[10px]" key={group.date}>
                  <header className="flex items-center justify-between gap-3 text-[14px]">
                    <strong>{group.label}</strong>
                    <span className="whitespace-nowrap text-[var(--line)]">
                      <span className="text-[#ef4444]">
                        -{formatCurrency(group.expenseTwd, 'TWD')}
                      </span>{' '}
                      /{' '}
                      <span className="text-[#16a34a]">
                        {formatCurrency(group.incomeTwd, 'TWD')}
                      </span>
                    </span>
                  </header>
                  <div className="grid gap-[10px]">
                    {group.records.map((record, index) => (
                      <RecordListLink
                        href={`/record.html?row=${record.rowNumber}`}
                        key={record.rowNumber ?? `${group.date}-${record.store}-${index}`}
                        leading={<div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#f7f7f7] text-[18px]">{getCategoryIcon(record.category)}</div>}
                        title={(
                          <>
                            {record.name || record.store}
                            {renderQuantity(record.quantity)}
                          </>
                        )}
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
                        primary={formatPrimaryAmount(record, state.rateMap, state.rateInfo?.rate)}
                        secondary={formatSecondaryAmount(record)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <a className="fixed bottom-[72px] left-1/2 inline-flex min-h-[52px] min-w-[140px] -translate-x-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 font-extrabold text-[#111111]" href="/ledger.html">
            記帳
          </a>
        </>
      )}
    </AppShell>
  );
}

function groupRecordsByDate(records, options = {}) {
  const rateMap = options.rateMap ?? {};
  const fallbackRate = toNumber(options.fallbackRate);
  const baseYear = options.baseYear ?? new Date().getFullYear();
  const grouped = records.reduce((accumulator, record) => {
    const date = record.date || 'unknown';
    const current = accumulator[date] ?? {
      date,
      records: [],
      expenseTwd: 0,
      incomeTwd: 0,
    };

    current.records.push(record);
    const twd = Math.abs(
      getEstimatedRecordTwdCost(record, rateMap, fallbackRate, baseYear),
    );
    if (getEstimatedRecordTwdCost(record, rateMap, fallbackRate, baseYear) >= 0) {
      current.expenseTwd += twd;
    } else {
      current.incomeTwd += twd;
    }

    accumulator[date] = current;
    return accumulator;
  }, {});

  return Object.values(grouped)
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((group) => ({
      ...group,
      label: formatDateLabel(group.date),
    }));
}

function formatDateLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}(${WEEKDAYS[date.getDay()]})`;
}

function renderQuantity(quantity) {
  const amount = toNumber(quantity);
  if (amount <= 1) {
    return null;
  }

  return <span className="text-[13px] font-semibold text-[var(--muted)]"> X{amount}</span>;
}

function getCategoryIcon(category) {
  const icon = CATEGORY_ICON_MAP[category] ?? shoppingBagsIcon;
  return <img className="h-5 w-5" src={icon} alt="" aria-hidden="true" />;
}

function formatPrimaryAmount(record, rateMap, fallbackRate) {
  const estimatedTwd = getEstimatedRecordTwdCost(
    record,
    rateMap,
    fallbackRate,
    getBaseYear(),
  );
  return formatCurrency(estimatedTwd, 'TWD');
}

function formatSecondaryAmount(record) {
  return formatCurrency(getRecordJpyAmount(record), 'JPY');
}

function getBudgetRingClassName(totalCost, overspend) {
  const baseClassName = 'relative grid h-[50px] w-[50px] place-items-center rounded-full bg-[conic-gradient(var(--budget-fill)_0_var(--budget-progress,0%),var(--budget-track)_var(--budget-progress,0%)_100%)] font-bold text-[#4b5563] before:absolute before:inset-1 before:rounded-full before:bg-white before:content-[""]';
  if (overspend > 0) {
    return `${baseClassName} [--budget-track:#e5e7eb] [--budget-fill:#ef4444]`;
  }

  if (totalCost > 0) {
    return `${baseClassName} [--budget-track:#e5e7eb] [--budget-fill:#22c55e]`;
  }

  return `${baseClassName} [--budget-track:#e5e7eb] [--budget-fill:#d1d5db]`;
}
