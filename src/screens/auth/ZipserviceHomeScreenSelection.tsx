import React from "react";
import { View, Alert, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CommonActions } from '@react-navigation/native';
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import API_URL from "../../config/apiConfig";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ZipserviceHomeScreenSelection">;

const ZipserviceHomeScreenSelection: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  
const handleCancel = () => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate('TabWrapperScreen');
  }
};
  const handleCustomer = async () => {
    try {
      console.log("Making request to:", `${API_URL}/users`);
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ user_type: "customer" }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Server response:", res.status, errText);
        throw new Error(errText || "Failed to create customer user");
      }

      const data = await res.json();
      const user_id = Number(data.user_id);

      if (isNaN(user_id)) {
        throw new Error("Invalid user_id returned from server");
      }

      navigation.navigate("CustomerHomeScreen", { user_id });
    } catch (err: any) {
      console.error("Error creating customer:", err);
      Alert.alert("Error", err.message || "Failed to create user");
    }
  };

  const handleBusinessOwner = async () => {
    try {
      console.log("Making request to:", `${API_URL}/users`);
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ user_type: "business_owner" }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Server response:", res.status, errText);
        throw new Error(errText || "Failed to create business owner user");
      }

      const data = await res.json();
      const user_id = Number(data.user_id);

      if (isNaN(user_id)) {
        throw new Error("Invalid user_id returned from server");
      }

      navigation.navigate("BusinessOwnerHomeScreen", { user_id });
    } catch (err: any) {
      console.error("Error creating business owner:", err);
      Alert.alert("Error", err.message || "Failed to create user");
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>✕ Cancel</Text>
      </TouchableOpacity>

      <Text style={styles.headerText}>Please Sign Up / Log In</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.customerButton} onPress={handleCustomer}>
          <Text style={styles.buttonText}>I am a Customer</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.businessButton} onPress={handleBusinessOwner}>
          <Text style={styles.buttonText}>I am a Business Owner</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ZipserviceHomeScreenSelection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f9f9f9",
  },
  cancelButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    zIndex: 10,
  },
  cancelButtonText: {
    color: "#FF4444",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 40,
    textAlign: "center",
    color: "#333",
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 300,
    gap: 16,
  },
  customerButton: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  businessButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});