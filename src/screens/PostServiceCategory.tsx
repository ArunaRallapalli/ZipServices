import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";

type SignUpBusinessNavProp = StackNavigationProp<
  RootStackParamList,
  "SignUpFormBusinessOwners"
>;

const SignUpFormBusinessOwners = () => {
  const navigation = useNavigation<SignUpBusinessNavProp>();

  const [formData, setFormData] = useState({
    businessName: "",
    serviceCategory: "",
    description: "",
    phoneNumber: "",
    email: "",
    password: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    serviceRadiusMiles: "",
  });

  const [categories, setCategories] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("http://10.0.2.2:5000/customers/service_category");
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to load service categories");
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleChange = (field: string, value: string) =>
    setFormData({ ...formData, [field]: value });

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) =>
    /^[0-9]{10,15}$/.test(phone.replace(/\D/g, ""));
  const isStrongPassword = (password: string) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/.test(password);

  const handleRegister = async () => {
    const requiredFields = [
      "businessName",
      "serviceCategory",
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

    try {
      const response = await fetch(
        "http://10.0.2.2:5000/business_owners/crud/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_name: formData.businessName,
            service_category: formData.serviceCategory,
            description: formData.description,
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
        Alert.alert("Success", "Business owner registered successfully!");
        await fetchCategories();
      } else {
        Alert.alert("Error", data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Frontend registration error:", err);
      Alert.alert("Error", "Failed to register business owner");
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Business Owner Signup</Text>

        <TextInput
          placeholder="Business Name *"
          style={styles.input}
          value={formData.businessName}
          onChangeText={(text) => handleChange("businessName", text)}
        />

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={formData.serviceCategory}
            onValueChange={(value) => handleChange("serviceCategory", value)}
          >
            <Picker.Item label="Select Service Category *" value="" />
            {categories.map((cat, idx) => (
              <Picker.Item key={idx} label={cat} value={cat} />
            ))}
          </Picker>
        </View>

        <TextInput
          placeholder="Description"
          style={styles.input}
          value={formData.description}
          onChangeText={(text) => handleChange("description", text)}
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
          placeholder="Street *"
          style={styles.input}
          value={formData.street}
          onChangeText={(text) => handleChange("street", text)}
        />

        <TextInput
          placeholder="City *"
          style={styles.input}
          value={formData.city}
          onChangeText={(text) => handleChange("city", text)}
        />

        <TextInput
          placeholder="State *"
          style={styles.input}
          value={formData.state}
          onChangeText={(text) => handleChange("state", text)}
        />

        <TextInput
          placeholder="Zip Code *"
          style={styles.input}
          value={formData.zipCode}
          onChangeText={(text) => handleChange("zipCode", text)}
          keyboardType="numeric"
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
          <Text style={styles.buttonText}>Register Business Owner</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Fixed bottom back button */}
      <TouchableOpacity
  style={styles.fixedBackButton}
  onPress={() => navigation.navigate('BusinessOwnerHomeScreen')}
>
  <Text style={styles.fixedBackButtonText}>
    Back to BusinessOwnerHomeScreen
  </Text>
</TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9f9f9" },
  container: { padding: 20 },
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
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 15,
  },
  button: {
    backgroundColor: "green",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40, // keep space above bottom button
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  fixedBackButton: {
    backgroundColor: "green",
    padding: 18,
    alignItems: "center",
  },
  fixedBackButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});

export default SignUpFormBusinessOwners;
