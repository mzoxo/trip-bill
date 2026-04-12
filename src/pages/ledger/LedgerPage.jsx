import { RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { StatusBanner } from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import {
  createShoppingRecord,
  createSuicaRecord,
  getAppData,
} from '../../lib/gas/client.js';
import breadIcon from '../../assets/openmoji/bread.svg';
import candyIcon from '../../assets/openmoji/candy.svg';
import cookieIcon from '../../assets/openmoji/cookie.svg';
import drinkIcon from '../../assets/openmoji/drink.svg';
import electricPlugIcon from '../../assets/openmoji/electric-plug.svg';
import framedPictureIcon from '../../assets/openmoji/framed-picture.svg';
import giftIcon from '../../assets/openmoji/gift.svg';
import glassesIcon from '../../assets/openmoji/glasses.svg';
import hamburgerIcon from '../../assets/openmoji/hamburger.svg';
import handbagIcon from '../../assets/openmoji/handbag.svg';
import lipstickIcon from '../../assets/openmoji/lipstick.svg';
import potOfFoodIcon from '../../assets/openmoji/pot-of-food.svg';
import prayerBeadsIcon from '../../assets/openmoji/prayer-beads.svg';
import shoppingBagsIcon from '../../assets/openmoji/shopping-bags.svg';
import shortcakeIcon from '../../assets/openmoji/shortcake.svg';
import tshirtIcon from '../../assets/openmoji/t-shirt.svg';
import ticketsIcon from '../../assets/openmoji/tickets.svg';
import trainIcon from '../../assets/openmoji/train.svg';

const TRIP_DATE_OPTIONS = [
  { value: '04/21(二)', label: '04/21(二)' },
  { value: '04/22(三)', label: '04/22(三)' },
  { value: '04/23(四)', label: '04/23(四)' },
  { value: '04/24(五)', label: '04/24(五)' },
  { value: '04/25(六)', label: '04/25(六)' },
];

const TAX_OPTIONS = [
  { value: '8%', label: '8%' },
  { value: '10%', label: '10%' },
];

const CATEGORY_OPTIONS = [
  { label: '食物', icon: hamburgerIcon },
  { label: '甜食', icon: shortcakeIcon },
  { label: '交通', icon: trainIcon },
  { label: '衣物', icon: tshirtIcon },
  { label: '飲料', icon: drinkIcon },
  { label: '餅乾', icon: cookieIcon },
  { label: '糖果', icon: candyIcon },
  { label: '伴手禮', icon: giftIcon },
  { label: '生活用品', icon: shoppingBagsIcon },
  { label: '藥妝', icon: lipstickIcon },
  { label: '眼鏡', icon: glassesIcon },
  { label: '門票', icon: ticketsIcon },
  { label: '紀念品', icon: framedPictureIcon },
  { label: '麵包', icon: breadIcon },
  { label: '食材', icon: potOfFoodIcon },
  { label: '包包', icon: handbagIcon },
  { label: '電器', icon: electricPlugIcon },
  { label: '代買', icon: shoppingBagsIcon },
  { label: '上供', icon: prayerBeadsIcon }
];

function createShoppingInitialState(payment = 'Suica') {
  return {
    date: getDefaultTripDate(),
    location: '札幌',
    payment,
    category: '',
    store: '',
    name: '',
    nameJa: '',
    quantity: '1',
    total: '',
    jpyNet: '',
    tax: '',
    jpyAmount: '',
    twdAmount: '',
    fee: '',
    twdTotal: '',
    rate: '',
  };
}

function createShoppingCalculationState() {
  return {
    isJpyAmountManual: false,
    isTotalManual: false,
  };
}

function createSuicaInitialState() {
  return {
    date: getDefaultTripDate(),
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
}

function getDefaultTripDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const date = String(today.getDate()).padStart(2, '0');
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()];
  const todayValue = `${month}/${date}(${weekday})`;
  return TRIP_DATE_OPTIONS.find((option) => option.value === todayValue)?.value
    ?? TRIP_DATE_OPTIONS[0].value;
}

function getDefaultPayment(paymentRules) {
  const plans = paymentRules.map((rule) => rule.paymentPlan).filter(Boolean);
  return plans.find((plan) => plan === 'Suica') ?? plans[0] ?? 'Suica';
}

function renderDateSelect(id, value, onChange) {
  return (
    <select id={id} value={value} onChange={onChange}>
      {TRIP_DATE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function renderInput(label, key, values, setValues, type = 'text', options = []) {
  return (
    <div className={type === 'select' ? 'field' : 'field field-floating'} key={key}>
      {type === 'select' ? (
        <>
          <label htmlFor={key}>{label}</label>
          <select
            id={key}
            value={values[key]}
            onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
          >
            {options.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      ) : (
        <div className="floating-input-wrap">
          <input
            id={key}
            type={type}
            value={values[key]}
            placeholder=" "
            onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
          />
          <label htmlFor={key}>{label}</label>
        </div>
      )}
    </div>
  );
}

function renderFloatingManualInput({ id, label, value, onChange, type = 'number' }) {
  return (
    <div className="field field-floating">
      <div className="floating-input-wrap">
        <input
          id={id}
          type={type}
          value={value}
          placeholder=" "
          onChange={onChange}
        />
        <label htmlFor={id}>{label}</label>
      </div>
    </div>
  );
}

function calculateTaxIncludedAmount(jpyNet, tax) {
  const base = Number(jpyNet);
  if (!Number.isFinite(base) || base <= 0) {
    return '';
  }

  const multiplier = tax === '8%' ? 1.08 : tax === '10%' ? 1.1 : 1;
  return String(Math.round(base * multiplier));
}

function calculateLineTotal(quantity, amount) {
  const qty = Number(quantity);
  const value = Number(amount);
  if (!Number.isFinite(qty) || !Number.isFinite(value) || qty <= 0 || value <= 0) {
    return '';
  }

  return String(Math.round(qty * value));
}

export function LedgerPage() {
  const [settings, setSettings] = useState({ webAppUrl: '' });
  const [entryTab, setEntryTab] = useState('shopping');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [shoppingForm, setShoppingForm] = useState(() => createShoppingInitialState());
  const [shoppingCalcState, setShoppingCalcState] = useState(() => createShoppingCalculationState());
  const [suicaForm, setSuicaForm] = useState(() => createSuicaInitialState());
  const [paymentRules, setPaymentRules] = useState([]);
  const [message, setMessage] = useState('尚未載入資料');
  const [isSavingShopping, setIsSavingShopping] = useState(false);
  const [isSavingSuica, setIsSavingSuica] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

    const rules = result.data?.paymentRules ?? [];
    const defaultPayment = getDefaultPayment(rules);

    setPaymentRules(rules);
    setShoppingForm((current) => ({
      ...current,
      date: current.date || getDefaultTripDate(),
      location: '札幌',
      payment: current.payment || defaultPayment,
    }));
    setSuicaForm((current) => ({
      ...current,
      date: current.date || getDefaultTripDate(),
    }));
    setMessage(result.message || '');
  }

  useEffect(() => {
    load();
    window.__ledgerReload = load;
    return () => {
      delete window.__ledgerReload;
    };
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

  useEffect(() => {
    setShoppingForm((current) => {
      let changed = false;
      const next = { ...current };

      if (!shoppingCalcState.isJpyAmountManual) {
        const nextJpyAmount = calculateTaxIncludedAmount(current.jpyNet, current.tax);
        if (nextJpyAmount !== current.jpyAmount) {
          next.jpyAmount = nextJpyAmount;
          changed = true;
        }
      }

      if (!shoppingCalcState.isTotalManual) {
        const nextTotal = calculateLineTotal(current.quantity, next.jpyAmount);
        if (nextTotal !== current.total) {
          next.total = nextTotal;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [
    shoppingForm.jpyNet,
    shoppingForm.tax,
    shoppingForm.quantity,
    shoppingCalcState.isJpyAmountManual,
    shoppingCalcState.isTotalManual,
  ]);

  async function handleShoppingSubmit(event) {
    event.preventDefault();
    setIsSavingShopping(true);
    setMessage('一般消費送出中...');

    try {
      const result = await createShoppingRecord(
        settings.webAppUrl,
        settings.token,
        {
          ...shoppingForm,
          location: '札幌',
        },
      );
      setMessage(result.success ? '一般消費已送出' : result.message || '送出失敗');
      if (result.success) {
        setShoppingForm(createShoppingInitialState(getDefaultPayment(paymentRules)));
        setShoppingCalcState(createShoppingCalculationState());
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
      chargeTwd: '',
      actualRate: '',
      rewardAmount: '',
      actualCostTwd: '',
      usedJpy: '0',
      remainingJpy: suicaForm.chargeJpy,
      status: '待出帳',
    };
    try {
      const result = await createSuicaRecord(settings.webAppUrl, settings.token, payload);
      setMessage(result.success ? 'Suica 儲值已送出' : result.message || '送出失敗');
      if (result.success) {
        setSuicaForm(createSuicaInitialState());
        if (window.__ledgerReload) {
          await window.__ledgerReload(true);
        }
      }
    } finally {
      setIsSavingSuica(false);
    }
  }

  const visibleCategories = showAllCategories
    ? CATEGORY_OPTIONS
    : CATEGORY_OPTIONS.slice(0, 8);
  const selectedPaymentRule = paymentRules.find((rule) => rule.paymentPlan === shoppingForm.payment);
  const shouldShowTwdAmount = selectedPaymentRule?.paymentType === 'paypay';

  return (
    <AppShell
      title="記帳"
      subtitle=""
      currentPath="/ledger.html"
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

      <section className="ledger-entry-tabs" role="tablist" aria-label="記帳模式">
        <button
          type="button"
          className={entryTab === 'shopping' ? 'ledger-tab-button is-active' : 'ledger-tab-button'}
          onClick={() => setEntryTab('shopping')}
        >
          一般消費
        </button>
        <button
          type="button"
          className={entryTab === 'suica' ? 'ledger-tab-button is-active' : 'ledger-tab-button'}
          onClick={() => setEntryTab('suica')}
        >
          Suica 儲值
        </button>
      </section>

      {entryTab === 'shopping' ? (
        <section className="ledger-panel">
          <form className="ledger-app-form" onSubmit={handleShoppingSubmit}>
            <section className="ledger-form-section">
              <div className="ledger-field-grid ledger-field-grid-two">
                <div className="field">
                  <label htmlFor="shopping-date">日期</label>
                  {renderDateSelect(
                    'shopping-date',
                    shoppingForm.date,
                    (event) => setShoppingForm((current) => ({ ...current, date: event.target.value })),
                  )}
                </div>
                <div className="field">
                  <label htmlFor="payment">支付</label>
                  <select
                    id="payment"
                    value={shoppingForm.payment}
                    onChange={(event) =>
                      setShoppingForm((current) => ({ ...current, payment: event.target.value }))
                    }
                  >
                    {paymentRules.length === 0 ? (
                      <option value="Suica">Suica</option>
                    ) : (
                      paymentRules.map((rule) => (
                        <option key={rule.paymentPlan} value={rule.paymentPlan}>
                          {rule.paymentPlan}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </section>

            <section className="ledger-form-section">
              <div className="ledger-section-head">
                <strong>屬性</strong>
                {CATEGORY_OPTIONS.length > 8 ? (
                  <button
                    type="button"
                    className="ledger-inline-action"
                    onClick={() => setShowAllCategories((current) => !current)}
                  >
                    {showAllCategories ? '收合' : '更多'}
                  </button>
                ) : null}
              </div>
              <div className="choice-chip-list ledger-choice-chip-list" role="radiogroup" aria-label="屬性">
                {visibleCategories.map((option) => {
                  const isSelected = shoppingForm.category === option.label;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      className={isSelected ? 'choice-chip is-selected' : 'choice-chip'}
                      aria-pressed={isSelected}
                      onClick={() =>
                        setShoppingForm((current) => ({
                          ...current,
                          category: current.category === option.label ? '' : option.label,
                        }))
                      }
                    >
                      <img className="choice-chip-icon" src={option.icon} alt="" aria-hidden="true" />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="ledger-form-section">
              <div className="ledger-field-grid">
                {renderInput('商店', 'store', shoppingForm, setShoppingForm)}
                {renderInput('名稱', 'name', shoppingForm, setShoppingForm)}
                {renderInput('日文', 'nameJa', shoppingForm, setShoppingForm)}
              </div>
            </section>

            <section className="ledger-form-section">
              <div className="ledger-price-grid ledger-price-grid-detail">
                {renderFloatingManualInput({
                  id: 'jpyNet',
                  label: '日幣未稅',
                  value: shoppingForm.jpyNet,
                  onChange: (event) => {
                    const value = event.target.value;
                    setShoppingCalcState((current) => ({
                      ...current,
                      isJpyAmountManual: false,
                      isTotalManual: false,
                    }));
                    setShoppingForm((current) => ({ ...current, jpyNet: value }));
                  },
                })}
                <div className="field ledger-tax-field">
                  <div className="ledger-tax-segmented" role="radiogroup" aria-label="稅">
                    {TAX_OPTIONS.map((option) => {
                      const isSelected = shoppingForm.tax === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={isSelected ? 'ledger-tax-button is-selected' : 'ledger-tax-button'}
                          aria-pressed={isSelected}
                          onClick={() => {
                            setShoppingCalcState((current) => ({
                              ...current,
                              isJpyAmountManual: false,
                              isTotalManual: false,
                            }));
                            setShoppingForm((current) => ({
                              ...current,
                              tax: current.tax === option.value ? '' : option.value,
                            }));
                          }
                          }
                        >
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {renderFloatingManualInput({
                  id: 'jpyAmount',
                  label: '日幣金額',
                  value: shoppingForm.jpyAmount,
                  onChange: (event) => {
                    const value = event.target.value;
                    setShoppingCalcState((current) => ({
                      ...current,
                      isJpyAmountManual: true,
                      isTotalManual: false,
                    }));
                    setShoppingForm((current) => ({ ...current, jpyAmount: value }));
                  },
                })}
              </div>
              <div className="ledger-price-grid ledger-price-grid-top">
                {renderFloatingManualInput({
                  id: 'quantity',
                  label: '數量',
                  value: shoppingForm.quantity,
                  onChange: (event) => {
                    const value = event.target.value;
                    setShoppingCalcState((current) => ({
                      ...current,
                      isTotalManual: false,
                    }));
                    setShoppingForm((current) => ({ ...current, quantity: value }));
                  },
                })}
                {renderFloatingManualInput({
                  id: 'total',
                  label: '日幣總計',
                  value: shoppingForm.total,
                  onChange: (event) => {
                    const value = event.target.value;
                    setShoppingCalcState((current) => ({
                      ...current,
                      isTotalManual: true,
                    }));
                    setShoppingForm((current) => ({ ...current, total: value }));
                  },
                })}
              </div>
              {shouldShowTwdAmount ? (
                <div className="ledger-field-grid ledger-field-grid-two">
                  {renderInput('台幣', 'twdAmount', shoppingForm, setShoppingForm, 'number')}
                </div>
              ) : null}
            </section>

            <div className="ledger-submit-bar">
              <button className="button button-primary ledger-submit-button" type="submit" disabled={isSavingShopping}>
                {isSavingShopping ? '送出中...' : '新增一般消費'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="ledger-panel">
          <form className="ledger-app-form" onSubmit={handleSuicaSubmit}>
            <section className="ledger-form-section">
              <div className="ledger-field-grid ledger-field-grid-two">
                <div className="field">
                  <label htmlFor="suica-date">日期</label>
                  {renderDateSelect(
                    'suica-date',
                    suicaForm.date,
                    (event) => setSuicaForm((current) => ({ ...current, date: event.target.value })),
                  )}
                </div>
                <div className="field">
                  <label htmlFor="chargeJpy">儲值日幣</label>
                  <input
                    id="chargeJpy"
                    type="number"
                    value={suicaForm.chargeJpy}
                    onChange={(event) =>
                      setSuicaForm((current) => ({ ...current, chargeJpy: event.target.value }))
                    }
                  />
                </div>
              </div>
            </section>

            <div className="ledger-submit-bar">
              <button className="button button-primary ledger-submit-button" type="submit" disabled={isSavingSuica}>
                {isSavingSuica ? '送出中...' : '新增 Suica 儲值'}
              </button>
            </div>
          </form>
        </section>
      )}
    </AppShell>
  );
}
