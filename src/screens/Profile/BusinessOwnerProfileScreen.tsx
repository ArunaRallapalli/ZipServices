import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, Alert, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import API_URL from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext"; // Add this import

type BusinessOwnerProfileRouteProp = RouteProp<RootStackParamList, "BusinessOwnerProfileScreen">;

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
  const navigation = useNavigation();
  const { userInfo, signOut } = useAuth(); // Get user info and signOut from auth context

  // Get user_id from route params OR from auth context
  const user_id = route.params?.user_id || userInfo?.user_id || null;

  const [profile, setProfile] = useState<BusinessOwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/business-owners/by-user/${user_id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        setProfile(data);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load profile. Please check your network and try again.");
        Alert.alert("Error", "Failed to load profile. Please check your network and try again.");
      } finally {
        setLoading(false);
      }
    };

    if (user_id) fetchProfile();
    else {
      setLoading(false);
      setError("User ID not found. Please sign in again.");
    }
  }, [user_id]);

  const handleSave = async () => {
    if (!profile) return;

    try {
      // Only send fields that are editable
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <Text style={[styles.header, { fontSize: 24, marginTop: 20 }]}>
          Business Profile: {profile.business_name}
        </Text>

        {/* Account Information */}
        <Text style={styles.sectionHeader}>Account Information</Text>

        <Text style={styles.label}>Email:</Text>
        <TextInput
          style={styles.input}
          value={profile.email}
          keyboardType="email-address"
          onChangeText={(text) => setProfile({ ...profile, email: text })}
        />

        <Text style={styles.label}>Password:</Text>
        <TextInput
          style={styles.input}
          value={profile.password}
          secureTextEntry
          onChangeText={(text) => setProfile({ ...profile, password: text })}
        />

        {/* Business Information */}
        <Text style={styles.sectionHeader}>Business Information</Text>

        <Text style={styles.label}>Business Name:</Text>
        <TextInput
          style={styles.input}
          value={profile.business_name}
          onChangeText={(text) => setProfile({ ...profile, business_name: text })}
        />

        <Text style={styles.label}>Service Category:</Text>
        <TextInput
          style={styles.input}
          value={profile.service_category || ""}
          onChangeText={(text) => setProfile({ ...profile, service_category: text })}
        />

        <Text style={styles.label}>Description:</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={profile.description || ""}
          multiline
          numberOfLines={4}
          onChangeText={(text) => setProfile({ ...profile, description: text })}
        />

        <Text style={styles.label}>Phone Number:</Text>
        <TextInput
          style={styles.input}
          value={profile.phone_number || ""}
          keyboardType="phone-pad"
          onChangeText={(text) => setProfile({ ...profile, phone_number: text })}
        />

        {/* Location Information */}
        <Text style={styles.sectionHeader}>Location & Service Area</Text>

        <Text style={styles.label}>Street Address:</Text>
        <TextInput
          style={styles.input}
          value={profile.street || ""}
          onChangeText={(text) => setProfile({ ...profile, street: text })}
        />

        <Text style={styles.label}>City:</Text>
        <TextInput
          style={styles.input}
          value={profile.city || ""}
          onChangeText={(text) => setProfile({ ...profile, city: text })}
        />

        <Text style={styles.label}>State:</Text>
        <TextInput
          style={styles.input}
          value={profile.state || ""}
          onChangeText={(text) => setProfile({ ...profile, state: text })}
        />

        <Text style={styles.label}>ZIP Code:</Text>
        <TextInput
          style={styles.input}
          value={profile.zip_code || ""}
          onChangeText={(text) => setProfile({ ...profile, zip_code: text })}
        />

        <Text style={styles.label}>Service Radius (miles):</Text>
        <TextInput
          style={styles.input}
          value={String(profile.service_radius_miles || "")}
          keyboardType="numeric"
          onChangeText={(text) => setProfile({ ...profile, service_radius_miles: Number(text) || 0 })}
        />

        <Button title="Save Profile" onPress={handleSave} />

        {/* Back button */}
        <View style={{ marginTop: 20 }}>
          <Button
            title="⬅ Back"
            onPress={() => navigation.goBack()}
          />
        </View>

        {/* Logout button */}
        <View style={{ marginTop: 20 }}>
          <Button
            title="🚪 Logout"
            onPress={handleLogout}
            color="#ef4444"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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
});

export default BusinessOwnerProfileScreen;