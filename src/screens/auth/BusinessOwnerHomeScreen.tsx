/**
 * BusinessOwnerHomeScreen Component
 * 
 * Overview:
 * This is the landing screen for business owners in the ZipService app.
 * It provides two main options:
 * 1. Sign Up - for new business owners to create an account
 * 2. Login - for existing business owners to access their account
 * 
 * Features:
 * - Cancel button to return to the main tab navigation
 * - Navigation to sign-up and sign-in screens
 * - Clean, centered UI with green-themed action buttons
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";

// Define the navigation prop type for type-safe navigation
type NavProp = NativeStackNavigationProp<RootStackParamList, "BusinessOwnerHomeScreen">;

const BusinessOwnerHomeScreen: React.FC = () => {
  // Initialize navigation hook for screen transitions
  const navigation = useNavigation<NavProp>();

  /**
   * handleCancel
   * Resets the navigation stack and returns user to the TabWrapperScreen
   * This provides a way to exit the business owner flow
   */
  const handleCancel = () => {
    // Simply navigate to TabWrapperScreen without nested params
    navigation.reset({
      index: 0,
      routes: [{ name: 'TabWrapperScreen' }],
    });
  };

  return (
    <View style={styles.container}>
      {/* Cancel Button - Top Right Corner */}
      {/* Allows users to exit and return to main navigation */}
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      {/* Main Title */}
      <Text style={styles.title}>Welcome to ZipService</Text>

      {/* New Business Owner Button */}
      {/* Navigates to sign-up form with user_id initialized to 0 */}
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.navigate("SignUpFormBusinessOwners", { user_id: 0 })
        }
      >
        <Text style={styles.buttonText}>New User → Sign Up</Text>
      </TouchableOpacity>

      {/* Existing Business Owner Button */}
      {/* Navigates to login screen for returning users */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("SigninBusinessOwners")}
      >
        <Text style={styles.buttonText}>Existing User → Login</Text>
      </TouchableOpacity>
           
    </View>
  );
};

// Stylesheet for component styling
const styles = StyleSheet.create({
  // Main container - centers content vertically and horizontally
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20 
  },
  // Welcome title styling
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 40 
  },
  // Action button styling (Sign Up / Login buttons)
  button: { 
    backgroundColor: "green", 
    padding: 16, 
    marginVertical: 10, 
    borderRadius: 8, 
    width: '80%', 
    alignItems: 'center' 
  },
  // Text styling for action buttons
  buttonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },
  // Cancel button positioned at top-right corner
  cancelButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 8,
  },
  // Cancel button text styling with red color for visibility
  cancelButtonText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default BusinessOwnerHomeScreen;