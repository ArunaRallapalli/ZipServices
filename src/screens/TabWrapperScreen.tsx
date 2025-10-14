import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { View, Text, StyleSheet } from "react-native";
import { RootStackParamList, TabParamList } from "../navigation/MainStackNavigator";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Ionicons, AntDesign } from '@expo/vector-icons';
import API_URL from "../config/apiConfig";

// Import your screens
import ListingsScreen from "./ListingsScreen";
import BusinessOwnerProfileScreen from './Profile/BusinessOwnerProfileScreen';
import SearchResultsScreen from "./SearchResultsScreen";
import PostServiceScreen from "./PostServiceScreen";
import BusinessOwnerChatScreen from "./BusinessOwnerChatScreen";
import { useAuth } from "../contexts/AuthContext";
import { MessagesPlaceholder, ProfilePlaceholder, PostPlaceholder } from "./auth/SignInPlaceholderScreen";

const Tab = createBottomTabNavigator<TabParamList>();

type TabWrapperRouteProp = RouteProp<RootStackParamList, 'TabWrapperScreen'>;

const BottomTabs: React.FC = () => {
  const { userType, userInfo } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const route = useRoute<TabWrapperRouteProp>();
  const navigation = useNavigation();

  // Handle initial screen navigation from params
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
 
  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!userInfo?.user_id) return;
      
      try {
        const endpoint = `${API_URL}/messages/business-owner/${userInfo.user_id}`;
        
        const response = await fetch(endpoint);
        if (!response.ok) return;
        
        const data = await response.json();
        
        // Count unread messages where current user is the receiver
        const count = Array.isArray(data) 
          ? data.filter((msg: any) => 
              msg.receiver_id === userInfo.user_id && msg.is_read === false
            ).length
          : 0;
        
        console.log(`[BottomTabs] Unread message count: ${count}`);
        setUnreadCount(count);
      } catch (error) {
        console.error('[BottomTabs] Error fetching unread count:', error);
      }
    };
    
    // Initial fetch
    fetchUnreadCount();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [userInfo, userType]);
  
  // Everyone uses business owner components now
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
        tabBarIcon: ({ focused, color, size }) => {
          const iconSize = 28;
          const iconColor = '#4A90E2';
          
          switch (route.name) {
            case 'Home':
              return <AntDesign name="home" size={iconSize} color={iconColor} />;
            case 'Post':
              return <MaterialIcons name="post-add" size={iconSize} color={iconColor} />;
            case 'Listings':
              return <Ionicons name="list" size={iconSize} color={iconColor} />;
            case 'Messages':
              return (
                <View>
                  <AntDesign name="message1" size={iconSize} color={iconColor} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              );
            case 'Profile':
              return <MaterialIcons name="person" size={iconSize} color={iconColor} />;
            default:
              return <Ionicons name="ellipse" size={iconSize} color={iconColor} />;
          }
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#2563EB',
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
          fontSize: 11,
          fontWeight: '700',
          marginTop: 0,
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
        tabPress: () => {
          // Refresh unread count when Messages tab is pressed
          if (userInfo?.user_id) {
            fetch(`${API_URL}/messages/business-owner/${userInfo.user_id}`)
              .then(res => res.json())
              .then((data: any[]) => {
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
      <Tab.Screen 
        name="Post"
        component={PostScreenComponent}
        options={{
          title: "Post"
        }}
      />
      <Tab.Screen
        name="Listings"
        component={ListingsScreen}
        options={{
          tabBarLabel: "Listings",
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

const styles = StyleSheet.create({
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