function joinClassNames(...values) {
  return values.filter(Boolean).join(' ');
}

export const PANEL_CARD_CLASS_NAME = 'rounded-[10px] border border-[var(--line)] bg-white';
export const TEXT_INPUT_CLASS_NAME = 'min-h-11 w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-[10px] text-[var(--text)] outline-none transition focus:border-[var(--accent)]';
export const HEADER_ICON_BUTTON_CLASS_NAME = 'inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--accent)] disabled:opacity-60';
export const PRIMARY_BUTTON_CLASS_NAME = 'rounded-full border border-transparent bg-[var(--accent)] px-4 py-[10px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60';
export const PRIMARY_BLOCK_BUTTON_CLASS_NAME = 'min-h-12 w-full rounded-[10px] border border-transparent bg-[var(--accent)] px-4 py-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60';
export const DANGER_BLOCK_BUTTON_CLASS_NAME = 'min-h-12 min-w-24 rounded-[10px] border border-transparent bg-[#d9485f] px-4 py-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60';
export const SECONDARY_BUTTON_CLASS_NAME = 'rounded-full border border-[var(--line)] bg-white px-4 py-[10px] font-bold text-[var(--text)] transition disabled:cursor-not-allowed disabled:opacity-60';
export const BACK_LINK_CLASS_NAME = 'text-[13px] font-bold text-[var(--accent)]';
export const CATEGORY_CHIP_CLASS_NAME = 'inline-flex min-h-5 items-center rounded-full bg-[var(--accent-soft)] px-2 text-[12px] font-bold leading-none text-[var(--accent-deep)]';

export function PanelCard({ className = '', children, ...props }) {
  return (
    <section className={joinClassNames(PANEL_CARD_CLASS_NAME, className)} {...props}>
      {children}
    </section>
  );
}

export function TextInput({ className = '', ...props }) {
  return <input className={joinClassNames(TEXT_INPUT_CLASS_NAME, className)} {...props} />;
}

export function HeaderIconButton({ className = '', children, ...props }) {
  return (
    <button className={joinClassNames(HEADER_ICON_BUTTON_CLASS_NAME, className)} type="button" {...props}>
      {children}
    </button>
  );
}

export function BackLink({ className = '', children, ...props }) {
  return (
    <section className="flex justify-start">
      <a className={joinClassNames(BACK_LINK_CLASS_NAME, className)} {...props}>
        {children}
      </a>
    </section>
  );
}

export function RecordListLink({
  href,
  leading = null,
  title,
  meta = null,
  primary,
  secondary = null,
  className = '',
}) {
  return (
    <a
      className={joinClassNames('flex items-center justify-between gap-3 rounded-[10px] border border-[var(--line)] bg-white px-3 py-[10px] text-inherit no-underline', className)}
      href={href}
    >
      <div className="flex min-w-0 items-center gap-3 text-[14px]">
        {leading}
        <div>
          <strong>{title}</strong>
          {meta ? <div className="mt-[6px] flex flex-wrap items-center gap-[6px] text-[12px]">{meta}</div> : null}
        </div>
      </div>
      <div className="grid gap-1 text-right">
        <strong className="whitespace-nowrap">{primary}</strong>
        {secondary ? <span className="text-[12px] text-[var(--muted)]">{secondary}</span> : null}
      </div>
    </a>
  );
}

export function CategoryChip({ className = '', children }) {
  return <span className={joinClassNames(CATEGORY_CHIP_CLASS_NAME, className)}>{children}</span>;
}

export function LoadingCard({ className = '', children = '資料整理中...' }) {
  return (
    <article className={joinClassNames('grid gap-1 rounded-[14px] border border-[#f0f0f0] bg-white p-4', className)}>
      <div className="min-w-0">
        <strong>{children}</strong>
      </div>
    </article>
  );
}

export function SegmentedControl({ options, value, onChange, ariaLabel, className = '' }) {
  return (
    <div
      className={joinClassNames('grid min-h-11 grid-cols-2 gap-1 rounded-[10px] border border-[#e5e7eb] bg-white p-1', className)}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={isSelected ? 'min-h-[34px] rounded-[8px] bg-[#edf4ff] text-[13px] font-bold text-[var(--accent)]' : 'min-h-[34px] rounded-[8px] bg-transparent text-[13px] font-bold text-[var(--muted)]'}
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
          >
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function StickySubmitBar({ className = '', children }) {
  return (
    <div className={joinClassNames('sticky bottom-[74px] bg-[linear-gradient(180deg,rgba(245,247,250,0)_0%,#f5f7fa_26%)] pt-[6px]', className)}>
      {children}
    </div>
  );
}

export function AssetStatusCard({
  className = '',
  onClick,
  onKeyDown,
  paymentPlan,
  leading,
  action = null,
  amount,
  amountClassName = '',
  helper = null,
  summary,
}) {
  return (
    <article
      className={joinClassNames('grid gap-[10px] rounded-[14px] border border-[#f0f0f0] bg-white px-4 py-3', className)}
      role="link"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5">
              <strong>{paymentPlan}</strong>
              {action}
            </div>
          </div>
        </div>
        <div className="grid justify-items-end gap-0.5">
          <strong className={joinClassNames('m-0 text-right text-[15px] font-bold whitespace-nowrap', amountClassName)}>
            {amount}
          </strong>
          {helper}
        </div>
      </div>
      <p className={summary.className}>{summary.content}</p>
    </article>
  );
}

export function SettingsToggleRow({
  className = '',
  title,
  checked,
  disabled = false,
  onToggle,
}) {
  return (
    <label className={joinClassNames('flex items-center justify-between gap-4 rounded-[14px] border border-[var(--line)] bg-white px-4 py-3 text-[14px]', className)}>
      <div className="grid gap-1">
        <strong>{title}</strong>
      </div>
      <button
        type="button"
        className={checked ? 'relative h-7 w-12 rounded-full bg-[#3b82f6]' : 'relative h-7 w-12 rounded-full bg-[#d7dce3]'}
        aria-pressed={checked}
        disabled={disabled}
        onClick={onToggle}
      >
        <span className={checked ? 'absolute top-[3px] left-[3px] h-[22px] w-[22px] translate-x-5 rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.16)] transition-transform' : 'absolute top-[3px] left-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.16)] transition-transform'} />
      </button>
    </label>
  );
}

export function StatusBanner({ tone = 'neutral', children }) {
  return <div className={`status-banner status-${tone}`}>{children}</div>;
}
