/**
 * Admin & Category regression tests — ID-10 to ID-13
 * Rows 18-21 in regression CSV
 * Also covers Profile update — ID-16 to ID-18, Rows 24-26
 */

import { makeTestEmail, registerAndLogin, cleanupUser, request, app } from './helpers';

describe('Service Categories (ID-10 to ID-13)', () => {
  const uniqueCategoryName = `[AUTOTEST] Category ${Date.now()}`;
  let categoryId: number;

  // Row 18/22: list all active categories
  test('anyone can fetch all service categories', async () => {
    const res = await request(app).get('/api/service-categories');
    expect(res.status).toBe(200);
    const categories = res.body.categories ?? res.body;
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  // Row 19: user can request a new category (via POST /api/service-categories)
  test('a new category can be created', async () => {
    const res = await request(app)
      .post('/api/service-categories')
      .send({ category_name: uniqueCategoryName });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    categoryId = res.body.category?.category_id;
  });

  // Row 19: duplicate category rejected
  test('duplicate category name is rejected', async () => {
    const res = await request(app)
      .post('/api/service-categories')
      .send({ category_name: uniqueCategoryName });
    expect(res.status).toBe(400);
  });

  // Row 20: admin can fetch pending requests
  test('pending category requests can be listed', async () => {
    const res = await request(app).get('/api/service-categories/requests/pending');
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      const requests = res.body.requests ?? res.body;
      expect(Array.isArray(requests)).toBe(true);
    }
  });

  afterAll(async () => {
    // Clean up the test category
    if (categoryId) {
      const { supabase } = require('../config/Supabase');
      await supabase.from('service_categories').delete().eq('category_id', categoryId);
    }
  });
});

describe('Profile Update (ID-16 to ID-18)', () => {
  let userEmail: string;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    userEmail = makeTestEmail();
    ({ token, userId } = await registerAndLogin(userEmail));
  });

  afterAll(async () => {
    await cleanupUser(userEmail);
  });

  // Row 25: signed-in user can update their profile
  test('user can update their business profile', async () => {
    const res = await request(app)
      .put(`/business-owners/by-user/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        business_name: 'Automation Test Business Updated',
        description: 'Updated description via automated test',
        phone_number: '5551234567',
        zip_code: '75001',
        city: 'Dallas',
        state: 'TX',
        payment_method: 'zelle',
        payment_info: 'updated@zelle.com',
      });
    expect(res.status).toBe(200);
  });

  // Row 24: cannot update another user's profile
  test('user cannot update another user profile', async () => {
    const otherEmail = makeTestEmail();
    const other = await registerAndLogin(otherEmail);

    const res = await request(app)
      .put(`/business-owners/by-user/${other.userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ business_name: 'Unauthorized Update' });
    expect(res.status).toBe(403);

    await cleanupUser(otherEmail);
  });

  // Row 24: unauthenticated profile update rejected
  test('unauthenticated profile update is rejected', async () => {
    const res = await request(app)
      .put(`/business-owners/by-user/${userId}`)
      .send({ business_name: 'No auth update' });
    expect(res.status).toBe(401);
  });
});
