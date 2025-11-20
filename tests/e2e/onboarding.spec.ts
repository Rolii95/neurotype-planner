import { test, expect } from '@playwright/test';

test('app loads and shows a title', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/Neurotype Planner|Universal Neurotype Planner/i);
  const root = page.locator('#root');
  await expect(root).toBeVisible();

  expect(errors, 'No console errors during initial load').toHaveLength(0);
});
