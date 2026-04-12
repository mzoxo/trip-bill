import { ExternalLink, RotateCw, Settings2, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import { getAppData, updatePaymentRuleEnabled } from '../../lib/gas/client.js';
import { calcPaymentStatus } from '../../lib/domain/calcPaymentStatus.js';
import { formatCurrency, formatPercent, toNumber } from '../../lib/domain/format.js';

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
    const statuses = calcPaymentStatus(shoppingRecords, suicaRecords, paymentRules)
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
      latestRate: toNumber(result.data?.latestRate?.rate),
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
          <button
            type="button"
            className="icon-button"
            aria-label="支付方式設定"
            title="支付方式設定"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings2 size={16} strokeWidth={2.2} />
          </button>
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
        </>
      )}
    >
      {state.message ? <StatusBanner>{state.message}</StatusBanner> : null}
      <section className="assets-group-list">
        <div className="assets-account-list">
          {state.loading ? (
            <article className="assets-account-card">
              <div className="assets-account-copy">
                <strong>資料整理中...</strong>
              </div>
            </article>
          ) : (
            state.statuses.map((item) => (
              <article
                className={isOverLimit(item) ? 'assets-usage-card is-danger' : 'assets-usage-card'}
                key={item.paymentPlan}
              >
                <div className="assets-usage-head">
                  <div className="assets-usage-title">
                    <div className="assets-account-icon-wrap">
                      <div
                        className={getIconRingClassName(item)}
                        style={{ '--usage-progress': `${Math.max(Math.round((item.cumulativeUsageRate ?? 0) * 100), 6)}%` }}
                      >
                        <div className="assets-account-icon is-card">
                          <Wallet size={18} strokeWidth={2.2} />
                        </div>
                      </div>
                    </div>
                    <div className="assets-account-copy">
                      <div className="assets-title-row">
                        <strong>{item.paymentPlan}</strong>
                        {item.campaignUrl ? (
                          <a
                            className="assets-link assets-link-icon"
                            href={item.campaignUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`${item.paymentPlan} 額滿公告`}
                            title="額滿公告"
                          >
                            <ExternalLink size={14} strokeWidth={2.2} />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="assets-usage-side">
                    <strong className={isOverLimit(item) ? 'assets-account-amount is-danger' : 'assets-account-amount'}>
                      {formatCurrency(item.usedTwd, 'TWD')}
                    </strong>
                    {item.paymentPlan === 'Suica' && state.latestRate ? (
                      <span className="assets-account-limit">
                        剩餘 {formatCurrency(suicaRemainingTwd, 'TWD')}
                      </span>
                    ) : item.cumulativeLimitTwd ? (
                      <span className="assets-account-limit">
                        剩餘 {formatCurrency(item.cumulativeRemainingTwd, 'TWD')}
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className={isOverLimit(item) ? 'assets-usage-summary is-danger' : 'assets-usage-summary'}>
                  {formatPercent(item.rewardRate)} 回饋
                  {item.singleLimitTwd ? ` / 單筆 ${formatCurrency(item.singleLimitTwd, 'TWD')}` : ''}
                  {' / '}
                  {item.recordCount} 筆
                  {item.suicaRemainingJpy ? ` / 餘額 ${formatCurrency(item.suicaRemainingJpy, 'JPY')}` : ''}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
      {isSettingsOpen ? (
        <div className="modal-overlay" role="presentation" onClick={() => setIsSettingsOpen(false)}>
          <section
            className="modal-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id="payment-settings-title">支付方式設定</h3>
                <p>關閉後不會出現在建議頁推薦順序。</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="關閉設定"
                onClick={() => setIsSettingsOpen(false)}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
            <div className="payment-settings-list">
              {state.paymentRules.map((rule) => {
                const isEnabled = getCurrentRuleEnabled(rule.paymentPlan, state.paymentRules);
                return (
                  <label className="payment-setting-row" key={rule.paymentPlan}>
                    <div className="payment-setting-copy">
                      <strong>{rule.paymentPlan}</strong>
                    </div>
                    <button
                      type="button"
                      className={isEnabled ? 'toggle-switch is-on' : 'toggle-switch'}
                      aria-pressed={isEnabled}
                      disabled={isSavingRule}
                      onClick={() => handleTogglePaymentEnabled(rule.paymentPlan)}
                    >
                      <span className="toggle-switch-knob" />
                    </button>
                  </label>
                );
              })}
            </div>
            {isSavingRule ? (
              <div className="modal-loading-cover" role="status" aria-live="polite">
                <div className="modal-loading-card">
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

function getProgressBarClassName(item) {
  if (item.hasReachedCumulativeLimit || item.hasReachedSingleLimit) {
    return 'assets-progress-bar is-danger';
  }

  if (item.cumulativeUsageRate !== null && item.cumulativeUsageRate >= 0.9) {
    return 'assets-progress-bar is-warn';
  }

  return 'assets-progress-bar';
}

function getIconRingClassName(item) {
  if (item.hasReachedCumulativeLimit || item.hasReachedSingleLimit) {
    return 'assets-icon-ring is-danger';
  }

  if (item.cumulativeUsageRate !== null && item.cumulativeUsageRate >= 0.9) {
    return 'assets-icon-ring is-warn';
  }

  return 'assets-icon-ring';
}

function getCurrentRuleEnabled(paymentPlan, rules) {
  return rules.find((rule) => rule.paymentPlan === paymentPlan)?.enabled !== false;
}
