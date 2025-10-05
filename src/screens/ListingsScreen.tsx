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
  const [filterType, setFilterType] = useState<"all" | "offer" | "request">("all");
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

  // Load all listings on mount and when screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchAllListings();
    }, [])
  );

  const fetchAllListings = async () => {
    try {
      setLoading(true);
      console.log("Fetching all listings from:", `${API_URL}/api/service-posts/all`);

      const response = await fetch(`${API_URL}/api/service-posts/all`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Received listings:", data);

      if (data.success && Array.isArray(data.posts)) {
        setListings(data.posts);
        setFilteredListings(data.posts);
      } else {
        setListings([]);
        setFilteredListings([]);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
      Alert.alert("Error", "Failed to load service listings. Please try again.");
      setListings([]);
      setFilteredListings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllListings();
    setRefreshing(false);
  };

  // Filter listings based on search and filter type
  useEffect(() => {
    let filtered = listings;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(item => item.post_type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.service_category.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.city?.toLowerCase().includes(query) ||
        item.state?.toLowerCase().includes(query) ||
        item.poster_name?.toLowerCase().includes(query)
      );
    }

    setFilteredListings(filtered);
  }, [searchQuery, filterType, listings]);

  const handleChatPress = async (item: ServicePost) => {
    if (!isAuthenticated || !userInfo?.user_id) {
      Alert.alert(
        "Sign In Required",
        "You need to be signed in to contact service providers.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Sign In", 
            onPress: () => navigation.navigate("ZipserviceHomeScreenSelection"),
            style: "default" 
          }
        ]
      );
      return;
    }

    try {
      navigation.navigate("CustomerChatScreen", {
        businessOwnerId: item.user_id,
        businessName: item.business_name || item.poster_name || item.title,
        customerId: userInfo.user_id,
        customerInfo: userInfo,
      });
    } catch (error) {
      console.error("Chat navigation error:", error);
      Alert.alert("Error", "Unable to open chat. Please try again.");
    }
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
    <View style={styles.card}>
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

      {/* Provider info */}
      <View style={styles.providerSection}>
        <Ionicons name="person-circle-outline" size={20} color="#4A90E2" />
        <Text style={styles.providerName}>
          {item.business_name || item.poster_name || 'Service Provider'}
        </Text>
        {item.poster_type === 'business_owner' && (
          <View style={styles.businessBadge}>
            <Text style={styles.businessBadgeText}>Business</Text>
          </View>
        )}
      </View>

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

      {/* Footer with date and chat button */}
      <View style={styles.cardFooter}>
        {item.created_at && (
          <Text style={styles.dateText}>
            Posted: {formatDate(item.created_at)}
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.chatButton,
            !isAuthenticated && styles.chatButtonDisabled
          ]}
          onPress={() => handleChatPress(item)}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.chatButtonText}>
            {isAuthenticated ? "Contact" : "Sign In"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Service Listings</Text>
        <Text style={styles.headerSubtitle}>
          {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'} available
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, category, location..."
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

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filterType === "all" && styles.filterButtonActive]}
          onPress={() => setFilterType("all")}
        >
          <Text style={[styles.filterButtonText, filterType === "all" && styles.filterButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === "offer" && styles.filterButtonActive]}
          onPress={() => setFilterType("offer")}
        >
          <Text style={[styles.filterButtonText, filterType === "offer" && styles.filterButtonTextActive]}>
            Offers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === "request" && styles.filterButtonActive]}
          onPress={() => setFilterType("request")}
        >
          <Text style={[styles.filterButtonText, filterType === "request" && styles.filterButtonTextActive]}>
            Requests
          </Text>
        </TouchableOpacity>
      </View>

      {/* Listings */}
      {filteredListings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchQuery ? "No listings match your search" : "No listings available"}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery 
              ? "Try adjusting your search terms" 
              : "Be the first to post a service!"}
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
  filterContainer: { flexDirection: "row", paddingHorizontal: 15, marginBottom: 15, gap: 10 },
  filterButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 15, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  filterButtonActive: { backgroundColor: "#4A90E2", borderColor: "#4A90E2" },
  filterButtonText: { fontSize: 14, fontWeight: "600", color: "#666" },
  filterButtonTextActive: { color: "#fff" },
  listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: "#e0e0e0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  serviceTitle: { flex: 1, fontSize: 18, fontWeight: "bold", color: "#333", marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  offerBadge: { backgroundColor: "#4CAF50" },
  requestBadge: { backgroundColor: "#2196F3" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  providerSection: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  providerName: { fontSize: 15, fontWeight: "600", color: "#333", flex: 1 },
  businessBadge: { backgroundColor: "#FFA500", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  businessBadgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
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
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  dateText: { fontSize: 12, color: "#999", fontStyle: "italic" },
  chatButton: { backgroundColor: "#4A90E2", paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 5 },
  chatButtonDisabled: { backgroundColor: "#999" },
  chatButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 15, textAlign: "center" },
  emptySubtext: { fontSize: 14, color: "#999", marginTop: 8, textAlign: "center", paddingHorizontal: 40 },
});

export default ListingsScreen;