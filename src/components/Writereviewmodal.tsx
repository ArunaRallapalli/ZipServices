/**
 * ============================================================================
 * WriteReviewModal.tsx - Review Submission Modal
 * ============================================================================
 * 
 * Last Updated: January 5, 2026
 * Changes: Migrated from fetch to api client for automatic token handling
 * 
 * OVERVIEW:
 * Modal that allows customers to write reviews for completed bookings.
 * Displays after customer completes a service and taps "Leave Review".
 * 
 * USAGE:
 * <WriteReviewModal
 *   visible={showModal}
 *   booking={completedBooking}
 *   onClose={() => setShowModal(false)}
 *   onSuccess={() => handleReviewSuccess()}
 * />
 * 
 * FEATURES:
 * - Star rating input (required)
 * - Text review input (optional)
 * - Validation
 * - Loading state during submission
 * - Success/error handling
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRatingInput from './StarRatinginput';
import { Alert } from '../Utils/Alert';
import api from '../api'; // ADDED: January 5, 2026

interface Booking {
  booking_id: number;
  provider_user_id: number;
  customer_user_id: number;
  booking_date: string;
  provider_name?: string;
}

interface WriteReviewModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSuccess: () => void;
}

const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  visible,
  booking,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      setRating(0);
      setReviewText('');
    }
  }, [visible]);

  /**
   * Handle review submission
   * UPDATED: January 5, 2026 - Using api.post() instead of fetch
   */
  const handleSubmit = async () => {
    // Validate rating
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    if (!booking) {
      Alert.alert('Error', 'Booking information missing');
      return;
    }

    setSubmitting(true);

    try {
      console.log('📝 Submitting review:', {
        bookingId: booking.booking_id,
        providerId: booking.provider_user_id,
        customerId: booking.customer_user_id,
        rating,
        reviewText,
      });

      // UPDATED: Using api client instead of fetch
      const data = await api.post('/api/reviews', {
        bookingId: booking.booking_id,
        providerId: booking.provider_user_id,
        customerId: booking.customer_user_id,
        rating: rating,
        reviewText: reviewText.trim() || null,
      });

      if (data.success) {
        Alert.alert(
          'Review Submitted!',
          'Thank you for your feedback!',
          [{ text: 'OK', onPress: () => {
            onClose();
            onSuccess();
          }}]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to submit review');
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', error.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Write a Review</Text>
              <TouchableOpacity onPress={onClose} disabled={submitting}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Provider Info */}
            {booking.provider_name && (
              <View style={styles.providerInfo}>
                <Ionicons name="briefcase" size={16} color="#4A90E2" />
                <Text style={styles.providerName}>{booking.provider_name}</Text>
              </View>
            )}

            <ScrollView style={styles.scrollView}>
              {/* Star Rating Input */}
              <StarRatingInput
                value={rating}
                onChange={setRating}
                size={40}
                required
              />

              {/* Review Text Input */}
              <View style={styles.textInputContainer}>
                <Text style={styles.label}>Your Review (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Share your experience..."
                  placeholderTextColor="#999"
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                  numberOfLines={6}
                  maxLength={500}
                  textAlignVertical="top"
                  editable={!submitting}
                />
                <Text style={styles.charCount}>
                  {reviewText.length}/500
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  (submitting || rating === 0) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting || rating === 0}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 20,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    maxHeight: 400,
  },
  textInputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    color: '#333',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default WriteReviewModal;