import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { UserProvider } from "../contexts/UserContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { useKeepAwake } from 'expo-keep-awake';

// Screen imports
import ListingsScreen from "../screens/ListingsScreen";
import SignUpFormBusinessOwners from "../screens/auth/SignUpFormBusinessOwners";
import SigninBusinessOwners from "../screens/auth/SigninBusinessOwners";
import ChatScreen from "../screens/ChatScreen";
import BusinessOwnerHomeScreen from "../screens/auth/BusinessOwnerHomeScreen";
import BusinessOwnerChatScreen from "../screens/BusinessOwnerChatScreen";
import BusinessOwnerProfileScreen from "../screens/Profile/BusinessOwnerProfileScreen";
import MessagesTab from "../screens/ChatMessagesTab";
import PostServiceScreen from "../screens/PostServiceScreen";
import TabWrapperScreen from "../screens/TabWrapperScreen";
import SignInPlaceholderScreen from "../screens/auth/SignInPlaceholderScreen";
import EditListing from "../screens/EditListing";

// Loading screen shown during authentication check
const LoadingScreen: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
    <ActivityIndicator size="large" color="#4A90E2" />
  </View>
);

// Customer/User info interface
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

// Tab Navigator screens (BottomTabs in TabWrapperScreen)
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

// Main Stack Navigator - All navigable screens
export type RootStackParamList = {
  // Main Entry Point
  TabWrapperScreen: {
    screen?: keyof TabParamList;
    params?: TabParamList[keyof TabParamList];
  };
  
  // Listings & Posts
  ListingsScreen: undefined;
  EditListing: { postId: number };
  PostServiceScreen: undefined;
  
  // Authentication
  SignUpFormBusinessOwners: { user_id: number };
  SigninBusinessOwners: undefined;
  SignInPlaceholderScreen: undefined;
  BusinessOwnerHomeScreen: undefined;
  
  // Chat/Messages
  ChatScreen: {
    otherUserId: number;
    otherUserName: string;
    currentUserId: number;
  };
  BusinessOwnerChatScreen: { 
    businessOwnerUserId: number; 
    business_name: string;
  };
  ChatMessagesTab: {
    currentUserId: number;
    userType: "customer" | "business_owner";
  };
  
  // Profile
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
};

const NavigationStack: React.FC = () => {
  const RootStack = createNativeStackNavigator<RootStackParamList>();
  const { loading } = useAuth();
  
  // Keep app awake during development
  useKeepAwake();

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
      {/* MAIN ENTRY POINT */}
      <RootStack.Screen 
        name="TabWrapperScreen" 
        component={TabWrapperScreen}
        options={{ gestureEnabled: false }}
      />
      
      {/* AUTHENTICATION SCREENS */}
      <RootStack.Group screenOptions={{ presentation: 'card', animation: 'slide_from_right' }}>
        <RootStack.Screen 
          name="SignUpFormBusinessOwners" 
          component={SignUpFormBusinessOwners}
          options={{ title: "Business Registration" }}
        />
        <RootStack.Screen 
          name="SignInPlaceholderScreen" 
          component={SignInPlaceholderScreen}
          options={{ headerShown: true, title: "Sign In" }}
        />
        <RootStack.Screen 
          name="SigninBusinessOwners" 
          component={SigninBusinessOwners}
          options={{ title: "Business Sign In" }}
        />
        <RootStack.Screen 
          name="BusinessOwnerHomeScreen" 
          component={BusinessOwnerHomeScreen}
        />
      </RootStack.Group>

      {/* CHAT SCREENS (Modal presentation) */}
      <RootStack.Group screenOptions={{ presentation: 'modal', headerShown: true, animation: 'slide_from_bottom' }}>
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
      <RootStack.Group screenOptions={{ headerShown: true, presentation: 'card' }}>
        <RootStack.Screen 
          name="BusinessOwnerProfileScreen" 
          component={BusinessOwnerProfileScreen}
          options={{ title: 'Business Profile', headerBackTitle: 'Back' }}
        />
      </RootStack.Group>

      {/* LISTINGS & SERVICE POSTS */}
      <RootStack.Group screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="ListingsScreen" component={ListingsScreen} />
        <RootStack.Screen name="EditListing" component={EditListing} />
        <RootStack.Screen name="PostServiceScreen" component={PostServiceScreen} />
      </RootStack.Group>
    </RootStack.Navigator>
  );
};

export default function MainStackNavigator() {
  return (
    <AuthProvider>
      <UserProvider>
        <NavigationStack />
      </UserProvider>
    </AuthProvider>
  );
}