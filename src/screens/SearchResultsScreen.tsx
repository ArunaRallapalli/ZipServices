/**
 * SearchResultsScreen.tsx
 * 
 * OVERVIEW:
 * Main screen component for the service search functionality. This is the home screen
 * where customers can search for service providers by category and location.
 * 
 * KEY FEATURES:
 * - Displays search form with category picker and ZIP code input
 * - Shows popular category tiles for quick access
 * - Auto-populates location from customer profile if logged in
 * - Validates ZIP codes and fetches city/state automatically
 * - Handles search execution and result display
 * - Supports guest users and authenticated users
 * - Provides chat functionality with service providers
 * - Pull-to-refresh support for updating search results
 * 
 * NAVIGATION FLOW:
 * 1. User enters ZIP code and selects category
 * 2. Clicks Search or taps a category tile
 * 3. Screen transitions to SearchResultsList showing matches
 * 4. User can return to search form via back button
 * 
 * STATE MANAGEMENT:
 * - Manages search form state (ZIP, city, state, category)
 * - Tracks search results and loading states
 * - Handles category loading from API
 * - Manages ZIP code validation state
 */
// Add this line
import { createResponsiveStyles } from '../Utils/globalStyles';
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Alert } from "../Utils/Alert";
import { Text } from 'react-native';

import { useAuth } from "../contexts/AuthContext";
import { useRoute, RouteProp, useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, TabParamList } from "../navigation/MainStackNavigator";

import Header from "../components/SearchHeader";
import SearchForm from "../components/SearchForm";
import CategoryTiles from "../components/SearchCategoryTiles";
import SearchResultsList from "../components/SearchResultsList";
import { ContactSupportSection } from '../components/ContactSupportSection';

import {
  ServicePost,
  SearchResults,
  fetchLocationFromZip,
  fetchCategories,
  searchServicePosts,
  isValidZipCode,
  popularCategories,
} from "../Utils/searchUtils";
import { Footer } from "../components/Footer";
// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type SearchResultsRouteProp = RouteProp<TabParamList, "Home">;
type SearchResultsNavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Customer information passed via navigation params
 */
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SearchResultsScreen: React.FC = () => {
  // --------------------------------------------------------------------------
  // HOOKS AND NAVIGATION
  // --------------------------------------------------------------------------
  
  const route = useRoute<SearchResultsRouteProp>();
  const navigation = useNavigation<SearchResultsNavProp>();
  const auth = useAuth();
  
  // Extract route parameters with defaults
  const routeParams = route.params || {};
  const customerInfo: CustomerInfo | undefined = routeParams.customerInfo;
  const isGuest = routeParams.isGuest || false;
  const preselectedCategory = routeParams.preselectedCategory || "";

  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  
  // Search form state - pre-populated from customer profile if available
  const [businessName, setBusinessName] = useState<string>("");
  const [zipCode, setZipCode] = useState(customerInfo?.zip_code || "");
  const [city, setCity] = useState(customerInfo?.city || "");
  const [state, setState] = useState(customerInfo?.state || "");
  const [serviceNeeded, setServiceNeeded] = useState(preselectedCategory || "");
  
  // Categories and search results state
  const [categories, setCategories] = useState<string[]>([]); 
const [searchResults, setSearchResults] = useState<SearchResults>({
  exactZipMatches: [],      // ← Add this
  nearbyZipMatches: [],     // ← Add this
  zipCodeMatches: [],       // ← Keep this for backward compatibility
  stateMatches: [],
  hasZipCodeMatches: false,
  hasStateMatches: false
});
  
  // UI state management
  const [loading, setLoading] = useState(false);                    // Search in progress
  const [loadingCategories, setLoadingCategories] = useState(true); // Categories loading
  const [hasSearched, setHasSearched] = useState(false);            // User has performed search
  const [showResults, setShowResults] = useState(false);            // Show results view vs search form
  const [isZipValid, setIsZipValid] = useState(false);              // ZIP code validation status
  const [refreshing, setRefreshing] = useState(false);              // Pull-to-refresh state
  
  // --------------------------------------------------------------------------
  // REFS FOR DEBOUNCING AND MOUNT TRACKING
  // --------------------------------------------------------------------------
  
  const zipDebounceRef = useRef<NodeJS.Timeout | null>(null);  // Debounce timer for ZIP validation
  const isInitialMount = useRef(true);                          // Track first render

  // --------------------------------------------------------------------------
  // UTILITY FUNCTIONS
  // --------------------------------------------------------------------------
  
  /**
   * Checks if a service post belongs to the current user
   * Used to prevent users from contacting themselves
   */
  const isOwnPost = (postUserId: number): boolean => {
    return String(auth.userInfo?.user_id) === String(postUserId);
  };

  // --------------------------------------------------------------------------
  // CHAT FUNCTIONALITY
  // --------------------------------------------------------------------------
  /**
 * Handles user pressing "Chat" button on a service post
 * Performs authentication check and validates user isn't messaging themselves
 * 
 * @param item - The service post the user wants to chat about
 */
//from here 
//from here 
const handleChatPress = async (item: ServicePost) => {
  try {
    // Check if user is authenticated
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

    // Prevent users from messaging their own posts
    if (isOwnPost(item.user_id)) {
      Alert.alert(
        "Cannot Contact Yourself",
        "This is your own post. You cannot send messages to yourself.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // Helper function to extract username from email
    const extractUsername = (email: string | null | undefined): string => {
      if (!email) return "Provider";
      const username = email.split('@')[0];
      return username || "Provider";
    };

    // 🔍 DEBUG: Log all the data
    console.log("🐛 [DEBUG] Item data:", {
      business_name: item.business_name,
      poster_name: item.poster_name,
      contact_email: item.contact_email,
      title: item.title
    });

    // Parse user IDs to ensure they're numbers
    const currentUserId = typeof auth.userInfo.user_id === 'string' 
      ? parseInt(auth.userInfo.user_id, 10) 
      : auth.userInfo.user_id;
    
    const otherUserId = typeof item.user_id === 'string'
      ? parseInt(item.user_id, 10)
      : item.user_id;

    // Determine display name with fallback priority
    // FIXED: Extract username from poster_name if it's an email
    const otherUserName = 
      item.business_name ||  // Best: "ABC Plumbing"
      (item.poster_name && item.poster_name.includes('@') 
        ? extractUsername(item.poster_name)  // Extract from poster_name if it's an email
        : item.poster_name) ||  // Use poster_name as-is if it's a real name
      extractUsername(item.contact_email);  // Fallback to contact_email

    // 🔍 DEBUG: Log what we're passing
    console.log("🐛 [DEBUG] Navigating with otherUserName:", otherUserName);

    // Navigate to chat screen with conversation parameters
    navigation.navigate("ChatScreen", {
      currentUserId: currentUserId,
      otherUserId: otherUserId,
      otherUserName: otherUserName,
    });
  } catch (error) {
    console.error("Chat navigation error:", error);
    Alert.alert("Navigation Error", "Unable to open chat. Please try again.");
  }
};

  //until here for hiding email display 

  /**
   * Navigates to sign-in screen for guest users
   */
  const handleSignIn = () => {
    try {
      navigation.navigate("BusinessOwnerHomeScreen");
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Unable to navigate to sign-in screen");
    }
  };

  // --------------------------------------------------------------------------
  // PULL-TO-REFRESH FUNCTIONALITY
  // --------------------------------------------------------------------------
  
  /**
   * Handles pull-to-refresh gesture
   * Re-executes the last search if user has searched before
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Only refresh if user has already performed a search
    if (hasSearched && serviceNeeded && (zipCode || (city && state))) {
      try {
        await performSearch(true); // Silent refresh (no alerts)
      } catch (error) {
        console.error("Refresh error:", error);
      }
    }
    setRefreshing(false);
  }, [hasSearched, serviceNeeded, zipCode, city, state]);

  // --------------------------------------------------------------------------
  // ZIP CODE HANDLING
  // --------------------------------------------------------------------------
  
  /**
   * Handles ZIP code input with debounced validation and location lookup
   * 
   * FLOW:
   * 1. User types ZIP code
   * 2. Clear any existing debounce timer
   * 3. If 5 digits entered and valid format:
   *    - Wait 500ms (debounce)
   *    - Fetch city/state from API
   *    - Auto-populate location fields
   * 4. If invalid, clear location fields
   * 
   * @param text - The ZIP code input text
   */
  const handleZipChange = async (text: string) => {
    setZipCode(text);
    
    // Clear existing debounce timer
    if (zipDebounceRef.current) {
      clearTimeout(zipDebounceRef.current);
    }

    // Only validate if we have 5 digits and they're all numeric
    if (text.length === 5 && isValidZipCode(text)) {
      // Debounce the API call to avoid excessive requests
      zipDebounceRef.current = setTimeout(async () => {
        const location = await fetchLocationFromZip(text);
        
        if (location) {
          // Valid ZIP - populate city and state
          setCity(location.city);
          setState(location.state);
          setIsZipValid(true);
        } else {
          // Invalid ZIP - show alert (except on first mount)
          setIsZipValid(false);
          if (!isInitialMount.current) {
            Alert.alert(
              "Invalid ZIP Code",
              "Please enter a valid US ZIP code or enter your city and state manually."
            );
          }
        }
      }, 500); // 500ms debounce delay
    } else {
      // Incomplete or invalid ZIP - clear location data
      setIsZipValid(false);
      setCity("");
      setState("");
    }
  };

  // --------------------------------------------------------------------------
  // SEARCH EXECUTION
  // --------------------------------------------------------------------------
  
  /**
   * Executes the service search based on form inputs
   * Validates required fields before searching
   * 
   * @param silentRefresh - If true, suppresses error alerts (used for auto-refresh)
   * @param categoryOverride - Optional category to use instead of state value (fixes closure issue)
   * 
   * VALIDATION CHECKS:
   * 1. Service category must be selected
   * 2. ZIP code must be provided
   * 3. ZIP code must be 5 digits
   * 4. ZIP code must be valid (verified via API)
   */
  const performSearch = async (silentRefresh: boolean = false, categoryOverride?: string) => {
    // Use override if provided, otherwise use state
    // This fixes the stale closure issue when category tiles trigger immediate search
    const searchCategory = categoryOverride || serviceNeeded;
    
    console.log("🔍 [SearchResultsScreen] performSearch called with:", {
      silentRefresh,
      categoryOverride,
      searchCategory,
      stateServiceNeeded: serviceNeeded
    });
    
    // Validate service category selection
    if (!searchCategory) {
      if (!silentRefresh) {
        Alert.alert("Missing Information", "Please select a service category.");
      }
      return;
    }

    // Validate ZIP code is provided
    if (!zipCode || zipCode.trim() === "") {
      if (!silentRefresh) {
        Alert.alert(
          "ZIP Code Required",
          "Please enter your ZIP code to search for services."
        );
      }
      return;
    }

    // Validate ZIP code length
    if (zipCode.length < 5) {
      if (!silentRefresh) {
        Alert.alert(
          "Invalid ZIP Code",
          "Please enter a complete 5-digit ZIP code."
        );
      }
      return;
    }

    // Validate ZIP code is valid (has been verified)
    if (!isZipValid) {
      if (!silentRefresh) {
        Alert.alert(
          "Invalid ZIP Code",
          "The ZIP code you entered is not valid. Please check and try again."
        );
      }
      return;
    }

    // Show loading indicator
    setLoading(true);
    
    try {
      // Execute search API call with the correct category
      console.log("🔍 [SearchResultsScreen] Calling searchServicePosts with category:", searchCategory);
      
      const results = await searchServicePosts({
        businessName: businessName || undefined,
        serviceCategory: searchCategory,  // Use searchCategory instead of serviceNeeded
        zipCode: zipCode || undefined,
        city: city || undefined,
        state: state || undefined,
      });

      // Update state with results
      setSearchResults(results);
      setHasSearched(true);
      setShowResults(true);
      
      console.log("✅ [SearchResultsScreen] Search completed successfully for:", searchCategory);
    } catch (error) {
      console.error("❌ [SearchResultsScreen] Search error:", error);
      if (!silentRefresh) {
        Alert.alert("Search Error", "Failed to search for services. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Wrapper for performSearch called by the Search button
   * Always shows alerts (not a silent refresh)
   */
  const handleSearch = () => {
    performSearch(false);
  };

  // --------------------------------------------------------------------------
  // CATEGORY TILE INTERACTION
  // --------------------------------------------------------------------------
  
  /**
   * Handles user tapping a popular category tile
   * Validates ZIP code before allowing category selection
   * Auto-triggers search after category selection
   * 
   * @param categoryName - The name of the selected category
   */
  const handleCategoryPress = (categoryName: string) => {
    console.log("🎯 [SearchResultsScreen] Category tile pressed:", categoryName);
    
    // Validate ZIP code is entered
    if (!zipCode || zipCode.trim() === "") {
      Alert.alert(
        "ZIP Code Required",
        "Please enter your ZIP code before selecting a category."
      );
      return;
    }

    // Validate ZIP code is complete
    if (zipCode.length < 5) {
      Alert.alert(
        "Invalid ZIP Code",
        "Please enter a complete 5-digit ZIP code."
      );
      return;
    }

    // Validate ZIP code has been verified
    if (!isZipValid) {
      Alert.alert(
        "Invalid ZIP Code",
        "Please enter a valid ZIP code before selecting a category."
      );
      return;
    }
    
    // Update selected category
    setServiceNeeded(categoryName);
    
    // Auto-trigger search with the new category value passed directly
    // This avoids the stale closure issue where performSearch would use old serviceNeeded value
    setTimeout(() => {
      console.log("🚀 [SearchResultsScreen] Auto-triggering search for category:", categoryName);
      performSearch(false, categoryName);  // Pass category directly to avoid stale closure
    }, 100);
  };

  /**
   * Returns user to search form from results view
   */
  const handleBackPress = () => {
    setShowResults(false);
    setHasSearched(false);
  };
/**
 * EFFECT: Refresh search results when screen gains focus
 * This ensures results are updated if user inactivated a listing
 */
useFocusEffect(
  useCallback(() => {
    // If user has searched and results are showing, refresh them
    if (hasSearched && showResults && serviceNeeded && zipCode && isZipValid) {
      console.log("🔄 [SearchResultsScreen] Refreshing search results on focus");
      performSearch(true); // Silent refresh
    }
  }, [hasSearched, showResults, serviceNeeded, zipCode, isZipValid])
);
  // --------------------------------------------------------------------------
  // EFFECTS AND LIFECYCLE
  // --------------------------------------------------------------------------
  
  /**
   * EFFECT: Load categories on component mount
   * Fetches available service categories from API
   * Sets default category if none selected
   */
  useEffect(() => {
    const loadCategories = async () => {
  console.log("🚀 [SearchResultsScreen] Loading categories...");
  setLoadingCategories(true);
  
  try {
    const fetchedCategories = await fetchCategories();
    
    // ✅ ADD DETAILED LOGGING
    console.log("✅ Categories loaded:", fetchedCategories.length);
    console.log("📋 First 5:", fetchedCategories.slice(0, 5));
    console.log("📋 Last 5:", fetchedCategories.slice(-5));
    console.log("🔍 Looking for 'Web Development':", 
      fetchedCategories.indexOf('Web Development'));
    console.log("🔍 Looking for 'Other':", 
      fetchedCategories.indexOf('Other'));
    
    setCategories(fetchedCategories);
    
    // ... rest of the code
  } catch (error) {
    console.error("❌ Error loading categories:", error);
  } finally {
    setLoadingCategories(false);
  }
};
        
    loadCategories();
  }, []); // Run once on mount

  /**
   * EFFECT: Auto-search when screen gains focus with preselected category
   * Triggers automatic search if:
   * - User has preselected category (from navigation)
   * - ZIP code is valid
   * - User hasn't searched yet
   * - Categories have loaded
   */
  useFocusEffect(
    useCallback(() => {
      if (preselectedCategory && isZipValid && !hasSearched && categories.length > 0) {
        console.log("🎯 [SearchResultsScreen] Auto-searching with preselected category:", preselectedCategory);
        performSearch(true, preselectedCategory); // Silent search (no alerts), pass category directly
      }
    }, [preselectedCategory, isZipValid, hasSearched, categories])
  );

  /**
   * EFFECT: Mark component as no longer on initial mount
   * Used to suppress certain alerts on first render
   */
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  /**
   * EFFECT: Debug logging for category state
   */
  useEffect(() => {
    console.log("📊 [SearchResultsScreen] Category state:", {
      categoriesCount: categories.length,
      serviceNeeded: serviceNeeded,
      loadingCategories: loadingCategories,
    });
  }, [categories, serviceNeeded, loadingCategories]);

  // --------------------------------------------------------------------------
  // RENDER LOGIC
  // --------------------------------------------------------------------------
  
  // Show loading spinner while categories are loading
  if (loadingCategories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  // Show results view if user has searched
  if (showResults) {
    return (
      <SearchResultsList
        searchResults={searchResults}
        isOwnPost={isOwnPost}
        onChatPress={handleChatPress}
        onBackPress={handleBackPress}
        zipCode={zipCode}
        city={city}
        state={state}
      />
    );
  }

  // Show main search form view
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
          />
        }
      >
        {/* Header with user greeting and sign-in option */}
        <Header
          isAuthenticated={auth.isAuthenticated}
          customerName={customerInfo?.full_name}
          onSignInPress={handleSignIn}
        />

        {/* Search form with inputs and validation */}
        <SearchForm
          businessName={businessName}
          setBusinessName={setBusinessName}
          zipCode={zipCode}
          setZipCode={setZipCode}
          city={city}
          setCity={setCity}
          state={state}
          setState={setState}
          serviceNeeded={serviceNeeded}
          setServiceNeeded={setServiceNeeded}
          categories={categories}
          isZipValid={isZipValid}
          isGuest={isGuest}
          handleSearch={handleSearch}
          onZipChange={handleZipChange}
        />

      {/* Popular category tiles for quick access */}
<CategoryTiles
  categories={popularCategories}
  onCategoryPress={handleCategoryPress}
  isZipValid={isZipValid}
/>
{/* Help & Support */} 

  <Text style={[styles.subtitle, { fontWeight: 'bold' }]}>
  For questions or support, please contact us at zipmarket333@gmail.com
</Text>

{/* Contact Support Section - DISABLED FOR PHASE 1 */}
{/* <View style={styles.footer}>
  <ContactSupportSection showTitle={false} compact={true} />
</View> */}

{/* Footer - DISABLED FOR PHASE 1 */}
{/* <Footer /> */}
      </ScrollView>
    </SafeAreaView>
  );
};

// Add footer style to your StyleSheet
const styles = createResponsiveStyles({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    marginTop: 40,
    marginBottom: 20,
  },
});  
export default SearchResultsScreen;