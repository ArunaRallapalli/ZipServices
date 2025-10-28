import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import { useAuth } from "../contexts/AuthContext";
import API_URL from "../config/apiConfig";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "CustomerConversationsScreen"
>;
type RouteProps = RouteProp<RootStackParamList, "CustomerConversationsScreen">;

interface ChatConversation {
  business_id?: number;
  business_name?: string;
  contact_name: string;
  receiver_business_name?: string;
  last_message: string;
  last_message_time: string;
  other_user_id: number;
  unread_count?: number;
  user_type: 'business_owner' | 'customer';
}

export default function CustomerConversationsScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { userInfo, userType } = useAuth();
  
  const customerId = route.params?.customerId || userInfo?.user_id || null;
  const customerInfo = route.params?.customerInfo || userInfo;

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (isRefreshing: boolean = false) => {
    if (!customerId) {
      console.warn('[CustomerConversations] No customerId available');
      setLoading(false);
      setError('Customer ID not found. Please log in again.');
      return;
    }

    if (!isRefreshing) {
      setLoading(true);
    }
    setError(null);
    
    // Create AbortController and manual timeout for React Native compatibility
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 10000);

    try {
      const url = `${API_URL}/messages/customer/${customerId}/conversations`;
      console.log(`[CustomerConversations] Fetching from: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
      });
      
      clearTimeout(timeoutId);
      console.log(`[CustomerConversations] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CustomerConversations] Error response:`, errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data: ChatConversation[] = await response.json();
      console.log(`[CustomerConversations] Loaded ${data.length} conversations`);
      
      setConversations(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("[CustomerConversations] Error fetching conversations:", error);
      
      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your connection.');
      } else if (error.message?.includes('Network request failed')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(`Failed to load conversations: ${error.message || 'Unknown error'}`);
      }
      
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    console.log('CustomerConversationsScreen mounted with:', {
      customerId,
      userType,
      apiUrl: API_URL,
      hasCustomerId: !!customerId,
      userInfoUserId: userInfo?.user_id,
      routeParams: route.params,
      extractedCustomerId: route.params?.customerId || userInfo?.user_id,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations(false);
    }, [fetchConversations])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations(true);
  }, [fetchConversations]);

  const navigateToChat = useCallback((otherUserId: number, contactName: string, contactUserType: string) => {
    if (!customerId) {
      Alert.alert('Error', 'Cannot open chat: Customer ID not found');
      return;
    }
    
    console.log(`[CustomerConversations] Navigating to chat:`, {
      customerId,
      otherUserId,
      contactName,
      contactUserType,
    });
    
    navigation.navigate("CustomerChatScreen", {
      customerId: customerId,
      businessOwnerId: otherUserId,
      businessName: contactName || (contactUserType === 'customer' ? 'Customer' : 'Business Owner'),
    });
  }, [customerId, navigation]);

  const navigateToSearchResults = useCallback(() => {
    console.log('[CustomerConversations] Navigating back to search...');
    
    // Simply go back - this will return to wherever we came from (TabWrapperScreen)
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If can't go back, try to navigate to TabWrapperScreen
      console.log('[CustomerConversations] Cannot go back, navigating to TabWrapperScreen');
      try {
        navigation.navigate("TabWrapperScreen" as any);
      } catch (error) {
        console.error('[CustomerConversations] Navigation failed:', error);
        Alert.alert(
          'Navigation Error',
          'Unable to navigate back. Please use the app navigation.'
        );
      }
    }
  }, [navigation]);

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderConversationItem = useCallback(({ item }: { item: ChatConversation }) => {
    const displayName = item.contact_name || item.business_name || item.receiver_business_name || "Contact";
    const isCustomer = item.user_type === 'customer';
    const hasUnread = item.unread_count && item.unread_count > 0;
    
    return (
      <TouchableOpacity
        style={[styles.conversationCard, hasUnread && styles.conversationCardUnread]}
        onPress={() => navigateToChat(item.other_user_id, displayName, item.user_type)}
        activeOpacity={0.7}
      >
        <View style={styles.conversationHeader}>
          <View style={styles.nameContainer}>
            <Text style={[styles.contactName, hasUnread && styles.contactNameUnread]}>
              {displayName}
            </Text>
            {isCustomer && (
              <View style={styles.userTypeBadge}>
                <Text style={styles.userTypeBadgeText}>Customer</Text>
              </View>
            )}
          </View>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
        <Text style={styles.lastMessage} numberOfLines={2}>
          {item.last_message || "No messages yet"}
        </Text>
        <Text style={styles.timestamp}>
          {formatTimestamp(item.last_message_time)}
        </Text>
      </TouchableOpacity>
    );
  }, [navigateToChat]);

  if (!customerId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorTitle}>Customer ID Not Found</Text>
        <Text style={styles.errorSubtext}>
          Unable to load your conversations. Please try logging in again.
        </Text>
        
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Info:</Text>
            <Text style={styles.debugText}>User Type: {userType || 'undefined'}</Text>
            <Text style={styles.debugText}>
              User Info: {userInfo ? JSON.stringify(userInfo, null, 2) : 'none'}
            </Text>
            <Text style={styles.debugText}>
              Route Params: {route.params ? JSON.stringify(route.params, null, 2) : 'none'}
            </Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.errorButton} onPress={navigateToSearchResults}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error && !loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => fetchConversations(false)}
        >
          <Text style={styles.primaryButtonText}>Retry</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.primaryButton, styles.secondaryButton]} 
          onPress={navigateToSearchResults}
        >
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={navigateToSearchResults}>
          <Text style={styles.backButtonText}>← Back to Search</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.title}>My Conversations</Text>
      
      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>💬</Text>
          <Text style={styles.emptyStateText}>No conversations yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start chatting with business owners or other customers to see your conversations here
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={navigateToSearchResults}>
            <Text style={styles.primaryButtonText}>Find Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item, index) => `${item.other_user_id}_${index}`}
          renderItem={renderConversationItem}
          style={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#4f46e5"]}
              tintColor="#4f46e5"
            />
          }
        />
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 20,
  },
  conversationsList: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 10,
  },
  conversationCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4f46e5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  conversationCardUnread: {
    backgroundColor: "#f0f9ff",
    borderLeftColor: "#0ea5e9",
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  contactName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    flexShrink: 1,
  },
  contactNameUnread: {
    fontWeight: "700",
    color: "#0c4a6e",
  },
  userTypeBadge: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  userTypeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4f46e5",
    textTransform: 'uppercase',
  },
  unreadBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  lastMessage: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 6,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: "#6b7280",
    marginTop: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  backButton: {
    backgroundColor: "#6b7280",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 14,
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
    paddingHorizontal: 20,
  },
  errorButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  errorButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  debugContainer: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 8,
    marginVertical: 20,
    width: "100%",
    maxHeight: 300,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});