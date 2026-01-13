/**
 * ============================================================================
 * AvailabilityCalendarWidget.tsx - ULTRA COMPACT Customer Booking Calendar
 * ============================================================================
 * 
 * Last Updated: January 5, 2026
 * Changes: Migrated from fetch to api client for automatic token handling
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from '../Utils/Alert';
import api from '../api'; // ADDED: January 5, 2026

interface AvailabilityCalendarWidgetProps {
  otherUserId: number;
  onClose: () => void;
}

interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    disabled?: boolean;
    disableTouchEvent?: boolean;
  };
}

const AvailabilityCalendarWidget: React.FC<AvailabilityCalendarWidgetProps> = ({
  otherUserId,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    fetchAvailability();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        setCurrentUserId(parseInt(storedUserId));
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  /**
   * Fetch provider's availability
   * UPDATED: January 5, 2026 - Using api.get() instead of fetch
   */
  const fetchAvailability = async () => {
    try {
      // UPDATED: Using api client instead of fetch
      const data = await api.get(`/api/availability/${otherUserId}`);

      if (data.success) {
        const marked: MarkedDates = {};
        const today = new Date().toISOString().split('T')[0];

        for (let i = 0; i < 60; i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          marked[dateStr] = {
            marked: true,
            dotColor: '#4CAF50',
            disabled: false,
            disableTouchEvent: false,
          };
        }

        if (data.availability && Array.isArray(data.availability)) {
          data.availability.forEach((avail: any) => {
            if (avail.date >= today) {
              marked[avail.date] = {
                marked: true,
                dotColor: avail.is_available ? '#4CAF50' : '#FF6B6B',
                disabled: !avail.is_available,
                disableTouchEvent: !avail.is_available,
              };
            }
          });
        }

        if (data.bookings && Array.isArray(data.bookings)) {
          data.bookings.forEach((booking: any) => {
            const bookingDate = booking.booking_date.split('T')[0];
            if (bookingDate >= today) {
              marked[bookingDate] = {
                marked: true,
                dotColor: '#FF6B6B',
                disabled: true,
                disableTouchEvent: true,
              };
            }
          });
        }

        setMarkedDates(marked);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAvailability();
    setRefreshing(false);
  };

  const handleDayPress = async (day: any) => {
    const dateStr = day.dateString; // e.g., "2026-01-09"
    
    console.log(`📅 Date pressed: ${dateStr}`);
    
    if (markedDates[dateStr]?.disabled) {
      Alert.alert('Date Unavailable', 'This date is already booked');
      return;
    }

    if (!currentUserId) {
      Alert.alert('Sign In Required', 'Please sign in to book a date');
      return;
    }

    if (currentUserId === otherUserId) {
      Alert.alert('Cannot Book', 'You cannot book your own services');
      return;
    }

    // ✅ FIX: Parse date correctly to avoid timezone issues
    const [year, month, dayNum] = dateStr.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, dayNum); // month is 0-indexed

    Alert.alert(
      'Book This Date?',
      `${selectedDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Book', 
          onPress: () => createBooking(dateStr)
        }
      ]
    );
  };

  /**
   * Create a new booking
   * UPDATED: January 5, 2026 - Using api.post() instead of fetch
   */
  const createBooking = async (bookingDate: string) => {
    try {
      // UPDATED: Using api client instead of fetch
      const data = await api.post('/api/availability/book', {
        serviceProviderId: otherUserId,
        customerId: currentUserId,
        bookingDate: bookingDate,
      });

      if (data.success) {
        // ✅ Updated message based on email status
        Alert.alert(
          'Booking Confirmed!', 
          data.emailSent 
            ? 'The service provider has been notified by email.' 
            : 'Booking created. The provider can view it in their calendar.',
          [{ text: 'OK', onPress: fetchAvailability }]
        );
      } else {
        Alert.alert('Booking Failed', data.error || 'Unable to create booking');
      }
    } catch (error: any) {
      console.error('❌ Booking error:', error);
      Alert.alert('Error', error.message || 'Failed to create booking. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Minimalist Header */}
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={16} color="#4A90E2" />
          <Text style={styles.headerTitle}>Book Date</Text>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={14} 
            color="#999" 
          />
        </View>
        <View style={styles.headerRight}>
          {isExpanded && (
            <TouchableOpacity 
              onPress={(e) => { e.stopPropagation(); handleRefresh(); }} 
              style={styles.btn}
              disabled={refreshing}
            >
              <Ionicons name="refresh" size={16} color={refreshing ? '#ccc' : '#4A90E2'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); onClose(); }} style={styles.btn}>
            <Ionicons name="close" size={16} color="#999" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Ultra Compact Calendar */}
      {isExpanded && (
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color="#4A90E2" />
            </View>
          ) : (
            <>
              <Calendar
                markedDates={markedDates}
                onDayPress={handleDayPress}
                minDate={new Date().toISOString().split('T')[0]}
                hideExtraDays={true}
                theme={{
                  todayTextColor: '#4A90E2',
                  arrowColor: '#4A90E2',
                  textDayFontSize: 12,
                  textMonthFontSize: 13,
                  textDayHeaderFontSize: 10,
                }}
                style={styles.calendar}
              />
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.legendTxt}>Available</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} />
                  <Text style={styles.legendTxt}>Booked</Text>
                </View>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 4,
  },
  btn: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 6,
    paddingBottom: 8,
    maxHeight: 320,
  },
  loading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  calendar: {
    borderRadius: 6,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendTxt: {
    fontSize: 10,
    color: '#666',
  },
});

export default AvailabilityCalendarWidget;