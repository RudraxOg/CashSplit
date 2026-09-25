import React from 'react';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { C, inr } from '../lib/constants';
import { SectionCard, EmptyState, Avatar } from '../components/common';

export default function IncomePage({ incomes, members, openAdd, onEdit, onDelete }) {
  const isPersonal = (income) => (income.incomeType || 'PERSONAL') === 'PERSONAL';
  const personTotal = (member) => incomes.filter((income) => isPersonal(income) && (income.ownerUserId === member.id || (!income.ownerUserId && income.addedBy === member.name))).reduce((total, income) => total + Number(income.amount || 0), 0);
  const personalTotal = incomes.filter(isPersonal).reduce((total, income) => total + Number(income.amount || 0), 0);
  const householdTotal = incomes.filter((income) => !isPersonal(income)).reduce((total, income) => total + Number(income.amount || 0), 0);
  return (
    <div className="rm-animate-in max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div className="rm-card p-4"><p className="text-xs rm-text-secondary">Shared household income</p><p className="text-xl font-bold mt-1" style={{ color: C.text }}>{inr(householdTotal)}</p><p className="text-[11px] rm-text-secondary mt-1">Only this amount appears in combined household totals.</p></div>
        <div className="rm-card p-4"><p className="text-xs rm-text-secondary">Personal income · kept separate</p><p className="text-xl font-bold mt-1" style={{ color: C.text }}>{inr(personalTotal)}</p><p className="text-[11px] rm-text-secondary mt-1">{members.length} member totals, excluded from household totals.</p></div>
      </div>
      <SectionCard title="Personal income by person" className="mb-4">
        <div className="divide-y" style={{ borderColor: C.border }}>
          {members.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 py-2.5"><span className="text-sm" style={{ color: C.text }}>{member.you ? 'You' : member.name}</span><span className="text-sm font-semibold" style={{ color: C.income }}>{inr(personTotal(member))}</span></div>)}
        </div>
      </SectionCard>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm rm-text-secondary">{incomes.length} income entries</p>
        <button onClick={() => openAdd('income')} className="rm-btn rm-btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
          <Plus size={15} /> Add Income
        </button>
      </div>
      <SectionCard>
        {incomes.length === 0 ? (
          <EmptyState icon={Wallet} title="No income yet" subtitle="Add the household's first income entry." actionLabel="Add Income" onAction={() => openAdd('income')} />
        ) : (
          <div className="divide-y" style={{ borderColor: C.border }}>
            {incomes.map((i) => {
              const personal = isPersonal(i);
              const owner = members.find((m) => m.id === i.ownerUserId || m.id === i.addedBy || m.name === i.ownerName || m.name === i.addedBy);
              return (
                <div key={i.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                    <Wallet size={15} color={C.income} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{i.source}</p>
                    <p className="text-xs rm-text-secondary truncate">{i.date} · {personal ? `Personal · ${owner?.you ? 'You' : owner?.name || i.ownerName || i.addedBy || 'Member'}` : 'Shared household income'}</p>
                  </div>
                  {personal && <div className="flex items-center gap-2 shrink-0"><Avatar member={owner} size={26} /><span className="text-xs rm-text-secondary hidden sm:inline">{owner?.you ? 'You' : owner?.name || i.ownerName || i.addedBy || 'Member'}</span></div>}
                  <span className="font-semibold text-sm w-20 text-right shrink-0" style={{ color: C.income }}>+{inr(i.amount, i.currency)}</span><button onClick={() => onEdit(i)} className="p-1 cursor-pointer" aria-label="Edit income"><Pencil size={14} color={C.textSec} /></button><button onClick={() => { if (window.confirm('Delete this income entry?')) onDelete(i.id); }} className="p-1 cursor-pointer" aria-label="Delete income"><Trash2 size={14} color={C.expense} /></button>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
