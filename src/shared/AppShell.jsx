import { ChartPie, House, Wallet } from 'lucide-react';
import '../styles/app.css';

const NAV_ITEMS = [
  { href: '/index.html', label: '總覽', icon: House },
  { href: '/assets.html', label: '資產', icon: Wallet },
  { href: '/advice.html', label: '建議', icon: ChartPie },
];

export function AppShell({ title, subtitle, currentPath, children, actions, hideNavigation = false }) {
  return (
    <div className="app-shell">
      <main className="content">
        <section className="app-frame">
          {actions && !title && !subtitle ? (
            <header className="app-topbar"><div className="actions-row">{actions}</div></header>
          ) : null}
          {title || subtitle ? (
            <header className="page-header">
              <div>
                {title ? <h2>{title}</h2> : null}
                {subtitle ? <p className="subtitle">{subtitle}</p> : null}
              </div>
              {actions ? <div className="actions-row">{actions}</div> : null}
            </header>
          ) : null}
          <div className="page-content">{children}</div>
          {hideNavigation ? null : (
            <nav className="bottom-nav">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  className={item.href === currentPath ? 'bottom-link is-active' : 'bottom-link'}
                  href={item.href}
                >
                  <item.icon size={18} strokeWidth={2} />
                  {item.label}
                </a>
              ))}
            </nav>
          )}
        </section>
      </main>
    </div>
  );
}
