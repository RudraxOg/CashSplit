import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from './lib/api';
import { C } from './lib/constants';
import { useHousehold } from './hooks/useHousehold';
import { appPageFromPath, appPathForPage } from './lib/routes';

import { Sidebar, Header, MobileTopBar, MobileDrawer, BottomNav, MoreSheet } from './components/nav';
import { Modal, Toast } from './components/common';
import { AddMenu, ExpenseForm, IncomeForm, ChoreForm, PurchaseForm, SettlementForm, EditExpenseForm, EditIncomeForm, EditChoreForm, EditShoppingForm } from './components/forms';

const HomePage = lazy(() => import('./pages/HomePage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const IncomePage = lazy(() => import('./pages/IncomePage'));
const BalancesPage = lazy(() => import('./pages/BalancesPage'));
const ChoresPage = lazy(() => import('./pages/ChoresPage'));
const ShoppingPage = lazy(() => import('./pages/ShoppingPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const MembersPage = lazy(() => import('./pages/MembersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));

const MODAL_TITLES = { expense: 'Add Expense', income: 'Add Income', chore: 'Add Chore', purchase: 'Add to Shopping List', settlement: 'Record Settlement' };

export default function App() {
  const [page, setPageState] = useState(() => appPageFromPath(window.location.pathname));
  const setPage = useCallback((nextPage) => {
    const nextPath = appPathForPage(nextPage);
    const target = appPageFromPath(nextPath);
    setPageState(target);
    if (window.location.pathname !== nextPath) window.history.pushState({ page: target }, '', nextPath);
  }, []);
  useEffect(() => {
    const onPopState = () => setPageState(appPageFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [plannedChoreDate, setPlannedChoreDate] = useState('');
  const [householdOpen, setHouseholdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [balanceCurrency, setBalanceCurrency] = useState('INR');
  const [currencyBalances, setCurrencyBalances] = useState(null);
  const [currencyError, setCurrencyError] = useState('');
  const [firstGroupName, setFirstGroupName] = useState('My Household');

  const household = useHousehold();
  const {
    groups, groupOverview, activeGroupId, members, expenses, incomes, chores, shoppingItems, activities, balances, summary, monthly, group,
    loading, error, toast,
    switchGroup, createGroup, addGroupMember, createGroupInvite,
    addExpense, updateExpense, deleteExpense, addIncome, updateIncome, deleteIncome, addChore, updateChore, toggleChore, deleteChore,
    addPurchase, addShoppingQuick, toggleShopping, updateShopping, purchaseShoppingItem, deleteShopping, settleUp, updateSimplifyDebts, updateGroupName, updateMonthlyBudget, addExpenseComment,
  } = household;
  useEffect(() => {
    let active = true; setCurrencyBalances(null); setCurrencyError('');
    if (balanceCurrency !== 'INR' && activeGroupId) api.getBalances(activeGroupId, balanceCurrency).then((data) => { if (active) setCurrencyBalances(data); }).catch((e) => { if (active) setCurrencyError(e.message); });
    return () => { active = false; };
  }, [activeGroupId, balanceCurrency, balances]);
  const visibleBalances = balanceCurrency === 'INR' ? balances : currencyBalances;
  useEffect(() => {
    const latest = activities[0]?.id || activities[0]?.createdAt || activities[0]?.time;
    if (!activeGroupId || !latest) { setHasUnread(false); return; }
    setHasUnread(localStorage.getItem(`rm-activity-seen:${activeGroupId}`) !== String(latest));
  }, [activeGroupId, activities]);
  const updateUnread = useCallback((value) => {
    if (!value && activeGroupId) {
      const latest = activities[0]?.id || activities[0]?.createdAt || activities[0]?.time;
      if (latest) localStorage.setItem(`rm-activity-seen:${activeGroupId}`, String(latest));
    }
    setHasUnread(value);
  }, [activeGroupId, activities]);

  const openAdd = (type) => { setEditingItem(null); setPlannedChoreDate(''); setActiveModal(type); };
  const openPlanChore = (date) => { setEditingItem(null); setPlannedChoreDate(date); setActiveModal('chore'); };
  const openEdit = (type, item) => { setEditingItem(item); setActiveModal(type); };
  const closeModal = () => { setActiveModal(null); setEditingItem(null); };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: C.bg, color: C.textSec }}>
        Loading your household…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-3" style={{ background: C.bg, color: C.text }}>
        <p className="font-semibold">Couldn't reach the RoomMate API</p>
        <p className="text-sm" style={{ color: C.textSec }}>{error}</p>
        <button onClick={household.reload} className="rm-btn rm-btn-primary text-sm px-4 py-2">Retry</button>
      </div>
    );
  }

  if (!groups.length) {
    return <div className="min-h-dvh w-full flex items-center justify-center p-5" style={{ background: C.bg }}><div className="rm-card w-full max-w-md p-7"><h1 className="text-2xl font-bold" style={{ color: C.text }}>Create your first household</h1><p className="text-sm rm-text-secondary mt-2 mb-6">Your account is ready. Name the household you want to manage.</p><label htmlFor="first-group-name" className="text-xs font-medium rm-text-secondary block mb-1.5">Household name</label><input id="first-group-name" className="rm-input" value={firstGroupName} onChange={(event) => setFirstGroupName(event.target.value)} /><button type="button" disabled={!firstGroupName.trim()} onClick={() => createGroup(firstGroupName.trim())} className="rm-btn rm-btn-primary w-full py-3 mt-4 disabled:opacity-40">Create household</button></div></div>;
  }

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.bg }}>
      <Sidebar page={page} setPage={setPage} members={members} onInvite={() => setPage('groups')} onProfile={() => setPage('settings')} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} page={page} setPage={setPage} />

      <div className="flex-1 min-w-0">
        <main className="px-4 sm:px-6 md:px-10 py-6 pb-28 md:pb-10 max-w-[1440px] mx-auto w-full">
          <MobileTopBar onMenu={() => setDrawerOpen(true)} />
          <Header
            page={page} householdOpen={householdOpen} setHouseholdOpen={setHouseholdOpen}
            notifOpen={notifOpen} setNotifOpen={setNotifOpen} activities={activities}
            hasUnread={hasUnread} setHasUnread={updateUnread} group={group} groups={groups}
            onSwitchGroup={switchGroup} onOpenGroups={() => setPage('groups')}
          />

          <Suspense fallback={<div className="rm-card p-6 rm-text-secondary" role="status">Loading section…</div>}>
          {page === 'home' && (
            <HomePage
              members={members} expenses={expenses.filter((e) => (e.currency || 'INR') === 'INR')} chores={chores} shoppingItems={shoppingItems}
              activities={activities} balances={balances.members || []} summary={summary} setPage={setPage} onUpdateBudget={updateMonthlyBudget}
              toggleChore={toggleChore} toggleShopping={toggleShopping} deleteShopping={deleteShopping}
              editShopping={(item) => openEdit('shopping', item)} addShopping={addShoppingQuick} purchaseShoppingItem={purchaseShoppingItem} settleUp={settleUp}
            />
          )}
          {page === 'expenses' && <ExpensesPage key={activeGroupId} groupId={activeGroupId} expenses={expenses} members={members} openAdd={openAdd} onComment={addExpenseComment} onEdit={(item) => openEdit('expense', item)} onDelete={deleteExpense} />}
          {page === 'income' && <IncomePage incomes={incomes} members={members} openAdd={openAdd} onEdit={(item) => openEdit('income', item)} onDelete={deleteIncome} />}
          {page === 'balances' && !visibleBalances && <p role="status">{currencyError || 'Loading currency balances…'}</p>}
          {page === 'balances' && visibleBalances && <BalancesPage currency={balanceCurrency} onCurrency={setBalanceCurrency} showSimplified={Boolean(group.simplifyDebts)} onSimplify={updateSimplifyDebts} balanceData={visibleBalances} members={members} onSettle={() => setActiveModal('settlement')} />}
          {page === 'chores' && <ChoresPage chores={chores} members={members} onToggle={toggleChore} onDelete={deleteChore} onEdit={(item) => openEdit('chore', item)} openAdd={openAdd} onPlan={openPlanChore} />}
          {page === 'shopping' && <ShoppingPage items={shoppingItems} onToggle={toggleShopping} onPurchase={purchaseShoppingItem} onDelete={deleteShopping} onEdit={(item) => openEdit('shopping', item)} onAdd={addShoppingQuick} openAdd={openAdd} />}
          {page === 'reports' && <ReportsPage expenses={expenses.filter((e) => (e.currency || 'INR') === 'INR')} totalExpenses={summary.totalExpenses} monthly={monthly} />}
          {page === 'members' && <MembersPage members={members} balances={balances.members || []} />}
          {page === 'groups' && <GroupsPage groups={groups} overview={groupOverview} activeGroupId={activeGroupId} onSelect={switchGroup} onCreate={createGroup} onInvite={createGroupInvite} />}
          {page === 'settings' && <SettingsPage key={activeGroupId} members={members} onDefaultSplit={household.updateDefaultSplit} group={group} onSimplifyDebts={updateSimplifyDebts} onRename={updateGroupName} />}
          </Suspense>
        </main>
      </div>

      <button
        type="button"
        aria-label={addMenuOpen ? 'Close add menu' : 'Open add menu'}
        aria-expanded={addMenuOpen}
        onClick={() => setAddMenuOpen(!addMenuOpen)}
        className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 rounded-full items-center justify-center shadow-lg cursor-pointer z-40"
        style={{ background: C.accent, transition: 'transform .18s ease' }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Plus size={24} color="#fff" style={{ transform: addMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform .18s ease' }} />
      </button>

      <BottomNav page={page} setPage={setPage} onAdd={() => setAddMenuOpen(!addMenuOpen)} onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} setPage={setPage} onInvite={() => setPage('groups')} />

      {addMenuOpen && <AddMenu onPick={openAdd} onClose={() => setAddMenuOpen(false)} />}

      {activeModal && (
        <Modal wide={activeModal === 'expense' && !editingItem} title={editingItem ? `Edit ${activeModal}` : MODAL_TITLES[activeModal]} onClose={closeModal}>
          {activeModal === 'expense' && (editingItem ? <EditExpenseForm expense={editingItem} onSubmit={(payload) => updateExpense(editingItem.id, payload)} onClose={closeModal} /> : <ExpenseForm defaultSplit={group.defaultSplit} members={members} onSubmit={addExpense} onClose={closeModal} />)}
          {activeModal === 'income' && (editingItem ? <EditIncomeForm income={editingItem} members={members} onSubmit={(payload) => updateIncome(editingItem.id, payload)} onClose={closeModal} /> : <IncomeForm members={members} onSubmit={addIncome} onClose={closeModal} />)}
          {activeModal === 'chore' && (editingItem ? <EditChoreForm chore={editingItem} members={members} onSubmit={(payload) => updateChore(editingItem.id, payload)} onClose={closeModal} /> : <ChoreForm members={members} initialDate={plannedChoreDate} onSubmit={addChore} onClose={closeModal} />)}
          {activeModal === 'shopping' && <EditShoppingForm item={editingItem} onSubmit={(payload) => updateShopping(editingItem.id, payload)} onClose={closeModal} />}
          {activeModal === 'purchase' && <PurchaseForm onSubmit={addPurchase} onClose={closeModal} />}
          {activeModal === 'settlement' && <SettlementForm currency={page === 'balances' ? balanceCurrency : 'INR'} members={members} pairwise={group.simplifyDebts ? (visibleBalances || balances).simplified : (visibleBalances || balances).pairwise} onSubmit={settleUp} onClose={closeModal} />}
        </Modal>
      )}

      <Toast message={toast} />
    </div>
  );
}
