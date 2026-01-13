/**
 * ============================================================================
 * StarRatingInput.tsx - Interactive Star Rating Input
 * ============================================================================
 * 
 * OVERVIEW:
 * Interactive star rating component that allows users to select a rating
 * by tapping on stars. Used in the write review modal.
 * 
 * USAGE:
 * <StarRatingInput value={rating} onChange={setRating} size={32} />
 * 
 * FEATURES:
 * - Tap to select rating (1-5 stars)
 * - Visual feedback on hover/press
 * - Customizable star size
 * - Required field indicator
 * ============================================================================
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingInputProps {
  value: number;                    // Current rating value (0-5)
  onChange: (rating: number) => void;  // Callback when rating changes
  size?: number;                    // Star size in pixels (default: 32)
  required?: boolean;               // Show required indicator
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  size = 32,
  required = false
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          Rating {required && <Text style={styles.required}>*</Text>}
        </Text>
      </View>
      
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onChange(star)}
            style={styles.starButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={value >= star ? 'star' : 'star-outline'}
              size={size}
              color={value >= star ? '#FFB800' : '#DDD'}
            />
          </TouchableOpacity>
        ))}
      </View>
      
      {value > 0 && (
        <Text style={styles.ratingText}>
          {value} {value === 1 ? 'star' : 'stars'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  required: {
    color: '#FF6B6B',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default StarRatingInput;