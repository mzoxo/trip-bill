import {
  samplePaymentRules,
  sampleShoppingRecords,
  sampleSuicaRecords,
} from '../../shared/sampleData.js';

const APP_DATA_CACHE_KEY = 'travel-ledger-app-data-cache';

function normalizeResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return { success: false, data: null, message: '回傳格式不正確' };
  }

  return {
    success: Boolean(payload.success),
    data: payload.data ?? null,
    message: payload.message ?? '',
  };
}

async function sendRequest(webAppUrl, action, body = {}) {
  if (!webAppUrl) {
    return { success: false, data: null, message: '尚未設定 Google Apps Script Web App URL' };
  }

  const requestPayload = {
    action,
    token: body.token ?? '',
    ...body,
  };

  const response = await fetch(webAppUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(requestPayload),
  });

  if (!response.ok) {
    return { success: false, data: null, message: `連線失敗：${response.status}` };
  }

  const text = await response.text();
  const responsePayload = JSON.parse(text);
  return normalizeResponse(responsePayload);
}

function getCacheKey(webAppUrl, token) {
  return `${webAppUrl}::${token}`;
}

function readAppDataCache(webAppUrl, token) {
  const raw = window.localStorage.getItem(APP_DATA_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    const isMismatched = parsed.key !== getCacheKey(webAppUrl, token);

    if (isMismatched) {
      window.localStorage.removeItem(APP_DATA_CACHE_KEY);
      return null;
    }

    return parsed.data ?? null;
  } catch {
    window.localStorage.removeItem(APP_DATA_CACHE_KEY);
    return null;
  }
}

function writeAppDataCache(webAppUrl, token, data) {
  window.localStorage.setItem(
    APP_DATA_CACHE_KEY,
    JSON.stringify({
      key: getCacheKey(webAppUrl, token),
      data,
    }),
  );
}

export function clearAppDataCache(webAppUrl, token) {
  const cached = webAppUrl && token ? readAppDataCache(webAppUrl, token) : null;
  window.localStorage.removeItem(APP_DATA_CACHE_KEY);
  if (cached?.latestRate) {
    writeAppDataCache(webAppUrl, token, {
      latestRate: cached.latestRate,
      rateHistory: cached.rateHistory ?? [],
    });
  }
}

export async function pingConnection(webAppUrl, token = '') {
  if (!webAppUrl) {
    return { success: false, data: null, message: '尚未填寫 Web App URL' };
  }

  try {
    return await sendRequest(webAppUrl, 'ping', { token });
  } catch (error) {
    return { success: false, data: null, message: error.message };
  }
}

export async function getAppData(webAppUrl, token = '', options = {}) {
  if (!webAppUrl) {
    return {
      success: true,
      data: {
        shoppingRecords: sampleShoppingRecords,
        suicaRecords: sampleSuicaRecords,
        paymentRules: samplePaymentRules,
      },
      message: '目前使用本機示意資料',
    };
  }

  const forceRefresh = Boolean(options.forceRefresh);
  const cached = readAppDataCache(webAppUrl, token);

  if (!forceRefresh) {
    if (cached) {
      if (!cached.latestRate) {
        return getAppData(webAppUrl, token, { forceRefresh: true });
      }
      return { success: true, data: cached, message: '' };
    }
  }

  const hasRate = Boolean(cached?.latestRate);
  try {
    const result = await sendRequest(webAppUrl, 'getAppData', { token, skipRate: hasRate });
    if (result.success && result.data) {
      if (hasRate && !result.data.latestRate) {
        result.data.latestRate = cached.latestRate;
        result.data.rateHistory = cached.rateHistory ?? [];
      }
      writeAppDataCache(webAppUrl, token, result.data);
    }
    return result;
  } catch (error) {
    return { success: false, data: null, message: error.message };
  }
}


export async function getShoppingRecords(webAppUrl, token = '') {
  if (!webAppUrl) {
    return { success: true, data: sampleShoppingRecords, message: '目前使用本機示意資料' };
  }

  try {
    return await sendRequest(webAppUrl, 'getShoppingRecords', { token });
  } catch (error) {
    return { success: false, data: null, message: error.message };
  }
}

export async function getSuicaRecords(webAppUrl, token = '') {
  if (!webAppUrl) {
    return { success: true, data: sampleSuicaRecords, message: '目前使用本機示意資料' };
  }

  try {
    return await sendRequest(webAppUrl, 'getSuicaRecords', { token });
  } catch (error) {
    return { success: false, data: null, message: error.message };
  }
}

export async function getPaymentRules(webAppUrl, token = '') {
  if (!webAppUrl) {
    return { success: true, data: samplePaymentRules, message: '目前使用本機示意資料' };
  }

  try {
    return await sendRequest(webAppUrl, 'getPaymentRules', { token });
  } catch (error) {
    return { success: false, data: null, message: error.message };
  }
}

export async function createShoppingRecord(webAppUrl, token, record) {
  if (!webAppUrl) {
    return { success: false, data: null, message: '尚未設定 Web App URL' };
  }

  try {
    const result = await sendRequest(webAppUrl, 'createShoppingRecord', { token, record });
    if (result.success) {
      clearAppDataCache(webAppUrl, token);
    }
    return result;
  } catch (error) {
    return { success: false, data: null, message: error.message };
  }
}

export async function updateShoppingRecord(webAppUrl, token, rowNumber, record) {
  if (!webAppUrl) {
    return { success: false, data: null, message: '尚未設定 Web App URL' };
  }

  try {
    const result = await sendRequest(webAppUrl, 'updateShoppingRecord', {
      token,
      rowNumber,
      record,
    });
    if (result.success) {
      clearAppDataCache(webAppUrl, token);
    }
    return result;
  } catch (error) {
    return { success: false, data: null, message: error.message };
  }
}

export async function deleteShoppingRecord(webAppUrl, token, rowNumber) {
  if (!webAppUrl) {
    return { success: false, data: null, message: '尚未設定 Web App URL' };
  }

  try {
    const result = await sendRequest(webAppUrl, 'deleteShoppingRecord', {
      token,
      rowNumber,
    });
    if (result.success) {
      clearAppDataCache(webAppUrl, token);
    }
    return result;
  } catch (error) {
    return { success: false, data: null, message: error.message };
  }
}

export async function createSuicaRecord(webAppUrl, token, record) {
  if (!webAppUrl) {
    return { success: false, data: null, message: '尚未設定 Web App URL' };
  }

  try {
    const result = await sendRequest(webAppUrl, 'createSuicaRecord', { token, record });
    if (result.success) {
      clearAppDataCache(webAppUrl, token);
    }
    return result;
  } catch (error) {
    return { success: false, data: null, message: error.message };
  }
}

export async function updatePaymentRuleEnabled(webAppUrl, token, paymentPlan, enabled) {
  if (!webAppUrl) {
    return { success: false, data: null, message: '尚未設定 Web App URL' };
  }

  try {
    const result = await sendRequest(webAppUrl, 'updatePaymentRuleEnabled', {
      token,
      paymentPlan,
      enabled,
    });
    if (result.success) {
      clearAppDataCache(webAppUrl, token);
    }
    return result;
  } catch (error) {
    return { success: false, data: null, message: error.message };
  }
}
