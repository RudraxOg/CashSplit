import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function useInvitePreview(token) {
  const [result, setResult] = useState({ status: token ? 'loading' : 'none', invite: null, error: '' });

  useEffect(() => {
    if (!token) { setResult({ status: 'none', invite: null, error: '' }); return undefined; }
    let active = true;
    setResult({ status: 'loading', invite: null, error: '' });
    api.getInvitePreview(token).then((invite) => {
      if (!active) return;
      setResult(invite.status === 'pending' || invite.status === 'accepted'
        ? { status: invite.status, invite, error: '' }
        : { status: 'error', invite: null, error: 'This invitation has expired or is no longer available. Ask your roommate for a new link.' });
    }).catch((error) => {
      if (active) setResult({ status: 'error', invite: null, error: error.message || 'This invitation could not be verified.' });
    });
    return () => { active = false; };
  }, [token]);

  return result;
}
