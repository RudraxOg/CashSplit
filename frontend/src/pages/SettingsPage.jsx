import React, { useState } from 'react';
import { Pencil, ChevronDown } from 'lucide-react';
import { C } from '../lib/constants';
import { SectionCard, Toggle } from '../components/common';

export default function SettingsPage({ group, onSimplifyDebts }) {
  const [name, setName] = useState("My Flat");
  const [notifExpense, setNotifExpense] = useState(true);
  const [notifChore, setNotifChore] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);

  return (
    <div className="rm-animate-in max-w-xl space-y-4">
      <SectionCard title="Household">
        <label className="text-xs font-medium rm-text-secondary">Household name</label>
        <div className="flex items-center gap-2 mt-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} className="rm-input flex-1" />
          <button className="rm-btn rm-btn-ghost px-3 py-2"><Pencil size={14} /></button>
        </div>
        <label className="text-xs font-medium rm-text-secondary block mt-4">Currency</label>
        <div className="rm-input mt-1.5 w-32 flex items-center justify-between cursor-not-allowed" style={{ color: C.textSec }}>₹ INR <ChevronDown size={14} /></div>
      </SectionCard>

      <SectionCard title="Notifications">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium" style={{ color: C.text }}>New expenses</p><p className="text-xs rm-text-secondary">Get notified when a roommate adds an expense</p></div>
            <Toggle checked={notifExpense} onChange={setNotifExpense} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium" style={{ color: C.text }}>Chore reminders</p><p className="text-xs rm-text-secondary">Reminders for chores assigned to you</p></div>
            <Toggle checked={notifChore} onChange={setNotifChore} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium" style={{ color: C.text }}>Weekly digest</p><p className="text-xs rm-text-secondary">A weekly summary of household activity</p></div>
            <Toggle checked={notifDigest} onChange={setNotifDigest} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Balance behavior">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium" style={{ color: C.text }}>Simplify debts</p><p className="text-xs rm-text-secondary mt-1">Suggest fewer transfers while keeping everyone’s total unchanged.</p></div><Toggle checked={Boolean(group?.simplifyDebts)} onChange={onSimplifyDebts} /></div>
      </SectionCard>
    </div>
  );
}
