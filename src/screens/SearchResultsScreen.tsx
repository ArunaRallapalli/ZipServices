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
  RefreshControl,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../contexts/AuthContext";
import { useRoute, RouteProp, useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, TabParamList } from "../navigation/MainStackNavigator";
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

type SearchResultsRouteProp = RouteProp<TabParamList, "Home">;
type SearchResultsNavProp = NativeStackNavigationProp<RootStackParamList>;

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
  zipCodeMatches: ServicePost[];
  stateMatches: ServicePost[];
  hasZipCodeMatches: boolean;
  hasStateMatches: boolean;
}

const popularCategories = [
  { name: "Catering", family: "Ionicons", icon: "restaurant", color: "#FF6B6B", bgColor: "#FFE5E5" },
  { name: "Beauty Services", family: "FontAwesome", icon: "paint-brush", color: "#FF8C00", bgColor: "#FFF2E5" },
  { name: "Decorations", family: "Ionicons", icon: "color-palette", color: "#1E90FF", bgColor: "#E5F2FF" },
  { name: "Tailoring", family: "MaterialCommunityIcons", icon: "tshirt-crew", color: "#32CD32", bgColor: "#E8F5E8" },
  { name: "Cleaning", family: "MaterialCommunityIcons", icon: "broom", color: "#BA55D3", bgColor: "#F5E8F5" },
  { name: "Plumbing", family: "MaterialCommunityIcons", icon: "wrench", color: "#FF4500", bgColor: "#FFE8E0" },
];

const SearchResultsScreen: React.FC = () => {
  const route = useRoute<SearchResultsRouteProp>();
  const navigation = useNavigation<SearchResultsNavProp>();
  
  const routeParams = route.params || {};
  const customerInfo: CustomerInfo | undefined = routeParams.customerInfo;
  const isGuest = routeParams.isGuest || false;
  const preselectedCategory = routeParams.preselectedCategory || "";
  
  const auth = useAuth();

  // IMPORTANT: Helper function to check if post belongs to current user
  const isOwnPost = (postUserId: number): boolean => {
    return auth.userInfo?.user_id === postUserId;
  };

  const [zipCode, setZipCode] = useState(customerInfo?.zip_code || "");
  const [city, setCity] = useState(customerInfo?.city || "");
  const [state, setState] = useState(customerInfo?.state || "");
  const [serviceNeeded, setServiceNeeded] = useState(preselectedCategory || "");
  const [categories, setCategories] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResults>({
    zipCodeMatches: [],
    stateMatches: [],
    hasZipCodeMatches: false,
    hasStateMatches: false
  });
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isZipValid, setIsZipValid] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const zipDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  const handleChatPress = async (item: ServicePost) => {
    if (!auth.isAuthenticated || !auth.userInfo?.user_id) {
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

    // CRITICAL FIX: Prevent messaging yourself
    if (isOwnPost(item.user_id)) {
      Alert.alert(
        "Cannot Contact Yourself",
        "This is your own post. You cannot send messages to yourself.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    try {
      navigation.navigate("CustomerChatScreen", {
        businessOwnerId: item.user_id,
        businessName: item.business_name || item.poster_name || item.title,
        customerId: auth.userInfo.user_id,
        customerInfo: auth.userInfo,
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await searchServicePosts();
    setRefreshing(false);
  }, []);

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

  useEffect(() => {
    if (preselectedCategory && categories.length > 0 && !loading && !hasSearched && auth.initialized && isZipValid && zipCode) {
      setTimeout(() => {
        searchServicePosts();
      }, 500);
    }
  }, [preselectedCategory, categories, loading, hasSearched, auth.initialized, isZipValid, zipCode]);

  useEffect(() => {
    if (serviceNeeded && isZipValid && zipCode && state && !loading && hasSearched) {
      searchServicePosts();
    }
  }, [serviceNeeded]);

  const knownZipCodes: { [key: string]: { city: string; state: string } } = {
    '85288': { city: 'Tempe', state: 'AZ' },
  };

  useEffect(() => {
    if (!zipCode || zipCode.length !== 5) {
      setCity("");
      setState("");
      setIsZipValid(false);
      return;
    }

    if (zipDebounceRef.current) clearTimeout(zipDebounceRef.current);

    zipDebounceRef.current = setTimeout(async () => {
      if (knownZipCodes[zipCode]) {
        const location = knownZipCodes[zipCode];
        setCity(location.city);
        setState(location.state);
        setIsZipValid(true);
        console.log(`✅ Known ZIP code: ${zipCode} -> ${location.city}, ${location.state}`);
        return;
      }

      try {
        console.log(`🔍 Fetching location data for ZIP: ${zipCode}`);
        const response = await fetch(`${ZIP_API}/${zipCode}`);
        
        if (!response.ok) {
          console.log(`❌ ZIP code not found in API: ${zipCode}`);
          setCity("");
          setState("");
          setIsZipValid(false);
          Alert.alert(
            "ZIP Code Not Found", 
            "This ZIP code could not be verified. If this is a valid ZIP code, please enter your city and state manually.",
            [{ text: "OK" }]
          );
          return;
        }
        
        const data = await response.json();
        console.log(`✅ ZIP data received:`, data);
        
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          const cityName = place["place name"];
          const stateAbbr = place["state abbreviation"];
          
          setCity(cityName);
          setState(stateAbbr);
          setIsZipValid(true);
          console.log(`📍 Location set: ${cityName}, ${stateAbbr}`);
        } else {
          setCity("");
          setState("");
          setIsZipValid(false);
        }
      } catch (err) {
        console.error("❌ Zip fetch error:", err);
        setCity("");
        setState("");
        setIsZipValid(false);
        Alert.alert("Error", "Unable to validate ZIP code. Please check your internet connection.");
      }
    }, 500);

    return () => {
      if (zipDebounceRef.current) clearTimeout(zipDebounceRef.current);
    };
  }, [zipCode]);

  const searchServicePosts = async () => {
    if (!serviceNeeded) {
      Alert.alert("Error", "Please select a service category");
      return;
    }

    if (!zipCode || zipCode.length !== 5) {
      Alert.alert("Invalid ZIP Code", "Please enter a valid 5-digit ZIP code");
      return;
    }

    if (!isZipValid && (!city || !state)) {
      Alert.alert("Location Required", "Please enter your city and state manually, or try a different ZIP code.");
      return;
    }

    if (!state) {
      Alert.alert("State Required", "Please enter your state to search for services");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setShowResults(true);

    try {
      const zipParams = new URLSearchParams();
      zipParams.append("service_category", serviceNeeded);
      zipParams.append("zip_code", zipCode);

      console.log("🔍 Searching service posts by ZIP code:", `${API_URL}/api/service-posts/search?${zipParams.toString()}`);

      const zipResponse = await fetch(`${API_URL}/api/service-posts/search?${zipParams.toString()}`);
      
      let zipMatches: ServicePost[] = [];
      if (zipResponse.ok) {
        const zipData = await zipResponse.json();
        console.log("📥 ZIP code search results:", zipData);
        if (zipData.success && Array.isArray(zipData.exactMatches)) {
          zipMatches = zipData.exactMatches;
        }
      }

      const stateParams = new URLSearchParams();
      stateParams.append("service_category", serviceNeeded);
      stateParams.append("state", state);

      console.log("🔍 Searching service posts by state:", `${API_URL}/api/service-posts/search?${stateParams.toString()}`);

      const stateResponse = await fetch(`${API_URL}/api/service-posts/search?${stateParams.toString()}`);
      
      let stateMatches: ServicePost[] = [];
      if (stateResponse.ok) {
        const stateData = await stateResponse.json();
        console.log("📥 State search results:", stateData);
        if (stateData.success && Array.isArray(stateData.exactMatches)) {
          stateMatches = stateData.exactMatches.filter(
            (statePost: ServicePost) => !zipMatches.some(zipPost => zipPost.post_id === statePost.post_id)
          );
        }
      }

      setSearchResults({
        zipCodeMatches: zipMatches,
        stateMatches: stateMatches,
        hasZipCodeMatches: zipMatches.length > 0,
        hasStateMatches: stateMatches.length > 0
      });

    } catch (err: any) {
      console.error("Search fetch error:", err);
      Alert.alert("Error", err.message);
      setSearchResults({
        zipCodeMatches: [],
        stateMatches: [],
        hasZipCodeMatches: false,
        hasStateMatches: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryTilePress = (categoryName: string) => {
    setServiceNeeded(categoryName);
    
    if (!zipCode || !isZipValid) {
      Alert.alert("ZIP Code Required", "Please enter a valid ZIP code before searching");
      return;
    }
    
    setHasSearched(true);
  };

  const handleBackToSearch = () => {
    setShowResults(false);
    setHasSearched(false);
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

  const renderServicePostCard = (item: ServicePost) => {
    const isOwn = isOwnPost(item.user_id);
    
    return (
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
        
        {isOwn && (
          <View style={styles.ownPostBanner}>
            <Text style={styles.ownPostText}>📝 Your Post</Text>
          </View>
        )}
        
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
      
        {!isOwn && (
          <TouchableOpacity
            style={[
              styles.chatButton,
              !auth.isAuthenticated && styles.chatButtonDisabled
            ]}
            onPress={() => handleChatPress(item)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#fff" />
            <Text style={styles.chatButtonText}>
              {auth.isAuthenticated ? " Contact" : " Sign In to Contact"}
            </Text>
          </TouchableOpacity>
        )}
        
        {isOwn && (
          <View style={styles.ownPostActions}>
            <Text style={styles.ownPostActionText}>
              This is your post. You can manage it from your Listings.
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!auth.initialized || loadingCategories) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>
            {!auth.initialized ? "Checking authentication..." : "Loading categories..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showResults) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultsHeader}>
          <TouchableOpacity onPress={handleBackToSearch} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.resultsTitle}>Search Results</Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView
          contentContainerStyle={styles.resultsScrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={["#4A90E2"]}
              tintColor="#4A90E2"
            />
          }
        >
          {loading ? (
            <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 40 }} />
          ) : (
            <>
              {searchResults.hasZipCodeMatches && (
                <>
                  <View style={styles.infoContainer}>
                    <Ionicons name="location" size={20} color="#4CAF50" />
                    <Text style={styles.infoText}>
                      Services found in your area (ZIP: {zipCode})
                    </Text>
                  </View>
                  <Text style={styles.sectionTitle}>
                    Available in {zipCode} ({searchResults.zipCodeMatches.length})
                  </Text>
                  <FlatList
                    data={searchResults.zipCodeMatches}
                    keyExtractor={(item) => `zip-${item.post_id}`}
                    style={{ marginTop: 10 }}
                    scrollEnabled={false}
                    removeClippedSubviews={false}
                    renderItem={({ item }) => renderServicePostCard(item)}
                  />
                </>
              )}

              {!searchResults.hasZipCodeMatches && searchResults.hasStateMatches && (
                <>
                  <View style={styles.noLocalResultsContainer}>
                    <Ionicons name="information-circle-outline" size={24} color="#FF8C00" />
                    <Text style={styles.noLocalResultsText}>
                      No services found in your area, but here are the available services in other locations in your state
                    </Text>
                  </View>
                  <Text style={styles.sectionTitle}>
                    Services in {state} ({searchResults.stateMatches.length})
                  </Text>
                  <FlatList
                    data={searchResults.stateMatches}
                    keyExtractor={(item) => `state-${item.post_id}`}
                    style={{ marginTop: 10 }}
                    scrollEnabled={false}
                    removeClippedSubviews={false}
                    renderItem={({ item }) => renderServicePostCard(item)}
                  />
                </>
              )}

              {searchResults.hasZipCodeMatches && searchResults.hasStateMatches && (
                <>
                  <View style={styles.additionalResultsContainer}>
                    <Ionicons name="location-outline" size={20} color="#4A90E2" />
                    <Text style={styles.additionalResultsText}>
                      More services available in other areas of {state}
                    </Text>
                  </View>
                  <Text style={styles.sectionTitle}>
                    Other locations in {state} ({searchResults.stateMatches.length})
                  </Text>
                  <FlatList
                    data={searchResults.stateMatches}
                    keyExtractor={(item) => `state-extra-${item.post_id}`}
                    style={{ marginTop: 10 }}
                    scrollEnabled={false}
                    removeClippedSubviews={false}
                    renderItem={({ item }) => renderServicePostCard(item)}
                  />
                </>
              )}

              {!searchResults.hasZipCodeMatches && !searchResults.hasStateMatches && (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={64} color="#ccc" />
                  <Text style={styles.noResultsText}>
                    No services found for "{serviceNeeded}" in {state}
                  </Text>
                  <Text style={styles.noResultsSubtext}>
                    Try searching for a different service category
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
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
        <View style={styles.headerSection}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.mainTitle}>Find Local Services</Text>

            {!auth.isAuthenticated && (
              <TouchableOpacity onPress={handleSignIn} style={styles.signInIcon}>
                <Ionicons name="person-circle-outline" size={28} color="#ffffff" />
                <Text style={styles.signInIconText}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.subtitle}>
            Connect with service providers in your state
          </Text>
          
          {auth.isAuthenticated && auth.userInfo && (
            <View style={styles.welcomeContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.welcomeText}>
                Welcome{auth.userInfo.full_name ? `, ${auth.userInfo.full_name}` : ''}!
              </Text>
            </View>
          )}
        </View>
   
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

          <Text style={styles.formLabel}>
            ZIP Code: <Text style={styles.requiredText}>*Required</Text>
          </Text>
          <View style={styles.zipSearchRow}>
            <TextInput
              style={[
                styles.input,
                styles.zipInput,
                isZipValid && styles.inputValid,
                zipCode.length === 5 && !isZipValid && styles.inputInvalid
              ]}
              placeholder="Enter 5-digit ZIP code"
              keyboardType="numeric"
              value={zipCode}
              onChangeText={setZipCode}
              maxLength={5}
            />
            <TouchableOpacity
              style={[
                styles.searchButton,
                !serviceNeeded && styles.searchButtonDisabled
              ]}
              onPress={searchServicePosts}
              disabled={!serviceNeeded}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          {isZipValid && city && state && (
            <View style={styles.locationDisplay}>
              <Ionicons name="location" size={16} color="#4CAF50" />
              <Text style={styles.locationDisplayText}>
                {city}, {state}
              </Text>
            </View>
          )}

          {zipCode.length === 5 && !isZipValid && (
            <>
              <Text style={styles.manualEntryLabel}>
                Can't find your ZIP? Enter manually:
              </Text>
              <View style={styles.locationRow}>
                <TextInput
                  style={[styles.input, styles.locationInput]}
                  placeholder="City"
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    if (text && state) {
                      setIsZipValid(false);
                    }
                  }}
                />
                <TextInput
                  style={[styles.input, styles.locationInput]}
                  placeholder="State (e.g., AZ)"
                  value={state}
                  onChangeText={(text) => {
                    setState(text.toUpperCase());
                    if (city && text) {
                      setIsZipValid(false);
                    }
                  }}
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Popular Service Categories</Text>
          
          {!isZipValid && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={20} color="#FF8C00" />
              <Text style={styles.warningText}>
                Enter a valid ZIP code to search for services
              </Text>
            </View>
          )}

          <View style={styles.tilesContainer}>
            {popularCategories.map(renderCategoryTile)}
          </View>

          <Text style={styles.browseText}>
            Browse our most requested services and find what you need in your area
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  scrollContainer: { flexGrow: 1 },
  resultsScrollContainer: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  loadingText: { fontSize: 16, color: "#666" },
  headerSection: { backgroundColor: "#4A90E2", paddingVertical: 30, paddingHorizontal: 20, paddingTop: 60 },
  headerTitleContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12, position: "relative" },
  mainTitle: { fontSize: 28, fontWeight: "bold", color: "#ffffff", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#ffffff", textAlign: "center", lineHeight: 22, opacity: 0.9, marginBottom: 15 },
  welcomeContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(76, 175, 80, 0.2)", paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, alignSelf: "center", marginTop: 10 },
  welcomeText: { color: "#ffffff", fontSize: 14, fontWeight: "600", marginLeft: 8 },
  searchSection: { backgroundColor: "#A7CCF6", paddingVertical: 20, paddingHorizontal: 20 },
  formLabel: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 8 },
  requiredText: { color: "#FF4500", fontSize: 14, fontWeight: "normal" },
  pickerContainer: { borderWidth: 1, borderColor: "#ffffff", borderRadius: 8, backgroundColor: "#ffffff", marginBottom: 15 },
  input: { borderWidth: 1, borderColor: "#ffffff", backgroundColor: "#ffffff", padding: 12, borderRadius: 8, fontSize: 16 },
  zipInput: { flex: 1, marginRight: 10 },
  zipSearchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  inputValid: { borderColor: "#4CAF50", borderWidth: 2 },
  inputInvalid: { borderColor: "#FF4500", borderWidth: 2 },
  manualEntryLabel: { fontSize: 14, color: "#666", marginTop: 10, marginBottom: 8, fontStyle: "italic" },
  locationRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  locationInput: { flex: 0.48, borderWidth: 1, borderColor: "#ffffff", backgroundColor: "#ffffff", padding: 12, borderRadius: 8, fontSize: 16 },
  locationDisplay: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(76, 175, 80, 0.1)", padding: 10, borderRadius: 8, marginBottom: 15 },
  locationDisplayText: { marginLeft: 8, fontSize: 14, color: "#2E7D32", fontWeight: "600" },
  searchButton: { 
    backgroundColor: "#4A90E2", 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 8, 
    alignItems: "center", 
    justifyContent: "center", 
    minWidth: 100 
  },
  searchButtonDisabled: { backgroundColor: "#4A90E2", opacity: 0.6 },
  searchButtonText: {
    color: "#FF0000",
    fontSize: 15,
    fontFamily: "Roboto-Bold",
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  contentSection: { backgroundColor: "#ffffff", flex: 1, paddingHorizontal: 20, paddingTop: 25 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 15, marginTop: 10 },
  warningContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF4E5", padding: 12, borderRadius: 8, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: "#FF8C00" },
  warningText: { flex: 1, fontSize: 13, color: "#333", marginLeft: 10, fontWeight: "500" },
  tilesContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
  categoryTile: { width: "30%", aspectRatio: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5, padding: 8 },
  categoryTileText: { fontSize: 11, textAlign: "center", marginTop: 4, fontWeight: "bold" },
  browseText: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 25, lineHeight: 20, fontStyle: "italic" },
  infoContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9", padding: 12, borderRadius: 8, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: "#4CAF50" },
  infoText: { flex: 1, fontSize: 13, color: "#333", marginLeft: 10, fontWeight: "500" },
  noLocalResultsContainer: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FFF4E5", padding: 15, borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: "#FF8C00" },
  noLocalResultsText: { flex: 1, fontSize: 14, color: "#333", marginLeft: 10, fontWeight: "600", lineHeight: 20 },
  additionalResultsContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#E3F2FD", padding: 12, borderRadius: 8, marginBottom: 15, marginTop: 20, borderLeftWidth: 4, borderLeftColor: "#4A90E2" },
  additionalResultsText: { flex: 1, fontSize: 13, color: "#333", marginLeft: 10, fontWeight: "500" },
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
  resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#4A90E2", paddingVertical: 15, paddingHorizontal: 20, paddingTop: 60 },
  backButton: { padding: 8 },
  resultsTitle: { fontSize: 22, fontWeight: "bold", color: "#ffffff", flex: 1, textAlign: "center" },
  placeholder: { width: 40 },
  ownPostBanner: {
    backgroundColor: '#FFF4E5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C00',
  },
  ownPostText: {
    color: '#FF8C00',
    fontSize: 13,
    fontWeight: '600',
  },
  ownPostActions: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  ownPostActionText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  signInIcon: { 
    position: "absolute", 
    right: 0, 
    padding: 5,
    alignItems: "center"
  },
  signInIconText: {
    color: "#FF0000",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default SearchResultsScreen;