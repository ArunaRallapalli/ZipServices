/**
 * ============================================================================
 * CalendarScreen.tsx - Service Provider Booking Calendar
 * ============================================================================
 * 
 * Last Updated: January 15, 2026
 * Changes: Filter bookings to only show ACTIVE bookings (not cancelled/completed)
 * 
 * IMPORTANT NOTE ABOUT 403 ERRORS:
 * If you see "You can only set your own availability" error, it's because:
 * 1. Your auth token is expired → Log out and log back in
 * 2. The backend validates userId in body matches the token user
 * 
 * OVERVIEW:
 * This screen displays a service provider's calendar showing their availability
 * and bookings. Providers can:
 * - View all their bookings (red dots)
 * - See available dates (green dots - default for all future dates)
 * - Click red dots to see customer booking details
 * - Click green dots to block/unblock dates (mark unavailable for personal use)
 * 
 * FEATURES:
 * - Green dots: Available for booking (default for all future dates)
 * - Red dots: Already booked by customers (ONLY pending/confirmed bookings)
 * - Click red dot: View full booking details (customer name, email, phone, etc.)
 * - Click green dot: Option to mark date as unavailable (vacation, personal time)
 * - Auto-refresh on focus
 * - Secure: Only shows booking details to the service provider (owner)
 * 
 * BACKEND ENDPOINTS USED:
 * - GET /api/availability/:userId - Fetch provider's availability settings
 * - GET /api/availability/bookings/:userId - Fetch provider's bookings
 * - POST /api/availability - Mark dates (requires userId + token for validation)
 * - PATCH /api/availability/bookings/:bookingId - Update booking status
 * 
 * FLOW:
 * 1. Load user ID from AsyncStorage
 * 2. Fetch availability settings and bookings in parallel
 * 3. Build calendar with green dots (default available) and red dots (booked)
 * 4. Allow clicking dates to view details or manage availability
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

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Calendar marked dates structure for react-native-calendars
 */
interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    disabled?: boolean;
    disableTouchEvent?: boolean;
  };
}

/**
 * Booking data structure returned from backend
 */
interface Booking {
  booking_id: number;
  provider_user_id: number;
  customer_user_id: number;
  booking_date: string;
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
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========================================================================
  // INITIALIZATION - Load user and calendar data on mount
  // ========================================================================
  
  useEffect(() => {
    loadUserAndCalendarData();
  }, []);

  /**
   * Load current user ID from AsyncStorage and fetch their calendar data
   */
  const loadUserAndCalendarData = async () => {
    try {
      setError(null);
      // Get logged-in user's ID
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
      
      // Fetch calendar data for this user
      await fetchCalendarData(uid);
    } catch (error) {
      console.error('❌ Error loading user:', error);
      setError('Failed to load user information');
      Alert.alert('Error', 'Failed to load user information');
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // DATA FETCHING - Get availability and bookings from backend
  // ========================================================================

  /**
   * Fetch both availability settings and bookings for the provider
   * Combines data to build the calendar view
   * FIXED: January 15, 2026 - Only show ACTIVE bookings (pending/confirmed)
   */
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

      console.log('📅 Availability response:', availabilityResponse);
      console.log('📅 Bookings response:', bookingsResponse);

      // Validate responses
      if (!availabilityResponse || !bookingsResponse) {
        throw new Error('Failed to fetch calendar data');
      }

      const availabilityData = availabilityResponse;
      const bookingsData = bookingsResponse;

      // ✅ FIXED: Filter out cancelled and completed bookings
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

      // Build the marked dates object for calendar display
      const marked: MarkedDates = {};
      const today = new Date().toISOString().split('T')[0];
      console.log('📆 Today:', today);

      // ====================================================================
      // STEP 1: Mark all future dates as GREEN (available by default)
      // ====================================================================
      
      for (let i = 0; i < 90; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        marked[dateStr] = {
          marked: true,
          dotColor: '#4CAF50', // Green = Available
          disabled: false,
          disableTouchEvent: false,
        };
      }
      console.log('✅ Marked 90 days as available');

      // ====================================================================
      // STEP 2: Override with explicit availability settings
      // ====================================================================
      
      if (availabilityData.success && Array.isArray(availabilityData.availability)) {
        console.log('📝 Processing availability settings:', availabilityData.availability.length);
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

      // ====================================================================
      // STEP 3: Override with ACTIVE booked dates as RED
      // ====================================================================
      // ✅ FIXED: Only mark ACTIVE bookings (already filtered above)
      
      if (bookingsData.success && Array.isArray(bookingsData.bookings)) {
        const activeBookings = bookingsData.bookings.filter(
          (booking: Booking) => booking.status === 'pending' || booking.status === 'confirmed'
        );
        
        console.log('📝 Processing active bookings:', activeBookings.length);
        activeBookings.forEach((booking: Booking) => {
          const bookingDate = booking.booking_date.split('T')[0];
          if (bookingDate >= today) {
            marked[bookingDate] = {
              marked: true,
              dotColor: '#FF6B6B', // Red = Booked
              disabled: false,
              disableTouchEvent: false,
            };
          }
        });
      }

      console.log('✅ Calendar data loaded successfully');
      console.log('📊 Total marked dates:', Object.keys(marked).length);
      setMarkedDates(marked);
      
    } catch (error) {
      console.error('❌ Error fetching calendar data:', error);
      setError('Failed to load calendar data');
      Alert.alert('Error', 'Failed to load calendar data. Please check your connection.');
    }
  };

  // ========================================================================
  // USER INTERACTIONS - Handle calendar date clicks and actions
  // ========================================================================

  /**
   * Handle refresh button press
   * Reloads all calendar data from backend
   */
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
   * Handle date press in calendar
   * Shows different actions based on whether date is booked or available
   * ✅ FIXED: Now only finds ACTIVE bookings since we filtered them earlier
   */
  const handleDayPress = (day: DateData) => {
    const dateStr = day.dateString;
    console.log(`📅 Date pressed: ${dateStr}`);

    // Check if this date has an ACTIVE booking (bookings array is already filtered)
    const booking = bookings.find(b => b.booking_date.split('T')[0] === dateStr);
    
    if (booking) {
      // ================================================================
      // BOOKED DATE (RED DOT) - Show booking details
      // ================================================================
      console.log('📌 Found active booking:', booking);
      setSelectedBooking(booking);
      setShowBookingModal(true);
    } else {
      // ================================================================
      // AVAILABLE OR BLOCKED DATE - Allow blocking/unblocking
      // ================================================================
      const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const isCurrentlyBlocked = markedDates[dateStr]?.dotColor === '#FF6B6B';

      if (isCurrentlyBlocked) {
        Alert.alert(
          'Date Blocked',
          `${formattedDate} is currently blocked. Would you like to unblock it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Unblock Date', 
              onPress: () => toggleAvailability(dateStr, true)
            }
          ]
        );
      } else {
        Alert.alert(
          'Date Available',
          `${formattedDate} is currently available. Would you like to block it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Block Date', 
              onPress: () => toggleAvailability(dateStr, false),
              style: 'destructive'
            }
          ]
        );
      }
    }
  };

  /**
   * Mark a date as available or unavailable
   */
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

      console.log('✅ Toggle response:', data);

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

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // ========================================================================
  // BOOKING DETAILS MODAL
  // ========================================================================

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

              <View style={styles.detailRow}>
                <Ionicons name="person" size={20} color="#4A90E2" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>{selectedBooking.customer_name}</Text>
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

  /**
   * Handle booking status change (confirm, cancel, complete)
   */
  const handleBookingAction = async (newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    if (!selectedBooking || !userId) return;

    const actions = {
      confirmed: 'confirm',
      cancelled: 'cancel',
      completed: 'complete'
    };

    Alert.alert(
      `${actions[newStatus].charAt(0).toUpperCase() + actions[newStatus].slice(1)} Booking?`,
      `Are you sure you want to ${actions[newStatus]} this booking?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              console.log(`🔄 Updating booking ${selectedBooking.booking_id} to ${newStatus}`);
              
              const data = await api.patch(
                `/api/availability/bookings/${selectedBooking.booking_id}`,
                { status: newStatus }
              );

              console.log('✅ Update response:', data);

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

  // ========================================================================
  // RENDER - Main screen UI
  // ========================================================================

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
          <Ionicons 
            name="refresh" 
            size={24} 
            color={refreshing ? '#ccc' : '#fff'} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.instructionsContainer}>
          <Ionicons name="information-circle-outline" size={24} color="#4A90E2" />
          <Text style={styles.instructionsText}>
            Green dates are available. Red dates are booked. Tap any date to see details.
          </Text>
        </View>

        <View style={styles.calendarContainer}>
          <Calendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            minDate={new Date().toISOString().split('T')[0]}
            theme={{
              todayTextColor: '#4A90E2',
              arrowColor: '#4A90E2',
            }}
          />
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Available (Tap to block)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
            <Text style={styles.legendText}>Booked (Tap for details)</Text>
          </View>
        </View>

        <Text style={styles.hintText}>
          Tap any red date to see booking details
        </Text>

        {bookings.length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              📊 Active Bookings: {bookings.length}
            </Text>
          </View>
        )}
      </ScrollView>

      <BookingDetailsModal />
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = createResponsiveStyles({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 10 
  },
  loadingText: { 
    fontSize: 16, 
    color: '#666', 
    marginTop: 10 
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 15,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: { 
    flex: 1, 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  refreshButton: { 
    padding: 8, 
    width: 40, 
    alignItems: 'center' 
  },
  scrollView: { 
    flex: 1 
  },
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
  instructionsText: { 
    flex: 1, 
    fontSize: 13,
    color: '#333' 
  },
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
    gap: 20,
    marginTop: 15,
    marginRight: 15,
    paddingRight: 10,
  },
  legendItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  legendDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6 
  },
  legendText: { 
    fontSize: 12,
    color: '#666' 
  },
  hintText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 10,
    marginRight: 25,
    fontStyle: 'italic',
  },
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
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusBadge: {
    color: '#4A90E2',
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeModalButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CalendarScreen;