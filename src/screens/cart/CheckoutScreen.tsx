/**
 * CheckoutScreen.tsx
 * Order summary showing cart items, service address, and total.
 * Customer confirms before proceeding to payment.
 * Each item is a per-photo purchase; photo_price is pre-filled if set by provider.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { setAgreedAmount } from '../../store/cartSlice';
import type { RootState } from '../../store/store';

const itemKey = (post_id: number, photo_index: number) => `${post_id}_${photo_index}`;

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const serviceAddress = route.params?.serviceAddress;
  const { items } = useSelector((state: RootState) => state.cart);
  const activeItems = items.filter(i => !i.saved_for_later);

  // Keyed by `${post_id}_${photo_index}`
  const [amounts, setAmounts] = useState<{ [key: string]: string }>({});

  // Pre-fill amounts from photo_price when screen loads
  useEffect(() => {
    const initial: { [key: string]: string } = {};
    activeItems.forEach(item => {
      if (item.photo_price && item.photo_price > 0) {
        const key = itemKey(item.post_id, item.photo_index);
        initial[key] = item.photo_price.toFixed(2);
        dispatch(setAgreedAmount({
          post_id: item.post_id,
          photo_index: item.photo_index,
          amount: Math.round(item.photo_price * 100),
        }));
      }
    });
    if (Object.keys(initial).length > 0) {
      setAmounts(initial);
    }
  }, []);

  const handleAmountChange = (post_id: number, photo_index: number, value: string) => {
    const key = itemKey(post_id, photo_index);
    setAmounts(prev => ({ ...prev, [key]: value }));
    const cents = Math.round(parseFloat(value) * 100);
    if (!isNaN(cents) && cents > 0) {
      dispatch(setAgreedAmount({ post_id, photo_index, amount: cents }));
    }
  };

  const totalCents = activeItems.reduce((sum, item) => {
    const key = itemKey(item.post_id, item.photo_index);
    const amt = amounts[key];
    const cents = amt ? Math.round(parseFloat(amt) * 100) : 0;
    return sum + (isNaN(cents) ? 0 : cents);
  }, 0);

  const platformFee = Math.round(totalCents * 0.10);
  const allAmountsSet = activeItems.every(item => {
    const key = itemKey(item.post_id, item.photo_index);
    const amt = amounts[key];
    return amt && !isNaN(parseFloat(amt)) && parseFloat(amt) > 0;
  });

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

        {/* Service Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="location" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Service Address</Text>
          </View>
          {serviceAddress ? (
            <View style={styles.addressBox}>
              <Text style={styles.addressText}>{serviceAddress.fullName}</Text>
              <Text style={styles.addressText}>{serviceAddress.street}</Text>
              <Text style={styles.addressText}>
                {serviceAddress.city}, {serviceAddress.state} {serviceAddress.zipCode}
              </Text>
              {serviceAddress.notes ? (
                <Text style={styles.addressNotes}>Note: {serviceAddress.notes}</Text>
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
              <Text style={styles.addAddressText}>Add Service Address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="list" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Order Items</Text>
          </View>
          {activeItems.map(item => {
            const key = itemKey(item.post_id, item.photo_index);
            return (
              <View key={key} style={styles.orderItem}>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemTitle} numberOfLines={2}>
                    {item.photo_description || item.title}
                  </Text>
                  {item.photo_description && (
                    <Text style={styles.orderItemSubTitle}>{item.title}</Text>
                  )}
                  <Text style={styles.orderItemCategory}>{item.service_category}</Text>
                  {item.photo_price && item.photo_price > 0 && (
                    <Text style={styles.orderItemPriceRange}>
                      Provider price: ${item.photo_price.toFixed(2)}
                    </Text>
                  )}
                </View>
                <View style={styles.amountInputGroup}>
                  <Text style={styles.amountLabel}>Agreed Amount ($)</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amounts[key] || ''}
                    onChangeText={val => handleAmountChange(item.post_id, item.photo_index, val)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Order Total */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="receipt" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Items Total</Text>
            <Text style={styles.totalValue}>${(totalCents / 100).toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Platform Fee (10%)</Text>
            <Text style={styles.totalValue}>${(platformFee / 100).toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              ${((totalCents + platformFee) / 100).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Place Order Button */}
        <TouchableOpacity
          style={[
            styles.placeOrderBtn,
            (!serviceAddress || !allAmountsSet) && styles.disabledBtn
          ]}
          disabled={!serviceAddress || !allAmountsSet}
          onPress={() => navigation.navigate('PaymentScreen', {
            serviceAddress,
            totalCents: totalCents + platformFee,
            items: activeItems,
          })}
        >
          <Text style={styles.placeOrderBtnText}>Place Your Order</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        {(!serviceAddress || !allAmountsSet) && (
          <Text style={styles.hintText}>
            {!serviceAddress
              ? '⚠️ Please add a service address'
              : '⚠️ Please enter an agreed amount for all items'}
          </Text>
        )}
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
  addressBox: {},
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
  orderItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  orderItemInfo: { marginBottom: 8 },
  orderItemTitle: { fontSize: 14, fontWeight: '700', color: '#222' },
  orderItemSubTitle: { fontSize: 11, color: '#888', fontStyle: 'italic', marginTop: 1 },
  orderItemCategory: { fontSize: 12, color: '#4A90E2', marginTop: 2 },
  orderItemPriceRange: { fontSize: 12, color: '#888', marginTop: 2 },
  amountInputGroup: {},
  amountLabel: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 4 },
  amountInput: {
    backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, color: '#333',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 14, color: '#666' },
  totalValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  grandTotalRow: {
    borderTopWidth: 1, borderTopColor: '#e0e0e0',
    paddingTop: 10, marginTop: 4,
  },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  grandTotalValue: { fontSize: 18, fontWeight: '700', color: '#4A90E2' },
  placeOrderBtn: {
    backgroundColor: '#4A90E2', borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  disabledBtn: { backgroundColor: '#ccc' },
  placeOrderBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hintText: { textAlign: 'center', color: '#E53935', fontSize: 13, marginTop: 10 },
});

export default CheckoutScreen;
