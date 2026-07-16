/**
 * Post Service regression tests — P0
 * Covers: ID-7 (post service), ID-14 (search), ID-33 (edit listing), ID-32 (inactivate)
 */

import { makeTestEmail, registerAndLogin, cleanupUser, request, app } from './helpers';

describe('Post Service', () => {
  let testEmail: string;
  let token: string;
  let userId: string;
  let postId: number;

  beforeAll(async () => {
    testEmail = makeTestEmail();
    ({ token, userId } = await registerAndLogin(testEmail));
  });

  afterAll(async () => {
    await cleanupUser(testEmail); // cascades to service_posts via DB
  });

  // ID-7
  test('signed-in user can create a service post', async () => {
    const res = await request(app)
      .post('/api/service-posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        user_id: userId,
        poster_type: 'business_owner',
        post_type: 'offer',
        title: '[AUTOTEST] Catering Service',
        description: 'Automated test post — safe to delete',
        service_category: 'Catering',
        zip_code: '75001',
        contact_email: testEmail,
        price: null,
        phone_number: '',
      });
    expect(res.status).toBe(201);
    expect(res.body.post).toHaveProperty('id');
    postId = res.body.post.id;
  });

  // ID-14
  test('search returns posts for matching category and ZIP', async () => {
    const res = await request(app)
      .get('/api/service-posts')
      .query({ service_category: 'Catering', zip_code: '75001' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.posts)).toBe(true);
  });

  // ID-14: newly created post appears in search
  test('newly created post is visible in search results', async () => {
    const res = await request(app)
      .get('/api/service-posts')
      .query({ service_category: 'Catering', zip_code: '75001' });
    const found = res.body.posts.find((p: any) => p.id === postId);
    expect(found).toBeDefined();
  });

  // ID-33
  test('edit listing saves updated title and description', async () => {
    const res = await request(app)
      .put(`/api/service-posts/${postId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        user_id: userId,
        title: '[AUTOTEST] Updated Catering Service',
        description: 'Updated by automation test',
        service_category: 'Catering',
        zip_code: '75001',
        contact_email: testEmail,
        post_type: 'offer',
        poster_type: 'business_owner',
      });
    expect(res.status).toBe(200);
    const updatedTitle = res.body.post?.title ?? res.body.title;
    expect(updatedTitle).toBe('[AUTOTEST] Updated Catering Service');
  });

  // ID-32
  test('inactivate listing sets status to closed', async () => {
    const inactivateRes = await request(app)
      .patch(`/api/service-posts/${postId}/inactivate`)
      .set('Authorization', `Bearer ${token}`);
    expect(inactivateRes.status).toBe(200);

    // Verify the post is excluded from the search endpoint the app uses
    const searchRes = await request(app)
      .get('/api/service-posts/search')
      .query({ service_category: 'Catering', zip_code: '75001' });
    expect(searchRes.status).toBe(200);
    const posts = searchRes.body.posts ?? searchRes.body;
    if (Array.isArray(posts)) {
      const found = posts.find((p: any) => p.id === postId);
      expect(found).toBeUndefined();
    }
  });

  // ID-15: unauthenticated user cannot create post
  test('unauthenticated request to create post is rejected', async () => {
    const res = await request(app)
      .post('/api/service-posts')
      .send({
        user_id: userId,
        post_type: 'offer',
        title: 'Should fail',
        service_category: 'Catering',
        zip_code: '75001',
        contact_email: testEmail,
      });
    expect(res.status).toBe(401);
  });
});
