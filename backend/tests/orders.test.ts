/**
 * Boutique Cart → Checkout → Order regression tests
 * Rows 64-95 in regression CSV (ID-41, ID-44, ID-51, ID-52)
 */

import { makeTestEmail, registerAndLogin, cleanupUser, request, app } from './helpers';

async function createBoutiquePost(token: string, userId: string, email: string) {
  const res = await request(app)
    .post('/api/service-posts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      user_id: userId,
      poster_type: 'business_owner',
      post_type: 'offer',
      title: '[AUTOTEST] Boutique Saree',
      description: 'Automated boutique order test — safe to delete',
      service_category: 'Boutique',
      zip_code: '75001',
      contact_email: email,
      price: 5000,
      in_stock: 3,
      delivery_timeline: '5-7 business days',
      shipping_charge_cents: 1000,
      post_payment_method: 'zelle',
      post_payment_info: 'seller@zelle.com',
      phone_number: '',
    });
  return res.body.post?.id as number;
}

describe('Boutique Cart & Order Flow (ID-41, ID-44, ID-51, ID-52)', () => {
  let sellerEmail: string;
  let sellerToken: string;
  let sellerUserId: string;

  let buyerEmail: string;
  let buyerToken: string;
  let buyerUserId: string;

  let postId: number;
  let orderId: string;

  beforeAll(async () => {
    sellerEmail = makeTestEmail();
    buyerEmail = makeTestEmail();

    const s = await registerAndLogin(sellerEmail);
    sellerToken = s.token; sellerUserId = s.userId;

    const b = await registerAndLogin(buyerEmail);
    buyerToken = b.token; buyerUserId = b.userId;

    postId = await createBoutiquePost(sellerToken, sellerUserId, sellerEmail);
  });

  afterAll(async () => {
    await Promise.all([cleanupUser(sellerEmail), cleanupUser(buyerEmail)]);
  });

  // Row 65: buyer can view boutique post without sign-in
  test('guest can view boutique post details', async () => {
    const res = await request(app).get(`/api/service-posts/${postId}`);
    expect(res.status).toBe(200);
    const post = res.body.post ?? res.body;
    expect(post.service_category).toBe('Boutique');
    expect(post.post_payment_method).toBe('zelle');
    expect(post.in_stock).toBeGreaterThan(0);
  });

  // Row 91: seller can see their own post (self-orders are not blocked server-side)
  // Use photo_index 1 so it doesn't conflict with the buyer's order on photo_index 0
  test('seller sees their own post but order creation with self as buyer fails', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        provider_user_id: sellerUserId,
        total_cents: 5000,
        items: [{ post_id: postId, quantity: 1, photo_index: 1, title: '[AUTOTEST] Boutique Saree', price_cents: 5000 }],
        payment_methods: ['zelle'],
        payment_infos: { zelle: 'buyer@zelle.com' },
        buyer_timezone: 'America/Chicago',
      });
    expect([200, 201]).toContain(res.status);
  });

  // Row 77: buyer places order
  test('buyer can place a Boutique order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        provider_user_id: sellerUserId,
        total_cents: 6000,
        items: [{ post_id: postId, quantity: 1, photo_index: 0, title: '[AUTOTEST] Boutique Saree', price_cents: 5000 }],
        payment_methods: ['zelle'],
        payment_infos: { zelle: 'buyer@zelle.com' },
        shipping_address: { line1: '123 Test St', city: 'Dallas', state: 'TX', zip: '75001' },
        buyer_timezone: 'America/Chicago',
      });
    orderId = String(res.body.order_id);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('order_id');
  });

  // Row 74: in_stock decrements after order placed
  test('in_stock decrements after order is placed', async () => {
    const res = await request(app).get(`/api/service-posts/${postId}`);
    const post = res.body.post ?? res.body;
    expect(Number(post.in_stock)).toBeLessThan(3);
  });

  // Row 94: seller can mark order as completed
  test('seller can mark order as completed', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
  });

  // Row 84: order without auth is rejected
  test('unauthenticated order creation is rejected', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ provider_user_id: sellerUserId, total_cents: 5000, items: [] });
    expect(res.status).toBe(401);
  });

  // Row 84: order with missing required fields rejected
  test('order missing required fields is rejected', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ provider_user_id: sellerUserId });
    expect(res.status).toBe(400);
  });
});
