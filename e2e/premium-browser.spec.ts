import { test, expect } from './fixtures';

test('real browser worker navigation and captured preview', async ({ page }) => {
  test.setTimeout(150_000);
  const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
  const email = `ui-browser-${Date.now()}@example.test`;
  const password = 'Browser-test-only-password-8491';
  expect((await page.request.post(`${origin}/api/register`, { headers: { origin }, data: { email, password, name: 'Browser UI QA' } })).ok()).toBeTruthy();
  const csrf = await (await page.request.get(`${origin}/api/auth/csrf`)).json();
  await page.request.post(`${origin}/api/auth/callback/credentials`, { headers: { origin, 'X-Auth-Return-Redirect': '1' }, form: { csrfToken: csrf.csrfToken, email, password, callbackUrl: `${origin}/dashboard` } });
  expect((await (await page.request.get(`${origin}/api/auth/session`)).json()).user?.email).toBe(email);
  let id = '';
  try {
    await page.request.put(`${origin}/api/profile`, { headers: { origin }, data: { language: 'en', timezone: 'Asia/Karachi', answers: { name: 'Browser UI QA' }, onboarded: true } });
    const created = await page.request.post(`${origin}/api/browser`, { headers: { origin }, data: { action: 'navigate', url: 'https://example.com' } });
    expect(created.status()).toBe(201);
    id = (await created.json()).id;
    let state = '';
    await expect.poll(async () => {
      const tasks = await (await page.request.get(`${origin}/api/tasks`)).json();
      const task = tasks.find((item: { id: string }) => item.id === id);
      state = task?.status || 'missing';
      if (state === 'failed') throw new Error(task.error || 'Browser worker failed');
      return state;
    }, { timeout: 60_000, intervals: [1000, 2000, 3000] }).toBe('completed');
    const snapshot = await (await page.request.get(`${origin}/api/browser`)).json();
    expect(snapshot.url).toMatch(/^https:\/\/example.com\/?$/);
    expect((await page.request.get(`${origin}/api/browser?image=1`)).headers()['content-type']).toBe('image/png');
    await page.goto(`${origin}/dashboard?tab=browser`);
    await expect(page.locator('.browser-preview img')).toBeVisible();
    await page.screenshot({ path: 'test-results/premium-browser-live.png' });
    console.log('BROWSER_WORKER_RESULT', state, snapshot.url);
  } finally {
    if (id) await page.request.post(`${origin}/api/tasks/${id}`, { headers: { origin }, data: { action: 'cancel' }, timeout: 10_000 }).catch(() => {});
    await page.request.delete(`${origin}/api/account`, { headers: { origin }, data: { confirmation: 'DELETE MY ACCOUNT' }, timeout: 15_000 }).catch(() => {});
  }
});
