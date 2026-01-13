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
import { Alert } from "../../Utils/Alert";
import { createResponsiveStyles } from "../../Utils/globalStyles"
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import api from '../../api'; // ADDED: January 5, 2026

type SignUpBusinessNavProp = StackNavigationProp<
  RootStackParamList,
  "SignUpFormBusinessOwners"
>;

const SignUpFormBusinessOwners = () => {
  const navigation = useNavigation<SignUpBusinessNavProp>();

  // Simplified form state - only essential fields
  const [formData, setFormData] = useState({
    name: "",        // Required
    email: "",       // Required
    password: "",    // Required
    zipCode: "",     // Required
    city: "",        // Auto-populated (read-only)
    state: "",       // Auto-populated (read-only)
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoadingZipData, setIsLoadingZipData] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleChange = (field: string, value: string) =>
    setFormData({ ...formData, [field]: value });

  // Auto-populate city and state from zip code
  // NOTE: This uses external ZIP API, not our backend, so keeping native fetch
  const fetchCityStateFromZip = async (zipCode: string) => {
    if (zipCode.length !== 5 || !/^\d{5}$/.test(zipCode)) {
      return;
    }

    try {
      setIsLoadingZipData(true);
      console.log("📍 Fetching city/state for zip code:", zipCode);

      // External API - keep using native fetch
      const response = await fetch(`http://api.zippopotam.us/us/${zipCode}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("📍 Zip code data received:", data);

        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          const city = place["place name"];
          const state = place["state abbreviation"];

          setFormData(prev => ({
            ...prev,
            city: city,
            state: state,
          }));

          console.log("✅ Auto-populated city:", city, "state:", state);
        }
      } else {
        console.log("❌ Zip code not found or invalid");
      }
    } catch (error) {
      console.error("❌ Error fetching zip code data:", error);
    } finally {
      setIsLoadingZipData(false);
    }
  };

  // Validation functions
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isStrongPassword = (password: string) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/.test(password);

  const handleCancel = () => {
    navigation.goBack();
  };

  /**
   * Handle user registration
   * UPDATED: January 5, 2026 - Using api.post() instead of fetch
   */
  const handleRegister = async () => {
    // Validate required fields
    const requiredFields = ["name", "email", "password", "zipCode"];

    for (let field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        Alert.alert("Validation Error", `${field} is required`);
        return;
      }
    }

    // Validate passwords match
    if (formData.password !== confirmPassword) {
      setPasswordError("Passwords do not match!");
      Alert.alert("Validation Error", "Passwords do not match!");
      return;
    }

    // Validate city and state were auto-populated
    if (!formData.city || !formData.state) {
      Alert.alert(
        "Validation Error", 
        "Please enter a valid US zip code. City and state will be filled automatically."
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
      
      // UPDATED: Using api client instead of fetch
      const data = await api.post('/business_owners/crud/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        // Optional fields sent as empty/default values
        description: "",
        phone_number: "",
        street: "",
        service_radius_miles: undefined,
      });

      console.log("📥 Registration response:", data);
      console.log("✅ Registration successful!");
      
      // Show email verification alert
      Alert.alert(
        "Account Created! 📧", 
        "Please check your email to verify your account. You must verify your email before you can sign in.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate to sign-in screen
              navigation.navigate('SigninBusinessOwners');
            }
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
        console.error("❌ Email already exists");
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
      <TouchableOpacity 
        style={styles.cancelButton} 
        onPress={handleCancel}
      >
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

        {/* Password - Required */}
        <TextInput
          placeholder="Password *"
          style={styles.input}
          value={formData.password}
          onChangeText={(text) => handleChange("password", text)}
          secureTextEntry
        />
        <Text style={styles.helperText}>
          Min 8 characters, include uppercase, lowercase, number, and special character
        </Text>

        {/* Confirm Password - Required */}
        <TextInput
          placeholder="Confirm Password *"
          style={[styles.input, passwordError ? styles.inputError : null]}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setPasswordError("");
          }}
          secureTextEntry
        />
        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : null}

        {/* Zip Code - Required (triggers city/state auto-fill) */}
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

        {/* City - Auto-populated (read-only display) */}
        {formData.city && (
          <View style={styles.autoFilledContainer}>
            <Text style={styles.autoFilledLabel}>City (auto-filled):</Text>
            <Text style={styles.autoFilledValue}>{formData.city}</Text>
          </View>
        )}

        {/* State - Auto-populated (read-only display) */}
        {formData.state && (
          <View style={styles.autoFilledContainer}>
            <Text style={styles.autoFilledLabel}>State (auto-filled):</Text>
            <Text style={styles.autoFilledValue}>{formData.state}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          * Required fields
        </Text>
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
});

export default SignUpFormBusinessOwners;