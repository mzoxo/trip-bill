import { RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import {
  BackLink,
  DANGER_BLOCK_BUTTON_CLASS_NAME,
  HeaderIconButton,
  PRIMARY_BLOCK_BUTTON_CLASS_NAME,
  SegmentedControl,
  StickySubmitBar,
  StatusBanner,
  TEXT_INPUT_CLASS_NAME,
} from '../../shared/ui.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import {
  deleteShoppingRecord,
  getAppData,
  updateShoppingRecord,
} from '../../lib/gas/client.js';

const TRIP_DATE_OPTIONS = ['04/21(二)', '04/22(三)', '04/23(四)', '04/24(五)', '04/25(六)'];
const TAX_OPTIONS = ['8%', '10%'];
const FIELD_CLASS_NAME = 'grid gap-2';
const INPUT_CLASS_NAME = TEXT_INPUT_CLASS_NAME;
const FLOATING_FIELD_CLASS_NAME = 'grid gap-0';
const FLOATING_WRAP_CLASS_NAME = 'relative';
const FLOATING_LABEL_CLASS_NAME = 'pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 rounded-full bg-white px-1 text-[14px] font-semibold text-[var(--muted)] transition-all duration-150';
const FLOATING_INPUT_CLASS_NAME = `${INPUT_CLASS_NAME} peer`;

function createInitialForm() {
  return {
    rowNumber: '',
    date: '',
    location: '札幌',
    store: '',
    category: '',
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
    payment: '',
    rate: '',
  };
}

function normalizeTaxValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  if (raw === '8%' || raw === '8％' || raw === '8' || raw === '0.08') {
    return '8%';
  }

  if (raw === '10%' || raw === '10％' || raw === '10' || raw === '0.1' || raw === '0.10') {
    return '10%';
  }

  return '';
}

function roundIntegerString(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || String(value).trim() === '') {
    return '';
  }

  return String(Math.round(number));
}

export function RecordPage() {
  const rowNumber = useMemo(
    () => new URLSearchParams(window.location.search).get('row') || '',
    [],
  );
  const [settings, setSettings] = useState({ webAppUrl: '', token: '' });
  const [paymentRules, setPaymentRules] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load(forceRefresh = false) {
    if (!hasAppSettings()) {
      window.location.href = '/settings.html';
      return;
    }

    const nextSettings = getAppSettings();
    setSettings(nextSettings);
    const result = await getAppData(nextSettings.webAppUrl, nextSettings.token, { forceRefresh });
    const records = result.data?.shoppingRecords ?? [];
    const record = records.find((item) => String(item.rowNumber) === String(rowNumber));

    if (!record) {
      setIsLoading(false);
      setPaymentRules(result.data?.paymentRules ?? []);
      setMessage('找不到這筆交易');
      return;
    }

    setPaymentRules(result.data?.paymentRules ?? []);
    setForm({
      ...createInitialForm(),
      ...record,
      rowNumber: record.rowNumber,
      location: record.location || '札幌',
      tax: normalizeTaxValue(record.tax),
      jpyAmount: roundIntegerString(record.jpyAmount),
      total: roundIntegerString(record.total),
    });
    setMessage(result.message || '');
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, [rowNumber]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setMessage('重新抓取資料中...');
    try {
      await load(true);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage('更新交易中...');
    try {
      const normalizedForm = {
        ...form,
        location: '札幌',
        tax: normalizeTaxValue(form.tax),
        jpyAmount: roundIntegerString(form.jpyAmount),
        total: roundIntegerString(form.total),
      };
      const result = await updateShoppingRecord(settings.webAppUrl, settings.token, rowNumber, {
        ...normalizedForm,
      });
      setMessage(result.success ? '交易已更新' : result.message || '更新失敗');
      if (result.success) {
        setForm((current) => ({
          ...current,
          ...normalizedForm,
        }));
        await load(true);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('確定要刪除這筆交易嗎？')) {
      return;
    }

    setIsDeleting(true);
    setMessage('刪除交易中...');
    try {
      const result = await deleteShoppingRecord(settings.webAppUrl, settings.token, rowNumber);
      if (result.success) {
        window.location.href = '/index.html';
        return;
      }
      setMessage(result.message || '刪除失敗');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell
      title="編輯交易"
      currentPath=""
      hideNavigation
      actions={(
        <HeaderIconButton
          aria-label="重新抓取資料"
          title="重新抓取資料"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RotateCw className={isRefreshing ? 'animate-spin' : ''} size={16} strokeWidth={2.2} />
        </HeaderIconButton>
      )}
    >
      <BackLink href="/index.html">返回總覽</BackLink>
      {message ? <StatusBanner>{message}</StatusBanner> : null}
      {isLoading ? (
        <StatusBanner tone="neutral">正在整理資料...</StatusBanner>
      ) : (
        <form className="grid gap-[14px]" onSubmit={handleSubmit}>
          <section className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className={FIELD_CLASS_NAME}>
                <label className="font-bold text-[var(--text)]" htmlFor="record-date">日期</label>
                <select
                  className={INPUT_CLASS_NAME}
                  id="record-date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                >
                  {TRIP_DATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className={FIELD_CLASS_NAME}>
                <label className="font-bold text-[var(--text)]" htmlFor="record-payment">支付</label>
                <select
                  className={INPUT_CLASS_NAME}
                  id="record-payment"
                  value={form.payment}
                  onChange={(event) => setForm((current) => ({ ...current, payment: event.target.value }))}
                >
                  {paymentRules.map((rule) => (
                    <option key={rule.paymentPlan} value={rule.paymentPlan}>{rule.paymentPlan}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="grid gap-3">
            <div className="grid gap-3">
              {renderFloatingInput('store', '商店', form, setForm)}
              {renderFloatingInput('category', '屬性', form, setForm)}
              {renderFloatingInput('name', '名稱', form, setForm)}
              {renderFloatingInput('japaneseName', '日文', form, setForm)}
            </div>
          </section>

          <section className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              {renderFloatingInput('quantity', '數量', form, setForm, 'number')}
              {renderFloatingInput('total', '日幣總計', form, setForm, 'number')}
            </div>
            <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_108px_minmax(0,1fr)]">
              {renderFloatingInput('jpyNet', '日幣未稅', form, setForm, 'number')}
              <div className={`${FIELD_CLASS_NAME} min-w-[108px]`}>
                <SegmentedControl
                  ariaLabel="稅"
                  options={TAX_OPTIONS.map((option) => ({ value: option, label: option }))}
                  value={form.tax}
                  onChange={(option) => setForm((current) => ({
                    ...current,
                    tax: current.tax === option ? '' : option,
                  }))}
                />
              </div>
              {renderFloatingInput('jpyAmount', '日幣金額', form, setForm, 'number')}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {renderFloatingInput('twdAmount', '台幣', form, setForm, 'number')}
              {renderFloatingInput('twdTotal', '台幣總計', form, setForm, 'number')}
            </div>
          </section>

          <StickySubmitBar className="grid grid-cols-[auto_minmax(0,1fr)] gap-[10px]">
            <button
              className={DANGER_BLOCK_BUTTON_CLASS_NAME}
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '刪除中...' : '刪除'}
            </button>
            <button
              className={PRIMARY_BLOCK_BUTTON_CLASS_NAME}
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? '儲存中...' : '儲存'}
            </button>
          </StickySubmitBar>
        </form>
      )}
    </AppShell>
  );
}

function renderFloatingInput(key, label, values, setValues, type = 'text') {
  return (
    <div className={FLOATING_FIELD_CLASS_NAME} key={key}>
      <div className={FLOATING_WRAP_CLASS_NAME}>
        <input
          className={FLOATING_INPUT_CLASS_NAME}
          id={key}
          type={type}
          value={values[key] ?? ''}
          placeholder=" "
          onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
        />
        <label className={`${FLOATING_LABEL_CLASS_NAME} peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[var(--accent)] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[var(--accent)]`} htmlFor={key}>{label}</label>
      </div>
    </div>
  );
}
