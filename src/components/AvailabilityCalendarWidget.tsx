/**
 * ============================================================================
 * AvailabilityCalendarWidget.tsx - ULTRA COMPACT Customer Booking Calendar
 * ============================================================================
 * 
 * Last Updated: January 15, 2026
 * Changes: Added auto-refresh polling to keep calendar updated
 * 
 * Updated: Added time slot booking (booking_time field)
 * Changes: handleDayPress now opens time slot modal instead of Alert confirm
 *          createBooking now accepts and sends bookingTime param
 *
 * Updated: Yellow dot for partially booked dates, red only when fully booked,
 *          time range display (e.g. 9:00 AM – 10:00 AM ET), timezone label
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from '../Utils/Alert';
import api from '../api';

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
];

const TOTAL_SLOTS = TIME_SLOTS.length; // 9 — fully booked when all are taken

// ✅ Timezone label — change to 'CT', 'MT', 'PT' as needed


// ============================================================================
// HELPERS
// ============================================================================

/** "09:00" → "9:00 AM ET" */
const formatTimeSlot = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
};

/** "09:00" → "9:00 AM – 10:00 AM ET" (1-hour slot) */
const formatTimeRange = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const endH = h + 1;
  const startPeriod = h >= 12 ? 'PM' : 'AM';
  const endPeriod = endH >= 12 ? 'PM' : 'AM';
  const startHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const endHour = endH > 12 ? endH - 12 : endH === 0 ? 12 : endH;
  return `${startHour}:${m.toString().padStart(2, '0')} ${startPeriod} – ${endHour}:${m.toString().padStart(2, '0')} ${endPeriod}`;
};

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// COMPONENT
// ============================================================================

const AvailabilityCalendarWidget: React.FC<AvailabilityCalendarWidgetProps> = ({
  otherUserId,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  // ✅ NEW: Track which time slots are already booked per date
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadCurrentUser();
    fetchAvailability();

    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing calendar availability...');
      fetchAvailability();
    }, 20000);

    return () => {
      console.log('🧹 Cleaning up calendar refresh interval');
      clearInterval(refreshInterval);
    };
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
   * ✅ UPDATED: Counts booked slots per date for yellow/red dot logic
   */
  const fetchAvailability = async () => {
    try {
      const data = await api.get(`/api/availability/${otherUserId}`);

      if (data.success) {
        const marked: MarkedDates = {};
        const today = new Date().toISOString().split('T')[0];

        // Step 1: All future dates green by default
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

        // Step 2: Provider-set availability overrides
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

        // ✅ Step 3: Count booked slots per date → yellow (partial) or red (full)
        const slotsByDate: Record<string, string[]> = {};
        if (data.bookings && Array.isArray(data.bookings)) {
          data.bookings.forEach((booking: any) => {
            const bookingDate = booking.booking_date.split('T')[0];
            if (bookingDate >= today) {
              if (!slotsByDate[bookingDate]) slotsByDate[bookingDate] = [];
              if (booking.booking_time) {
                slotsByDate[bookingDate].push(booking.booking_time);
              }
            }
          });

          Object.entries(slotsByDate).forEach(([date, slots]) => {
            const isFullyBooked = slots.length >= TOTAL_SLOTS;
            marked[date] = {
              marked: true,
              dotColor: isFullyBooked ? '#FF6B6B' : '#FFA500', // Red = full, Yellow/Orange = partial
              disabled: isFullyBooked,
              disableTouchEvent: isFullyBooked,
            };
          });
        }

        setBookedSlotsByDate(slotsByDate);
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

  /**
   * Handle date tap — opens time slot picker
   * ✅ UPDATED: Blocks tap only when fully booked (not partial)
   */
  const handleDayPress = (day: any) => {
    const dateStr = day.dateString;
    console.log(`📅 Date pressed: ${dateStr}`);

    if (markedDates[dateStr]?.disabled) {
      Alert.alert('Fully Booked', 'This date is fully booked. Please choose another date.');
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

    setSelectedDate(dateStr);
    setShowTimeModal(true);
  };

  /**
   * Create a new booking with selected time slot
   */
  const createBooking = async (bookingDate: string, bookingTime: string) => {
    setShowTimeModal(false);
    try {
      const data = await api.post('/api/availability/book', {
        serviceProviderId: otherUserId,
        customerId: currentUserId,
        bookingDate: bookingDate,
        bookingTime: bookingTime,
      });

      if (data.success) {
        Alert.alert(
          'Booking Pending!',
          data.emailSent
            ? 'Thank you! The service provider has been notified to confirm or decline your request. Please coordinate time through chat as needed.'
            : 'Booking created',
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

  // ============================================================================
  // TIME SLOT MODAL
  // ============================================================================

  const TimeSlotModal = () => {
    if (!selectedDate) return null;

    const [year, month, day] = selectedDate.split('-').map(Number);
    const displayDate = new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    // ✅ Grey out already-booked slots for this date
    const bookedSlots = bookedSlotsByDate[selectedDate] || [];

    return (
      <Modal
        visible={showTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={tsStyles.overlay}>
          <View style={tsStyles.sheet}>
            <Text style={tsStyles.title}>Select a Time</Text>
            <Text style={tsStyles.subtitle}>{displayDate}</Text>
            {bookedSlots.length > 0 && (
              <Text style={tsStyles.partialNote}>
                {TOTAL_SLOTS - bookedSlots.length} of {TOTAL_SLOTS} slots available
              </Text>
            )}
            <ScrollView>
              {TIME_SLOTS.map(slot => {
                const isBooked = bookedSlots.includes(slot);
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[tsStyles.slotBtn, isBooked && tsStyles.slotBtnBooked]}
                    onPress={() => !isBooked && createBooking(selectedDate, slot)}
                    disabled={isBooked}
                  >
                    <Ionicons
                      name={isBooked ? 'close-circle-outline' : 'time-outline'}
                      size={16}
                      color={isBooked ? '#ccc' : '#4A90E2'}
                    />
                    <Text style={[tsStyles.slotTxt, isBooked && tsStyles.slotTxtBooked]}>
                      {formatTimeRange(slot)}
                    </Text>
                    {isBooked && <Text style={tsStyles.bookedLabel}>Booked</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={tsStyles.cancelBtn}
              onPress={() => setShowTimeModal(false)}
            >
              <Text style={tsStyles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

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

      {/* Calendar */}
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

              {/* ✅ UPDATED: Legend now includes yellow for partial */}
              <View style={styles.legendContainer}>
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.legendTxt}>Available</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#FFA500' }]} />
                    <Text style={styles.legendTxt}>Partial</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} />
                    <Text style={styles.legendTxt}>Full</Text>
                  </View>
                </View>
                <Text style={[styles.noteText, { fontWeight: 'bold' }]}>
  Tap a date to see available time slots. Please coordinate time through chat as needed.
</Text>
              </View>
            </>
          )}
        </View>
      )}

      <TimeSlotModal />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

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
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    paddingBottom: 12,
    maxHeight: 400,
  },
  loading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  calendar: {
    borderRadius: 6,
  },
  legendContainer: {
    marginTop: 10,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderRadius: 6,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendTxt: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  noteText: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 14,
  },
});

const tsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '75%',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 4,
  },
  partialNote: {
    fontSize: 12,
    color: '#FFA500',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 12,
  },
  slotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  slotBtnBooked: {
    backgroundColor: '#fafafa',
  },
  slotTxt: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  slotTxtBooked: {
    color: '#ccc',
  },
  bookedLabel: {
    fontSize: 11,
    color: '#ccc',
    fontStyle: 'italic',
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  cancelTxt: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
});

export default AvailabilityCalendarWidget;