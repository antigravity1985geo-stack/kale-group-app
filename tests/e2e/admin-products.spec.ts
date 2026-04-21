import { test, expect } from './fixtures';

test.describe('Admin product CRUD', () => {
  test('create, edit, delete product', async ({ page, asRole }) => {
    await asRole('admin');

    // Navigate to Products tab
    await page.click('[data-testid="sidebar-products"]');

    // Create
    await page.getByRole('button', { name: /დამატება/i }).click();
    await page.fill('input[name="name"]', 'E2E Test Chair');
    await page.fill('input[name="price"]', '450');
    await page.selectOption('select[name="category"]', { label: 'სავარძლები' });
    await page.getByRole('button', { name: /შენახვა/i }).click();

    await expect(page.getByText('E2E Test Chair')).toBeVisible();

    // Edit
    await page.getByText('E2E Test Chair').locator('..').getByRole('button', { name: /რედაქტირება/i }).click();
    await page.fill('input[name="price"]', '500');
    await page.getByRole('button', { name: /შენახვა/i }).click();

    // Delete (cleanup)
    page.on('dialog', (d: import('@playwright/test').Dialog) => d.accept());
    await page.getByText('E2E Test Chair').locator('..').getByRole('button', { name: /წაშლა/i }).click();
    await expect(page.getByText('E2E Test Chair')).not.toBeVisible();
  });
});
