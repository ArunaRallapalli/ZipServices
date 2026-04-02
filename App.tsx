import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MainStackNavigator from "./src/navigation/MainStackNavigator";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store/store';

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
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={styles.container}>
          <ErrorBoundary>
            <NavigationContainer linking={linking} documentTitle={{ formatter: (options) => options?.title ?? 'GoZipMarket - Local Services Marketplace' }}>
              <MainStackNavigator />
            </NavigationContainer>
          </ErrorBoundary>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});