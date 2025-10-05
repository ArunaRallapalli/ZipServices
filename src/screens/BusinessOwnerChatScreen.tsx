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
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import { useAuth } from "../contexts/AuthContext";
import API_URL from "../config/apiConfig";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "BusinessOwnerChatScreen"
>;
type RouteProps = RouteProp<RootStackParamList, "BusinessOwnerChatScreen">;

interface Customer {
  user_id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  last_message?: string;
  last_message_time?: string;
}

export default function BusinessOwnerChatScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { userInfo, userType } = useAuth();
  
  const businessOwnerUserId = route.params?.businessOwnerUserId || userInfo?.user_id;

  const [customers, setCustomers] = useState<Customer[]>([]);
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

  useEffect(() => {
    const loadCustomers = async (): Promise<void> => {
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
        console.log(`[BusinessOwnerChat] Loading customers for business owner: ${businessOwnerUserId}`);
        
        const response = await fetch(`${API_URL}/messages/business-owner/${businessOwnerUserId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: any[] = await response.json();
        console.log(`[BusinessOwnerChat] Raw data received:`, data);

        // Create a map to track customers and their most recent messages
        const customerMap = new Map<number, Customer>();

        data.forEach((item: any) => {
          let customerId: number | null = null;
          let customerName: string = "Unknown Customer";
          let customerEmail: string = "";
          
          // Determine if this message involves a customer and extract their info
          if (item.sender_id === businessOwnerUserId) {
            // Business owner sent this message, so receiver is the customer
            customerId = typeof item.receiver_id === "string" 
              ? parseInt(item.receiver_id, 10) 
              : item.receiver_id;
            customerName = item.receiver_name || item.receiver_email || "Unknown Customer";
            customerEmail = item.receiver_email || "";
          } else if (item.receiver_id === businessOwnerUserId) {
            // Business owner received this message, so sender is the customer
            customerId = typeof item.sender_id === "string" 
              ? parseInt(item.sender_id, 10) 
              : item.sender_id;
            customerName = item.sender_name || item.sender_email || "Unknown Customer";
            customerEmail = item.sender_email || "";
          }
          
          if (!customerId) {
            console.warn('[BusinessOwnerChat] Could not identify customer from item:', item);
            return;
          }
          
          const existingCustomer = customerMap.get(customerId);
          const messageTime = item.created_at;
          
          // Only update if this is a newer message or customer doesn't exist yet
          if (!existingCustomer || 
              (messageTime && existingCustomer.last_message_time && 
               new Date(messageTime) > new Date(existingCustomer.last_message_time))) {
            customerMap.set(customerId, {
              user_id: customerId,
              full_name: customerName,
              email: customerEmail,
              last_message: item.message_text || "",
              last_message_time: messageTime,
            });
          }
        });

        // Convert map to array and sort by most recent message
        const uniqueCustomers = Array.from(customerMap.values()).sort((a, b) => {
          if (!a.last_message_time || !b.last_message_time) return 0;
          return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
        });

        console.log(`[BusinessOwnerChat] Processed ${uniqueCustomers.length} unique customers`);
        setCustomers(uniqueCustomers);
      } catch (error) {
        console.error("[BusinessOwnerChat] Error loading customers:", error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [businessOwnerUserId, authLoading]);

  const navigateToChat = (customerId: number, customerName: string) => {
    if (!businessOwnerUserId) {
      console.error('[BusinessOwnerChat] Cannot navigate to chat: no businessOwnerUserId');
      return;
    }
    
    console.log(`[BusinessOwnerChat] Navigating to chat with customer:`, {
      businessOwnerUserId,
      customerId,
      customerName
    });
    
    navigation.navigate("ChatScreen", {
      currentUserId: businessOwnerUserId,
      otherUserId: customerId,
      otherUserName: customerName || "Customer",
    });
  };

  const navigateToBusinessHome = () => {
    try {
      navigation.navigate("TabWrapperScreen", {
        screen: "SearchResultsScreen"
      });
    } catch (error) {
      console.warn('Could not navigate through TabWrapperScreen, trying direct navigation:', error);
      navigation.navigate("SearchResultsScreen");
    }
  };

  const navigateToBusinessHomeReset = () => {
    navigation.reset({
      index: 0,
      routes: [
        { 
          name: "TabWrapperScreen",
          params: {
            screen: "SearchResultsScreen"
          }
        }
      ],
    });
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => navigateToChat(item.user_id, item.full_name)}
    >
      <View style={styles.customerHeader}>
        <Text style={styles.customerName}>{item.full_name}</Text>
        <Text style={styles.customerId}>ID: {item.user_id}</Text>
      </View>
      
      <Text style={styles.customerEmail}>{item.email}</Text>
      
      {item.last_message && (
        <View style={styles.lastMessageContainer}>
          <Text style={styles.lastMessageLabel}>Last message:</Text>
          <Text style={styles.lastMessage} numberOfLines={2}>
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

  const keyExtractor = (item: Customer, index: number): string =>
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
        <Text style={styles.errorTitle}>Business Owner ID Not Found</Text>
        <Text style={styles.errorSubtext}>
          Unable to load your customer messages. Please try logging in again.
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
        <Text style={styles.loadingText}>Loading customer messages...</Text>
      </View>
    );
  }

  if (customers.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyStateIcon}>📪</Text>
        <Text style={styles.emptyStateTitle}>No Customer Messages</Text>
        <Text style={styles.emptyStateSubtext}>
          You haven't received any messages from customers yet. When customers contact you, their messages will appear here.
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
      <Text style={styles.title}>Customer Messages ({customers.length})</Text>
      
      <FlatList
        data={customers}
        keyExtractor={keyExtractor}
        renderItem={renderCustomerItem}
        style={styles.customersList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
      
      <View style={styles.navigationContainer}>
        <TouchableOpacity style={styles.resetNavigationButton} onPress={navigateToBusinessHomeReset}>
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
  customersList: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 10,
  },
  customerCard: {
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
  customerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    flex: 1,
  },
  customerId: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  customerEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
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