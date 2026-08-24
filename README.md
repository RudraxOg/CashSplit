# RoomMate — Full-Stack Split

The original `RoomMate.jsx` was a single 1,376-line React component: UI,
state, and "business logic" (settle-up math, activity logging, seed data)
all mixed together with no persistence — a refresh wiped everything.

This project splits it into a real **frontend** (React + Vite) and
**backend** (Node/Express REST API), the way a senior dev would structure
it before handing it to a team. Nothing in the UI or its behavior changed —
every component, every color, every interaction is the same. What changed
is *where the data lives and who owns it*.

## Section → layer map

| Original section (in RoomMate.jsx) | Now lives in |
|---|---|
| Design tokens, seed data, `inr()` helper | `frontend/src/lib/constants.js` (tokens only) + `backend/src/data/store.js` (data) |
| Avatar, Badge, Delta, ProgressBar, EmptyState, SectionCard, Field, Toggle, Modal, Toast | `frontend/src/components/common.jsx` |
| Sidebar, NavGroups, Header, MobileDrawer/TopBar/BottomNav | `frontend/src/components/nav.jsx` |
| SummaryCards, SpendingOverview, BalanceSummary, TodaysChores, ActivityFeed, ShoppingList | `frontend/src/components/home.jsx` |
| AddMenu + the 4 entity forms | `frontend/src/components/forms.jsx` |
| HomePage / ExpensesPage / IncomePage / BalancesPage / ChoresPage / ShoppingPage / ReportsPage / MembersPage / SettingsPage | `frontend/src/pages/*.jsx` |
| `App`'s `useState` + handlers (`addExpense`, `toggleChore`, `settleUp`, ...) | `frontend/src/hooks/useHousehold.js` (client) calling → `backend/src/routes/*.routes.js` (server) |
| In-memory arrays (`INITIAL_EXPENSES`, etc.) | `backend/src/data/store.js` — the one place "the database" lives |

## Why this split

- **Frontend now only renders and calls an API.** No component computes
  totals or mutates arrays directly anymore — `useHousehold.js` is the one
  seam between UI and data.
- **Backend owns the data and the business rules** (what happens when a
  chore is toggled, how "settle up" works, activity-feed writes). That
  logic used to live inside the React component; now it's server-side,
  which means a second client (mobile app, someone else's frontend) gets
  the same behavior for free.
- **The data layer is swappable.** `backend/src/data/store.js` is the only
  file that knows data is "just arrays in memory." Replace it with
  Postgres/Prisma or SQLite later and every route file stays identical.

## Running it

### Install everything
```bash
npm run install:all
```

### Start both services
```bash
npm run dev         # frontend: http://localhost:5173, backend: http://localhost:4000
```

The root command starts both services and stops the other one if either process
fails. To run them separately, use `npm run dev:backend` and
`npm run dev:frontend`.

The Vite development proxy forwards `/api` requests to the backend. The
frontend environment is configured in `frontend/.env`.

### Build and test
```bash
npm run build
npm --prefix backend test
```

The backend uses an in-memory data store for the demo, so changes reset when
the backend process restarts.

### Supabase production configuration

The production schema is in
`supabase/migrations/20260825_initial_schema.sql`. Create a Supabase project,
run that migration in the SQL editor, then configure `backend/.env` with
`SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY`.
The server reads the file automatically. `GET /api/health` reports whether the
Supabase connection is active. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
For the browser client, use the separate `frontend/.env` values
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; never copy the service-role
key into a `VITE_*` variable.

Set `AUTH_REQUIRED=true` only after the frontend is sending Supabase access
tokens. Local development remains available with `AUTH_REQUIRED=false`.

The Supabase migration uses integer minor units (`*_amount_minor`), foreign
keys, soft deletion, versioned history, idempotency storage, chore due dates,
and Row Level Security membership policies. The current local adapter remains
available as a safe fallback. The server currently uses Supabase for an
explicit connectivity check; migrating the route repositories to Supabase is
the next production cutover step after credentials and auth flows are ready.

Chores now accept `dueDate` (`YYYY-MM-DD`) and an optional RRULE-style
`recurrenceRule`; the old display labels are retained only for compatibility.
The interface also includes a persisted light/dark theme with a reduced-motion
safe View Transitions wipe where supported.

The expense engine supports `EQUAL`, `SHARES`, `PERCENT`, `EXACT`,
`ADJUSTMENT`, `ITEMIZED`, and reimbursement flows. Rich expenses are available
at `POST /api/expenses`; balances are exposed at `GET /api/balances`, debt
simplification at `GET /api/balances/g1/simplified`, and real settlements at
`POST /api/settlements`.

## API surface

| Resource | Endpoints |
|---|---|
| Members | `GET /api/members` |
| Expenses | `GET/POST /api/expenses` |
| Incomes | `GET/POST /api/incomes` |
| Chores | `GET/POST /api/chores`, `PATCH /api/chores/:id/toggle`, `DELETE /api/chores/:id` |
| Shopping | `GET/POST /api/shopping`, `PATCH /api/shopping/:id/toggle`, `DELETE /api/shopping/:id` |
| Balances | `GET /api/balances`, `POST /api/balances/settle` |
| Activity | `GET /api/activity` |
| Reports | `GET /api/reports/summary`, `GET /api/reports/monthly` |

## Known gaps to close before shipping this for real

1. **No database** — data resets on server restart. Swap `store.js` for
   Postgres/SQLite; every route file's imports stay the same.
2. **No auth** — every request acts as "Krishna." Add a real auth
   middleware and use `req.user` instead of a hardcoded name.
3. **Settings page isn't wired up** — it's still local-only UI state
   (there was no settings data in the original component to persist
   either). Add a `/api/settings` route when you need it to stick.
4. **No input sanitization beyond basic type/required checks** — fine for
   a demo, not for production; add a schema validator (zod/joi) on the
   POST routes.
