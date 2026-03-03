/**
 * BusinessOwnerHomeScreen Component - WITH TERMS CHECKBOX & USER-FRIENDLY ALERT
 * 
 * Overview:
 * This is the landing screen for business owners in the ZipService app.
 * It provides two main options:
 * 1. Sign Up - for new business owners to create an account (requires terms agreement)
 * 2. Sign In - for existing business owners to access their account
 * 
 * Features:
 * - Cancel button to return to the main tab navigation
 * - Terms & Privacy Policy checkbox (required for signup)
 * - Helpful alert if user tries to signup without agreeing to terms
 * - Navigation to sign-up and sign-in screens
 * - Clean, centered UI with green-themed action buttons
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/MainStackNavigator";
import { createResponsiveStyles } from '../../Utils/globalStyles';
import { Alert } from "../../Utils/Alert";
import Checkbox from 'expo-checkbox';

// Define the navigation prop type for type-safe navigation
type NavProp = NativeStackNavigationProp<RootStackParamList, "BusinessOwnerHomeScreen">;

const BusinessOwnerHomeScreen: React.FC = () => {
  // Initialize navigation hook for screen transitions
  const navigation = useNavigation<NavProp>();
  
  // State to track if user has agreed to terms
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

  /**
   * handleSignUp
   * Shows a friendly alert if user hasn't agreed to terms
   * Otherwise proceeds to signup
   */
  const handleSignUp = () => {
    if (!agreedToTerms) {
      Alert.alert(
        'Terms Agreement Required',
        'Please read and agree to our Terms of Service and Privacy Policy by clicking the check box to continue with sign up.',
        [
          {
            text: 'View Terms',
            onPress: () => navigation.navigate('TermsOfService'),
          },
          {
            text: 'View Privacy Policy',
            onPress: () => navigation.navigate('PrivacyPolicy'),
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
      return;
    }
    
    // User has agreed to terms, proceed to signup
    navigation.navigate("SignUpFormBusinessOwners", { user_id: 0 });
  };

  return (
    <View style={styles.contentContainer}>
      {/* Cancel Button - Top Right Corner */}
      {/* Allows users to exit and return to main navigation */}
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      {/* Main Title */}
      <Text style={styles.title}>Welcome to GoZipMarket </Text>

      {/* Terms Agreement Checkbox */}
      <View style={styles.termsCheckboxContainer}>
        <Checkbox
          value={agreedToTerms}
          onValueChange={setAgreedToTerms}
          color={agreedToTerms ? 'green' : undefined}
          style={styles.checkbox}
        />
        <View style={styles.termsTextContainer}>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text 
              style={styles.link}
              onPress={() => navigation.navigate('TermsOfService')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text 
              style={styles.link}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </View>

      {/* New Business Owner Button */}
      {/* Always clickable, but shows alert if terms not agreed */}
      <TouchableOpacity
        style={[
          styles.button,
          !agreedToTerms && styles.disabledButton
        ]}
        onPress={handleSignUp}
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
        <Text style={[styles.subtitle, { fontWeight: 'bold' }]}>
        For questions or support, please contact us at support@gozipmarket.com
      </Text>     
    </View>
  );
};

// Stylesheet for component styling
const styles = createResponsiveStyles({
  // Main container - centers content vertically and horizontally
  contentContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20 
  },
  // Welcome title styling
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 30
  },
  // Terms checkbox container
  termsCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 20,
    maxWidth: '90%',
  },
  // Checkbox styling
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  // Container for terms text (to allow wrapping)
  termsTextContainer: {
    flex: 1,
  },
  // Legal agreement text styling
  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Clickable link styling for Terms and Privacy Policy
  link: {
    color: 'green',
    textDecorationLine: 'underline',
    fontWeight: '600',
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
  // Disabled button styling (when terms not agreed)
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
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