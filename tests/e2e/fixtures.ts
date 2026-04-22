import { test as base, expect } from '@playwright/test';

type Roles = 'admin' | 'accountant' | 'consultant';

export const test = base.extend<{ asRole: (role: Roles) => Promise<void> }>({
  asRole: async ({ page }, use) => {
    await use(async (role) => {
      const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`]!;
      const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`]!;
      await page.goto('/admin');
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/admin/);
    });
  },
});

export { expect };
