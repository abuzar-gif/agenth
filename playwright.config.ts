import { defineConfig,devices } from '@playwright/test';
export default defineConfig({testDir:'./e2e',expect:{timeout:20000},fullyParallel:false,workers:1,timeout:60000,use:{launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']},baseURL:process.env.TEST_BASE_URL||'http://localhost:3000',trace:'retain-on-failure'},projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],reporter:[['list'],['html',{open:'never'}]]});

