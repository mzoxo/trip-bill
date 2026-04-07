import '../styles/app.css';

const NAV_ITEMS = [
  { href: '/index.html', label: '總覽' },
  { href: '/advice.html', label: '支付建議' },
  { href: '/ledger.html', label: '記帳' },
  { href: '/settings.html', label: '設定' },
];

export function AppShell({ title, subtitle, currentPath, children, actions }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <p className="brand-kicker">Sapporo Trip</p>
          <h1>旅程付款助手</h1>
          <p>用同一套資料整理記帳、付款狀態與即時建議。</p>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              className={item.href === currentPath ? 'nav-link is-active' : 'nav-link'}
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="page-header">
          <div>
            <p className="eyebrow">第一版骨架</p>
            <h2>{title}</h2>
            <p className="subtitle">{subtitle}</p>
          </div>
          {actions ? <div className="header-actions">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}
