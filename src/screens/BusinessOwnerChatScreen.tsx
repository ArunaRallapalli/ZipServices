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
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import { useAuth } from "../contexts/AuthContext";
import API_URL from "../config/apiConfig";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "BusinessOwnerChatScreen"
>;
type RouteProps = RouteProp<RootStackParamList, "BusinessOwnerChatScreen">;

interface Contact {
  user_id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  last_message?: string;
  last_message_time?: string;
  has_unread?: boolean;
}

export default function BusinessOwnerChatScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { userInfo, userType } = useAuth();
  
 const businessOwnerUserId = (() => {
  const id = route.params?.businessOwnerUserId || userInfo?.user_id;
  return typeof id === 'string' ? parseInt(id, 10) : id;
})();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('BusinessOwnerChatScreen mounted with:', {
      routeParams: route.params,
      userInfo,
      userType,
      extractedBusinessOwnerUserId: businessOwnerUserId,
      hasBusinessOwnerUserId: !!businessOwnerUserId
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

  const loadContacts = async (): Promise<void> => {
    if (authLoading) {
      console.log('[BusinessOwnerChat] Waiting for auth context...');
      return;
    }

    if (!businessOwnerUserId) {
      console.warn('[BusinessOwnerChat] No businessOwnerUserId available');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log(`[BusinessOwnerChat] Loading contacts for business owner: ${businessOwnerUserId}`);
      
      const response = await fetch(`${API_URL}/messages/business-owner/${businessOwnerUserId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: any[] = await response.json();
      console.log(`[BusinessOwnerChat] Raw data received:`, data);

      // Create a map to track contacts (other business owners) and their most recent messages
      const contactMap = new Map<number, Contact>();

      data.forEach((item: any) => {
        let otherUserId: number | null = null;
        let otherUserName: string = "Unknown User";
        let otherUserEmail: string = "";
        
        // Determine the OTHER user in this conversation
        if (item.sender_id === businessOwnerUserId) {
          // Current user sent this message, so receiver is the contact
          otherUserId = typeof item.receiver_id === "string" 
            ? parseInt(item.receiver_id, 10) 
            : item.receiver_id;
          otherUserName = item.receiver_name || item.receiver_email || "Unknown User";
          otherUserEmail = item.receiver_email || "";
        } else if (item.receiver_id === businessOwnerUserId) {
          // Current user received this message, so sender is the contact
          otherUserId = typeof item.sender_id === "string" 
            ? parseInt(item.sender_id, 10) 
            : item.sender_id;
          otherUserName = item.sender_name || item.sender_email || "Unknown User";
          otherUserEmail = item.sender_email || "";
        }
        
        if (!otherUserId) {
          console.warn('[BusinessOwnerChat] Could not identify other user from item:', item);
          return;
        }
        
        const existingContact = contactMap.get(otherUserId);
        const messageTime = item.created_at;
        
        // Check if current user is the receiver and message is unread
        const isUnread = item.receiver_id === businessOwnerUserId && item.is_read === false;
        
        // Only update if this is a newer message or contact doesn't exist yet
        if (!existingContact || 
            (messageTime && existingContact.last_message_time && 
             new Date(messageTime) > new Date(existingContact.last_message_time))) {
          contactMap.set(otherUserId, {
            user_id: otherUserId,
            full_name: otherUserName,
            email: otherUserEmail,
            last_message: item.message_text || "",
            last_message_time: messageTime,
            has_unread: isUnread,
          });
        } else if (existingContact && isUnread) {
          // If contact exists but we found an unread message, mark it
          existingContact.has_unread = true;
        }
      });

      // Convert map to array and sort by most recent message
      const uniqueContacts = Array.from(contactMap.values()).sort((a, b) => {
        if (!a.last_message_time || !b.last_message_time) return 0;
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      console.log(`[BusinessOwnerChat] Processed ${uniqueContacts.length} unique contacts`);
      setContacts(uniqueContacts);
    } catch (error) {
      console.error("[BusinessOwnerChat] Error loading contacts:", error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadContacts();
  }, [businessOwnerUserId, authLoading]);

  // Reload when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (!authLoading && businessOwnerUserId) {
        loadContacts();
      }
    }, [businessOwnerUserId, authLoading])
  );

  const navigateToChat = (otherUserId: number, otherUserName: string) => {
    if (!businessOwnerUserId) {
      console.error('[BusinessOwnerChat] Cannot navigate to chat: no businessOwnerUserId');
      return;
    }
    
    console.log(`[BusinessOwnerChat] Navigating to chat with user:`, {
      businessOwnerUserId,
      otherUserId,
      otherUserName
    });
    
    navigation.navigate("ChatScreen", {
      currentUserId: businessOwnerUserId,
      otherUserId: otherUserId,
      otherUserName: otherUserName || "User",
    });
  };

  const navigateToBusinessHome = () => {
    navigation.navigate("Home" as any);
  };

  const navigateToBusinessHomeReset = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" as any }],
    });
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={[
        styles.contactCard,
        item.has_unread && styles.contactCardUnread
      ]}
      onPress={() => navigateToChat(item.user_id, item.full_name)}
    >
      <View style={styles.contactHeader}>
        <View style={styles.nameContainer}>
          <Text style={styles.contactName}>{item.full_name}</Text>
          {item.has_unread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>New</Text>
            </View>
          )}
        </View>
        <Text style={styles.contactId}>ID: {item.user_id}</Text>
      </View>
                
      {item.last_message && (
        <View style={styles.lastMessageContainer}>
          <Text style={styles.lastMessageLabel}>Last message:</Text>
          <Text 
            style={[
              styles.lastMessage,
              item.has_unread && styles.lastMessageUnread
            ]} 
            numberOfLines={2}
          >
            {item.last_message}
          </Text>
        </View>
      )}
      
      {item.last_message_time && (
        <Text style={styles.timestamp}>
          {new Date(item.last_message_time).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      )}
    </TouchableOpacity>
  );

  const keyExtractor = (item: Contact, index: number): string =>
    item && item.user_id ? item.user_id.toString() : `fallback-${index}-${Date.now()}`;

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
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorTitle}>User ID Not Found</Text>
        <Text style={styles.errorSubtext}>
          Unable to load your messages. Please try logging in again.
        </Text>
        
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>
            User Type: {userType || 'undefined'}
          </Text>
          <Text style={styles.debugText}>
            User Info: {userInfo ? 'exists' : 'undefined'}
          </Text>
          <Text style={styles.debugText}>
            User Info Keys: {userInfo ? Object.keys(userInfo).join(', ') : 'no userInfo'}
          </Text>
          <Text style={styles.debugText}>
            Route Params: {route.params ? JSON.stringify(route.params) : 'no params'}
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.errorButton} onPress={navigateToBusinessHome}>
            <Text style={styles.errorButtonText}>Go to Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resetButton} onPress={navigateToBusinessHomeReset}>
            <Text style={styles.resetButtonText}>Reset to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
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

  if (contacts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyStateIcon}>📪</Text>
        <Text style={styles.emptyStateTitle}>No Messages Yet</Text>
        <Text style={styles.emptyStateSubtext}>
          You haven't had any conversations yet. When you message other users or they message you, the conversations will appear here.
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={navigateToBusinessHome}>
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={navigateToBusinessHomeReset}>
            <Text style={styles.secondaryButtonText}>Reset to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages ({contacts.length})</Text>
      
      <FlatList
        data={contacts}
        keyExtractor={keyExtractor}
        renderItem={renderContactItem}
        style={styles.contactsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
      
      <View style={styles.navigationContainer}>
        <TouchableOpacity style={styles.resetNavigationButton} onPress={navigateToBusinessHome}>
          <Text style={styles.resetNavigationButtonText}>🏠 Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  contactsList: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 10,
  },
  contactCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#059669",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    marginBottom: 8,
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  lastMessageContainer: {
    marginBottom: 8,
  },
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
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    width: "100%",
    maxWidth: 350,
  },
  primaryButton: {
    backgroundColor: "#059669",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    flex: 1,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    flex: 1,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    gap: 12,
  },
  resetNavigationButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 80,
  },
  resetNavigationButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
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
  errorButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    flex: 1,
  },
  errorButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  resetButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    flex: 1,
  },
  resetButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  debugContainer: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 8,
    marginVertical: 20,
    width: "100%",
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});