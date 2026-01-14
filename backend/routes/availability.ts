/**
 * ============================================================================
 * AVAILABILITY & BOOKING ROUTES
 * ============================================================================
 * 
 * Last Updated: January 9, 2026
 * Changes: Added JWT authentication and authorization middleware
 * Reason: Protect sensitive booking and availability data from unauthorized access
 * 
 * This module handles all availability and booking-related endpoints including:
 * - Provider availability calendar management
 * - Customer booking appointments
 * - Booking status updates (confirm, cancel, complete)
 * - Email notifications for new bookings
 * 
 * SECURITY:
 * - ✅ PROTECTED routes require JWT authentication
 * - ✅ Authorization enforced (users can only manage their own data)
 * - ⚠️  Some routes allow viewing but restrict modifications
 * 
 * BASE PATH: /api/availability
 * ============================================================================
 */

import express from 'express';
import { supabase } from '../config/Supabase';
import { sendBookingNotification } from '../services/emailServices';
// ADDED: January 5, 2026 - Import authentication middleware for route protection
import { authenticateToken, authorizeUser, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ============================================================================
// AVAILABILITY ENDPOINTS
// ============================================================================

/**
 * GET /api/availability/:userId
 * 
 * Purpose: Get availability calendar for a service provider
 * 
 * Security:
 * - ⚠️  PUBLIC (for now) - Customers need to see provider availability
 * - 🔄 TODO: Consider making this public OR require authentication
 * 
 * Query Parameters:
 * - startDate: Optional start date (defaults to today)
 * - endDate: Optional end date (defaults to 30 days from now)
 * 
 * Returns: Array of availability records for the date range
 * 
 * Note: This is intentionally public so customers can view provider calendars.
 * If you want to restrict this, add authenticateToken middleware.
 * 
 * UNCHANGED: January 5, 2026 - Kept public for customer browsing
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(`📅 Fetching availability for user ${userId}`);

    // Default to next 30 days if not specified
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
// Fetch availability records
    const { data: availabilityData, error: availabilityError } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });

    if (availabilityError) {
      console.error('❌ Error fetching availability:', availabilityError);
      throw availabilityError;
    }

    // ✅ ADDED: Also fetch bookings for this provider
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('booking_id, booking_date, status, customer_user_id')
      .eq('provider_user_id', userId)
      .gte('booking_date', start)
      .lte('booking_date', end)
      .order('booking_date', { ascending: true });

    if (bookingsError) {
      console.error('⚠️ Warning: Error fetching bookings:', bookingsError);
      // Don't fail the request, just return empty bookings
    }

    // Convert bigint IDs to numbers for JSON
    const bookings = (bookingsData || []).map((booking: any) => ({
      booking_id: parseInt(booking.booking_id, 10),
      booking_date: booking.booking_date,
      status: booking.status,
      customer_user_id: parseInt(booking.customer_user_id, 10)
    }));

    console.log(`✅ Found ${availabilityData?.length || 0} availability records`);
    console.log(`✅ Found ${bookings.length} bookings`);

    // ✅ FIXED: Return both availability AND bookings
    res.json({ 
      success: true, 
      availability: availabilityData || [],
      bookings: bookings
    });
    
  } catch (error) {
    console.error('❌ Error in availability GET:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch availability' });
  }
});

/**
 * POST /api/availability
 * 
 * Purpose: Set availability for specific dates (provider only)
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ Provider can only set their own availability
 * 
 * Body:
 * - userId: User ID of the provider
 * - dates: Array of date strings ["2026-01-10", "2026-01-11"]
 * - isAvailable: boolean (true = available, false = blocked)
 * - notes: Optional notes
 * 
 * Note: Uses upsert to update existing records or create new ones
 * 
 * CHANGED: January 5, 2026 - Added authenticateToken middleware
 * CHANGED: January 5, 2026 - Added authorization check to prevent users from setting others' availability
 * Reason: Prevent unauthorized users from modifying provider calendars
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId, dates, isAvailable, notes } = req.body;

    console.log(`📅 Setting availability:`, { userId, dates: dates?.length, isAvailable });

    // Validate input
    if (!userId || !dates || !Array.isArray(dates)) {
      return res.status(400).json({
        success: false,
        error: 'userId and dates array required'
      });
    }

    // FIXED: January 9, 2026 - Convert both values to strings for proper comparison
    // Frontend sends userId as number, but JWT token has user_id as string
    if (String(userId) !== String(req.user?.user_id)) {
      console.log('🔒 ❌ Authorization FAILED - User trying to set availability for different user');
      console.log('  Requested userId:', userId, `(type: ${typeof userId})`);
      console.log('  Authenticated userId:', req.user?.user_id, `(type: ${typeof req.user?.user_id})`);
      return res.status(403).json({
        success: false,
        error: 'You can only set your own availability'
      });
    }

    console.log('✅ Authorization passed - User setting their own availability');

    // Prepare records for upsert
    const records = dates.map(date => ({
      user_id: userId,
      date,
      is_available: isAvailable,
      notes: notes || null,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('availability')
      .upsert(records, { onConflict: 'user_id,date' })
      .select();

    if (error) {
      console.error('❌ Error setting availability:', error);
      throw error;
    }

    console.log(`✅ Set availability for ${data?.length} dates`);
    res.json({ success: true, availability: data });
  } catch (error) {
    console.error('❌ Error in availability POST:', error);
    res.status(500).json({ success: false, error: 'Failed to set availability' });
  }
});

/**
 * DELETE /api/availability/:userId/:date
 * 
 * Purpose: Remove availability override for a specific date
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ User can only delete their own availability records
 * 
 * Use Case: Provider wants to remove a custom availability setting
 * 
 * CHANGED: January 5, 2026 - Added authenticateToken and authorizeUser middleware
 * Reason: Prevent unauthorized deletion of availability records
 */
router.delete('/:userId/:date', authenticateToken, authorizeUser, async (req: AuthRequest, res) => {
  try {
    const { userId, date } = req.params;

    console.log(`📅 Deleting availability for user ${userId} on ${date}`);

    const { error } = await supabase
      .from('availability')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);

    if (error) {
      console.error('❌ Error deleting availability:', error);
      throw error;
    }

    console.log(`✅ Deleted availability`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error in availability DELETE:', error);
    res.status(500).json({ success: false, error: 'Failed to delete availability' });
  }
});

// ============================================================================
// BOOKING ENDPOINTS
// ============================================================================

/**
 * POST /api/availability/book
 * 
 * Purpose: Create a new booking appointment
 * 
 * Security:
 * - ✅ Requires authentication (customer must be logged in)
 * - ✅ Validates customer is booking for themselves
 * 
 * Flow:
 * 1. Check if date is available
 * 2. Create booking record
 * 3. Mark date as unavailable
 * 4. Send email notification to provider
 * 
 * Body:
 * - serviceProviderId: Provider's user ID
 * - customerId: Customer's user ID (must match authenticated user)
 * - bookingDate: Date to book (YYYY-MM-DD format)
 * 
 * CHANGED: January 5, 2026 - Added authenticateToken middleware
 * CHANGED: January 5, 2026 - Added check to ensure customer can only book for themselves
 * Reason: Prevent impersonation attacks where users book appointments using other users' IDs
 */
router.post('/book', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { serviceProviderId, customerId, bookingDate } = req.body;

    console.log(`📅 [Booking] Creating booking:`, {
      providerUserId: serviceProviderId,
      customerUserId: customerId,
      bookingDate
    });

    // Validate required fields
    if (!serviceProviderId || !customerId || !bookingDate) {
      return res.status(400).json({
        success: false,
        error: 'serviceProviderId, customerId, and bookingDate are required'
      });
    }
// ✅ FIXED: Convert both to strings for comparison
if (String(customerId) !== String(req.user?.user_id)) {
  console.log('🔒 ❌ Authorization FAILED - customerId mismatch');
  console.log('  Provided customerId:', customerId, `(type: ${typeof customerId})`);
  console.log('  Token user_id:', req.user?.user_id, `(type: ${typeof req.user?.user_id})`);
  return res.status(403).json({
    success: false,
    error: 'You can only create bookings for yourself'
  });
}

    // Check if the date is available
    const { data: availabilityData, error: availabilityError } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', serviceProviderId)
      .eq('date', bookingDate)
      .single();

    if (availabilityError && availabilityError.code !== 'PGRST116') {
      console.error('❌ [Booking] Error checking availability:', availabilityError);
      throw availabilityError;
    }

    // If availability record exists and is marked unavailable, reject booking
    if (availabilityData && !availabilityData.is_available) {
      return res.status(400).json({
        success: false,
        error: 'This date is not available for booking'
      });
    }

    // Create the booking
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        provider_user_id: serviceProviderId,
        customer_user_id: customerId,
        booking_date: bookingDate,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (bookingError) {
      console.error('❌ [Booking] Error creating booking:', bookingError);
      throw bookingError;
    }

    // Mark the date as unavailable
    const { error: updateError } = await supabase
      .from('availability')
      .upsert({
        user_id: serviceProviderId,
        date: bookingDate,
        is_available: false,
        notes: `Booked by user ${customerId}`,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,date' });

    if (updateError) {
      console.error('⚠️ [Booking] Warning: Could not update availability:', updateError);
    }

    // Get provider details for email notification
    const { data: providerData, error: providerError } = await supabase
      .from('users')
      .select('email, full_name, business_owners(business_name)')
      .eq('user_id', serviceProviderId)
      .single();

    if (providerError) {
      console.error('⚠️ [Booking] Warning: Could not fetch provider details:', providerError);
    }

    // Get customer details for email notification
    const { data: customerData, error: customerError } = await supabase
      .from('users')
      .select('full_name, business_owners(business_name)')
      .eq('user_id', customerId)
      .single();

    if (customerError) {
      console.error('⚠️ [Booking] Warning: Could not fetch customer details:', customerError);
    }

    // Send email notification to provider
    let emailSent = false;
    if (providerData && customerData) {
      const emailResult = await sendBookingNotification({
        providerEmail: providerData.email,
        providerName: providerData.business_owners?.[0]?.business_name || providerData.full_name || 'Provider',
        customerName: customerData.business_owners?.[0]?.business_name || customerData.full_name || 'Customer',
        bookingDate: bookingDate,
        bookingId: parseInt(bookingData.booking_id, 10)
      });

      emailSent = emailResult.success;
      console.log('📧 [Booking] Email notification result:', emailResult);
    }

    // Convert bigint IDs to numbers for JSON response
    const booking = {
      ...bookingData,
      booking_id: parseInt(bookingData.booking_id, 10),
      provider_user_id: parseInt(bookingData.provider_user_id, 10),
      customer_user_id: parseInt(bookingData.customer_user_id, 10)
    };

    console.log(`✅ [Booking] Booking created successfully:`, booking);
    // ✅ NEW: Send system message to provider's chat
try {
  const { error: messageError } = await supabase
    .from('messages')
    .insert({
      sender_id: customerId,
      receiver_id: serviceProviderId,
      message_text: `🔔 New booking request for ${bookingDate}. Check your calendar to confirm!`,
      is_read: false,
      created_at: new Date().toISOString()
    });

  if (messageError) {
    console.error('⚠️ [Booking] Could not send chat notification:', messageError);
  } else {
    console.log('✅ [Booking] Chat notification sent to provider');
  }
} catch (msgError) {
  console.error('⚠️ [Booking] Error sending chat message:', msgError);
}
    res.json({
      success: true,
      booking,
      emailSent
    });
  } catch (error) {
    console.error('❌ [Booking] Error in booking POST:', error);
    res.status(500).json({ success: false, error: 'Failed to create booking' });
  }
});

/**
 * GET /api/availability/bookings/:userId
 * 
 * Purpose: Get all bookings for a service provider
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ Provider can only view their own bookings
 * 
 * Returns: Array of bookings with customer information
 * 
 * Use Case: Provider views their booking calendar
 * 
 * CHANGED: January 5, 2026 - Added authenticateToken and authorizeUser middleware
 * Reason: Prevent users from viewing other providers' customer lists and booking details
 */
router.get('/bookings/:userId', authenticateToken, authorizeUser, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    console.log(`📅 [Bookings] Fetching bookings for provider ${userId}`);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:users!bookings_customer_user_id_fkey(
          email,
          business_owners(business_name, phone_number)
        )
      `)
      .eq('provider_user_id', userId)
      .order('booking_date', { ascending: true });

    if (error) throw error;

    // Convert bigint IDs and format data
    const bookings = (data || []).map((booking: any) => ({
      booking_id: parseInt(booking.booking_id, 10),
      provider_user_id: parseInt(booking.provider_user_id, 10),
      customer_user_id: parseInt(booking.customer_user_id, 10),
      booking_date: booking.booking_date,
      status: booking.status,
      notes: booking.notes,
      created_at: booking.created_at,
      customer_name: booking.customer?.business_owners?.[0]?.business_name || booking.customer?.email,
      customer_phone: booking.customer?.business_owners?.[0]?.phone_number,
      customer_email: booking.customer?.email
    }));

    console.log(`✅ [Bookings] Found ${bookings.length} bookings for provider ${userId}`);

    res.json({ success: true, bookings });
  } catch (error) {
    console.error('❌ [Bookings] Error fetching provider bookings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
});

/**
 * PATCH /api/availability/bookings/:bookingId
 * 
 * Purpose: Update booking status (provider only)
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ Only the provider who owns the booking can update it
 * 
 * Status Options:
 * - 'confirmed': Provider confirms the pending booking
 * - 'cancelled': Provider cancels booking (date becomes available again)
 * - 'completed': Provider marks service as completed
 * 
 * Body:
 * - status: "confirmed" | "cancelled" | "completed"
 * 
 * Side Effects:
 * - If cancelled: Date is marked as available again
 * 
 * CHANGED: January 5, 2026 - Added authenticateToken middleware
 * CHANGED: January 5, 2026 - Added ownership check before allowing status update
 * Reason: Prevent users from cancelling or modifying bookings they don't own
 */
router.patch('/bookings/:bookingId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    console.log(`📅 [Booking] Updating booking ${bookingId} to status: ${status}`);

    // Validate status
    if (!status || !['confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: confirmed, cancelled, or completed'
      });
    }

    // ADDED: January 5, 2026 - Check if this booking belongs to the authenticated user
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('provider_user_id')
      .eq('booking_id', bookingId)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // ADDED: January 5, 2026 - Security check: Only the provider can update their booking
    if (existingBooking.provider_user_id.toString() !== req.user?.user_id) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own bookings'
      });
    }

    // Update booking status in database
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .select()
      .single();

    if (error) throw error;
   // ✅ NEW: Send system message to customer when status changes
try {
  let chatMessage = '';
  
  if (status === 'confirmed') {
    const bookingDate = data.booking_date.split('T')[0];
    chatMessage = `✅ Your booking for ${bookingDate} has been confirmed! See you then!`;
  } else if (status === 'completed') {
    chatMessage = `🎉 Your service has been completed! Please leave a review on the search page. Thank you!`;
  } else if (status === 'cancelled') {
    const bookingDate = data.booking_date.split('T')[0];
    chatMessage = `❌ Your booking for ${bookingDate} has been cancelled by the provider.`;
  }

  if (chatMessage) {
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: data.provider_user_id,
        receiver_id: data.customer_user_id,
        message_text: chatMessage,
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (messageError) {
      console.error('⚠️ [Booking] Could not send chat notification:', messageError);
    } else {
      console.log(`✅ [Booking] Chat notification sent to customer (status: ${status})`);
    }
  }
} catch (msgError) {
  console.error('⚠️ [Booking] Error sending chat message:', msgError);
}
    // If cancelled, mark the date as available again
    if (status === 'cancelled' && data) {
      const bookingDate = data.booking_date.split('T')[0];
      await supabase
        .from('availability')
        .upsert({
          user_id: data.provider_user_id,
          date: bookingDate,
          is_available: true,
          notes: 'Booking cancelled',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,date' });

      console.log(`✅ [Booking] Date ${bookingDate} marked as available again`);
    }

    console.log(`✅ [Booking] Booking ${bookingId} updated to ${status}`);
    res.json({ success: true, booking: data });
  } catch (error) {
    console.error('❌ [Booking] Error updating booking:', error);
    res.status(500).json({ success: false, error: 'Failed to update booking' });
  }
});

export default router;