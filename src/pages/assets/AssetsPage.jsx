import { ExternalLink, RotateCw, Settings2, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import {
  AssetStatusCard,
  HeaderIconButton,
  LoadingCard,
  SettingsToggleRow,
  StatusBanner,
} from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import { getAppData, updatePaymentRuleEnabled } from '../../lib/gas/client.js';
import { calcPaymentStatus } from '../../lib/domain/calcPaymentStatus.js';
import { formatCurrency, formatPercent, toNumber } from '../../lib/domain/format.js';
import { normalizeRecordDate } from '../../lib/domain/calcOverview.js';

export function AssetsPage() {
  const [state, setState] = useState({
    loading: true,
    message: '',
    statuses: [],
    totalUsedTwd: 0,
    suicaRemainingJpy: 0,
    latestRate: 0,
    paymentRules: [],
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [pendingPaymentPlan, setPendingPaymentPlan] = useState('');

  async function load(forceRefresh = false) {
    if (!hasAppSettings()) {
      window.location.href = '/settings.html';
      return;
    }

    const settings = getAppSettings();
    const result = await getAppData(settings.webAppUrl, settings.token, { forceRefresh });
    const shoppingRecords = result.data?.shoppingRecords ?? [];
    const suicaRecords = result.data?.suicaRecords ?? [];
    const paymentRules = result.data?.paymentRules ?? [];
    const latestRate = toNumber(result.data?.latestRate?.rate);
    const rateMap = createRateMap(result.data?.rateHistory ?? []);
    const baseYear = getBaseYear(result.data?.latestRate?.date);
    const statuses = calcPaymentStatus(shoppingRecords, suicaRecords, paymentRules, {
      rateMap,
      fallbackRate: latestRate,
      baseYear,
    })
      .sort((left, right) => right.usedTwd - left.usedTwd);

    setState({
      loading: false,
      message: result.message || '',
      statuses,
      totalUsedTwd: statuses.reduce((sum, item) => sum + item.usedTwd, 0),
      suicaRemainingJpy: suicaRecords.reduce(
        (sum, record) => sum + toNumber(record.remainingJpy),
        0,
      ),
      latestRate,
      paymentRules,
    });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('is-modal-open', isSettingsOpen);
    return () => {
      document.body.classList.remove('is-modal-open');
    };
  }, [isSettingsOpen]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setState((current) => ({ ...current, message: '重新抓取資料中...' }));
    try {
      await load(true);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleTogglePaymentEnabled(paymentPlan) {
    const settings = getAppSettings();
    const currentEnabled = getCurrentRuleEnabled(paymentPlan, state.paymentRules);
    const nextEnabled = !currentEnabled;

    setPendingPaymentPlan(paymentPlan);
    setIsSavingRule(true);
    setState((current) => ({
      ...current,
      paymentRules: current.paymentRules.map((rule) => (
        rule.paymentPlan === paymentPlan
          ? { ...rule, enabled: nextEnabled }
          : rule
      )),
    }));
    try {
      const result = await updatePaymentRuleEnabled(
        settings.webAppUrl,
        settings.token,
        paymentPlan,
        nextEnabled,
      );

      if (!result.success) {
        setState((current) => ({
          ...current,
          message: result.message || '更新支付方式失敗',
          paymentRules: current.paymentRules.map((rule) => (
            rule.paymentPlan === paymentPlan
              ? { ...rule, enabled: currentEnabled }
              : rule
          )),
        }));
        return;
      }

      await load(true);
    } finally {
      setIsSavingRule(false);
      setPendingPaymentPlan('');
    }
  }

  const suicaRemainingTwd = state.suicaRemainingJpy * state.latestRate;

  return (
    <AppShell
      title="資產"
      subtitle=""
      currentPath="/assets.html"
      actions={(
        <>
          <HeaderIconButton
            aria-label="支付方式設定"
            title="支付方式設定"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings2 size={16} strokeWidth={2.2} />
          </HeaderIconButton>
          <HeaderIconButton
            aria-label="重新抓取資料"
            title="重新抓取資料"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RotateCw className={isRefreshing ? 'animate-spin' : ''} size={16} strokeWidth={2.2} />
          </HeaderIconButton>
        </>
      )}
    >
      {state.message ? <StatusBanner>{state.message}</StatusBanner> : null}
      <section className="grid gap-[18px]">
        <div className="grid gap-3">
          {state.loading ? (
            <LoadingCard />
          ) : (
            state.statuses.map((item) => (
              <AssetStatusCard
                key={item.paymentPlan}
                paymentPlan={item.paymentPlan}
                onClick={() => {
                  window.location.href = `/payment.html?payment=${encodeURIComponent(item.paymentPlan)}`;
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    window.location.href = `/payment.html?payment=${encodeURIComponent(item.paymentPlan)}`;
                  }
                }}
                leading={(
                  <div className="grid justify-items-center">
                    <div
                      className={getIconRingClassName(item)}
                      style={{ '--usage-progress': `${Math.max(Math.round((item.cumulativeUsageRate ?? 0) * 100), 6)}%` }}
                    >
                      <div className="relative z-[1] grid h-10 w-10 place-items-center text-[#1285c6]">
                        <Wallet size={18} strokeWidth={2.2} />
                      </div>
                    </div>
                  </div>
                )}
                action={item.campaignUrl ? (
                  <a
                    className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--accent)] leading-none"
                    href={item.campaignUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${item.paymentPlan} 額滿公告`}
                    title="額滿公告"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ExternalLink size={14} strokeWidth={2.2} />
                  </a>
                ) : null}
                amount={formatCurrency(item.usedTwd, 'TWD')}
                amountClassName={isOverLimit(item) ? 'text-[#d9485f]' : ''}
                helper={item.paymentPlan === 'Suica' && state.latestRate ? (
                  <span className="text-right text-[12px] text-[#b0b0b0]">
                    剩餘 {formatCurrency(suicaRemainingTwd, 'TWD')}
                  </span>
                ) : item.cumulativeLimitTwd ? (
                  <span className="text-right text-[12px] text-[#b0b0b0]">
                    剩餘 {formatCurrency(item.cumulativeRemainingTwd, 'TWD')}
                  </span>
                ) : null}
                summary={{
                  className: isOverLimit(item) ? 'm-0 text-[12px] leading-[1.5] text-[#d9485f]' : 'm-0 text-[12px] leading-[1.5] text-[#a1a1aa]',
                  content: (
                    <>
                      {formatPercent(item.rewardRate)} 回饋
                      {item.singleLimitTwd ? ` / 單筆 ${formatCurrency(item.singleLimitTwd, 'TWD')}` : ''}
                      {' / '}
                      {item.recordCount} 筆
                      {item.suicaRemainingJpy ? ` / 餘額 ${formatCurrency(item.suicaRemainingJpy, 'JPY')}` : ''}
                    </>
                  ),
                }}
              />
            ))
          )}
        </div>
      </section>
      {isSettingsOpen ? (
        <div className="fixed inset-0 z-[70] grid items-end bg-[rgba(15,23,42,0.16)] px-4 pb-[100px] pt-5" role="presentation" onClick={() => setIsSettingsOpen(false)}>
          <section
            className="relative mx-auto grid max-h-[min(72vh,680px)] w-full max-w-[500px] grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden rounded-[20px] bg-white p-[18px] shadow-[0_24px_64px_rgba(15,23,42,0.16)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="payment-settings-title" className="m-0 text-[17px]">支付方式設定</h3>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--muted)]">關閉後不會出現在建議頁推薦順序。</p>
              </div>
              <HeaderIconButton
                aria-label="關閉設定"
                onClick={() => setIsSettingsOpen(false)}
              >
                <X size={16} strokeWidth={2.2} />
              </HeaderIconButton>
            </div>
            <div className="grid min-h-0 content-start gap-3 overflow-y-auto overscroll-contain">
              {state.paymentRules.map((rule) => {
                const isEnabled = getCurrentRuleEnabled(rule.paymentPlan, state.paymentRules);
                return (
                  <SettingsToggleRow
                    key={rule.paymentPlan}
                    title={rule.paymentPlan}
                    checked={isEnabled}
                    disabled={isSavingRule}
                    onToggle={() => handleTogglePaymentEnabled(rule.paymentPlan)}
                  />
                );
              })}
            </div>
            {isSavingRule ? (
              <div className="absolute inset-0 z-[2] grid place-items-center bg-[rgba(255,255,255,0.68)] p-[18px] backdrop-blur-[2px]" role="status" aria-live="polite">
                <div className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.96)] px-4 py-3 text-[14px] font-bold text-[var(--text)] shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                  <strong>{pendingPaymentPlan ? `更新 ${pendingPaymentPlan} 中...` : '更新中...'}</strong>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function isOverLimit(item) {
  return item.hasReachedSingleLimit || item.hasReachedCumulativeLimit;
}

function getIconRingClassName(item) {
  const baseClassName = 'relative grid h-10 w-10 place-items-center rounded-full bg-[conic-gradient(var(--ring-fill)_0_var(--usage-progress,0%),var(--ring-track)_var(--usage-progress,0%)_100%)] before:absolute before:inset-[3px] before:rounded-full before:bg-white before:content-[""]';

  if (item.hasReachedCumulativeLimit || item.hasReachedSingleLimit) {
    return `${baseClassName} [--ring-track:#eef3fb] [--ring-fill:#e79991]`;
  }

  if (item.cumulativeUsageRate !== null && item.cumulativeUsageRate >= 0.9) {
    return `${baseClassName} [--ring-track:#eef3fb] [--ring-fill:#e8c27d]`;
  }

  return `${baseClassName} [--ring-track:#eef3fb] [--ring-fill:#c7d8f7]`;
}

function getCurrentRuleEnabled(paymentPlan, rules) {
  return rules.find((rule) => rule.paymentPlan === paymentPlan)?.enabled !== false;
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
