/**
 * PostServiceScreen Component - SIMPLIFIED VERSION
 * 
 * Last Updated: January 5, 2026
 * Changes: Migrated from fetch to api client for automatic token handling
 * 
 * Purpose: Allows users to OFFER their services only
 * 
 * Key Features:
 * - Post service offers (title, description, category, price, contact info)
 * - Orange banner links to RequestServiceCategoryScreen for new categories
 * - Auto-populates user profile data (email, zip, phone)
 * - Form validation
 * 
 * Removed Features (from previous version):
 * - "Request a Service" option (toggle removed)
 * - Only "Offer Service" functionality remains
 * 
 * Database:
 * - Creates service_posts with post_type = 'offer'
 * - Uses service_categories for dropdown
 * 
 * Navigation:
 * - Banner click → RequestServiceCategoryScreen (for category requests)
 */

import { useAuth } from "../contexts/AuthContext";
import api from "../api"; // ADDED: January 5, 2026
import AsyncStorage from '@react-native-async-storage/async-storage'; // ADD THIS LINE
import React, { useState, useEffect } from 'react';
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
import { Alert } from "../Utils/Alert";
import { createResponsiveStyles } from '../Utils/globalStyles';
import { Picker } from '@react-native-picker/picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const PostServiceScreen: React.FC = () => {
  const { isAuthenticated, userId, userType } = useAuth();
  const navigation = useNavigation();
  
  // Form state - postType is now fixed as 'offer'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [serviceCategories, setServiceCategories] = useState<{ category_name: string; display_order: number }[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('🔍 Screen focused - checking auth');
      checkAuthAndRedirect();
      return () => {};
    }, [isAuthenticated, userId])
  );

  useEffect(() => {
    loadServiceCategories();
  }, []);

  const checkAuthAndRedirect = async () => {
    console.log('🔐 Auth check - isAuthenticated:', isAuthenticated, 'userId:', userId);
    
    setLoadingUser(true);

    if (!isAuthenticated || !userId) {
      console.log('❌ Not authenticated - redirecting to login');
      setLoadingUser(false);
      
      Alert.alert(
        'Sign In Required',
        'Please sign in to post a service.',
        [
          {
            text: 'Sign In',
            onPress: () => {
              navigation.navigate('BusinessOwnerHomeScreen' as never);
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
  };

  /**
   * Load service categories from backend
   * UPDATED: January 5, 2026 - Using api.get() instead of fetch
   */
  const loadServiceCategories = async () => {
    try {
      setLoadingCategories(true);
      console.log('📦 Loading service categories');
      
      // UPDATED: Using api client instead of fetch
      const data = await api.get('/api/service-categories');

      if (data.success && Array.isArray(data.categories)) {
        setServiceCategories(data.categories);
        console.log('✅ Loaded categories:', data.categories);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Error loading service categories:', error);
      // Fallback categories (objects matching { category_name, display_order })
      setServiceCategories([
        { category_name: 'Cleaning', display_order: 1 },
        { category_name: 'Plumbing', display_order: 2 },
        { category_name: 'Electrical', display_order: 3 },
        { category_name: 'Landscaping', display_order: 4 },
        { category_name: 'Home Repair', display_order: 5 },
        { category_name: 'Pet Care', display_order: 6 },
        { category_name: 'Moving', display_order: 7 },
        { category_name: 'Tutoring', display_order: 8 },
        { category_name: 'Photography', display_order: 9 },
        { category_name: 'Catering', display_order: 10 },
        { category_name: 'Beauty Services', display_order: 11 },
        { category_name: 'Tech Support', display_order: 12 },
        { category_name: 'Other', display_order: 13 }
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  /**
   * Load user profile data to auto-populate fields
   * UPDATED: January 5, 2026 - Using api.get() instead of fetch
   */
  const loadUserProfile = async () => {
    try {
      console.log('👤 Loading profile for user:', userId);

      // UPDATED: Using api client instead of fetch
      const data = await api.get(`/api/users/${userId}/profile`);

      if (data.success && data.profile) {
        const profile = data.profile;

        if (profile.customerProfile) {
          setZipCode(profile.customerProfile.zip_code || '');
          setPhoneNumber(profile.customerProfile.phone_number || '');
        } else if (profile.businessProfile) {
          setZipCode(profile.businessProfile.zip_code || '');
          setPhoneNumber(profile.businessProfile.phone_number || '');
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
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return false;
    }
    if (!serviceCategory) {
      Alert.alert('Validation Error', 'Please select a service category');
      return false;
    }
    if (!zipCode.trim()) {
      Alert.alert('Validation Error', 'Please enter a zip code');
      return false;
    }
    if (!contactEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter a contact email');
      return false;
    }
    return true;
  };

  /**
   * Handle form submission
   * UPDATED: January 5, 2026 - Using api.post() instead of fetch
   */
  const handleSubmit = async () => {
    if (!isAuthenticated || !userId) {
      Alert.alert(
        'Sign In Required',
        'Your session has expired. Please sign in again.',
        [
          {
            text: 'Sign In',
            onPress: () => {
              navigation.navigate('BusinessOwnerHomeScreen' as never);
            },
          }
        ]
      );
      return;
    }

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // ============ COMPREHENSIVE DEBUG LOGGING ============
      console.log('════════════════════════════════════════');
      console.log('🚀 ATTEMPTING TO POST SERVICE');
      console.log('════════════════════════════════════════');
      
      // Check all auth sources
      const tokenFromStorage = await AsyncStorage.getItem('access_token');
      const oldTokenFromStorage = await AsyncStorage.getItem('userToken');
      const userFromUserContext = await AsyncStorage.getItem('@zipservice_user');
      
      console.log('📊 Auth Status Check:');
      console.log('  AuthContext.isAuthenticated:', isAuthenticated);
      console.log('  AuthContext.userId:', userId);
      console.log('  AuthContext.userType:', userType);
      console.log('  Token (access_token) in storage:', !!tokenFromStorage);
      console.log('  Token preview:', tokenFromStorage?.substring(0, 30) + '...');
      console.log('  Old token (userToken) exists:', !!oldTokenFromStorage);
      console.log('  UserContext data exists:', !!userFromUserContext);
      
      if (!tokenFromStorage) {
        console.error('❌ CRITICAL: No token found in AsyncStorage!');
        Alert.alert('Error', 'No authentication token found. Please log in again.');
        navigation.navigate('BusinessOwnerHomeScreen' as never);
        return;
      }
      
      let posterType = userType || 'guest';

      const servicePostData = {
        user_id: userId,
        poster_type: posterType,
        post_type: 'offer',
        title: title.trim(),
        description: description.trim(),
        service_category: serviceCategory,
        price_range: priceRange.trim() || null,
        zip_code: zipCode.trim(),
        phone_number: phoneNumber.trim() || null,
        contact_email: contactEmail.trim(),
      };

      console.log('📤 Submitting service offer:');
      console.log('  Endpoint: POST /api/service-posts');
      console.log('  Data:', JSON.stringify(servicePostData, null, 2));
      console.log('════════════════════════════════════════');

      const data = await api.post('/api/service-posts', servicePostData);

      console.log('════════════════════════════════════════');
      console.log('✅ SUCCESS!');
      console.log('  Response:', data);
      console.log('════════════════════════════════════════');

      clearForm();
      
      Alert.alert(
        'Success!',
        'Your service offer has been posted successfully!',
        [
          {
            text: 'View My Listings',
            onPress: () => {
              navigation.navigate('ListingsScreen' as never);
            },
          },
          {
            text: 'Post Another',
            onPress: () => {
              // Form already cleared, just stay here
            },
          },
        ]
      );
    } catch (error: any) {
      console.log('════════════════════════════════════════');
      console.error('❌ ERROR POSTING SERVICE');
      console.error('  Error type:', error.name);
      console.error('  Error message:', error.message);
      console.error('  Status code:', error.status);
      console.error('  Response data:', error.response);
      console.error('  Full error:', error);
      console.log('════════════════════════════════════════');
      
      // More specific error messages
      let errorMessage = 'Failed to create service post. Please try again.';
      
      if (error.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        // Force navigation to login
        setTimeout(() => {
          navigation.navigate('BusinessOwnerHomeScreen' as never);
        }, 2000);
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error.response?.error) {
        errorMessage = error.response.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const clearForm = () => {
    setTitle('');
    setDescription('');
    setServiceCategory('');
    setPriceRange('');
  };

  const navigateToRequestCategory = () => {
    navigation.navigate('RequestServiceCategoryScreen' as never);
  };
    

  if (loadingUser || loadingCategories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated || !userId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Please sign in to continue...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back button header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#4A90E2"/>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Offer Your Services</Text>
          <Text style={styles.headerSubtitle}>
            Share your expertise with those who need it
          </Text>
        </View>

        <View style={styles.roleDescription}>
          <Ionicons name="briefcase-outline" size={24} color="#4A90E2" />
          <Text style={styles.roleDescriptionText}>
            💼 Let people know what services you can provide
          </Text>
        </View>

        {/* Banner to request new category */}
        <TouchableOpacity 
          style={styles.requestCategoryBanner}
          onPress={navigateToRequestCategory}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FF6B35" />
          <Text style={styles.requestCategoryText}>
            Don't see your category? Request a new one →
          </Text>
        </TouchableOpacity>

        <View style={styles.form}>
          
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Professional House Cleaning Service"
              maxLength={200}
            />
            <Text style={styles.characterCount}>
              {title.length}/200 characters
            </Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your service, experience, what's included..."
              multiline
              numberOfLines={9}
              maxLength={5000}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {description.length}/5000 characters
            </Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Category *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={serviceCategory}
                onValueChange={setServiceCategory}
                style={styles.picker}
              >
                <Picker.Item label="Select a category..." value="" />
                {serviceCategories.map((category) => (
                    <Picker.Item 
                      key={category.category_name} 
                      label={category.category_name} 
                      value={category.category_name} 
                    />
                  ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price/Rate (Optional)</Text>
            <TextInput
              style={styles.input}
              value={priceRange}
              onChangeText={setPriceRange}
              placeholder="e.g., $50/hour, $200-300, Starting at $100"
              maxLength={100}
            />
          </View>

          <Text style={styles.sectionHeader}>Contact Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Email *</Text>
            <TextInput
              style={styles.input}
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="Your email for responses"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Zip Code *</Text>
            <TextInput
              style={styles.input}
              value={zipCode}
              onChangeText={setZipCode}
              placeholder="Enter your zip code"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Your phone number"
              keyboardType="phone-pad"
              maxLength={20}
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
                <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>Post Service Offer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = createResponsiveStyles({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  characterCount: { 
    fontSize: 12, 
    color: '#666', 
    textAlign: 'right', 
    marginTop: 4,
    fontStyle: 'italic'
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  roleDescription: { flexDirection: 'row', alignItems: 'center', margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#4A90E2' },
  roleDescriptionText: { flex: 1, fontSize: 14, color: '#666', lineHeight: 20, marginLeft: 12 },
  requestCategoryBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, padding: 12, backgroundColor: '#FFF3E0', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#FF6B35' },
  requestCategoryText: { flex: 1, fontSize: 13, color: '#D84315', fontWeight: '600', marginLeft: 8 },
  form: { margin: 16 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 12 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: "#4A90E2", marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#333' },
  textArea: { minHeight: 100, paddingTop: 12 },
  pickerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' },
  picker: { height: 50 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4A90E2', paddingVertical: 16, borderRadius: 8, marginTop: 20 },
  disabledButton: { backgroundColor: '#cccccc' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
});

export default PostServiceScreen;