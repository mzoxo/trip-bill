export function formatCurrency(value, currency = 'TWD') {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

export function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
