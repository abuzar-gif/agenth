import { test, expect } from './fixtures';

test('premium dashboard, dual orbs, compact composer and text-only voice controls', async ({ page }) => {
  test.setTimeout(240_000);
  const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
  const email = `ui-orbs-${Date.now()}@example.test`;
  const password = 'UI-verification-only-8420';
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let ttsRequests = 0;
  page.on('request', request => { if (request.url().includes('/api/voice/synthesize')) ttsRequests += 1; });
  const registered = await page.request.post(`${origin}/api/register`, { headers: { origin }, data: { email, password, name: 'UI Verification' } });
  expect(registered.ok()).toBeTruthy();
  const csrf = await (await page.request.get(`${origin}/api/auth/csrf`)).json();
  const login = await page.request.post(`${origin}/api/auth/callback/credentials`, { headers: { origin, 'X-Auth-Return-Redirect': '1' }, form: { csrfToken: csrf.csrfToken, email, password, callbackUrl: `${origin}/dashboard` } });
  expect(login.ok()).toBeTruthy();
  const user = await (await page.request.get(`${origin}/api/auth/session`)).json();
  expect(user.user?.email).toBe(email);
  try {
    const profile = await page.request.put(`${origin}/api/profile`, { headers: { origin }, data: { language: 'en', timezone: 'Asia/Karachi', answers: { name: 'UI Verification' }, onboarded: true } });
    expect(profile.ok()).toBeTruthy();
    await page.goto(`${origin}/dashboard?tab=chat`);
    await expect(page.getByRole('heading', { name: 'How can I help you, UI?' })).toBeVisible();
    const measurements: unknown[] = [];
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const composer = page.locator('.premium-chat-composer');
      await expect(composer).toBeVisible();
      const layout = await composer.evaluate(element => {
        const rectangle = element.getBoundingClientRect();
        const controls = [...element.querySelectorAll('textarea, .composer-attach, .voice-composer, .composer-voice-mode, .composer-send')].map(control => { const rect = control.getBoundingClientRect(); return { name: control.className, center: rect.y + rect.height / 2 }; });
        return { width: rectangle.width, height: rectangle.height, center: rectangle.x + rectangle.width / 2, controls };
      });
      expect(layout.height).toBeGreaterThanOrEqual(64);
      expect(layout.height).toBeLessThanOrEqual(88);
      expect(Math.max(...layout.controls.map(control => control.center)) - Math.min(...layout.controls.map(control => control.center))).toBeLessThan(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      measurements.push({ viewport, ...layout });
      await page.screenshot({ path: `test-results/premium-chat-${viewport.width}.png`, animations: 'disabled' });
    }
    console.log('COMPOSER_MEASUREMENTS', JSON.stringify(measurements));
    await page.locator('#chat-input').fill('First line\nSecond line\nThird line\nFourth line');
    expect((await page.locator('#chat-input').boundingBox())!.height).toBeGreaterThan(60);
    await page.locator('#chat-input').fill('');
    await page.getByRole('button', { name: 'Open text-response Voice Mode', exact: true }).click();
    const voice = page.getByRole('dialog', { name: 'Speak naturally. Read the reply.' });
    await expect(voice).toBeVisible();
    await expect(voice.locator('canvas')).toBeVisible();
    await expect(voice.getByText('Listening to you', { exact: true })).toBeVisible();
    await expect(voice.getByRole('button', { name: 'Mute', exact: true })).toBeVisible();
    await voice.getByRole('button', { name: 'Mute', exact: true }).click();
    await expect(voice.getByRole('button', { name: 'Unmute', exact: true })).toBeVisible();
    await voice.getByRole('button', { name: 'Unmute', exact: true }).click();
    await page.screenshot({ path: 'test-results/premium-voice-mobile.png' });
    await voice.getByRole('button', { name: 'End', exact: true }).click();
    await expect(voice).toHaveCount(0);
    expect(ttsRequests).toBe(0);
    await page.setViewportSize({ width: 1440, height: 900 });
    const destinations = { home: 'Home', chief: 'Chief tasks', explore: 'Explore agents', apps: 'Connected apps', browser: 'Browser', history: 'Chat history', tasks: 'Tasks & history', schedules: 'Schedules', usage: 'Activity & usage', plans: 'Plans', settings: 'Settings', setup: 'Setup status', search: 'Search' };
    for (const [tab, label] of Object.entries(destinations)) {
      await page.locator('.premium-nav').getByRole('button', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`tab=${tab}`));
      await expect(page.locator('.premium-page-content')).toBeVisible();
      await expect(page.locator('.premium-loading')).toHaveCount(0);
      if (tab === 'home') await expect(page.locator('.home-agent-tile').first()).toBeVisible();
      if (tab === 'apps') await expect(page.locator('.connector-card')).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (['home', 'chief', 'explore', 'apps', 'browser'].includes(tab)) await page.screenshot({ path: `test-results/premium-${tab}.png`, fullPage: true, animations: 'disabled' });
      if (tab === 'apps') { await expect(page.locator('.whatsapp-linked-card .tool-icon-whatsapp')).toBeVisible(); await expect(page.locator('.tool-icon-gmail')).toBeVisible(); await expect(page.locator('.premium-banner--error')).toHaveCount(0); }
    }
    await page.keyboard.press('Control+k');
    await expect(page).toHaveURL(/tab=search/);
    await page.locator('.premium-nav').getByRole('button', { name: 'Chat', exact: true }).click();
    await page.locator('#chat-input').fill('Reply with one short sentence confirming this chat is working.');
    const sending = page.waitForResponse(response => /\/api\/conversations\/[^/]+\/messages$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    const actual = await sending;
    console.log('LIVE_CHAT_HTTP', actual.status());
    await expect(page.getByRole('button', { name: 'Stop generating', exact: true })).toHaveCount(0, { timeout: 120_000 });
    const failure = await page.locator('.premium-inline-error').count() ? await page.locator('.premium-inline-error').innerText() : '';
    console.log('LIVE_CHAT_RESULT', failure || await page.locator('.premium-chat-message--assistant .message-text').last().innerText());
    expect(failure).toBeFalsy();
    await expect(page.locator('.premium-chat-message--assistant .message-text').last()).not.toBeEmpty();
    await page.screenshot({ path: 'test-results/premium-live-chat.png', animations: 'disabled' });
    expect(errors).toEqual([]);
  } finally {
    // This request is authenticated as this test's isolated account only.
    const session = await (await page.request.get(`${origin}/api/auth/session`)).json();
    if (session.user?.email === email) await page.request.delete(`${origin}/api/account`, { headers: { origin }, data: { confirmation: 'DELETE MY ACCOUNT' } });
  }
});
