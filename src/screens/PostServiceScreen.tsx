// Updated PostServiceScreen - Fixed authentication routing
import API_URL from "../config/apiConfig";
import { useAuth } from "../contexts/AuthContext";

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const PostServiceScreen: React.FC = () => {
  const { isAuthenticated, userId, userType, checkAuthWithPrompt } = useAuth();
  const navigation = useNavigation();
  
  // Form state
  const [postType, setPostType] = useState<'offer' | 'request'>('offer');
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
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Check authentication every time screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔍 Screen focused - checking auth');
      checkAuthAndRedirect();
      return () => {
        // Cleanup if needed
      };
    }, [isAuthenticated, userId])
  );

  // Load categories once on mount
  useEffect(() => {
    loadServiceCategories();
  }, []);

  const checkAuthAndRedirect = async () => {
    console.log('🔐 Auth check - isAuthenticated:', isAuthenticated, 'userId:', userId, 'userType:', userType);
    
    setLoadingUser(true);

    // If not authenticated, redirect immediately
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
              navigation.navigate('ZipserviceHomeScreenSelection' as never);
            },
          }
        ],
        { cancelable: false }
      );
      return;
    }

    // If authenticated, load user profile
    console.log('✅ Authenticated - loading profile');
    await loadUserProfile();
    setLoadingUser(false);
  };

  const loadServiceCategories = async () => {
    try {
      setLoadingCategories(true);
      console.log('📦 Loading service categories from:', `${API_URL}/api/service-categories`);
      
      const response = await fetch(`${API_URL}/api/service-categories`);
      
      if (!response.ok) {
        console.warn('⚠️ Categories API returned status:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Categories response:', data);

      if (data.success && Array.isArray(data.categories)) {
        setServiceCategories(data.categories);
        console.log('✅ Loaded categories:', data.categories);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Error loading service categories:', error);
      // Fallback to hardcoded categories if API fails
      console.log('⚠️ Using fallback categories');
      setServiceCategories([
        'Cleaning', 'Plumbing', 'Electrical', 'Landscaping',
        'Home Repair', 'Pet Care', 'Moving', 'Tutoring',
        'Photography', 'Catering', 'Beauty Services', 'Tech Support', 'Other'
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profileUrl = `${API_URL}/api/users/${userId}/profile`;
      console.log('👤 Loading profile from:', profileUrl);

      const response = await fetch(profileUrl);
      
      console.log('📡 Profile response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ Profile API returned error status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText.substring(0, 500));
        
        if (response.status === 404) {
          Alert.alert('Error', 'User profile not found. Please complete your profile setup.');
        } else {
          Alert.alert('Warning', 'Could not load profile data. Please fill in all fields manually.');
        }
        return;
      }
      
      const responseText = await response.text();

      if (responseText.trim().startsWith('<')) {
        console.error('❌ Received HTML instead of JSON');
        Alert.alert('Error', 'Server error: received unexpected response format.');
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        Alert.alert('Error', 'Failed to parse profile data. Please try again.');
        return;
      }

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

      } else {
        console.warn('⚠️ Profile response missing success/profile:', data);
        Alert.alert('Warning', 'Could not load profile data. Please fill in all fields manually.');
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please fill in all fields manually.');
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

  const handleSubmit = async () => {
    // Double-check authentication before submitting
    if (!isAuthenticated || !userId) {
      Alert.alert(
        'Sign In Required',
        'Your session has expired. Please sign in again.',
        [
          {
            text: 'Sign In',
            onPress: () => {
              navigation.navigate('ZipserviceHomeScreenSelection' as never);
            },
          }
        ]
      );
      return;
    }

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      let posterType = userType || 'guest';

      const servicePostData = {
        user_id: userId,
        poster_type: posterType,
        post_type: postType,
        title: title.trim(),
        description: description.trim(),
        service_category: serviceCategory,
        price_range: priceRange.trim() || null,
        zip_code: zipCode.trim(),
        phone_number: phoneNumber.trim() || null,
        contact_email: contactEmail.trim(),
      };

      console.log('📤 Submitting service post to:', `${API_URL}/api/service-posts`);
      console.log('📤 Service post data:', servicePostData);

      const response = await fetch(`${API_URL}/api/service-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(servicePostData),
      });

      const data = await response.json();
      console.log('📥 Service post response status:', response.status);
      console.log('📥 Service post response:', data);

      if (response.ok) {
        Alert.alert(
          'Success!',
          `Your service ${postType === 'offer' ? 'offer' : 'request'} has been posted successfully!`,
          [
            {
              text: 'Post Another',
              onPress: clearForm,
            },
            {
              text: 'View Posts',
              onPress: () => navigation.navigate('Home' as never),
            },
          ]
        );
        clearForm();
      } else {
        console.error('❌ Failed to create post:', data);
        Alert.alert('Error', data.error || 'Failed to create service post');
      }
    } catch (error) {
      console.error('❌ Error creating service post:', error);
      Alert.alert('Error', 'Network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setServiceCategory('');
    setPriceRange('');
    setPostType('offer');
  };

  // Show loading while checking auth or categories
  if (loadingUser || loadingCategories) {
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
        <Text style={styles.loadingText}>Please sign in to continue...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Post a Service</Text>
          <Text style={styles.headerSubtitle}>
            {postType === 'offer' 
              ? 'Share your services with those who need them' 
              : 'Find the services you need'}
          </Text>
        </View>

        {/* Info Banner */}
        <View style={styles.roleDescription}>
          <Ionicons 
            name={postType === 'offer' ? 'briefcase-outline' : 'search-outline'} 
            size={24} 
            color="#4A90E2" 
          />
          <Text style={styles.roleDescriptionText}>
            {postType === 'offer' 
              ? '💼 Let people know what services you can provide'
              : '🔍 Tell providers what you need help with'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Post Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>I want to: *</Text>
            <View style={styles.postTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  postType === 'offer' && styles.postTypeButtonActive
                ]}
                onPress={() => setPostType('offer')}
              >
                <Ionicons 
                  name="briefcase-outline" 
                  size={24} 
                  color={postType === 'offer' ? '#fff' : '#4A90E2'} 
                />
                <Text style={[
                  styles.postTypeButtonText,
                  postType === 'offer' && styles.postTypeButtonTextActive
                ]}>
                  Offer a Service
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  postType === 'request' && styles.postTypeButtonActive
                ]}
                onPress={() => setPostType('request')}
              >
                <Ionicons 
                  name="search-outline" 
                  size={24} 
                  color={postType === 'request' ? '#fff' : '#4A90E2'} 
                />
                <Text style={[
                  styles.postTypeButtonText,
                  postType === 'request' && styles.postTypeButtonTextActive
                ]}>
                  Request a Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={
                postType === 'offer'
                  ? 'e.g., Professional House Cleaning Service'
                  : 'e.g., Need house cleaning this weekend'
              }
              maxLength={200}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={
                postType === 'offer'
                  ? 'Describe your service, experience, what\'s included...'
                  : 'Describe what you need, when you need it, specific requirements...'
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Service Category */}
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
                  <Picker.Item key={category} label={category} value={category} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {postType === 'offer' ? 'Price/Rate' : 'Budget'} (Optional)
            </Text>
            <TextInput
              style={styles.input}
              value={priceRange}
              onChangeText={setPriceRange}
              placeholder={
                postType === 'offer'
                  ? 'e.g., $50/hour, $200-300, Starting at $100'
                  : 'e.g., Up to $500, Around $200, Negotiable'
              }
              maxLength={100}
            />
            <Text style={styles.helpText}>
              Enter your {postType === 'offer' ? 'pricing' : 'budget'} in any format
            </Text>
          </View>

          {/* Contact Information */}
          <Text style={styles.sectionHeader}>Contact Information</Text>
          
          {/* Email */}
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

          {/* Zip Code */}
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

          {/* Phone Number */}
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

          {/* Submit Button */}
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
                <Text style={styles.submitButtonText}>
                  Post {postType === 'offer' ? 'Offer' : 'Request'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  roleDescription: { flexDirection: 'row', alignItems: 'center', margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#4A90E2' },
  roleDescriptionText: { flex: 1, fontSize: 14, color: '#666', lineHeight: 20, marginLeft: 12 },
  form: { margin: 16 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 12 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#333' },
  textArea: { minHeight: 100, paddingTop: 12 },
  pickerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' },
  picker: { height: 50 },
  helpText: { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
  postTypeContainer: { flexDirection: 'row', gap: 12 },
  postTypeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: '#4A90E2', borderRadius: 8, gap: 8 },
  postTypeButtonActive: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  postTypeButtonText: { fontSize: 14, fontWeight: '600', color: '#4A90E2' },
  postTypeButtonTextActive: { color: '#fff' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4A90E2', paddingVertical: 16, borderRadius: 8, marginTop: 20 },
  disabledButton: { backgroundColor: '#cccccc' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
});

export default PostServiceScreen;