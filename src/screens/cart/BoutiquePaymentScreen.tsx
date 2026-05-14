/**
 * BoutiquePaymentScreen.tsx
 * Payment confirmation screen for Boutique at GoZipMarket orders only.
 * - Shows order summary with shipping fee row when applicable
 * - Shows provider's payment method (Zelle, Venmo, etc.)
 * - Shows fulfillment method (Ship / Pickup)
 * - Confirm Order saves the order and navigates to OrderReportScreen
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { Alert } from '../../Utils/Alert';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { removeItems } from '../../store/cartSlice';
import { clearCheckout } from '../../store/checkoutSlice';
import type { RootState } from '../../store/store';
import api from '../../api';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  zelle: 'Zelle', venmo: 'Venmo', paypal: 'PayPal', cashapp: 'Cash App', cash: 'Cash', check: 'Check',
};

const BoutiquePaymentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();

  const { shippingAddress } = useSelector((state: RootState) => state.checkout);
  const { totalCents, items, providerPaymentMethods, providerPaymentInfos, providerPaymentMethod, providerZelleId, fulfillmentMethod } = route.params || {};

  // Support both old single-method params and new multi-method params
  const methods: string[] = providerPaymentMethods ?? (providerPaymentMethod ? [providerPaymentMethod] : []);
  const infos: Record<string, string> = providerPaymentInfos ?? (providerZelleId && providerPaymentMethod ? { [providerPaymentMethod]: providerZelleId } : {});
  const OFFLINE_METHODS = ['cash', 'check', 'cashapp'];

  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  useEffect(() => {
    if (!items || items.length === 0) return;
    const providerUserId = items[0]?.provider_user_id;
    if (!providerUserId) return;
    api.get(`/business-owners/by-user/${providerUserId}`)
      .then((data: any) => { if (data?.business_name) setBusinessName(data.business_name); })
      .catch(() => {});
  }, []);

  const itemsSubtotal = (items || []).reduce((sum: number, item: any) => {
    const u = item.photo_price != null ? (parseFloat(String(item.photo_price).replace(/[^0-9.]/g, '')) || 0) : (parseFloat(String(item.price || 0).replace(/[^0-9.]/g, '')) || 0);
    return sum + u * (item.quantity ?? 1);
  }, 0);
  const shippingFee = (totalCents || 0) / 100 - itemsSubtotal;

  const handleConfirmOrder = async () => {
    setLoading(true);
    try {
      const result: any = await api.post('/api/orders', {
        provider_user_id:          items?.[0]?.provider_user_id,
        service_provider_zelle_id: infos['zelle'] || providerZelleId || null,
        payment_methods:           methods,
        payment_infos:             infos,
        total_cents:               totalCents || 0,
        items,
        shipping_address:          shippingAddress || null,
        buyer_timezone:            Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      dispatch(removeItems((items || []).map((i: any) => ({ post_id: i.post_id, photo_index: i.photo_index }))));
      dispatch(clearCheckout());
      navigation.navigate('OrderReportScreen', {
        orderId:               result?.id || result?.order_id || null,
        orderDate:             new Date().toISOString(),
        businessName,
        items,
        totalCents:            totalCents || 0,
        shippingCents:         shippingFee > 0 ? Math.round(shippingFee * 100) : 0,
        providerPaymentMethods: methods,
        providerPaymentInfos:   infos,
        shippingAddress,
        fulfillmentMethod:     fulfillmentMethod || 'ship',
      });
    } catch {
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

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="receipt-outline" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.colTitle, styles.colHeaderText]}>Item</Text>
            <Text style={[styles.colQty, styles.colHeaderText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.colHeaderText]}>Price</Text>
            <Text style={[styles.colAmount, styles.colHeaderText]}>Amount</Text>
          </View>
          {(items || []).map((item: any) => {
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
          {shippingFee > 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.colTitle, styles.colBodyText]}>Shipping &amp; Handling</Text>
              <Text style={[styles.colQty, styles.colBodyText]} />
              <Text style={[styles.colPrice, styles.colBodyText]} />
              <Text style={[styles.colAmount, styles.colBodyText, styles.amountValue]}>${shippingFee.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.tableDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>${((totalCents || 0) / 100).toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Instructions */}
        {(totalCents || 0) > 0 && methods.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="phone-portrait-outline" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Payment Options</Text>
            </View>
            {methods.map(method => {
              const label = PAYMENT_METHOD_LABELS[method] || method;
              const handle = infos[method];
              const isOffline = OFFLINE_METHODS.includes(method);
              return (
                <View key={method} style={[styles.infoBox, { marginBottom: 8 }]}>
                  {handle ? (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#2E7D32" />
                      <Text style={[styles.infoText, { color: '#2E7D32' }]}>
                        Send <Text style={styles.bold}>${((totalCents || 0) / 100).toFixed(2)}</Text>
                        {' '}via <Text style={styles.bold}>{label}</Text> to: <Text style={styles.bold}>{handle}</Text>
                      </Text>
                    </>
                  ) : isOffline ? (
                    <>
                      <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
                      <Text style={styles.infoText}>
                        Provider will contact you to arrange <Text style={styles.bold}>{label.toLowerCase()}</Text> payment after the order is confirmed.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
                      <Text style={styles.infoText}>
                        Provider will contact you with their <Text style={styles.bold}>{label}</Text> details after confirming.
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Fulfillment */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name={fulfillmentMethod === 'pickup' ? 'storefront-outline' : 'car-outline'} size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>{fulfillmentMethod === 'pickup' ? 'Pickup from Boutique' : 'Ship to Me'}</Text>
          </View>
          {fulfillmentMethod === 'pickup' ? (
            <Text style={styles.addressText}>Please coordinate pickup directly with the provider.</Text>
          ) : shippingAddress ? (
            <>
              {shippingAddress.fullName ? <Text style={styles.addressText}>{shippingAddress.fullName}</Text> : null}
              <Text style={styles.addressText}>{shippingAddress.street}</Text>
              <Text style={styles.addressText}>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</Text>
            </>
          ) : null}
        </View>

        {/* Disclaimer + Checkbox */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color="#888" style={{ marginTop: 2 }} />
          <Text style={styles.disclaimerText}>
            <Text style={styles.disclaimerBold}>Disclaimer: </Text>
            GoZipMarket is an independent marketplace platform that connects buyers and service providers. GoZipMarket is not a party to any transaction and accepts no responsibility or liability for payment disputes, non-payment, fraud, non-delivery, or any damages arising from transactions conducted between users. All payments are made directly between the buyer and the service provider. Users are solely responsible for fulfilling their obligations under any transaction.
          </Text>
        </View>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setDisclaimerAccepted(v => !v)} activeOpacity={0.7}>
          <View style={[styles.checkbox, disclaimerAccepted && styles.checkboxChecked]}>
            {disclaimerAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>I have read and agree to the above disclaimer</Text>
        </TouchableOpacity>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, (!disclaimerAccepted || loading) && styles.disabledBtn]}
          onPress={handleConfirmOrder}
          disabled={!disclaimerAccepted || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.confirmBtnText}>Confirm Order</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.termsNote}>By confirming you agree to our Terms of Service</Text>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.navigate('CartScreen')}>
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
  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#F0F7FF', borderRadius: 8, padding: 12, marginBottom: 12,
  },
  infoText: { fontSize: 13, color: '#444', flex: 1, lineHeight: 20 },
  bold: { fontWeight: '700', color: '#333' },
  addressText: { fontSize: 14, color: '#444', lineHeight: 22 },
  confirmBtn: {
    backgroundColor: '#4A90E2', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 36,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'center', marginBottom: 12,
  },
  disabledBtn: { backgroundColor: '#ccc' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  termsNote: { textAlign: 'center', fontSize: 12, color: '#aaa' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelBtnText: { fontSize: 14, color: '#E53935', fontWeight: '600' },
  disclaimer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 14,
    marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#F57F17', borderWidth: 1, borderColor: '#FFE082',
  },
  disclaimerText: { fontSize: 12, color: '#5D4037', lineHeight: 18, flex: 1 },
  disclaimerBold: { fontWeight: '700', color: '#E65100' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingHorizontal: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#4A90E2',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  checkboxLabel: { fontSize: 13, color: '#444', flex: 1, lineHeight: 18 },
});

export default BoutiquePaymentScreen;
