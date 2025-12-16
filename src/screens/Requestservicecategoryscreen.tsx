/**
 * RequestServiceCategoryScreen Component
 * 
 * Allows users to request new service categories using the EXISTING service_posts table.
 * 
 * STORAGE STRATEGY:
 * - Uses service_posts table with post_type = "request" (matches backend validation)
 * - title = "[CATEGORY REQUEST] {requested category name}"
 * - description = justification for why it's needed
 * - service_category = "Other" (placeholder)
 * - Admins can query posts where title starts with "[CATEGORY REQUEST]" to review requests
 */

import API_URL from "../config/apiConfig";
import { useAuth } from "../contexts/AuthContext";

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
  
  // Prevent multiple auth checks
  const isCheckingAuth = useRef(false);

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
      setLoadingUser(false);
      setAuthChecked(true);
      isCheckingAuth.current = false;
    };

    checkAuth();
  }, []); // ✅ Only run once on mount

  const loadUserProfile = async () => {
    try {
      const profileUrl = `${API_URL}/api/users/${userId}/profile`;
      console.log('👤 Loading profile from:', profileUrl);

      const response = await fetch(profileUrl);
      
      if (!response.ok) {
        console.error('❌ Profile API returned error status:', response.status);
        return;
      }
      
      const responseText = await response.text();

      if (responseText.trim().startsWith('<')) {
        console.error('❌ Received HTML instead of JSON');
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        return;
      }

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

      // Store as a service_post with post_type = "request" and prefixed title
      const categoryRequestData = {
        user_id: userId,
        poster_type: userType || 'business_owner',
        post_type: 'request',
        title: `[CATEGORY REQUEST] ${categoryName.trim()}`,
        description: `📧 Contact: ${contactEmail.trim()}\n\n${justification.trim()}`,
        service_category: 'Other',
        zip_code: zipCode.trim(),
        contact_email: contactEmail.trim(),
        price_range: null,
        phone_number: null,
      };

      console.log('📤 Submitting category request:', categoryRequestData);

      const response = await fetch(`${API_URL}/api/service-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryRequestData),
      });

      const data = await response.json();
      console.log('📥 Response:', data);

      if (response.ok && data.success) {
        Alert.alert(
          'Request Submitted!',
          'Your category request has been submitted for admin review. You\'ll be notified once it\'s reviewed.',
          [
            {
              text: 'OK',
              onPress: () => {
                clearForm();
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        console.error('❌ Failed to submit request:', data);
        Alert.alert('Error', data.error || 'Failed to submit category request');
      }
    } catch (error) {
      console.error('❌ Error submitting category request:', error);
      Alert.alert('Error', 'Network error occurred. Please check your connection.');
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
});

export default RequestServiceCategoryScreen;