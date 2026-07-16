/**
 * Auth regression tests — P0
 * Covers: ID-1 (create account), ID-2 (login + case-insensitive email)
 */

import { makeTestEmail, registerUser, verifyEmailInDB, loginUser, cleanupUser, TEST_PASSWORD } from './helpers';

describe('Account & Auth', () => {
  let testEmail: string;

  beforeEach(() => {
    testEmail = makeTestEmail();
  });

  afterEach(async () => {
    await cleanupUser(testEmail);
  });

  // ID-1
  test('creates a new account successfully', async () => {
    const res = await registerUser(testEmail);
    expect(res.status).toBe(201);
  });

  // ID-1
  test('rejects duplicate email registration', async () => {
    await registerUser(testEmail);
    const res = await registerUser(testEmail);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // ID-2
  test('login succeeds after email verification', async () => {
    await registerUser(testEmail);
    await verifyEmailInDB(testEmail);
    const res = await loginUser(testEmail);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('user_id');
  });

  // ID-2
  test('login blocked before email verification', async () => {
    await registerUser(testEmail);
    const res = await loginUser(testEmail);
    expect(res.status).toBe(403);
  });

  // ID-2
  test('login fails with wrong password', async () => {
    await registerUser(testEmail);
    await verifyEmailInDB(testEmail);
    const res = await loginUser(testEmail, 'WrongPass@999!');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // ID-2: uppercase email registered, lowercase login works
  test('case-insensitive email: registered with uppercase, login with lowercase', async () => {
    const upperEmail = testEmail.toUpperCase();
    await registerUser(upperEmail);
    await verifyEmailInDB(testEmail); // stored as lowercase in DB
    const res = await loginUser(testEmail.toLowerCase());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});
