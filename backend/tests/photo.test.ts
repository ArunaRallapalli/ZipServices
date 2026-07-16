/**
 * Photo upload regression tests — P0 (ID-35)
 * Also covers full flows:
 *   - Register + post non-payment service (Catering) with photo
 *   - Register + post Boutique with photo
 */

import { makeTestEmail, registerAndLogin, cleanupUser, request, app } from './helpers';

// Smallest valid 1×1 JPEG as base64
const TINY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDB' +
  'kSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAR' +
  'CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAA' +
  'AAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAA' +
  'AAAAAAAA/9oADAMBAAIRAxEAPwCwABn/2Q==';

async function uploadPhoto(token: string, postId: number) {
  return request(app)
    .post(`/api/service-posts/${postId}/upload-photo`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send({ photo: TINY_JPEG_B64, filename: 'test-photo.jpg', mimetype: 'image/jpeg' });
}

// ─── Non-payment service post with photo (e.g. Catering) ──────────────────────
describe('Register + Post non-payment service with photo (ID-35)', () => {
  let testEmail: string;
  let token: string;
  let userId: string;
  let postId: number;

  beforeAll(async () => {
    testEmail = makeTestEmail();
    ({ token, userId } = await registerAndLogin(testEmail));

    const postRes = await request(app)
      .post('/api/service-posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        user_id: userId,
        poster_type: 'business_owner',
        post_type: 'offer',
        title: '[AUTOTEST] Catering with Photo',
        description: 'Automated test — non-payment service with photo',
        service_category: 'Catering',
        zip_code: '75001',
        contact_email: testEmail,
        price: null,
        phone_number: '',
      });
    expect(postRes.status).toBe(201);
    postId = postRes.body.post?.id;
  });

  afterAll(async () => {
    await cleanupUser(testEmail);
  });

  test('photo uploads successfully and returns a storage URL', async () => {
    const res = await uploadPhoto(token, postId);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.photoUrl).toBe('string');
    expect(res.body.photoUrl).toContain('http');
  });

  test('post appears in search after photo upload', async () => {
    const res = await request(app)
      .get('/api/service-posts')
      .query({ service_category: 'Catering', zip_code: '75001' });
    expect(res.status).toBe(200);
    const found = res.body.posts?.find((p: any) => p.id === postId);
    expect(found).toBeDefined();
  });

  test('upload without auth is rejected', async () => {
    const res = await request(app)
      .post(`/api/service-posts/${postId}/upload-photo`)
      .set('Content-Type', 'application/json')
      .send({ photo: TINY_JPEG_B64, filename: 'test.jpg', mimetype: 'image/jpeg' });
    expect(res.status).toBe(401);
  });

  test('upload with no photo body is rejected', async () => {
    const res = await request(app)
      .post(`/api/service-posts/${postId}/upload-photo`)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── Boutique post with photo ──────────────────────────────────────────────────
describe('Register + Post Boutique with photo (ID-35, ID-9 Boutique)', () => {
  let testEmail: string;
  let token: string;
  let userId: string;
  let postId: number;

  beforeAll(async () => {
    testEmail = makeTestEmail();
    ({ token, userId } = await registerAndLogin(testEmail));

    const postRes = await request(app)
      .post('/api/service-posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        user_id: userId,
        poster_type: 'business_owner',
        post_type: 'offer',
        title: '[AUTOTEST] Boutique Saree',
        description: 'Automated boutique test post — safe to delete',
        service_category: 'Boutique',
        zip_code: '75001',
        contact_email: testEmail,
        price: 5000,           // $50.00 in cents
        in_stock: 3,
        delivery_timeline: '5-7 business days',
        shipping_charge_cents: 1000,
        post_payment_method: 'zelle',
        post_payment_info: 'test@zelle.com',
        phone_number: '',
      });
    expect(postRes.status).toBe(201);
    postId = postRes.body.post?.id;
  });

  afterAll(async () => {
    await cleanupUser(testEmail);
  });

  test('photo uploads to Boutique post successfully', async () => {
    const res = await uploadPhoto(token, postId);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.photoUrl).toBe('string');
    expect(res.body.photoUrl).toContain('http');
  });

  test('Boutique post with photo visible in search results', async () => {
    const res = await request(app)
      .get('/api/service-posts')
      .query({ service_category: 'Boutique', zip_code: '75001' });
    expect(res.status).toBe(200);
    const found = res.body.posts?.find((p: any) => p.id === postId);
    expect(found).toBeDefined();
  });

  test('Boutique post has correct payment fields', async () => {
    const res = await request(app)
      .get(`/api/service-posts/${postId}`);
    expect(res.status).toBe(200);
    const post = res.body.post ?? res.body;
    expect(post.service_category).toBe('Boutique');
    expect(post.post_payment_method).toBe('zelle');
    expect(post.in_stock).toBeGreaterThan(0);
  });
});
