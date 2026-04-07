import { useEffect, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { SectionCard, StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings } from '../../lib/storage/settings.js';
import {
  createShoppingRecord,
  createSuicaRecord,
  getPaymentRules,
  getShoppingRecords,
  getSuicaRecords,
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

  useEffect(() => {
    async function load() {
      const currentSettings = getAppSettings();
      setSettings(currentSettings);

      const [rulesResult, shoppingResult, suicaResult] = await Promise.all([
        getPaymentRules(currentSettings.webAppUrl, currentSettings.token),
        getShoppingRecords(currentSettings.webAppUrl, currentSettings.token),
        getSuicaRecords(currentSettings.webAppUrl, currentSettings.token),
      ]);

      setPaymentRules(rulesResult.data ?? []);
      setRecentRecords({
        shopping: (shoppingResult.data ?? []).slice(-5).reverse(),
        suica: (suicaResult.data ?? []).slice(-5).reverse(),
      });
      setMessage(rulesResult.message || shoppingResult.message || suicaResult.message || '');
    }

    load();
  }, []);

  async function handleShoppingSubmit(event) {
    event.preventDefault();
    const result = await createShoppingRecord(
      settings.webAppUrl,
      settings.token,
      shoppingForm,
    );
    setMessage(result.success ? '一般消費已送出' : result.message || '送出失敗');
    if (result.success) {
      setShoppingForm(shoppingInitialState);
    }
  }

  async function handleSuicaSubmit(event) {
    event.preventDefault();
    const payload = {
      ...suicaForm,
      remainingJpy: suicaForm.remainingJpy || suicaForm.chargeJpy,
    };
    const result = await createSuicaRecord(settings.webAppUrl, settings.token, payload);
    setMessage(result.success ? 'Suica 儲值已送出' : result.message || '送出失敗');
    if (result.success) {
      setSuicaForm(suicaInitialState);
    }
  }

  return (
    <AppShell
      title="記帳"
      subtitle="同一頁處理一般消費與 Suica 儲值，避免資料散在不同入口。"
      currentPath="/ledger.html"
    >
      <StatusBanner tone={settings.webAppUrl ? 'success' : 'warning'}>
        {settings.webAppUrl ? '已讀取 Web App 設定' : '尚未設定 Web App URL，目前無法正式寫入'}
      </StatusBanner>
      {message ? <StatusBanner>{message}</StatusBanner> : null}

      <section className="grid dual-grid">
        <SectionCard title="一般消費" description="寫入 Google Sheets 的購物分頁。">
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
                <button className="button button-primary" type="submit">
                  新增一般消費
                </button>
              </div>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Suica 儲值" description="資料寫入 Suica紀錄，預設由 J卡 儲值。">
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
              <p className="field-hint">第一版預設將 Suica 儲值來源視為 J卡。</p>
            </div>
            <div className="field is-full">
              <div className="actions-row">
                <button className="button button-primary" type="submit">
                  新增 Suica 儲值
                </button>
              </div>
            </div>
          </form>
        </SectionCard>
      </section>

      <section className="grid dual-grid" style={{ marginTop: 18 }}>
        <SectionCard title="最近一般消費" description="從購物資料抓最近五筆。">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>商店</th>
                  <th>支付</th>
                  <th>台幣總計</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.shopping.map((record, index) => (
                  <tr key={`${record.date}-${record.store}-${index}`}>
                    <td>{record.date}</td>
                    <td>{record.store}</td>
                    <td>{record.payment}</td>
                    <td>{record.twdTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="最近 Suica 儲值" description="從 Suica紀錄 抓最近五筆。">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>儲值日幣</th>
                  <th>剩餘日幣</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.suica.map((record, index) => (
                  <tr key={`${record.date}-${record.chargeJpy}-${index}`}>
                    <td>{record.date}</td>
                    <td>{record.chargeJpy}</td>
                    <td>{record.remainingJpy}</td>
                    <td>{record.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
