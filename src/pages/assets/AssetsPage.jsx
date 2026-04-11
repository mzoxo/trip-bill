import { ExternalLink, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import { getAppData } from '../../lib/gas/client.js';
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
  });

  useEffect(() => {
    async function load() {
      if (!hasAppSettings()) {
        window.location.href = '/settings.html';
        return;
      }

      const settings = getAppSettings();
      const result = await getAppData(settings.webAppUrl, settings.token);
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
      });
    }

    load();
  }, []);

  const hitLimitCount = state.statuses.filter(
    (item) => item.hasReachedSingleLimit || item.hasReachedCumulativeLimit,
  ).length;
  const activePaymentCount = state.statuses.filter((item) => item.usedTwd > 0).length;
  const suicaRemainingTwd = state.suicaRemainingJpy * state.latestRate;

  return (
    <AppShell
      title="資產"
      subtitle=""
      currentPath="/assets.html"
    >
      {state.message ? <StatusBanner>{state.message}</StatusBanner> : null}
      <section className="assets-hero">
        <strong className="assets-networth">{formatCurrency(state.totalUsedTwd, 'TWD')}</strong>
        <p className="assets-networth-label">目前累計支出</p>
      </section>

      <section className="assets-summary-card">
        <div className="assets-summary-grid">
          <article>
            <p>有使用的支付</p>
            <strong>{activePaymentCount}</strong>
          </article>
          <article>
            <p>已碰上限</p>
            <strong className={hitLimitCount > 0 ? 'is-negative' : 'is-positive'}>
              {hitLimitCount}
            </strong>
          </article>
          <article>
            <p>Suica 剩餘</p>
            <strong>{formatCurrency(state.suicaRemainingJpy, 'JPY')}</strong>
          </article>
          {state.latestRate ? (
            <article>
              <p>折合台幣</p>
              <strong>{formatCurrency(suicaRemainingTwd, 'TWD')}</strong>
            </article>
          ) : null}
        </div>
      </section>

      <section className="assets-group-list">
        <header className="assets-group-header">
          <strong>支付使用概況</strong>
          <span>{state.statuses.length} 種</span>
        </header>
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
                    {item.cumulativeLimitTwd ? (
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
