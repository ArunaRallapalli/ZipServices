import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { signIn, goHome, CUSTOMER_EMAIL } from './helpers/auth';

dotenv.config();

test.describe('TC-025 to TC-028 | Cart', () => {

  test.beforeEach(async ({ page }) => {
    await signIn(page, CUSTOMER_EMAIL);
    await goHome(page);
  });

  test('TC-025 | Add Boutique item to cart with payment method selected', async ({ page }) => {
    // Find a Boutique listing
    await page.getByText('Sale').first().click();
    await page.waitForTimeout(1000);
    const boutiqueCard = page.getByText(/boutique/i).first();
    await boutiqueCard.click();
    await page.waitForTimeout(1500);
    // Select payment method if chips are visible
    const payChip = page.getByText(/zelle|venmo|paypal|cash/i).first();
    if (await payChip.isVisible()) await payChip.click();
    await page.waitForTimeout(500);
    // Tap Add to Cart
    await page.getByText('Add to Cart').click();
    await page.waitForTimeout(1500);
    // Confirmation alert or View Cart button should appear
    const confirmation = page.getByText(/added to cart|view cart/i).first();
    await expect(confirmation).toBeVisible();
  });

  test('TC-026 | QTY selector visible in cart for Boutique item', async ({ page }) => {
    // Navigate directly to cart
    await page.goto(`${process.env.BASE_URL}/CartScreen`);
    await page.waitForTimeout(1500);
    // If cart has Boutique items, QTY should be visible
    const qtySelector = page.getByText(/qty|quantity/i).first();
    await expect(qtySelector).toBeVisible();
  });

  test('TC-027 | QTY selector visible in cart for Thrifting item', async ({ page }) => {
    await page.getByText('All').first().click();
    await page.waitForTimeout(500);
    const thriftCard = page.getByText(/thrift|preloved/i).first();
    if (await thriftCard.isVisible()) {
      await thriftCard.click();
      await page.waitForTimeout(1500);
      await page.getByText('Request').click();
      await page.waitForTimeout(1000);
    }
    // Navigate to cart and verify QTY for thrifting
    await page.getByText('Cart', { exact: false }).first().click();
    await page.waitForTimeout(1000);
    const qtySelector = page.getByText(/qty|quantity/i).first();
    await expect(qtySelector).toBeVisible();
  });

  test('TC-028 | QTY selector NOT visible for non-Boutique/non-Thrifting items', async ({ page }) => {
    // Search for a Cleaning service
    await page.locator('select, [role="combobox"]').first().click();
    await page.waitForTimeout(300);
    await page.getByText('Cleaning').first().click();
    await page.getByPlaceholder(/zip/i).fill('85001');
    await page.getByText('Search').click();
    await page.waitForTimeout(3000);
    // Open first result
    const firstResult = page.getByText(/cleaning/i).first();
    await firstResult.click();
    await page.waitForTimeout(1500);
    // Add to cart if button visible
    const addBtn = page.getByText('Add to Cart').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      await page.getByText('View Cart').first().click();
      await page.waitForTimeout(1500);
      // QTY selector should NOT be visible for cleaning item
      const qtySelector = page.getByText(/qty|quantity/i);
      await expect(qtySelector).not.toBeVisible();
    }
  });

});
