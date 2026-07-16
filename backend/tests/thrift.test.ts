/**
 * Preloved & Thrifting flow regression tests — ID-8
 * Rows 48-57 in regression CSV
 */

import { makeTestEmail, registerAndLogin, cleanupUser, request, app } from './helpers';

async function createThriftPost(token: string, userId: string, email: string, inStock = 2) {
  const res = await request(app)
    .post('/api/service-posts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      user_id: userId,
      poster_type: 'business_owner',
      post_type: 'offer',
      title: '[AUTOTEST] Thrift Item',
      description: 'Automated thrift test post — safe to delete',
      service_category: 'Preloved & Thrifting',
      zip_code: '75001',
      contact_email: email,
      price: 0,
      in_stock: inStock,
      phone_number: '',
    });
  return res.body.post?.id as number;
}

describe('Preloved & Thrifting Flow (ID-8)', () => {
  let sellerEmail: string;
  let sellerToken: string;
  let sellerUserId: string;

  let buyerEmail: string;
  let buyerToken: string;
  let buyerUserId: string;

  let buyer2Email: string;
  let buyer2Token: string;
  let buyer2UserId: string;

  let postId: number;

  beforeAll(async () => {
    sellerEmail = makeTestEmail();
    buyerEmail = makeTestEmail();
    buyer2Email = makeTestEmail();

    const s = await registerAndLogin(sellerEmail);
    sellerToken = s.token; sellerUserId = s.userId;

    const b = await registerAndLogin(buyerEmail);
    buyerToken = b.token; buyerUserId = b.userId;

    const b2 = await registerAndLogin(buyer2Email);
    buyer2Token = b2.token; buyer2UserId = b2.userId;

    postId = await createThriftPost(sellerToken, sellerUserId, sellerEmail, 2);
  });

  afterAll(async () => {
    await Promise.all([
      cleanupUser(sellerEmail),
      cleanupUser(buyerEmail),
      cleanupUser(buyer2Email),
    ]);
  });

  // Row 48: guest can view thrift post
  test('guest can view thrift post without auth', async () => {
    const res = await request(app).get(`/api/service-posts/${postId}`);
    expect(res.status).toBe(200);
  });

  // Row 48: guest cannot request item
  test('unauthenticated buyer cannot request thrift item', async () => {
    const res = await request(app)
      .post('/api/thrift-requests')
      .send({ post_id: postId, provider_user_id: sellerUserId });
    expect(res.status).toBe(401);
  });

  // Row 57: seller cannot request their own item
  test('seller cannot request their own thrift item', async () => {
    const res = await request(app)
      .post('/api/thrift-requests')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ post_id: postId, provider_user_id: sellerUserId });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot request your own/i);
  });

  // Row 49: buyer requests item
  test('buyer can request a thrift item', async () => {
    const res = await request(app)
      .post('/api/thrift-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ post_id: postId, provider_user_id: sellerUserId });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('request_id');
  });

  // Row 51: buyer cannot request same item twice
  test('buyer cannot request the same item twice', async () => {
    const res = await request(app)
      .post('/api/thrift-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ post_id: postId, provider_user_id: sellerUserId });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already have an active request/i);
  });

  // Row 51: second buyer CAN request the same item
  test('a different buyer can also request the same item', async () => {
    const res = await request(app)
      .post('/api/thrift-requests')
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ post_id: postId, provider_user_id: sellerUserId });
    expect(res.status).toBe(201);
  });

  // Row 53: seller approves first buyer
  test('seller can approve-complete a request and in_stock decrements', async () => {
    const listRes = await request(app)
      .get('/api/thrift-requests/provider')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(listRes.status).toBe(200);

    const requests = listRes.body.requests ?? listRes.body;
    const buyerRequest = requests.find((r: any) =>
      String(r.buyer_user_id) === String(buyerUserId) && r.post_id === postId
    );
    expect(buyerRequest).toBeDefined();

    const approveRes = await request(app)
      .patch(`/api/thrift-requests/${buyerRequest.id}/approve-complete`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(approveRes.status).toBe(200);

    // Row 54: verify in_stock decremented
    const postRes = await request(app).get(`/api/service-posts/${postId}`);
    const post = postRes.body.post ?? postRes.body;
    expect(Number(post.in_stock)).toBeLessThan(2);
  });
});
