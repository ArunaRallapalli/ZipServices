import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import { useAuth } from "../contexts/AuthContext";
import API_URL from "../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AllListingsNavProp = NativeStackNavigationProp<RootStackParamList, "ListingsScreen">;


interface ServicePost {
  id: number;
  user_id: number;
  poster_type: string;
  post_type: string;
  title: string;
  description?: string;
  service_category: string;
  price_range?: string;
  phone_number?: string;
  contact_email?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  poster_name?: string;
  business_name?: string;
  created_at?: string;
  is_active?: boolean;
}

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
  
  const [listings, setListings] = useState<ServicePost[]>([]);
  const [filteredListings, setFilteredListings] = useState<ServicePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userInfo, setUserInfo] = useState<CustomerInfo | null>(null);

  // Check authentication and load user info
  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const [userId, userType, userEmail, storedUserInfo] = await Promise.all([
        AsyncStorage.getItem("userId"),
        AsyncStorage.getItem("userType"),
        AsyncStorage.getItem("userEmail"),
        AsyncStorage.getItem("userInfo")
      ]);

      if (userId && userType) {
        let info: CustomerInfo | null = null;
        
        if (storedUserInfo) {
          try {
            info = JSON.parse(storedUserInfo);
          } catch (e) {
            console.error("Error parsing user info:", e);
          }
        }
        
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

  // Load user's listings on mount and when screen focuses
  useFocusEffect(
    useCallback(() => {
      if (userInfo?.user_id) {
        fetchUserListings();
      }
    }, [userInfo?.user_id])
  );

  const fetchUserListings = async () => {
    if (!userInfo?.user_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching user listings from:", `${API_URL}/api/service-posts/user/${userInfo.user_id}`);

      const response = await fetch(`${API_URL}/api/service-posts/user/${userInfo.user_id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Received user listings:", data);

      if (data.success && Array.isArray(data.posts)) {
        setListings(data.posts);
        setFilteredListings(data.posts);
      } else {
        setListings([]);
        setFilteredListings([]);
      }
    } catch (error) {
      console.error("Error fetching user listings:", error);
      Alert.alert("Error", "Failed to load your listings. Please try again.");
      setListings([]);
      setFilteredListings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserListings();
    setRefreshing(false);
  };

  // Filter listings based on search query
  useEffect(() => {
    let filtered = listings;

    // Filter by search query
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

  const handleEditPress = (item: ServicePost) => {
    // Navigate to edit screen - adjust the navigation route as needed
    Alert.alert(
      "Edit Listing",
      "Navigate to edit screen for: " + item.title,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Edit", 
          onPress: () => {
            navigation.navigate("EditListing", { postId: item.id });
            console.log("Edit post:", item.id);
          }
        }
      ]
    );
  };

  const handleInactivatePress = async (item: ServicePost) => {
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
  const inactivateListing = async (postId: number) => {
  try {
    console.log('Attempting to inactivate post:', postId);
    console.log('API URL:', `${API_URL}/api/service-posts/${postId}/inactivate`);
    
    const response = await fetch(`${API_URL}/api/service-posts/${postId}/inactivate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      Alert.alert("Success", "Listing has been inactivated successfully.");
      // Refresh the listings
      await fetchUserListings();
    } else {
      throw new Error(data.error || "Failed to inactivate listing"); // ✅ Changed from data.message to data.error
    }
  } catch (error) {
    console.error("Error inactivating listing:", error);
    Alert.alert("Error", "Failed to inactivate listing. Please try again.");
  }
};

  const handleBrowseServices = () => {
    // Navigate to Home tab to browse services
    (navigation as any).navigate('Home', {
      customerInfo: undefined,
      isGuest: false,
      preselectedCategory: ""
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const renderServiceCard = ({ item }: { item: ServicePost }) => (
    <View style={[styles.card, item.is_active === false && styles.inactiveCard]}>
      {/* Header with title and badge */}
      <View style={styles.cardHeader}>
        <Text style={styles.serviceTitle} numberOfLines={2}>
          {item.title}
        </Text>
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

      {/* Category */}
      <View style={styles.infoRow}>
        <Ionicons name="pricetag-outline" size={18} color="#666" />
        <Text style={styles.categoryText}>{item.service_category}</Text>
      </View>

      {/* Description */}
      {item.description && (
        <Text style={styles.descriptionText} numberOfLines={3}>
          {item.description}
        </Text>
      )}

      {/* Price */}
      {item.price_range && (
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={18} color="#2E7D32" />
          <Text style={styles.priceText}>
            {item.post_type === 'offer' ? 'Price: ' : 'Budget: '}
            {item.price_range}
          </Text>
        </View>
      )}

      {/* Location */}
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

      {/* Contact info */}
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

      {/* Footer with date and action buttons */}
      <View style={styles.cardFooter}>
        {item.created_at && (
          <Text style={styles.dateText}>
            Posted: {formatDate(item.created_at)}
          </Text>
        )}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditPress(item)}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
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

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="log-in-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Sign In Required</Text>
          <Text style={styles.emptySubtext}>
            You need to be signed in to access your listings
          </Text>
        <TouchableOpacity
  style={styles.signInButton}
  onPress={() => navigation.navigate("BusinessOwnerHomeScreen")}  // ✅ Changed this
  activeOpacity={0.7}
          >
            <Ionicons name="log-in-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.signInButtonText}>Sign In / Sign Up</Text>
          </TouchableOpacity>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Listings</Text>
        <Text style={styles.headerSubtitle}>
          {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your listings..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Listings */}
      {filteredListings.length === 0 ? (
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  loadingText: { fontSize: 16, color: "#666", marginTop: 10 },
  header: { backgroundColor: "#4A90E2", paddingVertical: 20, paddingHorizontal: 20, paddingTop: 60 },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: "#fff", textAlign: "center" },
  headerSubtitle: { fontSize: 14, color: "#fff", textAlign: "center", marginTop: 5, opacity: 0.9 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", margin: 15, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: "#333" },
  listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: "#e0e0e0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  inactiveCard: { opacity: 0.6, borderColor: "#ccc" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
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
});

export default ListingsScreen;