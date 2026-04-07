import { useEffect, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { SectionCard, StatCard, StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings } from '../../lib/storage/settings.js';
import {
  getPaymentRules,
  getShoppingRecords,
  getSuicaRecords,
} from '../../lib/gas/client.js';
import { calcOverview } from '../../lib/domain/calcOverview.js';
import { calcPaymentStatus } from '../../lib/domain/calcPaymentStatus.js';
import { formatCurrency } from '../../lib/domain/format.js';

export function OverviewPage() {
  const [state, setState] = useState({
    loading: true,
    message: '',
    overview: null,
    paymentStatus: [],
  });

  useEffect(() => {
    async function load() {
      const settings = getAppSettings();
      const [shoppingResult, suicaResult, rulesResult] = await Promise.all([
        getShoppingRecords(settings.webAppUrl, settings.token),
        getSuicaRecords(settings.webAppUrl, settings.token),
        getPaymentRules(settings.webAppUrl, settings.token),
      ]);

      const records = shoppingResult.data ?? [];
      const suicaRecords = suicaResult.data ?? [];
      const rules = rulesResult.data ?? [];

      setState({
        loading: false,
        message:
          shoppingResult.message || suicaResult.message || rulesResult.message || '',
        overview: calcOverview(records, suicaRecords),
        paymentStatus: calcPaymentStatus(records, suicaRecords, rules),
      });
    }

    load();
  }, []);

  const overview = state.overview;

  return (
    <AppShell
      title="旅程付款總覽"
      subtitle="集中看目前總支出、Suica 餘額與各支付方案使用進度。"
      currentPath="/index.html"
    >
      {state.message ? <StatusBanner>{state.message}</StatusBanner> : null}
      {state.loading || !overview ? (
        <StatusBanner tone="neutral">正在整理資料...</StatusBanner>
      ) : (
        <>
          <section className="grid stats-grid">
            <StatCard label="總支出" value={formatCurrency(overview.totalCost, 'TWD')} />
            <StatCard label="日幣總額" value={formatCurrency(overview.totalJpy, 'JPY')} />
            <StatCard label="台幣金額" value={formatCurrency(overview.totalTwd, 'TWD')} />
            <StatCard
              label="Suica 剩餘"
              value={formatCurrency(overview.suicaRemainingJpy, 'JPY')}
              hint={`儲值成本 ${formatCurrency(overview.suicaChargeCostTwd, 'TWD')}`}
            />
          </section>

          <section className="grid dual-grid" style={{ marginTop: 18 }}>
            <SectionCard title="支付摘要" description="依購物紀錄中的實際支付方式彙總。">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>支付</th>
                      <th>筆數</th>
                      <th>日幣</th>
                      <th>台幣總成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(overview.byPayment).map(([payment, summary]) => (
                      <tr key={payment}>
                        <td>{payment}</td>
                        <td>{summary.count}</td>
                        <td>{formatCurrency(summary.totalJpy, 'JPY')}</td>
                        <td>{formatCurrency(summary.totalCost, 'TWD')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="付款狀態" description="根據付款規則與目前已記帳資料估算。">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>方案</th>
                      <th>已用台幣</th>
                      <th>單筆剩餘</th>
                      <th>累積剩餘</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.paymentStatus.map((item) => (
                      <tr key={item.paymentPlan}>
                        <td>{item.paymentPlan}</td>
                        <td>{formatCurrency(item.usedTwd, 'TWD')}</td>
                        <td>
                          {item.singleRemainingTwd === null
                            ? '無'
                            : formatCurrency(item.singleRemainingTwd, 'TWD')}
                        </td>
                        <td>
                          {item.cumulativeRemainingTwd === null
                            ? '無'
                            : formatCurrency(item.cumulativeRemainingTwd, 'TWD')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </section>
        </>
      )}
    </AppShell>
  );
}
