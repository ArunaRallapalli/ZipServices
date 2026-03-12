/**
 * SignInBusinessOwnersScreen - WITH PASSWORD RESET AND EMAIL VERIFICATION
 * 
 * Last Updated: February 8, 2026
 * Changes: 
 * - Migrated from fetch to api client for automatic token handling
 * - Added is_admin fetching from database during login
 * - Fixed is_admin fetch order (now fetches AFTER userId is determined)
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Alert } from "../../Utils/Alert";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { createResponsiveStyles } from "../../Utils/globalStyles";
import api from '../../api';
import AsyncStorage from '@react-native-async-storage/async-storage'; 


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
  
  const resetToken = (route.params as any)?.token;
  const resetEmail = (route.params as any)?.email;
  
  const [mode, setMode] = useState<ScreenMode>(resetToken ? 'reset' : 'login');
  
  const [email, setEmail] = useState(resetEmail || "");
  const [password, setPassword] = useState("");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (resetToken && resetEmail) {
      setMode('reset');
      setEmail(resetEmail);
    }
  }, [resetToken, resetEmail]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation", "Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      
      const data: LoginResponse = await api.post('/business_owners/login', { 
        email: email.trim(), 
        password: password.trim() 
      });

      // Check if email is verified
      if (data.user && data.user.email_verified === false) {
        Alert.alert(
          "Email Not Verified",
          "Please verify your email address before signing in. Check your inbox for the verification link.",
          [{ text: "OK" }]
        );
        return;
      }

     // ✅ REPLACE WITH - correct order
const token = data.token || data.access_token || data.data?.token;

// 1. Check first
if (!token) {
  throw new Error("No authentication token received from server");
}

// 2. Then save
await AsyncStorage.setItem('access_token', token);
if (typeof window !== 'undefined') {
  localStorage.setItem('access_token', token);
}

const storedToken = await AsyncStorage.getItem('access_token');

      console.log('💾 Stored access_token:', storedToken);

          // ✅ FIXED
let userInfo: {
  user_id: number;
  user_type: 'business_owner';
  email: string;
  business_name: string;
  full_name: string;
  is_admin: boolean;
  phone_number?: string;
  zip_code?: string;
  city?: string;
  state?: string;
};
      let userId = 0;
      let businessName = "Business Owner";

      // ✅ First decode token to get userId
      try {
        const decoded = decodeJwtManually(token);
        userId = decoded.user_id || 0;
        businessName = decoded.business_name || decoded.email || "Business Owner";
      } catch (jwtError) {
        const userFromResponse = data.user || data.data?.user;
        userId = userFromResponse?.user_id || userFromResponse?.id || 0;
        businessName = userFromResponse?.business_name || userFromResponse?.email || "Business Owner";
      }

      const is_admin = false;

      // ✅ Build userInfo with proper userId and is_admin
      try {
        const decoded = decodeJwtManually(token);
        
        userInfo = {
          user_id: userId,
          user_type: 'business_owner' as const,
          email: email.trim(),
          business_name: businessName,
          full_name: businessName,
          is_admin: is_admin
        };
      } catch (jwtError) {
        const userFromResponse = data.user || data.data?.user;
        
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
          is_admin: is_admin
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

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please enter your email address");
      return;
    }

    if (!email.includes('@')) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      
      const data = await api.post('/api/password-reset/request', { 
        email: email.trim() 
      });

      Alert.alert(
        "Check Your Email! 📧",
        "If an account exists with that email, we've sent you a password reset link. Please check your inbox and spam folder.",
        [
          {
            text: "OK",
            onPress: () => setMode('login')
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

  const handleResetPassword = async () => {
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
      
      const data = await api.post('/api/password-reset/verify', { 
        email: email.trim(),
        token: resetToken,
        newPassword: newPassword 
      });

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
              onSubmitEditing={handleForgotPassword}
              returnKeyType="send"
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
              onSubmitEditing={handleResetPassword}
              returnKeyType="done"
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
              onSubmitEditing={handleLogin}
              returnKeyType="go"
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
  onPress={() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('TabWrapperScreen');
    }
  }}
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