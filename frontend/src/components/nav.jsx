import React, { useEffect } from 'react';
import {
  Home, CreditCard, Wallet, Scale, ListChecks, ShoppingCart, BarChart3, Users,
  Settings as SettingsIcon, Bell, ChevronDown, Plus, X, Check, Menu, Building2, UserPlus, Layers3,
} from 'lucide-react';
import { C, NAV_MAIN, NAV_HOUSEHOLD, NAV_SYSTEM, ALL_NAV } from '../lib/constants';
import { Avatar } from './common';
import { ThemeToggle } from './ThemeToggle';

const ICONS = {
  home: Home, expenses: CreditCard, income: Wallet, balances: Scale,
  chores: ListChecks, shopping: ShoppingCart, reports: BarChart3, members: Users,
  settings: SettingsIcon, groups: Layers3,
};
function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, open]);
}

function NavItem({ item, active, onClick }) {
  const Icon = ICONS[item.id];
  return (
    <button type="button" aria-current={active ? 'page' : undefined} className={`rm-nav-item w-full text-left min-h-11 ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={18} strokeWidth={2} />
      <span>{item.label}</span>
    </button>
  );
}

export function NavGroups({ page, setPage }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="px-3 mb-2 text-xs font-semibold tracking-wide uppercase rm-text-secondary">Main</p>
        <div className="space-y-1">
          {NAV_MAIN.map((it) => <NavItem key={it.id} item={it} active={page === it.id} onClick={() => setPage(it.id)} />)}
        </div>
      </div>
      <div>
        <p className="px-3 mb-2 text-xs font-semibold tracking-wide uppercase rm-text-secondary">Household</p>
        <div className="space-y-1">
          {NAV_HOUSEHOLD.map((it) => <NavItem key={it.id} item={it} active={page === it.id} onClick={() => setPage(it.id)} />)}
        </div>
      </div>
      <div>
        <p className="px-3 mb-2 text-xs font-semibold tracking-wide uppercase rm-text-secondary">System</p>
        <div className="space-y-1">
          {NAV_SYSTEM.map((it) => <NavItem key={it.id} item={it} active={page === it.id} onClick={() => setPage(it.id)} />)}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ page, setPage, members, onInvite, onProfile }) {
  const you = members.find((m) => m.you) || members[0];
  return (
    <aside className="hidden md:flex flex-col w-[252px] shrink-0 h-screen sticky top-0 px-4 py-6" style={{ borderRight: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.accent }}>
          <Home size={18} color="var(--on-accent)" strokeWidth={2.4} />
        </div>
        <span className="font-bold text-lg" style={{ color: C.text }}>RoomMate</span>
      </div>

      <div className="flex-1 overflow-y-auto rm-scroll">
        <NavGroups page={page} setPage={setPage} />
      </div>

      {you && (
        <button type="button" onClick={onProfile} className="rm-card w-full p-3 mt-4 mb-3 flex items-center gap-3 cursor-pointer text-left">
          <Avatar member={you} size={38} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{you.name}</p>
            <p className="text-xs rm-text-secondary">View Profile</p>
          </div>
          <ChevronDown size={16} color={C.textSec} className="ml-auto" />
        </button>
      )}

      <div className="rm-card p-4" style={{ background: 'var(--selected-surface)', borderColor: 'var(--accent-soft-border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)' }}>
          <UserPlus size={16} color={C.accentDark} />
        </div>
        <p className="text-sm font-semibold" style={{ color: C.text }}>Invite your roommates</p>
        <p className="text-xs rm-text-secondary mt-1 mb-3 leading-relaxed">Add your friends and start managing together.</p>
        <button onClick={onInvite} className="rm-btn rm-btn-primary text-xs w-full py-2">Invite Now</button>
      </div>
    </aside>
  );
}

const TITLES = {
  home: ['Your household', "Here's what's happening in your household"],
  expenses: ['Expenses', 'Every rupee spent by the household'],
  income: ['Income', 'Everything coming into the household'],
  balances: ['Balances', 'Who owes whom, at a glance'],
  chores: ['Chores', 'Keep the household running smoothly'],
  shopping: ['Shopping List', "What the flat needs to pick up"],
  reports: ['Reports', 'Trends across the last six months'],
  members: ['Members', 'Everyone in the household'],
  settings: ['Settings', 'Manage your household preferences'],
  groups: ['Groups', 'Connect households and see your combined spending'],
};

export function Header({ page, householdOpen, setHouseholdOpen, notifOpen, setNotifOpen, activities, hasUnread, setHasUnread, group, groups = [], onSwitchGroup, onOpenGroups }) {
  const [title, subtitle] = TITLES[page] || TITLES.home;

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-bold" style={{ fontSize: 28, color: C.text }}>{title}</h1>
        <p className="rm-text-secondary mt-1" style={{ fontSize: 14 }}>{subtitle}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="relative hidden sm:block">
          <button onClick={() => setHouseholdOpen(!householdOpen)} className="rm-card flex items-center gap-2 px-3 py-2 cursor-pointer">
            <Building2 size={16} color={C.accent} />
            <div className="text-left leading-tight">
              <p className="text-sm font-semibold max-w-32 truncate" style={{ color: C.text }}>{group?.name || 'My Household'}</p>
              <p className="text-xs rm-text-secondary">{group?.members?.length || 0} Members</p>
            </div>
            <ChevronDown size={14} color={C.textSec} className={`transition-transform ${householdOpen ? 'rotate-180' : ''}`} />
          </button>
          {householdOpen && (
            <div className="absolute right-0 mt-2 w-56 rm-card p-2 z-30 rm-modal-in">
              {groups.map((item) => (
                <button key={item.id} onClick={() => { onSwitchGroup(item.id); setHouseholdOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between cursor-pointer" style={{ background: item.id === group?.id ? 'var(--selected-surface)' : 'transparent', color: C.text }}>
                  <span className="truncate">{item.name}</span>{item.id === group?.id && <Check size={14} color={C.accent} />}
                </button>
              ))}
              <button onClick={() => { setHouseholdOpen(false); onOpenGroups(); }} className="w-full text-left px-3 py-2 rounded-lg text-sm rm-text-secondary cursor-pointer mt-1">+ Manage groups</button>
            </div>
          )}
        </div>

        <ThemeToggle />
        <div className="relative">
          <button
            type="button"
            aria-label="Open notifications"
            aria-expanded={notifOpen}
            onClick={() => { setNotifOpen(!notifOpen); setHasUnread(false); }}
            className="rm-card w-10 h-10 flex items-center justify-center relative cursor-pointer"
          >
            <Bell size={18} color={C.text} />
            {hasUnread && <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full" style={{ background: C.expense }} />}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 rm-card p-2 z-30 rm-modal-in rm-scroll" style={{ maxHeight: 280, overflowY: 'auto' }}>
              <p className="text-xs font-semibold uppercase px-2 py-1 rm-text-secondary">Notifications</p>
              {activities.slice(0, 4).map((a) => (
                <div key={a.id} className="px-2 py-2 rounded-lg rm-hover-surface flex flex-col">
                  <span className="text-sm" style={{ color: C.text }}>{a.text}</span>
                  <span className="text-xs rm-text-secondary">{a.detail} · {a.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MobileTopBar({ onMenu }) {
  return (
    <div className="flex md:hidden items-center justify-between mb-5 sticky top-0 pt-1 pb-3 z-20" style={{ background: C.bg }}>
      <button type="button" aria-label="Open navigation" onClick={onMenu} className="cursor-pointer min-w-11 min-h-11 flex items-center justify-center"><Menu size={22} color={C.text} /></button>
      <div className="flex items-center gap-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.accent }}>
          <Home size={14} color="var(--on-accent)" />
        </div>
        <span className="font-bold" style={{ color: C.text }}>RoomMate</span>
      </div>
      <ThemeToggle />
    </div>
  );
}

export function MobileDrawer({ open, onClose, page, setPage }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div className="absolute inset-0" style={{ background: 'rgba(23,32,51,0.35)' }} onClick={onClose} />
      <div className="relative w-72 h-full p-5 rm-modal-in" style={{ background: C.surface }}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.accent }}><Home size={16} color="var(--on-accent)" /></div>
            <span className="font-bold text-lg" style={{ color: C.text }}>RoomMate</span>
          </div>
          <button type="button" aria-label="Close navigation" onClick={onClose} className="cursor-pointer min-w-11 min-h-11 flex items-center justify-center"><X size={20} color={C.textSec} /></button>
        </div>
        <NavGroups page={page} setPage={(p) => { setPage(p); onClose(); }} />
      </div>
    </div>
  );
}

export function BottomNav({ page, setPage, onAdd, onMore }) {
  const items = [
    { id: 'home', label: 'Home' },
    { id: 'expenses', label: 'Expenses' },
    null,
    { id: 'chores', label: 'Chores' },
    { id: 'more', label: 'More', icon: Menu },
  ];
  return (
    <nav aria-label="Primary" className="rm-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-3 pt-2" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between max-w-md mx-auto">
        {items.map((it, i) => {
          if (!it) {
            return (
              <button type="button" aria-label="Add item" key="add" onClick={onAdd} className="w-12 h-12 rounded-full flex items-center justify-center -mt-6 shadow-lg cursor-pointer" style={{ background: C.accent }}>
                <Plus size={22} color="var(--on-accent)" />
              </button>
            );
          }
          const Icon = it.icon || ICONS[it.id];
          const active = it.id === page;
          const onClick = it.id === 'more' ? onMore : () => setPage(it.id);
          return (
            <button type="button" aria-current={active ? 'page' : undefined} key={it.id} onClick={onClick} className="flex flex-col items-center gap-1 px-2 py-1 cursor-pointer min-w-11 min-h-11">
              <Icon size={20} color={active ? C.accent : C.textSec} />
              <span className="text-[10px] font-medium" style={{ color: active ? C.accent : C.textSec }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function MoreSheet({ open, onClose, setPage, onInvite }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex md:hidden items-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(23,32,51,0.35)' }} />
      <div role="dialog" aria-modal="true" aria-label="More navigation" className="relative w-full rounded-t-3xl p-5 pb-8 rm-modal-in" style={{ background: C.surface }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1.5 rounded-full mx-auto mb-5" style={{ background: C.border }} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { onInvite(); onClose(); }} className="flex items-center gap-2.5 px-3 py-3 rounded-xl cursor-pointer text-left" style={{ background: 'var(--selected-surface)' }}>
            <UserPlus size={17} color={C.accentDark} />
            <span className="text-sm font-medium" style={{ color: C.text }}>Invite friends</span>
          </button>
          {ALL_NAV.filter((n) => !['home', 'expenses', 'chores'].includes(n.id)).map((it) => {
            const Icon = ICONS[it.id];
            return (
              <button type="button" key={it.id} onClick={() => { setPage(it.id); onClose(); }} className="flex items-center gap-2.5 px-3 py-3 rounded-xl cursor-pointer text-left min-h-11" style={{ background: C.bg }}>
                <Icon size={17} color={C.text} />
                <span className="text-sm font-medium" style={{ color: C.text }}>{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
