/**
 * ServiceAddressScreen.tsx
 * v3.0 — March 2026
 *
 * Changes:
 *  - ZIP code moved after Street Address; City/State auto-populate from ZIP
 *  - City and State remain editable as manual fallback
 *  - Green location confirmation shown when ZIP resolves
 *  - "Save this address" checkbox persists to AsyncStorage
 *  - On mount: loads previously saved address from AsyncStorage
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setShippingAddress } from '../../store/checkoutSlice';
import { fetchLocationFromZip, isValidZipCode } from '../../Utils/searchUtils';

const SAVED_ADDRESS_KEY = '@gozipmarket_saved_address';

const ServiceAddressScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [notes, setNotes] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [zipLookingUp, setZipLookingUp] = useState(false);
  const [zipResolved, setZipResolved] = useState(false);

  const zipDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load previously saved address on mount
  useEffect(() => {
    AsyncStorage.getItem(SAVED_ADDRESS_KEY).then(stored => {
      if (stored) {
        try {
          const addr = JSON.parse(stored);
          setFullName(addr.fullName || '');
          setPhone(addr.phone || '');
          setStreet(addr.street || '');
          setZipCode(addr.zipCode || '');
          setCity(addr.city || '');
          setState(addr.state || '');
          setNotes(addr.notes || '');
          setSaveAddress(true);
          if (addr.city && addr.state) setZipResolved(true);
        } catch {}
      }
    });
  }, []);

  const handleZipChange = (text: string) => {
    setZipCode(text);
    setZipResolved(false);

    // Clear city/state if ZIP is being re-entered
    if (text.length < 5) {
      setCity('');
      setState('');
    }

    if (zipDebounceRef.current) clearTimeout(zipDebounceRef.current);

    if (text.length === 5 && isValidZipCode(text)) {
      setZipLookingUp(true);
      zipDebounceRef.current = setTimeout(async () => {
        const location = await fetchLocationFromZip(text);
        setZipLookingUp(false);
        if (location) {
          setCity(location.city);
          setState(location.state);
          setZipResolved(true);
        }
      }, 400);
    }
  };

  const handleConfirm = async () => {
    if (!street.trim() || !zipCode.trim() || !city.trim() || !state.trim()) return;
    const address = { fullName, phone, street, zipCode, city, state, notes };
    dispatch(setShippingAddress(address));
    if (saveAddress) {
      await AsyncStorage.setItem(SAVED_ADDRESS_KEY, JSON.stringify(address));
    } else {
      await AsyncStorage.removeItem(SAVED_ADDRESS_KEY);
    }
    navigation.goBack();
  };

  const isValid = !!street.trim() && !!zipCode.trim() && !!city.trim() && !!state.trim();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#4A90E2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Address</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>Enter the address for delivery</Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Street Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address *</Text>
            <TextInput
              style={styles.input}
              value={street}
              onChangeText={setStreet}
              autoCapitalize="words"
            />
          </View>

          {/* ZIP Code — auto-populates City/State */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ZIP Code *</Text>
            <View style={styles.zipRow}>
              <TextInput
                style={[styles.input, styles.zipInput]}
                value={zipCode}
                onChangeText={handleZipChange}
                keyboardType="numeric"
                maxLength={5}
                placeholder="5-digit ZIP"
                placeholderTextColor="#aaa"
              />
              {zipLookingUp && (
                <ActivityIndicator size="small" color="#4A90E2" style={styles.zipSpinner} />
              )}
            </View>
            {zipResolved && city && state && (
              <View style={styles.locationConfirm}>
                <Ionicons name="location" size={14} color="#2E7D32" />
                <Text style={styles.locationConfirmText}>{city}, {state}</Text>
              </View>
            )}
          </View>

          {/* City — auto-populated but editable */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              City *{zipResolved ? '  (auto-filled)' : ''}
            </Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={text => { setCity(text); setZipResolved(false); }}
              autoCapitalize="words"
            />
          </View>

          {/* State — auto-populated but editable */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              State *{zipResolved ? '  (auto-filled)' : ''}
            </Text>
            <TextInput
              style={styles.input}
              value={state}
              onChangeText={text => { setState(text.toUpperCase()); setZipResolved(false); }}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>

          {/* Special Instructions */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Special Instructions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Gate code, parking instructions, etc."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Save address checkbox */}
          <TouchableOpacity
            style={styles.saveRow}
            onPress={() => setSaveAddress(prev => !prev)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, saveAddress && styles.checkboxChecked]}>
              {saveAddress && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.saveLabel}>Save this address for next time</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, !isValid && styles.disabledBtn]}
            onPress={handleConfirm}
            disabled={!isValid}
          >
            <Text style={styles.confirmBtnText}>Deliver to This Address</Text>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A90E2', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#333',
  },
  zipRow: { flexDirection: 'row', alignItems: 'center' },
  zipInput: { flex: 1 },
  zipSpinner: { marginLeft: 10 },
  locationConfirm: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6,
  },
  locationConfirmText: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },
  textArea: { minHeight: 80, paddingTop: 12 },
  saveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 20, marginTop: 4,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: '#4A90E2',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  saveLabel: { fontSize: 14, color: '#444' },
  confirmBtn: {
    backgroundColor: '#4A90E2', borderRadius: 12, paddingVertical: 16, marginTop: 4,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  disabledBtn: { backgroundColor: '#ccc' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ServiceAddressScreen;
