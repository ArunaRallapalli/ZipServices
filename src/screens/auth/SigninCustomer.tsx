import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import { useAuth } from "../../contexts/AuthContext";
import API_URL from "../../config/apiConfig";

// ✅ FIXED: Define the correct login endpoint
const CUSTOMER_LOGIN_URL = `${API_URL}/customers/Existing_customers_search`;

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SigninCustomer"
>;

const SigninCustomer: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation", "Please enter both email and password");
      return;
    }

    try {
      setLoading(true);

      // ✅ FIXED: Use the correct endpoint URL
      console.log("Making login request to:", CUSTOMER_LOGIN_URL);
      const res = await fetch(CUSTOMER_LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const text = await res.text();
      console.log("Response status:", res.status);
      console.log("Response text:", text);
      
      // Check if response is ok BEFORE parsing and using data
      if (!res.ok) {
        let errorMessage = "Login failed";
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(text);

      // Ensure token exists before calling signIn
      if (!data.token) {
        throw new Error("No token received from server");
      }

      await signIn(
        data.token,
        "customer",
        data.user_id,
        email,
        {
          user_id: data.user_id,
          user_type: "customer",
          full_name: data.full_name,
          phone_number: data.phone_number,
          zip_code: data.zip_code,
          city: data.city,
          state: data.state,
          email,
        }
      );
      console.log("Customer auth token:", data.token);

      // Navigation code change on 09/28/2025
      navigation.navigate("TabWrapperScreen", {
        screen: "Home",
        params: { 
          customerInfo: {
            full_name: data.full_name,
            phone_number: data.phone_number,
            zip_code: data.zip_code,
            user_id: data.user_id,
            city: data.city,
            state: data.state,
            email: email,
          },
          preselectedCategory: null,
          fromSignup: true 
        }
      });

    } catch (err: any) {
      console.error("Customer login error:", err.message);
      Alert.alert("Login Failed", err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Existing Customer Sign In</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button
          title={loading ? "Signing in..." : "Sign In"}
          onPress={handleSignin}
          disabled={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SigninCustomer;

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
});