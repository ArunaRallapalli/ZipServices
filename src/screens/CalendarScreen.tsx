/**
 * ============================================================================
 * CalendarScreen.tsx - Service Provider Booking Calendar
 * ============================================================================
 * 
 * Last Updated: January 15, 2026
 * Changes: Filter bookings to only show ACTIVE bookings (not cancelled/completed)
 * Updated: Added booking_time field to Booking interface and modal display
 * Updated: Yellow dot for partially booked dates (some slots taken, not all)
 *          Red dot only when all slots are taken for the day
 *          Multi-booking list when provider taps a date with multiple bookings
 *          Time range display (e.g. 9:00 AM – 10:00 AM ET)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { createResponsiveStyles } from '../Utils/globalStyles';
import { Alert } from '../Utils/Alert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackButton } from '../components/BackButton';
import api from '../api';
/** Returns today's date as YYYY-MM-DD in LOCAL time (not UTC) */
const getLocalToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const TOTAL_SLOTS = 9; // Must match TIME_SLOTS.length in AvailabilityCalendarWidget

// ✅ Timezone label — change to 'CT', 'MT', 'PT' as needed


// ============================================================================
// HELPERS
// ============================================================================

/** "09:00" → "9:00 AM – 10:00 AM ET" */
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
// TYPE DEFINITIONS
// ============================================================================

interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    disabled?: boolean;
    disableTouchEvent?: boolean;
  };
}

interface Booking {
  booking_id: number;
  provider_user_id: number;
  customer_user_id: number;
  booking_date: string;
  booking_time?: string;   // optional for backwards compat
  status: string;
  notes?: string;
  created_at: string;
  customer_name: string;
  customer_phone?: string;
  customer_email: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CalendarScreen: React.FC = () => {

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ✅ NEW: For dates with multiple bookings (multi-slot day)
  const [selectedDateBookings, setSelectedDateBookings] = useState<Booking[]>([]);
  const [showDateBookingsModal, setShowDateBookingsModal] = useState(false);

  useEffect(() => {
    loadUserAndCalendarData();
  }, []);

  const loadUserAndCalendarData = async () => {
    try {
      setError(null);
      const storedUserId = await AsyncStorage.getItem('userId');
      console.log('📱 Stored userId:', storedUserId);

      if (!storedUserId) {
        setError('Please sign in to view your calendar');
        Alert.alert('Error', 'Please sign in to view your calendar');
        return;
      }

      const uid = parseInt(storedUserId);
      console.log('👤 Parsed userId:', uid);
      setUserId(uid);
      await fetchCalendarData(uid);
    } catch (error) {
      console.error('❌ Error loading user:', error);
      setError('Failed to load user information');
      Alert.alert('Error', 'Failed to load user information');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async (uid: number) => {
    try {
      console.log(`🔍 Fetching calendar data for provider ${uid}`);
      setError(null);

      const [availabilityResponse, bookingsResponse] = await Promise.all([
        api.get(`/api/availability/${uid}`).catch(err => {
          console.error('❌ Availability fetch error:', err);
          return { success: false, availability: [] };
        }),
        api.get(`/api/availability/bookings/${uid}`).catch(err => {
          console.error('❌ Bookings fetch error:', err);
          return { success: false, bookings: [] };
        })
      ]);

      if (!availabilityResponse || !bookingsResponse) {
        throw new Error('Failed to fetch calendar data');
      }

      const availabilityData = availabilityResponse;
      const bookingsData = bookingsResponse;

      // Only store ACTIVE bookings (pending/confirmed)
      if (bookingsData.success && Array.isArray(bookingsData.bookings)) {
        const activeBookings = bookingsData.bookings.filter(
          (booking: Booking) => booking.status === 'pending' || booking.status === 'confirmed'
        );
        console.log(`✅ Total bookings: ${bookingsData.bookings.length}, Active: ${activeBookings.length}`);
        setBookings(activeBookings);
      } else {
        console.log('⚠️ No bookings data or invalid format');
        setBookings([]);
      }

      const marked: MarkedDates = {};
      const today = getLocalToday();

      // Step 1: All future dates green
      for (let i = 0; i < 90; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        marked[dateStr] = {
          marked: true,
          dotColor: '#4CAF50',
          disabled: false,
          disableTouchEvent: false,
        };
      }

      // Step 2: Provider availability overrides
      if (availabilityData.success && Array.isArray(availabilityData.availability)) {
        availabilityData.availability.forEach((avail: any) => {
          if (avail.date >= today) {
            marked[avail.date] = {
              marked: true,
              dotColor: avail.is_available ? '#4CAF50' : '#FF6B6B',
              disabled: false,
              disableTouchEvent: false,
            };
          }
        });
      }

      // ✅ Step 3: Yellow (partial) or Red (fully booked) dots
      if (bookingsData.success && Array.isArray(bookingsData.bookings)) {
        const activeBookings = bookingsData.bookings.filter(
          (booking: Booking) => booking.status === 'pending' || booking.status === 'confirmed'
        );

        // Count bookings per date
        const countByDate: Record<string, number> = {};
        activeBookings.forEach((booking: Booking) => {
          const bookingDate = booking.booking_date.split('T')[0];
          if (bookingDate >= today) {
            countByDate[bookingDate] = (countByDate[bookingDate] || 0) + 1;
          }
        });

        Object.entries(countByDate).forEach(([date, count]) => {
          const isFullyBooked = count >= TOTAL_SLOTS;
          marked[date] = {
            marked: true,
            dotColor: isFullyBooked ? '#FF6B6B' : '#FFA500', // Red = full, Orange = partial
            disabled: false,     // Provider can always tap to see details
            disableTouchEvent: false,
          };
        });
      }

      console.log('✅ Calendar data loaded successfully');
      setMarkedDates(marked);

    } catch (error) {
      console.error('❌ Error fetching calendar data:', error);
      setError('Failed to load calendar data');
      Alert.alert('Error', 'Failed to load calendar data. Please check your connection.');
    }
  };

  const handleRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      await fetchCalendarData(userId);
      Alert.alert('Refreshed', 'Calendar updated successfully');
    } catch (error) {
      console.error('❌ Error refreshing:', error);
      Alert.alert('Error', 'Failed to refresh calendar');
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Handle date press
   * ✅ UPDATED: If multiple bookings on a date, show list first
   *            If single booking, open details directly
   *            If no bookings, offer block/unblock
   */
  const handleDayPress = (day: DateData) => {
    const dateStr = day.dateString;
    console.log(`📅 Date pressed: ${dateStr}`);

    // Get ALL active bookings for this date
    const dateBookings = bookings.filter(b => b.booking_date.split('T')[0] === dateStr);

    if (dateBookings.length > 1) {
      // ✅ Multiple bookings — show list modal
      setSelectedDateBookings(dateBookings);
      setShowDateBookingsModal(true);
    } else if (dateBookings.length === 1) {
      // Single booking — open details directly (existing behaviour)
      setSelectedBooking(dateBookings[0]);
      setShowBookingModal(true);
    } else {
      // No bookings — allow blocking/unblocking
      const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const isCurrentlyBlocked = markedDates[dateStr]?.dotColor === '#FF6B6B';

      if (isCurrentlyBlocked) {
        Alert.alert(
          'Date Blocked',
          `${formattedDate} is currently blocked. Would you like to unblock it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Unblock Date', onPress: () => toggleAvailability(dateStr, true) }
          ]
        );
      } else {
        Alert.alert(
          'Date Available',
          `${formattedDate} is currently available. Would you like to block it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Block Date', onPress: () => toggleAvailability(dateStr, false), style: 'destructive' }
          ]
        );
      }
    }
  };

  const toggleAvailability = async (date: string, isAvailable: boolean) => {
    if (!userId) return;
    try {
      console.log(`🔄 Setting ${date} as ${isAvailable ? 'available' : 'unavailable'}`);
      const data = await api.post('/api/availability', {
        userId: userId,
        dates: [date],
        isAvailable: isAvailable,
        notes: isAvailable ? 'Available' : 'Blocked by provider'
      });

      if (data && data.success) {
        const action = isAvailable ? 'unblocked' : 'blocked';
        Alert.alert('Success', `Date ${action} successfully`);
        await fetchCalendarData(userId);
      } else {
        Alert.alert('Error', 'Failed to update availability');
      }
    } catch (error) {
      console.error('❌ Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // ============================================================================
  // DATE BOOKINGS LIST MODAL (for dates with multiple bookings)
  // ============================================================================

  const DateBookingsModal = () => {
    if (!selectedDateBookings.length) return null;
    const dateLabel = formatDate(selectedDateBookings[0].booking_date);

    return (
      <Modal
        visible={showDateBookingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateBookingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Bookings</Text>
                <Text style={styles.modalSubtitle}>{dateLabel}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDateBookingsModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedDateBookings
                .sort((a, b) => (a.booking_time || '').localeCompare(b.booking_time || ''))
                .map((booking, index) => (
                <TouchableOpacity
                  key={booking.booking_id}
                  style={styles.bookingListItem}
                  onPress={() => {
                    setShowDateBookingsModal(false);
                    setSelectedBooking(booking);
                    setShowBookingModal(true);
                  }}
                >
                  <View style={styles.bookingListLeft}>
                    <Ionicons name="time-outline" size={18} color="#4A90E2" />
                    <View>
                      <Text style={styles.bookingListTime}>
                        {booking.booking_time ? formatTimeRange(booking.booking_time) : 'Time not set'}
                      </Text>
                      <Text style={styles.bookingListName}>{booking.customer_name}</Text>
                    </View>
                  </View>
                  <View style={styles.bookingListRight}>
                    <Text style={[
                      styles.bookingListStatus,
                      { color: booking.status === 'confirmed' ? '#4CAF50' : '#FFA500' }
                    ]}>
                      {booking.status.toUpperCase()}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#ccc" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowDateBookingsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // ============================================================================
  // BOOKING DETAILS MODAL
  // ============================================================================

  const BookingDetailsModal = () => {
    if (!selectedBooking) return null;

    return (
      <Modal
        visible={showBookingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={20} color="#4A90E2" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedBooking.booking_date)}
                  </Text>
                </View>
              </View>

              {/* ✅ Time row — shown only if booking has a time, formatted as range */}
              {selectedBooking.booking_time && (
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={20} color="#4A90E2" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>
                      {formatTimeRange(selectedBooking.booking_time)}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <Ionicons name="person" size={20} color="#4A90E2" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>{selectedBooking.customer_name}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="mail" size={20} color="#4A90E2" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedBooking.customer_email}</Text>
                </View>
              </View>

              {selectedBooking.customer_phone && (
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={20} color="#4A90E2" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{selectedBooking.customer_phone}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <Ionicons name="information-circle" size={20} color="#4A90E2" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, styles.statusBadge]}>
                    {selectedBooking.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {selectedBooking.notes && (
                <View style={styles.detailRow}>
                  <Ionicons name="document-text" size={20} color="#4A90E2" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>{selectedBooking.notes}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.actionButtons}>
              {selectedBooking.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => handleBookingAction('confirmed')}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => handleBookingAction('cancelled')}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
              {selectedBooking.status === 'confirmed' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => handleBookingAction('completed')}
                >
                  <Ionicons name="checkmark-done" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark Complete</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowBookingModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const handleBookingAction = async (newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    if (!selectedBooking || !userId) return;

    const actions = { confirmed: 'confirm', cancelled: 'cancel', completed: 'complete' };

    Alert.alert(
      `${actions[newStatus].charAt(0).toUpperCase() + actions[newStatus].slice(1)} Booking?`,
      `Are you sure you want to ${actions[newStatus]} this booking?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const data = await api.patch(
                `/api/availability/bookings/${selectedBooking.booking_id}`,
                { status: newStatus }
              );
              if (data && data.success) {
                Alert.alert('Success', `Booking ${actions[newStatus]}ed successfully`);
                setShowBookingModal(false);
                await fetchCalendarData(userId);
              } else {
                Alert.alert('Error', 'Failed to update booking');
              }
            } catch (error) {
              console.error('❌ Error updating booking:', error);
              Alert.alert('Error', 'Failed to update booking');
            }
          }
        }
      ]
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton iconColor="#fff" textColor="#fff" backgroundColor="transparent" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>My Bookings</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserAndCalendarData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton iconColor="#fff" textColor="#fff" backgroundColor="transparent" />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons name="refresh" size={24} color={refreshing ? '#ccc' : '#fff'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.instructionsContainer}>
          <Ionicons name="information-circle-outline" size={24} color="#4A90E2" />
          <Text style={styles.instructionsText}>
            Green = available · Orange = partially booked · Red = fully booked. Tap any date to manage.
          </Text>
        </View>

        <View style={styles.calendarContainer}>
          <Calendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            minDate={getLocalToday()}
            theme={{
              todayTextColor: '#4A90E2',
              arrowColor: '#4A90E2',
            }}
          />
        </View>

        {/* ✅ UPDATED: Legend now has 3 items */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFA500' }]} />
            <Text style={styles.legendText}>Partial</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
            <Text style={styles.legendText}>Full</Text>
          </View>
        </View>

        <Text style={styles.hintText}>
          Tap any orange or red date to see booking details
        </Text>

        {bookings.length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              📊 Active Bookings: {bookings.length}
            </Text>
          </View>
        )}
      </ScrollView>

      <DateBookingsModal />
      <BookingDetailsModal />
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = createResponsiveStyles({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 16, color: '#666', marginTop: 10 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 15 },
  errorText: { fontSize: 16, color: '#666', textAlign: 'center' },
  retryButton: { backgroundColor: '#4A90E2', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8, marginTop: 10 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: {
    backgroundColor: '#4A90E2',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  refreshButton: { padding: 8, width: 40, alignItems: 'center' },
  scrollView: { flex: 1 },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginRight: 15,
    marginLeft: 15,
    marginTop: 15,
    marginBottom: 10,
    borderRadius: 8,
    gap: 10,
  },
  instructionsText: { flex: 1, fontSize: 13, color: '#333' },
  calendarContainer: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
    width: '85%',
    marginRight: 15,
    marginLeft: 0,
    borderRadius: 12,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 15,
    marginRight: 15,
    paddingRight: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#666' },
  hintText: { fontSize: 11, color: '#999', textAlign: 'right', marginTop: 10, marginRight: 25, fontStyle: 'italic' },
  summaryContainer: {
    alignSelf: 'flex-end',
    width: '85%',
    marginRight: 15,
    marginTop: 15,
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryText: { fontSize: 14, fontWeight: '600', color: '#333' },

  // ✅ NEW: Booking list item (for multi-booking date modal)
  bookingListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookingListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bookingListTime: { fontSize: 14, fontWeight: '600', color: '#333' },
  bookingListName: { fontSize: 12, color: '#888', marginTop: 2 },
  bookingListRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookingListStatus: { fontSize: 11, fontWeight: '700' },

  // Modal styles (unchanged)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  modalSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  modalBody: { marginBottom: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  detailText: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  detailValue: { fontSize: 16, color: '#333', fontWeight: '500' },
  statusBadge: { color: '#4A90E2', fontWeight: '700' },
  actionButtons: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 8 },
  confirmButton: { backgroundColor: '#4CAF50' },
  cancelButton: { backgroundColor: '#FF6B6B' },
  completeButton: { backgroundColor: '#2196F3' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  closeModalButton: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 8, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default CalendarScreen;