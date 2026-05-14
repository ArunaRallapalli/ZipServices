/**
 * SignUpFormBusinessOwners Component - SIMPLIFIED VERSION
 * 
 * Last Updated: January 5, 2026
 * Changes: Migrated from fetch to api client for backend requests
 * 
 * IMPROVEMENTS:
 * 1. Fixed width issue - Added maxWidth constraint for better display on large screens
 * 2. Simplified to 4 required fields only: Name, Email, Password, Zip Code
 * 3. City and State auto-populate from Zip Code (read-only)
 * 4. Removed unnecessary fields (street, description, phone, service radius)
 * 5. Better user experience - faster signup process
 * 6. Email verification required before login
 * 
 * March 2026: Added password show/hide toggle
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";            // ← ADDED
import { Alert } from "../../Utils/Alert";
import { createResponsiveStyles } from "../../Utils/globalStyles"
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import api from '../../api';
import { validateZipCode } from '../../Services/zipCodeService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SignUpBusinessNavProp = StackNavigationProp<
  RootStackParamList,
  "SignUpFormBusinessOwners"
>;

const SignUpFormBusinessOwners = () => {
  const navigation = useNavigation<SignUpBusinessNavProp>();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    zipCode: "",
    city: "",
    state: "",
  });

  // ← ADDED: show/hide toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoadingZipData, setIsLoadingZipData] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleChange = (field: string, value: string) =>
    setFormData({ ...formData, [field]: value });

  const fetchCityStateFromZip = async (zipCode: string) => {
    if (zipCode.length !== 5 || !/^\d{5}$/.test(zipCode)) {
      return;
    }

    try {
      setIsLoadingZipData(true);
      console.log("📍 Validating ZIP code via backend:", zipCode);

      const result = await validateZipCode(zipCode);
      console.log("📍 ZIP validation result:", result);

      if (result.valid && result.city && result.stateAbbr) {
        setFormData(prev => ({
          ...prev,
          city: result.city || '',
          state: result.stateAbbr || '',
        }));
        console.log("✅ Auto-populated city:", result.city, "state:", result.stateAbbr);
      } else {
        console.log("❌ ZIP code validation failed:", result.error);
        setFormData(prev => ({ ...prev, city: '', state: '' }));
      }
    } catch (error) {
      console.error("❌ Error validating ZIP code:", error);
    } finally {
      setIsLoadingZipData(false);
    }
  };

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isStrongPassword = (password: string) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/.test(password);

const handleCancel = () => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate('SigninBusinessOwners'); // fallback when no history
  }
};

  const handleRegister = async () => {
    const requiredFields = ["name", "email", "password", "zipCode"];

    for (let field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        Alert.alert("Validation Error", `${field} is required`);
        return;
      }
    }

    if (formData.password !== confirmPassword) {
      setPasswordError("Passwords do not match!");
      Alert.alert("Validation Error", "Passwords do not match!");
      return;
    }

    if (!formData.city || !formData.state) {
      Alert.alert(
        "Invalid ZIP Code",
        "Please enter a valid 5-digit US ZIP code. The city and state will appear automatically when you enter a valid ZIP."
      );
      return;
    }

    if (!isValidEmail(formData.email)) {
      Alert.alert("Validation Error", "Invalid email format");
      return;
    }

    if (!isStrongPassword(formData.password)) {
      Alert.alert(
        "Validation Error",
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
      );
      return;
    }

    try {
      console.log("📤 Sending registration request...");

      const data = await api.post('/business_owners/crud/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        description: "",
        phone_number: "",
        street: "",
        service_radius_miles: undefined,
      });

      console.log("📥 Registration response:", data);
      console.log("✅ Registration successful!");

      await AsyncStorage.setItem('post_prompt_pending', 'true');
      Alert.alert(
        "Account Created! 📧",
        "Please check your email to verify your account. You must verify your email before you can sign in.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate('SigninBusinessOwners'),
          }
        ]
      );

    } catch (err: any) {
      console.error("❌ Registration error:", err);
      const errorMessage = err.message || "";
      const isEmailExistsError =
        errorMessage.toLowerCase().includes("email") &&
        (errorMessage.toLowerCase().includes("exist") ||
          errorMessage.toLowerCase().includes("already") ||
          errorMessage.toLowerCase().includes("duplicate") ||
          errorMessage.toLowerCase().includes("taken"));

      if (isEmailExistsError) {
        Alert.alert(
          "Email Already Registered",
          "This email is already associated with an account. Please use a different email address or try logging in.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", errorMessage || "Registration failed");
      }
    }
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Quick signup - just 4 fields!</Text>

        {/* Name - Required */}
        <TextInput
          placeholder="Full Name *"
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => handleChange("name", text)}
        />

        {/* Email - Required */}
        <TextInput
          placeholder="Email *"
          style={styles.input}
          value={formData.email}
          onChangeText={(text) => handleChange("email", text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* ── Password with show/hide ── */}
        <View style={styles.passwordWrapper}>
          <TextInput
            placeholder="Password *"
            style={[styles.input, styles.passwordInput]}
            value={formData.password}
            onChangeText={(text) => handleChange("password", text)}
            secureTextEntry={!showPassword}          // ← CHANGED
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(prev => !prev)}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.helperText}>
          Min 8 characters, include uppercase, lowercase, number, and special character
        </Text>

        {/* ── Confirm Password with show/hide ── */}
        <View style={styles.passwordWrapper}>
          <TextInput
            placeholder="Confirm Password *"
            style={[styles.input, styles.passwordInput, passwordError ? styles.inputError : null]}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setPasswordError("");
            }}
            secureTextEntry={!showConfirmPassword}   // ← CHANGED
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(prev => !prev)}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : null}

        {/* Zip Code - Required */}
        <View style={styles.zipCodeContainer}>
          <TextInput
            placeholder="Zip Code *"
            style={[styles.input, styles.zipCodeInput]}
            value={formData.zipCode}
            onChangeText={(text) => {
              handleChange("zipCode", text);
              if (text.length === 5) {
                fetchCityStateFromZip(text);
              }
            }}
            keyboardType="numeric"
            maxLength={5}
          />
          {isLoadingZipData && (
            <ActivityIndicator
              size="small"
              color="green"
              style={styles.zipCodeLoader}
            />
          )}
        </View>

        {/* City - Auto-populated */}
        {formData.city && (
          <View style={styles.autoFilledContainer}>
            <Text style={styles.autoFilledLabel}>City (auto-filled):</Text>
            <Text style={styles.autoFilledValue}>{formData.city}</Text>
          </View>
        )}

        {/* State - Auto-populated */}
        {formData.state && (
          <View style={styles.autoFilledContainer}>
            <Text style={styles.autoFilledLabel}>State (auto-filled):</Text>
            <Text style={styles.autoFilledValue}>{formData.state}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>* Required fields</Text>
      </ScrollView>
    </View>
  );
};

const styles = createResponsiveStyles({
  screen: {
    flex: 1,
    backgroundColor: "#f9f9f9"
  },

  formContainer: {
    paddingTop: 60,
  },

  cancelButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },

  cancelButtonText: {
    color: 'red',
    fontSize: 16,
    fontWeight: '600',
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    color: '#333',
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: -10,
    marginBottom: 15,
    paddingHorizontal: 5,
  },

  autoFilledContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4caf50',
  },

  autoFilledLabel: {
    fontSize: 12,
    color: '#2e7d32',
    marginBottom: 4,
    fontWeight: '600',
  },

  autoFilledValue: {
    fontSize: 16,
    color: '#1b5e20',
    fontWeight: '500',
  },

  button: {
    backgroundColor: "#4caf50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700"
  },

  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },

  zipCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 15,
  },

  zipCodeInput: {
    flex: 1,
    marginBottom: 0,
  },

  zipCodeLoader: {
    position: 'absolute',
    right: 12,
    top: 12,
  },

  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },

  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 15,
    paddingHorizontal: 5,
    fontWeight: '600',
  },

  // ← ADDED: password show/hide styles
  passwordWrapper: {
    position: 'relative',
    marginBottom: 15,
  },

  passwordInput: {
    marginBottom: 0,       // wrapper provides the margin
    paddingRight: 50,      // space for eye icon
  },

  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
});

export default SignUpFormBusinessOwners;