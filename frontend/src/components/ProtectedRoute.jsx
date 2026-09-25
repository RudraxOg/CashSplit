import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }) {
  const { session, loading, configured, error } = useAuth();
  useEffect(() => { if (!loading && !session) window.location.replace('/signin'); }, [loading, session]);
  if (loading) return <div className="rm-auth-loading">Checking your session…</div>;
  if (!configured) return <div className="rm-auth-loading"><p>Supabase authentication is not configured.</p></div>;
  if (error && !session) return <div className="rm-auth-loading"><p>We couldn’t restore your session. Please sign in again.</p><a href="/signin">Go to sign in</a></div>;
  if (!session) return null;
  return children;
}
