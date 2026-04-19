import { useEffect, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { RefreshButton, SaveOverlay, StatusBanner, TextInput } from '../../shared/ui.jsx';
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
    amountJpy: '',
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
      actions={<RefreshButton isRefreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      {isRefreshing ? <SaveOverlay>重新抓取資料中</SaveOverlay> : null}
      {message ? <StatusBanner>{message}</StatusBanner> : null}
      <section className="grid gap-3">
        <div className="grid gap-2">
          <label className="font-bold text-[var(--text)]" htmlFor="amountJpy">
            日幣金額
          </label>
          <TextInput
            id="amountJpy"
            type="number"
            min="0"
            value={form.amountJpy}
            onChange={(event) =>
              setForm((current) => ({ ...current, amountJpy: event.target.value }))
            }
          />
        </div>
      </section>
      <section className="grid gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="m-0 text-[16px]">推薦順序</h3>
          <span className="text-[12px] font-semibold whitespace-nowrap text-[var(--muted)]">
            {formatCurrency(form.amountJpy, 'JPY')} / {formatCurrency(toNumber(form.amountJpy) * latestRate, 'TWD')}
          </span>
        </div>
        <div className="grid gap-3">
          {adviceList.map((item, index) => (
            <article className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-[14px] rounded-[14px] border border-[var(--line)] bg-white p-4" key={item.paymentPlan}>
              <div className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-[12px] bg-[var(--accent-soft)] text-[12px] font-extrabold text-[var(--accent)]">
                #{index + 1}
              </div>
              <div className="grid gap-[10px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <strong className="text-[16px] leading-[1.2]">{item.paymentPlan}</strong>
                    <span className="text-[12px] font-semibold text-[var(--muted)]">{formatCurrency(item.reward, 'TWD')} 回饋</span>
                  </div>
                  <span className="text-[16px] font-extrabold whitespace-nowrap text-[var(--accent)]">{formatPercent(item.effectiveRewardRate)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
