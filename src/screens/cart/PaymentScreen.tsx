/**
 * PaymentScreen.tsx
 * v4.0 — March 2026
 *
 * Zelle payment flow.
 * - Receives providerZelleId from CheckoutScreen route params (read-only)
 * - Fetches business name for order report
 * - Shipping address read from Redux (checkoutSlice)
 * - "Confirm Order" saves order then navigates to OrderReportScreen
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { Alert } from '../../Utils/Alert';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { clearCart } from '../../store/cartSlice';
import { clearCheckout } from '../../store/checkoutSlice';
import type { RootState } from '../../store/store';
import api from '../../api';

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();

  const { shippingAddress } = useSelector((state: RootState) => state.checkout);
  const { totalCents, items, providerZelleId, providerPaymentMethod } = route.params || {};

  const paymentMethodName = ({ zelle: 'Zelle', venmo: 'Venmo', paypal: 'PayPal', cashapp: 'Cash App', cash: 'Cash', check: 'Check' } as Record<string, string>)[providerPaymentMethod || ''] || 'Zelle';
  const isOfflineMethod = providerPaymentMethod === 'cash' || providerPaymentMethod === 'check';

  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);

  // Fetch provider's business name for the order report
  useEffect(() => {
    if (!items || items.length === 0) return;
    const providerUserId = items[0]?.provider_user_id;
    if (!providerUserId) return;
    api.get(`/business-owners/by-user/${providerUserId}`)
      .then((data: any) => { if (data?.business_name) setBusinessName(data.business_name); })
      .catch(() => {});
  }, []);

  const handleConfirmOrder = async () => {
    setLoading(true);
    try {
      const result: any = await api.post('/api/orders', {
        provider_user_id:          items?.[0]?.provider_user_id,
        service_provider_zelle_id: providerZelleId || null,
        total_cents:               totalCents || 0,
        items:                     items,
        shipping_address:          shippingAddress || null,
      });
      dispatch(clearCart());
      dispatch(clearCheckout());
      navigation.navigate('OrderReportScreen', {
        orderId:        result?.id || result?.order_id || null,
        orderDate:      new Date().toISOString(),
        businessName:   businessName,
        items:          items,
        totalCents:     totalCents || 0,
        providerZelleId,
        providerPaymentMethod,
        shippingAddress,
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to confirm order. Please try again.');
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

        {/* Order Summary — table layout */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="receipt-outline" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>

          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colTitle, styles.colHeaderText]}>Item</Text>
            <Text style={[styles.colQty, styles.colHeaderText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.colHeaderText]}>Price</Text>
            <Text style={[styles.colAmount, styles.colHeaderText]}>Amount</Text>
          </View>

          {/* Item rows */}
          {(items || []).map((item: any) => {
            const u = item.photo_price || item.price || 0;
            const qty = item.quantity ?? 1;
            return (
              <View key={`${item.post_id}_${item.photo_index}`} style={styles.tableRow}>
                <Text style={[styles.colTitle, styles.colBodyText]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.colQty, styles.colBodyText]}>{qty}</Text>
                <Text style={[styles.colPrice, styles.colBodyText]}>
                  {u > 0 ? `$${u.toFixed(2)}` : '—'}
                </Text>
                <Text style={[styles.colAmount, styles.colBodyText, u > 0 && styles.amountValue]}>
                  {u > 0 ? `$${(u * qty).toFixed(2)}` : '—'}
                </Text>
              </View>
            );
          })}

          {/* Divider + Total */}
          <View style={styles.tableDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>${((totalCents || 0) / 100).toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Instructions */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="phone-portrait-outline" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Pay via {paymentMethodName}</Text>
          </View>

          {isOfflineMethod ? (
            <View style={styles.zelleBox}>
              <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
              <Text style={styles.zelleInfo}>
                Provider will contact you to arrange{' '}
                <Text style={styles.bold}>{paymentMethodName.toLowerCase()}</Text>{' '}
                payment after the order is confirmed.
              </Text>
            </View>
          ) : providerZelleId ? (
            <View style={styles.zelleBox}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#2E7D32" />
              <Text style={[styles.zelleInfo, { color: '#2E7D32' }]}>
                Send{' '}
                <Text style={styles.bold}>${((totalCents || 0) / 100).toFixed(2)}</Text>
                {' '}via {paymentMethodName} to:{'  '}
                <Text style={styles.bold}>{providerZelleId}</Text>
              </Text>
            </View>
          ) : (
            <View style={styles.zelleBox}>
              <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
              <Text style={styles.zelleInfo}>
                After confirming, the provider will contact you with their {paymentMethodName} details to complete payment.
              </Text>
            </View>
          )}

        </View>

        {/* Shipping Address */}
        {shippingAddress && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="location-outline" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Deliver To</Text>
            </View>
            {shippingAddress.fullName ? (
              <Text style={styles.addressText}>{shippingAddress.fullName}</Text>
            ) : null}
            <Text style={styles.addressText}>{shippingAddress.street}</Text>
            <Text style={styles.addressText}>
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
            </Text>
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.disabledBtn]}
          onPress={handleConfirmOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.confirmBtnText}>Confirm Order</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.termsNote}>
          By confirming you agree to our Terms of Service
        </Text>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.navigate('CartScreen')}
        >
          <Text style={styles.cancelBtnText}>Cancel Order</Text>
        </TouchableOpacity>
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
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { fontSize: 14, color: '#444', flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  zelleBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#F0F7FF', borderRadius: 8, padding: 12, marginBottom: 12,
  },
  zelleInfo: { fontSize: 13, color: '#444', flex: 1, lineHeight: 20 },
  bold: { fontWeight: '700', color: '#333' },
  yourZelleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  yourZelleLabel: { fontSize: 13, color: '#666', fontWeight: '600' },
  yourZelleValue: { fontSize: 13, color: '#4A90E2', fontWeight: '700' },
  addressText: { fontSize: 14, color: '#444', lineHeight: 22 },
  confirmBtn: {
    backgroundColor: '#4A90E2', borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 12,
  },
  disabledBtn: { backgroundColor: '#ccc' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  termsNote: { textAlign: 'center', fontSize: 12, color: '#aaa' },

  // Order Summary table
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  colTitle: { flex: 3, paddingRight: 4 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colAmount: { flex: 1.5, textAlign: 'right' },
  colHeaderText: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase' },
  colBodyText: { fontSize: 13, color: '#333' },
  amountValue: { color: '#2E7D32', fontWeight: '600' },
  tableDivider: { borderTopWidth: 1.5, borderTopColor: '#e0e0e0', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  grandTotalValue: { fontSize: 18, fontWeight: '700', color: '#4A90E2' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelBtnText: { fontSize: 14, color: '#E53935', fontWeight: '600' },
});

export default PaymentScreen;
