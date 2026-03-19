/**
 * PaymentScreen.tsx
 * Final payment step. Calls backend to create PaymentIntent,
 * then uses Stripe to confirm payment.
 * 
 * Requires: npm install @stripe/stripe-react-native
 * Then add to app.json plugins: ["@stripe/stripe-react-native"]
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCart } from '../../store/cartSlice';
import API_URL from '../../config/apiConfig';

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const { serviceAddress, totalCents, items } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'saved'>('card');

  const handlePayment = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');

      // For each item, create a payment intent
      for (const item of items) {
        if (!item.provider_stripe_account_id) {
          Alert.alert(
            'Provider Not Ready',
            `${item.title}: This provider hasn't set up payments yet. Please contact them directly.`
          );
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/stripe/payment/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: item.agreed_amount,
            providerStripeAccountId: item.provider_stripe_account_id,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Payment failed');

        // TODO: Use @stripe/stripe-react-native to confirm payment with clientSecret
        // const { error } = await confirmPayment(data.clientSecret, { paymentMethodType: 'Card' });
        // if (error) throw new Error(error.message);
        
        console.log('✅ Payment intent created:', data.clientSecret);
      }

      // Success
      dispatch(clearCart());
      Alert.alert(
        '🎉 Order Placed!',
        'Your service has been booked successfully. The provider will contact you shortly.',
        [{ text: 'OK', onPress: () => navigation.navigate('TabWrapperScreen') }]
      );
    } catch (error: any) {
      Alert.alert('Payment Failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#4A90E2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Order Total Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="receipt-outline" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Order Total</Text>
          </View>
          <Text style={styles.totalAmount}>
            ${(totalCents / 100).toFixed(2)}
          </Text>
          <Text style={styles.totalNote}>Includes 10% platform fee</Text>
        </View>

        {/* Service Address Summary */}
        {serviceAddress && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="location-outline" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Service At</Text>
            </View>
            <Text style={styles.addressText}>{serviceAddress.fullName}</Text>
            <Text style={styles.addressText}>{serviceAddress.street}</Text>
            <Text style={styles.addressText}>
              {serviceAddress.city}, {serviceAddress.state} {serviceAddress.zipCode}
            </Text>
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="card-outline" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>

          <View style={styles.cardPlaceholder}>
            <Ionicons name="card" size={32} color="#4A90E2" />
            <Text style={styles.cardPlaceholderText}>
              Secure payment powered by Stripe
            </Text>
            <Text style={styles.cardNote}>
              Install @stripe/stripe-react-native to enable card input
            </Text>
          </View>
        </View>

        {/* Stripe logo / security note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
          <Text style={styles.securityText}>
            Your payment is secured and encrypted by Stripe
          </Text>
        </View>

        {/* Confirm & Pay */}
        <TouchableOpacity
          style={[styles.payBtn, loading && styles.disabledBtn]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#fff" />
              <Text style={styles.payBtnText}>
                Confirm & Pay ${(totalCents / 100).toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.termsNote}>
          By placing your order you agree to our Terms of Service
        </Text>
      </ScrollView>
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
  section: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#e0e0e0',
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  totalAmount: { fontSize: 36, fontWeight: '800', color: '#4A90E2', textAlign: 'center' },
  totalNote: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 4 },
  addressText: { fontSize: 14, color: '#444', lineHeight: 22 },
  cardPlaceholder: {
    alignItems: 'center', padding: 24, backgroundColor: '#F0F7FF',
    borderRadius: 10, borderWidth: 1, borderColor: '#4A90E2', borderStyle: 'dashed',
  },
  cardPlaceholderText: { fontSize: 14, color: '#4A90E2', fontWeight: '600', marginTop: 8 },
  cardNote: { fontSize: 12, color: '#888', marginTop: 6, textAlign: 'center' },
  securityNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginBottom: 16,
  },
  securityText: { fontSize: 13, color: '#2E7D32', flex: 1 },
  payBtn: {
    backgroundColor: '#4A90E2', borderRadius: 12, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  disabledBtn: { backgroundColor: '#ccc' },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  termsNote: { textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 16 },
});

export default PaymentScreen;