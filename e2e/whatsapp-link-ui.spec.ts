import { test, expect } from './fixtures';

// Network fixtures exercise UI races only; no WhatsApp connection or send occurs.
test('WhatsApp linking keeps pending state during POST and clears recovered poll failures', async ({ page }) => {
  test.setTimeout(90_000);
  const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
  const email = `link-ui-${Date.now()}@example.test`;
  const password = 'Link-UI-test-only-4928';
  const headers = { origin };
  expect((await page.request.post(`${origin}/api/register`, { headers, data: { email, password, name: 'Link UI QA' } })).ok()).toBeTruthy();
  const csrf = await (await page.request.get(`${origin}/api/auth/csrf`)).json();
  await page.request.post(`${origin}/api/auth/callback/credentials`, { headers: { ...headers, 'X-Auth-Return-Redirect': '1' }, form: { csrfToken: csrf.csrfToken, email, password, callbackUrl: `${origin}/dashboard` } });
  expect((await (await page.request.get(`${origin}/api/auth/session`)).json()).user?.email).toBe(email);
  try {
    await page.request.put(`${origin}/api/profile`, { headers, data: { language: 'en', timezone: 'Asia/Karachi', answers: { name: 'Link UI QA' }, onboarded: true } });
    let mutationStarted = false;
    let mutationFinished = false;
    let releaseMutation: (() => void) | undefined;
    const pendingMutation = new Promise<void>(resolve => { releaseMutation = resolve; });
    let failNextPoll = false;
    await page.route('**/api/whatsapp/linked', async route => {
      if (route.request().method() === 'POST') {
        mutationStarted = true;
        await pendingMutation;
        mutationFinished = true;
        await route.fulfill({ json: { state: 'connecting', mode: 'qr' }, status: 202 });
        return;
      }
      if (failNextPoll) {
        failNextPoll = false;
        await route.fulfill({ json: { error: 'Temporary status check failed' }, status: 503 });
        return;
      }
      await route.fulfill({ json: mutationFinished ? { state: 'qr', mode: 'qr', qr: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=' } : { state: 'reconnect_required', mode: 'qr', error: 'Old closed connection' } });
    });
    await page.goto(`${origin}/dashboard?tab=apps`);
    await page.getByRole('button', { name: 'Reconnect WhatsApp', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Connect WhatsApp', exact: true });
    await dialog.getByLabel('This is my account').check();
    await dialog.getByRole('button', { name: 'Choose linking method', exact: true }).click();
    await dialog.getByRole('button', { name: 'Refresh QR', exact: true }).click();
    await expect.poll(() => mutationStarted).toBe(true);
    await expect(dialog.getByText('Preparing your WhatsApp code…', { exact: true })).toBeVisible();
    // Allow the stage-change effect to run while the mutation remains in flight.
    await page.waitForTimeout(500);
    await expect(dialog.getByText('Old closed connection', { exact: true })).toHaveCount(0);
    await expect(dialog.getByText('Preparing your WhatsApp code…', { exact: true })).toBeVisible();
    releaseMutation?.();
    await expect(dialog.getByAltText('WhatsApp linked-device QR code')).toBeVisible();
    failNextPoll = true;
    await expect(dialog.getByText('Temporary status check failed', { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByText('Temporary status check failed', { exact: true })).toHaveCount(0, { timeout: 20_000 });
    await expect(dialog.getByAltText('WhatsApp linked-device QR code')).toBeVisible();
  } finally {
    await page.request.delete(`${origin}/api/account`, { headers, data: { confirmation: 'DELETE MY ACCOUNT' }, timeout: 15_000 }).catch(() => {});
  }
});
