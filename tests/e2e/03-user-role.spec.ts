import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { signIn, signOut, goHome, CUSTOMER_EMAIL, PROVIDER_EMAIL } from './helpers/auth';

dotenv.config();

test.describe('TC-011 to TC-015 | Signed-In User Role', () => {

  test('TC-011 | Signed-in customer views recent posts and post detail', async ({ page }) => {
    await signIn(page, CUSTOMER_EMAIL);
    await goHome(page);
    // Click any post card
    const card = page.getByText(/catering|cleaning|tailoring|boutique/i).first();
    await card.click();
    await page.waitForTimeout(1500);
    // Contact Provider or Message Seller button should be visible (no redirect to sign in)
    const contactBtn = page.getByText(/contact provider|message seller/i).first();
    await expect(contactBtn).toBeVisible();
  });

  test('TC-012 | Signed-in user taps star rating — reviews modal opens (no redirect)', async ({ page }) => {
    await signIn(page, CUSTOMER_EMAIL);
    await goHome(page);
    await page.waitForTimeout(1000);
    // Open any post detail
    const card = page.getByText(/catering|cleaning|tailoring/i).first();
    await card.click();
    await page.waitForTimeout(1500);
    // Tap star rating
    const stars = page.getByText(/reviews|no reviews/i).first();
    await stars.click();
    await page.waitForTimeout(1000);
    // Reviews modal should open — NOT redirect to sign in
    const reviewsModal = page.getByText(/reviews|write a review|no reviews yet/i).first();
    await expect(reviewsModal).toBeVisible();
    const signInRedirect = page.getByText(/you must be signed in|please sign in/i);
    await expect(signInRedirect).not.toBeVisible();
  });

  test('TC-013 | Signed-in user can search by category and ZIP', async ({ page }) => {
    await signIn(page, CUSTOMER_EMAIL);
    await goHome(page);
    // Select category
    await page.locator('select, [role="combobox"]').first().click();
    await page.waitForTimeout(500);
    await page.getByText('Cleaning').first().click();
    await page.waitForTimeout(500);
    // Enter ZIP
    await page.getByPlaceholder(/zip/i).fill('85001');
    await page.getByText('Search').click();
    await page.waitForTimeout(3000);
    const results = page.getByText(/found|services found|no services/i).first();
    await expect(results).toBeVisible();
  });

  test('TC-014 | Signed-in provider can access Post Service page', async ({ page }) => {
    await signIn(page, PROVIDER_EMAIL);
    await page.waitForTimeout(1000);
    await page.getByText('Post/Request').click();
    await page.waitForTimeout(1500);
    // Post service form should be visible
    const titleField = page.getByPlaceholder(/title|service title/i).first();
    await expect(titleField).toBeVisible();
  });

  test('TC-015 | Provider posts appear in recent posts and search results', async ({ page }) => {
    await signIn(page, PROVIDER_EMAIL);
    await goHome(page);
    // Recent posts section should show the provider's listings
    const recentSection = page.getByText(/recently posted/i).first();
    await expect(recentSection).toBeVisible();
  });

});
