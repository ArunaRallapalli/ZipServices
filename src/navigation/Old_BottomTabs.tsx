import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Screens
import CustomerProfileScreen from "../screens/Profile/BusinessOwnerProfileScreen";
import SearchResultsScreen from "../screens/SearchResultsScreen";
import PostServiceScreen from "../screens/PostServiceScreen";
import BusinessOwnerChatScreen from "../screens/BusinessOwnerChatScreen";
import UserHomeScreen from "../screens/UserHomeScreen";

// ----- Tab types -----
type TabParamList = {
  Home: undefined;
  Post: undefined;
  Account: undefined;
  Message: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      id={undefined} // ✅ satisfies TS types
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size = 24 }) => {
          switch (route.name) {
            case "Home":
              return <AntDesign name="home" size={size} color={color} />;
            case "Post":
              return <MaterialIcons name="post-add" size={size} color={color} />;
            case "Account":
              return <MaterialIcons name="person-outline" size={size} color={color} />;
            case "Message":
              return <AntDesign name="message1" size={size} color={color} />;
            case "Settings":
              return <Feather name="settings" size={size} color={color} />;
            default:
              return <Ionicons name="ellipse" size={size} color={color} />;
          }
        },
        tabBarActiveTintColor: "#4A90E2",
        tabBarInactiveTintColor: "#A7CCF6",
        tabBarStyle: {
          backgroundColor: "#fff",
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          borderTopWidth: 1,
          borderTopColor: "#E1E5E9",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen name="Home" component={SearchResultsScreen} />
      <Tab.Screen name="Post" component={PostServiceScreen} />
      <Tab.Screen name="Account" component={UserHomeScreen} />
      <Tab.Screen name="Message" component={BusinessOwnerChatScreen} />
      <Tab.Screen name="Settings" component={CustomerProfileScreen} />
    </Tab.Navigator>
  );
}
