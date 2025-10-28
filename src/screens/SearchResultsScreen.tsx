/**
 * SearchResultsScreen.tsx
 * 
 * Main container screen for searching and displaying service providers.
 * This is the PRIMARY SCREEN that orchestrates all search functionality.
 * 
 * Called from: MainStackNavigator as "SearchResults" or "Home" screen
 * Uses: 5 child components (Header, SearchForm, CategoryTiles, ServiceCard via SearchResultsList)
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StyleSheet,
} from "react-native";

// Navigation & Authentication imports
import { useAuth } from "../contexts/AuthContext"; // Access user authentication state
import { useRoute, RouteProp, useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, TabParamList } from "../navigation/MainStackNavigator";

// Import CHILD COMPONENTS - these are rendered in this screen
import Header from "../components/SearchHeader"; // Top header with title & sign-in button
import SearchForm from "../components/SearchForm"; // Search input fields (ZIP, category, etc.)
import CategoryTiles from "../components/SearchCategoryTiles"; // Popular category grid tiles
import SearchResultsList from "../components/SearchResultsList"; // Results view (contains ServiceCard components)

// Import UTILITIES - helper functions and types
import {
  ServicePost,        // TypeScript interface for service post data
  SearchResults,      // TypeScript interface for search results structure
  fetchLocationFromZip,  // API call: Get city/state from ZIP code
  fetchCategories,    // API call: Get list of service categories
  searchServicePosts, // API call: Perform search and get results
  isValidZipCode,     // Validation: Check if ZIP code format is valid
  popularCategories,  // Config: Array of 6 popular categories for tiles
} from "../Utils/searchUtils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Navigation types for type-safe navigation
type SearchResultsRouteProp = RouteProp<TabParamList, "Home">;
type SearchResultsNavProp = NativeStackNavigationProp<RootStackParamList>;

// Customer information passed from previous screen or auth context
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
  // ----------------------------------------------------------------------------
  // HOOKS - Navigation, Route, and Authentication
  // ----------------------------------------------------------------------------
  
  const route = useRoute<SearchResultsRouteProp>();        // Get route params
  const navigation = useNavigation<SearchResultsNavProp>(); // Navigation object for screen transitions
  const auth = useAuth();                                   // Authentication context (user login state)
  
  // Extract route parameters (passed from previous screen or deep link)
  const routeParams = route.params || {};
  const customerInfo: CustomerInfo | undefined = routeParams.customerInfo; // User info if logged in
  const isGuest = routeParams.isGuest || false;            // True if user is browsing without login
  const preselectedCategory = routeParams.preselectedCategory || ""; // Category selected from previous screen

  // ----------------------------------------------------------------------------
  // STATE MANAGEMENT - All component state variables
  // ----------------------------------------------------------------------------
  
  // SEARCH FORM STATE - User input values
  const [businessName, setBusinessName] = useState<string>(""); // Optional business name filter
  const [zipCode, setZipCode] = useState(customerInfo?.zip_code || ""); // User's ZIP code
  const [city, setCity] = useState(customerInfo?.city || "");     // User's city (auto-filled from ZIP)
  const [state, setState] = useState(customerInfo?.state || "");  // User's state (auto-filled from ZIP)
  const [serviceNeeded, setServiceNeeded] = useState(preselectedCategory || ""); // Selected service category
  
  // DATA STATE - Data fetched from API
  const [categories, setCategories] = useState<string[]>([]); // List of all available service categories
  const [searchResults, setSearchResults] = useState<SearchResults>({
    zipCodeMatches: [],      // Services in user's ZIP code
    stateMatches: [],        // Services in user's state (but different ZIP)
    hasZipCodeMatches: false, // Flag: Are there ZIP matches?
    hasStateMatches: false    // Flag: Are there state matches?
  });
  
  // UI STATE - Control loading spinners and view visibility
  const [loading, setLoading] = useState(false);                // True during search API call
  const [loadingCategories, setLoadingCategories] = useState(true); // True during category fetch
  const [hasSearched, setHasSearched] = useState(false);        // True after first search performed
  const [showResults, setShowResults] = useState(false);        // True to show results view, false for search view
  const [isZipValid, setIsZipValid] = useState(false);          // True if ZIP code is valid
  const [refreshing, setRefreshing] = useState(false);          // True during pull-to-refresh
  
  // REFS - Values that persist across renders without causing re-renders
  const zipDebounceRef = useRef<NodeJS.Timeout | null>(null);  // Timer for ZIP code debouncing (500ms delay)
  const isInitialMount = useRef(true);                          // Flag to prevent alert on initial mount

  // ----------------------------------------------------------------------------
  // HELPER FUNCTIONS - Utilities used within this component
  // ----------------------------------------------------------------------------
  
  /**
   * Check if a post belongs to the current user
   * Used by: ServiceCard component (to disable chat for own posts)
   */
  const isOwnPost = (postUserId: number): boolean => {
    return auth.userInfo?.user_id === postUserId;
  };

  /**
   * Handle "Contact Provider" button press on a service card
   * Called from: ServiceCard component -> SearchResultsList -> here
   * Navigates to: ChatScreen
   */
  const handleChatPress = async (item: ServicePost) => {
    // Check authentication - guests cannot chat
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

    // Prevent user from chatting with themselves
    if (isOwnPost(item.user_id)) {
      Alert.alert(
        "Cannot Contact Yourself",
        "This is your own post. You cannot send messages to yourself.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // Navigate to chat screen with proper user IDs
    try {
      // Ensure IDs are numbers (handle string or number types)
      const currentUserId = typeof auth.userInfo.user_id === 'string' 
        ? parseInt(auth.userInfo.user_id, 10) 
        : auth.userInfo.user_id;
      
      const otherUserId = typeof item.user_id === 'string'
        ? parseInt(item.user_id, 10)
        : item.user_id;

      // Navigate to ChatScreen with required params
      navigation.navigate("ChatScreen", {
        currentUserId: currentUserId,
        otherUserId: otherUserId,
        otherUserName: item.business_name || item.poster_name || item.title,
      });
    } catch (error) {
      console.error("Chat navigation error:", error);
      Alert.alert("Navigation Error", "Unable to open chat. Please try again.");
    }
  };

  /**
   * Handle sign-in button press
   * Called from: Header component (sign-in icon) and chat authentication flow
   * Navigates to: BusinessOwnerHomeScreen
   */
  const handleSignIn = () => {
    try {
      navigation.navigate("BusinessOwnerHomeScreen");
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Unable to navigate to sign-in screen");
    }
  };

  /**
   * Handle pull-to-refresh gesture
   * Called from: ScrollView's RefreshControl component
   * Refreshes: Current search results (if a search has been performed)
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Only refresh if we have previous search parameters
    if (hasSearched && serviceNeeded && (zipCode || (city && state))) {
      try {
        await performSearch(true); // Silent refresh (no error alerts)
      } catch (error) {
        console.error("Refresh error:", error);
      }
    }
    
    setRefreshing(false);
  }, [hasSearched, serviceNeeded, zipCode, city, state]);

  /**
   * Handle ZIP code input change with debouncing
   * Called from: SearchForm component (ZIP code TextInput)
   * Side effects: Auto-fills city/state, validates ZIP code
   */
  const handleZipChange = async (text: string) => {
    setZipCode(text);
    
    // Clear previous debounce timer if user is still typing
    if (zipDebounceRef.current) {
      clearTimeout(zipDebounceRef.current);
    }

    // Only validate and fetch location if ZIP is 5 digits
    if (text.length === 5 && isValidZipCode(text)) {
      // Debounce: Wait 500ms after user stops typing before making API call
      zipDebounceRef.current = setTimeout(async () => {
        const location = await fetchLocationFromZip(text); // API call to get city/state
        
        if (location) {
          // Success: Auto-fill city and state
          setCity(location.city);
          setState(location.state);
          setIsZipValid(true); // Enable category tiles
        } else {
          // Invalid ZIP code
          setIsZipValid(false);
          
          // Show alert only if not initial mount (avoid alert on page load)
          if (!isInitialMount.current) {
            Alert.alert(
              "Invalid ZIP Code",
              "Please enter a valid US ZIP code or enter your city and state manually."
            );
          }
        }
      }, 500); // 500ms debounce delay
    } else {
      // ZIP is incomplete or invalid format
      setIsZipValid(false);
      setCity("");
      setState("");
    }
  };

  /**
   * Perform the search API call
   * Called from: handleSearch (user clicks search button) or handleCategoryPress (user clicks tile)
   * 
   * @param silentRefresh - If true, don't show validation error alerts (used for background refresh)
   */
  const performSearch = async (silentRefresh: boolean = false) => {
    // Validation: Service category is required
    if (!serviceNeeded) {
      if (!silentRefresh) {
        Alert.alert("Missing Information", "Please select a service category.");
      }
      return;
    }

    // Validation: Location is required (either ZIP or city+state)
    if (!zipCode && (!city || !state)) {
      if (!silentRefresh) {
        Alert.alert(
          "Location Required",
          "Please enter a ZIP code or provide both city and state."
        );
      }
      return;
    }

    // Show loading spinner
    setLoading(true);
    
    try {
      // Make API call to search for service posts
      const results = await searchServicePosts({
        businessName: businessName || undefined, // Optional filter
        serviceCategory: serviceNeeded,          // Required
        zipCode: zipCode || undefined,           // Optional (can use city/state instead)
        city: city || undefined,                 // Optional
        state: state || undefined,               // Optional
      });

      // Update state with results
      setSearchResults(results);
      setHasSearched(true);  // Mark that user has performed a search
      setShowResults(true);  // Switch to results view
    } catch (error) {
      console.error("Search error:", error);
      
      // Show error alert unless this is a silent refresh
      if (!silentRefresh) {
        Alert.alert("Search Error", "Failed to search for services. Please try again.");
      }
    } finally {
      setLoading(false); // Hide loading spinner
    }
  };

  /**
   * Handle search button press
   * Called from: SearchForm component (Search button)
   */
  const handleSearch = () => {
    performSearch(false); // Not a silent refresh, show validation alerts
  };

  /**
   * Handle category tile press
   * Called from: CategoryTiles component (TouchableOpacity on each tile)
   * 
   * @param categoryName - The name of the selected category (e.g., "Catering")
   */
  const handleCategoryPress = (categoryName: string) => {
    // Validation: ZIP code must be valid before searching
    if (!isZipValid) {
      Alert.alert(
        "ZIP Code Required",
        "Please enter a valid ZIP code before selecting a category."
      );
      return;
    }
    
    // Set the selected category and trigger search
    setServiceNeeded(categoryName);
    handleSearch(); // This will use the updated category from state
  };

  /**
   * Handle back button press from results view
   * Called from: SearchResultsList component (back button in header)
   * Returns to: Main search view
   */
  const handleBackPress = () => {
    setShowResults(false);  // Hide results view
    setHasSearched(false);  // Reset search flag
  };

  // ----------------------------------------------------------------------------
  // SIDE EFFECTS - useEffect hooks for lifecycle events
  // ----------------------------------------------------------------------------
  
  /**
   * EFFECT 1: Load service categories on component mount
   * Runs: Once when component first renders
   * API Call: fetchCategories() to get list of all service categories
   */
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      
      try {
        const fetchedCategories = await fetchCategories(); // API call
        setCategories(fetchedCategories); // Store in state for SearchForm picker
      } catch (error) {
        console.error("Error loading categories:", error);
        Alert.alert("Error", "Failed to load service categories");
      } finally {
        setLoadingCategories(false); // Hide loading spinner
      }
    };

    loadCategories();
  }, []); // Empty dependency array = run once on mount

  /**
   * EFFECT 2: Auto-search when screen gains focus with preselected category
   * Runs: Every time the screen comes into focus (user navigates to this screen)
   * Use case: User clicked a category tile from another screen and was directed here
   */
  useFocusEffect(
    useCallback(() => {
      // Only auto-search if:
      // 1. Category was preselected from previous screen
      // 2. ZIP code is valid
      // 3. Haven't already searched (prevent duplicate searches)
      if (preselectedCategory && isZipValid && !hasSearched) {
        performSearch(true); // Silent search (no validation alerts)
      }
    }, [preselectedCategory, isZipValid])
  );

  /**
   * EFFECT 3: Mark that component has finished initial mount
   * Runs: Once after first render
   * Purpose: Prevent ZIP validation alert on initial page load
   */
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // ----------------------------------------------------------------------------
  // RENDER LOGIC - Conditional rendering based on state
  // ----------------------------------------------------------------------------
  
  /**
   * LOADING STATE: Show spinner while categories are loading
   * Displayed: On initial component mount before categories load
   */
  if (loadingCategories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  /**
   * RESULTS VIEW: Show search results
   * Displayed: When showResults === true (after search is performed)
   * Component: SearchResultsList
   *   └─> ServiceCard (rendered for each result)
   */
  if (showResults) {
    return (
      <SearchResultsList
        searchResults={searchResults}       // The search results data
        isOwnPost={isOwnPost}              // Function to check if post belongs to current user
        onChatPress={handleChatPress}      // Handler for "Contact Provider" button
        onBackPress={handleBackPress}      // Handler for back button
        zipCode={zipCode}                  // For displaying location context
        city={city}                        // For displaying location context
        state={state}                      // For displaying location context
      />
    );
  }

  /**
   * MAIN SEARCH VIEW: Show search form and category tiles
   * Displayed: Default view when showResults === false
   * 
   * Component hierarchy:
   *   SafeAreaView
   *     └─> ScrollView (with pull-to-refresh)
   *           ├─> Header (title, sign-in button, welcome message)
   *           ├─> SearchForm (business name, category, ZIP, city/state inputs)
   *           └─> CategoryTiles (6 popular category tiles)
   */
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}  // Pull-to-refresh handler
          />
        }
      >
        {/* 
          COMPONENT 1: Header
          Purpose: Display app title, sign-in button (for guests), welcome message (for authenticated users)
          Location: components/SearchHeader.tsx
        */}
        <Header
          isAuthenticated={auth.isAuthenticated}        // Show/hide sign-in vs welcome
          customerName={customerInfo?.full_name}        // Display in welcome message
          onSignInPress={handleSignIn}                  // Navigate to sign-in screen
        />

        {/* 
          COMPONENT 2: SearchForm
          Purpose: Collect search parameters (business name, category, ZIP/location)
          Location: components/SearchForm.tsx
        */}
        <SearchForm
          businessName={businessName}                   // Controlled input value
          setBusinessName={setBusinessName}             // Update function
          zipCode={zipCode}                             // Controlled input value
          setZipCode={setZipCode}                       // Update function (not used, handleZipChange is used instead)
          city={city}                                   // Controlled input value (auto-filled from ZIP)
          setCity={setCity}                             // Update function
          state={state}                                 // Controlled input value (auto-filled from ZIP)
          setState={setState}                           // Update function
          serviceNeeded={serviceNeeded}                 // Selected category
          setServiceNeeded={setServiceNeeded}           // Category selector
          categories={categories}                       // List for category picker dropdown
          isZipValid={isZipValid}                       // Show validation state (green/red border)
          isGuest={isGuest}                             // Show/hide certain fields for guests
          handleSearch={handleSearch}                   // Search button handler
          onZipChange={handleZipChange}                 // ZIP input change handler (with debounce)
        />

        {/* 
          COMPONENT 3: CategoryTiles
          Purpose: Display 6 popular service categories as clickable tiles
          Location: components/SearchCategoryTiles.tsx
        */}
        <CategoryTiles
          categories={popularCategories}                // Array of 6 popular categories (from searchUtils)
          onCategoryPress={handleCategoryPress}         // Handler when tile is clicked
          isZipValid={isZipValid}                       // Disable tiles if ZIP not valid
        />
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
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
});

export default SearchResultsScreen;

/**
 * ============================================================================
 * COMPONENT CALL HIERARCHY
 * ============================================================================
 * 
 * This screen is called from:
 *   └─> MainStackNavigator (registered as "SearchResults" or "Home" screen)
 * 
 * This screen calls these components:
 *   ├─> Header (SearchHeader.tsx)
 *   │     Purpose: Display title and authentication UI
 *   │     Props: isAuthenticated, customerName, onSignInPress
 *   │
 *   ├─> SearchForm (SearchForm.tsx)
 *   │     Purpose: Collect search inputs
 *   │     Props: All search form state + handlers (13 props)
 *   │
 *   ├─> CategoryTiles (SearchCategoryTiles.tsx)
 *   │     Purpose: Display popular category tiles
 *   │     Props: categories, onCategoryPress, isZipValid
 *   │
 *   └─> SearchResultsList (SearchResultsList.tsx)
 *         Purpose: Display search results
 *         Props: searchResults, isOwnPost, onChatPress, onBackPress, location data
 *         │
 *         └─> ServiceCard (ServiceCard.tsx) - rendered inside SearchResultsList
 *               Purpose: Display individual service post
 *               Props: item, isOwnPost, onChatPress
 * 
 * This screen calls these utilities (searchUtils.ts):
 *   ├─> fetchLocationFromZip() - Get city/state from ZIP code
 *   ├─> fetchCategories() - Get list of service categories
 *   ├─> searchServicePosts() - Perform search API call
 *   ├─> isValidZipCode() - Validate ZIP code format
 *   └─> popularCategories - Array of 6 popular categories
 * 
 * This screen navigates to:
 *   ├─> ChatScreen - When user clicks "Contact Provider"
 *   └─> BusinessOwnerHomeScreen - When user clicks "Sign In"
 * 
 * ============================================================================
 * DATA FLOW SUMMARY
 * ============================================================================
 * 
 * 1. User enters ZIP code
 *    └─> handleZipChange() debounces input
 *        └─> fetchLocationFromZip() API call
 *            └─> Auto-fills city/state
 * 
 * 2. User selects category or clicks tile
 *    └─> handleSearch() or handleCategoryPress()
 *        └─> performSearch() validates and calls API
 *            └─> searchServicePosts() API call
 *                └─> Updates searchResults state
 *                    └─> Shows SearchResultsList component
 * 
 * 3. User clicks "Contact Provider"
 *    └─> handleChatPress() checks authentication
 *        └─> Navigates to ChatScreen with user IDs
 * 
 * 4. User pulls to refresh
 *    └─> onRefresh() repeats last search
 * 
 * ============================================================================
 */