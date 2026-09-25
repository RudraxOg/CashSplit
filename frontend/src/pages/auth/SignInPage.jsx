import React, { useEffect, useState } from 'react';
import { AuthLayout } from '../../components/AuthLayout';
import { InviteVerification } from '../../components/InviteVerification';
import { PasswordField } from '../../components/PasswordField';
import { useAuth } from '../../hooks/useAuth';
import { useInvitePreview } from '../../hooks/useInvitePreview';
import './auth.css';

export default function SignInPage() {
  const { session, loading: authLoading, signInWithPassword, signInWithMagicLink, signInWithGoogle } = useAuth();
  const inviteToken = new URLSearchParams(window.location.search).get('invite');
  const preview = useInvitePreview(inviteToken);
  const invite = preview.status === 'pending' || preview.status === 'accepted' ? inviteToken : null;
  const nextPath = invite ? `/join/${encodeURIComponent(invite)}` : '/app';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (preview.invite?.invitedEmail) setEmail(preview.invite.invitedEmail); }, [preview.invite]);
  useEffect(() => {
    if (!authLoading && session && preview.status !== 'loading') window.location.replace(nextPath);
  }, [authLoading, nextPath, preview.status, session]);

  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try { await signInWithPassword({ email, password }); window.location.replace(nextPath); }
    catch (cause) { setError(cause.message || 'Could not sign in. Check your email and password.'); }
    finally { setBusy(false); }
  };
  const magicLink = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address first.'); return; }
    setError(''); setMessage(''); setBusy(true);
    try { await signInWithMagicLink(email, invite); setMessage(`Check ${email.trim()} for a sign-in link.`); }
    catch (cause) { setError(cause.message || 'Could not send a sign-in link.'); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setError(''); setBusy(true);
    try { await signInWithGoogle(invite); }
    catch (cause) { setError(cause.message || 'Could not continue with Google.'); setBusy(false); }
  };

  return <AuthLayout>
    <div className="rm-auth-heading"><p className="rm-auth-eyebrow">WELCOME BACK</p><h1>Sign in to your home.</h1><p className="rm-auth-sub">New to RoomMate? <a href={invite ? `/signup?invite=${encodeURIComponent(invite)}` : '/signup'}>Create an account</a></p></div>
    <InviteVerification {...preview} />
    <form onSubmit={submit} className="rm-auth-form">
      <label className="rm-auth-label" htmlFor="signin-email">Email</label>
      <input id="signin-email" className="rm-auth-field" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <PasswordField id="signin-password" label="Password" autoComplete="current-password" placeholder="Your password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <div className="rm-auth-inline"><a href={invite ? `/forgot-password?invite=${encodeURIComponent(invite)}` : '/forgot-password'}>Forgot password?</a></div>
      {error && <p className="rm-auth-error" role="alert">{error}</p>}{message && <p className="rm-auth-success" role="status">{message}</p>}
      <button className="rm-auth-primary-btn" type="submit" disabled={busy || authLoading || preview.status === 'loading'}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <button type="button" className="rm-auth-link-btn" onClick={magicLink} disabled={!email.trim() || busy || preview.status === 'loading'}>Email me a sign-in link</button>
    <div className="rm-auth-divider"><span>or</span></div>
    <button type="button" className="rm-auth-ghost-btn" onClick={google} disabled={busy || preview.status === 'loading'}>Continue with Google</button>
    <p className="rm-auth-legal">By continuing, you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
  </AuthLayout>;
}
