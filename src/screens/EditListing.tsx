/**
 * EditListing Component
 * 
 * Last Updated: January 5, 2026
 * Changes: Migrated from fetch to api client for automatic token handling
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
} from "react-native";
import { createResponsiveStyles } from '../Utils/globalStyles';
import { Alert } from "../Utils/Alert";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import { Picker } from "@react-native-picker/picker";
import api from '../api'; // ADDED: January 5, 2026

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
  price_range?: string;
  phone_number?: string;
  contact_email?: string;
  zip_code?: string;
  city?: string;
  state?: string;
}

const EditListing: React.FC = () => {
  const navigation = useNavigation<EditListingNavProp>();
  const route = useRoute<EditListingRouteProp>();
  
  console.log("EditListing screen mounted");
  console.log("Route params:", route.params);
  
  // Extract postId from route parameters - used to fetch and update the specific post
  const { postId } = route.params || {};

  // State: Loading indicator while fetching post data from backend
  const [loading, setLoading] = useState(true);
  
  // State: Saving indicator while updating post data
  const [saving, setSaving] = useState(false);
  
  // State: Service categories fetched from API
  const [serviceCategories, setServiceCategories] = useState<{ category_name: string; display_order: number }[]>([]);
  
  // Form field states - represent all editable fields in the form
  const [postType, setPostType] = useState<"offer" | "request">("offer");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [zipCode, setZipCode] = useState("");

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
    } else {
      console.error("No postId provided in route params");
      Alert.alert("Error", "No post ID provided", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
      setLoading(false);
    }
  }, [postId]);

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
        setPriceRange(post.price_range || "");
        setPhoneNumber(post.phone_number || "");
        setContactEmail(post.contact_email || "");
        setZipCode(post.zip_code || "");
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle save button press
   * Validates form, then sends PUT request to update the post
   * UPDATED: January 5, 2026 - Using api.put() instead of fetch
   */
  const handleSave = async () => {
    console.log("Save button pressed");
    
    // Validate form before saving
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors before saving.");
      return;
    }

    try {
      setSaving(true);
      console.log("Saving post with ID:", postId);

      // Prepare update data object - trim strings and convert empty strings to null
      const updateData = {
        title: title.trim(),
        description: description.trim() || null,
        service_category: serviceCategory,
        price_range: priceRange.trim() || null,
        phone_number: phoneNumber.replace(/\D/g, "") || null, // Remove formatting
        contact_email: contactEmail.trim(),
        zip_code: zipCode.trim() || null,
        post_type: postType,
      };

      console.log("Update data:", updateData);

      // UPDATED: Using api client instead of fetch
      const data = await api.put(`/api/service-posts/${postId}`, updateData);

      console.log("Update response data:", data);

      // Show success message and navigate back if update successful
      if (data.success) {
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

          {/* Price Range / Budget field - Optional, label changes based on post type */}
          <View style={styles.section}>
            <Text style={styles.label}>
              {postType === "offer" ? "Price Range" : "Budget"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., $50-$100 per hour"
              value={priceRange}
              onChangeText={setPriceRange}
              maxLength={50}
              editable={!saving}
            />
          </View>

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

          {/* Save Button - Disabled during save operation */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {/* Show spinner while saving, otherwise show icon and text */}
            {saving ? (
              <ActivityIndicator color="#fff" />
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
});

export default EditListing;