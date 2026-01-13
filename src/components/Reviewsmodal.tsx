/**
 * ============================================================================
 * ReviewsModal.tsx - Provider Reviews & Write Review Modal
 * ============================================================================
 * 
 * Last Updated: January 12, 2026
 * Changes: Fixed review eligibility check to use new can-review endpoint
 * Reason: Previous endpoint caused 403 error when customers tried to check
 *         if they could review a provider
 * 
 * OVERVIEW:
 * Full-screen modal that displays a provider's reviews and allows eligible
 * customers to write reviews. Opened when user taps star ratings on ServiceCard.
 * 
 * FEATURES:
 * - Displays all provider reviews using ReviewsList component
 * - Smart "Write Review" button (only shows if user has completed booking)
 * - Eligibility check: fetches user's completed bookings with this provider
 * - Opens WriteReviewModal for review submission
 * - Prevents duplicate reviews (checks if booking already reviewed)
 * 
 * ELIGIBILITY RULES:
 * - User must be logged in
 * - User must have at least one completed booking with this provider
 * - Booking must not already have a review
 * 
 * USAGE:
 * <ReviewsModal
 *   visible={showReviews}
 *   providerId={432}
 *   providerName="John's Plumbing"
 *   onClose={() => setShowReviews(false)}
 * />
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReviewList from './ReviewList';
import WriteReviewModal from './Writereviewmodal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api'; // ADDED: January 5, 2026

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ReviewsModalProps {
  visible: boolean;
  providerId: number;
  providerName: string;
  onClose: () => void;
}

interface EligibleBooking {
  booking_id: number;
  booking_date: string;
  provider_user_id: number;
  customer_user_id: number;
  hasReview: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ReviewsModal: React.FC<ReviewsModalProps> = ({
  visible,
  providerId,
  providerName,
  onClose,
}) => {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [eligibleBooking, setEligibleBooking] = useState<EligibleBooking | null>(null);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ========================================================================
  // LOAD USER & CHECK ELIGIBILITY
  // ========================================================================
  
  useEffect(() => {
    if (visible) {
      loadUserAndCheckEligibility();
    }
  }, [visible, providerId]);

  /**
   * Load current user and check if they're eligible to leave a review
   */
  const loadUserAndCheckEligibility = async () => {
    try {
      setCheckingEligibility(true);
      
      // Get current user ID
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        setCurrentUserId(null);
        setEligibleBooking(null);
        setCheckingEligibility(false);
        return;
      }

      const uid = parseInt(storedUserId);
      setCurrentUserId(uid);

      // Check if user has completed bookings with this provider
      await checkReviewEligibility(uid);
      
    } catch (error) {
      console.error('Error loading user:', error);
      setEligibleBooking(null);
    } finally {
      setCheckingEligibility(false);
    }
  };

  /**
   * Check if user has any completed bookings with this provider
   * that haven't been reviewed yet
   * 
   * UPDATED: January 12, 2026 - Changed to use /api/reviews/can-review endpoint
   * Previous endpoint: /api/availability/bookings/:providerId (caused 403 error)
   * New endpoint: /api/reviews/can-review/:providerId (checks only current user's eligibility)
   */
  const checkReviewEligibility = async (userId: number) => {
    try {
      console.log(`🔍 Checking review eligibility for user ${userId} with provider ${providerId}`);

      // FIXED: January 12, 2026 - Use new eligibility endpoint instead of fetching all provider bookings
      // This endpoint checks if current user has completed booking with provider
      const eligibilityData = await api.get(`/api/reviews/can-review/${providerId}`);

      if (!eligibilityData.success) {
        console.log('📋 Failed to check eligibility');
        setEligibleBooking(null);
        return;
      }

      // Check if user can review (has completed booking)
      if (!eligibilityData.canReview || !eligibilityData.completedBooking) {
        console.log('📋 User is not eligible to review (no completed bookings)');
        setEligibleBooking(null);
        return;
      }

      const completedBooking = eligibilityData.completedBooking;
      console.log(`✅ Found completed booking: ${completedBooking.bookingId}`);

      // UPDATED: January 12, 2026 - Check if this specific booking already has a review
      const reviewData = await api.get(`/api/reviews/booking/${completedBooking.bookingId}`);

      if (reviewData.success && !reviewData.hasReview) {
        // Found a completed booking without a review!
        console.log(`✅ User is eligible to review booking ${completedBooking.bookingId}`);
        setEligibleBooking({
          booking_id: completedBooking.bookingId,
          booking_date: completedBooking.bookingDate,
          provider_user_id: providerId,
          customer_user_id: userId,
          hasReview: false
        });
      } else {
        console.log('📋 Completed booking already has a review');
        setEligibleBooking(null);
      }

    } catch (error) {
      console.error('❌ Error checking review eligibility:', error);
      setEligibleBooking(null);
    }
  };

  // ========================================================================
  // HANDLERS
  // ========================================================================

  /**
   * Handle successful review submission
   * Refresh the reviews list and close write review modal
   */
  const handleReviewSuccess = () => {
    setShowWriteReview(false);
    setRefreshKey(prev => prev + 1); // Force ReviewsList to refresh
    setEligibleBooking(null); // User no longer eligible (just reviewed)
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Reviews</Text>
            <Text style={styles.providerName}>{providerName}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Reviews List */}
        <ReviewList 
          key={refreshKey}
          providerId={providerId} 
          limit={50} 
        />

        {/* Write Review Button */}
        {checkingEligibility ? (
          <View style={styles.checkingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.checkingText}>Checking eligibility...</Text>
          </View>
        ) : eligibleBooking ? (
          <View style={styles.writeReviewContainer}>
            <TouchableOpacity
              style={styles.writeReviewButton}
              onPress={() => setShowWriteReview(true)}
            >
              <Ionicons name="create" size={20} color="#fff" />
              <Text style={styles.writeReviewButtonText}>Write a Review</Text>
            </TouchableOpacity>
          </View>
        ) : currentUserId ? (
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#999" />
            <Text style={styles.infoText}>
              Complete a booking to leave a review
            </Text>
          </View>
        ) : null}

        {/* Write Review Modal */}
        <WriteReviewModal
          visible={showWriteReview}
          booking={eligibleBooking ? {
            booking_id: eligibleBooking.booking_id,
            provider_user_id: eligibleBooking.provider_user_id,
            customer_user_id: eligibleBooking.customer_user_id,
            booking_date: eligibleBooking.booking_date,
            provider_name: providerName
          } : null}
          onClose={() => setShowWriteReview(false)}
          onSuccess={handleReviewSuccess}
        />
      </SafeAreaView>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  providerName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  checkingText: {
    fontSize: 14,
    color: '#666',
  },
  writeReviewContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  writeReviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default ReviewsModal;