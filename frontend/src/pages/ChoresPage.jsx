import React from 'react';
import { Plus, ListChecks, X } from 'lucide-react';
import { C } from '../lib/constants';
import { SectionCard, EmptyState } from '../components/common';
import { ChoreRow } from '../components/home';

const GROUPS = ['overdue', 'pending', 'upcoming', 'completed'];
const GROUP_LABEL = { overdue: 'Overdue', pending: 'Pending', upcoming: 'Upcoming', completed: 'Completed' };

export default function ChoresPage({ chores, members, onToggle, onDelete, openAdd }) {
  return (
    <div className="rm-animate-in">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm rm-text-secondary">{chores.length} chores tracked</p>
        <button onClick={() => openAdd('chore')} className="rm-btn rm-btn-primary text-sm px-4 py-2 flex items-center gap-1.5"><Plus size={15} /> Add Chore</button>
      </div>
      {chores.length === 0 ? (
        <SectionCard><EmptyState icon={ListChecks} title="No chores assigned" subtitle="Create your first household chore." actionLabel="Add Chore" onAction={() => openAdd('chore')} /></SectionCard>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {GROUPS.map((g) => {
            const items = chores.filter((c) => c.status === g);
            return (
              <SectionCard key={g} title={`${GROUP_LABEL[g]} (${items.length})`}>
                {items.length === 0 ? (
                  <p className="text-sm rm-text-secondary py-4 text-center">Nothing here</p>
                ) : (
                  <div className="divide-y" style={{ borderColor: C.border }}>
                    {items.map((c) => (
                      <div key={c.id} className="group">
                        <ChoreRow chore={c} members={members} onToggle={onToggle} showWhen />
                        <button onClick={() => onDelete(c.id)} className="text-xs rm-text-secondary opacity-0 group-hover:opacity-100 transition-opacity -mt-2 mb-2 flex items-center gap-1 cursor-pointer">
                          <X size={11} /> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
