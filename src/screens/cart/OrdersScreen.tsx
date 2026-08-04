/**
 * OrdersScreen.tsx
 * src/screens/cart/OrdersScreen.tsx
 *
 * Displays all incoming Zelle orders for the logged-in service provider.
 * Accessible from the My Listings screen via the receipt icon in the header.
 *
 * Features:
 * - Fetches orders from GET /api/orders/provider (filtered by provider_user_id from JWT)
 * - Shows order date, status badge (pending / completed / cancelled), items purchased,
 *   total amount, buyer's Zelle ID, and shipping address
 * - "Mark as Completed" button on pending orders — confirms Zelle payment was received
 *   and calls PATCH /api/orders/:id/status to update the payments table
 * - Pull-to-refresh to reload orders
 * - Refreshes automatically when screen comes into focus (useFocusEffect)
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl, Image, Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../Utils/Alert';
import api from '../../api';

const STATUS_COLOR: Record<string, string> = {
  pending:   '#F59E0B',
  completed: '#2E7D32',
  cancelled: '#E53935',
  expired:   '#9E9E9E',
};

const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/api/orders/provider');
      setOrders(res.orders || []);
    } catch {
      Alert.alert('Error', 'Failed to load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchOrders(); }, [fetchOrders]));

  const markCompleted = (orderId: string) => {
    Alert.alert(
      'Mark as Completed',
      'Confirm you have received payment via Zelle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Completed',
          onPress: async () => {
            setUpdatingId(orderId);
            try {
              await api.patch(`/api/orders/${orderId}/status`, { status: 'completed' });
              setOrders(prev =>
                prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o)
              );
            } catch {
              Alert.alert('Error', 'Failed to update order.');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const renderOrder = ({ item }: { item: any }) => {
    const itemList: any[] = item.items || [];
    const amount = ((item.amount || 0) / 100).toFixed(2);
    const dateObj = item.created_at ? new Date(item.created_at) : null;
    const date = dateObj
      ? dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : '—';
    const time = dateObj
      ? dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : '';
    const orderId = item.id ? `#${String(item.id).slice(0, 8).toUpperCase()}` : '—';
    const statusColor = STATUS_COLOR[item.status] || '#888';

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}><Text style={styles.metaLabel}>Order ID: </Text>{orderId}</Text>
            <Text style={styles.date}><Text style={styles.metaLabel}>Date: </Text>{date}{time ? `  ${time}` : ''}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status?.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Customer name */}
        <View style={styles.row}>
          <Ionicons name="person-outline" size={14} color="#666" />
          <Text style={styles.customerLabel}>Customer: </Text>
          <Text style={styles.customerValue}>{item.buyer_name || 'Customer'}</Text>
        </View>

        {/* Items */}
        {itemList.map((i: any, idx: number) => (
          <View key={idx} style={styles.itemRow}>
            {i.photo_url ? (
              <Image source={{ uri: i.photo_url }} style={styles.itemThumb} resizeMode="cover" />
            ) : null}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>• {i.title}</Text>
              <Text style={styles.itemProductId}>#P{i.post_id}-{(i.photo_index ?? 0) + 1}</Text>
            </View>
          </View>
        ))}

        {/* Amount */}
        <Text style={styles.amount}>${amount}</Text>

        {/* Buyer Zelle */}
        {item.buyer_zelle_id ? (
          <View style={styles.row}>
            <Ionicons name="phone-portrait-outline" size={14} color="#666" />
            <Text style={styles.zelleLabel}>Buyer Zelle: </Text>
            <Text style={styles.zelleValue}>{item.buyer_zelle_id}</Text>
          </View>
        ) : null}

        {/* Shipping address */}
        {item.shipping_address ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.addressText}>
              {item.shipping_address.street}, {item.shipping_address.city}, {item.shipping_address.state} {item.shipping_address.zipCode}
            </Text>
          </View>
        ) : null}

        {/* Call Buyer button — [2026-08-03] [feature/per-photo-inventory] added so sellers
            can reach the buyer directly for delivery coordination; scoped to
            /api/orders/provider so a seller only ever sees the phone number for an order
            they're actually fulfilling. */}
        {item.shipping_address?.phone ? (
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${item.shipping_address.phone}`)}
          >
            <Ionicons name="call-outline" size={16} color="#4A90E2" />
            <Text style={styles.callBtnText}>Call Buyer</Text>
          </TouchableOpacity>
        ) : null}

        {/* Mark completed button */}
        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => markCompleted(item.id)}
            disabled={updatingId === item.id}
          >
            {updatingId === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.completeBtnText}>Mark as Completed</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Order Status & History</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={26} color="#666" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#4A90E2" />
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No orders yet</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchOrders(); }}
              colors={['#4A90E2']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f5f5f5' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  backBtn:     { padding: 4 },
  closeBtn:    { padding: 4, width: 40, alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  card:        { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0', elevation: 1 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  metaLabel:   { fontSize: 12, fontWeight: '600', color: '#888' },
  orderId:     { fontSize: 13, fontWeight: '700', color: '#333' },
  date:        { fontSize: 12, color: '#888' },
  customerLabel: { fontSize: 12, color: '#666' },
  customerValue: { fontSize: 12, color: '#333', fontWeight: '600' },
  statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusText:  { fontSize: 11, fontWeight: '700' },
  itemName:    { fontSize: 13, color: '#444', marginBottom: 2 },
  amount:      { fontSize: 18, fontWeight: '800', color: '#4A90E2', marginTop: 6, marginBottom: 8 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  zelleLabel:  { fontSize: 12, color: '#666' },
  zelleValue:  { fontSize: 12, color: '#333', fontWeight: '600' },
  addressText: { fontSize: 12, color: '#555', flex: 1 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2E7D32', borderRadius: 8, paddingVertical: 10, marginTop: 10 },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#4A90E2', borderRadius: 8, paddingVertical: 10, marginTop: 10 },
  callBtnText: { color: '#4A90E2', fontWeight: '700', fontSize: 14 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:   { fontSize: 16, color: '#aaa', marginTop: 12 },
  itemRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  itemThumb:    { width: 36, height: 36, borderRadius: 6 },
  itemInfo:     { flex: 1 },
  itemProductId: { fontSize: 11, color: '#888', fontWeight: '600' },
});

export default OrdersScreen;
