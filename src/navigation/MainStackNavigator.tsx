import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { UserProvider } from "../contexts/UserContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";

// Import your screens
import ListingsScreen from "../screens/ListingsScreen";
import SearchResultsScreen from "../screens/SearchResultsScreen"
import ZipserviceHomeScreenSelection from "../screens/auth/ZipserviceHomeScreenSelection";
import SignUpFormCustomers from "../screens/auth/SignUpFormCustomers";
import SignUpFormBusinessOwners from "../screens/auth/SignUpFormBusinessOwners";
import SigninCustomer from "../screens/auth/SigninCustomer";
import SigninBusinessOwners from "../screens/auth/SigninBusinessOwners";
import ChatScreen from "../screens/ChatScreen";
import CustomerDasboardScreen from "../screens/CustomerDasboardScreen";
import BusinessOwnerHomeScreen from "../screens/auth/BusinessOwnerHomeScreen";
import CustomerHomeScreen from "../screens/CustomerHomeScreen";
import CustomerChatScreen from "../screens/CustomerChatScreen";
import BusinessOwnerChatScreen from "../screens/BusinessOwnerChatScreen";
import CustomerConversationsScreen from "../screens/CustomerConversationsScreen";
import CustomerProfileScreen from "../screens/Profile/CustomerProfileScreen";
import BusinessOwnerProfileScreen from "../screens/Profile/BusinessOwnerProfileScreen";
import PostServiceCategory from "../screens/PostServiceCategory";
import MessagesTab from "../screens/ChatMessagesTab";
import RoleSwitcher from "../components/RoleSwitcher";
import PostServiceScreen from "../screens/PostServiceScreen";
import TabWrapperScreen from "../screens/TabWrapperScreen";
import UnifiedUserSignupScreen from "../screens/auth/UnifiedUserSignupScreen";
import UserLoginScreen from "../screens/auth/UnifiedUserLoginScreen";
import UserHomeScreen from "../screens/UserHomeScreen";
import SignInPlaceholderScreen from"../screens/auth/SignInPlaceholderScreen";
import EditListing from "../screens/EditListing"

// Loading Component
const LoadingScreen: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
    <ActivityIndicator size="large" color="#4A90E2" />
  </View>
);

// Customer Info Type (shared across the app)
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

// Tab Navigator Param List
// This defines the tabs in your TabWrapperScreen (BottomTabs)
export type TabParamList = {
  Home: {
    customerInfo?: CustomerInfo;
    isGuest?: boolean;
    preselectedCategory?: string;
    fromSignup?: boolean; // Add this line
  };
  Post: undefined;
  Listings: undefined;
  Messages: undefined;
  Profile: undefined;
};

// Main Stack Navigator Param List
// This includes all screens that can be navigated to from anywhere in the app
export type RootStackParamList = {
  // Main Tab Screen (Entry Point)
  TabWrapperScreen: {
    screen?: keyof TabParamList;
    params?: TabParamList[keyof TabParamList];
  };
  
  ListingsScreen: undefined;
  EditListing: { postId: number; };
  
  // Authentication Flow
  ZipserviceHomeScreenSelection: undefined;
  UnifiedUserSignupScreen: undefined;
  UnifiedUserLoginScreen: undefined;
  SignUpFormCustomers: { user_id: number } | undefined;
  SignUpFormBusinessOwners: { user_id: number };
  SigninCustomer: { user_id: number };
  SigninBusinessOwners: undefined;
  SignInPlaceholderScreen: undefined;
  
  // Chat Screens (Modal-style)
  CustomerChatScreen: {
    businessOwnerId: number;
    businessName: string;
    customerId: number;
    customerInfo?: CustomerInfo;
  };
  ChatScreen: {
    otherUserId: number;
    otherUserName: string;
    currentUserId: number;
  };
  BusinessOwnerChatScreen: { 
    businessOwnerUserId: number; 
    business_name: string;
  };
  ChatWithCustomer: { 
    customerId: number; 
    customerName: string;
  };
  ChatMessagesTab: {
    currentUserId: number;
    userType: "customer" | "business_owner";
  };
  
  // Profile Screens
  CustomerProfileScreen: { customer_id: number };
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
  
  // Service/Business Screens
 // Service/Business Screens
PostServiceScreen: undefined;  // ✅ Keep as is - no params needed
PostServiceCategory: undefined;  // ✅ CHANGE: Remove user_id requirement
BusinessOwnerHomeScreen: undefined;  // ✅ Correct - no params needed
  
  // Customer Screens
  CustomerHomeScreen: { user_id: number };
  CustomerConversationsScreen: {
    customerId: number;
    customerInfo?: {
      full_name: string;
      phone_number: string;
      zip_code: string;
      user_id: number;
    };
  };
  CustomerDashboard: {
    customerInfo: {
      full_name: string;
      phone_number: string;
      zip_code: string;
      user_id: number;
    };
  };
  
  // Utility Screens
  UserHomeScreen: undefined;
  RoleSwitcher: undefined;
};

// Navigation Component
const NavigationStack: React.FC = () => {
  const RootStack = createNativeStackNavigator<RootStackParamList>();
  const { loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <RootStack.Navigator
      id={undefined}
      initialRouteName="TabWrapperScreen"
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#fff' }
      }}
    >
      {/* MAIN TAB SCREEN - Entry Point */}
      <RootStack.Screen 
        name="TabWrapperScreen" 
        component={TabWrapperScreen}
        options={{
          gestureEnabled: false, // Prevent swipe back from main screen
        }}
      />
      
      {/* AUTHENTICATION FLOW */}
      <RootStack.Group 
        screenOptions={{ 
          presentation: 'card',
          animation: 'slide_from_right'
        }}
      >
        <RootStack.Screen 
          name="ZipserviceHomeScreenSelection" 
          component={ZipserviceHomeScreenSelection}
          options={{ title: "Welcome" }}

          />
        <RootStack.Screen 
          name="UnifiedUserSignupScreen" 
          component={UnifiedUserSignupScreen}
          options={{ 
            headerShown: true,
            title: "Sign Up"
          }}
        />
        <RootStack.Screen 
          name="UnifiedUserLoginScreen" 
          component={UserLoginScreen}
          options={{ 
            headerShown: true,
            title: "Sign In"
          }}
        />
        <RootStack.Screen 
          name="SignUpFormCustomers" 
          component={SignUpFormCustomers}
          options={{ 
            headerShown: true,
            title: "Customer Registration"
          }}
        />
        <RootStack.Screen 
          name="SignUpFormBusinessOwners" 
          component={SignUpFormBusinessOwners}
          options={{ 
            headerShown: false,
            title: "Business Registration"
          }}
        />
        <RootStack.Screen 
          name="SignInPlaceholderScreen" 
          component={SignInPlaceholderScreen}
          options={{ 
            headerShown: true,
            title: "Sign In"
          }}
        />
        <RootStack.Screen 
          name="SigninCustomer" 
          component={SigninCustomer}
          options={{ 
            headerShown: true,
            title: "Customer Sign In"
          }}
        />
        <RootStack.Screen 
          name="SigninBusinessOwners" 
          component={SigninBusinessOwners}
          options={{ 
            headerShown: true,
            title: "Business Sign In"
          }}
        />
      </RootStack.Group>

      {/* CHAT SCREENS - Modal Presentation */}
      <RootStack.Group 
        screenOptions={{ 
          presentation: 'modal',
          headerShown: true,
          animation: 'slide_from_bottom'
        }}
      >
        <RootStack.Screen 
          name="CustomerChatScreen" 
          component={CustomerChatScreen}
          options={({ route }) => ({
            title: route.params?.businessName || 'Chat',
            headerTitleStyle: { fontSize: 16 }
          })}
        />
        <RootStack.Screen 
          name="ChatScreen" 
          component={ChatScreen}
          options={({ route }) => ({
            title: route.params?.otherUserName || 'Chat',
            headerTitleStyle: { fontSize: 16 }
          })}
        />
        <RootStack.Screen 
          name="BusinessOwnerChatScreen" 
          component={BusinessOwnerChatScreen}
          options={{ title: 'Business Chat' }}
        />
        <RootStack.Screen 
          name="ChatMessagesTab" 
          component={MessagesTab}
          options={{ title: 'Messages' }}
        />
      </RootStack.Group>

      {/* PROFILE SCREENS */}
      <RootStack.Group 
        screenOptions={{ 
          headerShown: true,
          presentation: 'card'
        }}
      >
        <RootStack.Screen 
          name="CustomerProfileScreen" 
          component={CustomerProfileScreen}
          options={{ 
            title: 'My Profile',
            headerBackTitle: 'Back'
          }}
        />
        <RootStack.Screen 
          name="BusinessOwnerProfileScreen" 
          component={BusinessOwnerProfileScreen}
          options={{ 
            title: 'Business Profile',
            headerBackTitle: 'Back'
          }}
        />
      </RootStack.Group>

      {/* SERVICE/BUSINESS SCREENS */}
      <RootStack.Group screenOptions={{ headerShown: false }}>
        <RootStack.Screen 
          name="PostServiceScreen" 
          component={PostServiceScreen}
        />
        <RootStack.Screen 
          name="PostServiceCategory" 
          component={PostServiceCategory}
        />
        <RootStack.Screen 
          name="BusinessOwnerHomeScreen" 
          component={BusinessOwnerHomeScreen}
        />
        <RootStack.Screen 
          name="ListingsScreen" 
          component={ListingsScreen}
        />
        <RootStack.Screen 
          name="EditListing" 
          component={EditListing}
        />
      </RootStack.Group>

      {/* CUSTOMER SCREENS */}
      <RootStack.Group screenOptions={{ headerShown: true }}>
        <RootStack.Screen 
          name="CustomerHomeScreen" 
          component={CustomerHomeScreen}
          options={{ title: 'Customer Home' }}
        />
        <RootStack.Screen
          name="CustomerConversationsScreen"
          component={CustomerConversationsScreen}
          options={{ title: "My Conversations" }}
        />
        <RootStack.Screen
          name="CustomerDashboard"
          component={CustomerDasboardScreen}
          options={{ title: "Dashboard" }}
        />
      </RootStack.Group>

      {/* UTILITY SCREENS */}
      <RootStack.Group screenOptions={{ headerShown: false }}>
        <RootStack.Screen 
          name="UserHomeScreen" 
          component={UserHomeScreen}
        />
        <RootStack.Screen 
          name="RoleSwitcher" 
          component={RoleSwitcher}
        />
      </RootStack.Group>
    </RootStack.Navigator>
  );
};

// Main Navigator Component
export default function MainStackNavigator() {
  return (
    <AuthProvider>
      <UserProvider>
        <NavigationStack />
      </UserProvider>
    </AuthProvider>
  );
}