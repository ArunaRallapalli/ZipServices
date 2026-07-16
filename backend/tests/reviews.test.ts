/**
 * Reviews regression tests — ID-25 to ID-31
 * Rows 33-39 in regression CSV
 */

import { makeTestEmail, registerAndLogin, cleanupUser, request, app } from './helpers';

describe('Reviews (ID-25 to ID-31)', () => {
  let providerEmail: string;
  let providerToken: string;
  let providerUserId: string;

  let customerEmail: string;
  let customerToken: string;
  let customerUserId: string;

  beforeAll(async () => {
    providerEmail = makeTestEmail();
    customerEmail = makeTestEmail();

    const p = await registerAndLogin(providerEmail);
    providerToken = p.token; providerUserId = p.userId;

    const c = await registerAndLogin(customerEmail);
    customerToken = c.token; customerUserId = c.userId;
  });

  afterAll(async () => {
    await Promise.all([cleanupUser(providerEmail), cleanupUser(customerEmail)]);
  });

  // Row 34: customer can submit a review
  test('customer can submit a review for a provider', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        providerId: providerUserId,
        customerId: customerUserId,
        rating: 4,
        reviewText: 'Automated test review — safe to delete',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // Row 35: get reviews for provider
  test('anyone can view reviews for a provider', async () => {
    const res = await request(app).get(`/api/reviews/provider/${providerUserId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews ?? res.body)).toBe(true);
  });

  // Row 36: provider cannot review themselves
  test('provider cannot submit a review for themselves', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        providerId: providerUserId,
        customerId: providerUserId,
        rating: 5,
        reviewText: 'Self review attempt',
      });
    expect(res.status).toBe(403);
  });

  // Row 34: rating must be 1–5
  test('rating below 1 is rejected', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ providerId: providerUserId, customerId: customerUserId, rating: 0 });
    expect(res.status).toBe(400);
  });

  test('rating above 5 is rejected', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ providerId: providerUserId, customerId: customerUserId, rating: 6 });
    expect(res.status).toBe(400);
  });

  // Row 34: cannot create review as someone else
  test('customer cannot submit review impersonating another user', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        providerId: providerUserId,
        customerId: providerUserId,
        rating: 3,
        reviewText: 'Impersonation attempt',
      });
    expect(res.status).toBe(403);
  });

  // Unauthenticated review rejected
  test('unauthenticated review submission is rejected', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ providerId: providerUserId, customerId: customerUserId, rating: 4 });
    expect(res.status).toBe(401);
  });
});
