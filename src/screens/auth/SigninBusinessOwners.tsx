/**
 * SignInBusinessOwnersScreen
 * 
 * Authentication screen specifically for business owners to sign in to the application.
 * 
 * FEATURES:
 * - Email and password authentication
 * - JWT token handling with manual decoding
 * - Flexible API response parsing (handles multiple response formats)
 * - Success overlay with animated feedback
 * - Global authentication state management via AuthContext
 * - Secure session storage (token saved to AsyncStorage via signIn)
 * - Keyboard-aware UI for better mobile experience
 * - Loading states and error handling
 * 
 * FLOW:
 * 1. User enters email and password
 * 2. On submit, validates inputs
 * 3. Makes POST request to /business_owners/login endpoint
 * 4. Extracts and decodes JWT token from response
 * 5. Saves token and user info to AsyncStorage via AuthContext
 * 6. Shows success overlay
 * 7. Displays welcome alert with app features
 * 8. Navigates to TabWrapperScreen (main app)
 * 
 * AUTHENTICATION:
 * - Uses JWT tokens for authentication
 * - Token stored securely in AsyncStorage
 * - User type: 'business_owner'
 * - Supports multiple API response formats for flexibility
 * 
 * ERROR HANDLING:
 * - Input validation
 * - Network error handling
 * - Invalid JSON response handling
 * - JWT decoding fallback (uses response data if JWT decode fails)
 * - User-friendly error messages via Alert
 * 
 * NAVIGATION:
 * - On success: Resets navigation stack to TabWrapperScreen
 * - Cancel button: Returns to previous screen
 * 
 */

// Import necessary React and React Native components
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Alert } from "../../Utils/Alert";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import API_URL from "../../config/apiConfig"; // Backend API URL configuration
import { useAuth } from "../../contexts/AuthContext"; // Auth context for global authentication state
import { createResponsiveStyles } from "../../Utils/globalStyles"
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

/**
 * Manual JWT decoder utility
 * Decodes a JWT token without requiring external libraries
 * 
 * @param token - The JWT token string to decode
 * @returns Decoded JWT payload containing user information
 * @throws Error if token format is invalid or decoding fails
 */
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

/**
 * Success Overlay Component
 * Displays a centered modal-style success message after successful login
 * 
 * @param visible - Controls overlay visibility
 * @param message - Success message to display to user
 */
// Success overlay component - displays a success message after login
const SuccessOverlay: React.FC<{ visible: boolean; message: string }> = ({ visible, message }) => {
  // Don't render anything if not visible
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

/**
 * Main Screen Component
 * Handles the complete business owner sign-in flow
 */
export default function SignInBusinessOwnersScreen({ navigation }: { navigation: NavProp }) {
  // Get signIn function from auth context to handle global authentication
  const { signIn } = useAuth();
  
  // Local state for form inputs and UI state
  const [email, setEmail] = useState(""); // User's email input
  const [password, setPassword] = useState(""); // User's password input
  const [loading, setLoading] = useState(false); // Loading state during login
  const [showSuccess, setShowSuccess] = useState(false); // Success overlay visibility

  /**
   * Main login handler
   * Handles the complete authentication flow:
   * 1. Validates inputs
   * 2. Makes API request
   * 3. Processes response
   * 4. Decodes JWT
   * 5. Saves authentication state
   * 6. Shows success feedback
   * 7. Navigates to main app
   */
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
      // This handles multiple API response formats for flexibility
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
        // This ensures authentication still works even if JWT decoding fails
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
      // and update the global authentication state throughout the app
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
        // Show comprehensive welcome message with app features
        Alert.alert(
          'Welcome Back! 🎉',
          `Hi \n\nYour session has been saved securely. You can now:\n• Search, Post,Request and manage your services\n• Chat with customers\n• Access your dashboard\n• Track your bookings`,
          [
            {
              text: 'Get Started',
              onPress: () => {
                // Navigate to main app screen after successful login
                // Reset navigation stack to prevent going back to login screen
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
      // Show user-friendly error message
      Alert.alert("Login Failed", err.message || "Something went wrong");
    } finally {
      // Always reset loading state regardless of success or failure
      setLoading(false);
    }
  };

  return (
    <>
      {/* Main screen container with safe area handling */}
      <SafeAreaView style={styles.safeArea}>
        {/* Top bar with cancel button */}
        <View style={styles.topBar}>
          {/* Spacer to push cancel button to right */}
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
        {/* Adjusts content position when keyboard appears on iOS */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled" // Allow taps on buttons when keyboard is open
          >
            <View style={styles.container}>
              {/* Screen title */}
              <Text style={styles.title}>Sign In</Text>

              {/* Email input field */}
              <Text style={styles.label}>Email:</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address" // Show email keyboard layout
                autoCapitalize="none" // Don't auto-capitalize email
                autoComplete="email" // Enable email autofill
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
                autoComplete="password" // Enable password autofill
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
      {/* Renders on top of all other content with semi-transparent background */}
      <SuccessOverlay 
        visible={showSuccess} 
        message="Business session saved securely!" 
      />
    </>
  );
}

// Stylesheet for component styling
const styles = createResponsiveStyles({
  // Safe area container - respects device notches and system UI
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Top navigation bar styling
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  // Cancel button styling
  cancelButton: {
    padding: 8,
  },
  // Cancel button text styling
  cancelText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ScrollView content container - centers content vertically
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  // Main form container
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  // Screen title styling
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  // Input label styling
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
    color: "#333",
  },
  // Text input field styling
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  // Button container styling
  buttonContainer: {
    marginTop: 10,
  },
  // Success overlay styles
  // Full-screen overlay with semi-transparent background
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 50% transparent black
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Ensure it appears on top of all other content
  },
  // Success card container styling
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
    elevation: 8, // Android shadow
  },
  // Success checkmark icon styling
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  // Success title text styling
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  // Success message text styling
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});