import React, { useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
} from 'recharts';
import {
  Wallet, CreditCard, PiggyBank, Target, ArrowRight, ChevronDown, Check, X,
  ChefHat, UtensilsCrossed, Sparkles, Trash2, ShoppingCart, ListChecks, Clock,
  Inbox, CheckCircle2, ArrowLeftRight,
} from 'lucide-react';
import { C, CATEGORY_COLORS, CHORE_COLOR_CYCLE, PRIORITY_META, ACTIVITY_COLOR, inr } from '../lib/constants';
import { Avatar, Badge, Delta, ProgressBar, EmptyState, SectionCard } from './common';

/* ---------- summary cards ---------- */
export function SummaryCards({ totalIncome, totalExpenses, balance, budget, spentPct }) {
  return (
    <div className="grid mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      <div className="rm-card rm-card-hover p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium rm-text-secondary">Total Income</span>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E6F5EF' }}>
            <Wallet size={16} color={C.income} />
          </div>
        </div>
        <p className="font-bold" style={{ fontSize: 28, color: C.text }}>{inr(totalIncome)}</p>
        <p className="text-xs rm-text-secondary mt-1 mb-2">This Month</p>
        <Delta value={12} />
      </div>

      <div className="rm-card rm-card-hover p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium rm-text-secondary">Total Expenses</span>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FBEAEA' }}>
            <CreditCard size={16} color={C.expense} />
          </div>
        </div>
        <p className="font-bold" style={{ fontSize: 28, color: C.text }}>{inr(totalExpenses)}</p>
        <p className="text-xs rm-text-secondary mt-1 mb-2">This Month</p>
        <Delta value={8} />
      </div>

      <div className="rm-card rm-card-hover p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium rm-text-secondary">Balance</span>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E6F5EF' }}>
            <PiggyBank size={16} color={C.income} />
          </div>
        </div>
        <p className="font-bold" style={{ fontSize: 28, color: C.text }}>{inr(balance)}</p>
        <p className="text-xs rm-text-secondary mt-1 mb-2">This Month</p>
        <Delta value={24} />
      </div>

      <div className="rm-card rm-card-hover p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium rm-text-secondary">Monthly Budget</span>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#EFECFD' }}>
            <Target size={16} color={C.chores} />
          </div>
        </div>
        <p className="text-sm mb-1" style={{ color: C.text }}>
          <span className="font-bold">{inr(totalExpenses)}</span> <span className="rm-text-secondary">of {inr(budget)}</span>
        </p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs rm-text-secondary">Spent</span>
          <span className="text-xs font-semibold" style={{ color: C.text }}>{spentPct}%</span>
        </div>
        <ProgressBar pct={spentPct} color={spentPct > 90 ? C.expense : C.accent} />
      </div>
    </div>
  );
}

/* ---------- spending overview donut ---------- */
export function SpendingOverview({ expenses, totalExpenses, setPage }) {
  const [period, setPeriod] = useState('This Month');
  const [periodOpen, setPeriodOpen] = useState(false);

  const data = useMemo(() => {
    const byCat = {};
    expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    return Object.entries(byCat).map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || C.others }));
  }, [expenses]);

  return (
    <SectionCard
      title="Spending Overview"
      action={
        <div className="relative">
          <button onClick={() => setPeriodOpen(!periodOpen)} className="flex items-center gap-1 text-xs font-medium rm-card px-3 py-1.5 cursor-pointer" style={{ color: C.text }}>
            {period} <ChevronDown size={13} color={C.textSec} />
          </button>
          {periodOpen && (
            <div className="absolute right-0 mt-2 w-36 rm-card p-1 z-20 rm-modal-in">
              {['This Month', 'Last Month', 'This Year'].map((p) => (
                <div key={p} onClick={() => { setPeriod(p); setPeriodOpen(false); }} className="px-3 py-2 text-xs rounded-lg cursor-pointer rm-hover-surface" style={{ color: C.text }}>{p}</div>
              ))}
            </div>
          )}
        </div>
      }
    >
      <div className="relative w-full" style={{ height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="92%" paddingAngle={3} isAnimationActive>
              {data.map((d, i) => <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={2} />)}
            </Pie>
            <RTooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-bold" style={{ fontSize: 22, color: C.text }}>{inr(totalExpenses)}</span>
          <span className="text-xs rm-text-secondary">Total</span>
        </div>
      </div>

      <div className="space-y-2.5 mt-4">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2" style={{ color: C.text }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="flex items-center gap-3">
              <span className="font-medium" style={{ color: C.text }}>{inr(d.value)}</span>
              <span className="rm-text-secondary text-xs w-10 text-right">{totalExpenses ? ((d.value / totalExpenses) * 100).toFixed(1) : '0.0'}%</span>
            </span>
          </div>
        ))}
      </div>

      <button onClick={() => setPage('reports')} className="text-sm font-semibold flex items-center gap-1 mt-5 cursor-pointer" style={{ color: C.accentDark }}>
        View Full Report <ArrowRight size={14} />
      </button>
    </SectionCard>
  );
}

/* ---------- balance summary ---------- */
export function BalanceSummary({ balances, members, onSettle, setPage }) {
  return (
    <SectionCard
      title="Balance Summary"
      action={<button onClick={() => setPage('balances')} className="text-sm font-semibold cursor-pointer" style={{ color: C.accentDark }}>See all</button>}
    >
      <div className="space-y-4">
        {balances.map((b) => {
          const member = members.find((m) => m.name === b.member);
          return (
            <div key={b.member} className="flex items-center gap-3">
              <Avatar member={member} size={38} />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{b.member}{b.label ? ` (${b.label})` : ''}</p>
                <p className="text-xs font-medium" style={{ color: b.settled ? C.textSec : (b.type === 'gets' ? C.accent : C.expense) }}>
                  {b.settled ? 'settled' : b.type === 'gets' ? 'gets back' : 'owes'}
                </p>
              </div>
              <span className="ml-auto font-semibold text-sm" style={{ color: b.settled ? C.textSec : (b.type === 'gets' ? C.accent : C.expense) }}>
                {inr(b.amount)}
              </span>
            </div>
          );
        })}
      </div>
      <button onClick={onSettle} className="rm-btn rm-btn-primary w-full py-2.5 text-sm mt-5 flex items-center justify-center gap-1.5">
        Settle Up <ArrowRight size={14} />
      </button>
    </SectionCard>
  );
}

/* ---------- chores ---------- */
function choreIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('cook')) return ChefHat;
  if (n.includes('dish')) return UtensilsCrossed;
  if (n.includes('clean')) return Sparkles;
  if (n.includes('garbage') || n.includes('trash')) return Trash2;
  if (n.includes('grocer') || n.includes('shop')) return ShoppingCart;
  return ListChecks;
}

function statusMeta(status) {
  if (status === 'completed') return { label: 'Completed', bg: '#E6F5EF', color: C.accentDark, icon: Check };
  if (status === 'overdue') return { label: 'Overdue', bg: '#FBEAEA', color: C.expense, icon: Clock };
  if (status === 'pending') return { label: 'Pending', bg: '#FCF1E1', color: '#B8791A', icon: Clock };
  return { label: 'Upcoming', bg: '#F1F3F0', color: C.textSec, icon: Clock };
}

export function ChoreRow({ chore, members, onToggle, showWhen }) {
  const Icon = choreIcon(chore.name);
  const meta = statusMeta(chore.status);
  const idx = chore.id % CHORE_COLOR_CYCLE.length;
  const member = members.find((m) => m.name === chore.assignedTo);
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${CHORE_COLOR_CYCLE[idx]}22` }}>
        <Icon size={17} color={CHORE_COLOR_CYCLE[idx]} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{chore.name}</p>
        <p className="text-xs rm-text-secondary truncate">
          Assigned to {member?.you ? 'You' : chore.assignedTo}{showWhen ? ` · ${chore.when === 'Today' || chore.when === 'Tomorrow' ? chore.when : chore.dueDate}` : ''}
        </p>
      </div>
      <button
        onClick={() => onToggle(chore.id)}
        className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer shrink-0"
        style={{ background: meta.bg, color: meta.color }}
      >
        <meta.icon size={11} className={chore.status === 'completed' ? 'rm-check-pop' : ''} />
        {meta.label}
      </button>
    </div>
  );
}

export function TodaysChores({ chores, members, onToggle, setPage }) {
  const today = chores.filter((c) => c.when === 'Today');
  return (
    <SectionCard title="Today's Chores" action={<span className="text-sm font-semibold cursor-pointer" style={{ color: C.accentDark }}>View Calendar</span>}>
      {today.length === 0 ? (
        <EmptyState icon={ListChecks} title="No chores today" subtitle="Enjoy the free day, or plan ahead." />
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {today.map((c) => <ChoreRow key={c.id} chore={c} members={members} onToggle={onToggle} showWhen={false} />)}
        </div>
      )}
      <button onClick={() => setPage('chores')} className="text-sm font-semibold flex items-center gap-1 mt-4 cursor-pointer" style={{ color: C.accentDark }}>
        View All Chores <ArrowRight size={14} />
      </button>
    </SectionCard>
  );
}

/* ---------- activity feed ---------- */
const ACTIVITY_ICON = { expense: ShoppingCart, chore: CheckCircle2, income: Wallet, settle: ArrowLeftRight };

export function ActivityFeed({ activities }) {
  return (
    <SectionCard title="Recent Activity" action={<span className="text-sm font-semibold cursor-pointer" style={{ color: C.accentDark }}>View All</span>}>
      {activities.length === 0 ? (
        <EmptyState icon={Inbox} title="No activity yet" subtitle="Actions from your household will show up here." />
      ) : (
        <div className="space-y-1">
          {activities.slice(0, 6).map((a) => {
            const Icon = ACTIVITY_ICON[a.kind];
            const color = ACTIVITY_COLOR[a.kind];
            return (
              <div key={a.id} className="flex items-center gap-3 py-2.5 rm-animate-in">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}1A` }}>
                  <Icon size={15} color={color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: C.text }}>{a.text}</p>
                  <p className="text-xs rm-text-secondary truncate">{a.detail}</p>
                </div>
                <span className="text-xs rm-text-secondary shrink-0">{a.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

/* ---------- shopping list ---------- */
export function ShoppingRow({ item, onToggle, onDelete }) {
  return (
    <div className="flex items-center gap-3 py-2.5 group">
      <button
        onClick={() => onToggle(item.id)}
        className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
        style={{ borderColor: item.purchased ? C.accent : C.border, background: item.purchased ? C.accent : 'transparent' }}
      >
        {item.purchased && <Check size={13} color="#fff" className="rm-check-pop" />}
      </button>
      <span className={`text-sm flex-1 truncate ${item.purchased ? 'rm-strike' : ''}`} style={{ color: item.purchased ? undefined : C.text }}>
        {item.name}
      </span>
      {item.purchased ? (
        <Badge color={C.accentDark} bg="#E6F5EF">Purchased</Badge>
      ) : (
        <Badge color={PRIORITY_META[item.priority].color} bg={PRIORITY_META[item.priority].bg}>{item.priority}</Badge>
      )}
      <button onClick={() => onDelete(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0">
        <X size={14} color={C.textSec} />
      </button>
    </div>
  );
}

export function ShoppingList({ items, onToggle, onDelete, onAdd, compact, setPage }) {
  const [text, setText] = useState('');
  const list = compact ? items.slice(0, 5) : items;
  return (
    <SectionCard title="Shopping List" action={!compact ? null : <span onClick={() => setPage('shopping')} className="text-sm font-semibold cursor-pointer" style={{ color: C.accentDark }}>View All</span>}>
      {items.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="List is empty" subtitle="Add something the household needs." />
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {list.map((it) => <ShoppingRow key={it.id} item={it} onToggle={onToggle} onDelete={onDelete} />)}
        </div>
      )}
      <div className="flex items-center gap-2 mt-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { onAdd(text.trim()); setText(''); } }}
          placeholder="Add item to shopping list..."
          className="rm-input flex-1"
        />
        <button
          onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(''); } }}
          className="rm-btn rm-btn-primary px-4 py-2 text-sm shrink-0"
        >
          Add
        </button>
      </div>
    </SectionCard>
  );
}
