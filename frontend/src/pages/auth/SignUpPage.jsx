import React, { useEffect, useState } from 'react';
import { AuthLayout } from '../../components/AuthLayout';
import { InviteVerification } from '../../components/InviteVerification';
import { PasswordField } from '../../components/PasswordField';
import { useAuth } from '../../hooks/useAuth';
import { useInvitePreview } from '../../hooks/useInvitePreview';
import './auth.css';

export default function SignUpPage() {
  const { signUp } = useAuth();
  const inviteToken = new URLSearchParams(window.location.search).get('invite');
  const preview = useInvitePreview(inviteToken);
  const invite = preview.status === 'pending' ? inviteToken : null;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (preview.invite?.invitedEmail) setEmail(preview.invite.invitedEmail); }, [preview.invite]);

  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const result = await signUp({ name, email, password, inviteToken: invite });
      window.localStorage.setItem('rm-signup-email', email.trim());
      if (invite) window.localStorage.setItem('rm-invite-token', invite);
      else window.localStorage.removeItem('rm-invite-token');
      if (result.session) window.location.replace(invite ? `/join/${encodeURIComponent(invite)}` : '/app');
      else setSent(true);
    } catch (cause) { setError(cause.message || 'Could not create your account.'); }
    finally { setBusy(false); }
  };

  if (sent) return <AuthLayout><div className="rm-auth-heading"><p className="rm-auth-eyebrow">CHECK YOUR INBOX</p><h1>Confirm your email.</h1><p className="rm-auth-sub">We sent a confirmation link to <strong>{email}</strong>. Open it to verify your account.</p></div><InviteVerification {...preview} /><p className="rm-auth-helper">{invite ? 'After you confirm your email, return to the invitation to accept it.' : 'After you confirm your email, sign in to continue.'}</p><a className="rm-auth-primary-btn" href={invite ? `/join/${encodeURIComponent(invite)}` : '/signin'}>{invite ? 'Return to invitation' : 'Go to sign in'}</a></AuthLayout>;

  return <AuthLayout>
    <div className="rm-auth-heading"><p className="rm-auth-eyebrow">GET STARTED</p><h1>Make room for better living.</h1><p className="rm-auth-sub">Create your free RoomMate account.</p></div>
    <InviteVerification {...preview} />
    <form onSubmit={submit} className="rm-auth-form">
      <label className="rm-auth-label" htmlFor="signup-name">Name</label><input id="signup-name" className="rm-auth-field" autoComplete="name" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} required />
      <label className="rm-auth-label" htmlFor="signup-email">Email</label><input id="signup-email" className="rm-auth-field" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={Boolean(invite)} required />
      {invite && <p className="rm-auth-field-hint">Use the invited email to join this household.</p>}
      <PasswordField id="signup-password" label="Password" autoComplete="new-password" placeholder="At least 8 characters" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
      <p className="rm-auth-field-hint">Use at least 8 characters.</p>
      {error && <p className="rm-auth-error" role="alert">{error}</p>}
      <button className="rm-auth-primary-btn" type="submit" disabled={busy || preview.status === 'loading'}>{busy ? 'Creating account…' : 'Create account'}</button>
    </form>
    <p className="rm-auth-legal">Already have an account? <a href={invite ? `/signin?invite=${encodeURIComponent(invite)}` : '/signin'}>Sign in</a></p>
  </AuthLayout>;
}
