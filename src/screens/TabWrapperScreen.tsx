import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Ionicons, FontAwesome, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';

// Import your screens
import ListingsScreen from "./ListingsScreen";
import BusinessOwnerProfileScreen from './Profile/BusinessOwnerProfileScreen';
import CustomerProfileScreen from './Profile/CustomerProfileScreen';
import SearchResultsScreen from "./SearchResultsScreen";
import BusinessOwnerHomeScreen from "./auth/BusinessOwnerHomeScreen";
import PostServiceScreen from "./PostServiceScreen";
import BusinessOwnerChatScreen from "./BusinessOwnerChatScreen";
import CustomerConversationsScreen from "./CustomerConversationsScreen";
import UserHomeScreen from './UserHomeScreen';
import { useAuth } from "../contexts/AuthContext";
import ZipserviceHomeScreenSelection from "../screens/auth/ZipserviceHomeScreenSelection";

type TabParamList = {
  Home: undefined;
  Post: undefined;
  Listings: undefined;
  Messages: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const BottomTabs: React.FC = () => {
  const { userType, userInfo } = useAuth();
  
  // Correctly assign message screens
// Correctly assign message screen based on userType
const MessageScreenComponent =
  userType === "customer"
    ? CustomerConversationsScreen
    : userType === "business_owner"
    ? BusinessOwnerChatScreen
    : ZipserviceHomeScreenSelection; // ✅ Fallback if not logged in

// Correctly assign profile screen based on userType
const ProfileScreenComponent =
  userType === "customer"
    ? CustomerProfileScreen
    : userType === "business_owner"
    ? BusinessOwnerProfileScreen
    : ZipserviceHomeScreenSelection; // ✅ Fallback if not logged in

  
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconSize = size || 24;
          
          switch (route.name) {
            case 'Home':
              return <AntDesign name="home" size={iconSize} color={color} />;
            case 'Post':
              return <MaterialIcons name="post-add" size={iconSize} color={color} />;
            case 'Listings':
              return <Ionicons name="list" size={iconSize} color={color} />;
            case 'Messages':
              return <AntDesign name="message1" size={iconSize} color={color} />;
            case 'Profile':
              return <MaterialIcons name="person" size={iconSize} color={color} />;
            default:
              return <Ionicons name="ellipse" size={iconSize} color={color} />;
          }
        },
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#A7CCF6',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: 65,
          paddingBottom: 10,
          paddingTop: 5,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          borderTopWidth: 1,
          borderTopColor: '#E1E5E9',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={SearchResultsScreen}
        options={{
          title: "Home"
        }} 
      />
      <Tab.Screen 
        name="Post"
        component={PostServiceScreen}
        options={{
          title: "Post"
        }}
      />
      <Tab.Screen
  name="Listings"
  component={ListingsScreen}
  options={{
    tabBarLabel: "Listings",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="list" size={size} color={color} />
    ),
  }}
/>

      <Tab.Screen 
        name="Messages"
        component={MessageScreenComponent}
        options={{
          title: "Messages"
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreenComponent}
        options={{
          title: "Profile"
        }} 
      />
   </Tab.Navigator>
  );
};

export default BottomTabs;