/**
 * ============================================================================
 * AvailabilityCalendarWidget.tsx - ULTRA COMPACT Customer Booking Calendar
 * ============================================================================
 *
 * Last Updated: February 27, 2026
 * Changes:
 *   - FIX: TimeSlotModal inlined (was defined as sub-component → caused
 *          flicker/remount on every parent render + broke fetchAvailability
 *          callback after booking)
 *   - FEATURE: Tab toggle in time modal — "Time Slots" (preset) vs
 *              "Custom Time" (free text HH:MM, validated against booked slots)
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from '../Utils/Alert';
import api from '../api';

/** Returns today's date as YYYY-MM-DD in LOCAL time (not UTC) */
const getLocalToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
];

const TOTAL_SLOTS = TIME_SLOTS.length; // 9 — fully booked when all are taken

// ============================================================================
// HELPERS
// ============================================================================

/** "09:00" -> "9:00 AM - 10:00 AM" (1-hour slot) */
const formatTimeRange = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const endH = h + 1;
  const startPeriod = h >= 12 ? 'PM' : 'AM';
  const endPeriod = endH >= 12 ? 'PM' : 'AM';
  const startHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const endHour = endH > 12 ? endH - 12 : endH === 0 ? 12 : endH;
  return `${startHour}:${m.toString().padStart(2, '0')} ${startPeriod} - ${endHour}:${m.toString().padStart(2, '0')} ${endPeriod}`;
};

/**
 * Validate a free-text time entry.
 * Returns null if valid, error string if invalid.
 */
const validateCustomTime = (input: string, bookedSlots: string[]): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return 'Please enter a time';

  const regex = /^([0-9]{1,2}):([0-5][0-9])$/;
  if (!regex.test(trimmed)) return 'Use format HH:MM (e.g. 10:30 or 14:00)';

  const [h] = trimmed.split(':').map(Number);
  if (h < 0 || h > 23) return 'Hour must be 0-23';
  if (h < 9 || h >= 17) return 'Please choose a time between 9:00 and 17:00';

  const normalized = `${String(h).padStart(2, '0')}:${trimmed.split(':')[1]}`;
  if (bookedSlots.includes(normalized)) return 'This time slot is already booked';

  return null;
};

/** Normalize "9:30" -> "09:30" for consistent backend storage */
const normalizeTime = (input: string): string => {
  const [h, m] = input.trim().split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState<Record<string, string[]>>({});

  // Tab state for modal
  const [timeInputMode, setTimeInputMode] = useState<'slots' | 'custom'>('slots');
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [customTimeError, setCustomTimeError] = useState('');

  useEffect(() => {
    loadCurrentUser();
    fetchAvailability();

    const refreshInterval = setInterval(() => {
      fetchAvailability();
    }, 20000);

    return () => clearInterval(refreshInterval);
  }, []);

  const loadCurrentUser = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) setCurrentUserId(parseInt(storedUserId));
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const fetchAvailability = async () => {
    try {
      const data = await api.get(`/api/availability/${otherUserId}`);

      if (data.success) {
        const marked: MarkedDates = {};
        const today = getLocalToday();

        // Step 1: All future dates green by default
        for (let i = 0; i < 60; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          marked[dateStr] = { marked: true, dotColor: '#4CAF50', disabled: false, disableTouchEvent: false };
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

        // Step 3: Count booked slots per date -> yellow (partial) or red (full)
        const slotsByDate: Record<string, string[]> = {};
        if (data.bookings && Array.isArray(data.bookings)) {
          data.bookings.forEach((booking: any) => {
            const bookingDate = booking.booking_date.split('T')[0];
            if (bookingDate >= today) {
              if (!slotsByDate[bookingDate]) slotsByDate[bookingDate] = [];
              if (booking.booking_time) slotsByDate[bookingDate].push(booking.booking_time);
            }
          });

          Object.entries(slotsByDate).forEach(([date, slots]) => {
            const isFullyBooked = slots.length >= TOTAL_SLOTS;
            marked[date] = {
              marked: true,
              dotColor: isFullyBooked ? '#FF6B6B' : '#FFA500',
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

  const handleDayPress = (day: any) => {
    const dateStr = day.dateString;

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

    // Reset modal state each open
    setTimeInputMode('slots');
    setCustomTimeInput('');
    setCustomTimeError('');
    setSelectedDate(dateStr);
    setShowTimeModal(true);
  };

  const createBooking = async (bookingDate: string, bookingTime: string) => {
    setShowTimeModal(false);
    try {
      const data = await api.post('/api/availability/book', {
        serviceProviderId: otherUserId,
        customerId: currentUserId,
        bookingDate,
        bookingTime,
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
      console.error('Booking error:', error);
      Alert.alert('Error', error.message || 'Failed to create booking. Please try again.');
    }
  };

  const handleCustomTimeSubmit = () => {
    if (!selectedDate) return;
    const bookedSlots = bookedSlotsByDate[selectedDate] || [];
    const error = validateCustomTime(customTimeInput, bookedSlots);
    if (error) {
      setCustomTimeError(error);
      return;
    }
    setCustomTimeError('');
    createBooking(selectedDate, normalizeTime(customTimeInput));
  };

  // ============================================================================
  // MODAL CONTENT HELPERS (plain functions returning JSX, not sub-components)
  // This is the key fix: we return JSX from functions rather than defining
  // React components inside the parent. React components defined inside another
  // component get a new identity on every render, causing unmount/remount.
  // ============================================================================

  const getModalDateHeader = (): string => {
    if (!selectedDate) return '';
    const [year, month, day] = selectedDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const renderSlotsTab = () => {
    if (!selectedDate) return null;
    const bookedSlots = bookedSlotsByDate[selectedDate] || [];
    return (
      <>
        {bookedSlots.length > 0 && (
          <Text style={tsStyles.partialNote}>
            {TOTAL_SLOTS - bookedSlots.length} of {TOTAL_SLOTS} slots available
          </Text>
        )}
        <ScrollView style={{ maxHeight: 320 }}>
          {TIME_SLOTS.map(slot => {
            const isBooked = bookedSlots.includes(slot);
            return (
              <TouchableOpacity
                key={slot}
                style={[tsStyles.slotBtn, isBooked && tsStyles.slotBtnBooked]}
                onPress={() => !isBooked && selectedDate && createBooking(selectedDate, slot)}
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
      </>
    );
  };

  const renderCustomTab = () => {
    if (!selectedDate) return null;
    const bookedSlots = bookedSlotsByDate[selectedDate] || [];
    return (
      <View style={tsStyles.customContainer}>
        <Text style={tsStyles.customLabel}>Enter your preferred time</Text>
        <Text style={tsStyles.customHint}>Format: HH:MM  e.g. 10:30 or 14:00  (hours 9-17)</Text>

        <TextInput
          style={[tsStyles.customInput, customTimeError ? tsStyles.customInputError : null]}
          placeholder="e.g. 10:30"
          placeholderTextColor="#bbb"
          value={customTimeInput}
          onChangeText={text => {
            setCustomTimeInput(text);
            if (customTimeError) setCustomTimeError('');
          }}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          autoFocus
        />
        {!!customTimeError && (
          <Text style={tsStyles.customError}>{customTimeError}</Text>
        )}

        {/* Show already-booked times so customer knows what to avoid */}
        {bookedSlots.length > 0 && (
          <View style={tsStyles.bookedSlotsInfo}>
            <Text style={tsStyles.bookedSlotsTitle}>Already booked on this date:</Text>
            <Text style={tsStyles.bookedSlotsList}>
              {bookedSlots
                .slice()
                .sort()
                .map(s => formatTimeRange(s))
                .join('  |  ')}
            </Text>
          </View>
        )}

        <TouchableOpacity style={tsStyles.submitBtn} onPress={handleCustomTimeSubmit}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={tsStyles.submitTxt}>Request This Time</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={16} color="#4A90E2" />
          <Text style={styles.headerTitle}>Book Date</Text>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#999" />
        </View>
        <View style={styles.headerRight}>
          {isExpanded && (
            <TouchableOpacity
              onPress={e => { e.stopPropagation(); handleRefresh(); }}
              style={styles.btn}
              disabled={refreshing}
            >
              <Ionicons name="refresh" size={16} color={refreshing ? '#ccc' : '#4A90E2'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={e => { e.stopPropagation(); onClose(); }} style={styles.btn}>
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
                minDate={getLocalToday()}
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

      {/*
        TIME SLOT MODAL — inlined JSX, NOT a sub-component.
        
        Root cause of flicker bug: defining `const TimeSlotModal = () => ...`
        inside this component causes React to create a brand-new component TYPE
        on every parent render. React unmounts + remounts it each time any state
        changes (e.g. the auto-refresh interval, a keypress), which:
          1. Makes the modal visibly flicker/reset
          2. Loses TextInput focus
          3. Breaks the `onPress: fetchAvailability` closure after booking
        
        Fix: inline the Modal JSX directly in the return, calling plain render
        helper functions (renderSlotsTab / renderCustomTab) that return JSX
        but are NOT React component definitions.
      */}
      <Modal
        visible={showTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={tsStyles.overlay}>
            <View style={tsStyles.sheet}>
              <Text style={tsStyles.title}>Select a Time</Text>
              <Text style={tsStyles.subtitle}>{getModalDateHeader()}</Text>

              {/* Tab toggle */}
              <View style={tsStyles.tabRow}>
                <TouchableOpacity
                  style={[tsStyles.tab, timeInputMode === 'slots' && tsStyles.tabActive]}
                  onPress={() => { setTimeInputMode('slots'); setCustomTimeError(''); }}
                >
                  <Ionicons name="time-outline" size={14} color={timeInputMode === 'slots' ? '#4A90E2' : '#999'} />
                  <Text style={[tsStyles.tabTxt, timeInputMode === 'slots' && tsStyles.tabTxtActive]}>
                    Time Slots
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[tsStyles.tab, timeInputMode === 'custom' && tsStyles.tabActive]}
                  onPress={() => { setTimeInputMode('custom'); setCustomTimeError(''); }}
                >
                  <Ionicons name="create-outline" size={14} color={timeInputMode === 'custom' ? '#4A90E2' : '#999'} />
                  <Text style={[tsStyles.tabTxt, timeInputMode === 'custom' && tsStyles.tabTxtActive]}>
                    Custom Time
                  </Text>
                </TouchableOpacity>
              </View>

              {timeInputMode === 'slots' ? renderSlotsTab() : renderCustomTab()}

              <TouchableOpacity style={tsStyles.cancelBtn} onPress={() => setShowTimeModal(false)}>
                <Text style={tsStyles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 13, fontWeight: '600', color: '#333' },
  headerRight: { flexDirection: 'row', gap: 4 },
  btn: { padding: 4 },
  content: { paddingHorizontal: 6, paddingBottom: 12, maxHeight: 400 },
  loading: { paddingVertical: 20, alignItems: 'center' },
  calendar: { borderRadius: 6 },
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
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 11, color: '#666', fontWeight: '500' },
  noteText: { fontSize: 10, color: '#888', textAlign: 'center', fontStyle: 'italic', lineHeight: 14 },
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
    maxHeight: '85%',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 12 },

  // Tab toggle
  tabRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    backgroundColor: '#f9f9f9',
  },
  tabActive: { backgroundColor: '#EAF3FB' },
  tabTxt: { fontSize: 13, color: '#999', fontWeight: '500' },
  tabTxtActive: { color: '#4A90E2', fontWeight: '700' },

  // Slots tab
  partialNote: { fontSize: 12, color: '#FFA500', textAlign: 'center', fontWeight: '600', marginBottom: 10 },
  slotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  slotBtnBooked: { backgroundColor: '#fafafa' },
  slotTxt: { fontSize: 15, color: '#333', flex: 1 },
  slotTxtBooked: { color: '#ccc' },
  bookedLabel: { fontSize: 11, color: '#ccc', fontStyle: 'italic' },

  // Custom tab
  customContainer: { paddingVertical: 4 },
  customLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  customHint: { fontSize: 11, color: '#aaa', marginBottom: 12 },
  customInput: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
  },
  customInputError: { borderColor: '#FF6B6B' },
  customError: { fontSize: 12, color: '#FF6B6B', textAlign: 'center', marginBottom: 10 },
  bookedSlotsInfo: {
    backgroundColor: '#fff8f0',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  bookedSlotsTitle: { fontSize: 11, color: '#FFA500', fontWeight: '600', marginBottom: 4 },
  bookedSlotsList: { fontSize: 11, color: '#888', lineHeight: 18 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 10,
  },
  submitTxt: { fontSize: 15, color: '#fff', fontWeight: '600' },

  // Cancel
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  cancelTxt: { fontSize: 15, color: '#666', fontWeight: '600' },
});

export default AvailabilityCalendarWidget;