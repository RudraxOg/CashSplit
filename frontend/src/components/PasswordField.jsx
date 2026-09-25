import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordField({ id, label, value, onChange, autoComplete, placeholder, minLength }) {
  const [visible, setVisible] = useState(false);
  return <div className="rm-auth-password-field">
    <label className="rm-auth-label" htmlFor={id}>{label}</label>
    <div className="rm-auth-password-wrap">
      <input id={id} className="rm-auth-field" type={visible ? 'text' : 'password'} autoComplete={autoComplete} placeholder={placeholder} minLength={minLength} value={value} onChange={onChange} required />
      <button type="button" className="rm-auth-password-toggle" onClick={() => setVisible((current) => !current)} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={id}>
        {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
      </button>
    </div>
  </div>;
}
