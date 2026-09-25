import React from 'react';
import { ArrowLeft, CalendarCheck2, ReceiptText, UsersRound } from 'lucide-react';

export function AuthLayout({ children, onBack = () => window.location.assign('/') }) {
  return <div className="rm-auth-scene">
    <button type="button" className="rm-auth-back" onClick={onBack}><ArrowLeft size={16} /> Back to home</button>
    <div className="rm-auth-shell">
      <aside className="rm-auth-story" aria-label="About RoomMate">
        <div className="rm-auth-story-brand"><img src="/icons/roommate-icon.svg" width="44" height="44" alt="" />roommate<span>.</span></div>
        <div className="rm-auth-story-copy"><p className="rm-auth-eyebrow">YOUR HOUSEHOLD, TOGETHER</p><p className="rm-auth-story-title">Good living starts with a little clarity.</p><p>Keep the money, chores, and plans you share in one calm place.</p></div>
        <div className="rm-auth-story-details"><span><ReceiptText size={18} /> Shared expenses</span><span><CalendarCheck2 size={18} /> Planned chores</span><span><UsersRound size={18} /> Everyone in sync</span></div>
      </aside>
      <main className="rm-auth-card"><a href="/" className="rm-auth-brand" aria-label="RoomMate home"><img src="/icons/roommate-icon.svg" width="42" height="42" alt="" /><span>roommate<span className="rm-auth-brand-dot">.</span></span></a>{children}</main>
    </div>
  </div>;
}
