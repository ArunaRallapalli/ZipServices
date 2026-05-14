import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { signIn, CUSTOMER_EMAIL, PROVIDER_EMAIL, TEST_PASSWORD } from './helpers/auth';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';

test.describe('TC-001 to TC-004 | Account Management', () => {

  /**
   * TC-001: Creates a fresh provider account using zipmarket333@gmail.com.
   * Pre-condition: delete that account from the DB before running this test.
   * Uses Password3! so the provider tests (TC-014 to TC-024) can sign in immediately.
   */
  test('TC-001 | Create new account with provider email', async ({ page }) => {
    await page.goto(`${BASE_URL}/Home?isGuest=false&preselectedCategory=`);
    await page.waitForTimeout(1500);

    // Sign In → BusinessOwnerHomeScreen
    await page.getByText('Sign In').first().click();
    await page.waitForTimeout(1500);

    // Agree to Terms, then go to sign-up form
    await expect(page.getByText(/Welcome to GoZipMarket/i).first()).toBeVisible();
    await page.locator('input[type="checkbox"]').first().click();
    await page.waitForTimeout(300);
    await page.getByText('New User → Sign Up').click();
    await page.waitForTimeout(1500);

    // Fill the 4 required fields
    await page.getByPlaceholder('Full Name *').fill('Zip Market');
    await page.getByPlaceholder('Email *').fill(PROVIDER_EMAIL);
    await page.getByPlaceholder('Password *').fill(TEST_PASSWORD);
    await page.getByPlaceholder('Confirm Password *').fill(TEST_PASSWORD);
    await page.getByPlaceholder('Zip Code *').fill('85001');

    // Wait for ZIP code to auto-populate city/state via API
    await page.waitForTimeout(3000);

    // Submit — use last() to hit the button, not the page title (both say "Create Account")
    await page.getByText('Create Account').last().click();
    await page.waitForTimeout(2000);

    // Verify the success alert
    const successText = page.getByText(/Account Created|check your email/i).first();
    await expect(successText).toBeVisible();
  });

  test('TC-002 | Login with uppercase email is case insensitive', async ({ page }) => {
    await page.goto(`${BASE_URL}/Home?isGuest=false&preselectedCategory=`);
    await page.waitForTimeout(1000);
    await page.getByText('Sign In').first().click();
    await page.waitForTimeout(1000);
    // BusinessOwnerHomeScreen → login form
    await page.getByText('Existing User → Login').click();
    await page.waitForTimeout(1000);
    await page.getByPlaceholder(/email/i).fill(CUSTOMER_EMAIL.toUpperCase());
    await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(2500);
    // Should NOT show invalid credentials error
    const errorMsg = page.getByText(/invalid|incorrect|wrong/i);
    await expect(errorMsg).not.toBeVisible();
  });

  test('TC-003 | Login with valid customer credentials', async ({ page }) => {
    await signIn(page, CUSTOMER_EMAIL);
    // Home screen should show — Sign In button should be gone
    const signInBtn = page.getByText('Sign In').first();
    await expect(signInBtn).not.toBeVisible();
  });

  /**
   * TC-004: Submits a password reset email for the provider account.
   * This verifies the forgot-password form works end-to-end (sends email, shows confirmation).
   * The actual reset link arrives by email and does not need to be clicked in automation.
   */
  test('TC-004 | Reset password — sends reset email for provider account', async ({ page }) => {
    await page.goto(`${BASE_URL}/Home?isGuest=false&preselectedCategory=`);
    await page.waitForTimeout(1500);

    // Navigate to the login form
    await page.getByText('Sign In').first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Existing User → Login').click();
    await page.waitForTimeout(1000);

    // Pre-fill email, then switch to forgot-password mode
    await page.getByPlaceholder(/email/i).fill(PROVIDER_EMAIL);
    await page.waitForTimeout(300);
    await page.getByText('Forgot Password?').click();
    await page.waitForTimeout(800);

    // Should now show the Reset Password form
    await expect(page.getByText(/Reset Password/i).first()).toBeVisible();

    // Email carries over from login mode; fill only if empty
    const emailField = page.getByPlaceholder(/email/i).first();
    const currentEmail = await emailField.inputValue();
    if (!currentEmail) await emailField.fill(PROVIDER_EMAIL);

    await page.getByRole('button', { name: /Send Reset Link/i }).click();
    await page.waitForTimeout(2000);

    // Verify the "Check Your Email" confirmation appears
    const confirmation = page.getByText(/Check Your Email|reset link|check.*inbox/i).first();
    await expect(confirmation).toBeVisible();
  });

});
