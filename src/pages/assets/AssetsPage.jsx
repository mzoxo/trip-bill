import { ExternalLink, Settings2, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import {
  AssetStatusCard,
  HeaderIconButton,
  LoadingCard,
  RefreshButton,
  SaveOverlay,
  SettingsToggleRow,
  StatusBanner,
} from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import { appNavigate, appUrl } from '../../lib/navigation.js';
import { getAppData, updatePaymentRuleEnabled } from '../../lib/gas/client.js';
import { calcPaymentStatus } from '../../lib/domain/calcPaymentStatus.js';
import { formatCurrency, formatPercent, toNumber } from '../../lib/domain/format.js';
import { createRateMap, getBaseYear, normalizeRecordDate } from '../../lib/domain/calcOverview.js';

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
      appNavigate('/settings.html');
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
      currentPath={appUrl('/assets.html')}
      actions={(
        <>
          <HeaderIconButton
            aria-label="支付方式設定"
            title="支付方式設定"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings2 size={16} strokeWidth={2.2} />
          </HeaderIconButton>
          <RefreshButton isRefreshing={isRefreshing} onRefresh={handleRefresh} />
        </>
      )}
    >
      {(isRefreshing || state.loading) ? <SaveOverlay>載入資料中</SaveOverlay> : null}
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
                  appNavigate(`/payment.html?payment=${encodeURIComponent(item.paymentPlan)}`);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    appNavigate(`/payment.html?payment=${encodeURIComponent(item.paymentPlan)}`);
                  }
                }}
                leading={(
                  <div className="grid justify-items-center">
                    <div
                      className={getIconRingClassName(item)}
                      style={{ '--usage-progress': `${Math.max(Math.round((item.cumulativeUsageRate ?? 0) * 100), 6)}%` }}
                    >
                      <div className="relative z-[1] grid h-10 w-10 place-items-center text-[var(--accent)]">
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
                    <ExternalLink size={14} strokeWidth={2.2} className='text-[var(--accent)]' />
                  </a>
                ) : null}
                amount={formatCurrency(item.usedTwd, 'TWD')}
                amountClassName={isOverLimit(item) ? 'text-[var(--warning)]' : ''}
                helper={item.paymentPlan === 'Suica' && state.latestRate ? (
                  <span className="text-right text-[12px] text-[var(--muted)]">
                    剩餘 {formatCurrency(suicaRemainingTwd, 'TWD')}
                  </span>
                ) : item.cumulativeLimitTwd ? (
                  <span className="text-right text-[12px] text-[var(--muted)]">
                    剩餘 {formatCurrency(item.cumulativeRemainingTwd, 'TWD')}
                  </span>
                ) : null}
                summary={{
                  className: isOverLimit(item) ? 'm-0 text-[12px] leading-[1.5] text-[var(--warning)]' : 'm-0 text-[12px] leading-[1.5] text-[var(--muted)]',
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
                <h3 id="payment-settings-title" className="m-0 text-[16px]">支付方式設定</h3>
                <p className="mt-1.5 text-[12px] leading-[1.5] text-[var(--muted)]">關閉後不會出現在建議頁推薦順序。</p>
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
          </section>
        </div>
      ) : null}
      {isSavingRule ? (
        <SaveOverlay>{pendingPaymentPlan ? `更新 ${pendingPaymentPlan} 中` : '更新中'}</SaveOverlay>
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
    return `${baseClassName} [--ring-track:var(--asset-ring-track)] [--ring-fill:var(--asset-ring-over)]`;
  }

  if (item.cumulativeUsageRate !== null && item.cumulativeUsageRate >= 0.9) {
    return `${baseClassName} [--ring-track:var(--asset-ring-track)] [--ring-fill:var(--asset-ring-near)]`;
  }

  return `${baseClassName} [--ring-track:var(--asset-ring-track)] [--ring-fill:var(--asset-ring-normal)]`;
}

function getCurrentRuleEnabled(paymentPlan, rules) {
  return rules.find((rule) => rule.paymentPlan === paymentPlan)?.enabled !== false;
}

