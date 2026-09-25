import React, { useState, useEffect } from 'react';
import { ChevronDown, MessageCircle, Plus, ReceiptText, Pencil, Trash2 } from 'lucide-react';
import { C, CATEGORY_COLORS, inr } from '../lib/constants';
import { SectionCard, EmptyState, Avatar } from '../components/common';

import { ReceiptAttachment } from '../components/ReceiptAttachment';
import { api } from '../lib/api';
import { ExpenseTools, RecurringExpenses } from '../components/ExpenseTools';

export default function ExpensesPage({ groupId, expenses: allExpenses, members, openAdd, onComment, onEdit, onDelete }) {
  const readFilters = () => Object.fromEntries([...new URLSearchParams(window.location.search)].filter(([key]) => ['q','from','to','category','payer','participant','min','max'].includes(key)));
  const [filters, setFilters] = useState(readFilters);
  const [expenses, setExpenses] = useState(allExpenses);
  const [nextOffset, setNextOffset] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [searching, setSearching] = useState(false);
  useEffect(() => { const back = () => setFilters(readFilters()); window.addEventListener('popstate', back); return () => window.removeEventListener('popstate', back); }, []);
  const changeFilters = (value) => {
    setFilters(value);
    const params = new URLSearchParams(Object.fromEntries(Object.entries(value).filter(([, v]) => v !== '')));
    window.history.replaceState(null, '', `${window.location.pathname}${params.size ? '?' + params : ''}`);
  };
  useEffect(() => {
    let active = true; setSearching(true);
    const timer = setTimeout(() => api.searchExpenses(groupId, { ...filters, limit: 30 }).then((result) => {
      if (active) { setExpenses(result.data); setNextOffset(result.nextOffset); setFetchError(''); }
    }).catch((error) => { if (active) setFetchError(error.message); }).finally(() => { if (active) setSearching(false); }), 200);
    return () => { active = false; clearTimeout(timer); };
  }, [groupId, filters, allExpenses]);
  const loadMore = async () => { setSearching(true); try { const result = await api.searchExpenses(groupId, { ...filters, limit: 30, offset: nextOffset }); setExpenses((current) => [...current, ...result.data]); setNextOffset(result.nextOffset); } catch (error) { setFetchError(error.message); } finally { setSearching(false); } };
  const [expanded, setExpanded] = useState(null);
  const [comment, setComment] = useState('');
  const addComment = async (expenseId) => { if (!comment.trim()) return; if (await onComment(expenseId, comment.trim())) setComment(''); };
  return (
    <div className="rm-animate-in max-w-3xl">
      <div className="flex items-center justify-between mb-5"><p className="text-sm rm-text-secondary">{expenses.length} expenses tracked</p><button onClick={() => openAdd('expense')} className="rm-btn rm-btn-primary text-sm px-4 py-3 flex items-center gap-1.5"><Plus size={15} /> Add expense</button></div>
      <ExpenseTools groupId={groupId} members={members} filters={filters} onChange={changeFilters} />
      <RecurringExpenses groupId={groupId} />
      {fetchError && <p role="alert" className="text-sm text-red-700 mb-3">{fetchError}</p>}
      {searching && <p role="status" className="text-sm rm-text-secondary mb-3">Loading expenses…</p>}
      <SectionCard>
        {expenses.length === 0 ? <EmptyState icon={ReceiptText} title="No expenses yet" subtitle="Add your first household expense." actionLabel="Add Expense" onAction={() => openAdd('expense')} /> : <div className="divide-y" style={{ borderColor: C.border }}>{expenses.map((expense) => { const payer = members.find((member) => member.name === expense.paidBy); const isOpen = expanded === expense.id; return <div key={expense.id}>
          <button type="button" onClick={() => setExpanded(isOpen ? null : expense.id)} className="w-full flex items-center gap-3 py-4 text-left cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${CATEGORY_COLORS[expense.category] || C.others}22` }}><span className="text-xs font-bold" style={{ color: CATEGORY_COLORS[expense.category] || C.others }}>{(expense.category || 'O')[0]}</span></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate" style={{ color: C.text }}>{expense.description || expense.note}</p><p className="text-xs rm-text-secondary truncate">{expense.category} · {expense.splitType || 'EQUAL'} · {expense.date}</p></div>
            <Avatar member={payer} size={28} /><span className="font-semibold text-sm w-24 text-right shrink-0" style={{ color: C.expense }}>-{inr(expense.totalAmount ?? expense.amount, expense.currency)}</span><ChevronDown size={16} color={C.textSec} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && <div className="pb-4 pl-0 sm:pl-[52px] rm-animate-in"><div className="flex justify-end gap-2 mb-3"><button onClick={() => onEdit(expense)} className="rm-btn rm-btn-ghost px-3 py-2 text-xs flex items-center gap-1"><Pencil size={13} /> Edit</button><button onClick={() => { if (window.confirm('Delete this expense? The balance will be recalculated.')) onDelete(expense.id); }} className="rm-btn px-3 py-2 text-xs flex items-center gap-1" style={{ color: C.expense }}><Trash2 size={13} /> Delete</button></div><div className="rounded-2xl p-4" style={{ background: C.bg }}><div className="flex items-center justify-between mb-3"><p className="text-xs font-semibold uppercase tracking-wide rm-text-secondary">Split breakdown</p><span className="text-xs font-semibold" style={{ color: C.accentDark }}>{expense.reimbursement ? 'Reimbursement' : expense.splitType || 'Equally'}</span></div><div className="space-y-2">{(expense.participants || []).map((share) => { const member = members.find((item) => item.id === share.userId); return <div key={share.userId} className="flex items-center gap-2"><Avatar member={member} size={24} /><span className="text-sm flex-1" style={{ color: C.text }}>{member?.you ? 'You' : member?.name || share.userId}</span><span className="text-sm font-semibold tabular-nums" style={{ color: share.owedAmount < 0 ? C.accentDark : C.text }}>{inr(Math.abs(share.owedAmount), expense.currency)}</span></div>; })}</div></div><ReceiptAttachment expense={expense} /><div className="mt-3"><div className="flex items-center gap-2"><MessageCircle size={15} color={C.textSec} /><p className="text-xs font-semibold rm-text-secondary">Comments</p></div>{(expense.comments || []).slice(0, 3).map((item) => <p key={item.id} className="text-sm mt-2" style={{ color: C.text }}>{item.text}</p>)}<div className="flex gap-2 mt-2"><input value={expanded === expense.id ? comment : ''} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addComment(expense.id); }} className="rm-input" placeholder="Add a note about this expense" /><button onClick={() => addComment(expense.id)} className="rm-btn rm-btn-ghost px-3 text-sm">Send</button></div></div></div>}
        </div>; })}</div>}
      </SectionCard>
      {nextOffset != null && <button disabled={searching} className="rm-btn rm-btn-ghost px-4 py-3 mt-3" onClick={loadMore}>Load more expenses</button>}
    </div>
  );
}
