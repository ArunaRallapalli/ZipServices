/**
 * ============================================================================
 * ReviewList.tsx - Provider Reviews Display Component (UPDATED - Better UX)
 * ============================================================================
 * 
 * UPDATES:
 * - Service name badge on LEFT side (primary info)
 * - User info on RIGHT side (secondary info)
 * - Improved visual hierarchy
 * - Scrollable with FlatList
 * 
 * Displays a scrollable list of reviews for a service provider.
 * Shows SERVICE NAME prominently, then customer name, rating, review text, date.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Review {
  review_id: number;
  booking_id: number;
  rating: number;
  review_text: string | null;
  created_at: string;
  customer_name: string;
  service_name?: string;
}

interface ReviewListProps {
  providerId: number;
  limit?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ReviewList: React.FC<ReviewListProps> = ({ providerId, limit = 50 }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [providerId]);

  /**
   * Fetch reviews from API
   */
  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📋 Fetching reviews for provider ${providerId}`);

      const data = await api.get(`/api/reviews/provider/${providerId}?limit=${limit}`);

      if (data.success) {
        setReviews(data.reviews || []);
        console.log(`✅ Loaded ${data.reviews?.length || 0} reviews`);
      } else {
        setError('Failed to load reviews');
      }
    } catch (err: any) {
      console.error('❌ Error fetching reviews:', err);
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render star rating display
   */
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? '#FFD700' : '#DDD'}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  /**
   * Render a single review item
   * 
   * UPDATED LAYOUT:
   * - Service name badge on LEFT (primary)
   * - User info on RIGHT (secondary)
   */
  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      {/* Header: Service badge LEFT, User info RIGHT */}
      <View style={styles.reviewHeader}>
        {/* LEFT: Service name badge (PRIMARY) */}
        {item.service_name && (
          <View style={styles.serviceBadge}>
            <Ionicons name="briefcase" size={14} color="#4A90E2" />
            <Text style={styles.serviceName}>{item.service_name}</Text>
          </View>
        )}
        
        {/* RIGHT: User info (SECONDARY) */}
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={18} color="#666" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.customer_name}</Text>
            <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>

      {/* Rating */}
      {renderStars(item.rating)}

      {/* Review text */}
      {item.review_text && (
        <Text style={styles.reviewText}>{item.review_text}</Text>
      )}
    </View>
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="chatbubbles-outline" size={48} color="#CCC" />
        <Text style={styles.emptyText}>No reviews yet</Text>
        <Text style={styles.emptySubtext}>Be the first to leave a review!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={reviews}
      renderItem={renderReview}
      keyExtractor={(item) => item.review_id.toString()}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={true}
      style={styles.list}
    />
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#999',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  // LEFT SIDE: Service badge (PRIMARY)
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A90E2',
    flexShrink: 1,
  },
  // RIGHT SIDE: User info (SECONDARY)
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userDetails: {
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: '#999',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
});

export default ReviewList;