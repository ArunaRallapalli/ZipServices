/**
 * ListingsScreen Component
 * 
 * Last Updated: January 5, 2026
 * Changes: Migrated from fetch to api client for automatic token handling
 * 
 * This screen displays all service listings (posts) created by the currently logged-in user.
 * It serves as a management dashboard where users can view, search, edit, and inactivate their listings.
 * 
 * Features:
 * - Displays all user's service posts (both "offer" and "request" types)
 * - Search functionality to filter listings by title, category, description, or location
 * - Edit listings (navigates to edit screen)
 * - Inactivate listings (hides them from other users)
 * - Pull-to-refresh to reload listings
 * - Shows listing status (active/inactive) with visual indicators
 * - Displays comprehensive listing details: title, description, category, price, location, contact info
 * - Authentication check - shows sign-in prompt if not authenticated
 * - Loading states and empty states
 * - Different badge colors for "offering" vs "requesting" posts
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Image,
} from "react-native";
import { createResponsiveStyles } from '../Utils/globalStyles';
import { Alert } from "../Utils/Alert";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import { useAuth } from "../contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BackButton } from '../components/BackButton';
import api from '../api'; // ADDED: January 5, 2026

// Navigation type definition for type safety
type AllListingsNavProp = NativeStackNavigationProp<RootStackParamList, "ListingsScreen">;

// ServicePost interface: represents a single service listing/post
interface ServicePost {
  id: number;
  user_id: number;
  poster_type: string;
  post_type: string;                    // "offer" or "request"
  title: string;
  description?: string;
  service_category: string;
  price?: string;
  in_stock?: number;
  accepts_payment?: boolean;
  phone_number?: string;
  contact_email?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  poster_name?: string;
  business_name?: string;
  created_at?: string;
  is_active?: boolean;                  // Whether listing is active/visible
  request_status?: 'pending' | 'approved' | 'rejected';
  photos?: string[];
}

// CustomerInfo interface: represents the current user's information
interface CustomerInfo {
  user_id: number;
  user_type?: 'customer' | 'business_owner';
  full_name?: string;
  phone_number?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  email?: string;
}

const ListingsScreen: React.FC = () => {
  const navigation = useNavigation<AllListingsNavProp>();
  const { isAuthenticated } = useAuth();

  // State: All listings fetched from the backend
  const [listings, setListings] = useState<ServicePost[]>([]);

  // State: Filtered listings based on search query
  const [filteredListings, setFilteredListings] = useState<ServicePost[]>([]);

  // State: Loading indicator for initial data fetch
  const [loading, setLoading] = useState(true);

  // State: Refreshing indicator for pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // State: Current search query text
  const [searchQuery, setSearchQuery] = useState("");

  // State: Current user's information loaded from AsyncStorage
  const [userInfo, setUserInfo] = useState<CustomerInfo | null>(null);

  // State: Number of pending orders — shown as badge on the My Orders button
  const [pendingOrderCount, setPendingOrderCount] = useState(0);

  // State: Number of pending thrift requests — shown as badge on the Thrift Requests button
  const [pendingThriftCount, setPendingThriftCount] = useState(0);

  /**
   * Effect: Load user information from AsyncStorage when component mounts
   */
  useEffect(() => {
    loadUserInfo();
  }, []);

  /**
   * Load user information from AsyncStorage
   * Retrieves userId, userType, email, and full userInfo object
   */
  const loadUserInfo = async () => {
    try {
      // Fetch multiple items from AsyncStorage in parallel
      const [userId, userType, userEmail, storedUserInfo] = await Promise.all([
        AsyncStorage.getItem("userId"),
        AsyncStorage.getItem("userType"),
        AsyncStorage.getItem("userEmail"),
        AsyncStorage.getItem("userInfo")
      ]);

      if (userId && userType) {
        let info: CustomerInfo | null = null;
        
        // Try to parse stored user info JSON
        if (storedUserInfo) {
          try {
            info = JSON.parse(storedUserInfo);
          } catch (e) {
            console.error("Error parsing user info:", e);
          }
        }
        
        // If parsing failed, create basic info object
        if (!info) {
          info = {
            user_id: parseInt(userId),
            user_type: userType as 'customer' | 'business_owner',
            email: userEmail || undefined,
          };
        }
        
        setUserInfo(info);
      }
    } catch (error) {
      console.error("Error loading user info:", error);
    }
  };

  /**
   * useFocusEffect: Fetch listings when screen comes into focus
   * This ensures listings are refreshed when navigating back to this screen
   */
  useFocusEffect(
    useCallback(() => {
      if (userInfo?.user_id) {
        fetchUserListings();
        api.get('/api/orders/provider')
          .then((res: any) => {
            const pending = (res.orders || []).filter((o: any) => o.status === 'pending').length;
            setPendingOrderCount(pending);
          })
          .catch(() => {});
        api.get('/api/thrift-requests/provider')
          .then((res: any) => {
            const pending = (res.requests || []).filter((r: any) => r.status === 'requested').length;
            setPendingThriftCount(pending);
          })
          .catch(() => {});
      }
    }, [userInfo?.user_id])
  );

  /**
   * Fetch all listings created by the current user from the backend
   * Called on mount, when screen focuses, and on manual refresh
   * UPDATED: January 5, 2026 - Using api.get() instead of fetch
   */
  const fetchUserListings = async () => {
    // Don't fetch if no user ID available
    if (!userInfo?.user_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching user listings for user:", userInfo.user_id);

      // UPDATED: Using api client instead of fetch
      const data = await api.get(`/api/service-posts/user/${userInfo.user_id}`);
      
      console.log("Received user listings:", data);

      // Update state if response is valid
      if (data.success && Array.isArray(data.posts)) {
        setListings(data.posts);
        setFilteredListings(data.posts);
   } else {
        setListings([]);
        setFilteredListings([]);
      }
    } catch (error: any) {
  console.error("Error fetching user listings:", error);
  if (error.status === 401 || error.message === 'Unauthorized') {
    // Session expired - the !isAuthenticated check above will show Sign In UI
    setListings([]);
    setFilteredListings([]);
    return;
  }
  Alert.alert("Error", "Failed to load your listings. Please try again.");
  setListings([]);
  setFilteredListings([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle pull-to-refresh action
   * Fetches latest listings from the backend
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserListings();
    setRefreshing(false);
  };

  /**
   * Effect: Filter listings based on search query
   * Searches through title, category, description, city, and state
   */
  useEffect(() => {
  // ✅ FIXED: Only show explicitly active listings
  let filtered = listings.filter(item => item.is_active === true);

  // Then apply search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.service_category.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.city?.toLowerCase().includes(query) ||
      item.state?.toLowerCase().includes(query)
    );
  }

  setFilteredListings(filtered);
}, [searchQuery, listings]);
  /**
   * Handle edit button press
   * Navigates directly to edit screen without confirmation dialog
   */
  const handleEditPress = (item: ServicePost) => {
    try {
      console.log("Navigating to EditListing with postId:", item.id);
      // Navigate directly without confirmation dialog
      navigation.navigate("EditListing", { postId: item.id });
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert(
        "Navigation Error",
        "Unable to open the edit screen. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  /**
   * Handle inactivate button press
   * Shows confirmation dialog before inactivating the listing
   */
  const handleInactivatePress = async (item: ServicePost) => {
    console.log('🔴 handleInactivatePress called for item:', item.id, item.title);
    
    Alert.alert(
      "Inactivate Listing",
      `Are you sure you want to inactivate "${item.title}"? This will hide it from other users.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Inactivate", 
          style: "destructive",
          onPress: () => inactivateListing(item.id)
        }
      ]
    );
  };

  /**
   * Inactivate a listing by ID
   * Makes API call to mark the listing as inactive
   * Refreshes the listing after successful inactivation
   * UPDATED: January 5, 2026 - Using api.patch() instead of fetch
   */
  const inactivateListing = async (postId: number) => {
    try {
      console.log('Attempting to inactivate post:', postId);
      
      // UPDATED: Using api client instead of fetch
      const data = await api.patch(`/api/service-posts/${postId}/inactivate`, {});

      console.log('Response data:', data);
      
      // Show success message and refresh listings
      if (data.success) {
        Alert.alert("Success", "Listing has been inactivated successfully.");
        // Refresh the listings to show updated status
        await fetchUserListings();
      } else {
        throw new Error(data.error || "Failed to inactivate listing");
      }
    } catch (error: any) {
      console.error("Error inactivating listing:", error);
      Alert.alert("Error", error.message || "Failed to inactivate listing. Please try again.");
    }
  };

  /**
   * Navigate to Home tab to browse services
   * Used when user wants to browse available services
   */
  const handleBrowseServices = () => {
    // Navigate to Home tab to browse services
    (navigation as any).navigate('Home', {
      customerInfo: undefined,
      isGuest: false,
      preselectedCategory: ""
    });
  };
   
  /**
   * Format date string to readable format (e.g., "Jan 15, 2024")
   */
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  /**
   * Render a single service listing card
   * Shows all listing details, status, and action buttons
   */
  const renderServiceCard = ({ item }: { item: ServicePost }) => (
    <View style={[styles.card, item.is_active === false && styles.inactiveCard]}>
      {/* Header with thumbnail, title, and badge */}
      <View style={styles.cardHeader}>
        {item.photos?.[0] ? (
          <Image source={{ uri: item.photos[0] }} style={styles.cardThumb} resizeMode="cover" />
        ) : null}
        <Text style={styles.serviceTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {/* Badge indicating post type: offer (green) or request (blue) */}
        <View style={[
          styles.badge,
          item.post_type === 'offer' ? styles.offerBadge : styles.requestBadge
        ]}>
          <Text style={styles.badgeText}>
            {item.post_type === 'offer' ? 'OFFERING' : 'REQUESTING'}
          </Text>
        </View>
      </View>

      {/* Status indicator for inactive listings */}
      {item.is_active === false && (
        <View style={styles.inactiveNotice}>
          <Ionicons name="eye-off-outline" size={16} color="#999" />
          <Text style={styles.inactiveText}>This listing is inactive</Text>
        </View>
      )}

      {/* Category with icon */}
      <View style={styles.infoRow}>
        <Ionicons name="pricetag-outline" size={18} color="#666" />
        <Text style={styles.categoryText}>{item.service_category}</Text>
      </View>

 {/* Description - parse admin response for category requests */}
{item.description && (() => {
  const parts = item.description.split('\n\n--- Admin Response ---\n');
  const originalDesc = parts[0];
  const adminResponse = parts[1];
  return (
    <>
      <Text style={styles.descriptionText} numberOfLines={3}>
        {originalDesc}
      </Text>
      {adminResponse && (
        <View style={styles.adminResponseBox}>
          <Text style={styles.adminResponseLabel}>
            {item.request_status === 'approved' ? '✅ Approved' : 
             item.request_status === 'rejected' ? '❌ Rejected' : 
             '⏳ Admin Response'}
          </Text>
          <Text style={styles.adminResponseText}>{adminResponse}</Text>
        </View>
      )}
    </>
  );
})()}

      {/* Price/Budget with icon */}
      {item.price && (
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={18} color="#2E7D32" />
          <Text style={styles.priceText}>
            {item.post_type === 'offer' ? 'Price: ' : 'Budget: '}
            {item.price}
          </Text>
        </View>
      )}

      {/* In Stock — only for payment-enabled categories */}
      {item.accepts_payment && item.in_stock != null && item.in_stock > 0 && (
        <View style={styles.infoRow}>
          <Ionicons name="cube-outline" size={18} color="#2E7D32" />
          <Text style={styles.priceText}>In stock: {item.in_stock}</Text>
        </View>
      )}

      {/* Location (city, state, zip code) with icon */}
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={18} color="#FF6B6B" />
        <Text style={styles.locationText}>
          {item.city && item.state 
            ? `${item.city}, ${item.state}` 
            : item.state || 'Location not specified'}
        </Text>
        {item.zip_code && (
          <Text style={styles.zipText}> • {item.zip_code}</Text>
        )}
      </View>

      {/* Contact information (email and phone) */}
      <View style={styles.contactSection}>
        {item.contact_email && (
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={16} color="#666" />
            <Text style={styles.contactText} numberOfLines={1}>
              {item.contact_email}
            </Text>
          </View>
        )}
        {item.phone_number && (
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color="#666" />
            <Text style={styles.contactText}>{item.phone_number}</Text>
          </View>
        )}
      </View>

      {/* Footer with posted date and action buttons (Edit, Inactivate) */}
      <View style={styles.cardFooter}>
        {item.created_at && (
          <Text style={styles.dateText}>
            Posted: {formatDate(item.created_at)}
          </Text>
        )}
        <View style={styles.actionButtons}>
          {/* Edit button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditPress(item)}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          {/* Inactivate button */}
          <TouchableOpacity
            style={styles.inactivateButton}
            onPress={() => handleInactivatePress(item)}
          >
            <Ionicons name="eye-off-outline" size={18} color="#fff" />
            <Text style={styles.inactivateButtonText}>Inactivate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Early return: Show sign-in required screen if user is not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="log-in-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Sign In Required</Text>
          <Text style={styles.emptySubtext}>
            You need to be signed in to access your listings
          </Text>
          {/* Sign In button - navigates to BusinessOwnerHomeScreen */}
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate("BusinessOwnerHomeScreen")}
            activeOpacity={0.7}
          >
            <Ionicons name="log-in-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.signInButtonText}>Sign In / Sign Up</Text>
          </TouchableOpacity>
          {/* Browse Services button - navigates to Home tab */}
          <TouchableOpacity
            style={styles.browseButton}
            onPress={handleBrowseServices}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={20} color="#4A90E2" style={styles.buttonIcon} />
            <Text style={styles.browseButtonText}>Browse Services</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>
            You can browse services without signing in
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state: Show spinner while fetching initial data (not during refresh)
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading your listings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main render: Show header, search bar, and listings
  return (
    <SafeAreaView style={styles.container}>
      {/* Header with title, listing count, and Calendar button */}
      <View style={styles.header}>
        <BackButton 
          iconColor="#fff"
          textColor="#fff"
          backgroundColor="transparent"
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>My Listings</Text>
          <Text style={styles.headerSubtitle}>
            {String(filteredListings.length)} {filteredListings.length === 1 ? 'listing' : 'listings'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.ordersButton}
            onPress={() => navigation.navigate('ThriftingRequestsScreen')}
          >
            <Ionicons name="shirt-outline" size={16} color="#fff" />
            <Text style={styles.ordersButtonText}>Thrift Requests</Text>
            {pendingThriftCount > 0 && (
              <View style={styles.ordersBadge}>
                <Text style={styles.ordersBadgeText}>{pendingThriftCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ordersButton}
            onPress={() => navigation.navigate('OrdersScreen')}
          >
            <Ionicons name="receipt-outline" size={16} color="#fff" />
            <Text style={styles.ordersButtonText}>Order History</Text>
            {pendingOrderCount > 0 && (
              <View style={styles.ordersBadge}>
                <Text style={styles.ordersBadgeText}>{pendingOrderCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* ✅ NEW: Calendar button */}
          <TouchableOpacity
            style={styles.calendarIconButton}
            onPress={() => navigation.navigate('CalendarScreen')}
          >
            <Ionicons name="calendar" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar with icon and clear button */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your listings..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {/* Show clear button only when there's text in search */}
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Listings or Empty State */}
      {filteredListings.length === 0 ? (
        // Empty state: No listings found (either no listings exist or search returned no results)
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchQuery ? "No listings match your search" : "No listings yet"}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery 
              ? "Try adjusting your search terms" 
              : "Create your first service listing to get started!"}
          </Text>
        </View>
      ) : (
        // FlatList: Display all filtered listings with pull-to-refresh
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => `listing-${item.id}`}
          renderItem={renderServiceCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4A90E2"]}
              tintColor="#4A90E2"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

// Styles: All styling for the component
const styles = createResponsiveStyles({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  loadingText: { fontSize: 16, color: "#666", marginTop: 10 },
  header: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingTop: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  headerTextContainer: {
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", textAlign: "center" },
  headerSubtitle: { fontSize: 14, color: "#fff", textAlign: "center", marginTop: 5, opacity: 0.9 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", margin: 15, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: "#333" },
  listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: "#e0e0e0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  inactiveCard: { opacity: 0.6, borderColor: "#ccc" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 10 },
  cardThumb: { width: 56, height: 56, borderRadius: 8, flexShrink: 0 },
  serviceTitle: { flex: 1, fontSize: 18, fontWeight: "bold", color: "#333", marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  offerBadge: { backgroundColor: "#4CAF50" },
  requestBadge: { backgroundColor: "#2196F3" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  inactiveNotice: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f5f5f5", padding: 8, borderRadius: 6, marginBottom: 10 },
  inactiveText: { fontSize: 13, color: "#999", fontStyle: "italic" },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  categoryText: { fontSize: 14, color: "#4A90E2", fontWeight: "600" },
  descriptionText: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 10 },
  priceText: { fontSize: 14, color: "#2E7D32", fontWeight: "600" },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 5 },
  locationText: { fontSize: 13, color: "#666" },
  zipText: { fontSize: 13, color: "#999" },
  contactSection: { marginBottom: 10, gap: 5 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactText: { fontSize: 13, color: "#666", flex: 1 },
  cardFooter: { flexDirection: "column", gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  dateText: { fontSize: 12, color: "#999", fontStyle: "italic" },
  actionButtons: { flexDirection: "row", gap: 10 },
  editButton: { flex: 1, backgroundColor: "#4A90E2", paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  editButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  inactivateButton: { flex: 1, backgroundColor: "#FF6B6B", paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  inactivateButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 15, textAlign: "center" },
  emptySubtext: { fontSize: 14, color: "#999", marginTop: 8, textAlign: "center", paddingHorizontal: 40, lineHeight: 20 },
  signInButton: { 
    marginTop: 20, 
    backgroundColor: "#4A90E2", 
    paddingVertical: 14, 
    paddingHorizontal: 40, 
    borderRadius: 10, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    width: "85%",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signInButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold", marginLeft: 8 },
  browseButton: {
    marginTop: 15,
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: "85%",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4A90E2",
    flexDirection: "row",
    justifyContent: "center",
  },
  browseButtonText: {
    color: "#4A90E2",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 4,
  },
  footerText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
  calendarIconButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  ordersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  ordersButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  ordersBadge: {
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  ordersBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  adminResponseBox: { 
  backgroundColor: '#F0F7FF', 
  borderLeftWidth: 3, 
  borderLeftColor: '#4A90E2', 
  padding: 8, 
  borderRadius: 4, 
  marginTop: 6 
},
adminResponseLabel: { 
  fontSize: 12, 
  fontWeight: '700', 
  color: '#4A90E2', 
  marginBottom: 4 
},
adminResponseText: { 
  fontSize: 13, 
  color: '#555', 
  lineHeight: 18 
},
});

export default ListingsScreen;