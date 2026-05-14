import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';

test.describe('TC-005 to TC-010 | Guest Role', () => {

  test.beforeEach(async ({ page }) => {
    // Always start as guest — not signed in
    await page.goto(`${BASE_URL}/Home?isGuest=false&preselectedCategory=`);
    await page.waitForTimeout(1500);
  });

  test('TC-005 | Guest clicks Post/Request tab → Sign In screen displays', async ({ page }) => {
    await page.getByText('Post/Request').click();
    await page.waitForTimeout(1000);
    const signInText = page.getByText(/sign in|login/i).first();
    await expect(signInText).toBeVisible();
  });

  test('TC-006 | Guest clicks Listings tab → Sign In screen displays', async ({ page }) => {
    await page.getByText('Listings').click();
    await page.waitForTimeout(1000);
    const signInText = page.getByText(/sign in|login/i).first();
    await expect(signInText).toBeVisible();
  });

  test('TC-006b | Guest clicks Messages tab → Sign In screen displays', async ({ page }) => {
    await page.getByText('Messages').click();
    await page.waitForTimeout(1000);
    const signInText = page.getByText(/sign in|login/i).first();
    await expect(signInText).toBeVisible();
  });

  test('TC-006c | Guest clicks Settings tab → Sign In screen displays', async ({ page }) => {
    await page.getByText('Settings').click();
    await page.waitForTimeout(1000);
    const signInText = page.getByText(/sign in|login/i).first();
    await expect(signInText).toBeVisible();
  });

  test('TC-007 | Guest can search by category and ZIP', async ({ page }) => {
    // Select a category
    await page.locator('select, [role="combobox"]').first().click();
    await page.waitForTimeout(500);
    await page.getByText('Cleaning').first().click();
    await page.waitForTimeout(500);
    // Enter ZIP
    await page.getByPlaceholder(/zip/i).fill('85001');
    await page.waitForTimeout(500);
    await page.getByText('Search').click();
    await page.waitForTimeout(3000);
    // Results container or "No services found" should appear
    const results = page.getByText(/found|services found|no services/i).first();
    await expect(results).toBeVisible();
  });

  test('TC-008 | Guest can view recent post details with Contact Provider button', async ({ page }) => {
    // Click any post card on home screen
    const firstCard = page.getByText(/recently posted/i).locator('..').locator('[role="button"], div').first();
    await page.waitForTimeout(1000);
    // Tap first available post card
    const postCards = page.locator('text=Contact Provider, text=Message Seller').first();
    const cards = page.getByText(/service|boutique|catering|cleaning/i).first();
    await cards.click();
    await page.waitForTimeout(1500);
    // Detail modal should show Contact Provider button
    const contactBtn = page.getByText(/contact provider|message seller/i).first();
    await expect(contactBtn).toBeVisible();
  });

  test('TC-009 | Guest can view All / Services / Sale tabs', async ({ page }) => {
    // All tab
    await page.getByText('All').first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('All').first()).toBeVisible();

    // Services tab
    await page.getByText('Services').first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Services').first()).toBeVisible();

    // Sale tab
    await page.getByText('Sale').first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Sale').first()).toBeVisible();
  });

  test('TC-010 | Guest clicks review rating → existing reviews + Sign In prompt shown', async ({ page }) => {
    await page.waitForTimeout(1000);
    // Click first post card
    const starIcon = page.locator('[aria-label*="star"], text=reviews, text=No reviews').first();
    await starIcon.click();
    await page.waitForTimeout(1000);
    // Reviews modal or sign in prompt should appear
    const reviewsOrSignIn = page.getByText(/review|sign in to/i).first();
    await expect(reviewsOrSignIn).toBeVisible();
  });

});
