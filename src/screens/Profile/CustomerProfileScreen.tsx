import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import API_URL from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext";

type CustomerProfileRouteProp = RouteProp<RootStackParamList, "CustomerProfileScreen">;

interface CustomerProfile {
  user_id: number;
  email: string;
  password: string;
  user_type: "customer";
  created_at: string;
  updated_at: string;
  customer_id: number;
  phone_number: string;
  zip_code: string;
  full_name: string;
  service_needed?: string;
}

const CustomerProfileScreen: React.FC = () => {
  const route = useRoute<CustomerProfileRouteProp>();
  const navigation = useNavigation();
  const { userInfo, signOut } = useAuth(); // ✅ Added signOut function

  const params = (route.params || {}) as any;
  const userId = params.user_id || params.customer_id || userInfo?.user_id;

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input state for controlled components
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [zipCode, setZipCode] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) {
      setError("No user ID provided. Please log in again.");
      setLoading(false);
      Alert.alert("Error", "No user ID provided. Please log in again.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`📞 Fetching customer profile for user_id: ${userId}`);

      const response = await fetch(`${API_URL}/customers/by-user/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}: ${errorText}`);
        throw new Error(`Failed to load profile (${response.status})`);
      }

      const data: CustomerProfile = await response.json();
      console.log("✅ Profile loaded successfully:", data);

      setProfile(data);
      // Populate form fields
      setFullName(data.full_name || "");
      setEmail(data.email || "");
      setPassword(data.password || "");
      setPhoneNumber(data.phone_number || "");
      setZipCode(data.zip_code || "");
    } catch (err: any) {
      console.error("❌ Failed to fetch profile:", err);
      const errorMessage = err.message || "Failed to load profile. Please check your network.";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Full name is required");
      return false;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Validation Error", "Please enter a valid email address");
      return false;
    }
    if (!zipCode.trim()) {
      Alert.alert("Validation Error", "ZIP code is required");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!profile || !userId) return;

    if (!validateForm()) return;

    try {
      setSaving(true);

      const updatedData = {
        full_name: fullName.trim(),
        email: email.trim(),
        password: password,
        phone_number: phoneNumber.trim(),
        zip_code: zipCode.trim(),
      };

      console.log(`💾 Updating profile for user_id: ${userId}`, updatedData);

      const response = await fetch(`${API_URL}/customers/by-user/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}: ${errorText}`);
        throw new Error(`Failed to update profile (${response.status})`);
      }

      const result = await response.json();
      console.log("✅ Profile updated successfully:", result);

      // Update local state with saved data
      setProfile({ ...profile, ...updatedData });

      Alert.alert("Success", "Profile updated successfully!");
    } catch (err: any) {
      console.error("❌ Failed to update profile:", err);
      Alert.alert("Error", err.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              console.log("✅ User logged out successfully");
            } catch (error) {
              console.error("❌ Logout error:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>😔 Oops!</Text>
        <Text style={styles.errorText}>
          {error || "Profile not found. Please try again."}
        </Text>
        <Text style={styles.debugText}>User ID: {userId || "Not provided"}</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>← Go Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.retryButton]}
          onPress={fetchProfile}
        >
          <Text style={styles.buttonText}>🔄 Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Customer Profile</Text>
          <Text style={styles.headerSubtitle}>Manage your account information</Text>
        </View>

        {/* Profile Info Card */}
        <View style={styles.card}>
          <Text style={styles.welcomeText}>Welcome, {profile.full_name}! 👋</Text>
          <Text style={styles.infoText}>
            Customer ID: #{profile.customer_id} • Member since{" "}
            {new Date(profile.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter new password (leave blank to keep current)"
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>
              Leave blank if you don't want to change your password
            </Text>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="(555) 123-4567"
              keyboardType="phone-pad"
            />
          </View>

          {/* ZIP Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ZIP Code *</Text>
            <TextInput
              style={styles.input}
              value={zipCode}
              onChangeText={setZipCode}
              placeholder="12345"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          {/* Service Needed (Read-only) */}
          {profile.service_needed && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Needed</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{profile.service_needed}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>💾 Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.buttonText, styles.backButtonText]}>← Back</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.buttonText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Last Updated */}
        <Text style={styles.footerText}>
          Last updated: {new Date(profile.updated_at).toLocaleString()}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#6b7280",
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#1f2937",
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  readOnlyField: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: "#6b7280",
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: "#4f46e5",
  },
  backButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  logoutButton: {
    backgroundColor: "#ef4444",
  },
  retryButton: {
    backgroundColor: "#10b981",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButtonText: {
    color: "#374151",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  errorTitle: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  debugText: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default CustomerProfileScreen;