import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { UserProvider } from "../contexts/UserContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";

import { useKeepAwake } from 'expo-keep-awake';

// Import your screens
import ListingsScreen from "../screens/ListingsScreen";
import SearchResultsScreen from "../screens/Old_SearchResultsScreen"
import SignUpFormBusinessOwners from "../screens/auth/SignUpFormBusinessOwners";
import SigninBusinessOwners from "../screens/auth/SigninBusinessOwners";
import ChatScreen from "../screens/ChatScreen";
import BusinessOwnerHomeScreen from "../screens/auth/BusinessOwnerHomeScreen";
import BusinessOwnerChatScreen from "../screens/BusinessOwnerChatScreen";
import BusinessOwnerProfileScreen from "../screens/Profile/BusinessOwnerProfileScreen";
import PostServiceCategory from "../screens/PostServiceCategory";
import MessagesTab from "../screens/ChatMessagesTab";
import PostServiceScreen from "../screens/PostServiceScreen";
import TabWrapperScreen from "../screens/TabWrapperScreen";
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
    fromSignup?: boolean;
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
  SignUpFormBusinessOwners: { user_id: number };
  SigninBusinessOwners: undefined;
  SignInPlaceholderScreen: undefined;
  
  // Chat Screens (Modal-style)
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
  PostServiceScreen: undefined;
  PostServiceCategory: undefined;
  BusinessOwnerHomeScreen: undefined;
  
  // Utility Screens
  UserHomeScreen: undefined;
};

// Navigation Component
const NavigationStack: React.FC = () => {
  const RootStack = createNativeStackNavigator<RootStackParamList>();
  const { loading } = useAuth();
  
  // ✅ ADDED: Keep app awake during development to prevent Expo Go timeout
  useKeepAwake();

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
          name="SigninBusinessOwners" 
          component={SigninBusinessOwners}
          options={{ 
            headerShown: false,
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

      {/* UTILITY SCREENS */}
      <RootStack.Group screenOptions={{ headerShown: false }}>
        <RootStack.Screen 
          name="UserHomeScreen" 
          component={UserHomeScreen}
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