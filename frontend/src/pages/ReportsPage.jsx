import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts';
import { C, CATEGORY_COLORS, inr } from '../lib/constants';
import { SectionCard, ProgressBar, EmptyState } from '../components/common';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage({ expenses, totalExpenses, monthly }) {
  const data = useMemo(() => {
    const byCat = {};
    (expenses || []).forEach((e) => {
      const value = Number(e.amount || e.totalAmount || 0);
      if (value > 0) byCat[e.category || e.categoryId || 'Others'] = (byCat[e.category || e.categoryId || 'Others'] || 0) + value;
    });
    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || C.others }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  return (
    <div className="rm-animate-in"><p className="text-xs rm-text-secondary mb-3">Household reports show INR expenses and income. View other currencies separately in Balances.</p>
      <div className="mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <SectionCard title="Income vs Expenses" action={<span className="text-xs rm-text-secondary">Last 6 months</span>}>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} barGap={6}>
                <CartesianGrid vertical={false} stroke={C.border} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: C.textSec }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `₹${value}`} tick={{ fontSize: 12, fill: C.textSec }} axisLine={false} tickLine={false} width={56} />
                <RTooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 12 }} />
                <Bar dataKey="income" fill={C.income} radius={[6, 6, 0, 0]} isAnimationActive />
                <Bar dataKey="expenses" fill={C.expense} radius={[6, 6, 0, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only"><caption>Income and expenses for the last six months in Indian rupees</caption><thead><tr><th>Month</th><th>Income</th><th>Expenses</th></tr></thead><tbody>{(monthly || []).map((row) => <tr key={row.month}><th>{row.month}</th><td>{row.income}</td><td>{row.expenses}</td></tr>)}</tbody></table>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs rm-text-secondary"><span className="w-2.5 h-2.5 rounded-full" style={{ background: C.income }} /> Income</span>
            <span className="flex items-center gap-1.5 text-xs rm-text-secondary"><span className="w-2.5 h-2.5 rounded-full" style={{ background: C.expense }} /> Expenses</span>
          </div>
        </SectionCard>

        <SectionCard title="Spending by Category">
          {data.length === 0 ? (
            <EmptyState icon={BarChart3} title="No spending yet" subtitle="Add an expense to see your category breakdown." />
          ) : <div className="space-y-3">
            {data.map((d) => (
              <div key={d.name}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span style={{ color: C.text }}>{d.name}</span>
                  <span className="font-medium" style={{ color: C.text }}>{inr(d.value)}</span>
                </div>
                <ProgressBar pct={totalExpenses ? (d.value / totalExpenses) * 100 : 0} color={d.color} />
              </div>
            ))}
          </div>}
        </SectionCard>
      </div>
    </div>
  );
}
