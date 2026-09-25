import React from 'react';
import { BadgeCheck, Link2 } from 'lucide-react';

export function InviteVerification({ status, invite, error }) {
  if (status === 'none') return null;
  if (status === 'loading') return <div className="rm-auth-invite" role="status"><Link2 size={18} aria-hidden="true" /><span>Checking your invitation…</span></div>;
  if (status === 'error') return <div className="rm-auth-invite rm-auth-invite-error" role="alert"><Link2 size={18} aria-hidden="true" /><span>{error}</span></div>;
  return <div className="rm-auth-invite rm-auth-invite-verified" role="status"><BadgeCheck size={19} aria-hidden="true" /><div><strong>{status === 'accepted' ? 'Invitation already used' : 'Invitation verified'}</strong><span>{invite.groupName} · {invite.invitedEmail}</span></div></div>;
}
