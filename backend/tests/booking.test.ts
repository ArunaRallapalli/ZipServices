/**
 * Booking regression tests — ID-19 to ID-24
 * Rows 27-32 in regression CSV
 */

import { makeTestEmail, registerAndLogin, cleanupUser, request, app } from './helpers';

// Use a future date so it doesn't conflict with real bookings
function futureDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

describe('Booking Flow (ID-19 to ID-24)', () => {
  let providerEmail: string;
  let providerToken: string;
  let providerUserId: string;

  let customerEmail: string;
  let customerToken: string;
  let customerUserId: string;

  let bookingId: string;
  let bookingDate: string;

  beforeAll(async () => {
    providerEmail = makeTestEmail();
    customerEmail = makeTestEmail();

    const p = await registerAndLogin(providerEmail);
    providerToken = p.token; providerUserId = p.userId;

    const c = await registerAndLogin(customerEmail);
    customerToken = c.token; customerUserId = c.userId;

    bookingDate = futureDate();
  });

  afterAll(async () => {
    await Promise.all([cleanupUser(providerEmail), cleanupUser(customerEmail)]);
  });

  // Row 22: customer books a future date
  test('customer can book a future date with a provider', async () => {
    const res = await request(app)
      .post('/api/availability/book')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceProviderId: providerUserId,
        customerId: customerUserId,
        bookingDate,
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('booking');
    bookingId = String(res.body.booking?.booking_id ?? res.body.booking_id);
  });

  // Row 27: provider can confirm booking
  test('provider can confirm a booking', async () => {
    const res = await request(app)
      .patch(`/api/availability/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
  });

  // Row 24: provider can mark booking as completed
  test('provider can mark booking as completed', async () => {
    const res = await request(app)
      .patch(`/api/availability/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
  });

  // Row 19: customer cannot book as another user
  test('customer cannot create booking impersonating another user', async () => {
    const res = await request(app)
      .post('/api/availability/book')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceProviderId: providerUserId,
        customerId: providerUserId,
        bookingDate: futureDate(),
      });
    expect(res.status).toBe(403);
  });

  // Row 21: provider can cancel a booking
  test('provider can cancel a new booking', async () => {
    // Use a date 2 years out to avoid collision with the already-booked bookingDate
    const cancelDate = new Date();
    cancelDate.setFullYear(cancelDate.getFullYear() + 2);
    const cancelDateStr = cancelDate.toISOString().split('T')[0];
    // Create a fresh booking to cancel
    const bookRes = await request(app)
      .post('/api/availability/book')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceProviderId: providerUserId,
        customerId: customerUserId,
        bookingDate: cancelDateStr,
      });
    const newBookingId = String(bookRes.body.booking?.booking_id ?? bookRes.body.booking_id);

    const cancelRes = await request(app)
      .patch(`/api/availability/bookings/${newBookingId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'cancelled' });
    expect(cancelRes.status).toBe(200);
  });

  // Row 23: provider can block a date
  test('provider can block a date for vacation', async () => {
    const blockDate = new Date();
    blockDate.setFullYear(blockDate.getFullYear() + 2);
    const dateStr = blockDate.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/availability')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ userId: providerUserId, dates: [dateStr], isAvailable: false });
    expect([200, 201]).toContain(res.status);
  });

  // Unauthenticated booking rejected
  test('unauthenticated booking is rejected', async () => {
    const res = await request(app)
      .post('/api/availability/book')
      .send({ serviceProviderId: providerUserId, customerId: customerUserId, bookingDate });
    expect(res.status).toBe(401);
  });

  // Invalid status rejected
  test('invalid booking status update is rejected', async () => {
    const res = await request(app)
      .patch(`/api/availability/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'invalid_status' });
    expect(res.status).toBe(400);
  });
});
