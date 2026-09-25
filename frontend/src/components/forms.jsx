import React, { useState } from 'react';
import { CreditCard, Wallet, ListChecks, ShoppingCart, Equal, Percent, Scale, ListTree, ReceiptText, RotateCcw, UsersRound } from 'lucide-react';
import { C, CATEGORY_COLORS, CURRENCIES } from '../lib/constants';
import { localISODate } from '../lib/dates';
import { Field } from './common';

const ADD_OPTIONS = [
  { id: 'expense', label: 'Expense', icon: CreditCard, color: C.expense },
  { id: 'income', label: 'Income', icon: Wallet, color: C.income },
  { id: 'chore', label: 'Chore', icon: ListChecks, color: C.chores },
  { id: 'purchase', label: 'Purchase', icon: ShoppingCart, color: C.shopping },
];

export function AddMenu({ onPick, onClose }) {
  return (
    <div className="fixed bottom-24 right-5 md:bottom-28 md:right-8 rm-card p-2 z-40 rm-modal-in w-56">
      <p className="text-xs font-semibold rm-text-secondary px-2 py-1.5">What do you want to add?</p>
      {ADD_OPTIONS.map((o) => (
        <button type="button" key={o.id} onClick={() => { onPick(o.id); onClose(); }} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer rm-hover-surface text-left min-h-11">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${o.color}1A` }}>
            <o.icon size={15} color={o.color} />
          </div>
          <span className="text-sm font-medium" style={{ color: C.text }}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

const SPLIT_OPTIONS = [
  { id: 'EQUAL', label: 'Equally', helper: 'Split evenly', icon: Equal },
  { id: 'SHARES', label: 'By shares', helper: '1 : 2 : 1', icon: Scale },
  { id: 'PERCENT', label: 'By percent', helper: '100% total', icon: Percent },
  { id: 'EXACT', label: 'Exact amounts', helper: 'Set each amount', icon: ReceiptText },
  { id: 'ADJUSTMENT', label: 'Adjustment', helper: '+ / − amounts', icon: RotateCcw },
  { id: 'ITEMIZED', label: 'Itemized', helper: 'Split line items', icon: ListTree },
];

export function ExpenseForm({ members, defaultSplit, onSubmit, onClose }) {
  const savedSplit = defaultSplit?.participants?.every((p) => members.some((m) => m.id === p.userId)) ? defaultSplit : null;
  const [frequency, setFrequency] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [currency, setCurrency] = useState('INR');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [amount, setAmount] = useState('');
  const [splitType, setSplitType] = useState(savedSplit?.splitType || 'EQUAL');
  const [paidBy, setPaidBy] = useState(members[0]?.id || '');
  const [reimbursement, setReimbursement] = useState(false);
  const [participantIds, setParticipantIds] = useState(savedSplit?.participants.map((p) => p.userId) || members.map((member) => member.id));
  const [values, setValues] = useState(Object.fromEntries((savedSplit?.participants || []).map((p) => [p.userId, p.percent ?? p.shares ?? 0])));
  const [payers, setPayers] = useState([{ userId: members[0]?.id || '', amount: '' }]);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const setValue = (userId, value) => setValues((current) => ({ ...current, [userId]: value }));
  const selectedMembers = members.filter((member) => participantIds.includes(member.id));
  const toggleParticipant = (userId) => setParticipantIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  const togglePayer = (userId) => setPayers((current) => {
    if (current.some((payer) => payer.userId === userId)) return current.filter((payer) => payer.userId !== userId);
    return [...current, { userId, amount: '' }];
  });

  const updatePayerAmount = (userId, value) => setPayers((current) => current.map((payer) => payer.userId === userId ? { ...payer, amount: value } : payer));

  const defaultPercent = (id) => ((Math.floor(10000 / selectedMembers.length) + (selectedMembers[0]?.id === id ? 10000 % selectedMembers.length : 0)) / 100).toFixed(2);
  const participantsPayload = selectedMembers.map((member) => {
    const raw = values[member.id];
    if (splitType === 'PERCENT') return { userId: member.id, percent: raw === undefined ? defaultPercent(member.id) : raw };
    if (splitType === 'SHARES') return { userId: member.id, shares: raw === undefined ? 1 : raw };
    if (splitType === 'EXACT') return { userId: member.id, amount: raw === undefined ? '' : raw };
    if (splitType === 'ADJUSTMENT') return { userId: member.id, adjustment: raw === undefined ? 0 : raw };
    return { userId: member.id };
  });

  const validate = () => {
    const total = Number(amount);
    if (!date) return 'Choose an expense date.';
    if (!payers.length) return 'Choose at least one payer.';
    if (!note.trim()) return 'Add a description so your household knows what this was for.';
    if (!Number.isFinite(total) || total <= 0) return 'Enter an amount greater than zero.';
    if (!participantIds.length) return 'Choose at least one person to split this expense with.';
    const payerRows = payers.map((payer) => ({ ...payer, amount: payer.amount === '' ? (payers.length === 1 ? total : 0) : Number(payer.amount) }));
    if (payerRows.some((payer) => !Number.isFinite(payer.amount) || payer.amount < 0)) return 'Payer amounts must be valid positive numbers.';
    if (Math.abs(payerRows.reduce((sum, payer) => sum + payer.amount, 0) - total) > 0.01) return 'Payer amounts must add up to the total.';
    if (splitType === 'PERCENT' && Math.abs(participantsPayload.reduce((sum, participant) => sum + Number(participant.percent), 0) - 100) > 0.01) return 'Percentages must add up to 100%.';
    if (splitType === 'EXACT' && Math.abs(participantsPayload.reduce((sum, participant) => sum + Number(participant.amount || 0), 0) - total) > 0.01) return 'Exact amounts must add up to the total.';
    if (splitType === 'ITEMIZED' && (!itemName.trim() || Number(itemPrice) <= 0 || Math.abs(Number(itemPrice) - total) > 0.01)) return 'Add one item whose price matches the expense total.';
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }
    setFormError('');
    setSubmitting(true);
    const total = Number(amount);
    const normalizedPayers = payers.map((payer) => ({ userId: payer.userId, paidAmount: payer.amount === '' ? total : Number(payer.amount) }));
    try {
      const success = await onSubmit({
        groupId: 'g1', description: note.trim(), category, categoryId: category,
        totalAmount: total, currency, splitType, participants: participantsPayload,
        payers: normalizedPayers, reimbursement, reimbursementPayerId: paidBy,
        items: splitType === 'ITEMIZED' ? [{ name: itemName.trim(), price: Number(itemPrice), participants: selectedMembers.map((member) => ({ userId: member.id, shares: 1 })) }] : undefined,
        date, frequency, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (success) onClose();
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-[1.2fr_.8fr] gap-3">
        <Field label="What was it for?"><input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Dinner at Miso" className="rm-input w-full" /></Field>
        <Field label={`Total amount (${currency})`}><input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="rm-input w-full" /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3"><Field label="Date"><input className="rm-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Repeat"><select className="rm-input" value={frequency} onChange={(e) => setFrequency(e.target.value)}><option value="">None</option><option value="WEEKLY">Weekly</option><option value="FORTNIGHTLY">Every two weeks</option><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></Field></div>{frequency && <p className="text-xs rm-text-secondary">The first expense will post on this date. Manage future entries in Recurring expenses.</p>}
      <Field label="Currency"><select className="rm-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((code) => <option key={code}>{code}</option>)}</select></Field>
      <Field label="Category">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rm-input w-full">
          {Object.keys(CATEGORY_COLORS).map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2"><div><p className="text-sm font-semibold" style={{ color: C.text }}>How should it split?</p><p className="text-xs rm-text-secondary">Choose a rule, then adjust each person below.</p></div><UsersRound size={18} color={C.accent} /></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SPLIT_OPTIONS.map((option) => { const Icon = option.icon; const active = splitType === option.id; return <button key={option.id} type="button" aria-pressed={active} onClick={() => setSplitType(option.id)} className={`split-option ${active ? 'active' : ''}`}><Icon size={17} /><span><strong>{option.label}</strong><small>{option.helper}</small></span></button>; })}
        </div>
      </div>

      <div className="rounded-2xl p-3 sm:p-4" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-3"><p className="text-sm font-semibold" style={{ color: C.text }}>People in this split</p><button type="button" onClick={() => setParticipantIds(participantIds.length === members.length ? [] : members.map((member) => member.id))} className="text-xs font-semibold cursor-pointer" style={{ color: C.accentDark }}>{participantIds.length === members.length ? 'Clear all' : 'Select all'}</button></div>
        <div className="space-y-2">
          {members.map((member) => { const selected = participantIds.includes(member.id); return <div key={member.id} className="flex items-center gap-2 min-h-11"><button type="button" aria-pressed={selected} onClick={() => toggleParticipant(member.id)} className={`split-check ${selected ? 'checked' : ''}`}>{selected ? '✓' : ''}</button><span className="text-sm flex-1" style={{ color: C.text }}>{member.you ? 'You' : member.name}</span>{selected && splitType !== 'EQUAL' && splitType !== 'ITEMIZED' && <input aria-label={`${member.name} ${splitType.toLowerCase()} value`} type="number" step="0.01" min={splitType === 'ADJUSTMENT' ? undefined : '0'} value={values[member.id] ?? (splitType === 'SHARES' ? 1 : splitType === 'PERCENT' ? defaultPercent(member.id) : '')} onChange={(e) => setValue(member.id, e.target.value)} className="rm-input w-28 text-right" placeholder={splitType === 'ADJUSTMENT' ? '0' : '0.00'} />}</div>; })}
        </div>
        {splitType === 'ITEMIZED' && <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}><p className="text-xs font-semibold rm-text-secondary mb-2">Line item</p><div className="grid grid-cols-[1fr_100px] gap-2"><input value={itemName} onChange={(e) => setItemName(e.target.value)} className="rm-input" placeholder="Item name" /><input value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} className="rm-input" type="number" min="0" step="0.01" placeholder="Price" /></div><p className="text-xs rm-text-secondary mt-2">Assign this item to the selected people above.</p></div>}
      </div>

      <div className="rounded-2xl p-3 sm:p-4" style={{ background: 'var(--selected-surface)', border: '1px solid var(--accent-soft-border)' }}>
        <div className="flex items-center justify-between mb-3"><div><p className="text-sm font-semibold" style={{ color: C.text }}>Who paid?</p><p className="text-xs rm-text-secondary">Add more than one payer when needed.</p></div><select value={paidBy} onChange={(e) => { setPaidBy(e.target.value); setPayers([{ userId: e.target.value, amount: '' }]); }} className="rm-input w-auto text-xs"><option value="">Choose</option>{members.map((member) => <option key={member.id} value={member.id}>{member.you ? 'You' : member.name}</option>)}</select></div>
        <div className="space-y-2">{members.map((member) => { const payer = payers.find((item) => item.userId === member.id); return <div key={member.id} className="flex items-center gap-2 min-h-11"><button type="button" aria-pressed={Boolean(payer)} onClick={() => togglePayer(member.id)} className={`split-check ${payer ? 'checked' : ''}`}>{payer ? '✓' : ''}</button><span className="text-sm flex-1" style={{ color: C.text }}>{member.you ? 'You' : member.name}</span>{payer && payers.length > 1 && <input aria-label={`${member.name} paid amount`} type="number" min="0" step="0.01" value={payer.amount} onChange={(e) => updatePayerAmount(member.id, e.target.value)} className="rm-input w-28 text-right" placeholder="0.00" />}</div>; })}</div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer min-h-11"><input type="checkbox" checked={reimbursement} onChange={(e) => setReimbursement(e.target.checked)} className="accent-[#16A67A]" /><span><span className="text-sm font-semibold block" style={{ color: C.text }}>This is a reimbursement</span><span className="text-xs rm-text-secondary">Reverse the direction of what the group owes.</span></span></label>
      {formError && <p role="alert" className="text-sm rounded-xl px-3 py-2" style={{ color: 'var(--danger-text)', background: 'var(--danger-soft)' }}>{formError}</p>}
      <button disabled={submitting} onClick={submit} className="rm-btn rm-btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? 'Saving expense…' : 'Save expense'}</button>
    </div>
  );
}

export function IncomeForm({ members, onSubmit, onClose }) {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [incomeType, setIncomeType] = useState('PERSONAL');
  const [ownerUserId, setOwnerUserId] = useState(members.find((member) => member.you)?.id || members[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    try { if (await onSubmit({ source, amount: Number(amount), incomeType, ownerUserId })) onClose(); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <Field label="Source"><input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Freelance Work" className="rm-input w-full" /></Field>
      <Field label="Amount (₹)"><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="rm-input w-full" /></Field>
      <Field label="Income belongs to">
        <select value={incomeType} onChange={(e) => setIncomeType(e.target.value)} className="rm-input w-full">
          <option value="PERSONAL">One household member</option>
          <option value="HOUSEHOLD">Shared household income</option>
        </select>
      </Field>
      {incomeType === 'PERSONAL' && <Field label="Person"><select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} className="rm-input w-full">{members.map((m) => <option key={m.id} value={m.id}>{m.you ? 'You' : m.name}</option>)}</select></Field>}
      <p className="text-xs rm-text-secondary">Personal earnings are shown per person and excluded from household income totals.</p>
      <button
        disabled={!amount || !source || submitting}
        onClick={submit}
        className="rm-btn rm-btn-primary w-full py-2.5 text-sm mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add Income
      </button>
    </div>
  );
}

export function ChoreForm({ members, initialDate, onSubmit, onClose }) {
  const [name, setName] = useState('');
  const [assignedTo, setAssignedTo] = useState(members[0]?.name || '');
  const [dueDate, setDueDate] = useState(() => initialDate || localISODate());
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [timed, setTimed] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [timeError, setTimeError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    const error = choreScheduleError(timed, startTime, durationMinutes);
    if (error) { setTimeError(error); return; }
    setTimeError('');
    setSubmitting(true);
    try { if (await onSubmit({ name, assignedTo, dueDate, startTime: timed ? startTime : null, durationMinutes: timed ? Number(durationMinutes) : null, recurrenceRule: recurrenceRule || null })) onClose(); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <Field label="Chore name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vacuuming" className="rm-input w-full" /></Field>
      <Field label="Assign to">
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="rm-input w-full">
          {members.map((m) => <option key={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <Field label="Due date"><input type="date" value={dueDate} min={localISODate()} onChange={(e) => setDueDate(e.target.value)} className="rm-input w-full" /></Field>
      <ChoreScheduleFields {...{ timed, setTimed, startTime, setStartTime, durationMinutes, setDurationMinutes, timeError }} />
      <Field label="Repeat (optional)"><select value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value)} className="rm-input w-full"><option value="">Does not repeat</option><option value="FREQ=DAILY">Every day</option><option value="FREQ=WEEKLY">Every week</option><option value="FREQ=MONTHLY">Every month</option></select></Field>
      <button
        disabled={!name || submitting}
        onClick={submit}
        className="rm-btn rm-btn-primary w-full py-2.5 text-sm mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add Chore
      </button>
    </div>
  );
}

function choreScheduleError(timed, startTime, durationMinutes) {
  if (!timed) return '';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return 'Choose a start time.';
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration < 1 || duration > 720) return 'Duration must be from 1 minute to 12 hours.';
  const [hours, minutes] = startTime.split(':').map(Number);
  if (hours * 60 + minutes + duration > 1440) return 'The chore must finish by midnight. Choose an earlier time or shorter duration.';
  return '';
}

function ChoreScheduleFields({ timed, setTimed, startTime, setStartTime, durationMinutes, setDurationMinutes, timeError }) {
  return <div className="space-y-3">
    <Field label="Time of day"><select className="rm-input w-full" value={timed ? 'timed' : 'anytime'} onChange={(event) => setTimed(event.target.value === 'timed')}><option value="anytime">Anytime that day</option><option value="timed">Set a start time and duration</option></select></Field>
    {timed && <div className="grid grid-cols-2 gap-3"><Field label="Start time"><input aria-label="Start time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="rm-input w-full" required /></Field><Field label="Duration (minutes)"><input aria-label="Duration (minutes)" type="number" inputMode="numeric" min="1" max="720" step="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} className="rm-input w-full" required /></Field></div>}
    {timeError && <p role="alert" className="text-sm" style={{ color: 'var(--danger-text)' }}>{timeError}</p>}
  </div>;
}

export function PurchaseForm({ onSubmit, onClose }) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    try { if (await onSubmit({ name, priority })) onClose(); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <Field label="Item name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paper towels" className="rm-input w-full" /></Field>
      <Field label="Priority">
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rm-input w-full">
          <option>High</option><option>Medium</option><option>Low</option>
        </select>
      </Field>
      <button
        disabled={!name || submitting}
        onClick={submit}
        className="rm-btn rm-btn-primary w-full py-2.5 text-sm mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add Item
      </button>
    </div>
  );
}

export function PurchaseExpenseForm({ item, onSubmit, onClose }) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) { setError('Enter the amount paid for this item.'); return; }
    setError(''); setSubmitting(true);
    try { if (await onSubmit(item.id, Number(amount))) onClose(); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <p className="text-sm rm-text-secondary mb-4">This will create an equal expense for everyone in the household, paid by you.</p>
      <Field label={`Amount paid for ${item?.name || 'this item'} (₹)`}>
        <input autoFocus type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="rm-input w-full" />
      </Field>
      {error && <p role="alert" className="text-sm rounded-xl px-3 py-2 mb-3" style={{ color: 'var(--danger-text)', background: 'var(--danger-soft)' }}>{error}</p>}
      <button disabled={submitting} onClick={submit} className="rm-btn rm-btn-primary w-full py-2.5 text-sm disabled:opacity-50">
        {submitting ? 'Recording purchase…' : 'Record purchase'}
      </button>
    </div>
  );
}

export function SettlementForm({ members, currency = 'INR', pairwise = [], onSubmit, onClose }) {
  const suggested = pairwise[0];
  const [fromUserId, setFromUserId] = useState(suggested?.fromUserId || members.find((member) => !member.you)?.id || members[0]?.id || '');
  const [toUserId, setToUserId] = useState(suggested?.toUserId || members.find((member) => member.id !== fromUserId)?.id || '');
  const [amount, setAmount] = useState(suggested?.amount ? String(suggested.amount) : '');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!fromUserId || !toUserId || fromUserId === toUserId) return setError('Choose two different household members.');
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return setError('Enter a settlement amount greater than zero.');
    setError(''); setSubmitting(true);
    try { if (await onSubmit({ fromUserId, toUserId, amount: Number(amount), method, note, currency })) onClose(); } finally { setSubmitting(false); }
  };

  return <div className="space-y-4">
    <div className="rounded-2xl p-4" style={{ background: 'var(--selected-surface)', border: '1px solid var(--accent-soft-border)' }}><p className="text-sm font-semibold" style={{ color: C.text }}>Record money that changed hands</p><p className="text-xs rm-text-secondary mt-1">This keeps the original expense history intact and reduces the outstanding balance.</p></div>
    <div className="grid sm:grid-cols-2 gap-3"><Field label="From"><select value={fromUserId} onChange={(e) => setFromUserId(e.target.value)} className="rm-input">{members.map((member) => <option key={member.id} value={member.id}>{member.you ? 'You' : member.name}</option>)}</select></Field><Field label="To"><select value={toUserId} onChange={(e) => setToUserId(e.target.value)} className="rm-input">{members.filter((member) => member.id !== fromUserId).map((member) => <option key={member.id} value={member.id}>{member.you ? 'You' : member.name}</option>)}</select></Field></div>
    <div className="grid sm:grid-cols-2 gap-3"><Field label={`Amount (${currency})`}><input autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="0.01" className="rm-input" placeholder="0.00" /></Field><Field label="Method"><select value={method} onChange={(e) => setMethod(e.target.value)} className="rm-input"><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="upi">UPI</option><option value="other">Other</option></select></Field></div>
    <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} className="rm-input" placeholder="e.g. UPI received" /></Field>
    {error && <p role="alert" className="text-sm rounded-xl px-3 py-2" style={{ color: 'var(--danger-text)', background: 'var(--danger-soft)' }}>{error}</p>}
    <button disabled={submitting} onClick={submit} className="rm-btn rm-btn-primary w-full py-3 text-sm disabled:opacity-50">{submitting ? 'Saving settlement…' : 'Record settlement'}</button>
  </div>;
}

export function EditExpenseForm({ expense, onSubmit, onClose }) {
  const [description, setDescription] = useState(expense.description || expense.note || '');
  const [amount, setAmount] = useState(String(expense.totalAmount ?? expense.amount ?? ''));
  const [category, setCategory] = useState(expense.category || 'Others');
  const [date, setDate] = useState(expense.date || new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!description.trim() || Number(amount) <= 0) return;
    setBusy(true);
    try {
      const total = Number(amount);
      const previousTotal = Number(expense.totalAmount ?? expense.amount ?? total);
      const ratio = previousTotal > 0 ? total / previousTotal : 1;
      const splitType = expense.splitType || 'EQUAL';
      const participants = (expense.participants || expense.shares || []).map((item) => {
        const participant = { userId: item.userId };
        if (splitType === 'PERCENT') participant.percent = item.percentValue;
        if (splitType === 'SHARES') participant.shares = item.shareValue;
        if (splitType === 'EXACT') participant.amount = Math.round(Number(item.owedAmount || 0) * ratio * 100) / 100;
        if (splitType === 'ADJUSTMENT') participant.adjustment = Math.round(Number(item.adjustmentValue || 0) * ratio * 100) / 100;
        return participant;
      });
      const payers = (expense.payers || []).map((item) => ({ userId: item.userId, paidAmount: Math.round(Number(item.paidAmount || 0) * ratio * 100) / 100 }));
      if (payers.length) payers[0].paidAmount = Math.round((payers[0].paidAmount + total - payers.reduce((sum, item) => sum + item.paidAmount, 0)) * 100) / 100;
      if (splitType === 'EXACT' && participants.length) participants[0].amount = Math.round((participants[0].amount + total - participants.reduce((sum, item) => sum + Number(item.amount || 0), 0)) * 100) / 100;
      const items = splitType === 'ITEMIZED' ? (expense.items || []).map((item) => ({ name: item.name, price: Math.round(Number(item.price || 0) * ratio * 100) / 100, participants: participants.map((participant) => ({ userId: participant.userId, shares: 1 })) })) : undefined;
      const ok = await onSubmit({ description: description.trim(), totalAmount: total, category, categoryId: category, currency: expense.currency || 'INR', date, splitType, participants, payers, items, reimbursement: Boolean(expense.reimbursement), reimbursementPayerId: payers[0]?.userId });
      if (ok) onClose();
    } finally { setBusy(false); }
  };
  return <div className="space-y-3"><Field label="Description"><input className="rm-input w-full" value={description} onChange={(e) => setDescription(e.target.value)} /></Field><Field label="Amount (₹)"><input className="rm-input w-full" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field><Field label="Category"><select className="rm-input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>{Object.keys(CATEGORY_COLORS).map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Date"><input className="rm-input w-full" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><button disabled={busy} onClick={save} className="rm-btn rm-btn-primary w-full py-3">{busy ? 'Saving…' : 'Save changes'}</button></div>;
}

export function EditIncomeForm({ income, members = [], onSubmit, onClose }) {
  const [source, setSource] = useState(income.source || '');
  const [amount, setAmount] = useState(String(income.amount || ''));
  const [date, setDate] = useState(income.date || new Date().toISOString().slice(0, 10));
  const [incomeType, setIncomeType] = useState(income.incomeType || 'PERSONAL');
  const [ownerUserId, setOwnerUserId] = useState(income.ownerUserId || members.find((member) => member.name === income.addedBy)?.id || members[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const save = async () => { if (!source.trim() || Number(amount) <= 0) return; setBusy(true); try { if (await onSubmit({ source: source.trim(), amount: Number(amount), date, incomeType, ownerUserId })) onClose(); } finally { setBusy(false); } };
  return <div className="space-y-3"><Field label="Source"><input className="rm-input w-full" value={source} onChange={(e) => setSource(e.target.value)} /></Field><Field label="Amount (₹)"><input className="rm-input w-full" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field><Field label="Date"><input className="rm-input w-full" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Income belongs to"><select value={incomeType} onChange={(e) => setIncomeType(e.target.value)} className="rm-input w-full"><option value="PERSONAL">One household member</option><option value="HOUSEHOLD">Shared household income</option></select></Field>{incomeType === 'PERSONAL' && <Field label="Person"><select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} className="rm-input w-full">{members.map((member) => <option key={member.id} value={member.id}>{member.you ? 'You' : member.name}</option>)}</select></Field>}<button disabled={busy} onClick={save} className="rm-btn rm-btn-primary w-full py-3">{busy ? 'Saving…' : 'Save changes'}</button></div>;
}

export function EditChoreForm({ chore, members, onSubmit, onClose }) {
  const [name, setName] = useState(chore.name || '');
  const initialMember = members.find((member) => member.name === chore.assignedTo || member.id === chore.assigned_to);
  const [assignedTo, setAssignedTo] = useState(initialMember?.name || members[0]?.name || '');
  const [dueDate, setDueDate] = useState(chore.dueDate || new Date().toISOString().slice(0, 10));
  const [recurrenceRule, setRecurrenceRule] = useState(chore.recurrenceRule || '');
  const [timed, setTimed] = useState(Boolean(chore.startTime));
  const [startTime, setStartTime] = useState(chore.startTime || '09:00');
  const [durationMinutes, setDurationMinutes] = useState(String(chore.durationMinutes || 30));
  const [timeError, setTimeError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => { if (!name.trim()) return; const error = choreScheduleError(timed, startTime, durationMinutes); if (error) { setTimeError(error); return; } setTimeError(''); setBusy(true); try { if (await onSubmit({ name: name.trim(), assignedTo, dueDate, startTime: timed ? startTime : null, durationMinutes: timed ? Number(durationMinutes) : null, recurrenceRule: recurrenceRule || null })) onClose(); } finally { setBusy(false); } };
  return <div className="space-y-3"><Field label="Chore name"><input className="rm-input w-full" value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Assign to"><select className="rm-input w-full" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>{members.map((member) => <option key={member.id}>{member.name}</option>)}</select></Field><Field label="Due date"><input className="rm-input w-full" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field><ChoreScheduleFields {...{ timed, setTimed, startTime, setStartTime, durationMinutes, setDurationMinutes, timeError }} /><Field label="Repeat"><select className="rm-input w-full" value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value)}><option value="">Does not repeat</option><option value="FREQ=DAILY">Every day</option><option value="FREQ=WEEKLY">Every week</option><option value="FREQ=MONTHLY">Every month</option></select></Field><button disabled={busy} onClick={save} className="rm-btn rm-btn-primary w-full py-3">{busy ? 'Saving…' : 'Save changes'}</button></div>;
}

export function EditShoppingForm({ item, onSubmit, onClose }) {
  const [name, setName] = useState(item.name || '');
  const [priority, setPriority] = useState(item.priority || 'Medium');
  const [busy, setBusy] = useState(false);
  const save = async () => { if (!name.trim()) return; setBusy(true); try { if (await onSubmit({ name: name.trim(), priority, purchased: item.purchased })) onClose(); } finally { setBusy(false); } };
  return <div className="space-y-3"><Field label="Item name"><input className="rm-input w-full" value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Priority"><select className="rm-input w-full" value={priority} onChange={(e) => setPriority(e.target.value)}><option>High</option><option>Medium</option><option>Low</option></select></Field><button disabled={busy} onClick={save} className="rm-btn rm-btn-primary w-full py-3">{busy ? 'Saving…' : 'Save changes'}</button></div>;
}
