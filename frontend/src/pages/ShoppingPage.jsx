import React from 'react';
import { Plus } from 'lucide-react';
import { ShoppingList } from '../components/home';

export default function ShoppingPage({ items, onToggle, onDelete, onAdd, openAdd }) {
  return (
    <div className="rm-animate-in max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm rm-text-secondary">{items.filter((i) => !i.purchased).length} items left to buy</p>
        <button onClick={() => openAdd('purchase')} className="rm-btn rm-btn-primary text-sm px-4 py-2 flex items-center gap-1.5"><Plus size={15} /> Add Item</button>
      </div>
      <ShoppingList items={items} onToggle={onToggle} onDelete={onDelete} onAdd={onAdd} compact={false} setPage={() => {}} />
    </div>
  );
}
