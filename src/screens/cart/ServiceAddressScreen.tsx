/**
 * ServiceAddressScreen.tsx
 * Customer enters the address where the service will be performed.
 * Feeds into CheckoutScreen → PaymentScreen flow.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const ServiceAddressScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { onAddressConfirmed } = route.params || {};

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (!fullName.trim() || !street.trim() || !city.trim() || !state.trim() || !zipCode.trim()) {
      return;
    }
    const address = { fullName, phone, street, city, state, zipCode, notes };
    navigation.navigate('CheckoutScreen', { serviceAddress: address });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#4A90E2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Address</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>
            Enter the address where you need the service performed
          </Text>

          {[
            { label: 'Full Name *', value: fullName, setter: setFullName, placeholder: 'John Doe' },
            { label: 'Phone Number', value: phone, setter: setPhone, placeholder: '(555) 555-5555', keyboardType: 'phone-pad' },
            { label: 'Street Address *', value: street, setter: setStreet, placeholder: '123 Main St' },
            { label: 'City *', value: city, setter: setCity, placeholder: 'Phoenix' },
            { label: 'State *', value: state, setter: setState, placeholder: 'AZ' },
            { label: 'ZIP Code *', value: zipCode, setter: setZipCode, placeholder: '85001', keyboardType: 'numeric' },
          ].map(({ label, value, setter, placeholder, keyboardType }: any) => (
            <View key={label} style={styles.inputGroup}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                keyboardType={keyboardType || 'default'}
                autoCapitalize="words"
              />
            </View>
          ))}

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

          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!fullName || !street || !city || !state || !zipCode) && styles.disabledBtn
            ]}
            onPress={handleConfirm}
            disabled={!fullName || !street || !city || !state || !zipCode}
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
  textArea: { minHeight: 80, paddingTop: 12 },
  confirmBtn: {
    backgroundColor: '#4A90E2', borderRadius: 12, paddingVertical: 16, marginTop: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  disabledBtn: { backgroundColor: '#ccc' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ServiceAddressScreen;