import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import InstallApp from './components/InstallApp';
import './styles.css';
import './marketing.css';

const App = lazy(() => import('./App'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const SignInPage = lazy(() => import('./pages/auth/SignInPage'));
const SignUpPage = lazy(() => import('./pages/auth/SignUpPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const JoinGroupPage = lazy(() => import('./pages/JoinGroupPage'));
const MotionLabPage = lazy(() => import('./pages/MotionLabPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));

const path = window.location.pathname;
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch((error) => console.error('RoomMate offline shell registration failed', error)));
}
function route() {
  if (path === '/signin') return <SignInPage />;
  if (path === '/signup') return <SignUpPage />;
  if (path === '/forgot-password') return <ForgotPasswordPage />;
  if (path === '/reset-password') return <ResetPasswordPage />;
  if (path === '/verify-email' || path === '/welcome') return <VerifyEmailPage />;
  if (path.startsWith('/join/')) return <JoinGroupPage token={decodeURIComponent(path.split('/')[2] || '')} />;
  if (path === '/motion-lab') return <MotionLabPage />;
  if (path === '/privacy') return <LegalPage type="privacy" />;
  if (path === '/terms') return <LegalPage type="terms" />;
  if (path === '/app' || path.startsWith('/app/')) return <ProtectedRoute><App /></ProtectedRoute>;
  return <OnboardingPage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <ThemeProvider><AuthProvider><Suspense fallback={<div className="rm-auth-loading" role="status">Loading RoomMate…</div>}>{route()}</Suspense><InstallApp /></AuthProvider></ThemeProvider>
  </React.StrictMode>
);
