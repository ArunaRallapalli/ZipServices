import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";

const BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ChatMessagesTab"
>;

interface Conversation {
  other_user_id: number;
  other_user_name: string;
  last_message: string;
  last_message_time: string;
  unread_count?: number;
}

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
  currentUserId?: number;
  userType?: "customer" | "business_owner";
}

export default function MessagesTab({
  userInfo,
  currentUserId: propUserId,
  userType: propUserType,
}: MessagesTabProps) {
  const navigation = useNavigation<NavigationProp>();

  const currentUserId = propUserId ?? userInfo?.user_id;
  const userType = propUserType ?? userInfo?.user_type ?? "customer";

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!currentUserId) {
      console.error("No currentUserId available");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const url =
          userType === "customer"
            ? `${BASE_URL}/messages/customer/${currentUserId}/conversations`
            : `${BASE_URL}/messages/business-owner/${currentUserId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();

        const normalized: Conversation[] = (raw || []).map((item: any) => ({
          other_user_id:
            userType === "customer"
              ? item.other_user_id
              : item.user_id ?? item.sender_id,
          other_user_name:
            userType === "customer"
              ? item.business_name || item.receiver_business_name || "Business"
              : item.full_name || item.sender_name || item.sender_email || "Customer",
          last_message: item.last_message || item.message_text || "",
          last_message_time: item.last_message_time || item.created_at || "",
          unread_count: item.unread_count || 0,
        }));

        setConversations(normalized);
      } catch (e) {
        console.error("Fetch conversations failed:", e);
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserId, userType]);

  const goToChat = (otherId: number, otherName: string) => {
    if (!currentUserId) return;

    navigation.navigate("ChatScreen", {
      currentUserId,
      otherUserId: otherId,
      otherUserName: otherName,
    });
  };

  if (!currentUserId) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No user information available</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text>Loading conversations…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversations</Text>
      {conversations.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No conversations yet</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item, idx) => `${item.other_user_id}_${idx}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => goToChat(item.other_user_id, item.other_user_name)}
            >
              <View style={styles.headerRow}>
                <Text style={styles.name}>{item.other_user_name}</Text>
                {item.unread_count ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread_count}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.lastMsg} numberOfLines={1}>
                {item.last_message || "No messages"}
              </Text>
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
    borderLeftColor: "#4f46e5",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontSize: 18, fontWeight: "600", color: "#111827" },
  lastMsg: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  time: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontWeight: "bold" },
  empty: { fontSize: 16, color: "#6b7280" },
});
