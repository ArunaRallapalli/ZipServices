/**
 * ============================================================================
 * AVAILABILITY & BOOKING ROUTES
 * ============================================================================
 * 
 * Last Updated: January 15, 2026
 * Changes: Filter bookings to only return ACTIVE bookings (pending/confirmed)
 * Reason: Cancelled bookings should not appear as "booked" on calendars
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
import { authenticateToken, authorizeUser, AuthRequest } from '../middleware/auth';
import { sendBookingStatusUpdate } from '../services/emailServices';

const router = express.Router();

// ============================================================================
// AVAILABILITY ENDPOINTS
// ============================================================================

/**
 * GET /api/availability/:userId
 * 
 * Purpose: Get availability calendar for a service provider
 * 
 * ✅ FIXED: January 15, 2026 - Only return ACTIVE bookings (pending/confirmed)
 * This prevents cancelled bookings from showing as red dots on customer calendars
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(`📅 Fetching availability for user ${userId}`);

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

    // ✅ FIXED: Only fetch ACTIVE bookings (pending or confirmed)
    // Exclude cancelled and completed bookings from calendar display
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('booking_id, booking_date, status, customer_user_id')
      .eq('provider_user_id', userId)
      .in('status', ['pending', 'confirmed'])  // ✅ FILTER: Only active bookings
      .gte('booking_date', start)
      .lte('booking_date', end)
      .order('booking_date', { ascending: true });

    if (bookingsError) {
      console.error('⚠️ Warning: Error fetching bookings:', bookingsError);
    }

    // Convert bigint IDs to numbers for JSON
    const bookings = (bookingsData || []).map((booking: any) => ({
      booking_id: parseInt(booking.booking_id, 10),
      booking_date: booking.booking_date,
      status: booking.status,
      customer_user_id: parseInt(booking.customer_user_id, 10)
    }));

    console.log(`✅ Found ${availabilityData?.length || 0} availability records`);
    console.log(`✅ Found ${bookings.length} active bookings (pending/confirmed only)`);

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
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId, dates, isAvailable, notes } = req.body;

    console.log(`📅 Setting availability:`, { userId, dates: dates?.length, isAvailable });

    if (!userId || !dates || !Array.isArray(dates)) {
      return res.status(400).json({
        success: false,
        error: 'userId and dates array required'
      });
    }

    if (String(userId) !== String(req.user?.user_id)) {
      console.log('🔒 ❌ Authorization FAILED - User trying to set availability for different user');
      return res.status(403).json({
        success: false,
        error: 'You can only set your own availability'
      });
    }

    console.log('✅ Authorization passed - User setting their own availability');

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
 */
router.post('/book', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { serviceProviderId, customerId, bookingDate } = req.body;

    console.log(`📅 [Booking] Creating booking:`, {
      providerUserId: serviceProviderId,
      customerUserId: customerId,
      bookingDate
    });

    if (!serviceProviderId || !customerId || !bookingDate) {
      return res.status(400).json({
        success: false,
        error: 'serviceProviderId, customerId, and bookingDate are required'
      });
    }

    if (String(customerId) !== String(req.user?.user_id)) {
      console.log('🔒 ❌ Authorization FAILED - customerId mismatch');
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

    // Send system message to provider's chat
    try {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: customerId,
          receiver_id: serviceProviderId,
          message_text: `🔔 New booking request for ${bookingDate}. Go to Calendar in Listings tab to confirm or decline.`,
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

    // Convert bigint IDs to numbers for JSON response
    const booking = {
      ...bookingData,
      booking_id: parseInt(bookingData.booking_id, 10),
      provider_user_id: parseInt(bookingData.provider_user_id, 10),
      customer_user_id: parseInt(bookingData.customer_user_id, 10)
    };

    console.log(`✅ [Booking] Booking created successfully:`, booking);
    
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
 * Note: Returns ALL bookings (including cancelled/completed) for the provider's
 * full booking history view. The calendar filtering happens client-side.
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
/**
 * PATCH /api/availability/bookings/:bookingId
 * 
 * Purpose: Update booking status (provider only)
 */
router.patch('/bookings/:bookingId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    console.log(`📅 [Booking] Updating booking ${bookingId} to status: ${status}`);

    if (!status || !['confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: confirmed, cancelled, or completed'
      });
    }

    // Check if this booking belongs to the authenticated user
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('provider_user_id, booking_date, customer_user_id')
      .eq('booking_id', bookingId)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

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

   // Send system message to customer when status changes
    try {
      let chatMessage = '';
      let messageMetadata: any = null;
      
      if (status === 'confirmed') {
        const bookingDate = data.booking_date.split('T')[0];
        chatMessage = `✅ Your booking for ${bookingDate} has been confirmed! See you then!`;
      } else if (status === 'completed') {
        chatMessage = `🎉 Your service has been completed! Please leave a review. Thank you!`;
        
        messageMetadata = {
          type: 'booking_completed',
          booking_id: parseInt(bookingId, 10),
          provider_user_id: parseInt(data.provider_user_id, 10),
          customer_user_id: parseInt(data.customer_user_id, 10),
          booking_date: data.booking_date
        };
      } else if (status === 'cancelled') {
        const bookingDate = data.booking_date.split('T')[0];
        chatMessage = `❌ Your booking for ${bookingDate} has been cancelled by the provider.`;
      }

      // Send the message with optional metadata
      if (chatMessage) {
        const messageData: any = {
          sender_id: data.provider_user_id,
          receiver_id: data.customer_user_id,
          message_text: chatMessage,
          is_read: false,
          created_at: new Date().toISOString()
        };

        if (messageMetadata) {
          messageData.metadata = messageMetadata;
        }

        const { error: messageError } = await supabase
          .from('messages')
          .insert(messageData);

        if (messageError) {
          console.error('⚠️ [Booking] Could not send chat notification:', messageError);
        } else {
          console.log(`✅ [Booking] Chat notification sent to customer (status: ${status})${messageMetadata ? ' with metadata' : ''}`);
        }
      }
      
      // ✅ SEND EMAIL NOTIFICATION
      // Get customer and provider details for email
      const { data: customerData } = await supabase
        .from('users')
        .select('email, business_owners(business_name)')
        .eq('user_id', data.customer_user_id)
        .single();

      const { data: providerData } = await supabase
        .from('users')
        .select('business_owners(business_name)')
        .eq('user_id', data.provider_user_id)
        .single();

      if (customerData?.email && (status === 'confirmed' || status === 'cancelled' || status === 'completed')) {
        try {
          const emailResult = await sendBookingStatusUpdate({
            customerEmail: customerData.email,
            customerName: customerData.business_owners?.[0]?.business_name || 'Customer',
            providerName: providerData?.business_owners?.[0]?.business_name || 'Service Provider',
            bookingDate: data.booking_date.split('T')[0],
            bookingId: parseInt(bookingId, 10),
            status: status as 'confirmed' | 'cancelled' | 'completed'
          });

          console.log(`📧 [Booking] Email notification sent (${status}):`, emailResult);
        } catch (emailError) {
          console.error('⚠️ [Booking] Email send failed (non-blocking):', emailError);
        }
      }
      
    } catch (msgError) {
      console.error('⚠️ [Booking] Error sending notifications:', msgError);
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