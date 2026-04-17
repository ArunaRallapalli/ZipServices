/**
 * BusinessOwnerChatScreen - Displays list of message threads grouped by (customer, post)
 *
 * Last Updated: April 2026
 * Changes: Each unique (customer, post) pair is shown as a separate thread row.
 *          Tapping a row opens ChatScreen filtered to that post's messages.
 *
 * Backend API: GET /messages/business-owner/:userId
 */
import { createResponsiveStyles } from '../Utils/globalStyles';
import { BackButton } from '../components/BackButton';
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import { useAuth } from "../contexts/AuthContext";
import api from '../api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "BusinessOwnerChatScreen">;
type RouteProps = RouteProp<RootStackParamList, "BusinessOwnerChatScreen">;

function getRelativeDay(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  // Compare calendar days, not raw ms, so "Today" works regardless of time
  const nowDay  = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());
  const msgDay  = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((nowDay.getTime() - msgDay.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <  7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Thread {
  key: string;              // unique: "${otherUserId}_${postId ?? 'null'}"
  other_user_id: number;
  other_user_name: string;
  other_user_email: string;
  post_id: number | null;
  post_title: string | null;
  last_message: string;
  last_message_time: string;
  has_unread: boolean;
}

export default function BusinessOwnerChatScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { userInfo, userType } = useAuth();

  const businessOwnerUserId = (() => {
    const id = route.params?.businessOwnerUserId || userInfo?.user_id;
    return typeof id === 'string' ? parseInt(id, 10) : id;
  })();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [postPhotos, setPostPhotos] = useState<Record<number, string>>({});

  useEffect(() => {
    console.log('BusinessOwnerChatScreen mounted with:', {
      routeParams: route.params,
      userInfo,
      userType,
      extractedBusinessOwnerUserId: businessOwnerUserId,
    });
  }, [userInfo, route.params, businessOwnerUserId]);

  useEffect(() => {
    const checkAuthReady = () => {
      if (userInfo?.user_id || route.params?.businessOwnerUserId) {
        setAuthLoading(false);
      } else {
        const timer = setTimeout(() => {
          console.warn('[BusinessOwnerChat] Auth context not loaded after timeout');
          setAuthLoading(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
    };
    checkAuthReady();
  }, [userInfo, route.params]);

  const loadThreads = async (): Promise<void> => {
    if (authLoading) return;
    if (!businessOwnerUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data: any[] = await api.get(`/messages/business-owner/${businessOwnerUserId}`);

      const extractUsername = (email: string | null | undefined): string => {
        if (!email) return "Unknown User";
        return email.split('@')[0] || "Unknown User";
      };

      // Group by (other_user_id, post_id) — keep only the most recent message per thread
      const threadMap = new Map<string, Thread>();

      // Data arrives oldest-first (ascending), so iterate and overwrite to keep latest
      data.forEach((item: any) => {
        let otherUserId: number | null = null;
        let otherUserName = "Unknown User";
        let otherUserEmail = "";

        if (item.sender_id === businessOwnerUserId) {
          otherUserId = typeof item.receiver_id === "string" ? parseInt(item.receiver_id, 10) : item.receiver_id;
          otherUserName = item.receiver_name || extractUsername(item.receiver_email);
          otherUserEmail = item.receiver_email || "";
        } else if (item.receiver_id === businessOwnerUserId) {
          otherUserId = typeof item.sender_id === "string" ? parseInt(item.sender_id, 10) : item.sender_id;
          otherUserName = item.sender_name || extractUsername(item.sender_email);
          otherUserEmail = item.sender_email || "";
        }

        if (!otherUserId) return;

        const postId: number | null = item.post_id ? parseInt(item.post_id, 10) : null;
        const key = `${otherUserId}_${postId ?? 'null'}`;
        const isUnread = item.receiver_id === businessOwnerUserId && item.is_read === false;

        const existing = threadMap.get(key);
        if (
          !existing ||
          (item.created_at && existing.last_message_time &&
            new Date(item.created_at) > new Date(existing.last_message_time))
        ) {
          threadMap.set(key, {
            key,
            other_user_id: otherUserId,
            other_user_name: otherUserName,
            other_user_email: otherUserEmail,
            post_id: postId,
            post_title: item.post_title || null,
            last_message: item.message_text || "",
            last_message_time: item.created_at || "",
            has_unread: isUnread,
          });
        } else if (existing && isUnread) {
          existing.has_unread = true;
        }
      });

      const sorted = Array.from(threadMap.values()).sort((a, b) => {
        if (!a.last_message_time) return 1;
        if (!b.last_message_time) return -1;
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      setThreads(sorted);

      // Fetch first photo for each unique post_id
      const uniquePostIds = [...new Set(
        sorted.map(t => t.post_id).filter((id): id is number => id !== null)
      )];
      const photoMap: Record<number, string> = {};
      await Promise.all(
        uniquePostIds.map(async (postId) => {
          try {
            const post = await api.get(`/api/service-posts/${postId}`);
            if (post?.photos?.[0]) photoMap[postId] = post.photos[0];
          } catch { /* no photo — card just won't show image */ }
        })
      );
      setPostPhotos(photoMap);
    } catch (error) {
      console.error("[BusinessOwnerChat] Error loading threads:", error);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [businessOwnerUserId, authLoading]);

  useFocusEffect(
    React.useCallback(() => {
      if (!authLoading && businessOwnerUserId) {
        loadThreads();
      }
    }, [businessOwnerUserId, authLoading])
  );

  const navigateToChat = (thread: Thread) => {
    if (!businessOwnerUserId) return;
    navigation.navigate("ChatScreen", {
      currentUserId: businessOwnerUserId,
      otherUserId: thread.other_user_id,
      otherUserName: thread.other_user_name || "User",
      postId: thread.post_id ?? undefined,
      postTitle: thread.post_title ?? undefined,
    });
  };

  const renderThread = ({ item }: { item: Thread }) => (
    <TouchableOpacity
      style={[styles.contactCard, item.has_unread && styles.contactCardUnread]}
      onPress={() => navigateToChat(item)}
    >
      <View style={styles.contactHeader}>
        <View style={styles.nameContainer}>
          <Text style={styles.contactName}>{item.other_user_name}</Text>
          {item.has_unread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>New</Text>
            </View>
          )}
        </View>
        <Text style={styles.contactId}>{getRelativeDay(item.last_message_time)}</Text>
      </View>

      {item.post_title && (
        <Text style={styles.postTitle} numberOfLines={1}>
          {item.post_title}
        </Text>
      )}

      {item.last_message ? (
        <View style={styles.lastMessageContainer}>
          <Text style={styles.lastMessageLabel}>Last message:</Text>
          <Text
            style={[styles.lastMessage, item.has_unread && styles.lastMessageUnread]}
            numberOfLines={2}
          >
            {item.last_message}
          </Text>
        </View>
      ) : null}

      {item.post_id && postPhotos[item.post_id] ? (
        <Image
          source={{ uri: postPhotos[item.post_id] }}
          style={styles.postThumb}
          resizeMode="cover"
        />
      ) : null}

      {item.last_message_time ? (
        <Text style={styles.timestamp}>
          {new Date(item.last_message_time).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  const keyExtractor = (item: Thread) => item.key;

  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading authentication...</Text>
      </View>
    );
  }

  if (!businessOwnerUserId) {
    return (
      <>
        <BackButton />
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>User ID Not Found</Text>
          <Text style={styles.errorSubtext}>
            Unable to load your messages. Please try logging in again.
          </Text>
        </View>
      </>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (threads.length === 0) {
    return (
      <>
        <BackButton />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyStateIcon}>📪</Text>
          <Text style={styles.emptyStateTitle}>No Messages Yet</Text>
          <Text style={styles.emptyStateSubtext}>
            When customers message you about your listings, conversations will appear here.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <BackButton />
      <View style={styles.container}>
        <Text style={styles.title}>Messages ({threads.length})</Text>
        <FlatList
          data={threads}
          keyExtractor={keyExtractor}
          renderItem={renderThread}
          style={styles.contactsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </>
  );
}

const styles = createResponsiveStyles({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 20,
  },
  contactsList: { flex: 1 },
  listContainer: { paddingBottom: 10 },
  contactCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#059669",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  contactCardUnread: {
    borderLeftColor: "#10b981",
    borderLeftWidth: 6,
    backgroundColor: "#f0fdf4",
  },
  contactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  contactName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  unreadBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  contactId: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },
  postTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4f46e5",
    marginBottom: 6,
  },
  lastMessageContainer: { marginBottom: 8 },
  lastMessageLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "600",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "#374151",
    fontStyle: "italic",
    lineHeight: 20,
  },
  lastMessageUnread: {
    color: "#059669",
    fontWeight: "bold",
    fontStyle: "normal",
  },
  postThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  timestamp: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "right",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ef4444",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
});
