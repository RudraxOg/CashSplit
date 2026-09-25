import React, { useState } from 'react';
import { AuthLayout } from '../../components/AuthLayout';
import { PasswordField } from '../../components/PasswordField';
import { useAuth } from '../../hooks/useAuth';
import './auth.css';

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const invite = new URLSearchParams(window.location.search).get('invite');
  const continuePath = invite ? `/join/${encodeURIComponent(invite)}` : '/app';
  const submit = async (event) => { event.preventDefault(); if (password.length < 8) return setError('Use at least 8 characters.'); if (password !== confirm) return setError('Passwords do not match.'); setBusy(true); setError(''); try { await updatePassword(password); setDone(true); } catch (err) { setError(err.message || 'This reset link may have expired.'); } finally { setBusy(false); } };
  return <AuthLayout>{done ? <><h1>Password updated.</h1><p className="rm-auth-success">Your account is secure again.</p><a className="rm-auth-primary-btn" href={continuePath}>{invite ? 'Return to invitation' : 'Open RoomMate'}</a></> : <><h1>Choose a new password.</h1><p className="rm-auth-sub">Make it memorable, but hard to guess.</p><form onSubmit={submit}><PasswordField id="new-password" label="New password" autoComplete="new-password" minLength={8} placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} /><PasswordField id="confirm-password" label="Repeat password" autoComplete="new-password" minLength={8} placeholder="Repeat password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />{error && <p className="rm-auth-error" role="alert">{error}</p>}<button className="rm-auth-primary-btn" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button></form></>}</AuthLayout>;
}
