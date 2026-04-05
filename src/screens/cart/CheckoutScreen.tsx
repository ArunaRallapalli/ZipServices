/**
 * CheckoutScreen.tsx
 * v4.0 — March 2026
 *
 * Changes:
 *  - Payment Method now shows provider's Zelle ID (auto-fetched, read-only)
 *  - Removed buyer Zelle ID input — buyer doesn't need to enter their own ID
 *  - Place Order enabled when shippingAddress is set
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { setAgreedAmount } from '../../store/cartSlice';
import type { RootState } from '../../store/store';
import api from '../../api';

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const { items } = useSelector((state: RootState) => state.cart);
  const { shippingAddress } = useSelector((state: RootState) => state.checkout);
  const activeItems = items.filter(i => !i.saved_for_later);

  const [providerZelleId, setProviderZelleId] = useState<string | null>(null);
  const [loadingZelle, setLoadingZelle] = useState(false);

  // Auto-set agreed amounts from photo_price on mount
  useEffect(() => {
    activeItems.forEach(item => {
      if (item.photo_price && item.photo_price > 0) {
        dispatch(setAgreedAmount({
          post_id: item.post_id,
          photo_index: item.photo_index,
          amount: Math.round(item.photo_price * 100),
        }));
      }
    });
  }, []);

  // Fetch provider's Zelle ID from their business profile
  useEffect(() => {
    const providerUserId = activeItems[0]?.provider_user_id;
    if (!providerUserId) return;
    setLoadingZelle(true);
    api.get(`/business-owners/by-user/${providerUserId}`)
      .then((data: any) => { if (data?.zelle_id) setProviderZelleId(data.zelle_id); })
      .catch(() => {})
      .finally(() => setLoadingZelle(false));
  }, []);

  const totalCents = activeItems.reduce((sum, item) => {
    const unitPrice = parseFloat(String(item.photo_price || item.price || 0)) || 0;
    return sum + Math.round(unitPrice * 100) * (item.quantity ?? 1);
  }, 0);

  const canPlaceOrder = !!shippingAddress;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#4A90E2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Order Summary — table layout */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="receipt" size={18} color="#4A90E2" />
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
          {activeItems.map(item => {
            const key = `${item.post_id}_${item.photo_index}`;
            const u = parseFloat(String(item.photo_price || item.price || 0)) || 0;
            const qty = item.quantity ?? 1;
            return (
              <View key={key} style={styles.tableRow}>
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
            <Text style={styles.grandTotalValue}>${(totalCents / 100).toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Method — provider Zelle ID (read-only) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="card" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          <Text style={styles.paymentLabel}>Pay via Zelle to:</Text>
          {loadingZelle ? (
            <ActivityIndicator size="small" color="#4A90E2" style={{ marginTop: 8 }} />
          ) : providerZelleId ? (
            <View style={styles.zelleReadOnly}>
              <Ionicons name="phone-portrait-outline" size={16} color="#2E7D32" />
              <Text style={styles.zelleReadOnlyText}>{providerZelleId}</Text>
            </View>
          ) : (
            <Text style={styles.zelleUnavailable}>
              Provider Zelle ID not set — they will contact you after order is placed.
            </Text>
          )}
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="location" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>
              Shipping Address <Text style={styles.required}>*</Text>
            </Text>
          </View>
          {shippingAddress ? (
            <View>
              {shippingAddress.fullName ? (
                <Text style={styles.addressText}>{shippingAddress.fullName}</Text>
              ) : null}
              <Text style={styles.addressText}>{shippingAddress.street}</Text>
              <Text style={styles.addressText}>
                {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
              </Text>
              {shippingAddress.notes ? (
                <Text style={styles.addressNotes}>Note: {shippingAddress.notes}</Text>
              ) : null}
              <TouchableOpacity
                onPress={() => navigation.navigate('ServiceAddressScreen')}
                style={styles.changeAddressBtn}
              >
                <Text style={styles.changeAddressText}>Change Address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addAddressBtn}
              onPress={() => navigation.navigate('ServiceAddressScreen')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#4A90E2" />
              <Text style={styles.addAddressText}>Add Shipping Address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Place Order + Cancel */}
        <View style={styles.placeOrderRow}>
          <TouchableOpacity
            style={[styles.placeOrderBtn, !canPlaceOrder && styles.disabledBtn]}
            disabled={!canPlaceOrder}
            onPress={() => navigation.navigate('PaymentScreen', {
              totalCents,
              items: activeItems,
              providerZelleId,
            })}
          >
            <Text style={styles.placeOrderBtnText}>Place Order</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.navigate('CartScreen')}
          >
            <Text style={styles.cancelBtnText}>Cancel Order</Text>
          </TouchableOpacity>
        </View>

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
  required: { color: '#E53935', fontWeight: '700' },
  orderItem: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  orderItemTitle: { fontSize: 14, fontWeight: '700', color: '#222' },
  orderItemSubTitle: { fontSize: 11, color: '#888', fontStyle: 'italic', marginTop: 1 },
  orderItemCategory: { fontSize: 12, color: '#4A90E2', marginTop: 2 },
  orderItemPrice: { fontSize: 14, fontWeight: '600', color: '#2E7D32', marginTop: 4 },
  orderItemPriceMissing: { fontSize: 12, color: '#aaa', fontStyle: 'italic', marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  grandTotalValue: { fontSize: 18, fontWeight: '700', color: '#4A90E2' },
  paymentLabel: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 8 },
  zelleReadOnly: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#A5D6A7',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  zelleReadOnlyText: { fontSize: 15, color: '#2E7D32', fontWeight: '700' },
  zelleUnavailable: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
  addressText: { fontSize: 14, color: '#444', lineHeight: 22 },
  addressNotes: { fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 4 },
  changeAddressBtn: { marginTop: 10 },
  changeAddressText: { fontSize: 13, color: '#4A90E2', fontWeight: '600' },
  addAddressBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0F7FF', padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#4A90E2', borderStyle: 'dashed',
  },
  addAddressText: { fontSize: 14, color: '#4A90E2', fontWeight: '600' },
  placeOrderRow: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  placeOrderBtn: {
    backgroundColor: '#7AB8F5', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  disabledBtn: { backgroundColor: '#ccc' },
  placeOrderBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, color: '#E53935', fontWeight: '600' },

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
});

export default CheckoutScreen;
