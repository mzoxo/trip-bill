import { useState } from 'react';
import { AppShell } from '../../shared/AppShell.jsx';
import { SectionCard, StatusBanner } from '../../shared/ui.jsx';
import { pingConnection } from '../../lib/gas/client.js';
import { getAppSettings, saveAppSettings } from '../../lib/storage/settings.js';

export function SettingsPage() {
  const [form, setForm] = useState(() => getAppSettings());
  const [message, setMessage] = useState('請填入 Google Apps Script Web App URL 與 token');
  const [tone, setTone] = useState('neutral');

  async function handleTestConnection() {
    const result = await pingConnection(form.webAppUrl, form.token);
    setMessage(result.success ? '連線測試成功' : result.message || '連線測試失敗');
    setTone(result.success ? 'success' : 'warning');
  }

  function handleSave(event) {
    event.preventDefault();
    saveAppSettings(form);
    setMessage('設定已保存到瀏覽器');
    setTone('success');
  }

  return (
    <AppShell
      title="設定"
      subtitle="第一版只保留一個必要設定，讓前端可以接通 Google Apps Script Web App。"
      currentPath="/settings.html"
    >
      <StatusBanner tone={tone}>{message}</StatusBanner>
      <section className="grid dual-grid">
        <SectionCard title="連線設定" description="可填完整 URL，或後續改成由 key 組成 URL。">
          <form className="form-grid" onSubmit={handleSave}>
            <div className="field is-full">
              <label htmlFor="webAppUrl">Google Apps Script Web App URL</label>
              <input
                id="webAppUrl"
                type="url"
                placeholder="https://script.google.com/macros/s/..."
                value={form.webAppUrl || ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, webAppUrl: event.target.value }))
                }
              />
              <p className="field-hint">如果你之後想只存 key，可以在這裡再加一層轉換。</p>
            </div>
            <div className="field is-full">
              <label htmlFor="token">Token</label>
              <input
                id="token"
                type="password"
                placeholder="輸入你的 token"
                value={form.token || ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, token: event.target.value }))
                }
              />
              <p className="field-hint">會和 Web App URL 一起保存在瀏覽器，並隨每次 request 送出。</p>
            </div>
            <div className="field is-full">
              <div className="actions-row">
                <button className="button button-primary" type="submit">
                  儲存設定
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={handleTestConnection}
                >
                  測試連線
                </button>
              </div>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="實作備註" description="這頁刻意維持最小設定，避免資料流過度複雜。">
          <div className="pill-list">
            <span className="pill">不使用 Google API Key</span>
            <span className="pill">所有讀寫都走同一個 GAS</span>
            <span className="pill">以 token 保護公開 Web App</span>
          </div>
        </SectionCard>
      </section>
    </AppShell>
  );
}
