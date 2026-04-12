import { RotateCw } from 'lucide-react';
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
import { StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import { getAppData } from '../../lib/gas/client.js';
import {
  calcOverview,
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
        <span className="page-title-inline">
          <span>總覽</span>
          {state.rateInfo ? (
            <span className="page-title-meta">匯率 {state.rateInfo.rate.toFixed(4)}</span>
          ) : null}
        </span>
      )}
      subtitle=""
      currentPath="/index.html"
      actions={(
        <button
          type="button"
          className={isRefreshing ? 'icon-button is-spinning' : 'icon-button'}
          aria-label="重新抓取資料"
          title="重新抓取資料"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RotateCw size={16} strokeWidth={2.2} />
        </button>
      )}
    >
      {state.message ? <StatusBanner>{state.message}</StatusBanner> : null}
      {state.loading || !overview ? (
        <StatusBanner tone="neutral">正在整理資料...</StatusBanner>
      ) : (
        <>
          <section className="budget-panel">
            <div className="budget-head">
              <div
                className={ringClassName}
                style={{ '--budget-progress': `${ringProgress}%` }}
              >
                <span>{progress}%</span>
              </div>
              <div className="budget-body">
                <div className="budget-copy">
                  <p className="budget-label">
                    預算 <span>{formatCurrency(budget, 'TWD')}</span>
                  </p>
                  <p className={isOverBudget ? 'budget-over is-over' : 'budget-over'}>
                    {isOverBudget ? '超支' : '剩餘'}{' '}
                    <span>{formatCurrency(isOverBudget ? overspend : remaining, 'TWD')}</span>
                  </p>
                </div>
                <div className="budget-copy">
                  <p className="budget-label">
                    支出 <span>{formatCurrency(overview.totalCost, 'TWD')}</span>
                  </p>
                  <p className="budget-label">
                    收入 <span>{formatCurrency(0, 'TWD')}</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* <section className="summary-duo">
            <article className="summary-card summary-card-expense">
              <p>支出</p>
              <strong>{formatCurrency(overview.totalCost, 'TWD')}</strong>
            </article>
            <article className="summary-card summary-card-income">
              <p>收入</p>
              <strong>{formatCurrency(0, 'TWD')}</strong>
            </article>
          </section> */}

          <section className="overview-section">
            <div className="record-group-list">
              {state.groupedRecords.map((group) => (
                <section className="record-group" key={group.date}>
                  <header className="record-group-header">
                    <strong>{group.label}</strong>
                    <span className="record-group-summary">
                      <span className="record-group-expense">
                        -{formatCurrency(group.expenseTwd, 'TWD')}
                      </span>{' '}
                      /{' '}
                      <span className="record-group-income">
                        {formatCurrency(group.incomeTwd, 'TWD')}
                      </span>
                    </span>
                  </header>
                  <div className="record-list">
                    {group.records.map((record, index) => (
                      <article className="record-item" key={`${group.date}-${record.store}-${index}`}>
                        <div className="record-main">
                          <div className="record-icon">{getCategoryIcon(record.category)}</div>
                          <div>
                            <strong>
                              {record.name || record.store}
                              {renderQuantity(record.quantity)}
                            </strong>
                            <div className="record-meta">
                              {record.category ? (
                                <span className="record-category-badge">{record.category}</span>
                              ) : null}
                              {record.store ? (
                                <span className="record-meta-text">{record.store}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="record-amounts">
                            <strong className="record-amount">
                            {formatPrimaryAmount(record, state.rateMap, state.rateInfo?.rate)}
                          </strong>
                          <span className="record-amount-sub">
                            {formatSecondaryAmount(record)}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <a className="floating-ledger-button" href="/ledger.html">
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

  return <span className="record-quantity"> X{amount}</span>;
}

function getCategoryIcon(category) {
  const icon = CATEGORY_ICON_MAP[category] ?? shoppingBagsIcon;
  return <img className="record-icon-image" src={icon} alt="" aria-hidden="true" />;
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

function createRateMap(rateHistory) {
  return rateHistory.reduce((accumulator, item) => {
    const normalizedDate = normalizeRecordDate(item.date, getBaseYear(item.date));
    if (normalizedDate && item.rate) {
      accumulator[normalizedDate] = toNumber(item.rate);
    }
    return accumulator;
  }, {});
}

function getBaseYear(dateText) {
  if (dateText && /^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return Number(dateText.slice(0, 4));
  }

  return new Date().getFullYear();
}

function getBudgetRingClassName(totalCost, overspend) {
  if (overspend > 0) {
    return 'budget-ring is-over';
  }

  if (totalCost > 0) {
    return 'budget-ring is-active';
  }

  return 'budget-ring';
}
