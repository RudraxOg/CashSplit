import React, { useEffect, useRef, useState } from 'react';
import { Check, Link2, Users } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import './auth/auth.css';

export default function JoinGroupPage({ token }) {
  const { session, loading: authLoading, signOut } = useAuth();
  const [invite, setInvite] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const acceptPromise = useRef(null);

  useEffect(() => {
    let mounted = true;
    if (!token) { setState('error'); setError('This invitation link is incomplete.'); return undefined; }
    api.getInvitePreview(token)
      .then((result) => { if (mounted) { setInvite(result); if (result.status === 'pending') setState('ready'); else { setError('This invitation has expired or has already been used. Ask a group member to create a new link.'); setState('error'); } } })
      .catch((err) => { if (mounted) { setError(err.message || 'This invitation is no longer available.'); setState('error'); } });
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    if (authLoading || !session || !invite || state !== 'ready') return;
    if (String(session.user?.email || '').toLowerCase() !== String(invite.invitedEmail || '').toLowerCase()) {
      setState('wrong-account');
      return;
    }
    let mounted = true;
    if (!acceptPromise.current) acceptPromise.current = api.acceptInvite(token);
    acceptPromise.current
      .then((result) => { if (mounted) { if (result.groupId) window.localStorage.setItem('rm-active-group', result.groupId); setState('accepted'); } })
      .catch((err) => { if (mounted) { setError(err.message || 'We could not accept this invitation.'); setState('error'); } });
    return () => { mounted = false; };
  }, [authLoading, invite, session, state, token]);

  const authLink = (path) => `${path}?invite=${encodeURIComponent(token)}`;
  const switchAccount = async () => {
    try { await signOut(); window.location.assign(authLink('/signin')); }
    catch (err) { setError(err.message || 'Could not sign out. Try again.'); }
  };

  if (authLoading || state === 'loading') {
    return <AuthLayout><p className="rm-auth-sub">Checking your invitation…</p></AuthLayout>;
  }

  if (state === 'error') {
    return <AuthLayout><h1>Invitation unavailable</h1><p className="rm-auth-error rm-auth-join-message">{error}</p><a className="rm-auth-primary-btn" href="/app/groups">Go to groups</a></AuthLayout>;
  }

  if (state === 'wrong-account') {
    return <AuthLayout><h1>Use the invited account</h1><p className="rm-auth-sub">This link is for <strong>{invite.invitedEmail}</strong>. You are signed in as <strong>{session?.user?.email}</strong>.</p>{error && <p role="alert" className="rm-auth-error">{error}</p>}<button type="button" className="rm-auth-primary-btn" onClick={switchAccount}>Sign out and switch account</button></AuthLayout>;
  }

  if (state === 'accepted') {
    return <AuthLayout><div className="rm-auth-join-icon"><Check size={24} /></div><h1>You’re in.</h1><p className="rm-auth-sub">You joined <strong>{invite.groupName}</strong>. Your group ledger is ready.</p><a className="rm-auth-primary-btn" href="/app">Open RoomMate</a></AuthLayout>;
  }

  return (
    <AuthLayout>
      <div className="rm-auth-join-icon"><Users size={24} /></div>
      <h1>Join {invite?.groupName || 'this group'}</h1>
      <p className="rm-auth-sub">You were invited as <strong>{invite?.invitedEmail}</strong>.</p>
      <div className="rm-auth-join-card"><Link2 size={16} /><span>Sign in or create the invited account to join this group.</span></div>
      <a className="rm-auth-primary-btn" href={authLink('/signin')}>Sign in to join</a>
      <a className="rm-auth-ghost-btn rm-auth-join-link" href={authLink('/signup')}>Create an account</a>
      <p className="rm-auth-legal">For privacy, only the invited email address can accept this link.</p>
    </AuthLayout>
  );
}
