/**
 * SignInBusinessOwnersScreen - WITH PASSWORD RESET AND EMAIL VERIFICATION
 * 
 * Authentication screen for business owners with complete password reset flow.
 * 
 * FEATURES:
 * - Password reset request (forgot password)
 * - Password reset verification (set new password)
 * - Email verification requirement
 * - Three modes: 'login', 'forgot', 'reset'
 * - Deep linking support for email reset links
 * 
 * MODES:
 * - LOGIN MODE: Normal email/password sign-in
 * - FORGOT MODE: User enters email to receive reset link
 * - RESET MODE: User enters new password (triggered by email link)
 * 
 * PASSWORD RESET FLOW:
 * 1. User clicks "Forgot Password?"
 * 2. Enters email → Backend sends reset email
 * 3. User clicks link in email → Opens app in reset mode
 * 4. User enters new password → Password updated
 * 5. User can now log in with new password
 */

import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import { Alert } from "../../Utils/Alert";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import { RouteProp, useRoute } from "@react-navigation/native";
import API_URL from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext";
import { createResponsiveStyles } from "../../Utils/globalStyles";

type NavProp = NativeStackNavigationProp<RootStackParamList, "SigninBusinessOwners">;
type ScreenRouteProp = RouteProp<RootStackParamList, "SigninBusinessOwners">;

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
    email_verified?: boolean;
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

// Screen mode type
type ScreenMode = 'login' | 'forgot' | 'reset';

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
  const route = useRoute<ScreenRouteProp>();
  
  // Check if user came from password reset email link
  const resetToken = (route.params as any)?.token;
  const resetEmail = (route.params as any)?.email;
  
  // Screen mode state
  const [mode, setMode] = useState<ScreenMode>(resetToken ? 'reset' : 'login');
  
  // Login form state
  const [email, setEmail] = useState(resetEmail || "");
  const [password, setPassword] = useState("");
  
  // Password reset state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Update mode if reset token is provided via navigation
  useEffect(() => {
    if (resetToken && resetEmail) {
      setMode('reset');
      setEmail(resetEmail);
    }
  }, [resetToken, resetEmail]);

  /**
   * Handle normal login
   */
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation", "Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      
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
      
      let data: LoginResponse;
      try {
        data = JSON.parse(rawText);
      } catch (err) {
        throw new Error("Server returned invalid response");
      }

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      // ✅ Check if email is verified
      if (data.user && data.user.email_verified === false) {
        Alert.alert(
          "Email Not Verified",
          "Please verify your email address before signing in. Check your inbox for the verification link.",
          [
            { text: "OK" }
          ]
        );
        return; // Stop login process
      }

      const token = data.token || data.access_token || data.data?.token;
      
      if (!token) {
        throw new Error("No authentication token received from server");
      }

      let userInfo;
      let userId = 0;
      let businessName = "Business Owner";

      try {
        const decoded = decodeJwtManually(token);
        userId = decoded.user_id || 0;
        businessName = decoded.business_name || decoded.email || "Business Owner";
        
        userInfo = {
          user_id: userId,
          user_type: 'business_owner' as const,
          email: email.trim(),
          business_name: businessName,
          full_name: businessName,
        };
      } catch (jwtError) {
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

      await signIn(token, 'business_owner', userId, email.trim(), userInfo);

      setSuccessMessage("Business session saved securely!");
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        Alert.alert(
          'Welcome Back! 🎉',
          `Hi \n\nYour session has been saved securely. You can now:\n• Search, Post,Request and manage your services\n• Chat with customers\n• Access your dashboard\n• Track your bookings`,
          [
            {
              text: 'Get Started',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'TabWrapperScreen' }],
                });
              }
            }
          ]
        );
      }, 1500);

    } catch (err: any) {
      console.error("Login error:", err.message);
      Alert.alert("Login Failed", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle password reset request (forgot password)
   */
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please enter your email address");
      return;
    }

    // Basic email validation
    if (!email.includes('@')) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/api/password-reset/request`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email");
      }

      // Show success message
      Alert.alert(
        "Check Your Email! 📧",
        "If an account exists with that email, we've sent you a password reset link. Please check your inbox and spam folder.",
        [
          {
            text: "OK",
            onPress: () => setMode('login') // Return to login mode
          }
        ]
      );

    } catch (err: any) {
      console.error("Password reset request error:", err.message);
      Alert.alert("Error", err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle password reset verification (set new password)
   */
  const handleResetPassword = async () => {
    // Validate inputs
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Validation", "Please fill in both password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords Don't Match", "Please make sure both passwords are the same");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Password Too Short", "Password must be at least 8 characters long");
      return;
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      Alert.alert(
        "Weak Password",
        "Password must include:\n• Uppercase letter\n• Lowercase letter\n• Number\n• Special character (!@#$%^&*)"
      );
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/api/password-reset/verify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          email: email.trim(),
          token: resetToken,
          newPassword: newPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      // Show success message
      setSuccessMessage("Password reset successfully!");
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        Alert.alert(
          "Password Reset Complete! ✅",
          "Your password has been updated successfully. You can now log in with your new password.",
          [
            {
              text: "Log In",
              onPress: () => {
                // Clear fields and return to login mode
                setMode('login');
                setNewPassword("");
                setConfirmPassword("");
                setPassword("");
              }
            }
          ]
        );
      }, 1500);

    } catch (err: any) {
      console.error("Password reset error:", err.message);
      Alert.alert("Reset Failed", err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render content based on current mode
   */
  const renderContent = () => {
    switch (mode) {
      case 'forgot':
        return (
          <>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <Text style={styles.label}>Email:</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="Enter your email"
              editable={!loading}
            />

            <View style={styles.buttonContainer}>
              <Button
                title={loading ? "Sending..." : "Send Reset Link"}
                onPress={handleForgotPassword}
                disabled={loading}
                color="#4CAF50"
              />
            </View>

            <TouchableOpacity 
              onPress={() => setMode('login')}
              disabled={loading}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>← Back to Login</Text>
            </TouchableOpacity>
          </>
        );

      case 'reset':
        return (
          <>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Create a strong password for your account.
            </Text>

            <Text style={styles.label}>Email:</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
            />

            <Text style={styles.label}>New Password:</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Enter new password"
              editable={!loading}
            />

            <Text style={styles.label}>Confirm Password:</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter new password"
              editable={!loading}
            />

            <Text style={styles.helperText}>
              Password must be 8+ characters with uppercase, lowercase, number, and special character
            </Text>

            <View style={styles.buttonContainer}>
              <Button
                title={loading ? "Resetting..." : "Reset Password"}
                onPress={handleResetPassword}
                disabled={loading}
                color="#4CAF50"
              />
            </View>
          </>
        );

      default: // 'login'
        return (
          <>
            <Text style={styles.title}>Sign In</Text>

            <Text style={styles.label}>Email:</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="Enter your email"
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

            <TouchableOpacity 
              onPress={() => setMode('forgot')}
              disabled={loading}
              style={styles.forgotPasswordButton}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
              <Button
                title={loading ? "Signing in..." : "Sign In"}
                onPress={handleLogin}
                disabled={loading}
                color="#4CAF50"
              />
            </View>
          </>
        );
    }
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            disabled={loading}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              {renderContent()}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <SuccessOverlay 
        visible={showSuccess} 
        message={successMessage} 
      />
    </>
  );
}

const styles = createResponsiveStyles({
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
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
    paddingHorizontal: 10,
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
  disabledInput: {
    backgroundColor: "#f5f5f5",
    color: "#999",
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 16,
    marginTop: -8,
  },
  buttonContainer: {
    marginTop: 10,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
    padding: 4,
  },
  forgotPasswordText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 8,
  },
  linkText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
  },
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