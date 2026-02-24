/**
 * PostServiceScreen Component - WITH PHOTO UPLOAD
 * 
 * Last Updated: February 15, 2026
 * Changes: Added photo upload functionality
 * 
 * Purpose: Allows users to OFFER their services with optional photos
 * 
 * Key Features:
 * - Post service offers (title, description, category, price, contact info)
 * - Upload up to 10 photos per post (HEIC auto-converted to JPEG)
 * - Photo preview and removal before posting
 * - Orange banner links to RequestServiceCategoryScreen for new categories
 * - Auto-populates user profile data (email, zip, phone)
 * - Form validation
 */

import { useAuth } from "../contexts/AuthContext";
import api from "../api";
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Image,
} from 'react-native';
import { Alert } from "../Utils/Alert";
import { createResponsiveStyles } from '../Utils/globalStyles';
import { Picker } from '@react-native-picker/picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import API_URL from '../config/apiConfig';

const PostServiceScreen: React.FC = () => {
  const { isAuthenticated, userId, userType } = useAuth();
  const navigation = useNavigation();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Photo state
  const [selectedPhotos, setSelectedPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

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
    requestPermissions();
  }, []);

  /**
   * Request camera roll permissions
   */
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photos to upload images.'
      );
    }
  };

  /**
   * Pick photos from gallery
   */
  const pickPhotos = async () => {
    try {
      if (selectedPhotos.length >= 5) {
        Alert.alert('Limit Reached', 'You can upload a maximum of 5 photos per post.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - selectedPhotos.length,
      });

      if (!result.canceled && result.assets) {
        setSelectedPhotos([...selectedPhotos, ...result.assets]);
        console.log(`📸 Selected ${result.assets.length} photos`);
      }
    } catch (error) {
      console.error('Error picking photos:', error);
      Alert.alert('Error', 'Failed to pick photos. Please try again.');
    }
  };

  /**
   * Remove a photo from selection
   */
  const removePhoto = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };
/**
 * Upload photos to backend after post is created
 * CROSS-PLATFORM: Uses Base64 for web, FormData for mobile
 */
const uploadPhotos = async (postId: string) => {
  if (selectedPhotos.length === 0) return;

  setUploadingPhotos(true);
  console.log(`📤 Uploading ${selectedPhotos.length} photos for post ${postId}`);

  let uploadedCount = 0;
  let failedCount = 0;

  for (const photo of selectedPhotos) {
    try {
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No authentication token');
      }

      const uri = photo.uri;

      // Determine mimeType and extension
      let mimeType = 'image/jpeg';
      let fileExtension = 'jpg';
      let blob: Blob | null = null;

      if (Platform.OS === 'web') {
        // On web, blob URLs don't have extensions - fetch the blob to determine type
        const response = await fetch(uri);
        blob = await response.blob();
        mimeType = blob.type || 'image/jpeg';
        
        // Map MIME type to extension
        const extensionMap: { [key: string]: string } = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/heic': 'heic',
          'image/heif': 'heic',
        };
        fileExtension = extensionMap[mimeType] || 'jpg';
      } else {
        // On mobile, we can trust the file extension
        fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
        
        if (fileExtension === 'png') mimeType = 'image/png';
        else if (fileExtension === 'webp') mimeType = 'image/webp';
        else if (fileExtension === 'heic' || fileExtension === 'heif') mimeType = 'image/heic';
      }
      
      console.log(`📤 Uploading photo ${uploadedCount + 1}/${selectedPhotos.length}`);

      let uploadSuccess = false;

      // ============================================================
      // WEB: BASE64 UPLOAD (works for ALL file sizes)
      // ============================================================
      if (Platform.OS === 'web') {
        console.log('🌐 Web: Using Base64 upload method');
        
        // Blob is already fetched above
        if (!blob) {
          throw new Error('Blob not available for web upload');
        }
        
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        console.log('📦 Converted to Base64, size:', Math.round(base64.length / 1024), 'KB');
        
        // Send as JSON with PROPER filename
        const uploadResponse = await fetch(`${API_URL}/api/service-posts/${postId}/upload-photo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            photo: base64,
            filename: `photo_${Date.now()}.${fileExtension}`,
            mimetype: mimeType
          })
        });

        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          console.log('✅ Web upload successful:', result);
          uploadSuccess = true;
        } else {
          const error = await uploadResponse.text();
          console.error('❌ Web upload failed:', error);
          throw new Error(`Upload failed with status ${uploadResponse.status}`);
        }
      } 
      // ============================================================
      // MOBILE: FORMDATA UPLOAD (XMLHttpRequest)
      // ============================================================
      else {
        console.log('📱 Mobile: Using FormData upload method');
        
        const formData = new FormData();
        formData.append('photo', {
          uri: uri,
          type: mimeType,
          name: `photo.${fileExtension}`,
        } as any);
        
        uploadSuccess = await new Promise<boolean>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.open('POST', `${API_URL}/api/service-posts/${postId}/upload-photo`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          
          xhr.onload = () => {
            if (xhr.status === 200) {
              try {
                const response = JSON.parse(xhr.responseText);
                console.log('✅ Mobile upload successful:', response);
                resolve(true);
              } catch (e) {
                console.error('❌ Failed to parse response');
                reject(new Error('Invalid response'));
              }
            } else {
              console.error('❌ Mobile upload failed:', xhr.responseText);
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };
          
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.ontimeout = () => reject(new Error('Upload timeout'));
          
          xhr.send(formData);
        });
      }

      if (uploadSuccess) {
        uploadedCount++;
        console.log(`✅ Photo ${uploadedCount}/${selectedPhotos.length} uploaded successfully`);
      }

    } catch (error) {
      failedCount++;
      console.error(`❌ Photo upload failed:`, error);
    }
  }

  setUploadingPhotos(false);

  if (failedCount > 0) {
    Alert.alert(
      'Upload Complete',
      `${uploadedCount} photos uploaded successfully. ${failedCount} failed.`
    );
  }

  console.log(`✅ Photo upload complete: ${uploadedCount} succeeded, ${failedCount} failed`);
};

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

  const loadServiceCategories = async () => {
    try {
      setLoadingCategories(true);
      console.log('📦 Loading service categories');
      
      const data = await api.get('/api/service-categories');

      if (data.success && Array.isArray(data.categories)) {
        setServiceCategories(data.categories);
        console.log('✅ Loaded categories:', data.categories);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Error loading service categories:', error);
      // Fallback categories
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

  const loadUserProfile = async () => {
    try {
      console.log('👤 Loading profile for user:', userId);

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
      
      console.log('════════════════════════════════════════');
      console.log('🚀 ATTEMPTING TO POST SERVICE WITH PHOTOS');
      console.log('  Photos selected:', selectedPhotos.length);
      console.log('════════════════════════════════════════');
      
      const tokenFromStorage = await AsyncStorage.getItem('access_token');
      
      if (!tokenFromStorage) {
        console.error('❌ CRITICAL: No token found!');
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

      console.log('📤 Submitting service offer...');
      const data = await api.post('/api/service-posts', servicePostData);

      console.log('✅ Post created successfully:', data.post.id);

      // Upload photos if any selected
      if (selectedPhotos.length > 0) {
        console.log('📸 Uploading photos...');
        await uploadPhotos(data.post.id);
      }

      console.log('════════════════════════════════════════');
      console.log('✅ SUCCESS!');
      console.log('════════════════════════════════════════');

      clearForm();
      
      Alert.alert(
        'Success!',
        selectedPhotos.length > 0
          ? `Your service offer with ${selectedPhotos.length} photo(s) has been posted!`
          : 'Your service offer has been posted successfully!',
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
              // Form already cleared
            },
          },
        ]
      );
    } catch (error: any) {
      console.log('════════════════════════════════════════');
      console.error('❌ ERROR POSTING SERVICE');
      console.error('  Error:', error);
      console.log('════════════════════════════════════════');
      
      let errorMessage = 'Failed to create service post. Please try again.';
      
      if (error.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
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
    setSelectedPhotos([]);
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
            <Text style={styles.privacyNote}>
              🔒 Privacy Notice: This application does not publicly display personal contact information such as phone numbers or email addresses.
              Any contact details included in your description will be visible to others and shared at your own discretion and risk.
            </Text>
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

          {/* ========== PHOTO UPLOAD SECTION ========== */}
          <View style={styles.inputGroup}>
            <View style={styles.photoHeader}>
              <Text style={styles.label}>Photos (Optional)</Text>
              <Text style={styles.photoCount}>{selectedPhotos.length}/5</Text>
            </View>
            
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={pickPhotos}
              disabled={selectedPhotos.length >= 5}
            >
              <Ionicons name="camera-outline" size={24} color={selectedPhotos.length >= 5 ? "#ccc" : "#4A90E2"} />
              <Text style={[styles.addPhotoText, selectedPhotos.length >= 5 && styles.disabledText]}>
                {selectedPhotos.length >= 5 ? 'Maximum photos reached' : 'Add Photos'}
              </Text>
            </TouchableOpacity>

            {selectedPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {selectedPhotos.map((photo, index) => (
                  <View key={index} style={styles.photoPreview}>
                    <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {selectedPhotos.length > 0 && (
              <Text style={styles.photoHint}>
                📸 iPhone photos (HEIC) will be automatically converted for web display
              </Text>
            )}
          </View>
          {/* ========== END PHOTO SECTION ========== */}

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
            style={[styles.submitButton, (loading || uploadingPhotos) && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading || uploadingPhotos}
          >
            {(loading || uploadingPhotos) ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitButtonText}>
                  {loading ? 'Creating Post...' : 'Uploading Photos...'}
                </Text>
              </>
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
  privacyNote: {
    fontSize: 12,
    color: '#D84315',
    marginTop: 6,
    lineHeight: 16,
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
  
  // Photo upload styles
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  addPhotoText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledText: {
    color: '#ccc',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  photoHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4A90E2', paddingVertical: 16, borderRadius: 8, marginTop: 20 },
  disabledButton: { backgroundColor: '#cccccc' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
});

export default PostServiceScreen;