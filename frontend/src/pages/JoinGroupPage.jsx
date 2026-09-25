import React, { useState } from 'react';
import { Check, Link2, Users } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { InviteVerification } from '../components/InviteVerification';
import { useAuth } from '../hooks/useAuth';
import { useInvitePreview } from '../hooks/useInvitePreview';
import { api } from '../lib/api';
import './auth/auth.css';

export default function JoinGroupPage({ token }) {
  const { session, loading: authLoading, signOut } = useAuth();
  const preview = useInvitePreview(token);
  const { invite } = preview;
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const authLink = (path) => `${path}?invite=${encodeURIComponent(token)}`;
  const correctAccount = Boolean(session && invite && String(session.user?.email || '').toLowerCase() === String(invite.invitedEmail || '').toLowerCase());
  const accept = async () => {
    if (!correctAccount || busy) return;
    setError(''); setBusy(true);
    try {
      const result = await api.acceptInvite(token);
      if (result.groupId) window.localStorage.setItem('rm-active-group', result.groupId);
      window.localStorage.removeItem('rm-invite-token');
      setAccepted(true);
    } catch (cause) { setError(cause.message || 'We could not accept this invitation. Please try again.'); }
    finally { setBusy(false); }
  };
  const switchAccount = async () => {
    try { await signOut(); window.location.assign(authLink('/signin')); }
    catch (err) { setError(err.message || 'Could not sign out. Try again.'); }
  };

  if (authLoading || preview.status === 'loading') {
    return <AuthLayout><h1>Checking your invitation</h1><p className="rm-auth-sub" role="status">Verifying the household and invited email…</p></AuthLayout>;
  }

  if (preview.status === 'error' || preview.status === 'none') {
    return <AuthLayout><h1>Invitation unavailable</h1><p className="rm-auth-error rm-auth-join-message" role="alert">{preview.error || 'This invitation link is incomplete.'}</p><a className="rm-auth-primary-btn" href="/app/groups">Go to groups</a></AuthLayout>;
  }

  if (session && !correctAccount) {
    return <AuthLayout><h1>Use the invited account</h1><InviteVerification {...preview} /><p className="rm-auth-sub">This link is for <strong>{invite.invitedEmail}</strong>. You are signed in as <strong>{session.user?.email}</strong>.</p>{error && <p role="alert" className="rm-auth-error">{error}</p>}<button type="button" className="rm-auth-primary-btn" onClick={switchAccount}>Sign out and switch account</button></AuthLayout>;
  }

  if (accepted || (preview.status === 'accepted' && correctAccount)) {
    return <AuthLayout><div className="rm-auth-join-icon"><Check size={24} /></div><h1>You’re in.</h1><p className="rm-auth-sub">You joined <strong>{invite.groupName}</strong>. Your group ledger is ready.</p><a className="rm-auth-primary-btn" href="/app" onClick={() => window.localStorage.setItem('rm-active-group', invite.groupId)}>Open RoomMate</a></AuthLayout>;
  }

  if (preview.status === 'accepted') {
    return <AuthLayout><h1>Invitation already accepted</h1><p className="rm-auth-sub">Sign in with <strong>{invite.invitedEmail}</strong> to open {invite.groupName}.</p><a className="rm-auth-primary-btn" href={authLink('/signin')}>Sign in</a></AuthLayout>;
  }

  return (
    <AuthLayout>
      <div className="rm-auth-join-icon">{session ? <Users size={24} /> : <Link2 size={24} />}</div>
      <h1>Join {invite.groupName}</h1>
      <p className="rm-auth-sub">Review the invitation before joining your household.</p>
      <InviteVerification {...preview} />
      {correctAccount ? <><p className="rm-auth-helper">You’re signed in as <strong>{session.user.email}</strong>. Accept to add this household to your groups.</p>{error && <p role="alert" className="rm-auth-error">{error}</p>}<button type="button" className="rm-auth-primary-btn" onClick={accept} disabled={busy}>{busy ? 'Joining…' : 'Accept invitation'}</button></> : <><p className="rm-auth-helper">Sign in or create the invited account to accept this invitation.</p><a className="rm-auth-primary-btn" href={authLink('/signin')}>Sign in to join</a><a className="rm-auth-ghost-btn rm-auth-join-link" href={authLink('/signup')}>Create an account</a></>}
      <p className="rm-auth-legal">Only {invite.invitedEmail} can accept this link.</p>
    </AuthLayout>
  );
}
