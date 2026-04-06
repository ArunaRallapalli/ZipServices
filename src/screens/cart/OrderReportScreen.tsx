/**
 * OrderReportScreen.tsx
 * v1.0 — March 2026
 *
 * OVERVIEW:
 * Displays a detailed order confirmation report after a successful order placement.
 * Shows order ID, date, business name, itemized list, total, delivery address,
 * Zelle payment reminder, and a liability disclaimer.
 *
 * Navigation: Reached from PaymentScreen after handleConfirmOrder succeeds.
 * After viewing, user taps "Done" to return to the home tab.
 */
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const OrderReportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    orderId,
    orderDate,
    businessName,
    items,
    totalCents,
    providerZelleId,
    providerPaymentMethod,
    shippingAddress,
    fulfillmentMethod,
  } = route.params || {};

  const paymentMethodName = ({ zelle: 'Zelle', venmo: 'Venmo', paypal: 'PayPal', cashapp: 'Cash App', cash: 'Cash', check: 'Check' } as Record<string, string>)[providerPaymentMethod || ''] || 'Zelle';
  const isOfflineMethod = providerPaymentMethod === 'cash' || providerPaymentMethod === 'check';

  const formattedDate = orderDate
    ? new Date(orderDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Success Banner */}
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={52} color="#2E7D32" />
          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.successSub}>Your order has been placed successfully.</Text>
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="receipt-outline" size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Order Details</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID</Text>
            <Text style={styles.infoValue}>{orderId ? `#${String(orderId).slice(0, 8).toUpperCase()}` : '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formattedDate}</Text>
          </View>
          {businessName ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Boutique</Text>
              <Text style={styles.infoValue}>{businessName}</Text>
            </View>
          ) : null}
        </View>

        {/* Items Table */}
        {items && items.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="list-outline" size={18} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Items</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 3 }]}>Item</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Price</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Amount</Text>
            </View>
            {items.map((item: any, idx: number) => {
              const unitPrice = parseFloat(String(item.photo_price || item.price || 0)) || 0;
              const qty = item.quantity ?? 1;
              const amount = unitPrice * qty;
              return (
                <View key={`${item.post_id}_${item.photo_index ?? idx}`} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 3 }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{qty}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                    {unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : '—'}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                    {amount > 0 ? `$${amount.toFixed(2)}` : '—'}
                  </Text>
                </View>
              );
            })}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${((totalCents || 0) / 100).toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Fulfillment */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name={fulfillmentMethod === 'pickup' ? 'storefront-outline' : 'location-outline'} size={18} color="#4A90E2" />
            <Text style={styles.sectionTitle}>{fulfillmentMethod === 'pickup' ? 'Pickup from Boutique' : 'Deliver To'}</Text>
          </View>
          {fulfillmentMethod === 'pickup' ? (
            <Text style={styles.addressText}>You will coordinate pickup directly with the provider.</Text>
          ) : shippingAddress ? (
            <>
              {shippingAddress.fullName ? <Text style={styles.addressText}>{shippingAddress.fullName}</Text> : null}
              <Text style={styles.addressText}>{shippingAddress.street}</Text>
              <Text style={styles.addressText}>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</Text>
              {shippingAddress.notes ? <Text style={styles.addressNotes}>Note: {shippingAddress.notes}</Text> : null}
            </>
          ) : null}
        </View>

        {/* Payment Reminder */}
        {(providerZelleId || isOfflineMethod) && (
          <View style={styles.zelleReminder}>
            <Ionicons name="phone-portrait-outline" size={20} color="#1565C0" />
            <View style={{ flex: 1 }}>
              {isOfflineMethod ? (
                <>
                  <Text style={styles.zelleReminderTitle}>Payment: {paymentMethodName}</Text>
                  <Text style={styles.zelleReminderBody}>
                    The provider will contact you to arrange {paymentMethodName.toLowerCase()} payment.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.zelleReminderTitle}>Action Required: Send Payment</Text>
                  <Text style={styles.zelleReminderBody}>
                    Please send{' '}
                    <Text style={styles.bold}>${((totalCents || 0) / 100).toFixed(2)}</Text>
                    {' '}via {paymentMethodName} to{' '}
                    <Text style={styles.bold}>{providerZelleId}</Text>
                    {' '}to complete your purchase.
                  </Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color="#888" style={{ marginTop: 2 }} />
          <Text style={styles.disclaimerText}>
            <Text style={styles.disclaimerBold}>Disclaimer: </Text>
            This transaction is directly between the service provider and the customer.
            GoZipMarket is a platform that connects buyers and service providers and is
            not a party to any transaction. GoZipMarket is not liable for any disputes,
            non-delivery, payment issues, or damages arising from transactions conducted
            through this platform. Please exercise due diligence before making any payment.
          </Text>
        </View>

        {/* Done Button */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate('TabWrapperScreen')}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  successBanner: {
    alignItems: 'center', backgroundColor: '#F1F8E9',
    borderRadius: 12, padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#2E7D32', marginTop: 10 },
  successSub: { fontSize: 14, color: '#555', marginTop: 4 },
  section: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#e0e0e0',
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 14, color: '#777', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },
  tableHeader: {
    flexDirection: 'row', paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginBottom: 4,
  },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: '#777' },
  tableRow: {
    flexDirection: 'row', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  tableCell: { fontSize: 13, color: '#444' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e0e0e0',
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#333' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#4A90E2' },
  addressText: { fontSize: 14, color: '#444', lineHeight: 22 },
  addressNotes: { fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 4 },
  zelleReminder: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#E3F2FD', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#90CAF9',
  },
  zelleReminderTitle: { fontSize: 14, fontWeight: '700', color: '#1565C0', marginBottom: 4 },
  zelleReminderBody: { fontSize: 13, color: '#1565C0', lineHeight: 20 },
  bold: { fontWeight: '700' },
  disclaimer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#FAFAFA', borderRadius: 10, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#e0e0e0',
  },
  disclaimerText: { fontSize: 12, color: '#888', lineHeight: 18, flex: 1 },
  disclaimerBold: { fontWeight: '700', color: '#666' },
  doneBtn: {
    backgroundColor: '#4A90E2', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default OrderReportScreen;
