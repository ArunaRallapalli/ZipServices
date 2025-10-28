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
  const navigation = useNavigation<any>();

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

  const [isLoadingZipCode, setIsLoadingZipCode] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleChange = (field: string, value: string) =>
    setFormData({ ...formData, [field]: value });

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) =>
    /^[0-9]{10,15}$/.test(phone.replace(/\D/g, ""));
  const isStrongPassword = (password: string) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/.test(password);
  
  // Validate zip code format (5 digits)
  const isValidZipCode = (zipCode: string) => /^\d{5}$/.test(zipCode);

  // Fetch city and state from zip code using free API
  const fetchLocationFromZipCode = async (zipCode: string) => {
    if (!isValidZipCode(zipCode)) {
      return;
    }

    setIsLoadingZipCode(true);
    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
      
      if (response.ok) {
        const data = await response.json();
        const place = data.places[0];
        
        setFormData((prev) => ({
          ...prev,
          city: place["place name"],
          state: place["state abbreviation"],
        }));
      } else {
        Alert.alert(
          "Invalid Zip Code",
          "Unable to find location for this zip code. Please verify it's correct."
        );
        setFormData((prev) => ({
          ...prev,
          city: "",
          state: "",
        }));
      }
    } catch (error) {
      console.error("Error fetching zip code data:", error);
      Alert.alert(
        "Error",
        "Could not verify zip code. Please check your internet connection."
      );
    } finally {
      setIsLoadingZipCode(false);
    }
  };

  // Handle zip code change
  const handleZipCodeChange = (text: string) => {
    // Only allow digits
    const digitsOnly = text.replace(/\D/g, "");
    
    // Limit to 5 digits
    const limitedText = digitsOnly.slice(0, 5);
    
    handleChange("zipCode", limitedText);

    // Auto-fetch when 5 digits are entered
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

  const handleRegister = async () => {
    const requiredFields = [
      "email",
      "password",
      "street",
      "city",
      "state",
      "zipCode",
    ];

    for (let field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        Alert.alert("Validation Error", `${field} is required`);
        return;
      }
    }

    if (!isValidEmail(formData.email)) {
      Alert.alert("Validation Error", "Invalid email format");
      return;
    }
    if (formData.phoneNumber && !isValidPhone(formData.phoneNumber)) {
      Alert.alert("Validation Error", "Invalid phone number format");
      return;
    }
    if (!isStrongPassword(formData.password)) {
      Alert.alert(
        "Validation Error",
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
      );
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match");
      return;
    }
    if (!isValidZipCode(formData.zipCode)) {
      Alert.alert("Validation Error", "Zip code must be exactly 5 digits");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/business_owners/crud/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_name: formData.name,
            phone_number: formData.phoneNumber,
            email: formData.email,
            password: formData.password,
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zipCode,
            service_radius_miles: formData.serviceRadiusMiles
              ? Number(formData.serviceRadiusMiles)
              : undefined,
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "User registered successfully!");
        navigation.navigate('BusinessOwnerHomeScreen');
      } else {
        Alert.alert("Error", data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Frontend registration error:", err);
      Alert.alert("Error", "Failed to register User");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Cancel button in top right */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => navigation.navigate('BusinessOwnerHomeScreen')}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>User Signup</Text>

        <TextInput
          placeholder="Name"
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => handleChange("name", text)}
        />

        <TextInput
          placeholder="Phone Number"
          style={styles.input}
          value={formData.phoneNumber}
          onChangeText={(text) => handleChange("phoneNumber", text)}
          keyboardType="phone-pad"
        />

        <TextInput
          placeholder="Email *"
          style={styles.input}
          value={formData.email}
          onChangeText={(text) => handleChange("email", text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password *"
          style={styles.input}
          value={formData.password}
          onChangeText={(text) => handleChange("password", text)}
          secureTextEntry
        />

        <TextInput
          placeholder="Confirm Password *"
          style={styles.input}
          value={formData.confirmPassword}
          onChangeText={(text) => handleChange("confirmPassword", text)}
          secureTextEntry
        />

        <TextInput
          placeholder="Street *"
          style={styles.input}
          value={formData.street}
          onChangeText={(text) => handleChange("street", text)}
        />

        {/* Zip Code Field - Now first in order */}
        <View>
          <TextInput
            placeholder="Zip Code * (5 digits)"
            style={styles.input}
            value={formData.zipCode}
            onChangeText={handleZipCodeChange}
            keyboardType="numeric"
            maxLength={5}
          />
          {isLoadingZipCode && (
            <ActivityIndicator
              size="small"
              color="green"
              style={styles.loadingIndicator}
            />
          )}
        </View>

        {/* City - Auto-populated from zip code */}
        <TextInput
          placeholder="City * (auto-filled)"
          style={[styles.input, styles.autoFilledInput]}
          value={formData.city}
          editable={false}
        />

        {/* State - Auto-populated from zip code */}
        <TextInput
          placeholder="State * (auto-filled)"
          style={[styles.input, styles.autoFilledInput]}
          value={formData.state}
          editable={false}
        />

        <TextInput
          placeholder="Service Radius (miles)"
          style={styles.input}
          value={formData.serviceRadiusMiles}
          onChangeText={(text) => {
            handleChange("serviceRadiusMiles", text);
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register User</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: "#f9f9f9" 
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: { 
    padding: 20 
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  autoFilledInput: {
    backgroundColor: "#f5f5f5",
    color: "#666",
  },
  loadingIndicator: {
    position: "absolute",
    right: 15,
    top: 12,
  },
  button: {
    backgroundColor: "green",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "600" 
  },
});

export default SignUpFormBusinessOwners;