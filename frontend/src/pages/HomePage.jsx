import React from 'react';
import {
  SummaryCards, SpendingOverview, BalanceSummary, TodaysChores, ActivityFeed, ShoppingList,
} from '../components/home';

export default function HomePage({
  members, expenses, chores, shoppingItems, activities, balances, summary, setPage,
  toggleChore, toggleShopping, purchaseShoppingItem, deleteShopping, editShopping, addShopping, settleUp, onUpdateBudget,
}) {
  return (
    <div className="rm-animate-in">
      <SummaryCards
        totalIncome={summary.totalIncome}
        totalExpenses={summary.totalExpenses}
        budgetSpent={summary.budgetSpent}
        balance={summary.balance}
        budget={summary.budget}
        spentPct={summary.spentPct}
        onUpdateBudget={onUpdateBudget}
      />
      <div className="mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <SpendingOverview expenses={expenses} totalExpenses={summary.totalExpenses} setPage={setPage} />
        <BalanceSummary balances={balances} members={members} onSettle={() => setPage('balances')} setPage={setPage} />
        <TodaysChores chores={chores} members={members} onToggle={toggleChore} setPage={setPage} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <ActivityFeed activities={activities} />
        <ShoppingList
          items={shoppingItems}
          onToggle={toggleShopping}
          onPurchase={purchaseShoppingItem}
          onDelete={deleteShopping}
          onEdit={editShopping}
          onAdd={addShopping}
          compact
          setPage={setPage}
        />
      </div>
    </div>
  );
}
