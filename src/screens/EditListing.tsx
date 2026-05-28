/**
 * EditListing Component
 * 
 * Last Updated: February 24, 2026
 * Changes: Premium users get 10 photos vs 5 for free users
 * 
 * Previous: February 19, 2026 - Added photo upload/delete functionality (matching PostServiceScreen)
 * Previous: January 5, 2026 - Migrated from fetch to api client for automatic token handling
 * 
 * This screen allows users to edit their existing service listings/posts.
 * It loads the current post data, displays it in editable form fields, validates inputs,
 * and saves changes back to the backend.
 * 
 * Features:
 * - Fetches existing post data by postId from route parameters
 * - Dynamically loads service categories from the API
 * - Editable fields: post type, title, description, category, price, contact info, zip code
 * - Real-time form validation with error messages
 * - Phone number auto-formatting (###-###-####)
 * - Character counter for description field (500 char limit)
 * - Post type toggle: "Offering Service" vs "Requesting Service"
 * - Dropdown picker for service categories (loaded from database)
 * - Required field indicators (*)
 * - Loading state while fetching post data and categories
 * - Saving state with disabled form during save operation
 * - Success/error alerts for save operations
 * - Cancel button to go back without saving
 * - Keyboard-aware scrolling for better UX
 * - Fallback categories if API fails
 * - View/add/delete photos (up to 5 for free users, 10 for premium, HEIC auto-converted and compressed by backend)
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,                  // ADDED: February 19, 2026
} from "react-native";
import { createResponsiveStyles } from '../Utils/globalStyles';
import { Alert } from "../Utils/Alert";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import { Picker } from "@react-native-picker/picker";
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ADDED: February 19, 2026
import * as ImagePicker from 'expo-image-picker';                     // ADDED: February 19, 2026
import API_URL from '../config/apiConfig';                             // ADDED: February 19, 2026

// Navigation type definitions for type safety
type EditListingNavProp = NativeStackNavigationProp<RootStackParamList, "EditListing">;
type EditListingRouteProp = RouteProp<RootStackParamList, "EditListing">;

// ServicePost interface: represents the structure of a service post
interface ServicePost {
  id: number;
  user_id: number;
  poster_type: string;
  post_type: string;                    // "offer" or "request"
  title: string;
  description?: string;
  service_category: string;
  price?: string;
  delivery_timeline?: string;
  phone_number?: string;
  contact_email?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  photos?: string[];                    // ADDED: February 19, 2026 - array of photo URLs
  in_stock?: number;
}

const EditListing: React.FC = () => {
  const navigation = useNavigation<EditListingNavProp>();
  const route = useRoute<EditListingRouteProp>();
  
  console.log("EditListing screen mounted");
  console.log("Route params:", route.params);

  const { userInfo } = useAuth();
  const maxPhotos = userInfo?.is_premium ? 10 : 5;

  // Extract postId from route parameters - used to fetch and update the specific post
  const { postId } = route.params || {};

  // State: Loading indicator while fetching post data from backend
  const [loading, setLoading] = useState(true);
  
  // State: Saving indicator while updating post data
  const [saving, setSaving] = useState(false);
  
  // State: Service categories fetched from API
  const [serviceCategories, setServiceCategories] = useState<{ category_name: string; display_order: number; accepts_payment?: boolean }[]>([]);
  const [inStock, setInStock] = useState('1');
  
  // Form field states - represent all editable fields in the form
  const [postType, setPostType] = useState<"offer" | "request">("offer");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [deliveryTimeline, setDeliveryTimeline] = useState("5 to 7 business days");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Boutique-specific fields
  const [shippingCharge, setShippingCharge] = useState('10.00');
  const [postPaymentMethods, setPostPaymentMethods] = useState<string[]>([]);
  const [postPaymentInfos, setPostPaymentInfos] = useState<Record<string, string>>({});
  const [profilePaymentMethods, setProfilePaymentMethods] = useState<string[]>([]);
  const [profilePaymentInfos, setProfilePaymentInfos] = useState<Record<string, string>>({});

  // ADDED: February 19, 2026 - Photo states
  // existingPhotos: URLs already saved on the post (loaded from backend)
  // selectedPhotos: new photos the user picks before saving
  // uploadingPhotos: true while photos are being uploaded after save
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // State: Validation errors object - stores error messages for each field
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  /**
   * Effect: Fetch categories and post data when component mounts
   */
  useEffect(() => {
    console.log("useEffect triggered with postId:", postId);
    if (postId) {
      // Fetch both categories and post data in parallel
      Promise.all([fetchServiceCategories(), fetchPostData()]);
      requestPhotoPermissions(); // ADDED: February 19, 2026
    } else {
      console.error("No postId provided in route params");
      Alert.alert("Error", "No post ID provided", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
      setLoading(false);
    }
  }, [postId]);

  // ============================================================================
  // ADDED: February 19, 2026 - Photo helper functions
  // ============================================================================

  /**
   * Request media library permissions needed to pick photos
   */
  const requestPhotoPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos to upload images.');
    }
  };

  /**
   * Open image picker so user can select new photos to add
   * Respects the photo limit (5 free, 10 premium) across existing + newly selected photos
   */
  const pickPhotos = async () => {
    const totalPhotos = existingPhotos.length + selectedPhotos.length;
    if (totalPhotos >= maxPhotos) {
      Alert.alert('Limit Reached', `You can have a maximum of ${maxPhotos} photos per post.`);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: maxPhotos - totalPhotos,
      });
    if (!result.canceled && result.assets) {
  const available = maxPhotos - existingPhotos.length - selectedPhotos.length;
  const trimmed = result.assets.slice(0, available);
  if (result.assets.length > trimmed.length) {
    Alert.alert('Limit Reached', `Only ${trimmed.length} photo(s) added. Maximum is ${maxPhotos} per post.`);
  }
  setSelectedPhotos([...selectedPhotos, ...trimmed]);
  console.log(`📸 Selected ${trimmed.length} new photos`);
}
    } catch (error) {
      console.error('Error picking photos:', error);
      Alert.alert('Error', 'Failed to pick photos. Please try again.');
    }
  };

  /**
   * Remove a newly selected photo (not yet uploaded) by index
   */
  const removeNewPhoto = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };

  /**
   * Delete an existing photo from the backend by its index in the photos array
   * Calls DELETE /api/service-posts/:postId/photos/:photoIndex
   */
  const removeExistingPhoto = async (index: number) => {
    try {
      console.log(`🗑️ Deleting existing photo at index ${index} from post ${postId}`);
      await api.delete(`/api/service-posts/${postId}/photos/${index}`);
      setExistingPhotos(existingPhotos.filter((_, i) => i !== index));
      console.log('✅ Existing photo deleted');
    } catch (error) {
      console.error('Error deleting photo:', error);
      Alert.alert('Error', 'Failed to remove photo. Please try again.');
    }
  };

  /**
   * Upload all newly selected photos to the backend after a successful save
   * Mirrors the uploadPhotos function in PostServiceScreen exactly:
   * - Web: Base64 JSON upload
   * - Mobile: FormData XHR upload
   */
  const uploadPhotos = async (postId: string | number) => {
    if (selectedPhotos.length === 0) return;

    setUploadingPhotos(true);
    console.log(`📤 Uploading ${selectedPhotos.length} new photos for post ${postId}`);

    let uploadedCount = 0;
    let failedCount = 0;

    for (const photo of selectedPhotos) {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) throw new Error('No authentication token');

        const uri = photo.uri;
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

        if (Platform.OS === 'web') {
          if (!blob) throw new Error('Blob not available for web upload');

          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const uploadResponse = await fetch(`${API_URL}/api/service-posts/${postId}/upload-photo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              photo: base64,
              filename: `photo_${Date.now()}.${fileExtension}`,
              mimetype: mimeType,
            }),
          });

          if (!uploadResponse.ok) {
            const errText = await uploadResponse.text();
            console.error('❌ Web upload failed:', errText);
            throw new Error(`Upload failed with status ${uploadResponse.status}`);
          }
          console.log('✅ Web upload successful');
        } else {
          const formData = new FormData();
          formData.append('photo', {
            uri,
            type: mimeType,
            name: `photo.${fileExtension}`,
          } as any);

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_URL}/api/service-posts/${postId}/upload-photo`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.onload = () => {
              if (xhr.status === 200) {
                console.log('✅ Mobile upload successful');
                resolve();
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

        uploadedCount++;
      } catch (error) {
        failedCount++;
        console.error(`❌ Photo upload failed:`, error);
      }
    }

    setUploadingPhotos(false);

    if (failedCount > 0) {
      Alert.alert('Upload Complete', `${uploadedCount} photos uploaded successfully. ${failedCount} failed.`);
    }

    console.log(`✅ Photo upload complete: ${uploadedCount} succeeded, ${failedCount} failed`);
  };

  // ============================================================================
  // END: Added photo helper functions
  // ============================================================================

  /**
   * Fetch available service categories from the API
   * UPDATED: January 5, 2026 - Using api.get() instead of fetch
   */
  const fetchServiceCategories = async () => {
    try {
      console.log("Fetching service categories from API...");
      
      // UPDATED: Using api client instead of fetch
      const data = await api.get('/api/service-categories');
      
      console.log("Received categories:", data);
      
      if (data.success && Array.isArray(data.categories)) {
        setServiceCategories(data.categories);
        console.log(`✅ Loaded ${data.categories.length} categories`);
      } else {
        // Fallback categories if API fails
        console.warn("Invalid category data, using fallback categories");
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
  { category_name: 'Beauty', display_order: 11 },
  { category_name: 'Decoration', display_order: 12 },
  { category_name: 'Tailoring', display_order: 13 },
  { category_name: 'Other', display_order: 14 },
]);
      }
    } catch (error) {
  console.error("Error fetching service categories:", error);
  // Use fallback categories on error
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
    { category_name: 'Beauty', display_order: 11 },
    { category_name: 'Decoration', display_order: 12 },
    { category_name: 'Tailoring', display_order: 13 },
    { category_name: 'Other', display_order: 14 },
  ]);
}
  }

  /**
   * Fetch the existing post data from the backend by postId
   * Populates all form fields with the current post data
   * UPDATED: January 5, 2026 - Using api.get() instead of fetch
   * UPDATED: February 19, 2026 - Also loads existing photos from post.photos
   */
  const fetchPostData = async () => {
    try {
      console.log("Fetching post data for ID:", postId);
      setLoading(true);
      
      // UPDATED: Using api client instead of fetch
      const data = await api.get(`/api/service-posts/${postId}`);
      
      console.log("Received data:", data);
      
      // Populate form fields if data is successfully retrieved
      if (data.success && data.post) {
        const post: ServicePost = data.post;
        console.log("Setting form fields with post data");
        setPostType(post.post_type as "offer" | "request");
        setTitle(post.title || "");
        setDescription(post.description || "");
        setServiceCategory(post.service_category || "");
        setPriceRange(post.price || "");
        setDeliveryTimeline(post.delivery_timeline || "5 to 7 business days");
        setPhoneNumber(post.phone_number || "");
        setContactEmail(post.contact_email || "");
        setZipCode(post.zip_code || "");
        setInStock(String(post.in_stock ?? 1));
        if ((post as any).shipping_charge_cents != null) {
          setShippingCharge(((post as any).shipping_charge_cents / 100).toFixed(2));
        }
        if ((post as any).post_payment_method) {
          try {
            const methods = JSON.parse((post as any).post_payment_method);
            setPostPaymentMethods(methods);
            setProfilePaymentMethods(methods);
          } catch { setPostPaymentMethods([]); }
        }
        if ((post as any).post_payment_info) {
          try {
            const infos = JSON.parse((post as any).post_payment_info);
            setPostPaymentInfos(infos);
            setProfilePaymentInfos(infos);
          } catch { setPostPaymentInfos({}); }
        }

        // ADDED: February 19, 2026 - Load existing photos from the post data
        if (Array.isArray(post.photos) && post.photos.length > 0) {
          setExistingPhotos(post.photos);
          console.log(`✅ Loaded ${post.photos.length} existing photos`);
        }

        console.log("Form fields set successfully");
      } else {
        throw new Error("Invalid data format received from server");
      }
    } catch (error: any) {
      console.error("Error fetching post data:", error);
      Alert.alert(
        "Error", 
        `Failed to load post data: ${error.message || 'Unknown error'}`,
        [
          { text: "OK", onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate all form fields
   * Returns true if all validations pass, false otherwise
   * Updates errors state with validation messages
   */
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Title is required
    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    // Service category is required
    if (!serviceCategory) {
      newErrors.serviceCategory = "Service category is required";
    }

    // Contact email is required and must be valid format
    if (!contactEmail.trim()) {
      newErrors.contactEmail = "Contact email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      newErrors.contactEmail = "Invalid email format";
    }

    // ZIP code must be exactly 5 digits if provided
    if (zipCode && !/^\d{5}$/.test(zipCode)) {
      newErrors.zipCode = "ZIP code must be 5 digits";
    }

    // Phone number must be exactly 10 digits if provided
    if (phoneNumber && !/^\d{10}$/.test(phoneNumber.replace(/\D/g, ""))) {
      newErrors.phoneNumber = "Phone number must be 10 digits";
    }

    // Price is required and must be > 0 for payment-accepting non-thrifting categories
    const acceptsPayment = serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment;
    const isThrifting = serviceCategory?.toLowerCase().trim() === 'preloved & thrifting';
    const isBoutiqueCategory = serviceCategory?.toLowerCase().trim() === 'boutique';
    if (acceptsPayment && !isThrifting && (priceRange.trim() === '' || parseFloat(priceRange) <= 0)) {
      newErrors.price = "Please enter a price greater than $0.00";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return false;

    // Payment method format validation for boutique
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
          if (!val) { Alert.alert('Validation Error', 'Please enter your PayPal email address.'); return false; }
          if (!EMAIL_RE.test(val)) {
            Alert.alert('Invalid PayPal', 'Please enter a valid PayPal email address.');
            return false;
          }
        } else if (method === 'cashapp') {
          if (!val) { Alert.alert('Validation Error', 'Please enter your Cash App $cashtag.'); return false; }
          const normalized = val.startsWith('$') ? val : `$${val}`;
          if (!CASHAPP_RE.test(normalized)) {
            Alert.alert('Invalid Cash App', 'Please enter a valid $cashtag (letters, numbers, underscores only).');
            return false;
          }
          postPaymentInfos[method] = normalized;
        }
      }
    }

    return true;
  };

  /**
   * Handle save button press
   * Validates form, then sends PUT request to update the post
   * UPDATED: January 5, 2026 - Using api.put() instead of fetch
   * UPDATED: February 19, 2026 - Uploads any newly selected photos after save
   */
  const handleSave = async () => {
    console.log("Save button pressed");
    
    // Validate form before saving
    if (!validateForm()) return;

    try {
      setSaving(true);
      console.log("Saving post with ID:", postId);

      const acceptsPayment = serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment;
      const isBoutique = serviceCategory.toLowerCase().trim() === 'boutique';

      // Prepare update data object - trim strings and convert empty strings to null
      const updateData = {
        title: title.trim(),
        description: description.trim() || null,
        service_category: serviceCategory,
        price: priceRange.trim() || null,
        delivery_timeline: deliveryTimeline.trim() || null,
        phone_number: phoneNumber.replace(/\D/g, "") || null, // Remove formatting
        contact_email: contactEmail.trim(),
        zip_code: zipCode.trim() || null,
        post_type: postType,
        ...(acceptsPayment ? { in_stock: parseInt(inStock) || 1 } : {}),
        ...(isBoutique ? {
          shipping_charge_cents: Math.round(parseFloat(shippingCharge || '0') * 100) || 1000,
          post_payment_method: postPaymentMethods.length > 0 ? JSON.stringify(postPaymentMethods) : null,
          post_payment_info: Object.keys(postPaymentInfos).length > 0 ? JSON.stringify(postPaymentInfos) : null,
        } : {}),
      };

      console.log("Update data:", updateData);

      // UPDATED: Using api client instead of fetch
      const data = await api.put(`/api/service-posts/${postId}`, updateData);

      console.log("Update response data:", data);

      // Show success message and navigate back if update successful
      if (data.success) {
        // Merge and save payment methods to profile (never remove existing methods)
        if (isBoutique && postPaymentMethods.length > 0) {
          const mergedMethods = Array.from(new Set([...profilePaymentMethods, ...postPaymentMethods]));
          const mergedInfos = { ...profilePaymentInfos, ...postPaymentInfos };
          api.put(`/business-owners/by-user/${userInfo?.user_id}`, {
            payment_method: JSON.stringify(mergedMethods),
            payment_info: Object.keys(mergedInfos).length > 0 ? JSON.stringify(mergedInfos) : null,
          }).catch((err: any) => console.warn('⚠️ Could not save payment defaults to profile:', err));
        }

        // ADDED: February 19, 2026 - Upload any new photos before navigating back
        if (selectedPhotos.length > 0) {
          console.log(`📸 Uploading ${selectedPhotos.length} new photos...`);
          await uploadPhotos(postId);
        }

        Alert.alert("Success", "Your listing has been updated successfully!", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        throw new Error(data.error || "Failed to update post");
      }
    } catch (error: any) {
      console.error("Error updating post:", error);
      Alert.alert(
        "Error", 
        `Failed to update listing: ${error.message || 'Unknown error'}`
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Format phone number as user types
   * Formats to ###-###-#### pattern
   */
  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, "");
    
    // Apply formatting based on length
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  /**
   * Handle cancel button press
   */
  const handleCancel = () => {
    console.log("Cancel button pressed");
    navigation.goBack();
  };

  // Error boundary: If postId is missing, show error screen
  if (!postId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>Invalid Post ID</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state: Show spinner while fetching post data
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading post data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main render: Edit form
  return (
    <SafeAreaView style={styles.container}>
      {/* KeyboardAvoidingView: Adjusts layout when keyboard appears */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header with back button and title */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Listing</Text>
          {/* Placeholder to center the title */}
          <View style={styles.placeholder} />
        </View>

        {/* ScrollView: Contains all form fields */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Type Selection: Toggle between "offer" and "request" */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Post Type</Text>
            <View style={styles.postTypeContainer}>
              {/* Offering Service button */}
              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  postType === "offer" && styles.postTypeButtonActive,
                ]}
                onPress={() => setPostType("offer")}
                disabled={saving}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={24}
                  color={postType === "offer" ? "#fff" : "#4A90E2"}
                />
                <Text
                  style={[
                    styles.postTypeText,
                    postType === "offer" && styles.postTypeTextActive,
                  ]}
                >
                   Offering Service
                </Text>
              </TouchableOpacity>
              {/* Requesting Service button */}
              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  postType === "request" && styles.postTypeButtonActive,
                ]}
                onPress={() => setPostType("request")}
                disabled={saving}
              >
                <Ionicons
                  name="search-outline"
                  size={24}
                  color={postType === "request" ? "#fff" : "#4A90E2"}
                />
                <Text
                  style={[
                    styles.postTypeText,
                    postType === "request" && styles.postTypeTextActive,
                  ]}
                >
                  Requesting Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Title field - Required */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="e.g., Professional House Cleaning Service"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              editable={!saving}
            />
            {/* Show error message if validation fails */}
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Service Category dropdown - Required */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Service Category <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.pickerContainer, errors.serviceCategory && styles.inputError]}>
              <Picker
                selectedValue={serviceCategory}
                onValueChange={setServiceCategory}
                style={styles.picker}
                enabled={!saving}
              >
                <Picker.Item label="Select a category..." value="" />
                {/* Map through dynamically loaded categories */}
                {serviceCategories.map((category) => (
                  <Picker.Item 
    key={category.category_name} 
    label={category.category_name} 
    value={category.category_name} 
  />
                ))}
              </Picker>
            </View>
            {/* Show error message if validation fails */}
            {errors.serviceCategory && (
              <Text style={styles.errorText}>{errors.serviceCategory}</Text>
            )}
          </View>

          {/* Description field - Optional, multiline with character counter */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your service or request in detail..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!saving}
            />
            {/* Character counter showing current/max length */}
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Price Range / Budget field */}
          {serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment ? (
            <View style={styles.section}>
              <Text style={styles.label}>
                Price per Item ($) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInputFlex]}
                  placeholder="0.00"
                  value={priceRange}
                  onChangeText={(t) => {
                    const clean = t.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');
                    setPriceRange(clean);
                  }}
                  keyboardType="decimal-pad"
                  blurOnSubmit={false}
                  {...(Platform.OS === 'web' ? ({ inputMode: 'decimal' } as any) : {})}
                  maxLength={20}
                  editable={!saving}
                />
              </View>
              {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.label}>Price/Rate (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., $50-$100 per hour"
                value={priceRange}
                onChangeText={setPriceRange}
                maxLength={50}
                editable={!saving}
              />
            </View>
          )}

          {/* Delivery Timeline — only for payment-enabled categories */}
          {serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment && (
            <View style={styles.section}>
              <Text style={styles.label}>Delivery Timeline</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 5 to 7 business days"
                value={deliveryTimeline}
                onChangeText={setDeliveryTimeline}
                maxLength={100}
                editable={!saving}
              />
            </View>
          )}

          {/* Contact Email field - Required */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Contact Email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.contactEmail && styles.inputError]}
              placeholder="your.email@example.com"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
              editable={!saving}
            />
            {/* Show error message if validation fails */}
            {errors.contactEmail && (
              <Text style={styles.errorText}>{errors.contactEmail}</Text>
            )}
          </View>

          {/* Phone Number field - Optional, auto-formats as user types */}
          <View style={styles.section}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, errors.phoneNumber && styles.inputError]}
              placeholder="123-456-7890"
              value={phoneNumber}
              onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
              keyboardType="phone-pad"
              maxLength={12}
              editable={!saving}
            />
            {/* Show error message if validation fails */}
            {errors.phoneNumber && (
              <Text style={styles.errorText}>{errors.phoneNumber}</Text>
            )}
          </View>

          {/* ZIP Code field - Optional */}
          <View style={styles.section}>
            <Text style={styles.label}>ZIP Code</Text>
            <TextInput
              style={[styles.input, errors.zipCode && styles.inputError]}
              placeholder="12345"
              value={zipCode}
              onChangeText={setZipCode}
              keyboardType="number-pad"
              maxLength={5}
              editable={!saving}
            />
            {/* Show error message if validation fails */}
            {errors.zipCode && <Text style={styles.errorText}>{errors.zipCode}</Text>}
          </View>

          {/* Quantity — only for payment-enabled categories */}
          {serviceCategories.find(c => c.category_name === serviceCategory)?.accepts_payment && (
            <View style={styles.section}>
              <Text style={styles.label}>Quantity Available</Text>
              <TextInput
                style={styles.input}
                value={inStock}
                onChangeText={setInStock}
                placeholder="1"
                keyboardType="numeric"
                maxLength={4}
                editable={!saving}
              />
              <Text style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                Set to 0 to mark as "Not Available"
              </Text>
            </View>
          )}

          {/* Boutique-only: Shipping Charge */}
          {serviceCategory.toLowerCase().trim() === 'boutique' && (
            <View style={styles.section}>
              <Text style={styles.label}>Shipping Charge ($)</Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInputFlex]}
                  placeholder="10.00"
                  value={shippingCharge}
                  onChangeText={(t) => {
                    const clean = t.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');
                    setShippingCharge(clean);
                  }}
                  keyboardType="decimal-pad"
                  blurOnSubmit={false}
                  {...(Platform.OS === 'web' ? ({ inputMode: 'decimal' } as any) : {})}
                  maxLength={8}
                  editable={!saving}
                />
              </View>
              <Text style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Amount charged to buyer for shipping</Text>
            </View>
          )}

          {/* Boutique-only: Payment Methods (multi-select checkboxes) */}
          {serviceCategory.toLowerCase().trim() === 'boutique' && (() => {
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
            };
            return (
              <View style={styles.section}>
                <Text style={styles.label}>Payment Methods (select all you accept)</Text>
                {PAYMENT_OPTIONS.map(o => {
                  const checked = postPaymentMethods.includes(o.value);
                  return (
                    <View key={o.value}>
                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => togglePaymentMethod(o.value)}
                        activeOpacity={0.7}
                        disabled={saving}
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
                          editable={!saving}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {/* ====================================================================
            ADDED: February 19, 2026 - Photos section
            Shows existing photos (deletable) + newly selected photos + add button
            Uses the same upload logic as PostServiceScreen
          ==================================================================== */}
          <View style={styles.section}>
            {/* Header row: label + total count */}
            <View style={styles.photoHeader}>
              <Text style={styles.label}>Photos</Text>
              <Text style={styles.photoCount}>
                {existingPhotos.length + selectedPhotos.length}/{maxPhotos}
              </Text>
            </View>

            {/* Existing photos already saved on the post */}
            {existingPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {existingPhotos.map((uri, index) => (
                  <View key={`existing-${index}`} style={styles.photoPreview}>
                    <Image source={{ uri }} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removeExistingPhoto(index)}
                      disabled={saving}
                    >
                      <Ionicons name="close-circle" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Newly selected photos (not yet uploaded) */}
            {selectedPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {selectedPhotos.map((photo, index) => (
                  <View key={`new-${index}`} style={styles.photoPreview}>
                    <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removeNewPhoto(index)}
                      disabled={saving}
                    >
                      <Ionicons name="close-circle" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Photos button - disabled at limit or while saving */}
            <TouchableOpacity
              style={[
                styles.addPhotoButton,
                (existingPhotos.length + selectedPhotos.length >= maxPhotos || saving) && styles.addPhotoButtonDisabled,
              ]}
              onPress={pickPhotos}
              disabled={existingPhotos.length + selectedPhotos.length >= maxPhotos || saving}
            >
              <Ionicons
                name="camera-outline"
                size={22}
                color={existingPhotos.length + selectedPhotos.length >= maxPhotos ? "#ccc" : "#4A90E2"}
              />
              <Text
                style={[
                  styles.addPhotoText,
                  (existingPhotos.length + selectedPhotos.length >= maxPhotos || saving) && styles.addPhotoTextDisabled,
                ]}
              >
                {existingPhotos.length + selectedPhotos.length >= maxPhotos
                  ? "Maximum photos reached"
                  : "Add Photos"}
              </Text>
            </TouchableOpacity>

            {/* Hint shown when new photos are staged for upload */}
            {selectedPhotos.length > 0 && (
              <Text style={styles.photoHint}>
                📸 {selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} will be uploaded when you save.
                iPhone photos (HEIC) are automatically converted.
              </Text>
            )}
          </View>
          {/* END: Photos section */}

          {/* Save Button - Disabled during save or photo upload operation */}
          <TouchableOpacity
            style={[styles.saveButton, (saving || uploadingPhotos) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || uploadingPhotos}
          >
            {/* Show spinner while saving/uploading, otherwise show icon and text */}
            {saving || uploadingPhotos ? (
              <>
                <ActivityIndicator color="#fff" />
                {/* UPDATED: February 19, 2026 - Show contextual saving message */}
                <Text style={styles.saveButtonText}>
                  {uploadingPhotos ? "Uploading Photos..." : "Saving..."}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel Button - Navigate back without saving */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles: All styling for the component
const styles = createResponsiveStyles({ 
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF6B6B",
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#4A90E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  placeholder: {
    width: 34, // Matches back button width to center title
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#FF6B6B", // Red asterisk for required fields
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  priceInputRow: { flexDirection: "row", alignItems: "center" },
  currencyPrefix: {
    fontSize: 16,
    color: "#333",
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRightWidth: 0,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  priceInputFlex: { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  inputError: {
    borderColor: "#FF6B6B", // Red border for fields with validation errors
  },
  textArea: {
    height: 100,
    textAlignVertical: "top", // Start text at top for multiline input
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 5,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#4A90E2',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '700' },
  checkboxLabel: { fontSize: 15, color: '#333' },
  postTypeContainer: {
    flexDirection: "row",
    gap: 10,
  },
  postTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#4A90E2",
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  postTypeButtonActive: {
    backgroundColor: "#4A90E2", // Blue background when selected
    borderColor: "#4A90E2",
  },
  postTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A90E2",
  },
  postTypeTextActive: {
    color: "#fff", // White text when selected
  },
  saveButton: {
    backgroundColor: "#4CAF50", // Green save button
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: "#999", // Gray when disabled/saving
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },

  // ADDED: February 19, 2026 - Photo styles (match PostServiceScreen)
  photoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  photoCount: {
    fontSize: 14,
    color: "#999",
    fontWeight: "600",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removePhotoButton: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#4A90E2",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 14,
  },
  addPhotoButtonDisabled: {
    borderColor: "#ccc",
  },
  addPhotoText: {
    fontSize: 16,
    color: "#4A90E2",
    fontWeight: "600",
    marginLeft: 8,
  },
  addPhotoTextDisabled: {
    color: "#ccc",
  },
  photoHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  // END: Added photo styles
});

export default EditListing;