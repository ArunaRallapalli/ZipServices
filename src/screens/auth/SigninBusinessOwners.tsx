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
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import API_URL from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext";

type NavProp = NativeStackNavigationProp<RootStackParamList, "SigninBusinessOwners">;

interface JWTPayload {
  user_id: number;
  business_name?: string;
  email: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

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

// Manual JWT decode function
const decodeJwtManually = (token: string): JWTPayload => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");

    const payload = parts[1];
    const paddedPayload = payload + "=".repeat((4 - payload.length % 4) % 4);
    const decodedPayload = atob(paddedPayload);
    return JSON.parse(decodedPayload);
  } catch (error) {
    throw new Error("Failed to decode JWT");
  }
};

// Success overlay component
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
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation", "Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      
      console.log("Making business owner login request to:", `${API_URL}/business_owners/login`);

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

      const rawText = await response.text();
      console.log("Response status:", response.status);

      let data: LoginResponse;
      try {
        data = JSON.parse(rawText);
      } catch (err) {
        console.error("Invalid JSON from server:", rawText);
        throw new Error("Server returned invalid response");
      }

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      // Try to extract token from different possible locations
      const token = data.token || data.access_token || data.data?.token;
      
      if (!token) {
        console.error("No token found in response:", data);
        throw new Error("No authentication token received from server");
      }

      console.log("Token received, decoding...");

      // Try to extract user info from JWT and response
      let userInfo;
      let userId = 0;
      let businessName = "Business Owner";

      try {
        // Try to decode JWT for user info
        const decoded = decodeJwtManually(token);
        console.log("Decoded JWT:", decoded);
        
        userId = decoded.user_id || 0;
        businessName = decoded.business_name || decoded.email || "Business Owner";
        
        userInfo = {
          user_id: userId,
          user_type: 'business_owner' as const,
          email: email.trim(),
          business_name: businessName,
          full_name: businessName, // Use business name as display name
        };
      } catch (jwtError) {
        console.warn("JWT decode failed, using response data:", jwtError);
        
        // Fallback to response data
        const userFromResponse = data.user || data.data?.user;
        userId = userFromResponse?.user_id || userFromResponse?.id || 0;
        businessName = userFromResponse?.business_name || userFromResponse?.email || "Business Owner";
        
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

      // Use the auth context to sign in (this will handle token storage)
      await signIn(
        token,
        'business_owner',
        userId,
        email.trim(),
        userInfo
      );

      // Show success overlay
      setShowSuccess(true);
      
      // Show detailed success message
      setTimeout(() => {
        setShowSuccess(false);
        Alert.alert(
          'Welcome Back! 🎉',
          `Hi ${businessName}!\n\nYour business owner session has been saved securely. You can now:\n• Post and manage your services\n• Chat with customers\n• Access your business dashboard\n• Track your bookings`,
          [
            {
              text: 'Get Started',
              onPress: () => {
                // Navigate to TabWrapperScreen
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
      console.error("Business owner login error:", err.message);
      Alert.alert("Login Failed", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Text style={styles.title}>Business Owner Sign In</Text>

            <Text style={styles.label}>Email:</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="Enter your business email"
              editable={!loading}
            />

            <Text style={styles.label}>Password:</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="Enter your password"
              editable={!loading}
            />

            <View style={styles.buttonContainer}>
              <Button
                title={loading ? "Signing in..." : "Sign In"}
                onPress={handleLogin}
                disabled={loading}
                color="#4CAF50"
              />
            </View>

            <TouchableOpacity
              style={[styles.backButton, loading && styles.disabledButton]}
              onPress={() => navigation.navigate("ZipserviceHomeScreenSelection")}
              disabled={loading}
            >
              <Text style={[styles.backButtonText, loading && styles.disabledText]}>
                Back to Home
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Overlay */}
      <SuccessOverlay 
        visible={showSuccess} 
        message="Business session saved securely!" 
      />
    </>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  disabledText: {
    color: "#888",
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