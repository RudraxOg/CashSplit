import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CATEGORY_COLORS } from '../lib/constants';
import { Field } from './common';
import { resizeTemplate } from '../lib/expenseTemplates';

export function ExpenseTools({ groupId, members, filters, onChange }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key, value) => onChange({ ...filters, [key]: value });
  const download = async () => {
    setBusy(true); setError('');
    try {
      const blob = await api.exportLedger(groupId);
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = 'roommate-ledger.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <section className="rm-card p-4 mb-4" aria-label="Find expenses">
    <div className="flex flex-wrap items-end gap-3"><div className="flex-1 min-w-48"><Field label="Search expenses"><input type="search" className="rm-input w-full" value={filters.q || ''} onChange={(e) => change('q', e.target.value)} placeholder="Description, such as rent" /></Field></div><button className="rm-btn rm-btn-ghost px-4 py-3 mb-4" disabled={busy} onClick={download}>{busy ? 'Preparing…' : 'Export household CSV'}</button></div>
    <details><summary className="text-sm cursor-pointer py-2">Filter by date, category, person, or amount</summary><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-3 mt-3">
      <Field label="From date"><input type="date" className="rm-input" value={filters.from || ''} onChange={(e) => change('from', e.target.value)} /></Field>
      <Field label="To date"><input type="date" className="rm-input" value={filters.to || ''} onChange={(e) => change('to', e.target.value)} /></Field>
      <Field label="Category"><select className="rm-input" value={filters.category || ''} onChange={(e) => change('category', e.target.value)}><option value="">All categories</option>{Object.keys(CATEGORY_COLORS).map((c) => <option key={c}>{c}</option>)}</select></Field>
      {['payer', 'participant'].map((key) => <Field key={key} label={key === 'payer' ? 'Paid by' : 'Split with'}><select className="rm-input" value={filters[key] || ''} onChange={(e) => change(key, e.target.value)}><option value="">Anyone</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>)}
      <Field label="Minimum amount"><input type="number" min="0" step="0.01" className="rm-input" value={filters.min || ''} onChange={(e) => change('min', e.target.value)} /></Field>
      <Field label="Maximum amount"><input type="number" min="0" step="0.01" className="rm-input" value={filters.max || ''} onChange={(e) => change('max', e.target.value)} /></Field>
      <button className="rm-btn rm-btn-ghost self-start px-3 py-3" onClick={() => onChange({})}>Clear filters</button>
    </div></details>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}

export function RecurringExpenses({ groupId }) {
  const [rows, setRows] = useState([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(null);
  const refresh = () => api.getExpenseSeries(groupId).then(setRows).catch((e) => setError(e.message));
  useEffect(() => { let active = true; api.getExpenseSeries(groupId).then((data) => { if (active) setRows(data); }).catch((e) => { if (active) setError(e.message); }); return () => { active = false; }; }, [groupId]);
  const update = async (row, patch) => { setBusy(row.id); setError(''); try { await api.updateExpenseSeries(row.id, { ...patch, version: row.version }); await refresh(); } catch (e) { setError(e.message); } finally { setBusy(null); } };
  return <details className="rm-card p-4 mb-4" onToggle={(e) => { if (e.currentTarget.open) refresh(); }}><summary className="cursor-pointer font-semibold text-sm">Recurring expenses</summary><p className="text-xs rm-text-secondary mt-2">Changes apply to future entries. Past expenses keep their original amounts.</p>
    {error && <p role="alert" className="text-sm text-red-700 mt-2">{error}</p>}
    {!rows.length && <p className="text-sm rm-text-secondary mt-3">Choose Repeat when adding an expense to schedule rent or bills.</p>}
    {rows.map((row) => <div key={row.id} className="py-3 border-b flex flex-wrap gap-3 items-center"><div className="flex-1"><strong className="text-sm">{row.template.description || row.template.note}</strong><p className="text-xs rm-text-secondary">{row.frequency.toLowerCase()} · {row.active ? `Next ${row.next_date}` : 'Paused'} · {row.time_zone}</p>{row.last_error && <p className="text-xs text-red-700">Needs attention: {row.last_error}</p>}</div><button disabled={busy === row.id} className="rm-btn rm-btn-ghost px-3 py-2 text-sm" onClick={() => update(row, { active: !row.active })}>{row.active ? 'Pause' : 'Resume'}</button><form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); try { update(row, { template: { ...resizeTemplate(row.template, Number(data.get('amount'))), description: data.get('description') } }); } catch (e) { setError(e.message); } }}><input aria-label={`Future description for ${row.template.description}`} name="description" defaultValue={row.template.description || row.template.note} maxLength={160} required className="rm-input w-44" /><input aria-label={`Future amount for ${row.template.description}`} name="amount" type="number" min="0.01" step="0.01" required defaultValue={row.template.totalAmount ?? row.template.amount} className="rm-input w-24" /><button disabled={busy === row.id} className="rm-btn rm-btn-ghost px-3 text-sm">Update future entries</button></form></div>)}
  </details>;
}
