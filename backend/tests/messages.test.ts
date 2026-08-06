/**
 * Messages regression tests — ID-34, ID-54, ID-61
 * Rows 42-43 in regression CSV
 */

import { makeTestEmail, registerAndLogin, cleanupUser, request, app } from './helpers';
import { supabase } from '../config/Supabase';

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

// [Corrected] ID-54's original scenario says the notification email should contain the
// message's actual content. It doesn't — sendSmartNotification() (below, in messages.ts)
// sends a generic "you have a new message" notice by design and never includes the raw
// text. Confirmed with the user this is the intended behavior, not a bug — this test
// verifies the *real* current behavior (an email attempt is triggered), not the original
// scenario's stated expectation of message content appearing in the email.
describe('Message Email Notifications (ID-54)', () => {
  let userAEmail: string, userAToken: string, userAId: string;
  let userBEmail: string, userBToken: string, userBId: string;

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

  test('sending a message triggers a notification email attempt to the receiver', async () => {
    const { data: before } = await supabase
      .from('users').select('last_email_sent_at').eq('user_id', userBId).single();

    const res = await request(app)
      .post('/messages')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ sender_id: userAId, receiver_id: userBId, message_text: 'ID-54 email trigger test' });
    expect(res.status).toBe(201);

    // sendSmartNotification() is fired non-blocking after the response is sent.
    await new Promise(r => setTimeout(r, 800));

    const { data: after } = await supabase
      .from('users').select('last_email_sent_at').eq('user_id', userBId).single();
    expect(after?.last_email_sent_at).toBeTruthy();
    expect(after?.last_email_sent_at).not.toBe(before?.last_email_sent_at);
  });
});

// ID-61 — Smart Email Notifications: verifies the timing/cooldown/batching logic in
// sendSmartNotification() (messages.ts) via its last_email_sent_at / last_seen_at side
// effects, since the actual email send is mocked at the Resend client level (see
// jest.setup.ts) and never reaches a real inbox to inspect directly.
describe('Smart Email Notifications (ID-61)', () => {
  let userAEmail: string, userAToken: string, userAId: string;
  let userBEmail: string, userBToken: string, userBId: string;

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

  test('first unread message sends a notification email immediately', async () => {
    const res = await request(app)
      .post('/messages')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ sender_id: userAId, receiver_id: userBId, message_text: 'first message' });
    expect(res.status).toBe(201);

    await new Promise(r => setTimeout(r, 800));

    const { data } = await supabase
      .from('users').select('last_email_sent_at').eq('user_id', userBId).single();
    expect(data?.last_email_sent_at).toBeTruthy();
  });

  test('a second unread message within the same hour does not send another email (cooldown)', async () => {
    const { data: before } = await supabase
      .from('users').select('last_email_sent_at').eq('user_id', userBId).single();

    const res = await request(app)
      .post('/messages')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ sender_id: userAId, receiver_id: userBId, message_text: 'second message, should be batched not emailed' });
    expect(res.status).toBe(201);

    await new Promise(r => setTimeout(r, 800));

    const { data: after } = await supabase
      .from('users').select('last_email_sent_at').eq('user_id', userBId).single();
    expect(after?.last_email_sent_at).toBe(before?.last_email_sent_at);
  });

  test('no email is sent while the receiver is actively viewing the chat', async () => {
    // Simulate the receiver having the chat open right now, and clear the previous
    // tests' timestamp so a stale value can't produce a false pass.
    await supabase.from('users')
      .update({ last_seen_at: new Date().toISOString(), last_email_sent_at: null })
      .eq('user_id', userBId);

    const res = await request(app)
      .post('/messages')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ sender_id: userAId, receiver_id: userBId, message_text: 'active user guard test' });
    expect(res.status).toBe(201);

    await new Promise(r => setTimeout(r, 800));

    const { data } = await supabase
      .from('users').select('last_email_sent_at').eq('user_id', userBId).single();
    expect(data?.last_email_sent_at).toBeFalsy();
  });
});
