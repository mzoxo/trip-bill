import { useEffect, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { SectionCard, StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings } from '../../lib/storage/settings.js';
import { getPaymentRules, getSuicaRecords } from '../../lib/gas/client.js';
import { getPaymentAdvice } from '../../lib/domain/getPaymentAdvice.js';
import { formatCurrency, formatPercent, toNumber } from '../../lib/domain/format.js';

export function AdvicePage() {
  const [rules, setRules] = useState([]);
  const [suicaRemainingJpy, setSuicaRemainingJpy] = useState(0);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    amountTwd: '1000',
    allowedPayments: [],
  });

  useEffect(() => {
    async function load() {
      const settings = getAppSettings();
      const [rulesResult, suicaResult] = await Promise.all([
        getPaymentRules(settings.webAppUrl, settings.token),
        getSuicaRecords(settings.webAppUrl, settings.token),
      ]);

      setRules(rulesResult.data ?? []);
      setSuicaRemainingJpy(
        (suicaResult.data ?? []).reduce(
          (sum, record) => sum + toNumber(record.remainingJpy),
          0,
        ),
      );
      setMessage(rulesResult.message || suicaResult.message || '');
    }

    load();
  }, []);

  const adviceList = getPaymentAdvice({
    amountTwd: form.amountTwd,
    allowedPayments: form.allowedPayments,
    rules,
    suicaRemainingJpy,
  });

  function togglePayment(plan) {
    setForm((current) => {
      const hasItem = current.allowedPayments.includes(plan);
      return {
        ...current,
        allowedPayments: hasItem
          ? current.allowedPayments.filter((item) => item !== plan)
          : [...current.allowedPayments, plan],
      };
    });
  }

  return (
    <AppShell
      title="支付建議"
      subtitle="輸入單筆預計消費後，依目前規則與 Suica 餘額給出建議順序。"
      currentPath="/advice.html"
    >
      {message ? <StatusBanner>{message}</StatusBanner> : null}
      <section className="grid dual-grid">
        <SectionCard title="試算條件" description="若不勾選支付方式，代表全部都可用。">
          <div className="form-grid">
            <div className="field is-full">
              <label htmlFor="amountTwd">預估台幣金額</label>
              <input
                id="amountTwd"
                type="number"
                min="0"
                value={form.amountTwd}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amountTwd: event.target.value }))
                }
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <p className="field-hint">可用支付方式</p>
            <div className="pill-list">
              {rules.map((rule) => (
                <button
                  key={rule.paymentPlan}
                  type="button"
                  className="button button-secondary"
                  onClick={() => togglePayment(rule.paymentPlan)}
                >
                  {form.allowedPayments.includes(rule.paymentPlan) ? '已選' : '可選'} {rule.paymentPlan}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="目前條件"
          description={`Suica 剩餘約 ${formatCurrency(suicaRemainingJpy, 'JPY')}`}
        >
          <div className="pill-list">
            <span className="pill">單筆試算 {formatCurrency(form.amountTwd, 'TWD')}</span>
            <span className="pill">規則數量 {rules.length}</span>
          </div>
        </SectionCard>
      </section>

      <section style={{ marginTop: 18 }}>
        <SectionCard title="推薦順序" description="先看有效回饋率，再檢查門檻與餘額限制。">
          <div className="advice-list">
            {adviceList.map((item, index) => (
              <article className="advice-item" key={item.paymentPlan}>
                <div className="advice-head">
                  <strong>
                    #{index + 1} {item.paymentPlan}
                  </strong>
                  <span>
                    {formatPercent(item.effectiveRewardRate)} / 預估回饋{' '}
                    {formatCurrency(item.reward, 'TWD')}
                  </span>
                </div>
                <div className="advice-reasons">
                  {item.reasons.map((reason) => (
                    <span className="pill" key={`${item.paymentPlan}-${reason}`}>
                      {reason}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>
    </AppShell>
  );
}
