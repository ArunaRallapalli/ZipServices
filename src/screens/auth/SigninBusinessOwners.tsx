// Import necessary React and React Native components
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import API_URL from "../../config/apiConfig"; // Backend API URL configuration
import { useAuth } from "../../contexts/AuthContext"; // Auth context for global authentication state

// Navigation prop type definition for type safety
type NavProp = NativeStackNavigationProp<RootStackParamList, "SigninBusinessOwners">;

// Interface for decoded JWT token payload
interface JWTPayload {
  user_id: number;
  business_name?: string;
  email: string;
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
  [key: string]: any; // Allow additional properties
}

// Interface for login API response - handles multiple possible response formats
interface LoginResponse {
  token?: string;
  access_token?: string;
  message?: string;
  user?: {
    user_id?: number;
    id?: number;
    email: string;
    business_name?: string;
    phone_number?: string;
    zip_code?: string;
    city?: string;
    state?: string;
    user_type?: string;
  };
  data?: {
    token?: string;
    user?: any;
  };
}

// Manual JWT decode function - decodes base64 encoded JWT without external library
const decodeJwtManually = (token: string): JWTPayload => {
  try {
    // Split JWT into its three parts (header.payload.signature)
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");

    // Extract and decode the payload (middle part)
    const payload = parts[1];
    // Add padding if necessary for base64 decoding
    const paddedPayload = payload + "=".repeat((4 - payload.length % 4) % 4);
    // Decode from base64 and parse JSON
    const decodedPayload = atob(paddedPayload);
    return JSON.parse(decodedPayload);
  } catch (error) {
    throw new Error("Failed to decode JWT");
  }
};

// Success overlay component - displays a success message after login
const SuccessOverlay: React.FC<{ visible: boolean; message: string }> = ({ visible, message }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.overlay}>
      <View style={styles.successCard}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Success!</Text>
        <Text style={styles.successMessage}>{message}</Text>
      </View>
    </View>
  );
};

export default function SignInBusinessOwnersScreen({ navigation }: { navigation: NavProp }) {
  // Get signIn function from auth context to handle global authentication
  const { signIn } = useAuth();
  
  // Local state for form inputs and UI state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // Loading state during login
  const [showSuccess, setShowSuccess] = useState(false); // Success overlay visibility

  // Main login handler - called when user taps Sign In button
  const handleLogin = async () => {
    // Validate that both fields are filled
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation", "Please enter both email and password");
      return;
    }

    try {
      setLoading(true); // Show loading state
      
      console.log("Making business owner login request to:", `${API_URL}/business_owners/login`);

      // Make POST request to backend login endpoint
      const response = await fetch(`${API_URL}/business_owners/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          email: email.trim(), 
          password: password.trim() 
        }),
      });

      // Get raw response text first to handle parsing errors
      const rawText = await response.text();
      console.log("Response status:", response.status);

      // Parse JSON response safely
      let data: LoginResponse;
      try {
        data = JSON.parse(rawText);
      } catch (err) {
        console.error("Invalid JSON from server:", rawText);
        throw new Error("Server returned invalid response");
      }

      // Check if response was successful
      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      // Try to extract token from different possible locations in response
      const token = data.token || data.access_token || data.data?.token;
      
      // Ensure we got a token
      if (!token) {
        console.error("No token found in response:", data);
        throw new Error("No authentication token received from server");
      }

      console.log("Token received, decoding...");

      // Initialize variables for user information
      let userInfo;
      let userId = 0;
      let businessName = "Business Owner";

      try {
        // Try to decode JWT to extract user information
        const decoded = decodeJwtManually(token);
        console.log("Decoded JWT:", decoded);
        
        // Extract user ID and business name from JWT
        userId = decoded.user_id || 0;
        businessName = decoded.business_name || decoded.email || "Business Owner";
        
        // Build user info object from JWT data
        userInfo = {
          user_id: userId,
          user_type: 'business_owner' as const,
          email: email.trim(),
          business_name: businessName,
          full_name: businessName, // Use business name as display name
        };
      } catch (jwtError) {
        console.warn("JWT decode failed, using response data:", jwtError);
        
        // Fallback: Use user data from API response if JWT decode fails
        const userFromResponse = data.user || data.data?.user;
        userId = userFromResponse?.user_id || userFromResponse?.id || 0;
        businessName = userFromResponse?.business_name || userFromResponse?.email || "Business Owner";
        
        // Build user info object from response data
        userInfo = {
          user_id: userId,
          user_type: 'business_owner' as const,
          email: email.trim(),
          business_name: businessName,
          full_name: businessName,
          phone_number: userFromResponse?.phone_number,
          zip_code: userFromResponse?.zip_code,
          city: userFromResponse?.city,
          state: userFromResponse?.state,
        };
      }

      console.log("Business owner login successful, saving token and user info...");

      // Use the auth context to sign in - this will handle token storage in AsyncStorage
      await signIn(
        token,
        'business_owner',
        userId,
        email.trim(),
        userInfo
      );

      // Show success overlay to user
      setShowSuccess(true);
      
      // After 1.5 seconds, hide overlay and show detailed welcome message
      setTimeout(() => {
        setShowSuccess(false);
        Alert.alert(
          'Welcome Back! 🎉',
          `Hi \n\nYour session has been saved securely. You can now:\n• Search, Post,Request and manage your services\n• Chat with customers\n• Access your dashboard\n• Track your bookings`,
          [
            {
              text: 'Get Started',
              onPress: () => {
                // Navigate to main app screen after successful login
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'TabWrapperScreen' }],
                });
              }
            }
          ]
        );
      }, 1500); // Show success overlay for 1.5 seconds

    } catch (err: any) {
      // Handle any errors during login process
      console.error("Business owner login error:", err.message);
      Alert.alert("Login Failed", err.message || "Something went wrong");
    } finally {
      // Always reset loading state regardless of success or failure
      setLoading(false);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        {/* Top bar with cancel button */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => navigation.goBack()} // Navigate back to previous screen
            disabled={loading} // Disable during login
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Keyboard avoiding view for better UX when keyboard is open */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled" // Allow taps on buttons when keyboard is open
          >
            <View style={styles.container}>
              <Text style={styles.title}>Sign In</Text>

              {/* Email input field */}
              <Text style={styles.label}>Email:</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="Enter your email"
                editable={!loading} // Disable input during login
              />

              {/* Password input field */}
              <Text style={styles.label}>Password:</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry // Hide password characters
                autoComplete="password"
                placeholder="Enter your password"
                editable={!loading} // Disable input during login
              />

              {/* Sign in button */}
              <View style={styles.buttonContainer}>
                <Button
                  title={loading ? "Signing in..." : "Sign In"}
                  onPress={handleLogin}
                  disabled={loading} // Disable button during login to prevent multiple submissions
                  color="#4CAF50"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Success Overlay - shown after successful login */}
      <SuccessOverlay 
        visible={showSuccess} 
        message="Business session saved securely!" 
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  buttonContainer: {
    marginTop: 10,
  },
  // Success overlay styles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});