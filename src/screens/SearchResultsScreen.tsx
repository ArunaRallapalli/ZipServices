import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../contexts/AuthContext";
import { useRoute, RouteProp, useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../config/apiConfig";

import {
  Ionicons,
  FontAwesome,
  MaterialCommunityIcons,
  AntDesign,
  FontAwesome5,
  MaterialIcons,
} from "@expo/vector-icons";

const ZIP_API = "https://api.zippopotam.us/us";

type SearchResultsRouteProp = RouteProp<
  RootStackParamList,
  "SearchResultsScreen"
>;
type SearchResultsNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "SearchResultsScreen"
>;

interface ServicePost {
  post_id: number;
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

interface SearchResults {
  exactMatches: ServicePost[];
  nearbyMatches: ServicePost[];
  hasExactMatches: boolean;
  hasNearbyMatches: boolean;
}

// Enhanced popular categories with more colorful icons and additional categories
const popularCategories = [
  { name: "Catering",    family: "Ionicons",              icon: "restaurant",        color: "#FF6B6B", bgColor: "#FFE5E5" },
  { name: "Beauty",      family: "FontAwesome",           icon: "paint-brush",       color: "#FF8C00", bgColor: "#FFF2E5" },
  { name: "Decoration",  family: "Ionicons",              icon: "color-palette",     color: "#1E90FF", bgColor: "#E5F2FF" },
  { name: "Tailoring",   family: "MaterialCommunityIcons",icon: "tshirt-crew",       color: "#32CD32", bgColor: "#E8F5E8" },
  { name: "Cleaning",    family: "MaterialCommunityIcons",icon: "broom",             color: "#BA55D3", bgColor: "#F5E8F5" },
  { name: "Plumbing",    family: "MaterialCommunityIcons",icon: "wrench",            color: "#FF4500", bgColor: "#FFE8E0" },
];

const SearchResultsScreen: React.FC = () => {
  const route = useRoute<SearchResultsRouteProp>();
  const navigation = useNavigation<SearchResultsNavProp>();
  
  // Enhanced route params handling
  const routeParams = route.params || {};
  const customerInfo: CustomerInfo | undefined = routeParams.customerInfo;
  const isGuest = routeParams.isGuest || false;
  const preselectedCategory = routeParams.preselectedCategory || "";
  
  // State for authentication status with better initialization
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userToken: null as string | null,
    userType: null as string | null,
    userId: null as number | null,
    userInfo: null as CustomerInfo | null,
    loading: true,
    initialized: false
  });

  const [zipCode, setZipCode] = useState(customerInfo?.zip_code || "");
  const [city, setCity] = useState(customerInfo?.city || "");
  const [state, setState] = useState(customerInfo?.state || "");
  const [serviceNeeded, setServiceNeeded] = useState(preselectedCategory || "");
  const [categories, setCategories] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResults>({
    exactMatches: [],
    nearbyMatches: [],
    hasExactMatches: false,
    hasNearbyMatches: false
  });
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  const zipDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Enhanced authentication check function
  const checkAuthStatus = useCallback(async (showDebug = false) => {
    try {
      const [token, userType, userId, userEmail, storedUserInfo] = await Promise.all([
        AsyncStorage.getItem("userToken"),
        AsyncStorage.getItem("userType"),
        AsyncStorage.getItem("userId"),
        AsyncStorage.getItem("userEmail"),
        AsyncStorage.getItem("userInfo")
      ]);

      if (showDebug) {
        console.log("🔍 SearchResults Auth Check:", {
          hasToken: !!token,
          userType,
          userId,
          hasStoredInfo: !!storedUserInfo,
          timestamp: new Date().toISOString()
        });
      }

      const isAuthenticated = !!(token && userType);
      let userInfo: CustomerInfo | null = null;

      if (customerInfo) {
        userInfo = customerInfo;
      } else if (storedUserInfo) {
        try {
          userInfo = JSON.parse(storedUserInfo);
        } catch (parseError) {
          console.error("Error parsing stored user info:", parseError);
        }
      } else if (isAuthenticated && userId) {
        userInfo = {
          user_id: parseInt(userId),
          user_type: userType as 'customer' | 'business_owner',
          email: userEmail || undefined,
        };
      }

      setAuthState(prevState => ({
        ...prevState,
        isAuthenticated,
        userToken: token,
        userType,
        userId: userId ? parseInt(userId) : null,
        userInfo,
        loading: false,
        initialized: true
      }));

      return { isAuthenticated, userInfo };
    } catch (error) {
      console.error("Error checking auth status:", error);
      setAuthState(prevState => ({
        ...prevState,
        isAuthenticated: false,
        userToken: null,
        userType: null,
        userId: null,
        userInfo: null,
        loading: false,
        initialized: true
      }));
      return { isAuthenticated: false, userInfo: null };
    }
  }, [customerInfo]);

  // Check authentication on component mount
  useEffect(() => {
    if (isInitialMount.current) {
      checkAuthStatus(true);
      isInitialMount.current = false;
    }
  }, [checkAuthStatus]);

  // Re-check authentication when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!isInitialMount.current) {
        console.log("🔄 Screen focused, refreshing auth status");
        checkAuthStatus(true);
      }
    }, [checkAuthStatus])
  );

  // Enhanced chat press handler
  const handleChatPress = async (item: ServicePost) => {
    const { isAuthenticated, userInfo } = await checkAuthStatus();

    if (!isAuthenticated || !userInfo?.user_id) {
      Alert.alert(
        "Sign In Required",
        "You need to be signed in to chat with service providers. Would you like to sign in now?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: handleSignIn, style: "default" }
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
      Alert.alert("Navigation Error", "Unable to open chat. Please try again.");
    }
  };

  const handleSignIn = () => {
    try {
      navigation.navigate("ZipserviceHomeScreenSelection");
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Unable to navigate to sign-in screen");
    }
  };

  const refreshAuthStatus = async () => {
    console.log("🔄 Manually refreshing auth status...");
    await checkAuthStatus(true);
  };

  // Fetch service categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch(`${API_URL}/api/service-categories`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
        
        if (preselectedCategory && data.categories.includes(preselectedCategory)) {
          setServiceNeeded(preselectedCategory);
        } else if (!serviceNeeded && data.categories.length > 0) {
          setServiceNeeded(data.categories[0]);
        }
      }
    } catch (err: any) {
      console.error("Category fetch error:", err);
      // Fallback categories
      const fallbackCategories = [
        'Cleaning', 'Plumbing', 'Electrical', 'Landscaping',
        'Home Repair', 'Pet Care', 'Moving', 'Tutoring',
        'Photography', 'Catering', 'Beauty', 'Decoration', 'Tailoring'
      ];
      setCategories(fallbackCategories);
      if (!serviceNeeded && fallbackCategories.length > 0) {
        setServiceNeeded(fallbackCategories[0]);
      }
    } finally {
      setLoadingCategories(false);
    }
  }, [preselectedCategory, serviceNeeded]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Auto-search if preselected category is provided
  useEffect(() => {
    if (preselectedCategory && categories.length > 0 && !loading && !hasSearched && authState.initialized) {
      setTimeout(() => {
        searchServicePosts();
      }, 500);
    }
  }, [preselectedCategory, categories, loading, hasSearched, authState.initialized]);

  // Auto-populate city/state based on zip
  useEffect(() => {
    if (!zipCode || zipCode.length < 5) {
      if (!authState.userInfo?.city) setCity("");
      if (!authState.userInfo?.state) setState("");
      return;
    }

    if (zipDebounceRef.current) clearTimeout(zipDebounceRef.current);

    zipDebounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${ZIP_API}/${zipCode}`);
        if (!response.ok) {
          if (!authState.userInfo?.city) setCity("");
          if (!authState.userInfo?.state) setState("");
          return;
        }
        const data = await response.json();
        if (!authState.userInfo?.city) setCity(data.places[0]["place name"]);
        if (!authState.userInfo?.state) setState(data.places[0]["state abbreviation"]);
      } catch (err) {
        console.error("Zip fetch error:", err);
        if (!authState.userInfo?.city) setCity("");
        if (!authState.userInfo?.state) setState("");
      }
    }, 500);
  }, [zipCode, authState.userInfo]);

  const searchServicePosts = async () => {
    if (!serviceNeeded) {
      Alert.alert("Error", "Please select a service category");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      params.append("service_category", serviceNeeded);
      if (zipCode) params.append("zip_code", zipCode);
      if (city) params.append("city", city);
      if (state) params.append("state", state);

      console.log("🔍 Searching service posts:", `${API_URL}/api/service-posts/search?${params.toString()}`);

      const response = await fetch(`${API_URL}/api/service-posts/search?${params.toString()}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${text}`);
      }

      const data = await response.json();
      console.log("📥 Search results:", data);

      if (data.success) {
        let exactMatches = Array.isArray(data.exactMatches) ? data.exactMatches : [];
        let nearbyMatches = Array.isArray(data.nearbyMatches) ? data.nearbyMatches : [];
        let hasExactMatches = data.hasExactMatches || false;
        let hasNearbyMatches = data.hasNearbyMatches || false;

        // If no exact matches and state is available, search for all services in the state
        if (!hasExactMatches && state && !hasNearbyMatches) {
          console.log("🔍 No exact matches, searching entire state:", state);
          const stateParams = new URLSearchParams();
          stateParams.append("service_category", serviceNeeded);
          stateParams.append("state", state);

          const stateResponse = await fetch(`${API_URL}/api/service-posts/search?${stateParams.toString()}`);
          if (stateResponse.ok) {
            const stateData = await stateResponse.json();
            if (stateData.success && Array.isArray(stateData.exactMatches) && stateData.exactMatches.length > 0) {
              nearbyMatches = stateData.exactMatches;
              hasNearbyMatches = true;
            }
          }
        }

        setSearchResults({
          exactMatches,
          nearbyMatches,
          hasExactMatches,
          hasNearbyMatches
        });
      } else {
        setSearchResults({
          exactMatches: [],
          nearbyMatches: [],
          hasExactMatches: false,
          hasNearbyMatches: false
        });
      }
    } catch (err: any) {
      console.error("Search fetch error:", err);
      Alert.alert("Error", err.message);
      setSearchResults({
        exactMatches: [],
        nearbyMatches: [],
        hasExactMatches: false,
        hasNearbyMatches: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryTilePress = (categoryName: string) => {
    setServiceNeeded(categoryName);
    setTimeout(() => {
      searchServicePosts();
    }, 100);
  };

  const renderCategoryTile = (category: any, index: number) => {
    let IconComponent: any;
    
    switch (category.family) {
      case "Ionicons":
        IconComponent = Ionicons;
        break;
      case "FontAwesome":
        IconComponent = FontAwesome;
        break;
      case "FontAwesome5":
        IconComponent = FontAwesome5;
        break;
      case "MaterialCommunityIcons":
        IconComponent = MaterialCommunityIcons;
        break;
      case "MaterialIcons":
        IconComponent = MaterialIcons;
        break;
      case "AntDesign":
        IconComponent = AntDesign;
        break;
      default:
        IconComponent = Ionicons;
        category.icon = "help-circle-outline";
    }

    return (
      <TouchableOpacity
        key={`category-${index}-${category.name}`}
        style={[
          styles.categoryTile,
          { backgroundColor: category.bgColor, borderColor: category.color }
        ]}
        onPress={() => handleCategoryTilePress(category.name)}
        activeOpacity={0.7}
      >
        <IconComponent 
          name={category.icon} 
          size={24} 
          color={category.color}
          suppressHighlighting={true}
        />
        <Text style={[styles.categoryTileText, { color: category.color }]}>
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderServicePostCard = (item: ServicePost) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <View style={[
          styles.badge,
          item.post_type === 'offer' ? styles.offerBadge : styles.requestBadge
        ]}>
          <Text style={styles.badgeText}>
            {item.post_type === 'offer' ? 'OFFERING' : 'REQUESTING'}
          </Text>
        </View>
      </View>
      
      {item.poster_name && (
        <Text style={styles.posterName}>
          Posted by: {item.poster_name}
        </Text>
      )}
      
      <Text style={styles.categoryText}>
        Category: {item.service_category}
      </Text>
      
      {item.description && (
        <Text style={styles.descriptionText} numberOfLines={3}>
          {item.description}
        </Text>
      )}
      
      {item.price_range && (
        <Text style={styles.priceText}>
          {item.post_type === 'offer' ? 'Price' : 'Budget'}: {item.price_range}
        </Text>
      )}
      
      <View style={styles.locationContainer}>
        {item.city && item.state && (
          <Text style={styles.locationText}>
            📍 {item.city}, {item.state}
          </Text>
        )}
        {item.zip_code && (
          <Text style={styles.locationText}>Zip: {item.zip_code}</Text>
        )}
      </View>
      
      {item.contact_email && (
        <Text style={styles.contactText}>✉️ {item.contact_email}</Text>
      )}
      
      {item.phone_number && (
        <Text style={styles.contactText}>📞 {item.phone_number}</Text>
      )}

      <TouchableOpacity
        style={[
          styles.chatButton,
          !authState.isAuthenticated && styles.chatButtonDisabled
        ]}
        onPress={() => handleChatPress(item)}
      >
        <Ionicons name="chatbubble-outline" size={16} color="#fff" />
        <Text style={styles.chatButtonText}>
          {authState.isAuthenticated ? " Contact" : " Sign In to Contact"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!authState.initialized || loadingCategories) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>
            {!authState.initialized ? "Checking authentication..." : "Loading categories..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Find Local Services</Text>
          <Text style={styles.subtitle}>
            Connect with service providers and find what you need
          </Text>
          
          {authState.isAuthenticated ? (
            <View style={styles.welcomeContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.welcomeText}>
                Welcome{authState.userInfo?.full_name ? `, ${authState.userInfo.full_name}` : ''}!
              </Text>
            </View>
          ) : (
            <>
              {(isGuest || !authState.isAuthenticated) && (
                <View style={styles.guestModeContainer}>
                  <Ionicons name="information-circle-outline" size={20} color="#ffffff" />
                  <Text style={styles.guestModeText}>
                    Browsing as guest - Sign in for full features
                  </Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
                <Ionicons name="person-outline" size={20} color="#ffffff" />
                <Text style={styles.signInButtonText}>Sign In to Get Started</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.formLabel}>Service Category:</Text>
          <View style={styles.pickerContainer}>
            <Picker 
              selectedValue={serviceNeeded} 
              onValueChange={setServiceNeeded}
              enabled={categories.length > 0}
            >
              {categories.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>

          <View style={styles.locationRow}>
            <TextInput
              style={[styles.input, styles.locationInput]}
              placeholder="Zip Code"
              keyboardType="numeric"
              value={zipCode}
              onChangeText={setZipCode}
            />
            <TextInput
              style={[styles.input, styles.locationInput]}
              placeholder="City"
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={[styles.input, styles.locationInput]}
              placeholder="State"
              value={state}
              onChangeText={setState}
            />
          </View>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={searchServicePosts}
            disabled={!serviceNeeded}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Popular Service Categories</Text>

          <View style={styles.tilesContainer}>
            {popularCategories.map(renderCategoryTile)}
          </View>

          <Text style={styles.browseText}>
            Browse our most requested services and find what you need
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 20 }} />
          ) : hasSearched ? (
            <>
              {/* Exact Matches Section */}
              {searchResults.hasExactMatches && (
                <>
                  <Text style={styles.sectionTitle}>
                    Services in Your Area ({searchResults.exactMatches.length})
                  </Text>
                  <FlatList
                    data={searchResults.exactMatches}
                    keyExtractor={(item) => `exact-${item.post_id}`}
                    style={{ marginTop: 10 }}
                    scrollEnabled={false}
                    removeClippedSubviews={false}
                    renderItem={({ item }) => renderServicePostCard(item)}
                  />
                </>
              )}

              {/* Nearby Matches Section */}
              {!searchResults.hasExactMatches && searchResults.hasNearbyMatches && (
                <>
                  <View style={styles.noticeContainer}>
                    <Ionicons name="information-circle" size={24} color="#FF8C00" />
                    <Text style={styles.noticeText}>
                      No services found in {zipCode || city || 'your area'}, but here are options available in {state || 'your state'}:
                    </Text>
                  </View>
                  <Text style={styles.sectionTitle}>
                    Services in {state || 'Your State'} ({searchResults.nearbyMatches.length})
                  </Text>
                  <FlatList
                    data={searchResults.nearbyMatches}
                    keyExtractor={(item) => `nearby-${item.post_id}`}
                    style={{ marginTop: 10 }}
                    scrollEnabled={false}
                    removeClippedSubviews={false}
                    renderItem={({ item }) => renderServicePostCard(item)}
                  />
                </>
              )}

              {/* No Results */}
              {!searchResults.hasExactMatches && !searchResults.hasNearbyMatches && (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={64} color="#ccc" />
                  <Text style={styles.noResultsText}>
                    No services found for "{serviceNeeded}"
                  </Text>
                  <Text style={styles.noResultsSubtext}>
                    Try adjusting your search criteria or browse other categories
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <Text style={styles.noResultsText}>
                Search for services in your area
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  scrollContainer: { flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  loadingText: { fontSize: 16, color: "#666" },
  headerSection: { backgroundColor: "#4A90E2", paddingVertical: 30, paddingHorizontal: 20, paddingTop: 60 },
  mainTitle: { fontSize: 28, fontWeight: "bold", color: "#ffffff", textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 16, color: "#ffffff", textAlign: "center", lineHeight: 22, opacity: 0.9, marginBottom: 15 },
  guestModeContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 165, 0, 0.2)", paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, alignSelf: "center", marginBottom: 10, borderWidth: 1, borderColor: "rgba(255, 165, 0, 0.3)" },
  guestModeText: { color: "#ffffff", fontSize: 14, fontWeight: "600", marginLeft: 8 },
  signInButton: { backgroundColor: "rgba(255, 255, 255, 0.2)", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, flexDirection: "row", alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 10, borderWidth: 2, borderColor: "rgba(255, 255, 255, 0.3)" },
  signInButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "bold", marginLeft: 8 },
  welcomeContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(76, 175, 80, 0.2)", paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, alignSelf: "center", marginTop: 10 },
  welcomeText: { color: "#ffffff", fontSize: 14, fontWeight: "600", marginLeft: 8 },
  searchSection: { backgroundColor: "#A7CCF6", paddingVertical: 25, paddingHorizontal: 20 },
  formLabel: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 8 },
  pickerContainer: { borderWidth: 1, borderColor: "#ffffff", borderRadius: 8, backgroundColor: "#ffffff", marginBottom: 15 },
  locationRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#ffffff", backgroundColor: "#ffffff", padding: 12, borderRadius: 8, fontSize: 16 },
  locationInput: { flex: 0.32 },
  searchButton: { backgroundColor: "#4A90E2", paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, alignItems: "center" },
  searchButtonText: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
  contentSection: { backgroundColor: "#ffffff", flex: 1, paddingHorizontal: 20, paddingTop: 25 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 15, marginTop: 10 },
  tilesContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
  categoryTile: { width: "30%", aspectRatio: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5, padding: 8 },
  categoryTileText: { fontSize: 11, textAlign: "center", marginTop: 4, fontWeight: "bold" },
  browseText: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 25, lineHeight: 20, fontStyle: "italic" },
  noticeContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF4E5", padding: 15, borderRadius: 8, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: "#FF8C00" },
  noticeText: { flex: 1, fontSize: 14, color: "#333", marginLeft: 10, lineHeight: 20 },
  card: { borderWidth: 1, borderColor: "#e0e0e0", padding: 15, marginBottom: 15, borderRadius: 12, backgroundColor: "#fafafa" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  serviceTitle: { flex: 1, fontWeight: "bold", fontSize: 18, color: "#333", marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  offerBadge: { backgroundColor: "#4CAF50" },
  requestBadge: { backgroundColor: "#2196F3" },
  badgeText: { color: "#ffffff", fontSize: 10, fontWeight: "bold" },
  posterName: { fontSize: 14, color: "#666", marginBottom: 4, fontStyle: "italic" },
  categoryText: { fontSize: 14, color: "#4A90E2", marginBottom: 8, fontWeight: "600" },
  descriptionText: { fontSize: 14, color: "#666", marginBottom: 8, lineHeight: 20 },
  priceText: { fontSize: 14, color: "#2E7D32", fontWeight: "600", marginBottom: 8 },
  locationContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  locationText: { fontSize: 13, color: "#666", marginRight: 15, marginBottom: 4 },
  contactText: { fontSize: 13, color: "#666", marginBottom: 4 },
  chatButton: { marginTop: 12, backgroundColor: "#4A90E2", paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  chatButtonDisabled: { backgroundColor: "#999" },
  chatButtonText: { color: "#ffffff", fontWeight: "bold", fontSize: 16 },
  noResultsContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  noResultsText: { marginTop: 20, fontSize: 18, fontWeight: "600", color: "#666", textAlign: "center" },
  noResultsSubtext: { marginTop: 8, fontSize: 14, color: "#999", textAlign: "center", paddingHorizontal: 20 },
});

export default SearchResultsScreen;