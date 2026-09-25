# RoomMate release-candidate implementation report

Last updated: 2026-09-25
Scope: every actionable item from the repository audit, including security, tenant isolation, financial correctness, adapter parity, product completeness, accessibility, navigation, performance, and automated verification.

## Outcome

The verified application defects from the audit have been implemented or, where the advertised product did not exist, the interface and marketing have been changed to describe the product honestly. The repository now passes its combined backend/frontend test command, production frontend build, and browser tests. Personal income is tracked by member, while only explicitly shared household income enters combined totals. Shared expenses remain group-scoped and allocate cost through payers and shares.

The six pending Supabase migrations were applied to the linked CashSplit project on 2026-09-25. The frontend and API were deployed to [RoomMate on Vercel](https://roommate-app-liard.vercel.app) the same day. The public `/join/...` and `/app/chores` deep links return the frontend, and `/api/health` reports a connected Supabase database. Live two-user invite acceptance remains to be verified after the production Supabase Auth redirect allowlist is configured.

## Verification

| Check | Result |
|---|---|
| `npm test` | Passed: 32 backend tests and 5 frontend tests (2026-09-25) |
| `npm run build` | Passed |
| Production chunking | Passed: route chunks emitted; no chunk exceeds Vite's 500 kB warning threshold |
| Largest observed app/vendor chunks | App entry about 370 kB; Recharts about 350 kB |
| Backend syntax checks | Passed for the changed server/repository files |
| `git diff --check` | Passed (2026-09-25) |
| Linked Supabase read checks | Passed for group/member/expense/income/chore/shopping/activity/balance/summary queries; new income and budget columns and recurring series table verified after deployment |
| Income/shared-expense/budget migration tests | Passed in isolated PGlite Postgres: legacy income backfill, household income separation, owner constraint, group requirement for new expenses, repeat income application, budget default and positive-value constraint |
| Supabase migration apply | Passed: six pending migrations applied in order; follow-up `db push --dry-run` reports the remote database is up to date |
| `npm --prefix frontend run test:e2e` | Passed: 9 Playwright flows, including corrupted group ID recovery, Android install guidance, dark Groups/sidebar styling, budget editing, expense repeat default, invite creation and acceptance, wrong-account handling, and planning chores ahead with prior assignments (2026-09-25) |
| PWA artifact check | Passed: production bundle contains manifest, service worker, and 192/512/maskable icons |
| Vercel production smoke check | Passed: frontend deep links return 200; `/api/health` returns 200 with Supabase connected |

## Implemented work

### 1. Authentication and tenant isolation

- Production and all Supabase-backed runs now fail closed: authentication is required even if an environment flag is omitted.
- Anonymous Supabase requests can no longer impersonate a profile named `Krishna`. The seeded demo identity exists only in memory/test mode.
- Every group-scoped Supabase read now resolves the group for the authenticated actor and verifies membership before returning data.
- The legacy `g1` alias resolves through the actor's own memberships rather than the globally oldest group.
- Expense payers, expense participants, settlement members, and chore assignees are checked against the target household.
- Direct member insertion has been disabled; membership must go through the email-bound invitation flow.
- The health endpoint now returns HTTP 503 and `ok: false` when configured Supabase persistence is unavailable.

### 2. Privileged database functions

Migration `supabase/migrations/20260924_security_hardening.sql`:

- revokes `EXECUTE` on the two `SECURITY DEFINER` expense bundle functions from `PUBLIC`, `anon`, and `authenticated`;
- grants those RPCs only to `service_role`;
- prevents browser roles from invoking the auth bootstrap function directly; and
- adds a profile preference column for a future notification delivery implementation.

The API performs actor and household checks before its service-role client calls these functions. This migration is applied to the linked project.

### 3. Financial correctness and API contracts

- Supabase settlements now subtract from the correct pairwise debt instead of passing a negative amount to an add-only helper.
- Supabase simplified balances now run the actual debt simplifier.
- Expense, income, member, comment, and activity responses are normalized to the camelCase DTOs consumed by the frontend.
- The current profile is marked with `you: true` using the authenticated user ID.
- Expense mutations refresh expenses, balances, reports, activity, and group overview through one financial refresh path.
- Income mutations refresh reports and overview totals. Household entries have no individual owner; personal entries have one household member owner.
- New and existing shared expenses require a group ID under the applied and validated constraint. The linked project had zero orphaned expense rows at validation.
- Rich expense editing reconstructs and preserves payers, reimbursement state, itemized allocations, and `PERCENT`, `SHARES`, `EXACT`, and `ADJUSTMENT` values. When a total changes, stored values are proportionally scaled and the rounding remainder is corrected.
- Expense validation now uses a real Zod schema instead of accepting an unrestricted object.

### 4. Memory-adapter parity

- Income, chores, shopping, activity, members, and reports are now scoped to the selected group.
- Newly created records retain their group ID.
- Income edit/delete and shopping edit work instead of returning HTTP 501.
- Expense participants and payers are rejected when they do not belong to the target group.
- Completing a recurring chore creates the next due occurrence and prevents duplicate generation.
- Tests cover cross-group income isolation, income editing/deletion, shopping editing/isolation, and recurring chore generation.

### 5. Group and settings behavior

- A stale stored group ID falls back to the first authorized group.
- Users with no households receive a first-household creation state instead of an endless loader.
- Household rename is persisted through the group API and reflected in the client state.
- The profile card opens Settings and is now a real button.
- The misleading “Household admin” label was replaced with “Your account”; there is no role model that would justify the former label.
- Supported currencies have explicit selectors and independent ledgers; currency conversion is not offered.
- Notification preferences persist, with outbox and SMTP worker code. Delivery remains disabled until SMTP is configured and verified.

### 6. Honest product surface

- Pricing is described as a free public beta.
- Plus and Properties are explicitly labeled as roadmap concepts; fake prices, trial promises, history limits, and unavailable property administration claims were removed.
- Minimal Privacy and Terms routes now exist and are linked from authentication and footer surfaces. They still require legal review before a public launch.
- Recurring chores now have real next-occurrence behavior rather than being storage-only.

### 7. Navigation, loading, and performance

- Authenticated sections have canonical `/app/:page` deep links.
- In-app navigation updates browser history, supports back/forward, and restores the page on refresh.
- App pages, public pages, authentication pages, legal pages, and the motion lab are lazy-loaded behind Suspense boundaries.
- The former single 1.04 MB production JavaScript chunk has been split into route and vendor chunks below the current warning threshold.

### 8. Accessibility and touch UX

- Sidebar, More menu, Add menu, profile, calendar, and view-all actions use semantic buttons/navigation.
- Dialogs expose names and modal semantics, trap focus, close on Escape, and restore focus.
- Form labels are associated with inputs; switches expose accessible names and checked state.
- Icon-only actions have labels, and toasts announce through a live status region.
- Edit/delete actions no longer depend on hover and use touch-friendly target sizes.
- The bottom navigation accounts for safe-area insets.
- Report charts identify rupee units and include a screen-reader table alternative.
- Forgot/reset password forms have visible labels, autocomplete metadata, and accessible error announcements.

### 9. Idempotency hardening

- The memory idempotency cache now has a 24-hour TTL and a 2,000-entry bound.
- Reusing an idempotency key for a different request body returns a conflict instead of replaying an unrelated response.

## Resolution ledger

| Original finding | Status |
|---|---|
| Auth could fail open / demo impersonation | Fixed |
| Service-role cross-tenant reads | Fixed in application repository; live integration validation pending |
| Privileged expense RPC grants | Fixed in migration; deployed to linked project |
| Settlements did not reduce pairwise balances | Fixed |
| Balances stale after expense changes | Fixed |
| Supabase DTO mismatch | Fixed |
| Rich expense edits lost split data | Fixed |
| Referenced users not household-validated | Fixed |
| Memory multi-group leakage | Fixed |
| Memory edit actions returned 501 | Fixed |
| Stale/no household trapped the UI | Fixed |
| Household rename was fake | Fixed |
| Notification controls were fake | Replaced with persisted preferences and outbox worker; SMTP setup and delivery verification pending |
| Recurring chores did not recur | Fixed |
| Billing/property claims exceeded behavior | Corrected and labeled roadmap |
| Missing legal routes | Added; legal review pending |
| No app deep links/history | Fixed |
| Keyboard/dialog/touch accessibility defects | Fixed for audited surfaces |
| Single oversized production bundle | Fixed with route-level splitting |
| No frontend tests | Unit tests and nine Playwright household flows added; live auth/invite/settlement E2E expansion pending |

## Remaining deployment and validation work

These items need external configuration, legal input, or a purpose-built test environment:

1. The linked project now has `20260924_security_hardening.sql`, `20260925_household_workflows.sql`, `20260925170000_separate_personal_income.sql`, `20260925180000_require_group_for_shared_expenses.sql`, `20260925190000_monthly_group_budget.sql`, and `20260925193000_validate_shared_expense_group.sql`. Validate policies, storage authorization, RPC grants, and data shape with authenticated users before production sign-off.
2. Run two-user/two-household integration checks for tenant isolation, search, recurrence, receipt access, settings, CSV reconciliation and currency-specific settlements. Post-migration checks so far were read-only.
3. Configure SMTP and run an end-to-end delivery check for outbox retries, recipient preferences and duplicate prevention. Provider details are pending.
4. Add live browser acceptance coverage for auth callbacks, invite expiry/wrong-email behavior, and settle/reload money flows; current Playwright coverage is 9 flows with mocked invite creation and acceptance.
5. Obtain legal review of the Privacy and Terms content.
6. OCR, FX conversion, offline sync, private friend ledgers, payment initiation, bank import, and localization remain future product work. Paid plans/property administration still require real billing and entitlement enforcement before being advertised as available.

## Release assessment

The audited repository-level blockers and the implemented comparison items are addressed in code, and the linked database migrations are applied. Live Supabase isolation/ledger validation and SMTP delivery verification remain release gates.

## Splitwise feature comparison and implementation path (2026-09-25)

This is a comparison of **published Splitwise features** with the **current RoomMate repository**, not a claim about either service's availability in every region or plan. Splitwise's [feature list](https://www.splitwise.com/), [Pro guide](https://kb.splitwise.com/pro/what-is-splitwise-pro), and [split options guide](https://kb.splitwise.com/balances-and-expenses/what-are-different-ways-i-can-split-an-expense) were checked on 2026-09-25. RoomMate already has groups and email-bound invitations, equal/exact/percentage/shares/adjustment/itemized splits, multiple payers, expense editing and comments, recorded settlements, debt simplification calculations, category reports, and recurring **chores**. Since that comparison, the implementation below also adds expense search, CSV export, saved group split defaults, configurable debt simplification, recurring expense series, receipt file attachments, per-currency balances, and notification preferences/outbox delivery code. Receipt OCR is still not implemented.

### Implementation status (2026-09-25)

| Feature | Status in this repository | Remaining work / operating requirement |
|---|---|---|
| Expense search and filters | Implemented: text, category, date, payer, participant, amount and pagination; frontend controls use URL state. | Test indexed query plans and tenant isolation against the target Supabase project. |
| CSV ledger export | Implemented: authenticated group export includes expense splits and settlements, streams bounded batches, and escapes spreadsheet formulas. | Validate exported totals against a live Supabase group after migration. |
| Saved split defaults | Implemented: validated group setting preloads the expense form and can be overridden per expense. | Verify saved settings with two authenticated users; stale participants are rejected. |
| Debt simplification preference | Implemented: persisted setting controls the balances view and suggested settlements. | Verify settings persistence with two authenticated users on Supabase. |
| Recurring expenses | Implemented: series, time zones, repeat schedules, future-template edits, pause/resume and duplicate protection; Supabase posting uses a locked RPC. | The in-process worker runs with the API process; production needs a continuously running worker or scheduled `npm --prefix backend run jobs`. Memory mode is demo-only and not durable across restarts. Validate month-end, retry and departed-member cases in the test project. |
| Receipt attachments | Implemented: authenticated private upload, download and delete with size/type checks. Supabase storage uses a private bucket; memory mode is capped and temporary. | Verify storage policies in Supabase. OCR is not implemented and needs an OCR provider plus a review-before-save flow. |
| Multiple currencies | Implemented: INR, USD, EUR, GBP, AUD, CAD and SGD are independently balanced and settled; currency selection and formatting are present. | No foreign-exchange conversion is implemented. Add a rate source and historical rate/rounding policy before conversion. |
| Email notifications | Preferences, transactional outbox, retry/claim worker and SMTP delivery code are implemented. | Configure SMTP credentials/from address. Delivery has not been verified because provider details are pending. |
| Offline mode, private friend ledgers, payment initiation, card/bank import, broad localization | Not implemented. | Require product scope decisions; payments/import also require region-appropriate providers and consent/reconciliation flows. |

The database migrations are **deployed to the linked CashSplit project**. A follow-up dry run reports no pending migrations, and read checks confirm the income ownership columns, monthly budget column, recurring series table, and household summary path. Application redeployment and live multi-user acceptance tests are separate steps. Payment, bank import, OCR, and SMTP provider details are pending.

### Additional requested changes

- RoomMate is now an installable PWA with Android Chrome install guidance, iOS Add to Home Screen guidance, app icons, a standalone manifest, and a service worker. The worker caches only the shell/static assets and never stores `/api` responses or financial data. Chrome's native install prompt remains enabled. Android Chrome may package an installed PWA as a WebAPK; generating a separately downloadable signed APK still requires Android/TWA signing and domain association setup.
- Income now has explicit `PERSONAL` and `HOUSEHOLD` ownership. Personal entries are assigned to a member and shown as individual totals on the Income page; only shared household entries contribute to Home, reports, and combined group income. The applied migration classified legacy Supabase rows as personal and used `added_by` as the best available owner because the old schema did not store a separate owner. A household member should review any legacy entry entered on someone else's behalf.
- The shared expense migration requires a group for every expense, including legacy rows; a final validation migration succeeded after confirming no orphaned rows. The existing expense payer/share tables continue to define household splits; income does not enter debt calculations.
- Dark theme now uses theme-aware surfaces for the sidebar invite card, Groups selection and guidance, status cards, form callouts, and toast. Primary buttons use dark text on the dark theme's bright green accent. A browser test checks the Groups/sidebar colors.
- Home now lets a household member edit the monthly INR budget. The value is saved per group; the budget card counts only expenses dated in the current month. The applied Supabase budget migration added `groups.monthly_budget_minor`; memory mode also supports editing. Add Expense now shows **None** as the default repeat option, which creates a one-time expense.
- Invite links now use the deployed `PUBLIC_APP_URL` or the trusted app origin instead of always using the first CORS origin. A localhost link is labeled as local-only, pending invites can be regenerated, signup/sign-in keeps the invite token, and accepting a link switches to the newly joined group. The public Vercel URL is configured; the Supabase Auth redirect allowlist still needs confirmation for email and OAuth callbacks. Email delivery remains a separate SMTP setup.
- The Chores page now plans today's or future assignments from a seven-day strip or date picker and shows earlier assignments per roommate. Supabase chore responses now include the assignee name and derive overdue/upcoming state from the due date. The existing chores table supports this without a migration.

### Missing or partial features

| Priority | Splitwise feature | RoomMate evidence and gap | Implementation path |
|---|---|---|---|
| P1 | [Recurring expenses](https://kb.splitwise.com/balances-and-expenses/how-can-i-manage-recurring-expenses) | Implemented in code: recurring series, editing future template, pause/resume and protected occurrence posting. | Validate scheduled retries, month ends, and member departure in a disposable Supabase project. |
| P1 | [Expense search](https://kb.splitwise.com/pro/what-is-splitwise-pro) and filters | Implemented: group-scoped query and URL-backed text/date/category/payer/participant/amount filters. | Validate indexed query performance and cross-group isolation on Supabase. |
| P1 | [Group/friend spreadsheet export](https://kb.splitwise.com/account-issues/how-do-i-export-my-splitwise-data) | Implemented: authenticated household CSV export with bounded streaming and formula escaping. | Reconcile against live ledger balances after database setup. |
| P1 | [Email notifications and reminders](https://kb.splitwise.com/account-issues/why-am-i-not-receiving-email-notifications) | Preference UI, outbox, and retryable SMTP worker implemented. | Configure SMTP; verify delivery, retry and preference behavior. |
| P1 | [Default group splits](https://kb.splitwise.com/pro/what-is-splitwise-pro) | Implemented: group setting validates member IDs and preloads a saved split in the expense form. | Verify persistence and stale-member behavior on Supabase. |
| P1 | [Automatic group debt simplification](https://kb.splitwise.com/balances-and-expenses/what-is-simplify-debts) | Implemented: saved preference drives the balances view and settlement suggestions. | Verify after group switch/reload on Supabase. |
| P2 | [Receipt scanning](https://kb.splitwise.com/pro/what-is-splitwise-pro) and attachments | Private receipt file attachment is implemented; OCR is not. | Select OCR provider; create a draft extraction/review flow and require user confirmation before applying line items. |
| P2 | [Multiple currencies and conversion](https://kb.splitwise.com/pro/what-is-splitwise-pro) | Separate balances and settlements are implemented for seven currencies; no conversion exists. | Add an FX rate provider, historical rate and rounding policy, preserving original amounts. |
| P2 | [Offline mode](https://www.splitwise.com/) | PWA installation and static shell caching are implemented. Financial data and mutations remain online-only; no local queue or conflict handling. | If offline ledger use is needed, design encrypted snapshots and a conflict-aware mutation queue separately. Never cache API responses by default. |
| P2 | [Expenses with a friend outside a group](https://kb.splitwise.com/getting-started/how-do-i-use-splitwise) | Every RoomMate expense belongs to a household; a two-person household is possible, but no private friendship ledger exists. | Decide whether this fits the shared-household product. If yes, add a distinct `friendship` scope and membership policy rather than overloading the `g1` group alias; reuse split and balance services with scope-aware authorization. |
| P3 | [In-app transfers/payment integrations](https://kb.splitwise.com/payment-integrations/how-do-i-send-money-to-someone-on-splitwise) | RoomMate records an external settlement but cannot initiate or verify money movement. Splitwise's direct payment options are region-dependent. | Select a provider and target region first. Add payment intents, webhooks, reconciliation, failure/refund states, and audit records; post the settlement only after verified completion. Keep manual recording available. |
| P3 | [Card transaction import](https://kb.splitwise.com/pro/what-is-splitwise-pro) | No bank connection or transaction feed. Splitwise says its import is country-limited. | Pursue only after validating user demand and provider availability. Use consent-based aggregation, short-lived tokens, duplicate detection, and a review screen; imported transactions remain drafts until a user selects a group and split. |
| P3 | [Broad language support](https://www.splitwise.com/) | UI copy and locale formatting are largely English/INR-specific. | Extract strings, add locale-aware dates/amounts and translation files, then test layouts and accessibility in target languages. Choose languages from actual RoomMate users rather than copying Splitwise's count. |

**Priority rationale:** recurring bills, finding old entries, data export, reliable reminders, and saved split rules address frequent household use and can build on existing data and UI. Receipt OCR, foreign exchange, offline sync, and payments introduce separate reliability or provider obligations. P1/P2/P3 are proposed order, not estimates or commitments.

### Delivery sequence and acceptance gates

1. **Validate database-backed work:** the pending migrations are applied to the linked project and `expenses_group_required_check` is validated. Test tenant isolation, recurrence retries/month ends, receipt authorization, and CSV/balance reconciliation. Review legacy income owners where entries may have been entered on another person's behalf.
2. **Configure delivery:** set SMTP credentials and sender, run the jobs worker, then verify outbox delivery, retry and preferences.
3. **Complete browser acceptance:** add auth/invite and settlement reload flows to the existing Playwright suite and run on desktop and mobile.
4. **Choose future integrations deliberately:** OCR, foreign exchange, payments and bank import need provider/region choices and explicit data/reconciliation behavior. Offline sync, friend-only ledgers and localization need product scope decisions.

For every phase, keep memory-mode behavior explicit, add API tests for authorization and money totals, and add browser tests for the complete add/edit/settle/reload path. A schema column or marketing mention alone does not count as a shipped feature.
