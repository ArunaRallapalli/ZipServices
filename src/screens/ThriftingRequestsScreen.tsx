/**
 * ThriftingRequestsScreen.tsx
 *
 * Seller-only screen showing all incoming requests for their FREE thrifting items.
 *
 * Flow:
 *   requested → seller taps [Approve & Mark Completed] (→ completed, in_stock -1)
 *               or [Reject] (→ rejected)
 *               if in_stock hits 0 after approval → all other requests auto-rejected
 *   completed → final state, read-only
 *   rejected  → read-only
 *   expired   → read-only, shown for awareness
 *
 * Accessible from ListingsScreen header (shirt icon).
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../Utils/Alert';
import api from '../api';

const STATUS_COLOR: Record<string, string> = {
  requested: '#F59E0B',
  completed: '#2E7D32',
  rejected:  '#E53935',
  expired:   '#9E9E9E',
};

const STATUS_LABEL: Record<string, string> = {
  requested: 'REQUESTED',
  completed: 'COMPLETED',
  rejected:  'REJECTED',
  expired:   'EXPIRED',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + '  ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}


const ThriftingRequestsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/api/thrift-requests/provider');
      setRequests(res.requests || []);
    } catch {
      Alert.alert('Error', 'Failed to load thrift requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

  const handleApproveComplete = (id: string, buyerName: string) => {
    Alert.alert(
      'Approve & Mark Completed',
      `Confirm you are giving this item to ${buyerName || 'this buyer'}? Please coordinate pickup/delivery via the seller chat. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Mark Completed',
          onPress: async () => {
            setActionId(id);
            try {
              await api.patch(`/api/thrift-requests/${id}/approve-complete`);
              // Refresh to pick up any auto-rejections and updated stock
              await fetchRequests();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to complete request.');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (id: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionId(id);
            try {
              await api.patch(`/api/thrift-requests/${id}/reject`);
              setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to reject request.');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusColor = STATUS_COLOR[item.status] || '#888';
    const isActing = actionId === item.id;

    return (
      <View style={styles.card}>
        {/* Header row: item info + status badge */}
        <View style={styles.cardHeader}>
          <View style={styles.itemRow}>
            {item.post_photo_url ? (
              <Image source={{ uri: item.post_photo_url }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Ionicons name="shirt-outline" size={22} color="#aaa" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {item.post_title || `Item #${item.post_id}`}
              </Text>
              <Text style={styles.metaText}>Requested {formatDate(item.created_at)}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {STATUS_LABEL[item.status] || item.status?.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Request ID */}
        <View style={styles.row}>
          <Ionicons name="receipt-outline" size={14} color="#666" />
          <Text style={styles.metaLabel}> Request ID: </Text>
          <Text style={styles.metaValue}>#{item.id ? String(item.id).slice(0, 8).toUpperCase() : '—'}</Text>
        </View>

        {/* Buyer */}
        <View style={styles.row}>
          <Ionicons name="person-outline" size={14} color="#666" />
          <Text style={styles.metaLabel}> Requester: </Text>
          <Text style={styles.metaValue}>{item.buyer_name || 'Customer'}</Text>
        </View>

        {/* 48h action window reminder */}
        {item.status === 'requested' && (
          <View style={styles.expiryNote}>
            <Ionicons name="time-outline" size={13} color="#6D4C41" />
            <Text style={styles.expiryNoteText}> Respond within <Text style={{ fontWeight: '700' }}>48 hours</Text> — requests expire automatically if no action is taken.</Text>
          </View>
        )}

        {/* Action buttons — requested: Approve & Complete / Reject */}
        {item.status === 'requested' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.completeBtn, isActing && styles.disabledBtn]}
              onPress={() => handleApproveComplete(item.id, item.buyer_name)}
              disabled={isActing}
            >
              {isActing ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="bag-check-outline" size={15} color="#fff" />
                  <Text style={styles.btnText}> Approve & Complete</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, isActing && styles.disabledBtn]}
              onPress={() => handleReject(item.id)}
              disabled={isActing}
            >
              <Ionicons name="close-circle-outline" size={15} color="#fff" />
              <Text style={styles.btnText}> Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Thrift Requests</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={26} color="#666" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#4A90E2" />
      ) : requests.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="shirt-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No requests yet</Text>
          <Text style={styles.emptySubText}>When buyers request your free items, they'll appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRequests(); }}
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
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  itemRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  thumb:       { width: 52, height: 52, borderRadius: 8, backgroundColor: '#f0f0f0' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemTitle:   { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 2 },
  metaText:    { fontSize: 11, color: '#999' },
  badge:       { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  row:         { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaLabel:   { fontSize: 13, color: '#666' },
  metaValue:   { fontSize: 13, color: '#333', fontWeight: '600' },
  actionRow:   { flexDirection: 'row', gap: 8, marginTop: 12 },
  rejectBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E53935', borderRadius: 8, paddingVertical: 10 },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4A90E2', borderRadius: 8, paddingVertical: 10 },
  disabledBtn: { opacity: 0.5 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText:   { fontSize: 16, color: '#aaa', marginTop: 12, fontWeight: '600' },
  emptySubText: { fontSize: 13, color: '#bbb', marginTop: 6, textAlign: 'center', lineHeight: 20 },
  expiryNote: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, backgroundColor: '#FBE9E7', borderRadius: 6, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#FFCCBC' },
  expiryNoteText: { fontSize: 11, color: '#6D4C41', lineHeight: 16, flex: 1 },
});

export default ThriftingRequestsScreen;
