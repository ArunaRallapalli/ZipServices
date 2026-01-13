import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MainStackNavigator from "./src/navigation/MainStackNavigator";

// Linking configuration for deep linking and web URLs
//Deep linking means instead of just launching the app, it “navigates” 
// directly to a particular screen with specific data.
const linking = {
  prefixes: ['http://localhost:8081', 'https://gozipmarket.com'],
  config: {
    screens: {
      TabWrapperScreen: '',
      ResetPassword: 'reset-password',
      VerifyEmail: 'verify-email',  // ← Add this
      SigninBusinessOwners: 'signin',
      SignUpFormBusinessOwners: 'signup',
      ForgotPasswordBusinessOwner: 'forgot-password',
      TermsOfService: 'terms',
      PrivacyPolicy: 'privacy',
    },
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer linking={linking}>
        <MainStackNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});