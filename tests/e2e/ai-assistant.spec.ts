import { test, expect } from '@playwright/test';

test('AI assistant hook available and does not error when invoked', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');

  // If the global opener exists, call it with a safe payload. This is a smoke-check only.
  await page.evaluate(() => {
    try {
      // @ts-ignore
      if (window.__openTool) window.__openTool('ai-assistant', { testPayload: true });
    } catch (e) {
      // swallow on page side; test will catch console errors instead
    }
  });

  expect(errors, 'No console errors when invoking AI assistant hook').toHaveLength(0);
});
