import { test, expect } from './fixtures';

test.describe('Customer order flow', () => {
  test('browse → cart → checkout → payment success', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Kale Group/i })).toBeVisible();

    // Go to products section
    await page.click('a[href="#products"]');

    // Pick first product
    const firstCard = page.locator('[data-testid="product-card"]').first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/product\//);

    // Add to cart
    await page.getByRole('button', { name: /კალათაში დამატება/i }).click();

    // Open cart drawer
    await page.click('[data-testid="cart-button"]');
    await page.getByRole('button', { name: /გაფორმება/i }).click();
    await expect(page).toHaveURL('/checkout');

    // Fill checkout form
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="phone"]', '555123456');
    await page.fill('input[name="address"]', 'Test str 1');
    await page.fill('input[name="city"]', 'Tbilisi');

    // Pay cash (bypasses external bank redirect)
    await page.click('input[value="cash"]');
    await page.getByRole('button', { name: /შეკვეთის დადასტურება/i }).click();

    // Success page
    await expect(page).toHaveURL(/\/payment\/success/);
    await expect(page.getByText(/შეკვეთა გაფორმდა/i)).toBeVisible();
  });
});
