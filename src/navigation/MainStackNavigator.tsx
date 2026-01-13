/**
 * MainStackNavigator.tsx
 * 
 * OVERVIEW:
 * This is the root navigation file for the entire application. It sets up:
 * 1. Global context providers (AuthProvider, UserProvider)
 * 2. The main navigation stack with all app screens
 * 3. Authentication flow and screen organization
 * 4. Loading states during authentication checks
 * 
 * ARCHITECTURE:
 * - MainStackNavigator (exported): Wraps everything with context providers
 * - NavigationStack (internal): Manages the navigation stack and screen routing
 * - LoadingScreen: Shown while checking authentication status
 * 
 * SCREEN GROUPS:
 * 1. TabWrapperScreen - Main entry point with bottom tabs
 * 2. Authentication Screens - Sign up, sign in, business owner home
 * 3. Chat Screens - Customer and business owner messaging (modal presentation)
 * 4. Profile Screens - Business owner profile views
 * 5. Listings & Service Posts - Service management screens
 * 
 * NAVIGATION FLOW:
 * App Launch → TabWrapperScreen (default)
 *   ├─→ Guest users see placeholder screens
 *   └─→ Authenticated users see full functionality
 * 
 * CONTEXT PROVIDERS:
 * - AuthProvider: Manages authentication state, token storage, sign in/out
 * - UserProvider: Manages user profile data and preferences
 * 
 * TYPE SAFETY:
 * - RootStackParamList: Type definitions for all navigable screens and their params
 * - TabParamList: Type definitions for bottom tab screens
 * - CustomerInfo: Interface for user/customer data structure
 */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { UserProvider } from "../contexts/UserContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { useKeepAwake } from 'expo-keep-awake';
import { Platform } from "react-native";
import { WebAlert } from "../components/WebAlert"
import { setWebAlertHandler } from "../Utils/Alert";
import CalendarScreen from '../screens/CalendarScreen';

// Screen imports - All navigable screens in the app
import ListingsScreen from "../screens/ListingsScreen";
import SignUpFormBusinessOwners from "../screens/auth/SignUpFormBusinessOwners";
import SigninBusinessOwners from "../screens/auth/SigninBusinessOwners";
import ChatScreen from "../screens/ChatScreen";
import BusinessOwnerHomeScreen from "../screens/auth/BusinessOwnerHomeScreen";
import BusinessOwnerChatScreen from "../screens/BusinessOwnerChatScreen";
import BusinessOwnerProfileScreen from "../screens/Profile/BusinessOwnerProfileScreen";
import PostServiceScreen from "../screens/PostServiceScreen";
import TabWrapperScreen from "../screens/TabWrapperScreen";
import SignInPlaceholderScreen from "../screens/auth/SignInPlaceholderScreen";
import EditListing from "../screens/EditListing";
import RequestServiceCategoryScreen from "../screens/Requestservicecategoryscreen";
// Add to imports section
import TermsOfServiceScreen from "../screens/TermsOfServiceScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';

/**
 * LoadingScreen Component
 * 
 * Displayed during the initial authentication check on app launch.
 * Shows a centered spinner while AuthContext verifies token validity
 * and loads user information from AsyncStorage.
 * 
 * Rendered when: loading === true in AuthContext
 * Duration: Until auth check completes (typically <1 second)
 */
const LoadingScreen: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
    <ActivityIndicator size="large" color="#4A90E2" />
  </View>
);

/**
 * CustomerInfo Interface
 * 
 * Defines the structure for user/customer data throughout the app.
 * Used for both customers and business owners (despite the name).
 * 
 * Properties:
 * - user_id: Unique identifier from database
 * - user_type: Determines app behavior and screen access
 * - full_name: Display name for customers
 * - phone_number, zip_code, city, state: Contact/location info
 * - email: User's email address
 */
export interface CustomerInfo {
  user_id: number;
  user_type?: 'customer' | 'business_owner';
  full_name?: string;
  phone_number?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  email?: string;
}

/**
 * TabParamList Type
 * 
 * Type definitions for the bottom tab navigator screens in TabWrapperScreen.
 * Ensures type-safe navigation and parameter passing between tab screens.
 * 
 * Tabs:
 * - Home: Search/browse services with optional filters
 * - Post: Create service posts or request new categories
 * - Listings: View/manage posted services
 * - Messages: Chat interface
 * - Profile: User/business profile management
 */
export type TabParamList = {
  Home: {
    customerInfo?: CustomerInfo;      // User data for personalization
    isGuest?: boolean;                // Whether user is logged in
    preselectedCategory?: string;     // Auto-select category on load
    fromSignup?: boolean;             // Track if navigating from signup
  };
  Post: undefined;
  Listings: undefined;
  Messages: undefined;
  Profile: undefined;
};

/**
 * RootStackParamList Type
 * 
 * Complete type definition for all navigable screens in the app.
 * Provides compile-time type checking for navigation.navigate() calls.
 * Grouped by functionality for better organization.
 * 
 * Usage: navigation.navigate('ScreenName', { param1: value1 })
 */
export type RootStackParamList = {
  // Main Entry Point
  TabWrapperScreen: {
    screen?: keyof TabParamList;                    // Optional: Navigate to specific tab
    params?: TabParamList[keyof TabParamList];      // Optional: Pass params to tab
  };
  
  // Listings & Posts - Service management
  ListingsScreen: undefined;  // View all user's posted services
   CalendarScreen: undefined;                      
  EditListing: { postId: number };                  // Edit existing service post
  PostServiceScreen: undefined;                     // Create new service post
  RequestServiceCategoryScreen: undefined;          // Request new service category
  
  // Authentication - User sign up/sign in flows
  SignUpFormBusinessOwners: { user_id: number };    // Business owner registration
  SigninBusinessOwners: undefined;                  // Business owner login
  SignInPlaceholderScreen: undefined;               // Generic sign-in screen
  BusinessOwnerHomeScreen: undefined;               // Business owner landing page
  TermsOfService: {
    fromSignup?: boolean;
    requireAcceptance?: boolean;
  };
  PrivacyPolicy: {
    fromSignup?: boolean;
    requireAcceptance?: boolean;
  };
  
  // Chat/Messages - Communication between users and businesses
  ChatScreen: {
    otherUserId: number;                            // ID of user you're chatting with
    otherUserName: string;                          // Display name for header
    currentUserId: number;                          // Current user's ID
  };
  BusinessOwnerChatScreen: { 
    businessOwnerUserId: number;                    // Business owner's user ID
    business_name: string;                          // Business name for header
  };
  
  // Profile - User and business profile screens
  BusinessOwnerProfileScreen: {
    user_id: number;
    email: string;
    user_type: "customer" | "business_owner";
    created_at: string;
    updated_at: string;
    business_id: number;
    business_name: string;
    service_category: string;
    description: string;
    phone_number: string;
    zip_code: string;
    service_radius_miles: number;
    street: string;
    city: string;
    state: string;
  };
  ForgotPasswordBusinessOwner: undefined;
  ResetPassword: { token?: string; email?: string };
  VerifyEmail: { token?: string; email?: string };
};

/**
 * NavigationStack Component
 * 
 * Internal component that manages the actual navigation stack.
 * Consumes AuthContext to check authentication state and show loading screen.
 * 
 * FEATURES:
 * - Dynamic screen rendering based on auth state
 * - Organized screen groups with custom animations
 * - Modal presentations for chat screens
 * - Gesture controls and transitions
 * 
 * DEPENDENCIES:
 * - Must be wrapped by AuthProvider (provided by MainStackNavigator)
 * - Uses useAuth() hook to access authentication state
 * from below
 */

// Inside NavigationStack component, add a new group:


const NavigationStack: React.FC = () => {
  const RootStack = createNativeStackNavigator<RootStackParamList>();
  const { loading } = useAuth();
  
  // WebAlert state for web platform
  const [alertConfig, setAlertConfig] = React.useState<any>(null);
  
  // Set up web alert handler on mount
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      setWebAlertHandler((config) => {
            console.log('📬 MainStackNavigator received alert config:', config);
        setAlertConfig(config);
      });
    }
  }, []);
  
  useKeepAwake();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <RootStack.Navigator
        id={undefined}
        initialRouteName="TabWrapperScreen"
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#fff' }
        }}

      >
        {/* All your existing screens stay exactly the same */}
        <RootStack.Screen 
          name="TabWrapperScreen" 
          component={TabWrapperScreen}
          options={{ gestureEnabled: false }}
        />
        
        <RootStack.Group screenOptions={{ presentation: 'card', animation: 'slide_from_right' }}>
          <RootStack.Screen 
            name="SignUpFormBusinessOwners" 
            component={SignUpFormBusinessOwners}
            options={{ headerTitle: 'Sign Up' }}
          />
          <RootStack.Screen 
            name="SignInPlaceholderScreen" 
            component={SignInPlaceholderScreen}
            options={{ headerShown: true, headerTitle: "Sign In" }}
          />
          <RootStack.Screen 
            name="SigninBusinessOwners" 
            component={SigninBusinessOwners}
            options={{ headerTitle: 'Sign In' }}
          />
          <RootStack.Screen 
            name="BusinessOwnerHomeScreen" 
            component={BusinessOwnerHomeScreen}
            options={{ headerTitle: 'Welcome' }}
          />
        </RootStack.Group>
<RootStack.Group screenOptions={{ 
    headerShown: true, 
    presentation: 'card',
    animation: 'slide_from_right' 
  }}>
    <RootStack.Screen 
      name="TermsOfService" 
      component={TermsOfServiceScreen}
      options={{ 
        headerTitle: 'Terms of Service',
        headerBackTitle: 'Back'
      }}
    />
    <RootStack.Screen 
      name="PrivacyPolicy" 
      component={PrivacyPolicyScreen}
      options={{ 
        headerTitle: 'Privacy Policy',
        headerBackTitle: 'Back'
      }}
    />
    <RootStack.Screen
  name="ResetPassword"
  component={ResetPasswordScreen}
  options={{ headerShown: false }}
/>
<RootStack.Screen
      name="VerifyEmail"
      component={VerifyEmailScreen}
      options={{ headerShown: false }}
    />
  </RootStack.Group>


        <RootStack.Group screenOptions={{ presentation: 'modal', headerShown: true, animation: 'slide_from_bottom' }}>
          <RootStack.Screen 
            name="ChatScreen" 
            component={ChatScreen}
            options={({ route }) => ({
              headerTitle: route.params?.otherUserName || 'Chat',
              headerTitleStyle: { fontSize: 16 }
            })}
          />
          <RootStack.Screen 
            name="BusinessOwnerChatScreen" 
            component={BusinessOwnerChatScreen}
            options={{ headerTitle: 'Business Chat' }}
          />
        </RootStack.Group>

        <RootStack.Group screenOptions={{ headerShown: true, presentation: 'card' }}>
          <RootStack.Screen 
            name="BusinessOwnerProfileScreen" 
            component={BusinessOwnerProfileScreen}
            options={{ headerTitle: 'Business Profile', headerBackTitle: 'Back' }}
          />
        </RootStack.Group>

        <RootStack.Group screenOptions={{ headerShown: false }}>
          <RootStack.Screen 
            name="ListingsScreen" 
            component={ListingsScreen}
            options={{ headerTitle: 'My Listings' }}
          />
          <RootStack.Screen 
  name="CalendarScreen" 
  component={CalendarScreen}
  options={{ headerShown: false }}
/>
          <RootStack.Screen 
            name="EditListing" 
            component={EditListing}
            options={{ headerTitle: 'Edit Listing' }}
          />
          <RootStack.Screen 
            name="PostServiceScreen" 
            component={PostServiceScreen}
            options={{ headerTitle: 'Post Service' }}
          />
          <RootStack.Screen 
            name="RequestServiceCategoryScreen" 
            component={RequestServiceCategoryScreen}
            options={{
              headerShown: false,
              headerTitle: 'Request New Category',
              headerStyle: {
                backgroundColor: '#4A90E2',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
        </RootStack.Group>
      </RootStack.Navigator>

      {/* WebAlert Modal - only renders on web */}
      {Platform.OS === 'web' && alertConfig && (
        <WebAlert
          visible={!!alertConfig}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(null)}
        />
      )}
    </>
  );
};
/**
 * MainStackNavigator Component (Default Export)
 * 
 * The root component exported from this file.
 * Wraps the entire navigation stack with context providers.
 * 
 * CRITICAL: This wrapper is essential because:
 * 1. NavigationStack uses useAuth() which requires AuthProvider
 * 2. All child screens need access to auth and user contexts
 * 3. Providers must wrap consumers (React rule)
 * 
 * PROVIDER ORDER:
 * AuthProvider (outer) → Manages authentication, tokens, sign in/out
 *   └─ UserProvider (middle) → Manages user profile and preferences
 *      └─ NavigationStack (inner) → Can access both contexts
 * 
 * This component is imported in App.tsx and wraps the entire app.
 */
export default function MainStackNavigator() {
  return (
    <AuthProvider>
      <UserProvider>
        <NavigationStack />
      </UserProvider>
    </AuthProvider>
  );
}