import { useEffect, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { SectionCard, StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import {
  createShoppingRecord,
  createSuicaRecord,
  getAppData,
} from '../../lib/gas/client.js';

const shoppingInitialState = {
  date: '',
  location: '',
  store: '',
  category: '',
  name: '',
  quantity: '1',
  total: '',
  jpyNet: '',
  tax: '',
  jpyAmount: '',
  twdAmount: '',
  fee: '',
  twdTotal: '',
  payment: '',
  rate: '',
};

const suicaInitialState = {
  date: '',
  chargeJpy: '',
  chargeTwd: '',
  actualRate: '',
  rewardRate: '0.045',
  rewardAmount: '',
  actualCostTwd: '',
  usedJpy: '0',
  remainingJpy: '',
  status: '待出帳',
  note: 'J卡儲值',
};

export function LedgerPage() {
  const [settings, setSettings] = useState({ webAppUrl: '' });
  const [shoppingForm, setShoppingForm] = useState(shoppingInitialState);
  const [suicaForm, setSuicaForm] = useState(suicaInitialState);
  const [paymentRules, setPaymentRules] = useState([]);
  const [recentRecords, setRecentRecords] = useState({ shopping: [], suica: [] });
  const [message, setMessage] = useState('尚未載入資料');
  const [isSavingShopping, setIsSavingShopping] = useState(false);
  const [isSavingSuica, setIsSavingSuica] = useState(false);

  useEffect(() => {
    async function load(forceRefresh = false) {
      if (!hasAppSettings()) {
        window.location.href = '/settings.html';
        return;
      }

      const currentSettings = getAppSettings();
      setSettings(currentSettings);

      const result = await getAppData(currentSettings.webAppUrl, currentSettings.token, {
        forceRefresh,
      });

      const shoppingRecords = result.data?.shoppingRecords ?? [];
      const suicaRecords = result.data?.suicaRecords ?? [];
      const rules = result.data?.paymentRules ?? [];

      setPaymentRules(rules);
      setRecentRecords({
        shopping: shoppingRecords.slice(-5).reverse(),
        suica: suicaRecords.slice(-5).reverse(),
      });
      setMessage(result.message || '');
    }

    load();
    window.__ledgerReload = load;
    return () => {
      delete window.__ledgerReload;
    };
  }, []);

  async function handleShoppingSubmit(event) {
    event.preventDefault();
    setIsSavingShopping(true);
    setMessage('一般消費送出中...');

    try {
      const result = await createShoppingRecord(
        settings.webAppUrl,
        settings.token,
        shoppingForm,
      );
      setMessage(result.success ? '一般消費已送出' : result.message || '送出失敗');
      if (result.success) {
        setShoppingForm(shoppingInitialState);
        if (window.__ledgerReload) {
          await window.__ledgerReload(true);
        }
      }
    } finally {
      setIsSavingShopping(false);
    }
  }

  async function handleSuicaSubmit(event) {
    event.preventDefault();
    setIsSavingSuica(true);
    setMessage('Suica 儲值送出中...');
    const payload = {
      ...suicaForm,
      remainingJpy: suicaForm.remainingJpy || suicaForm.chargeJpy,
    };
    try {
      const result = await createSuicaRecord(settings.webAppUrl, settings.token, payload);
      setMessage(result.success ? 'Suica 儲值已送出' : result.message || '送出失敗');
      if (result.success) {
        setSuicaForm(suicaInitialState);
        if (window.__ledgerReload) {
          await window.__ledgerReload(true);
        }
      }
    } finally {
      setIsSavingSuica(false);
    }
  }

  return (
    <AppShell
      title="記帳"
      subtitle=""
      currentPath="/ledger.html"
    >
      <StatusBanner tone={settings.webAppUrl ? 'success' : 'warning'}>
        {settings.webAppUrl ? '已讀取 Web App 設定' : '尚未設定 Web App URL，目前無法正式寫入'}
      </StatusBanner>
      {message ? <StatusBanner>{message}</StatusBanner> : null}

      <section className="hero-card">
        <div>
          <p className="card-label">快速記帳</p>
          <p className="hero-value">記一筆</p>
        </div>
        <div className="pill-list">
          <span className="pill">一般消費</span>
          <span className="pill">Suica 儲值</span>
          <span className="pill">最近紀錄</span>
        </div>
      </section>

      <section className="grid dual-grid">
        <SectionCard title="支出">
          <form className="form-grid" onSubmit={handleShoppingSubmit}>
            {renderInput('日期', 'date', shoppingForm, setShoppingForm, 'date')}
            {renderInput('地點', 'location', shoppingForm, setShoppingForm)}
            {renderInput('商店', 'store', shoppingForm, setShoppingForm)}
            {renderInput('屬性', 'category', shoppingForm, setShoppingForm)}
            {renderInput('名稱', 'name', shoppingForm, setShoppingForm)}
            {renderInput('數', 'quantity', shoppingForm, setShoppingForm, 'number')}
            {renderInput('總計', 'total', shoppingForm, setShoppingForm, 'number')}
            {renderInput('日幣未稅', 'jpyNet', shoppingForm, setShoppingForm, 'number')}
            {renderInput('稅', 'tax', shoppingForm, setShoppingForm)}
            {renderInput('日幣金', 'jpyAmount', shoppingForm, setShoppingForm, 'number')}
            {renderInput('台幣', 'twdAmount', shoppingForm, setShoppingForm, 'number')}
            {renderInput('手續費', 'fee', shoppingForm, setShoppingForm, 'number')}
            {renderInput('台幣總計', 'twdTotal', shoppingForm, setShoppingForm, 'number')}
            <div className="field">
              <label htmlFor="payment">支付</label>
              <select
                id="payment"
                value={shoppingForm.payment}
                onChange={(event) =>
                  setShoppingForm((current) => ({ ...current, payment: event.target.value }))
                }
              >
                <option value="">請選擇</option>
                {paymentRules.map((rule) => (
                  <option key={rule.paymentPlan} value={rule.paymentPlan}>
                    {rule.paymentPlan}
                  </option>
                ))}
              </select>
            </div>
            {renderInput('匯率', 'rate', shoppingForm, setShoppingForm, 'number')}
            <div className="field is-full">
              <div className="actions-row">
                <button className="button button-primary" type="submit" disabled={isSavingShopping}>
                  {isSavingShopping ? '送出中...' : '新增一般消費'}
                </button>
              </div>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Suica">
          <form className="form-grid" onSubmit={handleSuicaSubmit}>
            {renderInput('日期', 'date', suicaForm, setSuicaForm, 'date')}
            {renderInput('儲值日幣', 'chargeJpy', suicaForm, setSuicaForm, 'number')}
            {renderInput('儲值台幣', 'chargeTwd', suicaForm, setSuicaForm, 'number')}
            {renderInput('實際匯率', 'actualRate', suicaForm, setSuicaForm, 'number')}
            {renderInput('回饋率', 'rewardRate', suicaForm, setSuicaForm, 'number')}
            {renderInput('回饋金額', 'rewardAmount', suicaForm, setSuicaForm, 'number')}
            {renderInput('實際成本台幣', 'actualCostTwd', suicaForm, setSuicaForm, 'number')}
            {renderInput('已使用日幣', 'usedJpy', suicaForm, setSuicaForm, 'number')}
            {renderInput('剩餘日幣', 'remainingJpy', suicaForm, setSuicaForm, 'number')}
            <div className="field">
              <label htmlFor="status">狀態</label>
              <select
                id="status"
                value={suicaForm.status}
                onChange={(event) =>
                  setSuicaForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="待出帳">待出帳</option>
                <option value="已出帳">已出帳</option>
              </select>
            </div>
            <div className="field is-full">
              <label htmlFor="note">備註</label>
              <textarea
                id="note"
                rows="3"
                value={suicaForm.note}
                onChange={(event) =>
                  setSuicaForm((current) => ({ ...current, note: event.target.value }))
                }
              />
            </div>
            <div className="field is-full">
              <div className="actions-row">
                <button className="button button-primary" type="submit" disabled={isSavingSuica}>
                  {isSavingSuica ? '送出中...' : '新增 Suica 儲值'}
                </button>
              </div>
            </div>
          </form>
        </SectionCard>
      </section>

      <section className="grid dual-grid" style={{ marginTop: 18 }}>
        <SectionCard title="最近一般消費">
          <div className="compact-list">
            {recentRecords.shopping.map((record, index) => (
              <article className="compact-item" key={`${record.date}-${record.store}-${index}`}>
                <div>
                  <strong>{record.store}</strong>
                  <p className="card-hint">
                    {record.date} · {record.payment}
                  </p>
                </div>
                <strong>{record.twdTotal}</strong>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="最近 Suica 儲值">
          <div className="compact-list">
            {recentRecords.suica.map((record, index) => (
              <article className="compact-item" key={`${record.date}-${record.chargeJpy}-${index}`}>
                <div>
                  <strong>{record.chargeJpy} JPY</strong>
                  <p className="card-hint">
                    {record.date} · {record.status}
                  </p>
                </div>
                <strong>{record.remainingJpy} JPY</strong>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>
    </AppShell>
  );
}

function renderInput(label, key, values, setValues, type = 'text') {
  return (
    <div className="field" key={key}>
      <label htmlFor={key}>{label}</label>
      <input
        id={key}
        type={type}
        value={values[key]}
        onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
      />
    </div>
  );
}
