import React, { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

const LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'For properties', href: '#properties' },
];

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = LINKS.map((link) => document.querySelector(link.href)).filter(Boolean);
    if (!sections.length || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) setActive(`#${entry.target.id}`); }), { rootMargin: '-25% 0px -65% 0px', threshold: 0 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = menuRef.current?.querySelector('a');
    first?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); return; }
      if (event.key !== 'Tab' || !menuRef.current) return;
      const focusable = [...menuRef.current.querySelectorAll('a, button')];
      if (!focusable.length) return;
      const firstFocusable = focusable[0]; const lastFocusable = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstFocusable) { event.preventDefault(); lastFocusable.focus(); }
      else if (!event.shiftKey && document.activeElement === lastFocusable) { event.preventDefault(); firstFocusable.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => { if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const closeMenu = () => setOpen(false);
  return (
    <header className={`rm-marketing-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="rm-marketing-nav-inner">
        <a href="/" className="rm-marketing-logo" aria-label="RoomMate home">
          <span className="rm-marketing-logo-mark" />
          roommate.
        </a>
        <nav className="rm-marketing-links" aria-label="Marketing navigation">
          {LINKS.map((link) => <a key={link.label} className={active === link.href ? 'is-active' : ''} href={link.href}>{link.label}</a>)}
        </nav>
        <div className="rm-marketing-actions">
          <a href="/signin" className="rm-marketing-loginlink">Sign in</a>
          <a href="/signup" className="rm-pill-btn rm-pill-btn-primary">Start free</a>
        </div>
        <button ref={buttonRef} className="rm-marketing-burger" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="marketing-mobile-menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div ref={menuRef} id="marketing-mobile-menu" className="rm-marketing-mobile-menu rm-fade-slide-up" role="dialog" aria-modal="true" aria-label="Marketing menu">
          {LINKS.map((link) => <a key={link.label} className={active === link.href ? 'is-active' : ''} href={link.href} onClick={closeMenu}>{link.label}</a>)}
          <a href="/signin" onClick={closeMenu}>Sign in</a>
          <a href="/signup" className="rm-pill-btn rm-pill-btn-primary" onClick={closeMenu}>Start free</a>
        </div>
      )}
    </header>
  );
}
