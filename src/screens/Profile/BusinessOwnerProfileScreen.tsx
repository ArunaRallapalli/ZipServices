/**
 * BusinessOwnerProfileScreen Component - WITH LEGAL SECTION
 * 
 * Last Updated: January 9, 2026
 * Changes: Removed manual token passing - API client handles it automatically
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
import React, { useState, useEffect, useRef } from "react";
import { 
  View, Text, TextInput, Button, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, SafeAreaView, TouchableOpacity,Linking
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import { Alert } from "../../Utils/Alert";
import { useAuth } from "../../contexts/AuthContext";
import { createResponsiveStyles } from '../../Utils/globalStyles';
import { BackButton } from '../../components/BackButton';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import api from '../../api';
import { useUser } from '../../contexts/UserContext';
import { ContactSupportSection } from '../../components/ContactSupportSection';
import { fetchPaymentCategories } from '../../Utils/searchUtils';


// Type definitions
type BusinessOwnerProfileRouteProp = RouteProp<RootStackParamList, "BusinessOwnerProfileScreen">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "BusinessOwnerProfileScreen">;

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
  zelle_id?: string;
  is_admin?: boolean;
}

const BusinessOwnerProfileScreen: React.FC = () => {
  const route = useRoute<BusinessOwnerProfileRouteProp>();
  const navigation = useNavigation<NavProp>();
  // const { logout } = useUser();
 const { userInfo, signOut } = useAuth();
  
  const user_id = route.params?.user_id || userInfo?.user_id || null;

  const [profile, setProfile] = useState<BusinessOwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentCategories, setPaymentCategories] = useState<Set<string>>(new Set());

  // Prevent double fetch in React 18 strict mode
  const didFetch = useRef(false);

  useEffect(() => {
    if (!user_id || didFetch.current) {
      setLoading(false);
      if (!user_id) setError("User ID not found. Please sign in again.");
      return;
    }

    didFetch.current = true;

    const fetchProfile = async () => {
  try {
    setLoading(true);
    setError(null);

    console.log(`📱 Fetching profile for user_id: ${user_id}`);

    const response = await api.get(`/business-owners/by-user/${user_id}`);

    console.log('✅ Profile loaded successfully:', response);
    
    // ✅ Fetch is_admin from backend API
    let is_admin = false;
    try {
      const adminResponse = await api.get(`/api/users/${user_id}/admin-status`);
      is_admin = adminResponse.is_admin || false;
      console.log('✅ Admin status fetched:', is_admin);
    } catch (error) {
      console.log('⚠️ Could not fetch admin status, defaulting to false');
      is_admin = false;
    }
    
    const profileWithAdmin = {
      ...response,
      is_admin: is_admin
    };
    
    setProfile(profileWithAdmin);
    
  } catch (err: any) {
    console.error('❌ Profile fetch error:', err);
    setError("Failed to load profile. Please check your network and try again.");
    Alert.alert("Error", "Failed to load profile. Please check your network and try again.");
  } finally {
    setLoading(false);
  }
};

    fetchProfile();
    fetchPaymentCategories().then(setPaymentCategories).catch(() => {});
  }, [user_id]);

  const handleSave = async () => {
    if (!profile) return;

    try {
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
        zelle_id: profile.zelle_id || null,
      };

      console.log(`💾 Saving profile for user_id: ${user_id}`);

      // ✅ FIXED: Let API client handle token automatically
      await api.put(`/business-owners/by-user/${user_id}`, updatedData);

      console.log('✅ Profile saved successfully');
      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      console.error('❌ Profile save error:', err);
      Alert.alert("Error", err.message || "Failed to update profile");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              navigation.reset({ index: 0, routes: [{ name: 'BusinessOwnerHomeScreen' }] });
              console.log("✅ User logged out and navigated to Login");
            } catch (err: any) {
              console.error("❌ Logout error:", err);
              Alert.alert("Error", err.message || "Failed to logout. Please try again.");
            }
          }
        }
      ],
      { cancelable: true }
    );
  };
   const openEmail = (email: string, subject: string = '') => {
    const url = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening email:', err);
      Alert.alert('Error', 'Unable to open email client');
    });
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text style={{ marginTop: 10 }}>Loading profile...</Text>
    </View>
  );

  if (error || !profile) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 18, color: 'red', textAlign: 'center' }}>{error || "Profile not found"}</Text>
      <Text>User ID: {user_id || "Not available"}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <BackButton />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <Text style={[styles.header, { fontSize: 24, marginTop: 20 }]}>Profile: {profile.business_name}</Text>

          {/* Account Info */}
          <Text style={styles.sectionHeader}>Account Information</Text>
          <Text style={styles.label}>Email:</Text>
          <TextInput style={styles.input} value={profile.email} keyboardType="email-address" onChangeText={(text) => setProfile({ ...profile, email: text })} />
          <Text style={styles.label}>Password:</Text>
          <TextInput style={styles.input} value={profile.password} secureTextEntry onChangeText={(text) => setProfile({ ...profile, password: text })} />

          {/* Business Info */}
          <Text style={styles.sectionHeader}>Business Information</Text>
          <Text style={styles.label}>Business Name:</Text>
          <TextInput style={styles.input} value={profile.business_name} onChangeText={(text) => setProfile({ ...profile, business_name: text })} />
          <Text style={styles.label}>Service Category:</Text>
          <TextInput style={styles.input} value={profile.service_category || ""} onChangeText={(text) => setProfile({ ...profile, service_category: text })} />
          <Text style={styles.label}>Description:</Text>
          <TextInput style={[styles.input, { height: 80 }]} value={profile.description || ""} multiline numberOfLines={4} onChangeText={(text) => setProfile({ ...profile, description: text })} />
          <Text style={styles.label}>Phone Number:</Text>
          <TextInput style={styles.input} value={profile.phone_number || ""} keyboardType="phone-pad" onChangeText={(text) => setProfile({ ...profile, phone_number: text })} />
          {paymentCategories.has(profile.service_category) && !profile.zelle_id?.trim() && (
            <View style={styles.zelleBanner}>
              <Text style={styles.zelleBannerText}>
                Your category supports payments. Add your Zelle ID below so customers can purchase from your listing.
              </Text>
            </View>
          )}
          <Text style={styles.label}>Zelle ID (email or phone number for receiving payments):</Text>
          <TextInput style={styles.input} value={profile.zelle_id || ""} autoCapitalize="none" autoCorrect={false} keyboardType="default" onChangeText={(text) => setProfile({ ...profile, zelle_id: text })} />

          {/* Location */}
          <Text style={styles.sectionHeader}>Location & Service Area</Text>
          <Text style={styles.label}>Street Address:</Text>
          <TextInput style={styles.input} value={profile.street || ""} onChangeText={(text) => setProfile({ ...profile, street: text })} />
          <Text style={styles.label}>City:</Text>
          <TextInput style={styles.input} value={profile.city || ""} onChangeText={(text) => setProfile({ ...profile, city: text })} />
          <Text style={styles.label}>State:</Text>
          <TextInput style={styles.input} value={profile.state || ""} onChangeText={(text) => setProfile({ ...profile, state: text })} />
          <Text style={styles.label}>ZIP Code:</Text>
          <TextInput style={styles.input} value={profile.zip_code || ""} onChangeText={(text) => setProfile({ ...profile, zip_code: text })} />
          <Text style={styles.label}>Service Radius (miles):</Text>
          <TextInput style={styles.input} value={String(profile.service_radius_miles || "")} keyboardType="numeric" onChangeText={(text) => setProfile({ ...profile, service_radius_miles: Number(text) || 0 })} />

      <Button title="Save Profile" onPress={handleSave} />

          {/* Admin Tools - Check is_admin flag */}
          {profile?.is_admin && (
            <>
              <Text style={styles.sectionHeader}>Admin Tools</Text>
              <TouchableOpacity 
                style={styles.legalMenuItem} 
                onPress={() => navigation.navigate('AdminCategoryRequests')}
              >
                <Text style={styles.legalMenuText}>📋 Manage Category Requests</Text>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            </>
          )}

         {/* Legal */}
          <Text style={styles.sectionHeader}>Legal</Text>
          <TouchableOpacity 
            style={styles.legalMenuItem} 
            onPress={() => navigation.navigate('TermsOfService')}
          >
            <Text style={styles.legalMenuText}>Terms of Service</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.legalMenuItem} 
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Text style={styles.legalMenuText}>Privacy Policy</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Contact & Support - DISABLED FOR PHASE 1 */}
          {/* <ContactSupportSection showTitle={true} compact={false} /> */}

          <View style={{ marginTop: 20 }}>
            <Button title="⬅ Back" onPress={() => navigation.goBack()} />
          </View>

          <View style={{ marginTop: 20, marginBottom: 40 }}>
            <Button title="🚪 Logout" onPress={handleLogout} color="#ef4444" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
const styles = createResponsiveStyles({
  contentContainer: { padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header: { fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  sectionHeader: { fontWeight: "bold", fontSize: 18, marginTop: 25, marginBottom: 15, color: "#333", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 5 },
  label: { fontWeight: "bold", marginTop: 15 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginTop: 5, borderRadius: 5 },
  zelleBanner: { backgroundColor: '#FFF8E1', borderLeftWidth: 4, borderLeftColor: '#F59E0B', borderRadius: 6, padding: 12, marginTop: 16, marginBottom: 4 },
  zelleBannerText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  legalMenuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, backgroundColor: '#fff', borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  legalMenuText: { fontSize: 16, color: '#333', fontWeight: '500' },
  arrow: { fontSize: 20, color: '#999' },
});

export default BusinessOwnerProfileScreen;