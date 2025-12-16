/**
 * MessagesTab Component
 * 
 * This is the conversation list/inbox screen that displays all chat conversations for a user.
 * It serves as the main entry point to the messaging system.
 * 
 * Features:
 * - Displays all conversations with preview of last message
 * - Shows unread message count badge on each conversation
* - Works for all user types (customers and business owners)
 * - Uses universal /conversations endpoint
 * - Tapping a conversation navigates to the full chat screen
 * - Loading states and empty states
 * - Auto-fetches conversations on mount
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import API_URL from "../config/apiConfig";


// Navigation type definition for type safety
type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ChatMessagesTab"
>;

// Conversation interface: represents a single conversation in the list
interface Conversation {
  other_user_id: number;           // ID of the other person in the conversation
  other_user_name: string;          // Display name of the other person
  last_message: string;             // Preview of the most recent message
  last_message_time: string;        // Timestamp of the last message
  unread_count?: number;            // Number of unread messages (optional)
}

// Props interface: defines what data can be passed to this component
interface MessagesTabProps {
  userInfo?: {
    user_id: number;
    full_name: string;
    phone_number?: string;
    zip_code?: string;
    business_name?: string;
    service_category?: string;
    user_type?: "customer" | "business_owner";
  };
  currentUserId?: number;                        // Alternative way to pass user ID
  userType?: "customer" | "business_owner";      // Alternative way to pass user type
}

export default function MessagesTab({
  userInfo,
  currentUserId: propUserId,
  userType: propUserType,
}: MessagesTabProps) {
  const navigation = useNavigation<NavigationProp>();

  // Extract user ID: prefer prop over userInfo
  const currentUserId = propUserId ?? userInfo?.user_id;
  
  // Extract user type: prefer prop over userInfo, default to "customer"
  const userType = propUserType ?? userInfo?.user_type ?? "customer";

  // State: Loading indicator while fetching conversations
  const [loading, setLoading] = useState(true);
  
  // State: Array of all conversations for this user
  const [conversations, setConversations] = useState<Conversation[]>([]);

  /**
   * Effect: Fetch conversations when component mounts or when user info changes
   * Runs whenever currentUserId changes
   */
  useEffect(() => {
    // Early exit if no user ID is available
    if (!currentUserId) {
      console.error("No currentUserId available");
      setLoading(false);
      return;
    }
/**
     * Fetch conversations from the backend using the universal /conversations endpoint
     */
    const fetchData = async () => {
  
      try {
        setLoading(true);
        
     // Use universal conversations endpoint for all users
       const url = `${API_URL}/messages/conversations/${currentUserId}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
/**
         * Map the API response to our Conversation interface
         * The /conversations endpoint returns consistent field names for all users
         */
        const normalized: Conversation[] = (raw || []).map((item: any) => ({
          other_user_id: item.other_user_id,
          other_user_name: item.contact_name || "Unknown User",
          last_message: item.last_message || "",
          last_message_time: item.last_message_time || "",
          unread_count: item.unread_count || 0,
        }));
        
       

        setConversations(normalized);
      } catch (e) {
        console.error("Fetch conversations failed:", e);
        setConversations([]); // Set empty array on error
      } finally {
        setLoading(false); // Always stop loading indicator
      }
    };

    fetchData();
 }, [currentUserId]);

  /**
   * Navigate to the chat screen when a conversation is tapped
   * Passes necessary parameters to ChatScreen
   */
  const goToChat = (otherId: number, otherName: string) => {
    if (!currentUserId) return; // Safety check

    navigation.navigate("ChatScreen", {
      currentUserId,
      otherUserId: otherId,
      otherUserName: otherName,
    });
  };

  // Early return: Show error message if no user ID is available
  if (!currentUserId) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No user information available</Text>
      </View>
    );
  }

  // Loading state: Show spinner while fetching data
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text>Loading conversations…</Text>
      </View>
    );
  }

  // Main render: Show conversation list or empty state
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversations</Text>
      {conversations.length === 0 ? (
        // Empty state: No conversations found
        <View style={styles.center}>
          <Text style={styles.empty}>No conversations yet</Text>
        </View>
      ) : (
        // Conversation list: FlatList of all conversations
        <FlatList
          data={conversations}
          // Generate unique key using user ID and index
          keyExtractor={(item, idx) => `${item.other_user_id}_${idx}`}
          renderItem={({ item }) => (
            // Each conversation card is tappable
            <TouchableOpacity
              style={styles.card}
              onPress={() => goToChat(item.other_user_id, item.other_user_name)}
            >
              {/* Header row: Name and unread badge */}
              <View style={styles.headerRow}>
                <Text style={styles.name}>{item.other_user_name}</Text>
                {/* Show unread count badge only if there are unread messages */}
                {item.unread_count ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread_count}</Text>
                  </View>
                ) : null}
              </View>
              
              {/* Last message preview (truncated to 1 line) */}
              <Text style={styles.lastMsg} numberOfLines={1}>
                {item.last_message || "No messages"}
              </Text>
              
              {/* Timestamp of last message */}
              <Text style={styles.time}>
                {item.last_message_time
                  ? new Date(item.last_message_time).toLocaleDateString()
                  : ""}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// Styles: All styling for the component
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4f46e5", // Purple accent on left edge
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontSize: 18, fontWeight: "600", color: "#111827" },
  lastMsg: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  time: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  badge: {
    backgroundColor: "#ef4444", // Red background for unread count
    borderRadius: 12,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontWeight: "bold" },
  empty: { fontSize: 16, color: "#6b7280" },
});