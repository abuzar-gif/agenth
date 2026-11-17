import {test as base,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Every automated browser test uses synthetic audio. Never bill a real voice account.
export const test=base.extend({page:async({page},runTest)=>{const audio=await readFile('e2e/fixtures/mock-voice.mp3');await page.route('**/api/voice/synthesize',route=>route.fulfill({status:200,headers:{'Content-Type':'audio/mpeg','X-Voice-Provider':'elevenlabs'},body:audio}));await runTest(page);}});
export {expect};
