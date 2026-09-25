import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Link2, Plus, Users, Wallet } from 'lucide-react';
import { C, inr } from '../lib/constants';
import { SectionCard } from '../components/common';
import { isLocalInviteLink, shareableInviteUrl } from '../lib/inviteLinks';

export default function GroupsPage({ groups, overview, activeGroupId, onSelect, onCreate, onInvite }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const create = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    const result = await onCreate(name.trim());
    if (result) setName('');
  };

  const invite = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    const result = await onInvite(email.trim());
    if (result) {
      const link = shareableInviteUrl(result, window.location.origin);
      setEmail(''); setInviteLink(link);
      setMessage(link && isLocalInviteLink(link)
        ? 'Invite created for local testing. A localhost link only opens on this computer; use a public app URL to invite someone on another device.'
        : 'Invite created. Share the link with your roommate.');
    }
  };

  const copyInvite = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(inviteLink);
      else { const input = document.createElement('textarea'); input.value = inviteLink; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove(); }
      setCopied(true);
      setMessage(isLocalInviteLink(inviteLink)
        ? 'Copied for local testing. A localhost link cannot be opened from another device.'
        : 'Invite link copied. Send it to your roommate.');
      window.setTimeout(() => setCopied(false), 2400);
    } catch { setMessage('Copy failed. Select the link and copy it manually.'); }
  };

  return (
    <div className="space-y-5 rm-animate-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rm-card p-5 md:col-span-2" style={{ background: 'var(--hero-bg)', color: 'var(--hero-text)' }}>
          <p className="text-xs uppercase tracking-wider opacity-60">Across your groups</p>
          <p className="text-3xl font-bold mt-2">{inr(overview?.combined?.totalExpenses || 0)}</p>
          <p className="text-sm opacity-70 mt-1">combined expenses · {overview?.combined?.groupCount || 0} groups</p>
        </div>
        <div className="rm-card p-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)' }}><Wallet size={19} color={C.accentDark} /></div>
          <p className="text-xs rm-text-secondary">Combined household income</p>
          <p className="text-2xl font-bold mt-1" style={{ color: C.text }}>{inr(overview?.combined?.totalIncome || 0)}</p>
        </div>
      </div>

      <SectionCard title="Your groups" action={<span className="text-xs rm-text-secondary">Select a group to switch the app</span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(overview?.groups || groups).map((item) => (
            <button key={item.id} onClick={() => onSelect(item.id)} className="text-left p-4 rounded-2xl border cursor-pointer transition-all" style={{ borderColor: item.id === activeGroupId ? C.accent : C.border, background: item.id === activeGroupId ? 'var(--selected-surface)' : C.surface }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="font-semibold truncate" style={{ color: C.text }}>{item.name}</p><p className="text-xs rm-text-secondary mt-1">{item.memberCount || 0} members · {item.plan || 'FREE'} plan</p></div>
                <ArrowRight size={17} color={item.id === activeGroupId ? C.accent : C.textSec} />
              </div>
              <div className="flex items-end justify-between mt-5"><div><p className="text-xs rm-text-secondary">Total expenses</p><p className="text-lg font-bold" style={{ color: C.text }}>{inr(item.totalExpenses || 0)}</p></div><span className="text-xs font-semibold" style={{ color: item.id === activeGroupId ? C.accentDark : C.textSec }}>{item.id === activeGroupId ? 'Active' : 'Open group'}</span></div>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Create a group">
          <form onSubmit={create} className="flex gap-2"><input className="rm-input flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Trip, office, or flat name" /><button className="rm-btn rm-btn-primary px-4" type="submit"><Plus size={16} /> Create</button></form>
          <p className="text-xs rm-text-secondary mt-3">Each group keeps its own ledger, chores, shopping list, and balances.</p>
        </SectionCard>
        <SectionCard title="Invite a roommate">
          <form onSubmit={invite} className="flex gap-2"><input className="rm-input flex-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="roommate@example.com" aria-label="Roommate email" /><button className="rm-btn rm-btn-primary px-4" type="submit"><Link2 size={16} /> Invite</button></form>
          <p className="text-xs rm-text-secondary mt-3">Invite someone to <strong>{groups.find((item) => item.id === activeGroupId)?.name || 'the active group'}</strong>. They must sign in with this email to join.</p>
          {message && <p className="text-xs mt-2" style={{ color: C.accentDark }}>{message}</p>}
          {inviteLink && (
            <div className="mt-3 rm-animate-in">
              <div className="flex gap-2"><input className="rm-input flex-1 text-xs" value={inviteLink} readOnly aria-label="Invitation link" /><button className="rm-btn rm-btn-ghost px-3 flex items-center gap-1.5" type="button" onClick={copyInvite}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}</button></div>
              <div className="mt-3 rounded-2xl p-4" style={{ background: 'var(--selected-surface)', border: `1px solid ${C.border}` }} aria-live="polite">
                <p className="text-sm font-semibold" style={{ color: C.text }}>How your roommate joins</p>
                <ol className="mt-2 space-y-2 text-xs rm-text-secondary" style={{ paddingLeft: 18 }}>
                  <li>Send the copied link to the invited email address.</li>
                  <li>They open it and choose <strong>Sign in to join</strong> or <strong>Create an account</strong>.</li>
                  <li>They use the same email address you invited.</li>
                  <li>They confirm their email if Supabase asks them to.</li>
                  <li>They open the invitation link again; RoomMate adds them automatically.</li>
                </ol>
                <p className="text-xs mt-3" style={{ color: C.accentDark }}>After acceptance, the group appears in their Groups menu. The link expires in 7 days.</p>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="flex items-center gap-2 text-xs rm-text-secondary"><Users size={14} /> Group totals are a reporting view; expenses remain owned by their original group.</div>
    </div>
  );
}
