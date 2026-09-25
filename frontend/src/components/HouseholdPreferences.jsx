import React, { useEffect, useState } from 'react';
import { Field, SectionCard } from './common';
import { api } from '../lib/api';

export function DefaultSplitSettings({ members, value, onSave }) {
  const [type, setType] = useState(value?.splitType || 'EQUAL');
  const [values, setValues] = useState(Object.fromEntries(members.map((m, i) => {
    const saved = value?.participants.find((p) => p.userId === m.id);
    return [m.id, saved ? String(saved.percent ?? saved.shares ?? 1) : String(Math.floor(10000 / members.length) / 100 + (i === 0 ? (10000 % members.length) / 100 : 0))];
  })));
  const [selected, setSelected] = useState(value?.participants.map((p) => p.userId).filter((id) => members.some((m) => m.id === id)) || members.map((m) => m.id));
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!selected.length) return setError('Choose at least one person.');
    const participants = selected.map((userId) => ({ userId, ...(type === 'PERCENT' ? { percent: Number(values[userId]) } : type === 'SHARES' ? { shares: Number(values[userId]) } : {}) }));
    if (type === 'PERCENT' && Math.abs(participants.reduce((sum, p) => sum + p.percent, 0) - 100) > 0.001) return setError('Percentages must total 100.');
    if (type === 'SHARES' && participants.some((p) => !Number.isFinite(p.shares) || p.shares <= 0)) return setError('Shares must be greater than zero.');
    setBusy(true); setError(''); try { if (!await onSave({ splitType: type, participants })) setError('Could not save the default split.'); } finally { setBusy(false); }
  };
  return <SectionCard title="Default expense split"><p className="text-xs rm-text-secondary mb-3">Start each new expense with your usual split. You can change individual expenses.</p><Field label="Split rule"><select className="rm-input" value={type} onChange={(e) => { setType(e.target.value); if (e.target.value === 'SHARES') setValues(Object.fromEntries(members.map((m) => [m.id, '1']))); }}><option value="EQUAL">Equally</option><option value="PERCENT">By percentage</option><option value="SHARES">By shares</option></select></Field>
    {members.map((m) => <div key={m.id} className="flex items-center gap-3 py-2"><label className="flex-1 flex gap-2 items-center"><input type="checkbox" checked={selected.includes(m.id)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, m.id] : ids.filter((id) => id !== m.id))} />{m.name}</label>{type !== 'EQUAL' && <input aria-label={`${m.name} default ${type.toLowerCase()}`} disabled={!selected.includes(m.id)} className="rm-input w-24" type="number" min="0" step="0.01" value={values[m.id] || ''} onChange={(e) => setValues({ ...values, [m.id]: e.target.value })} />}</div>)}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex gap-2 mt-3"><button disabled={busy} className="rm-btn rm-btn-primary px-4 py-2" onClick={save}>Save default split</button><button disabled={busy} className="rm-btn rm-btn-ghost px-4 py-2" onClick={() => onSave(null)}>Reset to equal</button></div>
  </SectionCard>;
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState(null); const [enabled, setEnabled] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => { let active = true; api.getPreferences().then((data) => { if (active) { setPrefs(data.preferences); setEnabled(data.emailConfigured); } }).catch((e) => { if (active) setMessage(e.message); }); return () => { active = false; }; }, []);
  const save = async () => { try { await api.updatePreferences(prefs); setMessage('Notification preferences saved.'); } catch (e) { setMessage(e.message); } };
  return <SectionCard title="Email notifications"><p className="text-xs rm-text-secondary mb-3">{enabled ? 'Choose which household updates you receive.' : 'Email delivery is not configured. You can save your preferences for when it is available.'}</p>{prefs && <>{[['newExpenses','Expense changes'],['recurringReminders','Upcoming recurring bills'],['settlements','Settlement updates']].map(([key,label]) => <label key={key} className="flex items-center gap-3 py-3"><input type="checkbox" checked={Boolean(prefs[key])} onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })} />{label}</label>)}<button className="rm-btn rm-btn-primary px-4 py-2 mt-2" onClick={save}>Save notification preferences</button></>}{message && <p role="status" className="text-sm mt-3">{message}</p>}</SectionCard>;
}
