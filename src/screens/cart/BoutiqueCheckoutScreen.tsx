/**
 * BoutiqueCheckoutScreen.tsx
 * Checkout flow for Boutique at GoZipMarket orders only.
 * - Fulfillment selector: Ship to Me ($10) or Pickup from Boutique
 * - Shows provider payment method (fetched from their profile)
 * - Shipping address required when Ship is selected
 * - Routes to BoutiquePaymentScreen
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from '../../Utils/Alert';
import { setAgreedAmount } from '../../store/cartSlice';
import { setShippingAddress } from '../../store/checkoutSlice';
import type { RootState } from '../../store/store';
import api from '../../api';

const SAVED_ADDRESS_KEY = '@gozipmarket_saved_address';

const DEFAULT_SHIPPING_FEE_CENTS = 1000; // $10 fallback

const BoutiqueCheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();

  const { items: cartItems } = useSelector((state: RootState) => state.cart);
  const { shippingAddress } = useSelector((state: RootState) => state.checkout);
  // Use items passed from CartScreen (first provider's group); fall back to full cart for direct nav
  const activeItems: typeof cartItems = route.params?.items ?? cartItems.filter(i => !i.saved_for_later);

  const [fulfillmentMethod, setFulfillmentMethod] = useState<'ship' | 'pickup'>(
    route.params?.fulfillmentMethod ?? 'ship'
  );
  const parsePaymentMethods = (raw: string | null | undefined): string[] => {
    if (!raw) return [];
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; } catch { return [raw]; }
  };
  const parsePaymentInfos = (raw: string | null | undefined, methods?: string[]): Record<string, string> => {
    if (!raw) return {};
    try {
      const p = JSON.parse(raw);
      return typeof p === 'object' && !Array.isArray(p) ? p : {};
    } catch {
      // Old format: plain string is the contact handle for the first payment method
      const key = methods?.[0] ?? 'zelle';
      return { [key]: raw };
    }
  };

  const customerSelectedMethod = activeItems[0]?.selected_payment_method;
  const [providerPaymentMethods, setProviderPaymentMethods] = useState<string[]>(
    customerSelectedMethod
      ? [customerSelectedMethod]
      : parsePaymentMethods(activeItems[0]?.post_payment_method)
  );
  const [providerPaymentInfos, setProviderPaymentInfos] = useState<Record<string, string>>(
    parsePaymentInfos(activeItems[0]?.post_payment_info, parsePaymentMethods(activeItems[0]?.post_payment_method))
  );
  const [loadingProvider, setLoadingProvider] = useState(false);

  // Auto-restore saved address from AsyncStorage if Redux has none
  useEffect(() => {
    if (shippingAddress) return;
    AsyncStorage.getItem(SAVED_ADDRESS_KEY).then(stored => {
      if (!stored) return;
      try {
        const addr = JSON.parse(stored);
        // [2026-08-03] [feature/per-photo-inventory] Require phone too — addresses saved
        // before phone became mandatory (or from other stale sessions) would otherwise
        // auto-apply here and let checkout proceed without ever routing the buyer back
        // through ServiceAddressScreen's phone requirement.
        if (addr.street && addr.city && addr.state && addr.zipCode && addr.phone) {
          dispatch(setShippingAddress(addr));
        }
      } catch {}
    });
  }, []);

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

  useEffect(() => {
    // Skip fetch only if customer already chose a method AND info is available
    if (customerSelectedMethod) return;
    const hasMethod = !!activeItems[0]?.post_payment_method;
    const hasInfo = !!activeItems[0]?.post_payment_info;
    if (hasMethod && hasInfo) return;
    const providerUserId = activeItems[0]?.provider_user_id;
    if (!providerUserId) return;
    setLoadingProvider(true);
    api.get(`/business-owners/by-user/${providerUserId}`)
      .then((data: any) => {
        const fetchedMethods = data?.payment_method ? parsePaymentMethods(data.payment_method) : [];
        if (!hasMethod && fetchedMethods.length > 0) {
          setProviderPaymentMethods(fetchedMethods);
        }
        if (!hasInfo && data?.payment_info) {
          const effectiveMethods = fetchedMethods.length > 0 ? fetchedMethods : providerPaymentMethods;
          setProviderPaymentInfos(parsePaymentInfos(data.payment_info, effectiveMethods));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProvider(false));
  }, []);

  const shippingFeeCents = activeItems[0]?.shipping_charge_cents ?? DEFAULT_SHIPPING_FEE_CENTS;
  const subtotalCents = activeItems.reduce((sum, item) => {
    const u = item.photo_price != null ? (parseFloat(String(item.photo_price).replace(/[^0-9.]/g, '')) || 0) : (parseFloat(String(item.price || 0).replace(/[^0-9.]/g, '')) || 0);
    return sum + Math.round(u * 100) * (item.quantity ?? 1);
  }, 0);
  const totalCents = subtotalCents + (fulfillmentMethod === 'ship' ? shippingFeeCents : 0);
  // [2026-08-03] [feature/per-photo-inventory] Also require phone —
  // `checkout.shippingAddress` is redux-persisted, so a stale address saved before phone
  // became mandatory (or restored via AsyncStorage above) could otherwise let checkout
  // proceed without ever collecting a phone number.
  const canPlaceOrder = fulfillmentMethod === 'pickup' || !!(shippingAddress && shippingAddress.phone);

  const PAYMENT_LABELS: Record<string, string> = {
    zelle: 'Zelle', venmo: 'Venmo', paypal: 'PayPal', cashapp: 'Cash App', cash: 'Cash', check: 'Check',
  };
  const OFFLINE_METHODS = ['cash', 'check', 'cashapp'];

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

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="receipt" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.colTitle, styles.colHeaderText]}>Item</Text>
            <Text style={[styles.colQty, styles.colHeaderText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.colHeaderText]}>Price</Text>
            <Text style={[styles.colAmount, styles.colHeaderText]}>Amount</Text>
          </View>
          {activeItems.map(item => {
            const u = item.photo_price != null ? (parseFloat(String(item.photo_price).replace(/[^0-9.]/g, '')) || 0) : (parseFloat(String(item.price || 0).replace(/[^0-9.]/g, '')) || 0);
            const qty = item.quantity ?? 1;
            const itemId = `#P${item.post_id}-${(item.photo_index ?? 0) + 1}`;
            return (
              <View key={`${item.post_id}_${item.photo_index}`} style={styles.tableRow}>
                <View style={[styles.colTitle, { gap: 4 }]}>
                  {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.itemThumb} /> : null}
                  <Text style={[styles.colBodyText, { fontWeight: '700' }]} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.itemId}>{itemId}</Text>
                  {item.provider_name ? <Text style={styles.itemProvider}>by {item.provider_name}</Text> : null}
                </View>
                <Text style={[styles.colQty, styles.colBodyText]}>{qty}</Text>
                <Text style={[styles.colPrice, styles.colBodyText]}>${u.toFixed(2)}</Text>
                <Text style={[styles.colAmount, styles.colBodyText, styles.amountValue]}>${(u * qty).toFixed(2)}</Text>
              </View>
            );
          })}
          <View style={styles.tableDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Subtotal</Text>
            <Text style={styles.grandTotalValue}>${(subtotalCents / 100).toFixed(2)}</Text>
          </View>
          {fulfillmentMethod === 'ship' && (
            <View style={[styles.totalRow, { marginTop: 4 }]}>
              <Text style={styles.grandTotalLabel}>Shipping</Text>
              <Text style={styles.grandTotalValue}>${(shippingFeeCents / 100).toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: 6 }]}>
            <Text style={[styles.grandTotalLabel, { fontSize: 17 }]}>Total</Text>
            <Text style={[styles.grandTotalValue, { fontSize: 20 }]}>${(totalCents / 100).toFixed(2)}</Text>
          </View>
        </View>

        {/* Fulfillment Selector */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="car-outline" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Fulfillment</Text>
          </View>
          <View style={styles.fulfillmentRow}>
            <TouchableOpacity
              style={[styles.fulfillmentBtn, fulfillmentMethod === 'pickup' && styles.fulfillmentBtnActive]}
              onPress={() => setFulfillmentMethod('pickup')}
            >
              <Ionicons name="storefront-outline" size={15} color={fulfillmentMethod === 'pickup' ? '#fff' : '#4A90E2'} />
              <Text style={[styles.fulfillmentBtnText, fulfillmentMethod === 'pickup' && styles.fulfillmentBtnTextActive]}>
                Pickup from Boutique
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fulfillmentBtn, fulfillmentMethod === 'ship' && styles.fulfillmentBtnActive]}
              onPress={() => setFulfillmentMethod('ship')}
            >
              <Ionicons name="car-outline" size={15} color={fulfillmentMethod === 'ship' ? '#fff' : '#4A90E2'} />
              <Text style={[styles.fulfillmentBtnText, fulfillmentMethod === 'ship' && styles.fulfillmentBtnTextActive]}>
                {`Ship to Me\n$${(shippingFeeCents / 100).toFixed(2)} for each order`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shipping Address — only for Ship */}
        {fulfillmentMethod === 'ship' && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="location" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>
                Shipping Address <Text style={styles.required}>*</Text>
              </Text>
            </View>
            {shippingAddress ? (
              <View>
                {shippingAddress.fullName ? <Text style={styles.addressText}>{shippingAddress.fullName}</Text> : null}
                {shippingAddress.phone ? (
                  <Text style={styles.addressText}>{shippingAddress.phone}</Text>
                ) : (
                  <Text style={[styles.addressText, { color: '#E53935' }]}>Phone required — tap Change Address to add it</Text>
                )}
                <Text style={styles.addressText}>{shippingAddress.street}</Text>
                <Text style={styles.addressText}>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</Text>
                {shippingAddress.notes ? <Text style={styles.addressNotes}>Note: {shippingAddress.notes}</Text> : null}
                <TouchableOpacity onPress={() => navigation.navigate('ServiceAddressScreen')} style={styles.changeAddressBtn}>
                  <Text style={styles.changeAddressText}>Change Address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.addAddressBtn} onPress={() => navigation.navigate('ServiceAddressScreen')}>
                  <Ionicons name="add-circle-outline" size={20} color="#4A90E2" />
                  <Text style={styles.addAddressText}>Add Shipping Address</Text>
                </TouchableOpacity>
                <Text style={styles.addressHint}>
                  Tap above, fill in your address, then tap "Deliver to this Address" to enable Place Order.
                </Text>
              </>
            )}
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="card" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>{customerSelectedMethod ? 'Your Selected Payment Method' : 'Payment Methods Accepted'}</Text>
          </View>
          {loadingProvider ? (
            <ActivityIndicator size="small" color="#4A90E2" style={{ marginTop: 8 }} />
          ) : providerPaymentMethods.length === 0 ? (
            <Text style={styles.zelleUnavailable}>
              Provider payment details not set — they will contact you after order is placed.
            </Text>
          ) : (
            providerPaymentMethods.map(method => {
              const label = PAYMENT_LABELS[method] || method;
              const handle = providerPaymentInfos[method];
              const isOffline = OFFLINE_METHODS.includes(method);
              return (
                <View key={method} style={{ marginBottom: 8 }}>
                  <Text style={styles.paymentLabel}>{label}</Text>
                  {handle ? (
                    <View style={styles.zelleReadOnly}>
                      <Ionicons name="phone-portrait-outline" size={16} color="#2E7D32" />
                      <Text style={styles.zelleReadOnlyText}>{handle}</Text>
                    </View>
                  ) : isOffline ? (
                    <Text style={{ fontSize: 12, color: '#888' }}>
                      Provider will reach out with {label} details after order is placed.
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color="#888" style={{ marginTop: 2 }} />
          <Text style={styles.disclaimerText}>
            <Text style={styles.disclaimerBold}>Disclaimer: </Text>
            GoZipMarket is an independent marketplace platform that connects buyers and service providers. GoZipMarket is not a party to any transaction and accepts no responsibility or liability for payment disputes, non-payment, fraud, non-delivery, or any damages arising from transactions conducted between users. All payments are made directly between the buyer and the service provider. Users are solely responsible for fulfilling their obligations under any transaction.
          </Text>
        </View>

        {/* Place Order */}
        <View style={styles.placeOrderRow}>
          <TouchableOpacity
            style={[styles.placeOrderBtn, !canPlaceOrder && styles.disabledBtn]}
            onPress={() => {
              if (!canPlaceOrder) {
                Alert.alert(
                  'Address Required',
                  'Please enter your shipping address and phone number before placing your order.'
                );
                return;
              }
              navigation.navigate('BoutiquePaymentScreen', {
                totalCents,
                items: activeItems,
                providerPaymentMethods,
                providerPaymentInfos,
                fulfillmentMethod,
              });
            }}
          >
            <Text style={styles.placeOrderBtnText}>Place Order</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.navigate('CartScreen')}>
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
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  colTitle: { flex: 3, paddingRight: 4 },
  itemThumb: { width: 48, height: 48, borderRadius: 6, marginBottom: 4, backgroundColor: '#f0f0f0' },
  itemId: { fontSize: 12, fontWeight: '700', color: '#555', marginTop: 2 },
  itemProvider: { fontSize: 11, color: '#888', marginTop: 1 },
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
  fulfillmentRow: { flexDirection: 'row', gap: 8 },
  fulfillmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#4A90E2', backgroundColor: '#fff',
  },
  fulfillmentBtnActive: { backgroundColor: '#4A90E2' },
  fulfillmentBtnText: { fontSize: 12, fontWeight: '600', color: '#4A90E2', textAlign: 'center' },
  fulfillmentBtnTextActive: { color: '#fff' },
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
  addressHint: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
  paymentLabel: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 8 },
  zelleReadOnly: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#A5D6A7',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  zelleReadOnlyText: { fontSize: 15, color: '#2E7D32', fontWeight: '700' },
  zelleUnavailable: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
  disclaimer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 14,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#F57F17', borderWidth: 1, borderColor: '#FFE082',
  },
  disclaimerText: { fontSize: 12, color: '#5D4037', lineHeight: 18, flex: 1 },
  disclaimerBold: { fontWeight: '700', color: '#E65100' },
  placeOrderRow: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  placeOrderBtn: {
    backgroundColor: '#4A90E2', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  disabledBtn: { backgroundColor: '#ccc' },
  placeOrderBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, color: '#E53935', fontWeight: '600' },
});

export default BoutiqueCheckoutScreen;
