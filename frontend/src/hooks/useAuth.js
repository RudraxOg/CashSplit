import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);
const unavailable = () => {
  const error = new Error('Authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.');
  error.code = 'AUTH_NOT_CONFIGURED';
  throw error;
};

function friendlyAuthError(error) {
  const message = String(error?.message || error || '');
  if (error?.name === 'AuthRetryableFetchError' || /failed to fetch|networkerror|name_not_resolved|could not resolve/i.test(message)) {
    const networkError = new Error('Cannot reach Supabase. Check VITE_SUPABASE_URL in frontend/.env and make sure the Supabase project is active and reachable.');
    networkError.code = 'AUTH_NETWORK_ERROR';
    return networkError;
  }
  return error instanceof Error ? error : new Error(message || 'Authentication failed.');
}

function throwIfAuthError(error) {
  if (error) throw friendlyAuthError(error);
}

async function runAuthRequest(request) {
  try {
    return await request();
  } catch (error) {
    throw friendlyAuthError(error);
  }
}

function redirectUrl(path) {
  return new URL(path, window.location.origin).toString();
}

function inviteDestination(inviteToken, fallback = '/app') {
  return inviteToken ? `/join/${encodeURIComponent(inviteToken)}` : fallback;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }
    let mounted = true;

    const hydrate = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (mounted) {
          setSession(data.session);
          setError(null);
        }
      } catch (sessionError) {
        if (mounted) {
          setSession(null);
          setError(friendlyAuthError(sessionError));
        }
        // A stale persisted refresh token can otherwise trigger Supabase's
        // background refresh loop repeatedly when the project is unreachable.
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
      if (nextSession) setError(null);
    });
    hydrate();

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signUp = useCallback(async ({ email, password, name, inviteToken }) => {
    if (!supabase) return unavailable();
    const destination = inviteDestination(inviteToken, '/welcome');
    const { data, error } = await runAuthRequest(() => supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() }, emailRedirectTo: redirectUrl(destination) } }));
    throwIfAuthError(error); return data;
  }, []);
  const signInWithPassword = useCallback(async ({ email, password }) => {
    if (!supabase) return unavailable();
    const { data, error } = await runAuthRequest(() => supabase.auth.signInWithPassword({ email: email.trim(), password }));
    throwIfAuthError(error); return data;
  }, []);
  const signInWithMagicLink = useCallback(async (email, inviteToken) => {
    if (!supabase) return unavailable();
    const destination = inviteDestination(inviteToken);
    const { error } = await runAuthRequest(() => supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectUrl(destination) } }));
    throwIfAuthError(error);
  }, []);
  const signInWithGoogle = useCallback(async (inviteToken) => {
    if (!supabase) return unavailable();
    const destination = inviteDestination(inviteToken);
    const { error } = await runAuthRequest(() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl(destination) } }));
    throwIfAuthError(error);
  }, []);
  const requestPasswordReset = useCallback(async (email) => {
    if (!supabase) return unavailable();
    const { error } = await runAuthRequest(() => supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl('/reset-password') }));
    throwIfAuthError(error);
  }, []);
  const updatePassword = useCallback(async (password) => {
    if (!supabase) return unavailable();
    const { error } = await runAuthRequest(() => supabase.auth.updateUser({ password }));
    throwIfAuthError(error);
  }, []);
  const resendConfirmation = useCallback(async (email) => {
    if (!supabase) return unavailable();
    if (!email) throw new Error('Enter the email address you used to sign up.');
    const { error } = await runAuthRequest(() => supabase.auth.resend({ type: 'signup', email: email.trim() }));
    throwIfAuthError(error);
  }, []);
  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) throw error;
  }, []);

  return createElement(AuthContext.Provider, { value: { session, user: session?.user || null, loading, error, configured: Boolean(supabase), signUp, signInWithPassword, signInWithMagicLink, signInWithGoogle, requestPasswordReset, updatePassword, resendConfirmation, signOut } }, children);
}

export const useAuth = () => useContext(AuthContext);
