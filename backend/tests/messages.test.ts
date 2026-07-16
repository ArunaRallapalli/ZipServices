/**
 * Messages regression tests — ID-34
 * Rows 42-43 in regression CSV
 */

import { makeTestEmail, registerAndLogin, cleanupUser, request, app } from './helpers';

describe('Messages (ID-34)', () => {
  let userAEmail: string;
  let userAToken: string;
  let userAId: string;

  let userBEmail: string;
  let userBToken: string;
  let userBId: string;

  beforeAll(async () => {
    userAEmail = makeTestEmail();
    userBEmail = makeTestEmail();

    const a = await registerAndLogin(userAEmail);
    userAToken = a.token; userAId = a.userId;

    const b = await registerAndLogin(userBEmail);
    userBToken = b.token; userBId = b.userId;
  });

  afterAll(async () => {
    await Promise.all([cleanupUser(userAEmail), cleanupUser(userBEmail)]);
  });

  // Row 42: user can send a message
  test('user A can send a message to user B', async () => {
    const res = await request(app)
      .post('/messages')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        sender_id: userAId,
        receiver_id: userBId,
        message_text: 'Automated test message — safe to delete',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.message_text).toBe('Automated test message — safe to delete');
  });

  // Row 42: user B can reply
  test('user B can reply to user A', async () => {
    const res = await request(app)
      .post('/messages')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        sender_id: userBId,
        receiver_id: userAId,
        message_text: 'Automated test reply — safe to delete',
      });
    expect(res.status).toBe(201);
  });

  // Row 42: can fetch conversation
  test('user can fetch their conversation', async () => {
    const res = await request(app)
      .get(`/messages/${userAId}/${userBId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // Security: cannot send message as another user
  test('user cannot send a message impersonating another user', async () => {
    const res = await request(app)
      .post('/messages')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        sender_id: userBId,
        receiver_id: userAId,
        message_text: 'Impersonation attempt',
      });
    expect(res.status).toBe(403);
  });

  // Row 42: unauthenticated message rejected
  test('unauthenticated message send is rejected', async () => {
    const res = await request(app)
      .post('/messages')
      .send({ sender_id: userAId, receiver_id: userBId, message_text: 'No auth' });
    expect(res.status).toBe(401);
  });

  // Row 42: missing fields rejected
  test('message with missing fields is rejected', async () => {
    const res = await request(app)
      .post('/messages')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ sender_id: userAId });
    expect(res.status).toBe(400);
  });
});
