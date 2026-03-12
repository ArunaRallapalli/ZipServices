/**
 * ============================================================================
 * ReviewsModal.tsx - Provider Reviews & Write Review Modal
 * ============================================================================
 * 
 * Last Updated: January 15, 2026
 * Changes: Fixed to handle multiple unreviewed bookings with same provider
 * Reason: Users can have multiple completed bookings with the same provider
 *         (e.g., accounting + dance class from Sai Services). The modal now
 *         lets users select which booking to review if they have multiple.
 * 
 * March 2026: Added guest banner — shows "Sign in to write a review" when
 *             user is not logged in.
 * 
 * OVERVIEW:
 * Full-screen modal that displays a provider's reviews and allows eligible
 * customers to write reviews. Opened when user taps star ratings on ServiceCard.
 * 
 * FEATURES:
 * - Displays all provider reviews using ReviewsList component
 * - Smart "Write Review" button (only shows if user has unreviewed bookings)
 * - Handles multiple unreviewed bookings - lets user select which to review
 * - Eligibility check: fetches user's unreviewed completed bookings
 * - Opens WriteReviewModal for review submission
 * - Prevents duplicate reviews
 * - Guest users see a "Sign in to write a review" banner
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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReviewList from './ReviewList';
import WriteReviewModal from './Writereviewmodal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
// Add after the existing imports
import { useNavigation } from '@react-navigation/native';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ReviewsModalProps {
  visible: boolean;
  providerId: number;
  providerName: string;
  onClose: () => void;
}

interface UnreviewedBooking {
  bookingId: number;
  bookingDate: string;
  status: string;
  serviceName: string;
}

interface BookingForReview {
 booking_id: number | null;
  booking_date: string;
  provider_user_id: number;
  customer_user_id: number;
  provider_name: string;
  service_name: string;
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
  const [unreviewedBookings, setUnreviewedBookings] = useState<UnreviewedBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingForReview | null>(null);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [showBookingSelection, setShowBookingSelection] = useState(false);
 const [refreshKey, setRefreshKey] = useState(0);
const navigation = useNavigation<any>();

  // ========================================================================
  // LOAD USER & CHECK ELIGIBILITY
  // ========================================================================
  
  useEffect(() => {
    if (visible) {
      loadUserAndCheckEligibility();
    } else {
      // Reset state when modal closes
      setSelectedBooking(null);
      setShowBookingSelection(false);
    }
  }, [visible, providerId]);

  /**
   * Load current user and check if they're eligible to leave a review
   */
  const loadUserAndCheckEligibility = async () => {
  try {
    setCheckingEligibility(true);
    const storedUserId = await AsyncStorage.getItem('userId');
    if (!storedUserId) {
      setCurrentUserId(null);
      setCheckingEligibility(false);
      return;
    }
    setCurrentUserId(parseInt(storedUserId));
  } catch (error) {
    console.error('Error loading user:', error);
  } finally {
    setCheckingEligibility(false);
  }
};
  /**
   * Check if user has any unreviewed completed bookings with this provider
   * 
   * UPDATED: January 15, 2026 - Now handles multiple unreviewed bookings
   * Backend returns ALL unreviewed bookings instead of just one
   */
  const checkReviewEligibility = async (userId: number) => {
    try {
       console.log('='.repeat(80));
    console.log('🔥 CHECKING ELIGIBILITY');
    console.log('🔥 User ID:', userId);
    console.log('🔥 Provider ID:', providerId);
    console.log('='.repeat(80));
      console.log(`🔍 Checking review eligibility for user ${userId} with provider ${providerId}`);

      // Get all unreviewed completed bookings
      const eligibilityData = await api.get(`/api/reviews/can-review/${providerId}`);
 console.log('🔥 API RESPONSE:', JSON.stringify(eligibilityData, null, 2));
    console.log('🔥 canReview:', eligibilityData.canReview);
    console.log('🔥 unreviewedBookings:', eligibilityData.unreviewedBookings);
    console.log('='.repeat(80));
      if (!eligibilityData.success) {
        console.log('📋 Failed to check eligibility');
        setUnreviewedBookings([]);
        return;
      }

      // Check if user can review (has unreviewed completed bookings)
      if (!eligibilityData.canReview || !eligibilityData.unreviewedBookings || 
          eligibilityData.unreviewedBookings.length === 0) {
        console.log('📋 User is not eligible to review (no unreviewed completed bookings)');
        setUnreviewedBookings([]);
        return;
      }

      const bookings = eligibilityData.unreviewedBookings;
      console.log(`✅ Found ${bookings.length} unreviewed booking(s):`, 
        bookings.map((b: UnreviewedBooking) => `${b.bookingId} (${b.serviceName})`)
      );

      setUnreviewedBookings(bookings);

    } catch (error) {
      console.error('❌ Error checking review eligibility:', error);
      setUnreviewedBookings([]);
    }
  };

  // ========================================================================
  // HANDLERS
  // ========================================================================

  /**
   * Handle "Write a Review" button press
   * If user has multiple bookings, show selection modal
   * If user has only one booking, directly open write review modal
   */
  const handleWriteReviewPress = () => {
  setSelectedBooking({
    booking_id: null,
    booking_date: new Date().toISOString(),
    provider_user_id: providerId,
    customer_user_id: currentUserId!,
    provider_name: providerName,
    service_name: ''
  });
  setShowWriteReview(true);
};

  /**
   * Handle booking selection from the list
   */
  const handleBookingSelect = (booking: UnreviewedBooking) => {
    setSelectedBooking({
      booking_id: booking.bookingId,
      booking_date: booking.bookingDate,
      provider_user_id: providerId,
      customer_user_id: currentUserId!,
      provider_name: providerName,
      service_name: booking.serviceName
    });
    setShowBookingSelection(false);
    setShowWriteReview(true);
  };

  /**
   * Handle successful review submission
   * Refresh the reviews list and close modals
   */
  const handleReviewSuccess = () => {
    setShowWriteReview(false);
    setSelectedBooking(null);
    setRefreshKey(prev => prev + 1); // Force ReviewsList to refresh
    
    // Refresh eligibility to remove the reviewed booking from the list
    if (currentUserId) {
      checkReviewEligibility(currentUserId);
    }
  };

  /**
   * Handle closing the write review modal
   */
  const handleCloseWriteReview = () => {
    setShowWriteReview(false);
    setSelectedBooking(null);
  };

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  /**
   * Render a single booking item in the selection list
   */
  const renderBookingItem = ({ item }: { item: UnreviewedBooking }) => (
    <TouchableOpacity
      style={styles.bookingItem}
      onPress={() => handleBookingSelect(item)}
    >
      <View style={styles.bookingItemLeft}>
        <Ionicons name="calendar" size={20} color="#4A90E2" />
        <View style={styles.bookingItemText}>
          <Text style={styles.bookingItemService}>{item.serviceName}</Text>
          <Text style={styles.bookingItemDate}>
            {new Date(item.bookingDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <>
      {/* Main Reviews Modal */}
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

          {/* Guest banner — shown above reviews when not logged in */}
       {!checkingEligibility && !currentUserId && (
  <View style={styles.guestBanner}>
    <Ionicons name="lock-closed-outline" size={16} color="#4A90E2" />
    <Text style={styles.guestBannerText}>Sign in to write a review</Text>
    <TouchableOpacity
      onPress={() => {
        onClose();
        navigation.navigate('BusinessOwnerHomeScreen');
      }}
      style={styles.guestSignInButton}
    >
      <Ionicons name="person-circle-outline" size={14} color="#fff" />
      <Text style={styles.guestSignInText}>Sign In</Text>
    </TouchableOpacity>
  </View>
)}

          {/* Reviews List */}
          <ReviewList 
            key={refreshKey}
            providerId={providerId} 
            limit={50} 
          />

          {/* Write Review Button / loading spinner */}
          {checkingEligibility ? (
            <View style={styles.checkingContainer}>
              <ActivityIndicator size="small" color="#4A90E2" />
            </View>
          ) : currentUserId ? (
            <View style={styles.writeReviewContainer}>
              <TouchableOpacity
                style={styles.writeReviewButton}
                onPress={handleWriteReviewPress}
              >
                <Ionicons name="create" size={20} color="#fff" />
                <Text style={styles.writeReviewButtonText}>Write a Review</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Booking Selection Modal (when user has multiple unreviewed bookings) */}
      <Modal
        visible={showBookingSelection}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBookingSelection(false)}
      >
        <View style={styles.selectionBackdrop}>
          <View style={styles.selectionModal}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>Select a Booking to Review</Text>
              <TouchableOpacity onPress={() => setShowBookingSelection(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={unreviewedBookings}
              renderItem={renderBookingItem}
              keyExtractor={(item) => item.bookingId.toString()}
              style={styles.bookingList}
              contentContainerStyle={styles.bookingListContent}
            />
          </View>
        </View>
      </Modal>

      {/* Write Review Modal */}
      <WriteReviewModal
        visible={showWriteReview}
        booking={selectedBooking}
        onClose={handleCloseWriteReview}
        onSuccess={handleReviewSuccess}
      />
    </>
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
  // ← Guest banner (shown at top, above reviews)
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#EBF4FF',
    borderBottomWidth: 1,
    borderBottomColor: '#C7DCFF',
  },
guestBannerText: {
  fontSize: 14,
  color: '#4A90E2',
  fontWeight: '700',
},
guestSignInButton: {
  flexDirection: 'row',
  alignItems: 'center',
  marginLeft: 10,
  paddingHorizontal: 12,
  paddingVertical: 5,
  backgroundColor: '#4A90E2',
  borderRadius: 14,
  gap: 4,
},
guestSignInText: {
  color: '#fff',
  fontSize: 13,
  fontWeight: '700',
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

  // Booking Selection Modal Styles
  selectionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  selectionModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  bookingList: {
    flex: 1,
  },
  bookingListContent: {
    padding: 20,
  },
  bookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 12,
  },
  bookingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  bookingItemText: {
    flex: 1,
  },
  bookingItemService: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bookingItemDate: {
    fontSize: 14,
    color: '#666',
  },
});

export default ReviewsModal;