import React, { useState } from 'react';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import './auth.css';

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth(); const [email, setEmail] = useState(''); const [error, setError] = useState(''); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false);
  const invite = new URLSearchParams(window.location.search).get('invite');
  const signInPath = invite ? `/signin?invite=${encodeURIComponent(invite)}` : '/signin';
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { await requestPasswordReset(email, invite); setSent(true); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <AuthLayout><h1>Reset your password.</h1>{sent ? <><p className="rm-auth-success">If an account exists for that email, a reset link is on its way.</p><a className="rm-auth-primary-btn" href={signInPath}>Back to sign in</a></> : <><p className="rm-auth-sub">We’ll send you a secure link to choose a new one.</p><form onSubmit={submit}><label className="rm-auth-label" htmlFor="reset-email">Email</label><input id="reset-email" className="rm-auth-field" type="email" autoComplete="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />{error && <p className="rm-auth-error" role="alert">{error}</p>}<button className="rm-auth-primary-btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button></form><p className="rm-auth-legal"><a href={signInPath}>Back to sign in</a></p></>}</AuthLayout>;
}
