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
  const [contactEmail, setContactEmail] = useState(userInfo?.email || '');
  const [inStock, setInStock] = useState('1');
  const [shippingCharge, setShippingCharge] = useState('10.00');
  const [postPaymentMethods, setPostPaymentMethods] = useState<string[]>([]);
  const [postPaymentInfos, setPostPaymentInfos] = useState<Record<string, string>>({});
  const [profilePaymentMethods, setProfilePaymentMethods] = useState<string[]>([]);
  const [profilePaymentInfos, setProfilePaymentInfos] = useState<Record<string, string>>({});

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

  const uploadPhotos = async (postId: string, postPrice?: string): Promise<{ uploaded: number; failed: number }> => {
    if (selectedPhotos.length === 0) return { uploaded: 0, failed: 0 };

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
        // Retry up to 2 more times before marking as failed
        let retrySuccess = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`🔄 Retrying photo upload (attempt ${attempt + 1})...`);
            await new Promise(res => setTimeout(res, 1000 * attempt));
            const token = await AsyncStorage.getItem('access_token');
            if (!token) break;
            const uri = photo.asset.uri;
            const response = await fetch(uri);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            const retryResponse = await fetch(`${API_URL}/api/service-posts/${postId}/upload-photo`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                photo: base64,
                filename: `photo_${Date.now()}.jpg`,
                mimetype: 'image/jpeg',
                description: photo.description.trim(),
                price: parseFloat(String(postPrice || '').match(/[\d.]+/)?.[0] ?? '') || 0,
              }),
            });
            if (retryResponse.ok) { retrySuccess = true; uploadedCount++; break; }
          } catch (retryError) {
            console.warn(`⚠️ Retry ${attempt} failed:`, retryError);
          }
        }
        if (!retrySuccess) {
          failedCount++;
          console.error('❌ Photo upload failed after retries:', error);
        }
      }
    }

    setUploadingPhotos(false);
    console.log(`✅ Upload complete: ${uploadedCount} succeeded, ${failedCount} failed`);
    return { uploaded: uploadedCount, failed: failedCount };
  };

  // --------------------------------------------------------------------------
  // AUTH CHECK
  // --------------------------------------------------------------------------

  const checkAuthAndRedirect = async () => {
    console.log('🔐 Auth check - isAuthenticated:', isAuthenticated, 'userId:', userId);
    setLoadingUser(true);
    if (!isAuthenticated || !userId) {
      setLoadingUser(false);
      return; // UI block at bottom handles the sign-in prompt
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
        { category_name: 'Bakery', display_order: 1 },
        { category_name: 'Beauty Services', display_order: 2 },
        { category_name: 'Catering', display_order: 3 },
        { category_name: 'Cleaning', display_order: 4 },
        { category_name: 'Construction/Renovation', display_order: 5 },
        { category_name: 'Electrical', display_order: 6 },
        { category_name: 'Home Repair', display_order: 7 },
        { category_name: 'Landscaping', display_order: 8 },
        { category_name: 'Moving', display_order: 9 },
        { category_name: 'Pet Care', display_order: 10 },
        { category_name: 'Photography', display_order: 11 },
        { category_name: 'Plumbing', display_order: 12 },
        { category_name: 'Rentals', display_order: 13 },
        { category_name: 'Tech Support', display_order: 14 },
        { category_name: 'Tutoring', display_order: 15 },
        { category_name: 'Other', display_order: 16 },
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

      // Pre-fill payment method from business owner profile
      if (userId) {
        const boData = await api.get(`/business-owners/by-user/${userId}`);
        if (boData?.payment_method) {
          try {
            const parsed = JSON.parse(boData.payment_method);
            const methods = Array.isArray(parsed) ? parsed : [boData.payment_method];
            setPostPaymentMethods(methods);
            setProfilePaymentMethods(methods);
          } catch {
            setPostPaymentMethods([boData.payment_method]);
            setProfilePaymentMethods([boData.payment_method]);
          }
        }
        if (boData?.payment_info) {
          try {
            const parsed = JSON.parse(boData.payment_info);
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              setPostPaymentInfos(parsed);
              setProfilePaymentInfos(parsed);
            }
          } catch {}
        }
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
    const acceptsPayment = serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment;
    const isThrifting = serviceCategory?.toLowerCase().trim() === 'preloved & thrifting';
    const isBoutiqueCategory = serviceCategory?.toLowerCase().trim() === 'boutique';
    if (acceptsPayment && !isThrifting && (priceRange.trim() === '' || parseFloat(priceRange) <= 0)) {
      Alert.alert('Validation Error', 'Please enter a price greater than $0.00.');
      return false;
    }
    if (isBoutiqueCategory) {
      if (postPaymentMethods.length === 0) {
        Alert.alert('Validation Error', 'Please select at least one payment method.');
        return false;
      }
      const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const US_PHONE_RE = /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
      const VENMO_RE    = /^[a-zA-Z0-9_-]{3,}$/;
      const CASHAPP_RE  = /^\$[a-zA-Z0-9_]{1,}$/;

      for (const method of postPaymentMethods) {
        const val = postPaymentInfos[method]?.trim() ?? '';
        if (method === 'zelle') {
          if (!val) { Alert.alert('Validation Error', 'Please enter your Zelle email or phone number.'); return false; }
          if (!EMAIL_RE.test(val) && !US_PHONE_RE.test(val)) {
            Alert.alert('Invalid Zelle', 'Please enter a valid email address or 10-digit US phone number.');
            return false;
          }
        } else if (method === 'venmo') {
          if (!val) { Alert.alert('Validation Error', 'Please enter your Venmo username.'); return false; }
          if (!VENMO_RE.test(val)) {
            Alert.alert('Invalid Venmo', 'Venmo username must be at least 3 characters and can only contain letters, numbers, underscores, or hyphens.');
            return false;
          }
        } else if (method === 'paypal') {
          if (!val) { Alert.alert('Validation Error', 'Please enter your PayPal email address or phone number.'); return false; }
          if (!EMAIL_RE.test(val) && !US_PHONE_RE.test(val)) {
            Alert.alert('Invalid PayPal', 'Please enter a valid PayPal email address or 10-digit US phone number.');
            return false;
          }
        } else if (method === 'cashapp') {
          if (!val) { Alert.alert('Validation Error', 'Please enter your Cash App $cashtag.'); return false; }
          const normalized = val.startsWith('$') ? val : `$${val}`;
          if (!CASHAPP_RE.test(normalized)) {
            Alert.alert('Invalid Cash App', 'Please enter a valid $cashtag (letters, numbers, underscores only).');
            return false;
          }
          // Store normalized with $ prefix
          postPaymentInfos[method] = normalized;
        }
      }
    }
    if ((isThrifting || isBoutiqueCategory) && selectedPhotos.length === 0) {
      Alert.alert('Photo Required', 'Please add at least one photo for this listing.');
      return false;
    }
    return true;
  };

  const BOUTIQUE_CATEGORY = 'boutique';
  const isBoutique = serviceCategory?.toLowerCase().trim() === BOUTIQUE_CATEGORY;

  const PAYMENT_OPTIONS = [
    { value: 'zelle',   label: 'Zelle',    handleLabel: 'Zelle email or phone' },
    { value: 'venmo',   label: 'Venmo',    handleLabel: 'Venmo username' },
    { value: 'paypal',  label: 'PayPal',   handleLabel: 'PayPal email or phone' },
    { value: 'cashapp', label: 'Cash App', handleLabel: 'Cash App $cashtag' },
    { value: 'cash',    label: 'Cash',     handleLabel: null },
    { value: 'check',   label: 'Check',    handleLabel: null },
  ];
  const togglePaymentMethod = (value: string) => {
    setPostPaymentMethods(prev =>
      prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value]
    );
    setPostPaymentInfos(prev => {
      const isChecked = postPaymentMethods.includes(value);
      if (isChecked) return prev; // unchecking — keep info so it restores on re-check
      // re-checking — restore from profile if not already set
      if (!prev[value] && profilePaymentInfos[value]) {
        return { ...prev, [value]: profilePaymentInfos[value] };
      }
      return prev;
    });
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
        zip_code: zipCode.trim(),
        phone_number: phoneNumber.trim() || null,
        contact_email: contactEmail.trim(),
        in_stock: parseInt(inStock) || 1,
        shipping_charge_cents: isBoutique ? Math.round(parseFloat(shippingCharge || '10') * 100) : null,
        post_payment_method: isBoutique && postPaymentMethods.length > 0 ? JSON.stringify(postPaymentMethods) : null,
        post_payment_info: isBoutique && Object.keys(postPaymentInfos).length > 0 ? JSON.stringify(postPaymentInfos) : null,
      };

      console.log('📤 Submitting service offer...');
      const data = await api.post('/api/service-posts', servicePostData);
      console.log('✅ Post created successfully:', data.post.id);

      // Merge and save payment methods to profile (never remove existing methods)
      if (isBoutique && postPaymentMethods.length > 0) {
        const mergedMethods = Array.from(new Set([...profilePaymentMethods, ...postPaymentMethods]));
        const mergedInfos = { ...profilePaymentInfos, ...postPaymentInfos };
        api.put(`/business-owners/by-user/${userId}`, {
          payment_method: JSON.stringify(mergedMethods),
          payment_info: Object.keys(mergedInfos).length > 0 ? JSON.stringify(mergedInfos) : null,
        }).catch(err => console.warn('⚠️ Could not save payment defaults to profile:', err));
      }

      let uploadedCount = 0;
      if (selectedPhotos.length > 0) {
        console.log('📸 Uploading photos...');
        await uploadPhotos(data.post.id, priceRange);

        // Verify actual saved count by re-fetching the post from server
        const verifyData = await api.get(`/api/service-posts/${data.post.id}`).catch(() => null);
        const actualSaved = verifyData?.post?.photos?.length ?? 0;
        const expectedCount = selectedPhotos.length;
        uploadedCount = actualSaved;

        if (actualSaved === 0) {
          await api.delete(`/api/service-posts/${data.post.id}`).catch(() => {});
          Alert.alert(
            'Upload Failed',
            'Your photos could not be uploaded (file may be too large). Please resize your images under 2MB and try again. Your post was not saved.',
          );
          return;
        }

        if (actualSaved < expectedCount) {
          const failedCount = expectedCount - actualSaved;
          clearForm();
          Alert.alert(
            'Post Saved — Photo Issue',
            `${actualSaved} of ${expectedCount} photo(s) uploaded successfully. ${failedCount} photo(s) failed — please resize under 2MB and add via Edit Listing.`,
            [
              { text: 'View My Listings', onPress: () => navigation.navigate('ListingsScreen' as never) },
              { text: 'OK' },
            ],
          );
          return;
        }
      }

      console.log('════════════════════════════════════════');
      console.log('✅ SUCCESS!');
      console.log('════════════════════════════════════════');

      clearForm();

      Alert.alert(
        'Success!',
        selectedPhotos.length > 0
          ? `Your service offer with ${uploadedCount} photo(s) has been posted!`
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
                onValueChange={(val) => {
                  setServiceCategory(val);
                  const cat = serviceCategories.find(c => c.category_name === val);
                  if (cat?.accepts_payment) setPriceRange('0.00');
                  else setPriceRange('');
                }}
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
              <Text style={styles.label}>
                Photos {(isBoutique || serviceCategory?.toLowerCase().trim() === 'preloved & thrifting')
                  ? <Text style={{ color: '#E53935' }}> *</Text>
                  : <Text style={styles.optionalLabel}> (Optional)</Text>}
              </Text>
              <Text style={styles.photoCount}>{selectedPhotos.length}/{maxPhotos}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.addPhotoButton,
                (isBoutique || serviceCategory?.toLowerCase().trim() === 'preloved & thrifting') && selectedPhotos.length === 0
                  ? { borderColor: '#E53935' } : {},
              ]}
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
            {serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment ? (
              serviceCategory?.toLowerCase().trim() === 'preloved & thrifting' ? (
                /* Preloved & Thrifting — seller sets their own price (can be $0.00 for free) */
                <>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Price per Item ($)</Text>
                    <Text style={styles.labelHint}>Enter 0.00 if free</Text>
                  </View>
                  <View style={styles.priceInputRow}>
                    <Text style={styles.currencyPrefix}>$</Text>
                    <TextInput
                      style={[styles.input, styles.priceInputFlex]}
                      value={priceRange}
                      onChangeText={(t) => {
                        const clean = t.replace(/[^0-9.]/g, '');
                        const parts = clean.split('.');
                        const sanitized = parts.length > 2
                          ? parts[0] + '.' + parts.slice(1).join('')
                          : clean;
                        setPriceRange(sanitized);
                      }}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      blurOnSubmit={false}
                      {...(Platform.OS === 'web' ? ({ inputMode: 'decimal' } as any) : {})}
                      maxLength={10}
                    />
                  </View>
                </>
              ) : (
              <>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Price per Item ($) *</Text>
                </View>
                <View style={styles.priceInputRow}>
                  <Text style={styles.currencyPrefix}>$</Text>
                  <TextInput
                    style={[styles.input, styles.priceInputFlex]}
                    value={priceRange}
                    onChangeText={(t) => {
                      const clean = t.replace(/[^0-9.]/g, '');
                      const parts = clean.split('.');
                      const sanitized = parts.length > 2
                        ? parts[0] + '.' + parts.slice(1).join('')
                        : clean;
                      setPriceRange(sanitized);
                    }}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    blurOnSubmit={false}
                    {...(Platform.OS === 'web' ? ({ inputMode: 'decimal' } as any) : {})}
                    maxLength={10}
                  />
                </View>
              </>
              )
            ) : (
              <>
                <Text style={styles.label}>Price/Rate (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={priceRange}
                  onChangeText={setPriceRange}
                  placeholder="e.g., $50-$100 per hour"
                  keyboardType="default"
                  maxLength={100}
                />
              </>
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

          {/* In Stock — payment-enabled categories + Thrifting */}
          {(serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment ||
            serviceCategory?.toLowerCase().trim() === 'preloved & thrifting') && (
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

          {/* Boutique-only: Shipping Charge */}
          {isBoutique && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shipping Charge ($)</Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInputFlex]}
                  value={shippingCharge}
                  onChangeText={(t) => {
                    const clean = t.replace(/[^0-9.]/g, '');
                    const parts = clean.split('.');
                    setShippingCharge(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean);
                  }}
                  placeholder="10.00"
                  keyboardType="decimal-pad"
                  blurOnSubmit={false}
                  maxLength={8}
                />
              </View>
              <Text style={styles.helperText}>Amount charged to buyer for shipping</Text>
            </View>
          )}

          {/* Boutique-only: Payment Methods (multi-select) */}
          {isBoutique && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Methods (select all you accept)</Text>
              {PAYMENT_OPTIONS.map(o => {
                const checked = postPaymentMethods.includes(o.value);
                return (
                  <View key={o.value}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => togglePaymentMethod(o.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <Text style={styles.checkboxTick}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>{o.label}</Text>
                    </TouchableOpacity>
                    {checked && o.handleLabel && (
                      <TextInput
                        style={[styles.input, { marginLeft: 32, marginTop: 4 }]}
                        value={postPaymentInfos[o.value] || ''}
                        onChangeText={text =>
                          setPostPaymentInfos(prev => ({ ...prev, [o.value]: text }))
                        }
                        placeholder={o.handleLabel}
                        autoCapitalize="none"
                      />
                    )}
                  </View>
                );
              })}
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
  labelRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 6 },
  labelHint: { fontSize: 12, color: '#888', fontStyle: 'italic', marginLeft: 8 },
  labelHintRed: { fontSize: 11, color: '#E53935', fontStyle: 'italic', fontWeight: '700' },
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
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#4A90E2',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '700' },
  checkboxLabel: { fontSize: 15, color: '#333' },

  // Photo upload styles
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoCount: { fontSize: 14, color: '#666', fontWeight: '600' },
  optionalLabel: { fontSize: 14, color: '#999', fontWeight: '400' },
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