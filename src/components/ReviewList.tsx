/**
 * ============================================================================
 * ReviewsList.tsx - Provider Reviews Display
 * ============================================================================
 * 
 * Last Updated: January 5, 2026
 * Changes: Migrated from fetch to api client for automatic token handling
 * 
 * OVERVIEW:
 * Displays a list of reviews for a service provider.
 * Shows on provider profiles and can be embedded in other screens.
 * 
 * USAGE:
 * <ReviewsList providerId={432} limit={10} />
 * 
 * FEATURES:
 * - Fetches and displays provider's reviews
 * - Shows customer name, rating, review text, and date
 * - Loading and empty states
 * - Pagination support
 * - Refresh capability
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from '../components/StarRating';
import api from '../api'; // ADDED: January 5, 2026

interface Review {
  review_id: number;
  rating: number;
  review_text: string;
  created_at: string;
  customer_name: string;
}

interface ReviewsListProps {
  providerId: number;
  limit?: number;
}

const ReviewList: React.FC<ReviewsListProps> = ({ providerId, limit = 50 }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [providerId]);

  /**
   * Fetch provider's reviews
   * UPDATED: January 5, 2026 - Using api.get() instead of fetch
   */
  const fetchReviews = async () => {
    try {
      console.log(`📋 Fetching reviews for provider ${providerId}`);

      // UPDATED: Using api client instead of fetch
      const data = await api.get(`/api/reviews/provider/${providerId}?limit=${limit}`);

      if (data.success) {
        setReviews(data.reviews || []);
        console.log(`✅ Loaded ${data.reviews?.length || 0} reviews`);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      {/* Header with customer name and date */}
      <View style={styles.reviewHeader}>
        <View style={styles.customerInfo}>
          <Ionicons name="person-circle" size={32} color="#4A90E2" />
          <View>
            <Text style={styles.customerName}>{item.customer_name}</Text>
            <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>

      {/* Star Rating */}
      <View style={styles.ratingContainer}>
        <StarRating rating={item.rating} size={16} color="#FFB800" />
      </View>

      {/* Review Text */}
      {item.review_text && (
        <Text style={styles.reviewText}>{item.review_text}</Text>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="star-outline" size={48} color="#CCC" />
      <Text style={styles.emptyTitle}>No Reviews Yet</Text>
      <Text style={styles.emptyText}>
        Be the first to leave a review!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Reviews Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Reviews ({reviews.length})
        </Text>
      </View>

      {/* Reviews List */}
      <FlatList
        data={reviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.review_id.toString()}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4A90E2']}
          />
        }
        contentContainerStyle={
          reviews.length === 0 ? styles.emptyList : styles.list
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  reviewCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  ratingContainer: {
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ReviewList;