import request from 'supertest';
import app from '../server';
import { supabase } from '../config/Supabase';

export const TEST_PASSWORD = 'Test@1234!';

let _emailSeq = 0;
export function makeTestEmail(): string {
  // process.pid makes emails unique across Jest workers even when they start within the same millisecond
  return `autotest.${Date.now()}.${process.pid}.${++_emailSeq}@test.gozipmarket.com`;
}

export async function registerUser(email: string, password: string = TEST_PASSWORD) {
  return request(app)
    .post('/business_owners/crud/register')
    .send({
      name: 'Automation Test User',
      email,
      password,
      city: 'Dallas',
      state: 'TX',
      zip_code: '75001',
      description: '',
      phone_number: '',
      street: '',
    });
}

// Bypass email verification by directly updating the DB (dev Supabase only)
export async function verifyEmailInDB(email: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ email_verified: true })
    .eq('email', email.toLowerCase());
  if (error) throw new Error(`Failed to verify email in DB: ${error.message}`);
}

export async function loginUser(email: string, password: string = TEST_PASSWORD) {
  return request(app)
    .post('/business_owners/login')
    .send({ email, password });
}

export async function registerAndLogin(email: string, password: string = TEST_PASSWORD) {
  await registerUser(email, password);
  await verifyEmailInDB(email);
  const res = await loginUser(email, password);
  return {
    token: res.body.token as string,
    userId: String(res.body.user?.user_id),
    email: res.body.user?.email as string,
  };
}

export async function cleanupUser(email: string): Promise<void> {
  // Cascading deletes on users table propagate to business_owners and service_posts
  await supabase.from('users').delete().eq('email', email.toLowerCase());
}

export { request, app };
