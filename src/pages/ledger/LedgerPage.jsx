import { useEffect, useRef, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import {
  FloatingSelect,
  PRIMARY_BLOCK_BUTTON_CLASS_NAME,
  RefreshButton,
  SaveOverlay,
  StickySubmitBar,
  StatusBanner,
} from '../../shared/ui.jsx';
import {
  CategoryChipsSection,
  EntryFormSection,
  EntryTwoColumnRow,
  FloatingInput,
  ShoppingFormFields,
} from '../../shared/entryForm.jsx';
import { TRIP_DATE_OPTIONS } from '../../lib/constants/trip.js';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import {
  createShoppingRecord,
  createSuicaRecord,
  getAppData,
} from '../../lib/gas/client.js';
function createShoppingInitialState(payment = 'Suica') {
  return {
    date: getDefaultTripDate(),
    location: '札幌',
    payment,
    category: '',
    store: '',
    name: '',
    japaneseName: '',
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
  const [shoppingForm, setShoppingForm] = useState(() => createShoppingInitialState());
  const [shoppingCalcState, setShoppingCalcState] = useState(() => createShoppingCalculationState());
  const [suicaForm, setSuicaForm] = useState(() => createSuicaInitialState());
  const [paymentRules, setPaymentRules] = useState([]);
  const [message, setMessage] = useState('尚未載入資料');
  const [messageTone, setMessageTone] = useState('neutral');
  const bannerRef = useRef(null);

  function showMessage(text, tone = 'neutral') {
    setMessage(text);
    setMessageTone(tone);
    if (tone === 'warning') {
      setTimeout(() => {
        const el = bannerRef.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 48 - 8;
        window.scrollTo({ top, behavior: 'smooth' });
      }, 0);
    }
  }
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
    showMessage(result.message || '');
  }

  useEffect(() => {
    load();
    window.__ledgerReload = load;
    return () => {
      delete window.__ledgerReload;
    };
  }, []);

  function handleJpyNetChange(value) {
    setShoppingCalcState((c) => ({ ...c, isJpyAmountManual: false, isTotalManual: false }));
    setShoppingForm((c) => ({ ...c, jpyNet: value }));
  }

  function handleTaxChange(value) {
    setShoppingCalcState((c) => ({ ...c, isJpyAmountManual: false, isTotalManual: false }));
    setShoppingForm((c) => ({ ...c, tax: c.tax === value ? '' : value }));
  }

  function handleJpyAmountChange(value) {
    setShoppingCalcState((c) => ({ ...c, isJpyAmountManual: true, isTotalManual: false }));
    setShoppingForm((c) => ({ ...c, jpyAmount: value }));
  }

  function handleQuantityChange(value) {
    setShoppingCalcState((c) => ({ ...c, isTotalManual: false }));
    setShoppingForm((c) => ({ ...c, quantity: value }));
  }

  function handleTotalChange(value) {
    setShoppingCalcState((c) => ({ ...c, isTotalManual: true }));
    setShoppingForm((c) => ({ ...c, total: value }));
  }

  async function handleRefresh() {
    setIsRefreshing(true);
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
    shoppingForm.jpyAmount,
    shoppingCalcState.isJpyAmountManual,
    shoppingCalcState.isTotalManual,
  ]);

  async function handleShoppingSubmit(event) {
    event.preventDefault();

    const missing = [];
    if (!shoppingForm.date) missing.push('日期');
    if (!shoppingForm.payment) missing.push('支付');
    if (!shoppingForm.category) missing.push('屬性');
    if (!shoppingForm.name.trim()) missing.push('名稱');
    if (!shoppingForm.total || Number(shoppingForm.total) <= 0) missing.push('日幣總計');
    if (missing.length > 0) {
      showMessage(`請填寫：${missing.join('、')}`, 'warning');
      return;
    }

    setIsSavingShopping(true);
    showMessage('一般消費送出中');

    try {
      const result = await createShoppingRecord(
        settings.webAppUrl,
        settings.token,
        {
          ...shoppingForm,
          location: '札幌',
        },
      );
      showMessage(result.success ? '一般消費已送出' : result.message || '送出失敗');
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
    showMessage('Suica 儲值送出中');
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
      showMessage(result.success ? 'Suica 儲值已送出' : result.message || '送出失敗');
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

  const selectedPaymentRule = paymentRules.find((r) => r.paymentPlan === shoppingForm.payment);
  const shouldShowTwdAmount = selectedPaymentRule?.paymentType === 'paypay';

  return (
    <AppShell
      backHref="/index.html"
      title="記帳"
      subtitle=""
      currentPath="/ledger.html"
      hideNavigation
      actions={<RefreshButton isRefreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      {(isSavingShopping || isSavingSuica) ? (
        <SaveOverlay>{isSavingShopping ? '一般消費送出中' : 'Suica 儲值送出中'}</SaveOverlay>
      ) : null}
      {isRefreshing ? <SaveOverlay>重新抓取資料中</SaveOverlay> : null}
      <div ref={bannerRef}>{message ? <StatusBanner tone={messageTone}>{message}</StatusBanner> : null}</div>

      <section className="grid grid-cols-2 gap-[6px] rounded-[12px] border border-[var(--line)] bg-white p-1" role="tablist" aria-label="記帳模式">
        <button
          type="button"
          className={entryTab === 'shopping' ? 'min-h-10 rounded-[8px] bg-[#edf4ff] px-4 font-bold text-[var(--accent)]' : 'min-h-10 rounded-[8px] bg-transparent px-4 font-bold text-[var(--muted)]'}
          onClick={() => setEntryTab('shopping')}
        >
          一般消費
        </button>
        <button
          type="button"
          className={entryTab === 'suica' ? 'min-h-10 rounded-[8px] bg-[#edf4ff] px-4 font-bold text-[var(--accent)]' : 'min-h-10 rounded-[8px] bg-transparent px-4 font-bold text-[var(--muted)]'}
          onClick={() => setEntryTab('suica')}
        >
          Suica 儲值
        </button>
      </section>

      {entryTab === 'shopping' ? (
        <section className="grid gap-6">
          <form className="grid gap-6" onSubmit={handleShoppingSubmit}>
            <ShoppingFormFields
              form={shoppingForm}
              setForm={setShoppingForm}
              paymentRules={paymentRules}
              onJpyNetChange={handleJpyNetChange}
              onTaxChange={handleTaxChange}
              onJpyAmountChange={handleJpyAmountChange}
              onQuantityChange={handleQuantityChange}
              onTotalChange={handleTotalChange}
              shouldShowTwdAmount={shouldShowTwdAmount}
              categorySection={(
                <CategoryChipsSection
                  value={shoppingForm.category}
                  onChange={(v) => setShoppingForm((c) => ({ ...c, category: v }))}
                />
              )}
            />

            <StickySubmitBar>
              <button className={PRIMARY_BLOCK_BUTTON_CLASS_NAME} type="submit" disabled={isSavingShopping}>
                {isSavingShopping ? '送出中' : '新增一般消費'}
              </button>
            </StickySubmitBar>
          </form>
        </section>
      ) : (
        <section className="grid gap-6">
          <form className="grid gap-6" onSubmit={handleSuicaSubmit}>
            <EntryFormSection>
              <EntryTwoColumnRow>
                <FloatingSelect
                  className="min-w-0"
                  id="suica-date"
                  label="日期"
                  value={suicaForm.date}
                  onChange={(event) => setSuicaForm((current) => ({ ...current, date: event.target.value }))}
                >
                  {TRIP_DATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </FloatingSelect>
                <FloatingInput
                  id="chargeJpy"
                  label="儲值日幣"
                  type="number"
                  value={suicaForm.chargeJpy}
                  onChange={(event) =>
                    setSuicaForm((current) => ({ ...current, chargeJpy: event.target.value }))
                  }
                />
              </EntryTwoColumnRow>
            </EntryFormSection>

            <StickySubmitBar>
              <button className={PRIMARY_BLOCK_BUTTON_CLASS_NAME} type="submit" disabled={isSavingSuica}>
                {isSavingSuica ? '送出中' : '新增 Suica 儲值'}
              </button>
            </StickySubmitBar>
          </form>
        </section>
      )}
    </AppShell>
  );
}
