import { test, expect } from '@playwright/test';

test('visual sensory area loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');

  // Basic smoke check: ensure root is present and page is interactive
  await expect(page.locator('#root')).toBeVisible();

  // Optionally try to access a demo storage key to ensure demo adapter isn't throwing
  await page.evaluate(() => {
    try {
      // @ts-ignore
      const demo = window.localStorage && window.localStorage.getItem('neurotype_planner_demo_data');
      return !!demo;
    } catch (e) {
      // ignore
    }
  });

  expect(errors, 'No console errors for visual sensory smoke test').toHaveLength(0);
});
