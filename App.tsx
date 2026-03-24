import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MainStackNavigator from "./src/navigation/MainStackNavigator";
import ErrorBoundary from "./src/components/ErrorBoundary";  // ← ADD THIS IMPORT

// Linking configuration for deep linking and web URLs
//Deep linking means instead of just launching the app, it "navigates" 
// directly to a particular screen with specific data.
const linking = {
  prefixes: ['http://localhost:8081', 'https://gozipmarket.com'],
  config: {
    screens: {
      TabWrapperScreen: '',
      ResetPassword: 'reset-password',
      VerifyEmail: 'verify-email',
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
      <ErrorBoundary>  {/* ← ADD THIS WRAPPER */}
        <NavigationContainer linking={linking} documentTitle={{ formatter: (options, route) => options?.title ?? 'GoZipMarket - Local Services Marketplace' }}>
          <MainStackNavigator />
        </NavigationContainer>
      </ErrorBoundary>  {/* ← CLOSE THE WRAPPER */}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});