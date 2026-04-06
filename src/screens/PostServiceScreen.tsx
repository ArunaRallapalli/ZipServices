/**
 * PostServiceScreen Component - WITH PHOTO UPLOAD + PER-PHOTO DESCRIPTIONS
 *
 * Last Updated: March 2026
 * Changes:
 *   - Added per-photo description/caption field below each photo preview
 *   - PhotoWithDesc type wraps asset + description string
 *   - Description sent to backend via JSON (web) and FormData (mobile)
 *   - Premium users get 10 photos vs 5 for free users
 *
 * Purpose: Allows users to OFFER their services with optional photos
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

// ============================================================================
// TYPE — photo asset bundled with its caption
// ============================================================================

interface PhotoWithDesc {
  asset: ImagePicker.ImagePickerAsset;
  description: string;
  price: string;   // price in dollars, optional — empty string means no price
}

// ============================================================================
// COMPONENT
// ============================================================================

const PostServiceScreen: React.FC = () => {
  const { isAuthenticated, userId, userType, userInfo } = useAuth();
  const maxPhotos = userInfo?.is_premium ? 10 : 5;
  const navigation = useNavigation();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [deliveryTimeline, setDeliveryTimeline] = useState('5 to 7 business days');
  const [zipCode, setZipCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [inStock, setInStock] = useState('1');
  const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'delivery' | 'both' | ''>('');
  const [deliveryFee, setDeliveryFee] = useState('');

  // Photo state — each entry is { asset, description }
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoWithDesc[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [serviceCategories, setServiceCategories] = useState<{ category_name: string; display_order: number; accepts_payment?: boolean }[]>([]);

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

  // --------------------------------------------------------------------------
  // PERMISSIONS
  // --------------------------------------------------------------------------

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos to upload images.');
    }
  };

  // --------------------------------------------------------------------------
  // PICK PHOTOS
  // --------------------------------------------------------------------------

  const pickPhotos = async () => {
    try {
      if (selectedPhotos.length >= maxPhotos) {
        Alert.alert('Limit Reached', `You can upload a maximum of ${maxPhotos} photos per post.`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: maxPhotos - selectedPhotos.length,
      });

      if (!result.canceled && result.assets) {
        const available = maxPhotos - selectedPhotos.length;
        const trimmed = result.assets.slice(0, available);
        if (result.assets.length > trimmed.length) {
          Alert.alert(
            'Limit Reached',
            `Only ${trimmed.length} photo(s) added. Maximum is ${maxPhotos} per post.`,
          );
        }
        // Wrap each asset with an empty description
        const withDesc: PhotoWithDesc[] = trimmed.map(asset => ({ asset, description: '', price: '' }));
        setSelectedPhotos([...selectedPhotos, ...withDesc]);
        console.log(`📸 Selected ${trimmed.length} photos`);
      }
    } catch (error) {
      console.error('Error picking photos:', error);
      Alert.alert('Error', 'Failed to pick photos. Please try again.');
    }
  };

  // --------------------------------------------------------------------------
  // REMOVE PHOTO
  // --------------------------------------------------------------------------

  const removePhoto = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };


  // --------------------------------------------------------------------------
  // UPLOAD PHOTOS — sends description alongside each photo
  // --------------------------------------------------------------------------

  const uploadPhotos = async (postId: string, postPrice?: string) => {
    if (selectedPhotos.length === 0) return;

    setUploadingPhotos(true);
    console.log(`📤 Uploading ${selectedPhotos.length} photos for post ${postId}`);

    let uploadedCount = 0;
    let failedCount = 0;

    for (const photo of selectedPhotos) {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) throw new Error('No authentication token');

        const uri = photo.asset.uri;
        let mimeType = 'image/jpeg';
        let fileExtension = 'jpg';
        let blob: Blob | null = null;

        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          blob = await response.blob();
          mimeType = blob.type || 'image/jpeg';
          const extensionMap: { [key: string]: string } = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/heic': 'heic',
            'image/heif': 'heic',
          };
          fileExtension = extensionMap[mimeType] || 'jpg';
        } else {
          fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
          if (fileExtension === 'png') mimeType = 'image/png';
          else if (fileExtension === 'webp') mimeType = 'image/webp';
          else if (fileExtension === 'heic' || fileExtension === 'heif') mimeType = 'image/heic';
        }

        console.log(`📤 Uploading photo ${uploadedCount + 1}/${selectedPhotos.length}`);

        let uploadSuccess = false;

        // ── WEB: Base64 upload ──
        if (Platform.OS === 'web') {
          console.log('🌐 Web: Using Base64 upload method');
          if (!blob) throw new Error('Blob not available for web upload');

          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob!);
          });

          console.log('📦 Converted to Base64, size:', Math.round(base64.length / 1024), 'KB');

          const uploadResponse = await fetch(
            `${API_URL}/api/service-posts/${postId}/upload-photo`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                photo: base64,
                filename: `photo_${Date.now()}.${fileExtension}`,
                mimetype: mimeType,
                description: photo.description.trim(),
                price: parseFloat(String(postPrice || '').match(/[\d.]+/)?.[0] ?? '') || 0,
              }),
            },
          );

          if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            console.log('✅ Web upload successful:', result);
            uploadSuccess = true;
          } else {
            const error = await uploadResponse.text();
            console.error('❌ Web upload failed:', error);
            throw new Error(`Upload failed with status ${uploadResponse.status}`);
          }

        // ── MOBILE: FormData upload ──
        } else {
          console.log('📱 Mobile: Using FormData upload method');

          const formData = new FormData();
          formData.append('photo', {
            uri,
            type: mimeType,
            name: `photo.${fileExtension}`,
          } as any);
          formData.append('description', photo.description.trim());
          formData.append('price', String(parseFloat(String(postPrice || '').match(/[\d.]+/)?.[0] ?? '') || 0));

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
          console.log(`✅ Photo ${uploadedCount}/${selectedPhotos.length} uploaded`);
        }

      } catch (error) {
        failedCount++;
        console.error('❌ Photo upload failed:', error);
      }
    }

    setUploadingPhotos(false);

    if (failedCount > 0) {
      Alert.alert(
        'Upload Complete',
        `${uploadedCount} photos uploaded successfully. ${failedCount} failed.`,
      );
    }

    console.log(`✅ Upload complete: ${uploadedCount} succeeded, ${failedCount} failed`);
  };

  // --------------------------------------------------------------------------
  // AUTH CHECK
  // --------------------------------------------------------------------------

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
            onPress: () => navigation.navigate('BusinessOwnerHomeScreen' as never),
          },
        ],
        { cancelable: false },
      );
      return;
    }

    console.log('✅ Authenticated - loading profile');
    await loadUserProfile();
    setLoadingUser(false);
  };

  // --------------------------------------------------------------------------
  // LOAD CATEGORIES
  // --------------------------------------------------------------------------

  const loadServiceCategories = async () => {
    try {
      setLoadingCategories(true);
      console.log('📦 Loading service categories');
      const data = await api.get('/api/service-categories');

      if (data.success && Array.isArray(data.categories)) {
        setServiceCategories(data.categories);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Error loading service categories:', error);
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
        { category_name: 'Other', display_order: 13 },
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // --------------------------------------------------------------------------
  // LOAD USER PROFILE
  // --------------------------------------------------------------------------

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
        if (profile.user?.email) setContactEmail(profile.user.email);
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
  };

  // --------------------------------------------------------------------------
  // FORM VALIDATION
  // --------------------------------------------------------------------------

  const validateForm = () => {
    if (!title.trim()) { Alert.alert('Validation Error', 'Please enter a title'); return false; }
    if (!description.trim()) { Alert.alert('Validation Error', 'Please enter a description'); return false; }
    if (!serviceCategory) { Alert.alert('Validation Error', 'Please select a service category'); return false; }
    if (!zipCode.trim()) { Alert.alert('Validation Error', 'Please enter a zip code'); return false; }
    if (!contactEmail.trim()) { Alert.alert('Validation Error', 'Please enter a contact email'); return false; }
    return true;
  };

  // --------------------------------------------------------------------------
  // SUBMIT
  // --------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!isAuthenticated || !userId) {
      Alert.alert(
        'Sign In Required',
        'Your session has expired. Please sign in again.',
        [{ text: 'Sign In', onPress: () => navigation.navigate('BusinessOwnerHomeScreen' as never) }],
      );
      return;
    }

    if (!validateForm()) return;

    try {
      setLoading(true);
      console.log('════════════════════════════════════════');
      console.log('🚀 POSTING SERVICE WITH PHOTOS');
      console.log('  Photos selected:', selectedPhotos.length);
      console.log('════════════════════════════════════════');

      const tokenFromStorage = await AsyncStorage.getItem('access_token');
      if (!tokenFromStorage) {
        Alert.alert('Error', 'No authentication token found. Please log in again.');
        navigation.navigate('BusinessOwnerHomeScreen' as never);
        return;
      }

      const servicePostData = {
        user_id: userId,
        poster_type: userType || 'guest',
        post_type: 'offer',
        title: title.trim(),
        description: description.trim(),
        service_category: serviceCategory,
        price: priceRange.trim() || null,
        delivery_timeline: deliveryTimeline.trim() || null,
        delivery_option: serviceCategory === 'Catering' ? (deliveryOption || null) : null,
        delivery_fee: serviceCategory === 'Catering' && deliveryOption !== 'pickup' ? (deliveryFee.trim() || null) : null,
        zip_code: zipCode.trim(),
        phone_number: phoneNumber.trim() || null,
        contact_email: contactEmail.trim(),
        in_stock: parseInt(inStock) || 1,
      };

      console.log('📤 Submitting service offer...');
      const data = await api.post('/api/service-posts', servicePostData);
      console.log('✅ Post created successfully:', data.post.id);

      if (selectedPhotos.length > 0) {
        console.log('📸 Uploading photos...');
        await uploadPhotos(data.post.id, priceRange);
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
          { text: 'View My Listings', onPress: () => navigation.navigate('ListingsScreen' as never) },
          { text: 'Post Another' },
        ],
      );
    } catch (error: any) {
      console.error('❌ ERROR POSTING SERVICE:', error);
      let errorMessage = 'Failed to create service post. Please try again.';
      if (error.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        setTimeout(() => navigation.navigate('BusinessOwnerHomeScreen' as never), 2000);
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

  // --------------------------------------------------------------------------
  // CLEAR FORM
  // --------------------------------------------------------------------------

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setServiceCategory('');
    setPriceRange('');
    setDeliveryTimeline('5 to 7 business days');
    setDeliveryOption('');
    setDeliveryFee('');
    setSelectedPhotos([]);
  };

  const navigateToRequestCategory = () => {
    navigation.navigate('RequestServiceCategoryScreen' as never);
  };

  // --------------------------------------------------------------------------
  // LOADING / AUTH GATES
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back button header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4A90E2" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Offer Your Services</Text>
          <Text style={styles.headerSubtitle}>Share your expertise with those who need it</Text>
        </View>

        <View style={styles.roleDescription}>
          <Ionicons name="briefcase-outline" size={24} color="#4A90E2" />
          <Text style={styles.roleDescriptionText}>
            💼 Let people know what services you can provide
          </Text>
        </View>

        {/* Banner to request new category */}
        <TouchableOpacity style={styles.requestCategoryBanner} onPress={navigateToRequestCategory}>
          <Ionicons name="add-circle-outline" size={20} color="#FF6B35" />
          <Text style={styles.requestCategoryText}>
            Don't see your category? Request a new one →
          </Text>
        </TouchableOpacity>

        <View style={styles.form}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Professional House Cleaning Service"
              maxLength={200}
            />
            <Text style={styles.characterCount}>{title.length}/200 characters</Text>
          </View>

          {/* Description */}
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
              🔒 Privacy Notice: This application does not publicly display personal contact
              information such as phone numbers or email addresses. Any contact details included in
              your description will be visible to others and shared at your own discretion and risk.
            </Text>
            <Text style={styles.characterCount}>{description.length}/5000 characters</Text>
          </View>

          {/* Category */}
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

          {/* ── PHOTO UPLOAD SECTION ── */}
          <View style={styles.inputGroup}>
            <View style={styles.photoHeader}>
              <Text style={styles.label}>Photos (Optional)</Text>
              <Text style={styles.photoCount}>{selectedPhotos.length}/{maxPhotos}</Text>
            </View>

            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={pickPhotos}
              disabled={selectedPhotos.length >= maxPhotos}
            >
              <Ionicons
                name="camera-outline"
                size={24}
                color={selectedPhotos.length >= maxPhotos ? '#ccc' : '#4A90E2'}
              />
              <Text style={[
                styles.addPhotoText,
                selectedPhotos.length >= maxPhotos && styles.disabledText,
              ]}>
                {selectedPhotos.length >= maxPhotos ? 'Maximum photos reached' : 'Add Photos'}
              </Text>
            </TouchableOpacity>

            {/* Photo previews — each with a description field below */}
            {selectedPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {selectedPhotos.map((photo, index) => (
                  <View key={index} style={styles.photoPreviewCard}>
                    {/* Thumbnail row */}
                    <View style={styles.photoPreviewRow}>
                      <View style={styles.photoPreview}>
                        <Image source={{ uri: photo.asset.uri }} style={styles.photoImage} />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => removePhoto(index)}
                        >
                          <Ionicons name="close-circle" size={24} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.photoIndexLabel}>Photo {index + 1}</Text>
                    </View>

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
          {/* ── END PHOTO SECTION ── */}

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment
                ? 'Price per Item ($) *'
                : 'Price/Rate (Optional)'}
            </Text>
            {serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment ? (
              <View style={styles.priceInputRow}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInputFlex]}
                  value={priceRange}
                  onChangeText={setPriceRange}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  maxLength={10}
                />
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={priceRange}
                onChangeText={setPriceRange}
                placeholder="e.g., $50/hour, $200-300, Starting at $100"
                keyboardType="default"
                maxLength={100}
              />
            )}
          </View>

          {/* Delivery Time — only for payment-enabled categories */}
          {serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Time (Optional)</Text>
              <TextInput
                style={styles.input}
                value={deliveryTimeline}
                onChangeText={setDeliveryTimeline}
                placeholder="e.g., 5 to 7 business days"
                maxLength={100}
              />
            </View>
          )}

          {/* Catering Delivery Option — only for Catering category */}
          {serviceCategory === 'Catering' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Delivery Option</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={deliveryOption}
                    onValueChange={(v) => setDeliveryOption(v as any)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select..." value="" />
                    <Picker.Item label="Pickup Only" value="pickup" />
                    <Picker.Item label="Delivery Only" value="delivery" />
                    <Picker.Item label="Pickup & Delivery" value="both" />
                  </Picker>
                </View>
              </View>

              {(deliveryOption === 'delivery' || deliveryOption === 'both') && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Delivery Fee (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={deliveryFee}
                    onChangeText={setDeliveryFee}
                    placeholder='e.g., 5.00 or "discuss in chat"'
                    maxLength={50}
                  />
                  <Text style={styles.helperText}>Enter a flat fee or leave blank to discuss with customer</Text>
                </View>
              )}
            </>
          )}

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

          {/* Zip */}
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

          {/* Phone */}
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

          {/* In Stock — only for payment-enabled categories */}
          {serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantity Available</Text>
              <TextInput
                style={styles.input}
                value={inStock}
                onChangeText={setInStock}
                placeholder="1"
                keyboardType="numeric"
                maxLength={4}
              />
              <Text style={styles.helperText}>Set to 0 to mark as "Not Available"</Text>
            </View>
          )}

          {/* Submit */}
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

// ============================================================================
// STYLES
// ============================================================================

const styles = createResponsiveStyles({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
    fontStyle: 'italic',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  roleDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  roleDescriptionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 12,
  },
  requestCategoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  requestCategoryText: {
    flex: 1,
    fontSize: 13,
    color: '#D84315',
    fontWeight: '600',
    marginLeft: 8,
  },
  form: { margin: 16 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#4A90E2', marginBottom: 8 },
  helperText: { fontSize: 12, color: '#888', marginTop: 4 },
  priceInputRow: { flexDirection: 'row', alignItems: 'center' },
  currencyPrefix: { fontSize: 16, fontWeight: '700', color: '#333', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRightWidth: 0, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  priceInputFlex: { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: { height: 50 },

  // Photo upload styles
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoCount: { fontSize: 14, color: '#666', fontWeight: '600' },
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
  disabledText: { color: '#ccc' },

  // Photo grid — cards stack vertically (full width)
  photoGrid: { marginTop: 12 },

  // Each card: thumbnail row + description input
  photoPreviewCard: {
    width: '100%',
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 10,
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  photoIndexLabel: {
    marginLeft: 12,
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },

  // Per-photo description — NEW
  photoDescInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#333',
    minHeight: 48,
  },
  photoDescCount: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'right',
    marginTop: 3,
  },
  photoPriceInput: {
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#333',
    backgroundColor: '#F0F7FF',
    marginTop: 6,
  },

  photoHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  disabledButton: { backgroundColor: '#cccccc' },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PostServiceScreen;