/**
 * BottomTabs Component - Main Tab Navigation for Business Owners
 * 
 * Overview:
 * This component creates the bottom tab navigation bar that appears at the bottom of the screen
 * after a business owner successfully logs in. It serves as the main navigation hub for the app.
 * 
 * Features:
 * - 5 Tab Screens: Home, Post, Listings, Messages, Profile
 * - Real-time unread message badge on Messages tab (polls every 30 seconds)
 * - Dynamic screen rendering based on user authentication status (business_owner vs guest)
 * - Initial navigation support via route params
 * - Custom styled icons with active/inactive states
 * 
 * Backend APIs Used:
 * - GET /messages/business-owner/:user_id - Fetches unread message count
 * 
 * User Flow:
 * 1. User logs in via SignInBusinessOwners screen
 * 2. AuthContext stores user info and userType
 * 3. Navigation redirects to TabWrapperScreen
 * 4. This component renders appropriate tab screens based on userType
 * 5. Polls backend every 30 seconds to update unread message count
 */

import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { View, Text, StyleSheet } from "react-native";
import { RootStackParamList, TabParamList } from "../navigation/MainStackNavigator";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Ionicons, AntDesign } from '@expo/vector-icons';
import API_URL from "../config/apiConfig"; // Backend API URL configuration

// Import screen components for each tab
import ListingsScreen from "./ListingsScreen";
import BusinessOwnerProfileScreen from './Profile/BusinessOwnerProfileScreen';
import SearchResultsScreen from "./SearchresultsScreen";
import PostServiceScreen from "./PostServiceScreen";
import BusinessOwnerChatScreen from "./BusinessOwnerChatScreen";
import { useAuth } from "../contexts/AuthContext"; // Auth context for user info and authentication state
import { MessagesPlaceholder, ProfilePlaceholder, PostPlaceholder } from "./auth/SignInPlaceholderScreen";

// Create tab navigator with type safety
const Tab = createBottomTabNavigator<TabParamList>();

// Type definition for route props
type TabWrapperRouteProp = RouteProp<RootStackParamList, 'TabWrapperScreen'>;

const BottomTabs: React.FC = () => {
  // Get user information from auth context
  const { userType, userInfo } = useAuth();
  
  // Local state for unread message count (displayed as badge)
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Navigation hooks
  const route = useRoute<TabWrapperRouteProp>();
  const navigation = useNavigation();

  // Handle initial screen navigation when component receives route params
  // This allows deep linking or programmatic navigation to specific tabs
  useEffect(() => {
    if (route.params?.screen) {
      // Use requestAnimationFrame to ensure navigation happens after render
      requestAnimationFrame(() => {
        const tabNav = navigation as any;
        if (tabNav && typeof tabNav.navigate === 'function') {
          try {
            // Navigate to the specified screen with optional params
            tabNav.navigate(route.params.screen, route.params.params);
          } catch (error) {
            console.log('Navigation error caught:', error);
          }
        }
      });
    }
  }, [route.params?.screen]);
 
  // Fetch unread message count from backend
  // Runs on mount and every 30 seconds to keep count updated
  useEffect(() => {
    // Function to fetch unread message count from backend API
    const fetchUnreadCount = async () => {
      // Exit early if user is not logged in
      if (!userInfo?.user_id) {
        console.log('[BottomTabs] No user_id, skipping unread count fetch');
        console.log('[BottomTabs] userInfo:', userInfo);
        return;
      }
      
      try {
        // Construct API endpoint with user_id
        const endpoint = `${API_URL}/messages/business-owner/${userInfo.user_id}`;
        console.log('[BottomTabs] Fetching unread count from:', endpoint);
        console.log('[BottomTabs] Current user_id:', userInfo.user_id);
        
        // Make GET request to fetch all messages for this business owner
        const response = await fetch(endpoint);
        if (!response.ok) {
          console.log('[BottomTabs] Response not OK:', response.status);
          return;
        }
        
        // Parse JSON response
        const data = await response.json();
        console.log('[BottomTabs] Raw messages data:', data);
        console.log('[BottomTabs] Total messages received:', data.length);
        
        // Filter messages to count only unread messages where current user is the receiver
        const unreadMessages = Array.isArray(data) 
          ? data.filter((msg: any) => {
              // Check if current user is the receiver of this message
              const isReceiver = Number(msg.receiver_id) === Number(userInfo.user_id);
              // Check if message is unread
              const isUnread = msg.is_read === false;
              console.log(`[BottomTabs] Message ${msg.id}: receiver_id=${msg.receiver_id}, current_user=${userInfo.user_id}, is_read=${msg.is_read}, isReceiver=${isReceiver}, isUnread=${isUnread}`);
              // Only count messages where user is receiver AND message is unread
              return isReceiver && isUnread;
            })
          : [];
        
        // Get count of unread messages
        const count = unreadMessages.length;
        console.log(`[BottomTabs] ✅ Unread message count: ${count}`);
        console.log(`[BottomTabs] Unread messages:`, unreadMessages.map(m => ({id: m.id, text: m.message_text?.substring(0, 20)})));
        
        // Update state with new unread count (triggers re-render of badge)
        setUnreadCount(count);
        console.log(`[BottomTabs] State updated with count: ${count}`);
      } catch (error) {
        console.error('[BottomTabs] Error fetching unread count:', error);
      }
    };
    
    // Initial fetch when component mounts
    console.log('[BottomTabs] Initial fetch triggered');
    fetchUnreadCount();
    
    // Set up polling interval - fetch unread count every 30 seconds
    const interval = setInterval(() => {
      console.log('[BottomTabs] Polling unread count...');
      fetchUnreadCount();
    }, 30000); // 30000ms = 30 seconds
    
    // Cleanup function - clear interval when component unmounts
    return () => {
      console.log('[BottomTabs] Cleanup - clearing interval');
      clearInterval(interval);
    };
  }, [userInfo, userType]); // Re-run effect if user info or user type changes
  
  // Conditionally select which screen components to use based on user authentication
  // If user is authenticated business owner, show full features
  // Otherwise, show placeholder screens that prompt to sign in
  const MessageScreenComponent = userType === "business_owner"
    ? BusinessOwnerChatScreen
    : MessagesPlaceholder;

  const ProfileScreenComponent = userType === "business_owner"
    ? BusinessOwnerProfileScreen
    : ProfilePlaceholder;

  const PostScreenComponent = userType === "business_owner"
    ? PostServiceScreen
    : PostPlaceholder;

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        // Custom icon renderer for each tab
        tabBarIcon: ({ focused, color, size }) => {
          const iconSize = 28; // Fixed icon size for consistency
          
          // Return appropriate icon based on tab name
          switch (route.name) {
            case 'Home':
              return <AntDesign name="home" size={iconSize} color={color} />;
            case 'Post':
              return <MaterialIcons name="post-add" size={iconSize} color={color} />;
            case 'Listings':
              return <Ionicons name="list" size={iconSize} color={color} />;
            case 'Messages':
              // Messages tab has special badge overlay for unread count
              console.log('[BottomTabs] Rendering Messages icon, unreadCount:', unreadCount);
              return (
                <View>
                  {/* Base message icon */}
                  <AntDesign name="message1" size={iconSize} color={color} />
                  {/* Badge overlay showing unread count (only shown if count > 0) */}
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {/* Show "9+" if more than 9 unread messages */}
                        {unreadCount > 9 ? '9+' : unreadCount}
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
        // Color scheme for active/inactive tabs
        tabBarActiveTintColor: '#1E40AF',  // Bold dark blue for active tab
        tabBarInactiveTintColor: '#94A3B8',  // Light gray for inactive tabs
        // Tab bar container styling
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
          elevation: 12, // Android shadow
          shadowColor: '#000', // iOS shadow
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
        },
        // Tab label text styling
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',  // Extra bold
          marginTop: 2,
          marginBottom: 6,
          letterSpacing: 0.3,
        },
        // Individual tab item styling
        tabBarItemStyle: {
          paddingVertical: 0,
          justifyContent: 'center',
        },
        // Hide screen headers (tabs handle navigation)
        headerShown: false,
      })}
      // Screen listeners for tab press events
      screenListeners={{
        tabPress: () => {
          // Refresh unread count immediately when any tab is pressed
          // This ensures the badge is always up-to-date when user interacts with tabs
          if (userInfo?.user_id) {
            fetch(`${API_URL}/messages/business-owner/${userInfo.user_id}`)
              .then(res => res.json())
              .then((data: any[]) => {
                // Count unread messages
                const count = Array.isArray(data) 
                  ? data.filter((msg: any) => 
                      msg.receiver_id === userInfo.user_id && msg.is_read === false
                    ).length
                  : 0;
                setUnreadCount(count);
              })
              .catch(err => console.error('[BottomTabs] Error refreshing unread count:', err));
          }
        },
      }}
    >
      {/* Home Tab - Search and browse services */}
      <Tab.Screen 
        name="Home" 
        component={SearchResultsScreen}
        options={{
          title: "Home"
        }}
        initialParams={{
          customerInfo: undefined,
          isGuest: false,
          preselectedCategory: ""
        }}
      />
      
      {/* Post Tab - Create new service listings */}
      <Tab.Screen 
        name="Post"
        component={PostScreenComponent}
        options={{
          title: "Post"
        }}
      />
      
      {/* Listings Tab - View all service listings */}
      <Tab.Screen
        name="Listings"
        component={ListingsScreen}
        options={{
          tabBarLabel: "Listings",
        }}
      />
      
      {/* Messages Tab - Chat with customers (shows unread badge) */}
      <Tab.Screen 
        name="Messages"
        component={MessageScreenComponent}
        options={{
          title: "Messages"
        }} 
      />
      
      {/* Profile Tab - Business owner profile and settings */}
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

// Stylesheet for badge component
const styles = StyleSheet.create({
  // Badge container styling - positioned absolutely over message icon
  badge: {
    position: 'absolute',
    right: -8, // Position to top-right of icon
    top: -4,
    backgroundColor: '#EF4444', // Red background for visibility
    borderRadius: 10, // Circular shape
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff', // White border for contrast
  },
  // Badge text styling
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default BottomTabs;