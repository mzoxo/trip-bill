import { useState } from 'react';
import { FloatingSelect, SegmentedControl, TEXT_INPUT_CLASS_NAME } from './ui.jsx';
import { TAX_OPTIONS, TRIP_DATE_OPTIONS } from '../lib/constants/trip.js';
import breadIcon from '../assets/openmoji/bread.svg';
import candyIcon from '../assets/openmoji/candy.svg';
import cookieIcon from '../assets/openmoji/cookie.svg';
import drinkIcon from '../assets/openmoji/drink.svg';
import electricPlugIcon from '../assets/openmoji/electric-plug.svg';
import framedPictureIcon from '../assets/openmoji/framed-picture.svg';
import giftIcon from '../assets/openmoji/gift.svg';
import glassesIcon from '../assets/openmoji/glasses.svg';
import hamburgerIcon from '../assets/openmoji/hamburger.svg';
import handbagIcon from '../assets/openmoji/handbag.svg';
import lipstickIcon from '../assets/openmoji/lipstick.svg';
import potOfFoodIcon from '../assets/openmoji/pot-of-food.svg';
import prayerBeadsIcon from '../assets/openmoji/prayer-beads.svg';
import shoppingBagsIcon from '../assets/openmoji/shopping-bags.svg';
import shortcakeIcon from '../assets/openmoji/shortcake.svg';
import tshirtIcon from '../assets/openmoji/t-shirt.svg';
import ticketsIcon from '../assets/openmoji/tickets.svg';
import trainIcon from '../assets/openmoji/train.svg';

const CATEGORY_OPTIONS = [
  { label: '食物', icon: hamburgerIcon },
  { label: '甜食', icon: shortcakeIcon },
  { label: '交通', icon: trainIcon },
  { label: '衣物', icon: tshirtIcon },
  { label: '飲料', icon: drinkIcon },
  { label: '餅乾', icon: cookieIcon },
  { label: '糖果', icon: candyIcon },
  { label: '伴手禮', icon: giftIcon },
  { label: '生活用品', icon: shoppingBagsIcon },
  { label: '藥妝', icon: lipstickIcon },
  { label: '眼鏡', icon: glassesIcon },
  { label: '門票', icon: ticketsIcon },
  { label: '紀念品', icon: framedPictureIcon },
  { label: '麵包', icon: breadIcon },
  { label: '食材', icon: potOfFoodIcon },
  { label: '包包', icon: handbagIcon },
  { label: '電器', icon: electricPlugIcon },
  { label: '代買', icon: shoppingBagsIcon },
  { label: '上供', icon: prayerBeadsIcon },
];

function joinClassNames(...values) {
  return values.filter(Boolean).join(' ');
}

const FLOATING_FIELD_CLASS_NAME = 'grid gap-0';
const FLOATING_WRAP_CLASS_NAME = 'relative';
const FLOATING_LABEL_CLASS_NAME = 'pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 rounded-full bg-white px-1 text-[14px] font-semibold text-[var(--muted)] transition-all duration-150';
const FLOATING_INPUT_CLASS_NAME = `${TEXT_INPUT_CLASS_NAME} peer`;

export function EntryFormSection({ className = '', children }) {
  return <section className={joinClassNames('grid gap-3', className)}>{children}</section>;
}

export function EntryFieldStack({ className = '', children }) {
  return <div className={joinClassNames('grid gap-3', className)}>{children}</div>;
}

export function EntryTwoColumnRow({ className = '', children }) {
  return <div className={joinClassNames('grid grid-cols-2 gap-3', className)}>{children}</div>;
}

export function EntryTripleAmountRow({ className = '', children }) {
  return (
    <div className={joinClassNames('grid items-start gap-3 grid-cols-[minmax(0,1fr)_108px_minmax(0,1fr)]', className)}>
      {children}
    </div>
  );
}

export function CategoryChipsSection({ value, onChange }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? CATEGORY_OPTIONS : CATEGORY_OPTIONS.slice(0, 8);
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <strong>屬性</strong>
        {CATEGORY_OPTIONS.length > 8 ? (
          <button
            type="button"
            className="border-0 bg-transparent text-[13px] font-bold text-[var(--accent)]"
            onClick={() => setShowAll((c) => !c)}
          >
            {showAll ? '收合' : '更多'}
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="屬性">
        {visible.map((option) => {
          const isSelected = value === option.label;
          return (
            <button
              key={option.label}
              type="button"
              className={isSelected ? 'inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-[14px] leading-none text-[var(--accent-deep)]' : 'inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-3 py-2 text-[14px] leading-none text-[#4b5563]'}
              aria-pressed={isSelected}
              onClick={() => onChange(value === option.label ? '' : option.label)}
            >
              <img className="h-5 w-5 shrink-0" src={option.icon} alt="" aria-hidden="true" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ShoppingFormFields({
  form,
  setForm,
  paymentRules,
  onJpyNetChange,
  onTaxChange,
  onJpyAmountChange,
  onQuantityChange,
  onTotalChange,
  shouldShowTwdAmount = false,
  categorySection = null,
  categoryField = null,
}) {
  return (
    <>
      <EntryFormSection>
        <EntryTwoColumnRow>
          <FloatingSelect
            className="min-w-0"
            id="entry-date"
            label="日期"
            value={form.date}
            onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
          >
            {TRIP_DATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </FloatingSelect>
          <FloatingSelect
            className="min-w-0"
            id="entry-payment"
            label="支付"
            value={form.payment}
            onChange={(e) => setForm((c) => ({ ...c, payment: e.target.value }))}
          >
            {paymentRules.length === 0 ? (
              <option value="Suica">Suica</option>
            ) : (
              paymentRules.map((rule) => (
                <option key={rule.paymentPlan} value={rule.paymentPlan}>{rule.paymentPlan}</option>
              ))
            )}
          </FloatingSelect>
        </EntryTwoColumnRow>
      </EntryFormSection>

      {categorySection}

      <EntryFormSection>
        <EntryFieldStack>
          <FloatingInput id="store" label="商店" value={form.store} onChange={(e) => setForm((c) => ({ ...c, store: e.target.value }))} />
          <FloatingInput id="name" label="名稱" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          <FloatingInput id="japaneseName" label="日文" value={form.japaneseName} onChange={(e) => setForm((c) => ({ ...c, japaneseName: e.target.value }))} />
          {categoryField}
        </EntryFieldStack>
      </EntryFormSection>

      <EntryFormSection>
        <EntryTripleAmountRow>
          <FloatingInput
            id="jpyNet"
            label="日幣未稅"
            type="number"
            value={form.jpyNet}
            onChange={(e) => onJpyNetChange(e.target.value)}
          />
          <div className="min-w-[108px]">
            <SegmentedControl
              ariaLabel="稅"
              options={TAX_OPTIONS}
              value={form.tax}
              onChange={onTaxChange}
            />
          </div>
          <FloatingInput
            id="jpyAmount"
            label="日幣金額"
            type="number"
            value={form.jpyAmount}
            onChange={(e) => onJpyAmountChange(e.target.value)}
          />
        </EntryTripleAmountRow>
        <EntryTwoColumnRow>
          <FloatingInput
            id="quantity"
            label="數量"
            type="number"
            value={form.quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
          />
          <FloatingInput
            id="total"
            label="日幣總計"
            type="number"
            value={form.total}
            onChange={(e) => onTotalChange(e.target.value)}
          />
        </EntryTwoColumnRow>
        {shouldShowTwdAmount ? (
          <FloatingInput
            id="twdAmount"
            label="台幣"
            type="number"
            value={form.twdAmount}
            onChange={(e) => setForm((c) => ({ ...c, twdAmount: e.target.value }))}
          />
        ) : null}
      </EntryFormSection>
    </>
  );
}

export function FloatingInput({ id, label, value, onChange, type = 'text' }) {
  return (
    <div className={FLOATING_FIELD_CLASS_NAME}>
      <div className={FLOATING_WRAP_CLASS_NAME}>
        <input
          className={FLOATING_INPUT_CLASS_NAME}
          id={id}
          type={type}
          value={value ?? ''}
          placeholder=" "
          onChange={onChange}
        />
        <label
          className={`${FLOATING_LABEL_CLASS_NAME} peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[var(--accent)] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[var(--accent)]`}
          htmlFor={id}
        >
          {label}
        </label>
      </div>
    </div>
  );
}
