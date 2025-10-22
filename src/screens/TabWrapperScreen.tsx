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
      if (!userInfo?.user_id) {
        console.log('[BottomTabs] No user_id, skipping unread count fetch');
        console.log('[BottomTabs] userInfo:', userInfo);
        return;
      }
      
      try {
        const endpoint = `${API_URL}/messages/business-owner/${userInfo.user_id}`;
        console.log('[BottomTabs] Fetching unread count from:', endpoint);
        console.log('[BottomTabs] Current user_id:', userInfo.user_id);
        
        const response = await fetch(endpoint);
        if (!response.ok) {
          console.log('[BottomTabs] Response not OK:', response.status);
          return;
        }
        
        const data = await response.json();
        console.log('[BottomTabs] Raw messages data:', data);
        console.log('[BottomTabs] Total messages received:', data.length);
        
        // Count unread messages where current user is the receiver
        const unreadMessages = Array.isArray(data) 
          ? data.filter((msg: any) => {
              const isReceiver = Number(msg.receiver_id) === Number(userInfo.user_id);
              const isUnread = msg.is_read === false;
              console.log(`[BottomTabs] Message ${msg.id}: receiver_id=${msg.receiver_id}, current_user=${userInfo.user_id}, is_read=${msg.is_read}, isReceiver=${isReceiver}, isUnread=${isUnread}`);
              return isReceiver && isUnread;
            })
          : [];
        
        const count = unreadMessages.length;
        console.log(`[BottomTabs] ✅ Unread message count: ${count}`);
        console.log(`[BottomTabs] Unread messages:`, unreadMessages.map(m => ({id: m.id, text: m.message_text?.substring(0, 20)})));
        setUnreadCount(count);
        console.log(`[BottomTabs] State updated with count: ${count}`);
      } catch (error) {
        console.error('[BottomTabs] Error fetching unread count:', error);
      }
    };
    
    // Initial fetch
    console.log('[BottomTabs] Initial fetch triggered');
    fetchUnreadCount();
    
    // Poll every 30 seconds
    const interval = setInterval(() => {
      console.log('[BottomTabs] Polling unread count...');
      fetchUnreadCount();
    }, 30000);
    
    return () => {
      console.log('[BottomTabs] Cleanup - clearing interval');
      clearInterval(interval);
    };
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
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
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