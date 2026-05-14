import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { signIn, PROVIDER_EMAIL } from './helpers/auth';

dotenv.config();

test.describe('TC-016 to TC-024 | Post a Service', () => {

  test.beforeEach(async ({ page }) => {
    await signIn(page, PROVIDER_EMAIL);
    await page.getByText('Post/Request').click();
    await page.waitForTimeout(1500);
  });

  test('TC-016 | Delivery timeline field is visible and editable for non-Boutique', async ({ page }) => {
    // Select Cleaning category
    await page.locator('select, [role="combobox"]').first().selectOption('Cleaning');
    await page.waitForTimeout(500);
    const deliveryField = page.getByPlaceholder(/delivery|timeline|business days/i).first();
    await expect(deliveryField).toBeVisible();
    await deliveryField.fill('3 to 5 business days');
    await expect(deliveryField).toHaveValue('3 to 5 business days');
  });

  test('TC-017 | Quantity Available field shown for Boutique', async ({ page }) => {
    await page.locator('select, [role="combobox"]').first().selectOption('Boutique');
    await page.waitForTimeout(500);
    const qtyField = page.getByPlaceholder(/quantity|qty|available/i).first();
    await expect(qtyField).toBeVisible();
  });

  test('TC-018 | Quantity Available field NOT shown for non-Boutique', async ({ page }) => {
    await page.locator('select, [role="combobox"]').first().selectOption('Catering');
    await page.waitForTimeout(500);
    const qtyField = page.getByPlaceholder(/quantity|qty|available/i).first();
    await expect(qtyField).not.toBeVisible();
  });

  test('TC-019 | Boutique shows Delivery + Quantity + Shipping + Payment fields', async ({ page }) => {
    await page.locator('select, [role="combobox"]').first().selectOption('Boutique');
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder(/delivery|timeline/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/quantity|qty/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/shipping/i).first()).toBeVisible();
    await expect(page.getByText(/payment method/i).first()).toBeVisible();
  });

  test('TC-020 | Shipping charges field accepts 0.00 and numeric values', async ({ page }) => {
    await page.locator('select, [role="combobox"]').first().selectOption('Boutique');
    await page.waitForTimeout(500);
    const shippingField = page.getByPlaceholder(/shipping/i).first();
    await expect(shippingField).toBeVisible();
    await shippingField.fill('0.00');
    await expect(shippingField).toHaveValue('0.00');
    await shippingField.fill('9.99');
    await expect(shippingField).toHaveValue('9.99');
  });

  test('TC-021 | Payment method dropdown shows all payment types for Boutique', async ({ page }) => {
    await page.locator('select, [role="combobox"]').first().selectOption('Boutique');
    await page.waitForTimeout(500);
    // All payment labels should be visible
    await expect(page.getByText('Zelle').first()).toBeVisible();
    await expect(page.getByText('Venmo').first()).toBeVisible();
    await expect(page.getByText('PayPal').first()).toBeVisible();
    await expect(page.getByText('Cash App').first()).toBeVisible();
    await expect(page.getByText('Cash').first()).toBeVisible();
    await expect(page.getByText('Check').first()).toBeVisible();
  });

  test('TC-022 | Thrifting price field defaults to 0.00', async ({ page }) => {
    await page.locator('select, [role="combobox"]').first().selectOption('Preloved & Thrifting');
    await page.waitForTimeout(500);
    const priceField = page.getByPlaceholder(/price|0\.00/i).first();
    await expect(priceField).toBeVisible();
    const value = await priceField.inputValue();
    expect(['0', '0.00', '']).toContain(value);
  });

  test('TC-023 | Thrifting with empty price shows validation error', async ({ page }) => {
    await page.locator('select, [role="combobox"]').first().selectOption('Preloved & Thrifting');
    await page.waitForTimeout(500);
    // Clear price field
    const priceField = page.getByPlaceholder(/price|0\.00/i).first();
    await priceField.fill('');
    // Fill required fields minimally and submit
    await page.getByPlaceholder(/title/i).first().fill('Test Thrift Item');
    await page.getByText(/submit|post|save/i).first().click();
    await page.waitForTimeout(1000);
    // Validation error for price
    const error = page.getByText(/0\.00|enter.*price|price.*required/i).first();
    await expect(error).toBeVisible();
  });

  test('TC-024 | Thrifting accepts 0 and 0.00 as valid price', async ({ page }) => {
    await page.locator('select, [role="combobox"]').first().selectOption('Preloved & Thrifting');
    await page.waitForTimeout(500);
    const priceField = page.getByPlaceholder(/price|0\.00/i).first();
    // Test with 0
    await priceField.fill('0');
    await expect(priceField).toHaveValue('0');
    // Test with 0.00
    await priceField.fill('0.00');
    await expect(priceField).toHaveValue('0.00');
  });

});
