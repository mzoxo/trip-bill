import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import {
  DANGER_BLOCK_BUTTON_CLASS_NAME,
  PRIMARY_BLOCK_BUTTON_CLASS_NAME,
  RefreshButton,
  SaveOverlay,
  StickySubmitBar,
  StatusBanner,
} from '../../shared/ui.jsx';
import {
  CategoryChipsSection,
  ShoppingFormFields,
} from '../../shared/entryForm.jsx';
import { getAppSettings, hasAppSettings } from '../../lib/storage/settings.js';
import {
  deleteShoppingRecord,
  getAppData,
  updateShoppingRecord,
} from '../../lib/gas/client.js';


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

  const selectedPaymentRule = paymentRules.find((rule) => rule.paymentPlan === form.payment);
  const shouldShowTwdAmount = selectedPaymentRule?.paymentType === 'paypay';

  function handleJpyNetChange(value) { setForm((c) => ({ ...c, jpyNet: value })); }
  function handleTaxChange(value) { setForm((c) => ({ ...c, tax: c.tax === value ? '' : value })); }
  function handleJpyAmountChange(value) { setForm((c) => ({ ...c, jpyAmount: value })); }
  function handleQuantityChange(value) { setForm((c) => ({ ...c, quantity: value })); }
  function handleTotalChange(value) { setForm((c) => ({ ...c, total: value })); }

  return (
    <AppShell
      backHref="/index.html"
      title="編輯交易"
      currentPath=""
      hideNavigation
      actions={<RefreshButton isRefreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      {(isSaving || isDeleting) ? (
        <SaveOverlay>{isDeleting ? '刪除中...' : '儲存中...'}</SaveOverlay>
      ) : null}
      {message ? <StatusBanner>{message}</StatusBanner> : null}
      {isLoading ? (
        <StatusBanner tone="neutral">正在整理資料...</StatusBanner>
      ) : (
        <form className="grid gap-[14px]" onSubmit={handleSubmit}>
          <ShoppingFormFields
            form={form}
            setForm={setForm}
            paymentRules={paymentRules}
            onJpyNetChange={handleJpyNetChange}
            onTaxChange={handleTaxChange}
            onJpyAmountChange={handleJpyAmountChange}
            onQuantityChange={handleQuantityChange}
            onTotalChange={handleTotalChange}
            shouldShowTwdAmount={shouldShowTwdAmount}
            categorySection={(
              <CategoryChipsSection
                value={form.category}
                onChange={(v) => setForm((c) => ({ ...c, category: v }))}
              />
            )}
          />

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
