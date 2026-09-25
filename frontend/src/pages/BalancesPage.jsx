import React from 'react';
import { ArrowRight, GitBranch, HandCoins, Sparkles } from 'lucide-react';
import { C, inr as money, CURRENCIES } from '../lib/constants';
import { SectionCard, Avatar, EmptyState } from '../components/common';

export default function BalancesPage({ balanceData = {}, members, onSettle, showSimplified = false, onSimplify, currency, onCurrency }) {
  const inr = (amount) => money(amount, currency);
  const net = balanceData.net || [];
  const pairwise = showSimplified ? (balanceData.simplified || []) : (balanceData.pairwise || []);
  const totalOwed = net.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const member = (id) => members.find((item) => item.id === id);

  return (
    <div className="rm-animate-in max-w-4xl space-y-4">
      <label className="text-sm flex gap-3 items-center">Balance currency<select className="rm-input w-28" value={currency} onChange={(e) => onCurrency(e.target.value)}>{CURRENCIES.map((code) => <option key={code}>{code}</option>)}</select></label><p className="text-xs rm-text-secondary">Each currency is settled separately. Amounts are never converted automatically.</p><div className="grid md:grid-cols-[1.2fr_.8fr] gap-4">
        <SectionCard>
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm rm-text-secondary">Outstanding across the household</p><p className="font-bold tabular-nums mt-1" style={{ fontSize: 32, color: C.text }}>{inr(totalOwed)}</p><p className="text-xs rm-text-secondary mt-1">Calculated from every expense and settlement.</p></div><div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}><HandCoins size={20} color={C.accentDark} /></div></div>
          <button onClick={onSettle} className="rm-btn rm-btn-primary mt-6 px-4 py-3 text-sm flex items-center justify-center gap-2 w-full sm:w-auto">Record a settlement <ArrowRight size={15} /></button>
        </SectionCard>
        <SectionCard>
          <div className="flex items-center gap-3 mb-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--purple-soft)' }}><Sparkles size={17} color="var(--purple-text)" /></div><div><p className="text-sm font-semibold" style={{ color: C.text }}>Simplify debts</p><p className="text-xs rm-text-secondary">Fewer payments, same totals.</p></div></div>
          <button type="button" role="switch" aria-checked={showSimplified} onClick={() => onSimplify(!showSimplified)} className="flex items-center justify-between w-full text-left min-h-11"><span className="text-sm" style={{ color: C.text }}>{showSimplified ? 'Showing suggested payments' : 'Showing original pair balances'}</span><span className={`toggle-pill ${showSimplified ? 'on' : ''}`}><span /></span></button>
          <p className="text-xs rm-text-secondary mt-2">RoomMate uses a transparent greedy pass to reduce the number of transfers.</p>
        </SectionCard>
      </div>

      <SectionCard title={showSimplified ? 'Suggested payments' : 'Pairwise balances'}>
        {pairwise.length === 0 ? <EmptyState icon={GitBranch} title="Everyone is settled" subtitle="New expenses will appear here when they change the group balance." /> : <div className="grid md:grid-cols-2 gap-3">{pairwise.map((entry, index) => { const from = member(entry.fromUserId); const to = member(entry.toUserId); return <div key={`${entry.fromUserId}-${entry.toUserId}-${index}`} className="balance-transfer"><Avatar member={from} size={38} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate" style={{ color: C.text }}>{from?.you ? 'You' : entry.fromName || from?.name} <span className="rm-text-secondary font-normal">pays</span> {to?.you ? 'You' : entry.toName || to?.name}</p><p className="text-xs rm-text-secondary mt-1">{showSimplified ? 'Suggested to settle the group' : 'Net balance between two people'}</p></div><span className="font-bold tabular-nums" style={{ color: C.expense }}>{inr(entry.amount)}</span></div>; })}</div>}
      </SectionCard>

      <SectionCard title="Member totals"><div className="grid sm:grid-cols-2 gap-x-8">{net.map((entry) => { const person = member(entry.userId); return <div key={entry.userId} className="flex items-center gap-3 py-3" style={{ borderBottom: `1px solid ${C.border}` }}><Avatar member={person} size={34} /><div className="flex-1"><p className="text-sm font-semibold" style={{ color: C.text }}>{person?.you ? 'You' : entry.name}</p><p className="text-xs rm-text-secondary">{entry.amount >= 0 ? 'is owed overall' : 'owes overall'}</p></div><span className="text-sm font-bold tabular-nums" style={{ color: entry.amount >= 0 ? C.accentDark : C.expense }}>{inr(Math.abs(entry.amount))}</span></div>; })}</div></SectionCard>
    </div>
  );
}
