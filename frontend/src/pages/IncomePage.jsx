import React from 'react';
import { Plus, Wallet } from 'lucide-react';
import { C, inr } from '../lib/constants';
import { SectionCard, EmptyState, Avatar } from '../components/common';

export default function IncomePage({ incomes, members, openAdd }) {
  return (
    <div className="rm-animate-in max-w-2xl">
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
              const adder = members.find((m) => m.name === i.addedBy);
              return (
                <div key={i.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#E6F5EF' }}>
                    <Wallet size={15} color={C.income} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{i.source}</p>
                    <p className="text-xs rm-text-secondary truncate">{i.date}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Avatar member={adder} size={26} />
                    <span className="text-xs rm-text-secondary hidden sm:inline">{adder?.you ? 'You' : i.addedBy}</span>
                  </div>
                  <span className="font-semibold text-sm w-20 text-right shrink-0" style={{ color: C.income }}>+{inr(i.amount)}</span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
