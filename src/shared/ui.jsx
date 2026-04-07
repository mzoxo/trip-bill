export function StatCard({ label, value, hint }) {
  return (
    <article className="card stat-card">
      <p className="card-label">{label}</p>
      <p className="card-value">{value}</p>
      {hint ? <p className="card-hint">{hint}</p> : null}
    </article>
  );
}

export function SectionCard({ title, description, children }) {
  return (
    <section className="card section-card">
      <div className="section-heading">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function StatusBanner({ tone = 'neutral', children }) {
  return <div className={`status-banner status-${tone}`}>{children}</div>;
}
