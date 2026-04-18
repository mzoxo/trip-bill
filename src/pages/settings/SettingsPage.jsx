import { useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import {
  PanelCard,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
  StatusBanner,
  TextInput,
} from '../../shared/ui.jsx';
import { clearAppDataCache, pingConnection } from '../../lib/gas/client.js';
import { getAppSettings, saveAppSettings } from '../../lib/storage/settings.js';

export function SettingsPage() {
  const [form, setForm] = useState(() => getAppSettings());
  const [message, setMessage] = useState('請填入 Google Apps Script Web App URL 與 token');
  const [tone, setTone] = useState('neutral');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleTestConnection() {
    setIsTesting(true);
    setMessage('測試連線中...');
    setTone('neutral');

    try {
      const result = await pingConnection(form.webAppUrl, form.token);
      setMessage(result.success ? '連線測試成功' : result.message || '連線測試失敗');
      setTone(result.success ? 'success' : 'warning');
    } finally {
      setIsTesting(false);
    }
  }

  function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage('儲存設定中...');
    setTone('neutral');

    try {
      saveAppSettings(form);
      clearAppDataCache();
      setMessage('設定已保存到瀏覽器');
      setTone('success');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell
      title="設定"
      subtitle=""
      currentPath="/settings.html"
      hideNavigation
    >
      <StatusBanner tone={tone}>{message}</StatusBanner>
      <section className="grid gap-4">
        <PanelCard className="p-[18px]">
          <div className="mb-[18px]">
            <h3 className="m-0 text-base font-semibold text-[var(--text)]">連線設定</h3>
          </div>
          <form className="grid gap-[14px]" onSubmit={handleSave}>
            <div className="grid gap-2">
              <label className="font-bold text-[var(--text)]" htmlFor="webAppUrl">
                Google Apps Script Web App URL
              </label>
              <TextInput
                id="webAppUrl"
                type="url"
                placeholder="https://script.google.com/macros/s/..."
                value={form.webAppUrl || ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, webAppUrl: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="font-bold text-[var(--text)]" htmlFor="token">
                Token
              </label>
              <TextInput
                id="token"
                type="password"
                placeholder="輸入你的 token"
                value={form.token || ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, token: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className={PRIMARY_BUTTON_CLASS_NAME}
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? '儲存中...' : '儲存設定'}
              </button>
              <button
                className={SECONDARY_BUTTON_CLASS_NAME}
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? '測試中...' : '測試連線'}
              </button>
            </div>
          </form>
        </PanelCard>
      </section>
    </AppShell>
  );
}
