import { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';

export const TEST_PASSWORD  = process.env.TEST_PASSWORD  || '';
export const PROVIDER_EMAIL = process.env.PROVIDER_EMAIL || '';
export const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL || '';
export const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || '';

/**
 * Signs in as the given email.
 * Flow: Home → Sign In → BusinessOwnerHomeScreen → Existing User → Login → fill credentials
 */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE_URL}/Home?isGuest=false&preselectedCategory=`);
  await page.waitForTimeout(1500);
  await page.getByText('Sign In').first().click();
  await page.waitForTimeout(1000);
  // BusinessOwnerHomeScreen — navigate to the login form
  await page.getByText('Existing User → Login').click();
  await page.waitForTimeout(1000);
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForTimeout(2000);
}

export async function signOut(page: Page): Promise<void> {
  await page.getByText('Settings').click();
  await page.waitForTimeout(500);
  const signOutBtn = page.getByText(/sign out|logout/i).first();
  if (await signOutBtn.isVisible()) await signOutBtn.click();
  await page.waitForTimeout(1000);
}

export async function goHome(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/Home?isGuest=false&preselectedCategory=`);
  await page.waitForTimeout(1500);
}
