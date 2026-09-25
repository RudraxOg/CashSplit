import React, { cloneElement, isValidElement, useEffect, useId, useRef } from 'react';
import { ArrowUp, ArrowDown, CheckCircle2, X } from 'lucide-react';
import { C } from '../lib/constants';

export function Avatar({ member, size = 40 }) {
  const initials = member?.initials || (member?.name || '?').slice(0, 1).toUpperCase();
  const color = member?.color || C.textSec;
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, background: color, color: '#fff', fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

export function Badge({ children, color, bg }) {
  return (
    <span className="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap" style={{ color, background: bg }}>
      {children}
    </span>
  );
}

export function Delta({ value }) {
  const up = value >= 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: up ? C.accent : C.expense }}>
      {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(value)}% vs last month
    </span>
  );
}

export function ProgressBar({ pct, color = C.accent }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--neutral-soft)' }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 rm-animate-in">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--neutral-soft)' }}>
        <Icon size={24} color={C.textSec} />
      </div>
      <p className="font-semibold" style={{ color: C.text }}>{title}</p>
      <p className="text-sm rm-text-secondary mt-1 max-w-[220px]">{subtitle}</p>
      {actionLabel && (
        <button onClick={onAction} className="rm-btn rm-btn-primary text-sm px-4 py-2 mt-4">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function SectionCard({ title, action, children, className = '' }) {
  return (
    <div className={`rm-card rm-card-hover p-5 md:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold" style={{ fontSize: 17, color: C.text }}>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  const generatedId = useId();
  const child = isValidElement(children) ? cloneElement(children, { id: children.props.id || generatedId }) : children;
  return (
    <div className="mb-4">
      <label htmlFor={isValidElement(child) ? child.props.id : undefined} className="text-xs font-medium rm-text-secondary block mb-1.5">{label}</label>
      {child}
    </div>
  );
}

export function Toggle({ checked, onChange, label = 'Toggle setting' }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0"
      style={{ background: checked ? C.accent : C.border }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const previousFocus = useRef(document.activeElement);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = previousFocus.current;
    const panel = panelRef.current;
    const focusable = () => [...(panel?.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])];
    focusable()[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable(); if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(23,32,51,0.52)' }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`rm-card rm-modal-in w-full ${wide ? 'max-w-2xl' : 'max-w-sm'} max-h-[calc(100dvh-2rem)] overflow-y-auto p-6`}>
        <div className="flex items-center justify-between mb-5">
          <h3 id={titleId} className="font-semibold" style={{ fontSize: 17, color: C.text }}>{title}</h3>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="cursor-pointer min-w-11 min-h-11 flex items-center justify-center"><X size={18} color={C.textSec} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 z-50 rm-modal-in">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium" style={{ background: 'var(--hero-bg)', color: 'var(--hero-text)' }}>
        <CheckCircle2 size={16} color={C.accent} /> {message}
      </div>
    </div>
  );
}
