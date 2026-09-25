import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { C } from '../lib/constants';
import { SectionCard, Toggle } from '../components/common';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { DefaultSplitSettings, NotificationSettings } from '../components/HouseholdPreferences';

export default function SettingsPage({ group, members, onDefaultSplit, onSimplifyDebts, onRename }) {
  const [name, setName] = useState(group?.name || 'My Household');
  const [savingName, setSavingName] = useState(false);
  const { signOut } = useAuth();
  const [accountError, setAccountError] = useState('');
  const saveName = async () => { if (!name.trim() || name.trim() === group?.name) return; setSavingName(true); try { await onRename(name.trim()); } finally { setSavingName(false); } };

  const deleteAccount = async () => {
    if (!window.confirm('Delete your RoomMate account permanently? This cannot be undone.')) return;
    setAccountError('');
    try { await api.deleteAccount(); await signOut(); window.location.replace('/'); } catch (error) { setAccountError(error.message || 'Account deletion failed.'); }
  };

  return (
    <div className="rm-animate-in max-w-xl space-y-4">
      <SectionCard title="Household">
        <label className="text-xs font-medium rm-text-secondary" htmlFor="household-name">Household name</label>
        <div className="flex items-center gap-2 mt-1.5">
          <input id="household-name" value={name} onChange={(e) => setName(e.target.value)} className="rm-input flex-1" />
          <button type="button" aria-label="Save household name" disabled={savingName || !name.trim() || name.trim() === group?.name} onClick={saveName} className="rm-btn rm-btn-ghost min-w-11 min-h-11 px-3 py-2 disabled:opacity-40"><Pencil size={14} /></button>
        </div>
        <label className="text-xs font-medium rm-text-secondary block mt-4">Currency</label>
        <div className="rm-input mt-1.5 w-40 flex items-center justify-between" role="status" aria-label="Dashboard currency is Indian rupees" style={{ color: C.textSec }}>₹ INR <span className="text-[10px]">Dashboard</span></div>
      <p className="text-xs rm-text-secondary mt-2">Choose other supported currencies for individual expenses and in Balances.</p></SectionCard>

      <SectionCard title="Plan">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-sm font-semibold" style={{ color: C.text }}>{group?.plan || 'FREE'} plan</p><p className="text-xs rm-text-secondary mt-1">Up to {group?.maxMembers || 5} members on this household.</p></div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: C.accentDark, background: 'var(--accent-soft)' }}>{group?.plan === 'PLUS' ? 'Plus' : group?.plan === 'HOUSEHOLDS' ? 'Households' : 'Free'}</span>
        </div>
      </SectionCard>

      <SectionCard title="Balance behavior">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium" style={{ color: C.text }}>Simplify debts</p><p className="text-xs rm-text-secondary mt-1">Suggest fewer transfers while keeping everyone’s total unchanged.</p></div><Toggle checked={Boolean(group?.simplifyDebts)} onChange={onSimplifyDebts} /></div>
      </SectionCard>

      <DefaultSplitSettings key={JSON.stringify(group.defaultSplit)} members={members} value={group.defaultSplit} onSave={onDefaultSplit} />
      <NotificationSettings />
      <SectionCard title="Account">
        <div className="flex flex-wrap gap-2">
          <button className="rm-btn rm-btn-ghost px-4 py-2 text-sm" onClick={() => signOut().then(() => window.location.replace('/signin')).catch((error) => setAccountError(error.message))}>Sign out</button>
          <button className="rm-btn text-sm px-4 py-2" style={{ color: C.expense, border: `1px solid ${C.expense}`, background: 'transparent' }} onClick={deleteAccount}>Delete account</button>
        </div>
        {accountError && <p className="text-xs mt-3" style={{ color: C.expense }}>{accountError}</p>}
      </SectionCard>
    </div>
  );
}
