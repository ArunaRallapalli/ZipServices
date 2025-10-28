import React, { useState } from "react";
import {
  View,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
} from "react-native";
import AppTextInput from "../../components/AppTextInput";
import API_URL from "../../config/apiConfig";
import { sharedPaddingHorizontal } from "../../styles/SharedStyles";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";

const SIGNUP_URL = `${API_URL}/customers/signup`;

type NavProp = NativeStackNavigationProp<RootStackParamList, "SignUpFormCustomers">;

const SignUpFormCustomers = () => {
  const navigation = useNavigation<NavProp>();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!fullName || !email || !password || !phoneNumber || !zipCode) {
      Alert.alert("Validation", "All fields are required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Validation", "Please enter a valid email address");
      return false;
    }
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      Alert.alert("Validation", "Phone number must be 10 digits");
      return false;
    }
    if (!/^[0-9]{5}$/.test(zipCode)) {
      Alert.alert("Validation", "Zip code must be 5 digits");
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const res = await fetch(SIGNUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password: password.trim(),
          phone_number: phoneNumber.trim(),
          zip_code: zipCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Signup failed");

      console.log("✅ Signup successful:", data);

      // Clear form
      setFullName("");
      setEmail("");
      setPassword("");
      setPhoneNumber("");
      setZipCode("");

      // Navigate to home screen
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "TabWrapperScreen",
            params: {
              screen: "Home",
              params: {
                customerInfo: {
                  user_id: data.customer.user_id,
                  full_name: data.customer.full_name,
                  phone_number: data.customer.phone_number,
                  zip_code: data.customer.zip_code,
                  city: data.customer.city || null,
                  state: data.customer.state || null,
                  email: email.trim(),
                },
                preselectedCategory: null,
                fromSignup: true
              }
            }
          }
        ]
      });

      // Show success
      Alert.alert("✅ Success", "Welcome! Your account has been created.");

    } catch (err: any) {
      console.error("❌ Signup error:", err);
      Alert.alert("❌ Error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <AppTextInput 
            placeholder="Full Name" 
            value={fullName} 
            onChangeText={setFullName} 
          />
          <AppTextInput 
            placeholder="Email" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
          />
          <AppTextInput 
            placeholder="Password" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
          />
          <AppTextInput 
            placeholder="Phone Number" 
            value={phoneNumber} 
            onChangeText={setPhoneNumber} 
            keyboardType="phone-pad" 
          />
          <AppTextInput 
            placeholder="Zip Code" 
            value={zipCode} 
            onChangeText={setZipCode} 
            keyboardType="numeric" 
          />

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleSignUp} 
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Signing up..." : "Sign Up"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('CustomerHomeScreen')}
          >
            <Text style={styles.backButtonText}>
              Back to Customer Home Screen
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUpFormCustomers;

const styles = StyleSheet.create({
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: "center" 
  },
  container: { 
    width: "100%", 
    paddingHorizontal: sharedPaddingHorizontal 
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "600" 
  },
  backButton: {
    backgroundColor: "#007bff",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },
  backButtonText: { 
    color: "white", 
    fontSize: 16, 
    fontWeight: "500" 
  },
});