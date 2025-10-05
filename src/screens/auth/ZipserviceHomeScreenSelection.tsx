import React from "react";
import { View, Button, Alert, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import API_URL from "../../config/apiConfig";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ZipserviceHomeScreenSelection"
>;

const ZipserviceHomeScreenSelection: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  
const handleCancel = () => {
  // Navigate to TabWrapperScreen and specify the Search tab
  navigation.navigate("TabWrapperScreen", {
    screen: "SearchResultsScreen",
    params: {
      isGuest: true
    }
  });
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
      {/* Cancel Button - Top Right Corner */}
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      {/* Instruction Text */}
      <Text style={styles.headerText}>Please Sign Up / Log In</Text>

      {/* Action Buttons */}
      <Button title="I am a Customer" onPress={handleCustomer} color="#2196F3" />
      <Button title="I am a Business Owner" onPress={handleBusinessOwner} color="#4CAF50" />
    </View>
  );
};

export default ZipserviceHomeScreenSelection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  cancelButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 8,
  },
  cancelButtonText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
});