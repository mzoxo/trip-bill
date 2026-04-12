import { RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import { getAppData } from '../../lib/gas/client.js';
import { calcPaymentStatus } from '../../lib/domain/calcPaymentStatus.js';
import { getPaymentAdvice } from '../../lib/domain/getPaymentAdvice.js';
import { formatCurrency, formatPercent, toNumber } from '../../lib/domain/format.js';

export function AdvicePage() {
  const [rules, setRules] = useState([]);
  const [paymentStatuses, setPaymentStatuses] = useState([]);
  const [suicaRemainingJpy, setSuicaRemainingJpy] = useState(0);
  const [latestRate, setLatestRate] = useState(0);
  const [message, setMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [form, setForm] = useState({
    amountJpy: '1000',
  });

  async function load(forceRefresh = false) {
    if (!hasAppSettings()) {
      window.location.href = '/settings.html';
      return;
    }

    const settings = getAppSettings();
    const result = await getAppData(settings.webAppUrl, settings.token, { forceRefresh });
    const nextRules = result.data?.paymentRules ?? [];
    const nextShoppingRecords = result.data?.shoppingRecords ?? [];
    const nextSuicaRecords = result.data?.suicaRecords ?? [];

    setRules(nextRules);
    setLatestRate(toNumber(result.data?.latestRate?.rate));
    setPaymentStatuses(calcPaymentStatus(nextShoppingRecords, nextSuicaRecords, nextRules));
    setSuicaRemainingJpy(
      nextSuicaRecords.reduce(
        (sum, record) => sum + toNumber(record.remainingJpy),
        0,
      ),
    );
    setMessage(result.message || '');
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    setMessage('重新抓取資料中...');
    try {
      await load(true);
    } finally {
      setIsRefreshing(false);
    }
  }

  const adviceList = getPaymentAdvice({
    amountJpy: form.amountJpy,
    amountTwd: toNumber(form.amountJpy) * latestRate,
    allowedPayments: [],
    rules,
    suicaRemainingJpy,
    paymentStatuses,
  });

  return (
    <AppShell
      title="建議"
      subtitle=""
      currentPath="/advice.html"
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
      {message ? <StatusBanner>{message}</StatusBanner> : null}
      <section className="advice-input-row">
        <div className="field field-floating is-full">
          <div className="floating-input-wrap">
            <input
              id="amountJpy"
              type="number"
              min="0"
              placeholder=" "
              value={form.amountJpy}
              onChange={(event) =>
                setForm((current) => ({ ...current, amountJpy: event.target.value }))
              }
            />
            <label htmlFor="amountJpy">日幣金額</label>
          </div>
        </div>
      </section>
      <section className="advice-section">
        <div className="advice-section-head">
          <h3>推薦順序</h3>
          <span className="advice-section-meta">
            {formatCurrency(form.amountJpy, 'JPY')} / {formatCurrency(toNumber(form.amountJpy) * latestRate, 'TWD')}
          </span>
        </div>
        <div className="advice-list">
          {adviceList.map((item, index) => (
            <article className="advice-item" key={item.paymentPlan}>
              <div className="advice-rank">#{index + 1}</div>
              <div className="advice-item-body">
                <div className="advice-head">
                  <div className="advice-title-block">
                    <strong>{item.paymentPlan}</strong>
                    <span>{formatCurrency(item.reward, 'TWD')} 回饋</span>
                  </div>
                  <span className="advice-rate">{formatPercent(item.effectiveRewardRate)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
