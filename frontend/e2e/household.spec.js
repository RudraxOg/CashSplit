import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rm-active-group', '[object Object]'));
  await page.addInitScript(() => localStorage.setItem('sb-roommate-test-auth-token', JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user: { id: 'krishna', email: 'krishna@example.test', user_metadata: { name: 'Krishna' } } })));
  await page.route('https://roommate-test.supabase.co/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'krishna', email: 'krishna@example.test' }) }));
});

test('expense create, search, edit, export and delete survive reload', async ({ page }) => {
  const title = `Browser groceries ${Date.now()}`;
  await page.goto('/app/expenses');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rm-active-group'))).toBe('g1');
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('What was it for?').fill(title);
  await dialog.getByLabel('Total amount').fill('100');
  await dialog.getByRole('button', { name: 'Save expense', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search expenses' }).fill(title);
  await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('searchbox')).toHaveValue(title);
  await page.getByRole('button', { name: new RegExp(title) }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Amount').fill('120');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export household CSV' }).click();
  expect((await downloaded).suggestedFilename()).toBe('roommate-ledger.csv');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('button', { name: new RegExp(title) })).toHaveCount(0);
});

test('group defaults and simplification persist, and keyboard dialog restores focus', async ({ page }) => {
  await page.goto('/app/settings');
  await page.getByLabel('Split rule').selectOption('SHARES');
  await page.getByRole('button', { name: 'Save default split' }).click();
  await page.reload();
  await expect(page.getByLabel('Split rule')).toHaveValue('SHARES');
  await page.goto('/app/balances');
  const toggle = page.getByRole('switch'); const before = await toggle.getAttribute('aria-checked');
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
  await page.reload(); await expect(toggle).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
  await page.goto('/app/expenses');
  const add = page.getByRole('button', { name: 'Add expense', exact: true }); await add.click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /By shares/ })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(add).toBeFocused();
});

test('mobile navigation reaches settings without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/expenses');
  await expect(page.getByRole('searchbox')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('Android install guidance remains available without suppressing the browser banner', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36' }));
  await page.goto('/signin');
  await page.getByRole('button', { name: 'How to install' }).click();
  await expect(page.getByText('In Chrome, open the ⋮ menu')).toBeVisible();
});

test('dark theme keeps group selection, invite card and primary actions readable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rm-theme', 'dark'));
  await page.goto('/app/groups');
  await expect(page.getByText('Invite your roommates')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your groups' })).toBeVisible();
  const colors = await page.evaluate(() => {
    const invite = [...document.querySelectorAll('p')].find((element) => element.textContent === 'Invite your roommates')?.parentElement;
    const selected = document.querySelector('button[style*="background: var(--selected-surface)"]');
    const button = [...document.querySelectorAll('button')].find((element) => element.textContent.trim() === 'Invite Now');
    return {
      theme: document.documentElement.dataset.theme,
      invite: getComputedStyle(invite).backgroundColor,
      selected: getComputedStyle(selected).backgroundColor,
      buttonBackground: getComputedStyle(button).backgroundColor,
      buttonText: getComputedStyle(button).color,
    };
  });
  expect(colors).toEqual({
    theme: 'dark', invite: 'rgb(30, 48, 38)', selected: 'rgb(30, 48, 38)',
    buttonBackground: 'rgb(46, 217, 163)', buttonText: 'rgb(9, 37, 27)',
  });
});

test('monthly budget can be edited and expense repeat defaults to None', async ({ page }) => {
  await page.goto('/app/home');
  await page.getByRole('button', { name: 'Edit monthly budget' }).click();
  await page.getByLabel('Monthly budget (₹)').fill('45000');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('of ₹45,000')).toBeVisible();
  await page.reload();
  await expect(page.getByText('of ₹45,000')).toBeVisible();
  await page.goto('/app/expenses');
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  const repeat = page.getByRole('dialog').getByLabel('Repeat');
  await expect(repeat).toHaveValue('');
  await expect(repeat.locator('option:checked')).toHaveText('None');
});

test('invite creation uses the app URL and acceptance opens the joined group', async ({ page }) => {
  let accepted = false;
  await page.route('**/api/groups/g1/invites', (route) => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ invitePath: '/join/test-token', inviteUrl: 'http://localhost:5173/join/test-token' }) }));
  await page.route('**/api/invites/test-token/accept', (route) => { accepted = true; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ groupId: 'g2', status: 'accepted' }) }); });
  await page.route('**/api/invites/test-token', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ groupId: 'g2', groupName: 'New Household', invitedEmail: 'krishna@example.test', status: accepted ? 'accepted' : 'pending' }) }));
  await page.goto('/app/groups');
  await page.getByLabel('Roommate email').fill('krishna@example.test');
  await page.getByRole('button', { name: 'Invite', exact: true }).click();
  await expect(page.getByLabel('Invitation link')).toHaveValue('http://127.0.0.1:5199/join/test-token');
  await expect(page.getByText(/localhost link only opens on this computer/)).toBeVisible();
  await page.goto('/join/test-token');
  await expect(page.getByText('Invitation verified')).toBeVisible();
  await expect(page.getByText('New Household · krishna@example.test')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'You’re in.' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(page.getByRole('heading', { name: 'You’re in.' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rm-active-group'))).toBe('g2');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'You’re in.' })).toBeVisible();
});

test('pasted invite links show verification on auth pages and password visibility works', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/invites/verified-token', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ groupId: 'g2', groupName: 'Garden Flat', invitedEmail: 'newroommate@example.test', status: 'pending' }) }));
  await page.goto('/join/verified-token');
  await expect(page.getByText('Invitation verified')).toBeVisible();
  await expect(page.getByText('Garden Flat · newroommate@example.test')).toBeVisible();
  await page.getByRole('link', { name: 'Sign in to join' }).click();
  await expect(page.getByLabel('Email')).toHaveValue('newroommate@example.test');
  await page.getByLabel('Password', { exact: true }).fill('example-password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page.getByText('Invitation verified')).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('newroommate@example.test');
  await expect(page.getByLabel('Email')).toHaveAttribute('readonly', '');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.evaluate(() => localStorage.setItem('rm-theme', 'dark'));
  await page.reload();
  await expect(page.getByText('Invitation verified')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  expect(await page.evaluate(() => ({ card: getComputedStyle(document.querySelector('.rm-auth-card')).backgroundColor, text: getComputedStyle(document.querySelector('.rm-auth-card h1')).color, button: getComputedStyle(document.querySelector('.rm-auth-primary-btn')).color }))).toEqual({ card: 'rgb(23, 30, 26)', text: 'rgb(240, 243, 241)', button: 'rgb(9, 37, 27)' });
  expect(pageErrors).toEqual([]);
  await context.close();
});

test('invalid invite links give a clear error instead of a verified claim', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route('**/api/invites/invalid-token', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Invitation not found' }) }));
  await page.goto('/join/invalid-token');
  await expect(page.getByRole('heading', { name: 'Invitation unavailable' })).toBeVisible();
  await page.goto('/signup?invite=invalid-token');
  await expect(page.getByRole('alert')).toContainText('Invitation not found');
  await expect(page.getByText('Invitation verified')).toHaveCount(0);
  await context.close();
});

test('email confirmation requires a verified session before continuing', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/verify-email');
  await page.getByRole('button', { name: 'Check confirmation' }).click();
  await expect(page.getByRole('alert')).toContainText('Open the confirmation link');
  await expect(page).toHaveURL(/\/verify-email$/);
  await context.close();
});

test('an invitation opened with another account offers account switching', async ({ page }) => {
  await page.route('**/api/invites/other-token', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ groupId: 'g2', groupName: 'New Household', invitedEmail: 'another@example.test', status: 'pending' }) }));
  await page.goto('/join/other-token');
  await expect(page.getByRole('heading', { name: 'Use the invited account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out and switch account' })).toBeVisible();
});

test('chores can be planned ahead and earlier assignments stay visible by member', async ({ page, request }) => {
  const future = new Date(); future.setDate(future.getDate() + 3);
  const past = new Date(); past.setDate(past.getDate() - 2);
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const futureName = `Plan ahead ${Date.now()}`;
  const pastName = `Earlier assignment ${Date.now()}`;
  const createdPast = await request.post('http://127.0.0.1:4399/api/chores', { data: { groupId: 'g1', name: pastName, assignedTo: 'Krishna', dueDate: iso(past) } });
  expect(createdPast.ok()).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/chores');
  await expect(page.getByRole('heading', { name: "Plan today's chores" })).toBeVisible();
  await page.getByLabel('Jump to date').fill(iso(future));
  await page.getByRole('button', { name: 'Add chore for this day' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Due date')).toHaveValue(iso(future));
  await dialog.getByLabel('Chore name').fill(futureName);
  await dialog.getByLabel('Time of day').selectOption('timed');
  await dialog.getByLabel('Start time').fill('10:15');
  await dialog.getByLabel('Duration (minutes)').fill('45');
  await dialog.getByRole('button', { name: 'Add Chore' }).click();
  await expect(page.getByText(futureName).first()).toBeVisible();
  await expect(page.getByLabel('Timed chores').getByText('10:15 AM – 11:00 AM · 45 min')).toBeVisible();
  const history = page.getByRole('heading', { name: 'Previously assigned' }).locator('xpath=../..');
  await expect(history.getByText(pastName)).toBeVisible();
  await page.getByLabel('Timed chores').getByRole('button', { name: 'Edit time or chore' }).click();
  const editDialog = page.getByRole('dialog');
  await expect(editDialog.getByLabel('Time of day')).toHaveValue('timed');
  await editDialog.getByLabel('Time of day').selectOption('anytime');
  await editDialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Anytime', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.reload();
  await expect(page.getByText(futureName).first()).toBeVisible();
  await expect(history.getByText(pastName)).toBeVisible();
});
