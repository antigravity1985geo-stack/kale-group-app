import { test, expect } from './fixtures';

test.describe('POS module', () => {
  test('create in-store sale', async ({ page, asRole }) => {
    await asRole('consultant');
    await page.click('[data-testid="sidebar-showroom"]');

    // Add first product to cart
    const firstProduct = page.locator('[data-testid="pos-product"]').first();
    await firstProduct.click();

    // Fill customer
    await page.fill('input[name="firstName"]', 'POS');
    await page.fill('input[name="lastName"]', 'Customer');
    await page.fill('input[name="phone"]', '555987654');

    // Select cash
    await page.click('input[value="cash"]');

    // Checkout
    await page.getByRole('button', { name: /გაყიდვა/i }).click();
    await expect(page.getByText(/წარმატებული/i)).toBeVisible();
  });
});
