import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, History, ListChecks, Pencil, Plus, X } from 'lucide-react';
import { C } from '../lib/constants';
import { addISODate, choreTimeLabel, choreTimeRange, localISODate } from '../lib/dates';
import { SectionCard, EmptyState } from '../components/common';
import { ChoreRow } from '../components/home';

const GROUPS = ['overdue', 'pending', 'upcoming', 'completed'];
const GROUP_LABEL = { overdue: 'Overdue', pending: 'Pending', upcoming: 'Upcoming', completed: 'Completed' };
const dateLabel = (date, options) => new Intl.DateTimeFormat('en-IN', options).format(new Date(`${date}T12:00:00`));
const assignedToMember = (chore, member) => String(chore.assignedToId || chore.assigned_to || '') === String(member.id)
  || String(chore.assignedTo || '').toLowerCase() === String(member.name || '').toLowerCase();

export default function ChoresPage({ chores, members, onToggle, onDelete, onEdit, openAdd, onPlan }) {
  const today = localISODate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(today);
  const [historyMemberId, setHistoryMemberId] = useState(() => String(members.find((member) => member.you)?.id || members[0]?.id || ''));
  const historyMember = members.find((member) => String(member.id) === historyMemberId) || members[0];
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addISODate(weekStart, index)), [weekStart]);
  const selectedChores = useMemo(() => chores.filter((chore) => chore.dueDate === selectedDate), [chores, selectedDate]);
  const timedChores = useMemo(() => selectedChores.filter((chore) => chore.startTime).sort((a, b) => a.startTime.localeCompare(b.startTime) || a.name.localeCompare(b.name)), [selectedChores]);
  const anytimeChores = useMemo(() => selectedChores.filter((chore) => !chore.startTime), [selectedChores]);
  const previousChores = useMemo(() => chores
    .filter((chore) => chore.dueDate && chore.dueDate < today && historyMember && assignedToMember(chore, historyMember))
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate)), [chores, historyMember, today]);
  const selectedIsPast = selectedDate < today;
  const selectedTitle = selectedDate === today ? "Today's chores" : dateLabel(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-5 rm-animate-in">
      <section className="rm-card p-5 sm:p-6" aria-labelledby="chore-planner-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider rm-text-secondary">Household schedule</p>
            <h2 id="chore-planner-heading" className="text-xl font-bold mt-1" style={{ color: C.text }}>Plan today's chores</h2>
            <p className="text-sm rm-text-secondary mt-1">Pick a day, assign a roommate, and keep the week moving.</p>
          </div>
          <button type="button" onClick={() => onPlan(selectedIsPast ? today : selectedDate)} className="rm-btn rm-btn-primary min-h-11 px-4 flex items-center gap-2"><Plus size={16} /> Plan a chore</button>
        </div>

        <div className="flex items-center justify-between gap-2 mt-6 mb-3">
          <button type="button" onClick={() => setWeekStart(addISODate(weekStart, -7))} className="rm-btn rm-btn-ghost min-h-11 min-w-11 flex items-center justify-center" aria-label="Previous seven days"><ChevronLeft size={18} /></button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => { setSelectedDate(today); setWeekStart(today); }} className="rm-btn rm-btn-ghost text-sm min-h-11 px-3">Today</button>
            <label className="flex items-center gap-2 text-sm rm-text-secondary" htmlFor="planner-date"><CalendarDays size={16} /> Jump to date</label>
            <input id="planner-date" type="date" value={selectedDate} onChange={(event) => { if (event.target.value) { setSelectedDate(event.target.value); setWeekStart(event.target.value); } }} className="rm-input min-h-11 w-auto" />
          </div>
          <button type="button" onClick={() => setWeekStart(addISODate(weekStart, 7))} className="rm-btn rm-btn-ghost min-h-11 min-w-11 flex items-center justify-center" aria-label="Next seven days"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Choose a day to plan">
          {weekDates.map((date) => {
            const count = chores.filter((chore) => chore.dueDate === date).length;
            const selected = date === selectedDate;
            return <button key={date} type="button" onClick={() => setSelectedDate(date)} aria-pressed={selected}
              aria-label={`${dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${count} chores`}
              className="min-h-20 rounded-xl border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: selected ? 'var(--selected-surface)' : 'var(--surface)', borderColor: selected ? C.accent : C.border, color: C.text }}>
              <span className="text-[11px] uppercase font-semibold rm-text-secondary">{dateLabel(date, { weekday: 'short' })}</span>
              <span className="text-lg font-bold leading-tight">{dateLabel(date, { day: 'numeric' })}</span>
              <span className="text-[11px] rm-text-secondary">{count ? `${count} chore${count === 1 ? '' : 's'}` : 'Free'}</span>
            </button>;
          })}
        </div>

        <div className="mt-6 border-t pt-5" style={{ borderColor: C.border }}>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2"><h3 className="font-semibold" style={{ color: C.text }}>{selectedTitle}</h3><span className="text-xs rm-text-secondary">{selectedChores.length} assigned</span></div>
          {timedChores.length > 0 && <div className="mt-4" aria-label="Timed chores">
            <p className="text-xs font-semibold uppercase tracking-wider rm-text-secondary mb-2">By time</p>
            <div className="border-l-2 ml-[3.4rem] space-y-2" style={{ borderColor: C.border }}>
              {timedChores.map((chore) => <div key={chore.id} className="relative pl-5 py-1">
                <span className="absolute -left-[3.55rem] top-5 w-12 text-right text-xs font-semibold" style={{ color: C.textSec }}>{choreTimeLabel(chore.startTime)}</span>
                <span className="absolute -left-[0.43rem] top-[1.3rem] h-3 w-3 rounded-full border-[3px]" style={{ background: 'var(--surface)', borderColor: C.accent }} />
                <div className="rounded-xl border px-3 sm:px-4" style={{ borderColor: C.border, background: 'var(--surface)' }}>
                  <p className="text-xs font-semibold pt-3" style={{ color: C.accentDark }}>{choreTimeRange(chore.startTime, chore.durationMinutes)} · {chore.durationMinutes} min</p>
                  <ChoreRow chore={chore} members={members} onToggle={onToggle} showWhen={false} showTime={false} />
                  <button type="button" onClick={() => onEdit(chore)} className="text-xs rm-text-secondary min-h-10 flex items-center gap-1 cursor-pointer"><Pencil size={12} /> Edit time or chore</button>
                </div>
              </div>)}
            </div>
          </div>}
          {anytimeChores.length > 0 && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider rm-text-secondary mb-1">Anytime</p><div className="divide-y" style={{ borderColor: C.border }}>{anytimeChores.map((chore) => <ChoreRow key={chore.id} chore={chore} members={members} onToggle={onToggle} showWhen={false} />)}</div></div>}
          {!selectedChores.length && <div className="rounded-xl p-4 flex items-center gap-3 mt-3" style={{ background: 'var(--selected-surface)', color: C.textSec }}><Clock3 size={18} className="shrink-0" /><p className="text-sm">No chores planned for this day.</p></div>}
          {!selectedIsPast && <button type="button" onClick={() => onPlan(selectedDate)} className="text-sm font-semibold min-h-11 mt-2 flex items-center gap-1.5 cursor-pointer" style={{ color: C.accentDark }}><Plus size={15} /> Add chore for this day</button>}
        </div>
      </section>

      <SectionCard title="Previously assigned" action={<History size={18} color={C.textSec} />}>
        <div className="flex flex-wrap items-center gap-3 mb-3"><label htmlFor="chore-history-member" className="text-sm rm-text-secondary">Show chores assigned to</label>
          <select id="chore-history-member" className="rm-input min-h-11 w-auto" value={historyMember?.id || ''} onChange={(event) => setHistoryMemberId(event.target.value)}>
            {members.map((member) => <option key={member.id} value={member.id}>{member.you ? 'You' : member.name}</option>)}
          </select>
        </div>
        {previousChores.length ? <div className="divide-y" style={{ borderColor: C.border }}>
          {previousChores.map((chore) => <div key={chore.id} className="flex flex-wrap items-center justify-between gap-x-4 py-2">
            <div className="min-w-0"><p className="text-sm font-medium" style={{ color: C.text }}>{chore.name}</p><p className="text-xs rm-text-secondary">{dateLabel(chore.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })}{chore.startTime ? ` · ${choreTimeRange(chore.startTime, chore.durationMinutes)}` : ''}</p></div>
            <span className="text-xs font-semibold" style={{ color: chore.status === 'completed' ? C.income : C.expense }}>{chore.status === 'completed' ? 'Completed' : 'Overdue'}</span>
          </div>)}
        </div> : <p className="text-sm rm-text-secondary py-3">No earlier chores were assigned to {historyMember?.you ? 'you' : historyMember?.name || 'this member'}.</p>}
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold" style={{ color: C.text }}>All chores</h2><p className="text-sm rm-text-secondary">{chores.length} chores across this household</p></div><button type="button" onClick={() => openAdd('chore')} className="rm-btn rm-btn-ghost text-sm min-h-11 px-4 flex items-center gap-1.5"><Plus size={15} /> Add chore</button></div>
      {chores.length === 0 ? <SectionCard><EmptyState icon={ListChecks} title="No chores assigned" subtitle="Plan your first household chore." actionLabel="Plan a chore" onAction={() => onPlan(today)} /></SectionCard> :
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {GROUPS.map((group) => {
            const items = chores.filter((chore) => chore.status === group);
            return <SectionCard key={group} title={`${GROUP_LABEL[group]} (${items.length})`}>
              {items.length === 0 ? <p className="text-sm rm-text-secondary py-4 text-center">Nothing here</p> : <div className="divide-y" style={{ borderColor: C.border }}>
                {items.map((chore) => <div key={chore.id}><ChoreRow chore={chore} members={members} onToggle={onToggle} showWhen />
                  <div className="flex gap-2 -mt-1 mb-2"><button type="button" onClick={() => onEdit(chore)} className="text-xs rm-text-secondary min-h-11 px-2 flex items-center gap-1 cursor-pointer"><Pencil size={12} /> Edit</button><button type="button" onClick={() => { if (window.confirm('Remove this chore?')) onDelete(chore.id); }} className="text-xs min-h-11 px-2 flex items-center gap-1 cursor-pointer" style={{ color: C.expense }}><X size={12} /> Remove</button></div>
                </div>)}
              </div>}
            </SectionCard>;
          })}
        </div>}
    </div>
  );
}
