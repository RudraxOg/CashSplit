import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallApp() {
  const [platform, setPlatform] = useState('');
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('rm-install-dismissed') === '1');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) return;
    const ua = window.navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) setPlatform('ios');
    else if (/android/i.test(ua)) setPlatform('android');
  }, []);

  if (dismissed || !platform) return null;
  const install = () => setShowHelp(true);
  return (
    <aside className="fixed z-[70] bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-5 right-4 max-w-[calc(100vw-2rem)] w-80 rm-card p-3 shadow-xl" aria-label="Install RoomMate">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Install RoomMate</p><p className="text-xs rm-text-secondary mt-0.5">Open your household like an app from your home screen.</p></div>
        <button type="button" onClick={() => { setDismissed(true); sessionStorage.setItem('rm-install-dismissed', '1'); }} className="p-1" aria-label="Dismiss install suggestion"><X size={16} /></button>
      </div>
      <button type="button" onClick={install} className="rm-btn rm-btn-primary w-full mt-3 py-2 text-sm flex items-center justify-center gap-2">
        <Download size={15} /> {showHelp ? 'Got it' : 'How to install'}
      </button>
      {showHelp && <p role="status" className="text-xs rm-text-secondary mt-2">{platform === 'ios' ? 'In Safari, tap Share, then “Add to Home Screen”.' : 'In Chrome, open the ⋮ menu and tap “Install app” or “Add to Home screen”.'}</p>}
    </aside>
  );
}
