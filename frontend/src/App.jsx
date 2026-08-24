import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { C } from './lib/constants';
import { useHousehold } from './hooks/useHousehold';

import { Sidebar, Header, MobileTopBar, MobileDrawer, BottomNav, MoreSheet } from './components/nav';
import { Modal, Toast } from './components/common';
import { AddMenu, ExpenseForm, IncomeForm, ChoreForm, PurchaseForm, SettlementForm } from './components/forms';

import HomePage from './pages/HomePage';
import ExpensesPage from './pages/ExpensesPage';
import IncomePage from './pages/IncomePage';
import BalancesPage from './pages/BalancesPage';
import ChoresPage from './pages/ChoresPage';
import ShoppingPage from './pages/ShoppingPage';
import ReportsPage from './pages/ReportsPage';
import MembersPage from './pages/MembersPage';
import SettingsPage from './pages/SettingsPage';

import './styles.css';

const MODAL_TITLES = { expense: 'Add Expense', income: 'Add Income', chore: 'Add Chore', purchase: 'Add to Shopping List', settlement: 'Record Settlement' };

export default function App() {
  const [page, setPage] = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [householdOpen, setHouseholdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const household = useHousehold();
  const {
    members, expenses, incomes, chores, shoppingItems, activities, balances, summary, monthly, group,
    loading, error, toast,
    addExpense, addIncome, addChore, toggleChore, deleteChore,
    addPurchase, addShoppingQuick, toggleShopping, deleteShopping, settleUp, updateSimplifyDebts, addExpenseComment,
  } = household;

  const openAdd = (type) => setActiveModal(type);

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

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.bg }}>
      <Sidebar page={page} setPage={setPage} members={members} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} page={page} setPage={setPage} />

      <div className="flex-1 min-w-0">
        <main className="px-4 sm:px-6 md:px-10 py-6 pb-28 md:pb-10 max-w-[1440px] mx-auto w-full">
          <MobileTopBar onMenu={() => setDrawerOpen(true)} />
          <Header
            page={page} householdOpen={householdOpen} setHouseholdOpen={setHouseholdOpen}
            notifOpen={notifOpen} setNotifOpen={setNotifOpen} activities={activities}
            hasUnread={hasUnread} setHasUnread={setHasUnread}
          />

          {page === 'home' && (
            <HomePage
              members={members} expenses={expenses} chores={chores} shoppingItems={shoppingItems}
              activities={activities} balances={balances.members || []} summary={summary} setPage={setPage}
              toggleChore={toggleChore} toggleShopping={toggleShopping} deleteShopping={deleteShopping}
              addShopping={addShoppingQuick} settleUp={settleUp}
            />
          )}
          {page === 'expenses' && <ExpensesPage expenses={expenses} members={members} openAdd={openAdd} onComment={addExpenseComment} />}
          {page === 'income' && <IncomePage incomes={incomes} members={members} openAdd={openAdd} />}
          {page === 'balances' && <BalancesPage balanceData={balances} members={members} onSettle={() => setActiveModal('settlement')} />}
          {page === 'chores' && <ChoresPage chores={chores} members={members} onToggle={toggleChore} onDelete={deleteChore} openAdd={openAdd} />}
          {page === 'shopping' && <ShoppingPage items={shoppingItems} onToggle={toggleShopping} onDelete={deleteShopping} onAdd={addShoppingQuick} openAdd={openAdd} />}
          {page === 'reports' && <ReportsPage expenses={expenses} totalExpenses={summary.totalExpenses} monthly={monthly} />}
          {page === 'members' && <MembersPage members={members} balances={balances.members || []} />}
          {page === 'settings' && <SettingsPage group={group} onSimplifyDebts={updateSimplifyDebts} />}
        </main>
      </div>

      <button
        onClick={() => setAddMenuOpen(!addMenuOpen)}
        className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 rounded-full items-center justify-center shadow-lg cursor-pointer z-40"
        style={{ background: C.accent, transition: 'transform .18s ease' }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Plus size={24} color="#fff" style={{ transform: addMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform .18s ease' }} />
      </button>

      <BottomNav page={page} setPage={setPage} onAdd={() => setAddMenuOpen(!addMenuOpen)} onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} setPage={setPage} />

      {addMenuOpen && <AddMenu onPick={openAdd} onClose={() => setAddMenuOpen(false)} />}

      {activeModal && (
        <Modal wide={activeModal === 'expense'} title={MODAL_TITLES[activeModal]} onClose={() => setActiveModal(null)}>
          {activeModal === 'expense' && <ExpenseForm members={members} onSubmit={addExpense} onClose={() => setActiveModal(null)} />}
          {activeModal === 'income' && <IncomeForm members={members} onSubmit={addIncome} onClose={() => setActiveModal(null)} />}
          {activeModal === 'chore' && <ChoreForm members={members} onSubmit={addChore} onClose={() => setActiveModal(null)} />}
          {activeModal === 'purchase' && <PurchaseForm onSubmit={addPurchase} onClose={() => setActiveModal(null)} />}
          {activeModal === 'settlement' && <SettlementForm members={members} pairwise={balances.pairwise} onSubmit={settleUp} onClose={() => setActiveModal(null)} />}
        </Modal>
      )}

      <Toast message={toast} />
    </div>
  );
}
