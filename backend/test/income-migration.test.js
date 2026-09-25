const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const migration = readFileSync(join(__dirname, '../../supabase/migrations/20260925170000_separate_personal_income.sql'), 'utf8');
const expenseMigration = readFileSync(join(__dirname, '../../supabase/migrations/20260925180000_require_group_for_shared_expenses.sql'), 'utf8');
const expenseValidation = readFileSync(join(__dirname, '../../supabase/migrations/20260925193000_validate_shared_expense_group.sql'), 'utf8');
const budgetMigration = readFileSync(join(__dirname, '../../supabase/migrations/20260925190000_monthly_group_budget.sql'), 'utf8');
const owner = '11111111-1111-4111-8111-111111111111';
const group = '22222222-2222-4222-8222-222222222222';

test('income migration separates legacy personal income and protects shared expense scope', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.profiles (id uuid primary key);
      create table public.incomes (
        id integer primary key, group_id uuid not null, added_by uuid not null references public.profiles(id),
        income_date date not null, amount_minor bigint not null, deleted_at timestamptz
      );
      create table public.expenses (id integer primary key, group_id uuid);
      insert into public.profiles (id) values ('${owner}');
      insert into public.incomes (id, group_id, added_by, income_date, amount_minor)
        values (1, '${group}', '${owner}', current_date, 12000);
      insert into public.expenses (id, group_id) values (1, null);
    `);
    await db.exec(migration);
    await db.exec(expenseMigration);
    let result = await db.query('select income_type, owner_user_id from public.incomes where id = 1');
    assert.deepEqual(result.rows[0], { income_type: 'PERSONAL', owner_user_id: owner });

    await db.exec(`insert into public.incomes (id, group_id, added_by, income_date, amount_minor, income_type)
      values (2, '${group}', '${owner}', current_date, 5000, 'HOUSEHOLD');`);
    result = await db.query('select income_type, owner_user_id from public.incomes where id = 2');
    assert.deepEqual(result.rows[0], { income_type: 'HOUSEHOLD', owner_user_id: null });
    await assert.rejects(db.exec(`insert into public.incomes (id, group_id, added_by, income_date, amount_minor, income_type)
      values (3, '${group}', '${owner}', current_date, 100, 'PERSONAL');`));
    await assert.rejects(db.exec('insert into public.expenses (id, group_id) values (2, null);'));
    await db.exec(`insert into public.expenses (id, group_id) values (3, '${group}');`);
    await db.exec(`update public.expenses set group_id = '${group}' where id = 1;`);
    await db.exec(expenseValidation);

    await db.exec(migration);
    result = await db.query('select income_type, owner_user_id from public.incomes where id = 2');
    assert.deepEqual(result.rows[0], { income_type: 'HOUSEHOLD', owner_user_id: null });
  } finally {
    await db.close();
  }
});

test('monthly budget migration gives existing groups a default and rejects invalid values', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table public.groups (id integer primary key); insert into public.groups (id) values (1);`);
    await db.exec(budgetMigration);
    let result = await db.query('select monthly_budget_minor from public.groups where id = 1');
    assert.equal(Number(result.rows[0].monthly_budget_minor), 3000000);
    await db.exec('update public.groups set monthly_budget_minor = 420050 where id = 1');
    result = await db.query('select monthly_budget_minor from public.groups where id = 1');
    assert.equal(Number(result.rows[0].monthly_budget_minor), 420050);
    await assert.rejects(db.exec('update public.groups set monthly_budget_minor = 0 where id = 1'));
  } finally {
    await db.close();
  }
});
