// Import necessary React hooks and React Native components
import React, { useState, useRef } from "react";
import API_URL from "../../config/apiConfig";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const SignUpFormBusinessOwners = () => {
  // Initialize navigation hook for screen navigation
  const navigation = useNavigation<any>();

  // State to manage all form fields
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    serviceRadiusMiles: "",
  });

  // State to track loading status when fetching zip code data
  const [isLoadingZipCode, setIsLoadingZipCode] = useState(false);
  
  // Reference to ScrollView for programmatic scrolling
  const scrollViewRef = useRef<ScrollView>(null);

  // Generic handler to update form field values
  const handleChange = (field: string, value: string) =>
    setFormData({ ...formData, [field]: value });

  // Validation: Check if email format is valid using regex
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  // Validation: Check if phone number has 10-15 digits (removes non-digit characters first)
  const isValidPhone = (phone: string) =>
    /^[0-9]{10,15}$/.test(phone.replace(/\D/g, ""));
  
  // Validation: Check if password meets strong password criteria
  // Must have: 1 uppercase, 1 lowercase, 1 number, 1 special char, min 8 characters
  const isStrongPassword = (password: string) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/.test(password);
  
  // Validation: Check if zip code is exactly 5 digits
  const isValidZipCode = (zipCode: string) => /^\d{5}$/.test(zipCode);

  // Fetch city and state from zip code using free Zippopotam API
  const fetchLocationFromZipCode = async (zipCode: string) => {
    // Exit early if zip code format is invalid
    if (!isValidZipCode(zipCode)) {
      return;
    }

    // Show loading indicator while fetching
    setIsLoadingZipCode(true);
    try {
      // Make API request to get location data for the zip code
      const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
      
      if (response.ok) {
        // Parse the JSON response
        const data = await response.json();
        const place = data.places[0];
        
        // Auto-populate city and state fields
        setFormData((prev) => ({
          ...prev,
          city: place["place name"],
          state: place["state abbreviation"],
        }));
      } else {
        // Show error if zip code not found
        Alert.alert(
          "Invalid Zip Code",
          "Unable to find location for this zip code. Please verify it's correct."
        );
        // Clear city and state fields on error
        setFormData((prev) => ({
          ...prev,
          city: "",
          state: "",
        }));
      }
    } catch (error) {
      // Handle network or other errors
      console.error("Error fetching zip code data:", error);
      Alert.alert(
        "Error",
        "Could not verify zip code. Please check your internet connection."
      );
    } finally {
      // Hide loading indicator
      setIsLoadingZipCode(false);
    }
  };

  // Handle zip code input changes with validation and auto-fetch
  const handleZipCodeChange = (text: string) => {
    // Only allow digits by removing all non-digit characters
    const digitsOnly = text.replace(/\D/g, "");
    
    // Limit input to maximum 5 digits
    const limitedText = digitsOnly.slice(0, 5);
    
    // Update zip code field
    handleChange("zipCode", limitedText);

    // Auto-fetch location data when exactly 5 digits are entered
    if (limitedText.length === 5) {
      fetchLocationFromZipCode(limitedText);
    } else {
      // Clear city and state if zip code is incomplete
      setFormData((prev) => ({
        ...prev,
        city: "",
        state: "",
      }));
    }
  };

  // Handle form submission and registration
  const handleRegister = async () => {
    // Define required fields that must be filled
    const requiredFields = [
      "email",
      "password",
      "street",
      "city",
      "state",
      "zipCode",
    ];

    // Check if all required fields are filled
    for (let field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        Alert.alert("Validation Error", `${field} is required`);
        return;
      }
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
      Alert.alert("Validation Error", "Invalid email format");
      return;
    }
    
    // Validate phone number format (only if phone number is provided)
    if (formData.phoneNumber && !isValidPhone(formData.phoneNumber)) {
      Alert.alert("Validation Error", "Invalid phone number format");
      return;
    }
    
    // Validate password strength
    if (!isStrongPassword(formData.password)) {
      Alert.alert(
        "Validation Error",
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
      );
      return;
    }
    
    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match");
      return;
    }
    
    // Validate zip code format
    if (!isValidZipCode(formData.zipCode)) {
      Alert.alert("Validation Error", "Zip code must be exactly 5 digits");
      return;
    }

    try {
      // Make API call to register the business owner
      const response = await fetch(
        `${API_URL}/business_owners/crud/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Map frontend form fields to backend API fields
          body: JSON.stringify({
            business_name: formData.name,
            phone_number: formData.phoneNumber,
            email: formData.email,
            password: formData.password,
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zipCode,
            // Only include service radius if provided, convert to number
            service_radius_miles: formData.serviceRadiusMiles
              ? Number(formData.serviceRadiusMiles)
              : undefined,
          }),
        }
      );

      // Parse response
      const data = await response.json();
      if (response.ok) {
        // Registration successful - show success message and navigate to home
        Alert.alert("Success", "User registered successfully!");
        navigation.navigate('BusinessOwnerHomeScreen');
      } else {
        // Registration failed - show error message
        Alert.alert("Error", data.message || "Registration failed");
      }
    } catch (err) {
      // Handle network or other errors
      console.error("Frontend registration error:", err);
      Alert.alert("Error", "Failed to register User");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Top bar with cancel button */}
      <View style={styles.topBar}>
        {/* Empty flex view to push cancel button to the right */}
        <View style={{ flex: 1 }} />
        {/* Cancel button to navigate back to home screen */}
        <TouchableOpacity
          onPress={() => navigation.navigate('BusinessOwnerHomeScreen')}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable form container */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form title */}
        <Text style={styles.title}>User Signup</Text>

        {/* Name input field (optional) */}
        <TextInput
          placeholder="Name"
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => handleChange("name", text)}
        />

        {/* Phone number input field (optional) */}
        <TextInput
          placeholder="Phone Number"
          style={styles.input}
          value={formData.phoneNumber}
          onChangeText={(text) => handleChange("phoneNumber", text)}
          keyboardType="phone-pad"
        />

        {/* Email input field (required) */}
        <TextInput
          placeholder="Email *"
          style={styles.input}
          value={formData.email}
          onChangeText={(text) => handleChange("email", text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password input field (required, hidden text) */}
        <TextInput
          placeholder="Password *"
          style={styles.input}
          value={formData.password}
          onChangeText={(text) => handleChange("password", text)}
          secureTextEntry
        />

        {/* Confirm password input field (required, hidden text) */}
        <TextInput
          placeholder="Confirm Password *"
          style={styles.input}
          value={formData.confirmPassword}
          onChangeText={(text) => handleChange("confirmPassword", text)}
          secureTextEntry
        />

        {/* Street address input field (required) */}
        <TextInput
          placeholder="Street *"
          style={styles.input}
          value={formData.street}
          onChangeText={(text) => handleChange("street", text)}
        />

        {/* Zip code field with loading indicator */}
        <View>
          {/* Zip code input - triggers auto-fill for city and state */}
          <TextInput
            placeholder="Zip Code * (5 digits)"
            style={styles.input}
            value={formData.zipCode}
            onChangeText={handleZipCodeChange}
            keyboardType="numeric"
            maxLength={5}
          />
          {/* Show loading spinner while fetching location data */}
          {isLoadingZipCode && (
            <ActivityIndicator
              size="small"
              color="green"
              style={styles.loadingIndicator}
            />
          )}
        </View>

        {/* City field - Auto-populated from zip code API, read-only */}
        <TextInput
          placeholder="City * (auto-filled)"
          style={[styles.input, styles.autoFilledInput]}
          value={formData.city}
          editable={false}
        />

        {/* State field - Auto-populated from zip code API, read-only */}
        <TextInput
          placeholder="State * (auto-filled)"
          style={[styles.input, styles.autoFilledInput]}
          value={formData.state}
          editable={false}
        />

        {/* Service radius input field (optional) */}
        <TextInput
          placeholder="Service Radius (miles)"
          style={styles.input}
          value={formData.serviceRadiusMiles}
          onChangeText={(text) => {
            handleChange("serviceRadiusMiles", text);
            // Auto-scroll to show the register button when this field is focused
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
          keyboardType="numeric"
        />

        {/* Register button */}
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register User</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Stylesheet definitions
const styles = StyleSheet.create({
  // Main screen container
  screen: { 
    flex: 1, 
    backgroundColor: "#f9f9f9" 
  },
  // Top bar styling with border
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  // Cancel button styling
  cancelButton: {
    padding: 8,
  },
  // Cancel text styling (red color)
  cancelText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ScrollView content container with padding
  container: { 
    padding: 20 
  },
  // Form title styling
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  // Standard input field styling
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  // Auto-filled field styling (grayed out appearance)
  autoFilledInput: {
    backgroundColor: "#f5f5f5",
    color: "#666",
  },
  // Loading indicator position (overlays on zip code field)
  loadingIndicator: {
    position: "absolute",
    right: 15,
    top: 12,
  },
  // Register button styling
  button: {
    backgroundColor: "green",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  // Register button text styling
  buttonText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "600" 
  },
});

export default SignUpFormBusinessOwners;