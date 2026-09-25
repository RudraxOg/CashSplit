import React, { useState } from 'react';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import './auth.css';

export default function VerifyEmailPage() {
  const { user, resendConfirmation } = useAuth(); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const resend = async () => { setError(''); try { await resendConfirmation(user?.email || window.localStorage.getItem('rm-signup-email')); setMessage('Confirmation email sent again.'); } catch (err) { setError(err.message); } };
  const invite = new URLSearchParams(window.location.search).get('invite') || window.localStorage.getItem('rm-invite-token');
  const continuePath = invite ? `/join/${encodeURIComponent(invite)}` : '/app';
  return <AuthLayout><h1>One last step.</h1><p className="rm-auth-sub">Confirm your email to unlock your household space.</p><p className="rm-auth-success">Check your inbox for the RoomMate link.</p><button className="rm-auth-primary-btn" onClick={() => window.location.assign(continuePath)}>I’ve confirmed my email</button><button className="rm-auth-link-btn" onClick={resend}>Resend confirmation email</button>{message && <p className="rm-auth-success">{message}</p>}{error && <p className="rm-auth-error">{error}</p>}</AuthLayout>;
}
