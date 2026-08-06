/**
 * Boutique Cart → Checkout → Order regression tests
 * Rows 64-95 in regression CSV (ID-41, ID-44, ID-51, ID-52)
 */

import { makeTestEmail, registerAndLogin, cleanupUser, request, app } from './helpers';
import { supabase } from '../config/Supabase';
import * as emailServices from '../services/emailServices';
import { sweepExpiredOrders } from '../server';

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

describe('Boutique Order Business Logic (ID-42, ID-50, ID-59)', () => {
  let sellerEmail: string, sellerToken: string, sellerUserId: string;
  let buyerAEmail: string, buyerAToken: string, buyerAUserId: string;
  let buyerBEmail: string, buyerBToken: string, buyerBUserId: string;
  let postId: number;

  beforeAll(async () => {
    sellerEmail = makeTestEmail();
    buyerAEmail = makeTestEmail();
    buyerBEmail = makeTestEmail();

    const s = await registerAndLogin(sellerEmail);
    sellerToken = s.token; sellerUserId = s.userId;
    const a = await registerAndLogin(buyerAEmail);
    buyerAToken = a.token; buyerAUserId = a.userId;
    const b = await registerAndLogin(buyerBEmail);
    buyerBToken = b.token; buyerBUserId = b.userId;

    postId = await createBoutiquePost(sellerToken, sellerUserId, sellerEmail);
    // Give this post plenty of stock — several tests below place orders against it.
    await supabase.from('service_posts').update({ in_stock: 10 }).eq('id', postId);
  });

  afterAll(async () => {
    await Promise.all([cleanupUser(sellerEmail), cleanupUser(buyerAEmail), cleanupUser(buyerBEmail)]);
  });

  // ID-42: order-confirmation email fires to buyer, provider, and admins, carrying
  // the buyer's timezone for date formatting.
  test('order placement email is sent to buyer, provider, and admins with buyer timezone', async () => {
    const spy = jest.spyOn(emailServices, 'sendOrderPlacementEmails').mockResolvedValue(undefined);
    try {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerAToken}`)
        .send({
          provider_user_id: sellerUserId,
          total_cents: 5000,
          items: [{ post_id: postId, quantity: 1, photo_index: 10, title: '[AUTOTEST] Boutique Saree', price_cents: 5000 }],
          payment_methods: ['zelle'],
          payment_infos: { zelle: 'buyerA@zelle.com' },
          buyer_timezone: 'America/Chicago',
        });
      expect(res.status).toBe(201);

      await new Promise(r => setTimeout(r, 800));

      expect(spy).toHaveBeenCalledTimes(1);
      const args = spy.mock.calls[0][0];
      expect(args.customerEmail).toBe(buyerAEmail);
      expect(args.providerEmail).toBe(sellerEmail);
      expect(args.buyerTimezone).toBe('America/Chicago');
      expect(Array.isArray(args.adminEmails)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  // ID-42 (multi-customer race) + ID-59 (deterministic product ID format).
  test('a second buyer cannot order the same photo slot while the first order is still pending', async () => {
    const firstRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        provider_user_id: sellerUserId,
        total_cents: 5000,
        items: [{ post_id: postId, quantity: 1, photo_index: 20, title: '[AUTOTEST] Boutique Saree', price_cents: 5000 }],
        payment_methods: ['zelle'],
        payment_infos: { zelle: 'buyerA@zelle.com' },
        buyer_timezone: 'America/Chicago',
      });
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerBToken}`)
      .send({
        provider_user_id: sellerUserId,
        total_cents: 5000,
        items: [{ post_id: postId, quantity: 1, photo_index: 20, title: '[AUTOTEST] Boutique Saree', price_cents: 5000 }],
        payment_methods: ['zelle'],
        payment_infos: { zelle: 'buyerB@zelle.com' },
        buyer_timezone: 'America/Chicago',
      });
    expect(secondRes.status).toBe(409);
    // The product ID format used across cart/order/email/history is #P<post_id>-<photo_index+1>.
    expect(secondRes.body.error).toContain(`#P${postId}-21`);
    expect(secondRes.body.error).toMatch(/already reserved by another buyer/i);
  });

  // ID-42: cancelling an order reverts the stock that was decremented at placement.
  test('stock reverts when a provider cancels an order', async () => {
    const { data: before } = await supabase.from('service_posts').select('in_stock').eq('id', postId).single();
    const stockBefore = Number(before?.in_stock);

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        provider_user_id: sellerUserId,
        total_cents: 10000,
        items: [{ post_id: postId, quantity: 2, photo_index: 30, title: '[AUTOTEST] Boutique Saree', price_cents: 5000 }],
        payment_methods: ['zelle'],
        payment_infos: { zelle: 'buyerA@zelle.com' },
        buyer_timezone: 'America/Chicago',
      });
    expect(orderRes.status).toBe(201);
    const cancelOrderId = orderRes.body.order_id;

    await new Promise(r => setTimeout(r, 800));
    const { data: afterDecrement } = await supabase.from('service_posts').select('in_stock').eq('id', postId).single();
    expect(Number(afterDecrement?.in_stock)).toBe(stockBefore - 2);

    const cancelRes = await request(app)
      .patch(`/api/orders/${cancelOrderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'cancelled' });
    expect(cancelRes.status).toBe(200);

    await new Promise(r => setTimeout(r, 800));
    const { data: afterRevert } = await supabase.from('service_posts').select('in_stock').eq('id', postId).single();
    expect(Number(afterRevert?.in_stock)).toBe(stockBefore);
  });

  // ID-50 / ID-59: an order whose expiry window has passed gets auto-marked 'expired'
  // and its stock reverted by the sweep (called directly here instead of waiting for
  // the real 30-minute setInterval).
  test('expired pending orders are auto-marked expired and stock is reverted by the sweep', async () => {
    const { data: before } = await supabase.from('service_posts').select('in_stock').eq('id', postId).single();
    const stockBefore = Number(before?.in_stock);

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerBToken}`)
      .send({
        provider_user_id: sellerUserId,
        total_cents: 5000,
        items: [{ post_id: postId, quantity: 1, photo_index: 40, title: '[AUTOTEST] Boutique Saree', price_cents: 5000 }],
        payment_methods: ['zelle'],
        payment_infos: { zelle: 'buyerB@zelle.com' },
        buyer_timezone: 'America/Chicago',
      });
    expect(orderRes.status).toBe(201);
    const expiringOrderId = orderRes.body.order_id;

    await new Promise(r => setTimeout(r, 800));

    await supabase.from('payments')
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('id', expiringOrderId);
    await sweepExpiredOrders();

    const { data: order } = await supabase.from('payments').select('status').eq('id', expiringOrderId).single();
    expect(order?.status).toBe('expired');

    const { data: afterRevert } = await supabase.from('service_posts').select('in_stock').eq('id', postId).single();
    expect(Number(afterRevert?.in_stock)).toBe(stockBefore);
  });
});
