import React from 'react';
import { ArrowLeft } from 'lucide-react';

export function AuthLayout({ children, onBack = () => window.location.assign('/') }) {
  return <div className="rm-auth-scene"><div className="rm-auth-orb rm-auth-orb-1" /><div className="rm-auth-orb rm-auth-orb-2" /><div className="rm-auth-orb rm-auth-orb-3" /><button className="rm-auth-back" onClick={onBack}><ArrowLeft size={15} /> Back</button><div className="rm-auth-card"><div className="rm-auth-logo" />{children}</div></div>;
}
