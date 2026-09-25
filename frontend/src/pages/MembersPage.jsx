import React from 'react';
import { C, inr } from '../lib/constants';
import { Avatar } from '../components/common';

export default function MembersPage({ members, balances }) {
  return (
    <div className="rm-animate-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
      {members.map((m) => {
        const bal = balances.find((b) => b.member === m.name);
        return (
          <div key={m.id} className="rm-card rm-card-hover p-5 flex flex-col items-center text-center">
            <Avatar member={m} size={56} />
            <p className="font-semibold mt-3" style={{ color: C.text }}>{m.name}{m.you ? ' (You)' : ''}</p>
            <p className="text-xs rm-text-secondary mt-0.5">{m.you ? 'Your account' : 'Roommate'}</p>
            {bal && (
              <span className="text-xs font-semibold mt-3 px-2.5 py-1 rounded-full" style={{
                color: bal.settled ? C.textSec : (bal.type === 'gets' ? C.accentDark : C.expense),
                background: bal.settled ? 'var(--neutral-soft)' : (bal.type === 'gets' ? 'var(--accent-soft)' : 'var(--danger-soft)'),
              }}>
                {bal.settled ? 'Settled up' : `${bal.type === 'gets' ? 'Gets back' : 'Owes'} ${inr(bal.amount)}`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
