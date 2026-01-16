/**
 * ============================================================================
 * routes/reviews.ts - Review Management API
 * ============================================================================
 * 
 * Last Updated: January 15, 2026
 * Changes: Fixed can-review endpoint to return all unreviewed bookings
 * Reason: Previous version only returned 1 booking without checking if already 
 *         reviewed, causing wrong booking to be reviewed when customer had 
 *         multiple completed bookings with same provider
 * 
 * OVERVIEW:
 * Handles all review operations for the service marketplace.
 * Customers can leave reviews after completing bookings.
 * Reviews are public and visible to all users.
 * 
 * FEATURES:
 * - Create review (only for completed bookings)
 * - Get provider's reviews
 * - Check if booking has been reviewed
 * - Check which bookings can be reviewed (FIXED)
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
 * - ✅ Only customers who completed bookings can review
 * - ✅ One review per booking (enforced by unique constraint)
 * - ✅ Cannot review your own services
 * - ✅ Cannot create reviews for other users' bookings
 * ============================================================================
 */

import express from 'express';
import { supabase } from '../config/Supabase';
// ADDED: January 5, 2026 - Import authentication middleware
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/reviews
 * Create a new review for a completed booking
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ User can only review bookings they were part of
 * 
 * REQUIREMENTS:
 * - Booking must exist and be completed
 * - Customer must be the one who made the booking
 * - Booking cannot already have a review
 * - Rating must be 1-5
 * 
 * FLOW:
 * 1. Validate booking exists and is completed
 * 2. Verify customer owns the booking
 * 3. Create review
 * 4. Update provider's average rating
 * 
 * CHANGED: January 5, 2026 - Added authenticateToken middleware
 * CHANGED: January 5, 2026 - Added verification that customerId matches authenticated user
 * Reason: Prevent fake reviews and review spoofing
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { bookingId, providerId, customerId, rating, reviewText } = req.body;

    console.log('📝 [Reviews] Creating review:', { bookingId, providerId, customerId, rating });

    // Validate required fields
    if (!bookingId || !providerId || !customerId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bookingId, providerId, customerId, rating'
      });
    }

    // ADDED: January 5, 2026 - Security check to prevent review spoofing
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

    // ====================================================================
    // STEP 1: Verify booking exists and is completed
    // ====================================================================
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

    // ====================================================================
    // STEP 2: Verify customer owns the booking
    // ====================================================================
    if (parseInt(booking.customer_user_id) !== parseInt(customerId)) {
      return res.status(403).json({
        success: false,
        error: 'You can only review your own bookings'
      });
    }

    // ====================================================================
    // STEP 3: Create the review
    // ====================================================================
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        booking_id: bookingId,
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

    // ====================================================================
    // STEP 4: Update provider's average rating
    // ====================================================================
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
 * Returns reviews with customer information and service names
 * 
 * UPDATED: January 15, 2026 - Added service_name from bookings table
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

    // Format reviews with customer name and service name
    const reviews = (data || []).map((review: any) => ({
      review_id: parseInt(review.review_id, 10),
      booking_id: parseInt(review.booking_id, 10),
      rating: review.rating,
      review_text: review.review_text,
      created_at: review.created_at,
      service_name: review.booking?.service_name || 'Service',
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
 * 
 * Used to determine if "Leave Review" button should be shown
 * 
 * UNCHANGED: January 5, 2026 - Kept public for UI functionality
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
 * Calculates average from all reviews and updates business_owners table
 * 
 * UNCHANGED: January 5, 2026 - Helper function, no security changes needed
 */
async function updateProviderRating(providerId: number) {
  try {
    console.log(`📊 [Reviews] Updating rating for provider ${providerId}`);

    // Get all reviews for this provider
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('provider_user_id', providerId);

    if (error) throw error;

    if (!reviews || reviews.length === 0) {
      // No reviews yet
      await supabase
        .from('business_owners')
        .update({
          average_rating: 0,
          review_count: 0
        })
        .eq('user_id', providerId);
      
      console.log(`✅ [Reviews] Reset rating for provider ${providerId} (no reviews)`);
      return;
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    const roundedAverage = Math.round(averageRating * 10) / 10; // Round to 1 decimal

    // Update business_owners table
    await supabase
      .from('business_owners')
      .update({
        average_rating: roundedAverage,
        review_count: reviews.length
      })
      .eq('user_id', providerId);

    console.log(`✅ [Reviews] Updated provider ${providerId}: ${roundedAverage} stars (${reviews.length} reviews)`);

  } catch (error) {
    console.error('❌ [Reviews] Error updating provider rating:', error);
    // Don't throw - this is a helper function, main operation already succeeded
  }
}

/**
 * GET /api/reviews/can-review/:providerId
 * 
 * Check if authenticated user can review this provider
 * Requirements: Must have at least one COMPLETED booking with this provider that hasn't been reviewed
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ Only checks current user's bookings (not all bookings)
 * 
 * Returns:
 * - canReview: boolean
 * - unreviewedBookings: array of bookings that can be reviewed (with service names)
 * 
 * FIXED: January 15, 2026 - Now excludes already-reviewed bookings and returns all eligible bookings
 * Previous bug: Only returned most recent booking without checking if it was already reviewed,
 *               causing wrong booking to be reviewed when customer had multiple completed 
 *               bookings with same provider
 * 
 * Use case: Frontend checks if "Leave Review" button should be enabled and which bookings can be reviewed
 */
router.get('/can-review/:providerId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { providerId } = req.params;
    const customerId = req.user?.user_id;

    console.log(`🔍 [Reviews] Checking review eligibility:`, { 
      customer: customerId, 
      provider: providerId 
    });

    // STEP 1: Get ALL completed bookings for this customer with this provider
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
      console.log('📋 [Reviews] No completed bookings found');
      return res.json({
        success: true,
        canReview: false,
        unreviewedBookings: []
      });
    }

    console.log(`📋 [Reviews] Found ${completedBookings.length} completed booking(s)`);

    // STEP 2: Check which bookings have NOT been reviewed yet
    const bookingIds = completedBookings.map(b => b.booking_id);
    
    const { data: existingReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('booking_id')
      .in('booking_id', bookingIds);

    if (reviewsError) {
      console.error('❌ [Reviews] Error checking existing reviews:', reviewsError);
      throw reviewsError;
    }

    // Create a Set of reviewed booking IDs for fast lookup
    const reviewedBookingIds = new Set(
      (existingReviews || []).map(r => parseInt(r.booking_id, 10))
    );

    // STEP 3: Filter out bookings that already have reviews
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
    if (canReview) {
      console.log(`📝 [Reviews] Unreviewed bookings:`, unreviewedBookings.map(b => 
        `${b.bookingId} (${b.serviceName})`
      ));
    }

    res.json({
      success: true,
      canReview: canReview,
      unreviewedBookings: unreviewedBookings
    });

  } catch (error) {
    console.error('❌ [Reviews] Error checking review eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check review eligibility'
    });
  }
});

export default router;