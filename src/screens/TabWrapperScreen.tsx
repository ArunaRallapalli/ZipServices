/**
 * BottomTabs Component - Main Tab Navigation for Business Owners
 * UPDATED: Post tab now shows landing page with 2 button options
 * 
 * Overview:
 * This component creates the bottom tab navigation bar that appears at the bottom of the screen
 * after a business owner successfully logs in. It serves as the main navigation hub for the app.
 * 
 * Features:
 * -changed on jan 7th 2026 
 * 5 Tab Screens: Home, Post, Listings, Messages, Profile
 * - Real-time unread message badge on Messages tab (polls every 30 seconds)
 * - Dynamic screen rendering based on user authentication status (business_owner vs guest)
 * - Initial navigation support via route params
 * - Custom styled icons with active/inactive states
 * - Post tab includes stack navigator with 3 screens:
 *   1. PostLandingScreen (default) - Shows 2 button options
 *   2. PostServiceForm - For posting service offers
 *   3. RequestServiceCategory - For requesting new categories
 * 
 * Backend APIs Used:
 * - GET /messages/business-owner/:user_id - Fetches unread message count
 */

import React, { useState, useEffect } from 'react';
import { createResponsiveStyles } from '../Utils/globalStyles';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { View, Text, StyleSheet } from "react-native";
import { RootStackParamList, TabParamList } from "../navigation/MainStackNavigator";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Ionicons, AntDesign } from '@expo/vector-icons';
//import API_URL from "../config/apiConfig";
import api from '../api' // ADDED: January 5, 2026
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// Import screen components for each tab
import ListingsScreen from "./ListingsScreen";
import BusinessOwnerProfileScreen from './Profile/BusinessOwnerProfileScreen';
import SearchResultsScreen from "./SearchresultsScreen";
import PostLandingScreen from "./PostLandingScreen"; // NEW - Landing page with 2 buttons
import PostServiceScreen from "./PostServiceScreen"; // Form for posting services
import RequestServiceCategoryScreen from "./Requestservicecategoryscreen"; // Form for requesting categories
import BusinessOwnerChatScreen from "./BusinessOwnerChatScreen";
import { useAuth } from "../contexts/AuthContext";
import { MessagesPlaceholder, ProfilePlaceholder, PostPlaceholder } from "./auth/SignInPlaceholderScreen";

// Create navigators with type safety
const Tab = createBottomTabNavigator<TabParamList>();
const PostStack = createStackNavigator();

// Type definition for route props
type TabWrapperRouteProp = RouteProp<RootStackParamList, 'TabWrapperScreen'>;

/**
 * PostStackNavigator - Stack navigator for Post-related screens
 * 3 screens:
 * 1. PostLanding (default) - Shows 2 buttons: Post Service or Request Category
 * 2. PostServiceForm - The actual form to post a service
 * 3. RequestServiceCategory - The form to request a new category
 */
const PostStackNavigator: React.FC = () => {
  return (
    <PostStack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Landing Screen - Shows 2 button options */}
      <PostStack.Screen 
        name="PostLanding" 
        component={PostLandingScreen}
        options={{ headerTitle: 'Post Services' }}
      />
      
      {/* Service Posting Form */}
      <PostStack.Screen 
        name="PostServiceForm" 
        component={PostServiceScreen}
        options={{
          headerShown: true,
          headerTitle: 'Post a Service',
          headerStyle: {
            backgroundColor: '#4A90E2',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      
      {/* Category Request Form */}
      <PostStack.Screen 
        name="RequestServiceCategory" 
        component={RequestServiceCategoryScreen}
        options={{
          headerShown: true,
          headerTitle: 'Request New Category',
          headerStyle: {
            backgroundColor: '#FF6B35',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </PostStack.Navigator>
  );
};

const BottomTabs: React.FC = () => {
  // Get user information from auth context
  const { userType, userInfo } = useAuth();
  // DEBUG: Log stored access token
  useEffect(() => {
    const logStoredToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      console.log('💾 Stored access_token in Tabwrapper:', storedToken);
    };
    logStoredToken();
  }, []);
  // Local state for unread message count (displayed as badge)
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Navigation hooks
  const route = useRoute<TabWrapperRouteProp>();
  const navigation = useNavigation();

  // Handle initial screen navigation when component receives route params
  useEffect(() => {
    if (route.params?.screen) {
      requestAnimationFrame(() => {
        const tabNav = navigation as any;
        if (tabNav && typeof tabNav.navigate === 'function') {
          try {
            tabNav.navigate(route.params.screen, route.params.params);
          } catch (error) {
            console.log('Navigation error caught:', error);
          }
        }
      });
    }
  }, [route.params?.screen]);
 
  /**
   * Fetch unread message count from backend
   * Only runs when user is signed in (has user_id)
   * Polls every 30 seconds to keep count updated
   */
  useEffect(() => {
    // Early return: Don't set up polling if no user is signed in
    if (!userInfo?.user_id) {
      console.log('[BottomTabs] No user signed in, skipping unread count setup');
      setUnreadCount(0); // Reset count when no user
      return;
    }
    
    const fetchUnreadCount = async () => {
  try {
    if (!userInfo?.user_id) return;

    // Use api.get() — no need for AsyncStorage or manual token
    const endpoint = `/messages/business-owner/${userInfo.user_id}`;
    const res = await api.get(endpoint); // ✅ api adds Authorization header automatically

    console.log('[BottomTabs] Unread messages raw data:', res.data);

    // Count only unread messages for this user
    const unreadMessages = Array.isArray(res.data)
      ? res.data.filter(
          (msg: any) =>
            Number(msg.receiver_id) === Number(userInfo.user_id) &&
            msg.is_read === false
        )
      : [];

    const count = unreadMessages.length;
    console.log('[BottomTabs] ✅ Unread message count:', count);
    setUnreadCount(count);
  } catch (error: any) {
    console.error('[BottomTabs] Error fetching unread count:', error.response?.status || error.message);
  }
};

    
    console.log('[BottomTabs] Setting up unread count polling for user:', userInfo.user_id);
    fetchUnreadCount(); // Initial fetch
    
    // Poll every 30 seconds
    const interval = setInterval(() => {
      console.log('[BottomTabs] Polling unread count...');
      fetchUnreadCount();
    }, 30000);
    
    return () => {
      console.log('[BottomTabs] Cleanup - clearing interval');
      clearInterval(interval);
    };
  }, [userInfo?.user_id]); // Only re-run when user_id changes
  
  // Conditionally select which screen components to use based on user authentication
  // Guests (not signed in) see placeholder screens that prompt them to sign in
  // Business owners (signed in) see the full functional screens
  const MessageScreenComponent = userType === "business_owner"
    ? BusinessOwnerChatScreen
    : MessagesPlaceholder;

  const ProfileScreenComponent = userType === "business_owner"
    ? BusinessOwnerProfileScreen
    : ProfilePlaceholder;

  // Post tab now uses stack navigator with landing page
  const PostScreenComponent = userType === "business_owner"
    ? PostStackNavigator
    : PostPlaceholder;

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconSize = 28;
          
          switch (route.name) {
            case 'Home':
              return <AntDesign name="home" size={iconSize} color={color} />;
            case 'Post':
              return <MaterialIcons name="post-add" size={iconSize} color={color} />;
            case 'Listings':
              return <Ionicons name="list" size={iconSize} color={color} />;
            case 'Messages':
              console.log('[BottomTabs] Rendering Messages icon, unreadCount:', unreadCount);
              return (
                <View>
                  <AntDesign name="message1" size={iconSize} color={color} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 9 ? '9+' : String(unreadCount)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            case 'Profile':
              return <MaterialIcons name="person" size={iconSize} color={color} />;
            default:
              return <Ionicons name="ellipse" size={iconSize} color={color} />;
          }
        },
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
          marginTop: 2,
          marginBottom: 6,
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          justifyContent: 'center',
        },
        headerShown: false,
      })}
      screenListeners={{
  tabPress: async () => {
    if (!userInfo?.user_id) return;

    try {
      // Use api.get() instead of fetch
      const endpoint = `/messages/business-owner/${userInfo.user_id}`;
      const res = await api.get(endpoint); // token handled internally by api client

      const data = res.data;
      const count = Array.isArray(data)
        ? data.filter(msg => msg.receiver_id === userInfo.user_id && msg.is_read === false).length
        : 0;

      setUnreadCount(count);
      console.log('[BottomTabs] ✅ Refreshed unread count on tabPress:', count);
    } catch (err: any) {
      console.error('[BottomTabs] Error refreshing unread count:', err.response?.status || err.message);
    }
  },
}}

    >
      {/* Home Tab - ✅ Added explicit tabBarLabel */}
      <Tab.Screen 
        name="Home" 
        component={SearchResultsScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ fontSize: 12, fontWeight: '800', color }}>
              Home
            </Text>
          )
        }}
        initialParams={{
          customerInfo: undefined,
          isGuest: false,
          preselectedCategory: ""
        }}
      />
      
      {/* Post Tab - ✅ Already has custom tabBarLabel */}
      <Tab.Screen 
        name="Post"
        component={PostScreenComponent}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ fontSize: 12, fontWeight: '800', color }}>
              Post/Request
            </Text>
          )
        }}
      />
      
      {/* Listings Tab - ✅ Added explicit tabBarLabel */}
      <Tab.Screen
        name="Listings"
        component={ListingsScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ fontSize: 12, fontWeight: '800', color }}>
              Listings
            </Text>
          )
        }}
      />
      
      {/* Messages Tab - ✅ Added explicit tabBarLabel */}
      <Tab.Screen 
        name="Messages"
        component={MessageScreenComponent}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ fontSize: 12, fontWeight: '800', color }}>
              Messages
            </Text>
          )
        }}
      />
      
      {/* Profile Tab - ✅ Added explicit tabBarLabel */}
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreenComponent}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ fontSize: 12, fontWeight: '800', color }}>
              Profile
            </Text>
          )
        }}
      />
   </Tab.Navigator>
  );
};

const styles = createResponsiveStyles({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default BottomTabs;