import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 900 }
  },
  reporter: [['list']]
});
