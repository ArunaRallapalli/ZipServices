/**
 * BottomTabs Component - Main Tab Navigation for Business Owners
 * 
 * Last Updated: February 5, 2026
 * Changes:
 * - Fixed API endpoints to include /api prefix
 * - Fixed code structure (removed misplaced useEffect)
 * - Fixed typo in console.log
 * - Cleaned up session expiration handling
 * 
 * Overview:
 * This component creates the bottom tab navigation bar that appears at the bottom of the screen
 * after a business owner successfully logs in. It serves as the main navigation hub for the app.
 * 
 * Features:
 * - 5 Tab Screens: Home, Post, Listings, Messages, Profile
 * - Real-time unread message badge on Messages tab (polls every 15 seconds)
 * - Dynamic screen rendering based on user authentication status
 * - Post tab includes stack navigator with 3 screens
 * 
 * Backend APIs Used:
 * - GET /api/messages/business-owner/:user_id - Fetches unread message count
 */

import React, { useState, useEffect } from 'react';
import { createResponsiveStyles } from '../Utils/globalStyles';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { View, Text } from "react-native";
import { RootStackParamList, TabParamList } from "../navigation/MainStackNavigator";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Ionicons, AntDesign } from '@expo/vector-icons';
import api from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// Import screen components for each tab
import ListingsScreen from "./ListingsScreen";
import BusinessOwnerProfileScreen from './Profile/BusinessOwnerProfileScreen';
import SearchResultsScreen from "./SearchResultsScreen";
import PostLandingScreen from "./PostLandingScreen";
import PostServiceScreen from "./PostServiceScreen";
import RequestServiceCategoryScreen from "./Requestservicecategoryscreen";
import BusinessOwnerChatScreen from "./BusinessOwnerChatScreen";
import { useAuth } from "../contexts/AuthContext";
import { MessagesPlaceholder, ProfilePlaceholder, PostPlaceholder } from "./auth/SignInPlaceholderScreen";
//import SettingsScreen from '../screens/SettingsScreen'
// Create navigators with type safety
const Tab = createBottomTabNavigator<TabParamList>();
const PostStack = createStackNavigator();

// Type definition for route props
type TabWrapperRouteProp = RouteProp<RootStackParamList, 'TabWrapperScreen'>;

/**
 * PostStackNavigator - Stack navigator for Post-related screens
 * 3 screens:
 * 1. PostLanding (default) - Shows 2 buttons
 * 2. PostServiceForm - Form to post a service
 * 3. RequestServiceCategory - Form to request a new category
 */
const PostStackNavigator: React.FC = () => {
  return (
    <PostStack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
      }}
    >
      <PostStack.Screen 
        name="PostLanding" 
        component={PostLandingScreen}
        options={{ headerTitle: 'Post Services' }}
      />
      
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
 const { userType, userInfo, loading } = useAuth();
  
  // Local state for unread message count (displayed as badge)
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Navigation hooks
  const route = useRoute<TabWrapperRouteProp>();
  const navigation = useNavigation();

  /* ================================================================
   * EFFECT 1: Debug - Log stored access token on mount
   * ================================================================ */
  useEffect(() => {
    const logStoredToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      console.log('💾 [BottomTabs] Stored access_token:', storedToken ? 'exists' : 'missing');
    };
    logStoredToken();
  }, []);

  /* ================================================================
   * EFFECT 2: Handle initial screen navigation from route params
   * ================================================================ */
  useEffect(() => {
    if (route.params?.screen) {
      requestAnimationFrame(() => {
        const tabNav = navigation as any;
        if (tabNav && typeof tabNav.navigate === 'function') {
          try {
            tabNav.navigate(route.params.screen, route.params.params);
          } catch (error) {
            console.log('[BottomTabs] Navigation error caught:', error);
          }
        }
      });
    }
  }, [route.params?.screen]);

  /* ================================================================
   * EFFECT 3: Check for session expiration on mount
   * ================================================================ */
  useEffect(() => {
    const checkSessionExpired = async () => {
      try {
        const expired = await AsyncStorage.getItem('sessionExpired');
        if (expired === 'true') {
          console.log('🔐 [BottomTabs] Session expired detected - redirecting to Home');
          
          // Clear the flag
          await AsyncStorage.removeItem('sessionExpired');
          
          // Navigate to Home tab
          const tabNav = navigation as any;
          if (tabNav && typeof tabNav.navigate === 'function') {
            tabNav.navigate('Home');
          }
        }
      } catch (error) {
        console.error('[BottomTabs] Error checking session expiration:', error);
      }
    };
    
    checkSessionExpired();
  }, []);
 
  /* ================================================================
   * EFFECT 4: Fetch and poll unread message count
   * Only runs when user is signed in (has user_id)
   * Polls every 15 seconds to keep count updated
   * ================================================================ */
  useEffect(() => {
    // Early return: Don't set up polling if no user is signed in
    if (!userInfo?.user_id) {
      console.log('[BottomTabs] No user signed in, skipping unread count setup');
      setUnreadCount(0);
      return;
    }
    
    const fetchUnreadCount = async () => {
      try {
        if (!userInfo?.user_id) return;

        // ✅ FIXED: Added /api prefix
        const endpoint = `/messages/business-owner/${userInfo.user_id}`;
        const messages = await api.get(endpoint);

        console.log('[BottomTabs] Unread messages raw data:', messages);

        // Count only unread messages for this user
        const unreadMessages = Array.isArray(messages)
          ? messages.filter(
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
        // Don't set count to 0 on error - keep previous value
      }
    };
    
    console.log('[BottomTabs] Setting up unread count polling for user:', userInfo.user_id);
    fetchUnreadCount(); // Initial fetch
    
    // Poll every 15 seconds
    const interval = setInterval(() => {
      console.log('[BottomTabs] Polling unread count...');
      fetchUnreadCount();
    }, 15000);
    
    // Cleanup function
    return () => {
      console.log('[BottomTabs] Cleanup - clearing interval');
      clearInterval(interval);
    };
  }, [userInfo?.user_id]); // Only re-run when user_id changes
  
  /* ================================================================
   * Screen Component Selection
   * Conditionally select which components to use based on auth status
   * ================================================================ */
 const isAuthenticated = !loading && userType === "business_owner" && !!userInfo?.user_id;

const MessageScreenComponent = isAuthenticated
  ? BusinessOwnerChatScreen
  : MessagesPlaceholder;

const ProfileScreenComponent = isAuthenticated
  ? BusinessOwnerProfileScreen
  : ProfilePlaceholder;

const PostScreenComponent = isAuthenticated
  ? PostStackNavigator
  : PostPlaceholder;

  /* ================================================================
   * Tab Navigator Render
   * ================================================================ */
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
  return <Ionicons name={focused ? "settings" : "settings-outline"} size={iconSize} color={color} />;

// Label
<Text style={{ fontSize: 12, fontWeight: '800', color }}>
  Settings
</Text>
  
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
          // Refresh unread count when Messages tab is pressed
          if (!userInfo?.user_id) return;

          try {
            // ✅ FIXED: Added /api prefix
            const endpoint = `/messages/business-owner/${userInfo.user_id}`;
            const messages = await api.get(endpoint);

            const count = Array.isArray(messages)
              ? messages.filter(
                  (msg: any) => 
                    Number(msg.receiver_id) === Number(userInfo.user_id) && 
                    msg.is_read === false
                ).length
              : 0;

            setUnreadCount(count);
            console.log('[BottomTabs] ✅ Refreshed unread count on tabPress:', count);
          } catch (err: any) {
            console.error('[BottomTabs] Error refreshing unread count:', err.response?.status || err.message);
          }
        },
      }}
    >
      {/* Home Tab */}
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
      
      {/* Post Tab */}
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
      
      {/* Listings Tab */}
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
      
      {/* Messages Tab */}
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
      
      {/* Profile Tab */}
     <Tab.Screen 
  name="Profile" 
  component={ProfileScreenComponent}
  options={{
    tabBarLabel: ({ color }) => (
      <Text style={{ fontSize: 12, fontWeight: '800', color }}>
        Settings  {/* ← CHANGE LABEL */}
      </Text>
    )
  }}
/>
    </Tab.Navigator>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */
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