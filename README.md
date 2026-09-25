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
npm run dev         # frontend: http://localhost:5173, backend: http://localhost:4317
```

### Install RoomMate on a phone

The production frontend is a Progressive Web App. Deploy it on HTTPS, open the
site in Chrome on Android, and tap **Install app** (or use Chrome's menu →
**Install app**). Chrome adds RoomMate to the home screen as a standalone
WebAPK. On iPhone/iPad, open the site in Safari, tap **Share → Add to Home
Screen**. The service worker caches only the application shell and static
assets; it deliberately does not cache API responses or household financial
data. Use `npm run build` to produce the frontend bundle in `frontend/dist`.

Income entries can be **Personal** (assigned to one member and excluded from
household income totals) or **Shared household income** (included in the
household summary and reports). Apply
`supabase/migrations/20260925170000_separate_personal_income.sql` before using that
distinction with an existing Supabase database.

To load repeatable Supabase demo data, run this from `backend/`:

```bash
npm run seed:supabase
```

The seed command creates three confirmed test accounts (`aman.seed@roommate.test`,
`neha.seed@roommate.test`, and `rohit.seed@roommate.test`), connects them to the
first household, and adds sample expenses, income, chores, shopping items, and
activity records. It is safe to rerun; records are checked before insertion.
The test accounts use `RoomMateDemo!2026` unless `SEED_USER_PASSWORD` is supplied.

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

Apply both migrations in order before enabling persistent data:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

The first migration creates the core household, expense ledger, settlement,
history, activity, and chore tables. The second adds incomes, shopping items,
indexes, updated-at triggers, read policies, and atomic expense create/update
RPCs.

Before opening the app, create at least one Supabase Auth user and matching
`profiles`, `groups`, and `group_members` rows. The backend accepts the legacy
`g1` alias during migration but stores persistent records with UUIDs. In
production, set `AUTH_REQUIRED=true`; the frontend forwards the Supabase access
token in the `Authorization` header.

The backend uses Supabase only when `SUPABASE_ENABLED=true` and both credentials
are present. Keep it `false` until the migrations and bootstrap records exist;
this prevents an unprovisioned project from breaking the API. Tests set
`NODE_ENV=test` and use the memory adapter for deterministic isolation. Never
expose or commit the service-role key; rotate it immediately if it has been
shared or committed.

### Authentication lifecycle

The frontend auth routes are `/signin`, `/signup`, `/forgot-password`,
`/reset-password`, `/verify-email`, and `/app`. Supabase Auth persists the
session, refreshes tokens, detects email/OAuth callback URLs, and signs out
globally. The backend validates the bearer token when `AUTH_REQUIRED=true` and
uses the token's UUID as `req.user.id`.

Apply `20260828_auth_lifecycle.sql` after the earlier migrations. It creates the
`auth.users` → `profiles` trigger, profile visibility/update policies, and
member-scoped write policies. Configure Supabase Auth URL redirects for the
frontend origins and enable Email; Google OAuth is used when the Google
provider is enabled in the Supabase dashboard. Account deletion is handled by
`POST /api/account/delete` using the server-only service-role key.

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

## Remaining production work

1. Configure production Supabase Auth SMTP if invite and account emails
   should be delivered from a custom domain.
2. Add browser-level coverage for confirmation redirects, invite acceptance,
   expired tokens, and wrong-email rejection.
3. Add schema validation middleware to every remaining write route before a
   public production launch.
## Group invitations

Groups are private and join-by-invite, matching the product behavior we want for a household app. A signed-in group member opens **Groups → Invite a roommate**, enters the recipient email, and shares the generated seven-day link. Opening the link verifies its status and shows the group and invited email before sign-in. The recipient signs up or signs in, reviews the invitation, and selects **Accept invitation**. The invite token is preserved through Supabase email confirmation, and the API accepts it only when the authenticated email exactly matches the invited email. Acceptance inserts `group_members` and marks the invite accepted; it does not remove the user’s automatically-created personal household.

Invite links use `PUBLIC_APP_URL` when set. Configure the same public frontend origin for CORS in the deployed API environment:

```dotenv
PUBLIC_APP_URL=https://your-roommate-app.example
CORS_ORIGIN=https://your-roommate-app.example
```

If `PUBLIC_APP_URL` is unset, the link uses the app origin making the request. A browser opened at `localhost` can only produce a local-testing link; someone on another device needs a reachable deployment or LAN address. The Groups screen warns when the link is local. Add the public `/join/**` URL to Supabase Authentication → URL Configuration so signup and magic-link confirmation return to the invite. Creating an invite returns a copyable link; it does not send an email unless a mail delivery provider is configured separately. Re-inviting a still-pending email generates a fresh link and invalidates its earlier token.

The database object is `public.group_invites`, created by `supabase/migrations/20260830_group_invites.sql`. Tokens are stored only as SHA-256 hashes, pending invites are unique per group/email, and RLS allows invite visibility only to the sender or intended recipient. The backend exposes:

- `POST /api/groups/:groupId/invites` — create an invite (authenticated group member)
- `GET /api/invites/:token` — safe public preview
- `POST /api/invites/:token/accept` — accept (authenticated invited email)
- `POST /api/invites/:token/decline` — decline (authenticated invited email)

## Chore planner

The Chores page has a seven-day planner with a date picker for any future day. Choose a day, then **Plan a chore** to open the assignment form with that due date already selected. **Previously assigned** shows earlier chores for the selected roommate, including completed and overdue work. The planner uses the existing `chores` table and household membership; it needs no extra migration.

## Vercel deployment

The root `vercel.json` deploys the Vite frontend and Express API as two Vercel Services on one domain. The `/api/**` path reaches Express and other paths reach the frontend; the frontend service serves `index.html` for direct app and invite links. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ENABLED=true`, `AUTH_REQUIRED=true`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL=/api`, `PUBLIC_APP_URL`, and `CORS_ORIGIN` in the Vercel project. The service-role key stays server-side. Add the production `/join/**` redirect to Supabase Auth URL Configuration so email confirmation and magic-link flows return to the invitation.

Vercel invokes `/api/internal/jobs` daily at 00:00 UTC to post due recurring expenses and process reminders. Set a random `CRON_SECRET` in the production environment; requests without its bearer token return 401. Vercel Hobby scheduling can run within the selected hour, so due entries may post after midnight UTC. Email delivery also requires SMTP settings.

The migration is already applied to the linked Supabase project. In Supabase Authentication → URL Configuration, keep the local and production origins allowed, including `/join/**`. Configure Supabase Auth SMTP before production if invitation recipients should receive email automatically; the current product intentionally returns a copyable link so the flow works without coupling group membership to a third-party mail provider.
