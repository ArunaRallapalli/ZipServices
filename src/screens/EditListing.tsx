import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import API_URL from "../config/apiConfig";
import { Picker } from "@react-native-picker/picker";
type EditServicePostNavProp = NativeStackNavigationProp<RootStackParamList, "EditListing">;
type EditServicePostRouteProp = RouteProp<RootStackParamList, "EditListing">;

interface ServicePost {
  id: number;
  user_id: number;
  poster_type: string;
  post_type: string;
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

const serviceCategories = [
  "Cleaning",
  "Plumbing",
  "Electrical",
  "Landscaping",
  "Home Repair",
  "Pet Care",
  "Moving",
  "Tutoring",
  "Photography",
  "Catering",
  "Beauty",
  "Decoration",
  "Tailoring",
  "Other",
];

const EditServicePostScreen: React.FC = () => {
  const navigation = useNavigation<EditServicePostNavProp>();
  const route = useRoute<EditServicePostRouteProp>();
  const { postId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [postType, setPostType] = useState<"offer" | "request">("offer");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Validation states
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchPostData();
  }, [postId]);

  const fetchPostData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/service-posts/${postId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch post data");
      }

      const data = await response.json();
      
      if (data.success && data.post) {
        const post: ServicePost = data.post;
        setPostType(post.post_type as "offer" | "request");
        setTitle(post.title || "");
        setDescription(post.description || "");
        setServiceCategory(post.service_category || "");
        setPriceRange(post.price_range || "");
        setPhoneNumber(post.phone_number || "");
        setContactEmail(post.contact_email || "");
        setZipCode(post.zip_code || "");
      }
    } catch (error) {
      console.error("Error fetching post data:", error);
      Alert.alert("Error", "Failed to load post data. Please try again.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!serviceCategory) {
      newErrors.serviceCategory = "Service category is required";
    }

    if (!contactEmail.trim()) {
      newErrors.contactEmail = "Contact email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      newErrors.contactEmail = "Invalid email format";
    }

    if (zipCode && !/^\d{5}$/.test(zipCode)) {
      newErrors.zipCode = "ZIP code must be 5 digits";
    }

    if (phoneNumber && !/^\d{10}$/.test(phoneNumber.replace(/\D/g, ""))) {
      newErrors.phoneNumber = "Phone number must be 10 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors before saving.");
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        title: title.trim(),
        description: description.trim() || null,
        service_category: serviceCategory,
        price_range: priceRange.trim() || null,
        phone_number: phoneNumber.replace(/\D/g, "") || null,
        contact_email: contactEmail.trim(),
        zip_code: zipCode.trim() || null,
        post_type: postType,
      };

      const response = await fetch(`${API_URL}/api/service-posts/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update post");
      }

      const data = await response.json();

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
    } catch (error) {
      console.error("Error updating post:", error);
      Alert.alert("Error", "Failed to update listing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Listing</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Post Type</Text>
            <View style={styles.postTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  postType === "offer" && styles.postTypeButtonActive,
                ]}
                onPress={() => setPostType("offer")}
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
              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  postType === "request" && styles.postTypeButtonActive,
                ]}
                onPress={() => setPostType("request")}
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

          {/* Title */}
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
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Service Category */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Service Category <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.pickerContainer, errors.serviceCategory && styles.inputError]}>
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
            {errors.serviceCategory && (
              <Text style={styles.errorText}>{errors.serviceCategory}</Text>
            )}
          </View>

          {/* Description */}
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
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Price Range */}
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
            />
          </View>

          {/* Contact Email */}
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
            />
            {errors.contactEmail && (
              <Text style={styles.errorText}>{errors.contactEmail}</Text>
            )}
          </View>

          {/* Phone Number */}
          <View style={styles.section}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, errors.phoneNumber && styles.inputError]}
              placeholder="123-456-7890"
              value={phoneNumber}
              onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
              keyboardType="phone-pad"
              maxLength={12}
            />
            {errors.phoneNumber && (
              <Text style={styles.errorText}>{errors.phoneNumber}</Text>
            )}
          </View>

          {/* ZIP Code */}
          <View style={styles.section}>
            <Text style={styles.label}>ZIP Code</Text>
            <TextInput
              style={[styles.input, errors.zipCode && styles.inputError]}
              placeholder="12345"
              value={zipCode}
              onChangeText={setZipCode}
              keyboardType="number-pad"
              maxLength={5}
            />
            {errors.zipCode && <Text style={styles.errorText}>{errors.zipCode}</Text>}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    width: 34,
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
    color: "#FF6B6B",
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
    borderColor: "#FF6B6B",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
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
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    marginTop: 5,
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
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  postTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A90E2",
  },
  postTypeTextActive: {
    color: "#fff",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: "#999",
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

export default EditServicePostScreen;