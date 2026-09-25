import React, { useState } from 'react';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import './auth.css';

export default function VerifyEmailPage() {
  const { user, resendConfirmation, verifyEmailConfirmation } = useAuth(); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const resend = async () => { setError(''); setBusy(true); try { await resendConfirmation(user?.email || window.localStorage.getItem('rm-signup-email')); setMessage('Confirmation email sent again.'); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const invite = new URLSearchParams(window.location.search).get('invite') || window.localStorage.getItem('rm-invite-token');
  const continuePath = invite ? `/join/${encodeURIComponent(invite)}` : '/app';
  const verify = async () => { setError(''); setBusy(true); try { if (await verifyEmailConfirmation()) window.location.assign(continuePath); else setError('Email not confirmed yet. Open the confirmation link in your inbox first.'); } catch { setError('Open the confirmation link in your inbox, then sign in to continue.'); } finally { setBusy(false); } };
  return <AuthLayout><div className="rm-auth-heading"><p className="rm-auth-eyebrow">ONE LAST STEP</p><h1>Confirm your email.</h1><p className="rm-auth-sub">Open the RoomMate link in your inbox to verify your account.</p></div><button className="rm-auth-primary-btn" type="button" onClick={verify} disabled={busy}>{busy ? 'Checking…' : 'Check confirmation'}</button><a className="rm-auth-ghost-btn" href={invite ? `/signin?invite=${encodeURIComponent(invite)}` : '/signin'}>Sign in instead</a><button className="rm-auth-link-btn" type="button" onClick={resend} disabled={busy}>Resend confirmation email</button>{message && <p className="rm-auth-success" role="status">{message}</p>}{error && <p className="rm-auth-error" role="alert">{error}</p>}</AuthLayout>;
}
