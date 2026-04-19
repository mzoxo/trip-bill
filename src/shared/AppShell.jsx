import { ChevronLeft, ChartPie, House, Wallet } from 'lucide-react';
import '../styles/index.css';

const NAV_ITEMS = [
  { href: '/index.html', label: '總覽', icon: House },
  { href: '/assets.html', label: '資產', icon: Wallet },
  { href: '/advice.html', label: '建議', icon: ChartPie },
];

export function AppShell({ title, subtitle, currentPath, children, actions, hideNavigation = false, backHref = '' }) {
  return (
    <div className="app-shell min-h-screen bg-white text-[var(--text)]">
      <main className="content">
        <section className="app-frame">
          <header className="page-header page-header-fixed">
            <div className="page-header-side">
              {backHref ? (
                <a
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--accent-soft)] bg-white text-[var(--accent)]"
                  href={backHref}
                  aria-label="返回"
                  title="返回"
                >
                  <ChevronLeft size={16} strokeWidth={2.4} className="text-[var(--accent)]" />
                </a>
              ) : null}
            </div>
            <div className="page-header-center">
              {title ? <h2 className="m-0 text-base leading-none font-semibold">{title}</h2> : null}
              {subtitle ? <p className="subtitle text-[var(--muted)]">{subtitle}</p> : null}
            </div>
            <div className="page-header-actions">
              {actions ? <div className="actions-row flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          </header>
          <div className="grid gap-4 pt-4">{children}</div>
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
