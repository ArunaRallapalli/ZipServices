/**
 * ============================================================================
 * routes/reviews.ts - Review Management API
 * ============================================================================
 * 
 * Last Updated: February 24, 2026
 * Changes: Made bookingId optional in POST /api/reviews
 * Reason: Allow any logged-in customer to leave a review from search results,
 *         not just customers with completed bookings. Both flows supported:
 *         1. From chat after booking completes (bookingId provided)
 *         2. From search/provider profile (bookingId null)
 * 
 * OVERVIEW:
 * Handles all review operations for the service marketplace.
 * Customers can leave reviews after completing bookings.
 * Reviews are public and visible to all users.
 * 
 * FEATURES:
 * - Create review (booking optional)
 * - Get provider's reviews
 * - Check if booking has been reviewed
 * - Check which bookings can be reviewed
 * - Auto-calculate provider's average rating
 * 
 * ENDPOINTS:
 * - POST /api/reviews - Create a new review (PROTECTED)
 * - GET /api/reviews/provider/:providerId - Get all reviews (PUBLIC)
 * - GET /api/reviews/booking/:bookingId - Check if booking has review (PUBLIC)
 * - GET /api/reviews/can-review/:providerId - Get unreviewed bookings (PROTECTED)
 * 
 * SECURITY:
 * - ✅ Authentication required to create reviews
 * - ✅ One review per booking (enforced by unique constraint)
 * - ✅ Cannot review your own services
 * - ✅ Cannot create reviews for other users' bookings
 * ============================================================================
 */

import express from 'express';
import { supabase } from '../config/Supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/reviews
 * Create a new review — booking is now optional
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ If bookingId provided: validates booking is completed and owned by customer
 * - ✅ If no bookingId: skips booking validation (review from search flow)
 * 
 * CHANGED: February 24, 2026 - bookingId is now optional
 * - bookingId provided → existing chat flow, full booking validation runs
 * - bookingId null/missing → new search flow, booking validation skipped
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { bookingId, providerId, customerId, rating, reviewText } = req.body;

    console.log('📝 [Reviews] Creating review:', { bookingId, providerId, customerId, rating });

    // Validate required fields (bookingId is now optional)
    if (!providerId || !customerId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: providerId, customerId, rating'
      });
    }

    // Security check to prevent review spoofing
    if (customerId.toString() !== req.user?.user_id) {
      return res.status(403).json({
        success: false,
        error: 'You can only create reviews as yourself'
      });
    }

    // Validate rating range
if (rating < 1 || rating > 5) {
  return res.status(400).json({
    success: false,
    error: 'Rating must be between 1 and 5'
  });
}

// You cannot review your own services  ← old
if (customerId.toString() === providerId.toString()) {
  return res.status(403).json({
    success: false,
    error: 'This is your post - You cannot provide a review for yourself'  // ← change this
  });
}

    // ====================================================================
    // BOOKING VALIDATION — only runs if bookingId is provided
    // (chat flow after booking completes)
    // Skipped when bookingId is null/missing (search/profile flow)
    // ====================================================================
    if (bookingId) {
      // STEP 1: Verify booking exists and is completed
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (bookingError || !booking) {
        console.error('❌ [Reviews] Booking not found:', bookingError);
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      // Check if booking is completed
      if (booking.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Can only review completed bookings'
        });
      }

      // STEP 2: Verify customer owns the booking
      if (parseInt(booking.customer_user_id) !== parseInt(customerId)) {
        return res.status(403).json({
          success: false,
          error: 'You can only review your own bookings'
        });
      }
    }

    // ====================================================================
    // CREATE THE REVIEW
    // ====================================================================
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        booking_id: bookingId || null,   // null when coming from search flow
        provider_user_id: providerId,
        customer_user_id: customerId,
        rating: rating,
        review_text: reviewText || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (reviewError) {
      console.error('❌ [Reviews] Error creating review:', reviewError);

      // Check for duplicate review
      if (reviewError.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'You have already reviewed this booking'
        });
      }

      throw reviewError;
    }

    console.log('✅ [Reviews] Review created:', review.review_id);

    // Update provider's average rating
    await updateProviderRating(providerId);

    res.status(201).json({
      success: true,
      review: review
    });

  } catch (error) {
    console.error('❌ [Reviews] Error in POST:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create review'
    });
  }
});

/**
 * GET /api/reviews/provider/:providerId
 * Get all reviews for a specific provider
 * 
 * Security: PUBLIC - Anyone can view reviews
 * 
 * UPDATED: January 15, 2026 - Added service_name from bookings table
 * UPDATED: February 24, 2026 - Handle null booking_id (reviews without bookings)
 */
router.get('/provider/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    console.log(`📋 [Reviews] Fetching reviews for provider ${providerId}`);

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
customer:users!reviews_customer_user_id_fkey(
  email,
  business_owners(business_name)
),
        booking:bookings!reviews_booking_id_fkey(
          service_name
        )
      `)
      .eq('provider_user_id', providerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Format reviews — booking may be null for reviews from search flow
    const reviews = (data || []).map((review: any) => ({
      review_id: parseInt(review.review_id, 10),
      booking_id: review.booking_id ? parseInt(review.booking_id, 10) : null,
      rating: review.rating,
      review_text: review.review_text,
      created_at: review.created_at,
      service_name: review.booking?.service_name || 'General Review',
    customer_name: review.customer?.business_owners?.[0]?.business_name ||
               review.customer?.email?.split('@')[0] ||
               'Anonymous'
    }));

    console.log(`✅ [Reviews] Found ${reviews.length} reviews`);

    res.json({
      success: true,
      reviews: reviews
    });

  } catch (error) {
    console.error('❌ [Reviews] Error fetching provider reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews'
    });
  }
});

/**
 * GET /api/reviews/booking/:bookingId
 * Check if a booking has been reviewed
 * 
 * Security: PUBLIC - Used to show/hide "Leave Review" button
 * UNCHANGED
 */
router.get('/booking/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    console.log(`🔍 [Reviews] Checking review for booking ${bookingId}`);

    const { data, error } = await supabase
      .from('reviews')
      .select('review_id, rating, review_text, created_at')
      .eq('booking_id', bookingId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const hasReview = !!data;

    console.log(`✅ [Reviews] Booking ${bookingId} ${hasReview ? 'has' : 'does not have'} review`);

    res.json({
      success: true,
      hasReview: hasReview,
      review: data || null
    });

  } catch (error) {
    console.error('❌ [Reviews] Error checking booking review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check review'
    });
  }
});

/**
 * Helper function to update provider's average rating
 * UNCHANGED
 */
async function updateProviderRating(providerId: number) {
  try {
    console.log(`📊 [Reviews] Updating rating for provider ${providerId}`);

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('provider_user_id', providerId);

    if (error) throw error;

    if (!reviews || reviews.length === 0) {
      await supabase
        .from('business_owners')
        .update({ average_rating: 0, review_count: 0 })
        .eq('user_id', providerId);

      console.log(`✅ [Reviews] Reset rating for provider ${providerId} (no reviews)`);
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    const roundedAverage = Math.round(averageRating * 10) / 10;

    await supabase
      .from('business_owners')
      .update({ average_rating: roundedAverage, review_count: reviews.length })
      .eq('user_id', providerId);

    console.log(`✅ [Reviews] Updated provider ${providerId}: ${roundedAverage} stars (${reviews.length} reviews)`);

  } catch (error) {
    console.error('❌ [Reviews] Error updating provider rating:', error);
  }
}

/**
 * GET /api/reviews/can-review/:providerId
 * Check if authenticated user can review this provider
 * Still used by the chat/booking flow — UNCHANGED
 */
router.get('/can-review/:providerId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { providerId } = req.params;
    const customerId = req.user?.user_id;

    console.log(`🔍 [Reviews] Checking review eligibility:`, {
      customer: customerId,
      provider: providerId
    });

    const { data: completedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('booking_id, booking_date, status, service_name')
      .eq('provider_user_id', providerId)
      .eq('customer_user_id', customerId)
      .eq('status', 'completed')
      .order('booking_date', { ascending: false });

    if (bookingsError) {
      console.error('❌ [Reviews] Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    if (!completedBookings || completedBookings.length === 0) {
      return res.json({ success: true, canReview: false, unreviewedBookings: [] });
    }

    const bookingIds = completedBookings.map(b => b.booking_id);

    const { data: existingReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('booking_id')
      .in('booking_id', bookingIds);

    if (reviewsError) throw reviewsError;

    const reviewedBookingIds = new Set(
      (existingReviews || []).map(r => parseInt(r.booking_id, 10))
    );

    const unreviewedBookings = completedBookings
      .filter(booking => !reviewedBookingIds.has(parseInt(booking.booking_id, 10)))
      .map(booking => ({
        bookingId: parseInt(booking.booking_id, 10),
        bookingDate: booking.booking_date,
        status: booking.status,
        serviceName: booking.service_name || 'Service'
      }));

    const canReview = unreviewedBookings.length > 0;

    console.log(`✅ [Reviews] Found ${unreviewedBookings.length} unreviewed booking(s)`);

    res.json({ success: true, canReview, unreviewedBookings });

  } catch (error) {
    console.error('❌ [Reviews] Error checking review eligibility:', error);
    res.status(500).json({ success: false, error: 'Failed to check review eligibility' });
  }
});

export default router;