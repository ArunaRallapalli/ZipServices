import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../api';
import { createResponsiveStyles } from '../Utils/globalStyles';

const AdminCategoryRequestsScreen: React.FC = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await api.get('/api/service-posts?post_type=request');
      if (data.success) {
        const categoryRequests = data.posts.filter((post: any) => 
          post.title?.startsWith('[CATEGORY REQUEST]')
        );
        setRequests(categoryRequests);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: number, status: 'approved' | 'rejected') => {
    try {
      const adminNotes = status === 'approved' 
        ? 'Your category has been added to the platform!'
        : 'This category already exists or doesn\'t meet our criteria.';

      const data = await api.patch(
        `/api/service-posts/category-request/${requestId}/status`,
        {
          request_status: status,
          admin_notes: adminNotes
        }
      );

      if (data.success) {
        Alert.alert('Success', `Request ${status} successfully`);
        loadRequests(); // Reload list
      } else {
        Alert.alert('Error', data.error || 'Failed to update request');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Network error');
    }
  };

  const renderRequest = ({ item }: any) => {
    const isPending = item.request_status === 'pending';
    
    return (
      <View style={styles.requestCard}>
        <Text style={styles.requestTitle}>
          {item.title.replace('[CATEGORY REQUEST] ', '')}
        </Text>
        <Text style={styles.requestDescription}>{item.description}</Text>
        <Text style={styles.requestMeta}>
          Email: {item.contact_email} | Zip: {item.zip_code}
        </Text>
        <Text style={styles.requestDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {item.request_status === 'approved' ? '✅ Approved' :
             item.request_status === 'rejected' ? '❌ Rejected' :
             '⏳ Pending'}
          </Text>
        </View>

        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.approveButton]}
              onPress={() => handleStatusUpdate(item.id, 'approved')}
            >
              <Text style={styles.buttonText}>✅ Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={() => handleStatusUpdate(item.id, 'rejected')}
            >
              <Text style={styles.buttonText}>❌ Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Category Requests ({requests.length})</Text>
      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = createResponsiveStyles({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', padding: 16, backgroundColor: '#fff' },
  listContent: { padding: 16 },
  requestCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  requestTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  requestDescription: { fontSize: 14, color: '#666', marginBottom: 8 },
  requestMeta: { fontSize: 12, color: '#888', marginBottom: 4 },
  requestDate: { fontSize: 12, color: '#aaa' },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    marginTop: 8,
  },
  statusText: { fontSize: 12, fontWeight: '600', color: '#FF9800' },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: { backgroundColor: '#4CAF50' },
  rejectButton: { backgroundColor: '#F44336' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default AdminCategoryRequestsScreen;