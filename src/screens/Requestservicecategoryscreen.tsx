/**
 * RequestServiceCategoryScreen Component
 * 
 * Last Updated: February 8, 2026
 * Changes: Added display of pending category requests
 */

import API_URL from "../config/apiConfig";
import { useAuth } from "../contexts/AuthContext";
import api from "../api";

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../Utils/Alert';
import { createResponsiveStyles } from '../Utils/globalStyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from '../components/BackButton'; 

interface CategoryRequest {
  id: number;
  title: string;
  description: string;
  created_at: string;
  contact_email: string;
  zip_code: string;
  request_status: 'pending' | 'approved' | 'rejected';
}

const RequestServiceCategoryScreen: React.FC = () => {
  const { isAuthenticated, userId, userType } = useAuth();
  const navigation = useNavigation();
  
  // Form state
  const [categoryName, setCategoryName] = useState('');
  const [justification, setJustification] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [zipCode, setZipCode] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Requests state
  const [requests, setRequests] = useState<CategoryRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  // Prevent multiple auth checks
  const isCheckingAuth = useRef(false);

  // Function to load user profile
  const loadUserProfile = async () => {
    try {
      console.log('👤 Loading profile for user:', userId);

      const data = await api.get(`/api/users/${userId}/profile`);

      if (data.success && data.profile) {
        const profile = data.profile;

        if (profile.customerProfile) {
          setZipCode(profile.customerProfile.zip_code || '');
        } else if (profile.businessProfile) {
          setZipCode(profile.businessProfile.zip_code || '');
        }

        if (profile.user && profile.user.email) {
          setContactEmail(profile.user.email);
        }
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
  };

  // Function to fetch category requests
  const loadCategoryRequests = async () => {
    try {
      setLoadingRequests(true);
      
      const data = await api.get('/api/service-posts?post_type=request');
      
      if (data.success && data.posts) {
        const categoryRequests = data.posts.filter((post: any) => 
          post.title && post.title.startsWith('[CATEGORY REQUEST]')
        );
        setRequests(categoryRequests);
      }
    } catch (error) {
      console.error('Error loading category requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Check auth only once on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (isCheckingAuth.current) return;
      isCheckingAuth.current = true;

      console.log('🔐 Auth check - isAuthenticated:', isAuthenticated, 'userId:', userId);
      
      if (!isAuthenticated || !userId) {
        console.log('❌ Not authenticated - redirecting to login');
        setLoadingUser(false);
        setAuthChecked(true);
        
        Alert.alert(
          'Sign In Required',
          'Please sign in to request a new service category.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            }
          ],
          { cancelable: false }
        );
        return;
      }

      console.log('✅ Authenticated - loading profile');
      await loadUserProfile();
      await loadCategoryRequests();
      setLoadingUser(false);
      setAuthChecked(true);
      isCheckingAuth.current = false;
    };

    checkAuth();
  }, []);

  const validateForm = () => {
    if (!categoryName.trim()) {
      Alert.alert('Validation Error', 'Please enter a category name');
      return false;
    }
    if (!justification.trim()) {
      Alert.alert('Validation Error', 'Please explain why this category is needed');
      return false;
    }
    if (!contactEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter a contact email');
      return false;
    }
    if (!zipCode.trim()) {
      Alert.alert('Validation Error', 'Please enter a zip code');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!isAuthenticated || !userId) {
      Alert.alert(
        'Sign In Required',
        'Your session has expired. Please sign in again.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          }
        ]
      );
      return;
    }

    if (!validateForm()) return;

    try {
      setLoading(true);

      const categoryRequestData = {
        user_id: userId,
        poster_type: userType || 'business_owner',
        post_type: 'request',
        title: `[CATEGORY REQUEST] ${categoryName.trim()}`,
        description: justification.trim(),
        service_category: 'Other',
        zip_code: zipCode.trim(),
        contact_email: contactEmail.trim(),
        price: null,
        phone_number: null,
      };

      console.log('📤 Submitting category request:', categoryRequestData);

      const data = await api.post('/api/service-posts', categoryRequestData);

      console.log('📥 Response:', data);

      if (data.success) {
        Alert.alert(
          'Request Submitted!',
          'Your category request has been submitted for admin review. You\'ll be notified once it\'s reviewed.',
          [
            {
              text: 'OK',
              onPress: () => {
                clearForm();
                loadCategoryRequests(); // Reload requests
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        console.error('❌ Failed to submit request:', data);
        Alert.alert('Error', data.error || 'Failed to submit category request');
      }
    } catch (error: any) {
      console.error('❌ Error submitting category request:', error);
      Alert.alert('Error', error.message || 'Network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setCategoryName('');
    setJustification('');
  };

  // Show loading while checking auth
  if (!authChecked || loadingUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Don't render form if not authenticated
  if (!isAuthenticated || !userId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <BackButton /> 
        
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="add-circle-outline" size={40} color='#4CAF50' />
          <Text style={styles.headerTitle}>Request New Category</Text>
          <Text style={styles.headerSubtitle}>
            Help us expand our service offerings
          </Text>
        </View>

        
 
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#4CAF50" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              Submit your category request and our admin team will review it. If approved, 
              the new category will be added to our platform.
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category Name *</Text>
            <TextInput
              style={styles.input}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="e.g., Pool Maintenance, HVAC Services, Bookkeeping"
              maxLength={100}
            />
            <Text style={styles.helpText}>
              Enter a clear, concise name for the service category
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Why is this category needed? *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={justification}
              onChangeText={setJustification}
              placeholder="Explain why this category would benefit users... Include examples of services that would fit in this category and why existing categories don't work."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.helpText}>
              Be specific about what services this category would include
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Email *</Text>
            <TextInput
              style={styles.input}
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="Your email for updates"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.helpText}>
              We'll notify you when your request is reviewed
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Zip Code *</Text>
            <TextInput
              style={styles.input}
              value={zipCode}
              onChangeText={setZipCode}
              placeholder="Your zip code"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips for a successful request</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Be specific about what the category covers</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Explain how it's different from existing categories</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Provide examples of services that would fit</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.tipText}>Describe the potential demand for this category</Text>
          </View>
        </View>
        {/* Existing Requests Section */}
        {loadingRequests ? (
          <View style={styles.requestsSection}>
            <ActivityIndicator size="small" color="#4CAF50" />
          </View>
        ) : requests.length > 0 ? (
          <View style={styles.requestsSection}>
            <Text style={styles.requestsTitle}>
              📋 Pending Requests ({requests.length})
            </Text>
            {requests.map((request) => {
  // Determine status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return { color: '#4CAF50', text: '✅ Approved', bg: '#E8F5E9' };
      case 'rejected':
        return { color: '#F44336', text: '❌ Rejected', bg: '#FFEBEE' };
      default:
        return { color: '#FF9800', text: '⏳ Pending Review', bg: '#FFF3E0' };
    }
  };

  const statusStyle = getStatusStyle(request.request_status);
  
  return (
    <View key={request.id} style={styles.requestCard}>
      {/* Header with name and status badge */}
      <View style={styles.requestHeader}>
        <Text style={styles.requestName}>
          {request.title.replace('[CATEGORY REQUEST] ', '')}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {statusStyle.text}
          </Text>
        </View>
      </View>
      
      <Text style={styles.requestDate}>
        Submitted: {new Date(request.created_at).toLocaleDateString()}
      </Text>
      {request.zip_code && (
        <Text style={styles.requestZip}>Zip: {request.zip_code}</Text>
      )}
    </View>
  );
})}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = createResponsiveStyles({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { 
    padding: 30, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e0e0e0', 
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 12 },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  
  // Requests section styles
  requestsSection: { 
    margin: 16, 
    padding: 16, 
    backgroundColor: '#fff', 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  requestsTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    color: '#333' 
  },
  requestCard: { 
    padding: 12, 
    backgroundColor: '#f9f9f9', 
    borderRadius: 6, 
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  requestName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333' 
  },
  requestDate: { 
    fontSize: 12, 
    color: '#888', 
    marginTop: 4 
  },
  requestZip: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  
  infoBox: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoContent: { flex: 1, marginLeft: 12 },
  infoTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  infoText: { fontSize: 14, color: '#555', lineHeight: 20 },
  form: { margin: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    fontSize: 16, 
    color: '#333' 
  },
  textArea: { minHeight: 140, paddingTop: 12 },
  helpText: { fontSize: 12, color: '#888', marginTop: 6, fontStyle: 'italic' },
  submitButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#4CAF50', 
    paddingVertical: 16, 
    borderRadius: 8, 
    marginTop: 10 
  },
  disabledButton: { backgroundColor: '#cccccc' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: '500' },
  tipsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  tipsTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  tipText: { flex: 1, fontSize: 14, color: '#555', marginLeft: 8, lineHeight: 20 },
  requestHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
statusBadge: {
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 12,
},
statusText: {
  fontSize: 12,
  fontWeight: '600',
},
  
});

export default RequestServiceCategoryScreen;