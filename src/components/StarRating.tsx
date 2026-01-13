/**
 * ============================================================================
 * StarRating.tsx - Read-Only Star Rating Display
 * ============================================================================
 * 
 * OVERVIEW:
 * Displays a star rating visually using filled/empty stars.
 * This is a READ-ONLY component - use StarRatingInput for interactive rating.
 * 
 * USAGE:
 * <StarRating rating={4.5} size={16} showCount={true} reviewCount={24} />
 * 
 * OUTPUT:
 * ⭐⭐⭐⭐☆ 4.5 (24 reviews)
 * 
 * FEATURES:
 * - Supports decimal ratings (e.g., 4.5 shows 4.5 stars)
 * - Customizable star size
 * - Optional review count display
 * - Responsive styling
 * ============================================================================
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;           // Rating value (0-5, supports decimals)
  size?: number;            // Star size in pixels (default: 16)
  showCount?: boolean;      // Show review count (default: false)
  reviewCount?: number;     // Number of reviews
  color?: string;           // Star color (default: #FFB800)
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 16,
  showCount = false,
  reviewCount = 0,
  color = '#FFB800'
}) => {
  // Render 5 stars
  const renderStars = () => {
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        // Full star
        stars.push(
          <Ionicons key={i} name="star" size={size} color={color} />
        );
      } else if (rating >= i - 0.5) {
        // Half star
        stars.push(
          <Ionicons key={i} name="star-half" size={size} color={color} />
        );
      } else {
        // Empty star
        stars.push(
          <Ionicons key={i} name="star-outline" size={size} color={color} />
        );
      }
    }
    
    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      
      {showCount && (
        <Text style={styles.ratingText}>
          {rating.toFixed(1)} {reviewCount > 0 && `(${reviewCount})`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default StarRating;