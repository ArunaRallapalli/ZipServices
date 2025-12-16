/**
 * BusinessOwnerProfileScreen Component - WITH LEGAL SECTION
 * 
 * This screen displays and allows editing of a business owner's profile information.
 * It shows account details, business information, and location/service area settings.
 * 
 * Features:
 * - Fetches business owner profile data by user ID
 * - Displays all profile fields in editable form
 * - Three sections: Account Information, Business Information, Location & Service Area
 * - Legal section with links to Terms of Service and Privacy Policy
 * - Editable fields: email, password, business name, category, description, phone, address, service radius
 * - Save button to update profile changes to backend
 * - Back button to navigate to previous screen
 * - Logout button with confirmation dialog
 * - Loading state while fetching profile data
 * - Error handling with user-friendly messages
 * - Keyboard-aware scrolling for better UX on mobile
 * - Gets user ID from either route parameters or auth context
 */

import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  ActivityIndicator, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  SafeAreaView,
  TouchableOpacity 
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import { Alert } from "../../Utils/Alert";
import API_URL from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext"; // Get authentication context
import { createResponsiveStyles } from '../../Utils/globalStyles';
import { BackButton } from '../../components/BackButton';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// Route type definition for type safety
type BusinessOwnerProfileRouteProp = RouteProp<RootStackParamList, "BusinessOwnerProfileScreen">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "BusinessOwnerProfileScreen">;

// BusinessOwnerProfile interface: represents the complete business owner profile structure
interface BusinessOwnerProfile {
  user_id: number;
  email: string;
  password: string;
  user_type: 'business_owner';
  created_at: string;
  updated_at: string;
  business_id: number;
  business_name: string;
  service_category: string;
  description: string;
  phone_number: string;
  zip_code: string;
  service_radius_miles: number;
  street: string;
  city: string;
  state: string;
}

const BusinessOwnerProfileScreen: React.FC = () => {
  const route = useRoute<BusinessOwnerProfileRouteProp>();
  const navigation = useNavigation<NavProp>();
  
  // Get user info and signOut function from authentication context
  const { userInfo, signOut } = useAuth();

  // Get user_id from route params OR from auth context (fallback)
  const user_id = route.params?.user_id || userInfo?.user_id || null;

  // State: Business owner profile data
  const [profile, setProfile] = useState<BusinessOwnerProfile | null>(null);
  
  // State: Loading indicator while fetching profile
  const [loading, setLoading] = useState(true);
  
  // State: Error message if profile fetch fails
  const [error, setError] = useState<string | null>(null);

  /**
   * Effect: Fetch business owner profile when component mounts or user_id changes
   */
  useEffect(() => {
    /**
     * Fetch the business owner's profile from the backend
     * Uses user_id to get the associated business owner profile
     */
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // API call to get business owner profile by user ID
        const response = await fetch(`${API_URL}/business-owners/by-user/${user_id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        setProfile(data); // Set profile data in state
      } catch (err: any) {
        console.error(err);
        setError("Failed to load profile. Please check your network and try again.");
        Alert.alert("Error", "Failed to load profile. Please check your network and try again.");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user_id is available
    if (user_id) fetchProfile();
    else {
      setLoading(false);
      setError("User ID not found. Please sign in again.");
    }
  }, [user_id]);

  /**
   * Handle save button press
   * Sends updated profile data to backend
   */
  const handleSave = async () => {
    if (!profile) return;

    try {
      // Prepare update data - only include editable fields
      const updatedData = {
        business_name: profile.business_name,
        service_category: profile.service_category,
        description: profile.description,
        phone_number: profile.phone_number,
        zip_code: profile.zip_code,
        service_radius_miles: profile.service_radius_miles,
        street: profile.street,
        city: profile.city,
        state: profile.state,
        email: profile.email,
        password: profile.password,
      };

      // API call to update business owner profile
      const response = await fetch(`${API_URL}/business-owners/by-user/${user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Failed to update profile");
    }
  };

  /**
   * Handle logout button press
   * Shows confirmation dialog before logging out
   */
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
              await signOut(); // Call signOut from auth context
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

  // Loading state: Show spinner while fetching profile data
  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text style={{ marginTop: 10 }}>Loading profile...</Text>
    </View>
  );

  // Error state: Show error message if profile fetch failed or profile not found
  if (error || !profile) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 18, color: 'red', textAlign: 'center' }}>{error || "Profile not found"}</Text>
      <Text>User ID: {user_id || "Not available"}</Text>
    </View>
  );

  // Main render: Profile form with all editable fields
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
    <BackButton /> 
     
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header: Business name */}
        <Text style={[styles.header, { fontSize: 24, marginTop: 20 }]}>
          Profile: {profile.business_name}
        </Text>

        {/* Section 1: Account Information */}
        <Text style={styles.sectionHeader}>Account Information</Text>

        {/* Email field */}
        <Text style={styles.label}>Email:</Text>
        <TextInput
          style={styles.input}
          value={profile.email}
          keyboardType="email-address"
          onChangeText={(text) => setProfile({ ...profile, email: text })}
        />

        {/* Password field - shown as dots for security */}
        <Text style={styles.label}>Password:</Text>
        <TextInput
          style={styles.input}
          value={profile.password}
          secureTextEntry
          onChangeText={(text) => setProfile({ ...profile, password: text })}
        />

        {/* Section 2: Business Information */}
        <Text style={styles.sectionHeader}>Business Information</Text>

        {/* Business Name field */}
        <Text style={styles.label}>Business Name:</Text>
        <TextInput
          style={styles.input}
          value={profile.business_name}
          onChangeText={(text) => setProfile({ ...profile, business_name: text })}
        />

        {/* Service Category field */}
        <Text style={styles.label}>Service Category:</Text>
        <TextInput
          style={styles.input}
          value={profile.service_category || ""}
          onChangeText={(text) => setProfile({ ...profile, service_category: text })}
        />

        {/* Description field - multiline for longer text */}
        <Text style={styles.label}>Description:</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={profile.description || ""}
          multiline
          numberOfLines={4}
          onChangeText={(text) => setProfile({ ...profile, description: text })}
        />

        {/* Phone Number field */}
        <Text style={styles.label}>Phone Number:</Text>
        <TextInput
          style={styles.input}
          value={profile.phone_number || ""}
          keyboardType="phone-pad"
          onChangeText={(text) => setProfile({ ...profile, phone_number: text })}
        />

        {/* Section 3: Location & Service Area */}
        <Text style={styles.sectionHeader}>Location & Service Area</Text>

        {/* Street Address field */}
        <Text style={styles.label}>Street Address:</Text>
        <TextInput
          style={styles.input}
          value={profile.street || ""}
          onChangeText={(text) => setProfile({ ...profile, street: text })}
        />

        {/* City field */}
        <Text style={styles.label}>City:</Text>
        <TextInput
          style={styles.input}
          value={profile.city || ""}
          onChangeText={(text) => setProfile({ ...profile, city: text })}
        />

        {/* State field */}
        <Text style={styles.label}>State:</Text>
        <TextInput
          style={styles.input}
          value={profile.state || ""}
          onChangeText={(text) => setProfile({ ...profile, state: text })}
        />

        {/* ZIP Code field */}
        <Text style={styles.label}>ZIP Code:</Text>
        <TextInput
          style={styles.input}
          value={profile.zip_code || ""}
          onChangeText={(text) => setProfile({ ...profile, zip_code: text })}
        />

        {/* Service Radius field - how far the business will travel */}
        <Text style={styles.label}>Service Radius (miles):</Text>
        <TextInput
          style={styles.input}
          value={String(profile.service_radius_miles || "")}
          keyboardType="numeric"
          onChangeText={(text) => setProfile({ ...profile, service_radius_miles: Number(text) || 0 })}
        />

        {/* Save button - sends updated profile to backend */}
        <Button title="Save Profile" onPress={handleSave} />

        {/* Section 4: Legal - NEW SECTION */}
        <Text style={styles.sectionHeader}>Legal</Text>
        
        {/* Terms of Service Link */}
        <TouchableOpacity 
          style={styles.legalMenuItem}
          onPress={() => navigation.navigate('TermsOfService')}
        >
          <Text style={styles.legalMenuText}>Terms of Service</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Privacy Policy Link */}
        <TouchableOpacity 
          style={styles.legalMenuItem}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <Text style={styles.legalMenuText}>Privacy Policy</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Back button - navigate to previous screen */}
        <View style={{ marginTop: 20 }}>
          <Button
            title="⬅ Back"
            onPress={() => navigation.goBack()}
          />
        </View>

        {/* Logout button - shows confirmation dialog then signs out */}
        <View style={{ marginTop: 20, marginBottom: 40 }}>
          <Button
            title="🚪 Logout"
            onPress={handleLogout}
            color="#ef4444"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView> 
  );
};

// Styles: All styling for the component
const styles = createResponsiveStyles({
  contentContainer: {
    padding: 20,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header: { fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  sectionHeader: { 
    fontWeight: "bold", 
    fontSize: 18, 
    marginTop: 25, 
    marginBottom: 15, 
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 5
  },
  label: { fontWeight: "bold", marginTop: 15 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginTop: 5, borderRadius: 5 },
  // Legal menu item styles - NEW
  legalMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  legalMenuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 20,
    color: '#999',
  },
});

export default BusinessOwnerProfileScreen;