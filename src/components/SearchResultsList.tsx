/**
 * SearchResultsList.tsx
 * 
 * OVERVIEW:
 * Component that displays search results for service providers. Shows results in two
 * categories: exact ZIP code matches (local) and state-level matches (wider area).
 * Provides visual feedback for different result scenarios and handles empty states.
 * 
 * KEY FEATURES:
 * - Displays results in prioritized sections (local first, then state-wide)
 * - Shows contextual messages based on result availability
 * - Renders service cards with contact/chat functionality
 * - Provides back navigation to search form
 * - Handles empty state with helpful messaging
 * - Visual indicators for result categories (icons, colors, borders)
 * 
 * RESULT DISPLAY LOGIC:
 * 1. Exact ZIP Code Matches: Services in user's exact ZIP code
 * 2. Nearby ZIP Matches: Services in neighboring ZIP codes
 * 3. State Matches (Broader): Services in user's state (excluding duplicates)
 * 4. Empty State: No results found with helpful suggestions
 * 
 * VISUAL HIERARCHY:
 * - Green banner: Exact local results found
 * - Cyan banner: Nearby ZIP code results
 * - Orange banner: No local results, showing state results
 * - Blue banner: Additional state results after local results
 * - Gray empty state: No results at all
 * 
 * PROPS:
 * - searchResults: Object containing ZIP and state match arrays
 * - isOwnPost: Function to check if post belongs to current user
 * - onChatPress: Handler for initiating chat with service provider
 * - onBackPress: Handler for returning to search form
 * - zipCode, city, state: Location context for display messages
 */

import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ServiceCard from "./ServiceCard";
import { createResponsiveStyles } from "../Utils/globalStyles"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Service post data structure returned from search
 */
interface ServicePost {
  post_id: number;                    // Unique identifier for the post
  user_id: number;                    // ID of the service provider
  poster_type: string;                // Type: 'business_owner' or 'customer'
  post_type: string;                  // Type: 'offer' or 'request'
  title: string;                      // Service post title
  description?: string;               // Detailed service description
  service_category: string;           // Category (e.g., 'Plumbing', 'Cleaning')
  price_range?: string;               // Optional pricing information
  phone_number?: string;              // Contact phone number
  contact_email?: string;             // Contact email address
  zip_code?: string;                  // Service provider's ZIP code
  city?: string;                      // Service provider's city
  state?: string;                     // Service provider's state
  poster_name?: string;               // Name of the person who posted
  business_name?: string;             // Business name (if applicable)
}

/**
 * Search results organized by proximity
 * Exact and nearby ZIP matches are kept separate
 */
interface SearchResults {
  exactZipMatches: ServicePost[];     // Services in exact ZIP code
  nearbyZipMatches: ServicePost[];    // Services in nearby ZIP codes
  zipCodeMatches: ServicePost[];      // Combined exact + nearby (for backward compatibility)
  stateMatches: ServicePost[];        // Services in same state (deduplicated)
  hasZipCodeMatches: boolean;         // Flag: has local results
  hasStateMatches: boolean;           // Flag: has state-wide results
}

/**
 * Component props for SearchResultsList
 */
interface SearchResultsListProps {
  searchResults: SearchResults;                     // Search results to display
  isOwnPost: (userId: number) => boolean;          // Check if post belongs to user
  onChatPress: (item: ServicePost) => void;        // Handler for chat button
  onBackPress: () => void;                         // Handler for back navigation
  zipCode: string;                                 // User's ZIP code for display
  city: string;                                    // User's city for display
  state: string;                                   // User's state for display
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SearchResultsList: React.FC<SearchResultsListProps> = ({
  searchResults,
  isOwnPost,
  onChatPress,
  onBackPress,
  zipCode,
  city,
  state,
}) => {
  // --------------------------------------------------------------------------
  // RESULT DETECTION
  // --------------------------------------------------------------------------
  
  /**
   * Use the pre-separated exact and nearby matches from searchUtils
   * No need to filter here - the data comes already separated
   */
  const exactZipMatches = searchResults.exactZipMatches;
  const nearbyZipMatches = searchResults.nearbyZipMatches;
  
  /**
   * Check if any results exist (local or state-wide)
   * Used to determine whether to show results or empty state
   */
  const hasResults =
    searchResults.zipCodeMatches.length > 0 ||
    searchResults.stateMatches.length > 0;

  // --------------------------------------------------------------------------
  // RENDER FUNCTIONS
  // --------------------------------------------------------------------------
  
  /**
   * Renders the header bar with back button and title
   * Fixed position at top with blue background
   * 
   * @returns Header component with navigation
   */
  const renderHeader = () => (
    <View style={styles.resultsHeader}>
      {/* Back button to return to search form */}
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </TouchableOpacity>
      
      {/* Centered title */}
      <Text style={styles.resultsTitle}>Search Results</Text>
      
      {/* Placeholder for symmetric layout */}
      <View style={styles.placeholder} />
    </View>
  );

  /**
   * Renders the main content area - either results or empty state
   * Handles scenarios:
   * 1. No results: Empty state with message
   * 2. Exact ZIP results: Services in user's exact ZIP code
   * 3. Nearby ZIP results: Services in neighboring ZIP codes
   * 4. State results: Broader state-wide matches
   * 
   * @returns Content component based on search results
   */
  const renderContent = () => {
    // --------------------------------------------------------------------------
    // SCENARIO 1: NO RESULTS FOUND
    // --------------------------------------------------------------------------
    if (!hasResults) {
      return (
        <View style={styles.noResultsContainer}>
          {/* Search icon for visual context */}
          <Ionicons name="search" size={80} color="#ccc" />
          
          {/* Primary message */}
          <Text style={styles.noResultsText}>No services found</Text>
          
          {/* Helpful suggestion text */}
          <Text style={styles.noResultsSubtext}>
            Try adjusting your search criteria or check back later for new
            listings
          </Text>
        </View>
      );
    }

    // --------------------------------------------------------------------------
    // SCENARIO 2-5: RESULTS FOUND
    // --------------------------------------------------------------------------
    return (
      <>
        {/* --------------------------------------------------------------------
            SECTION A: EXACT ZIP CODE MATCHES
            Shows services in the user's exact ZIP code only
            Green banner indicates these are the closest/most relevant
        -------------------------------------------------------------------- */}
        {exactZipMatches.length > 0 && (
          <>
            
            {/* Info banner showing count of exact local services */}
<View style={styles.infoContainer}>
  <Ionicons name="location" size={20} color="#4CAF50" />
  <Text style={styles.infoText}>
    Found {String(exactZipMatches.length)} service
    {exactZipMatches.length !== 1 ? "s" : ""} in {zipCode}
  </Text>
</View>

            {/* Render each exact local service as a card */}
            {exactZipMatches.map((item) => (
              <ServiceCard
                key={item.post_id}
                item={item}
                isOwnPost={isOwnPost(item.user_id)}
                onChatPress={onChatPress}
              />
            ))}
          </>
        )}

        {/* --------------------------------------------------------------------
            SECTION B: NEARBY ZIP CODE MATCHES
            Shows services from neighboring ZIP codes (not exact match)
            Cyan banner indicates these are nearby but in different ZIP codes
        -------------------------------------------------------------------- */}
        {nearbyZipMatches.length > 0 && (
          <>
            {/* Info banner showing nearby services */}
            <View style={styles.nearbyResultsContainer}>
              <Ionicons name="navigate" size={20} color="#00BCD4" />
              <Text style={styles.nearbyResultsText}>
                {exactZipMatches.length > 0 ? "Other nearby locations" : "Nearby locations"}
              </Text>
            </View>

            {/* Render each nearby service as a card */}
            {nearbyZipMatches.map((item) => (
              <ServiceCard
                key={item.post_id}
                item={item}
                isOwnPost={isOwnPost(item.user_id)}
                onChatPress={onChatPress}
              />
            ))}
          </>
        )}

        {/* --------------------------------------------------------------------
            SECTION C: NO LOCAL RESULTS MESSAGE
            Only shown when no ZIP matches but state matches exist
            Orange banner indicates broader search was performed
        -------------------------------------------------------------------- */}
        {!searchResults.hasZipCodeMatches &&
          searchResults.hasStateMatches && (
            <View style={styles.noLocalResultsContainer}>
              <Ionicons name="information-circle" size={24} color="#FF8C00" />
              <Text style={styles.noLocalResultsText}>
                No services found in {zipCode}. Showing results from {city},{" "}
                {state}
              </Text>
            </View>
          )}

        {/* --------------------------------------------------------------------
            SECTION D: ADDITIONAL STATE RESULTS DIVIDER
            Only shown when BOTH local and state results exist
            Blue banner separates local from broader results
        -------------------------------------------------------------------- */}
        {searchResults.hasZipCodeMatches && searchResults.hasStateMatches && (
          <View style={styles.additionalResultsContainer}>
            <Ionicons name="map" size={20} color="#4A90E2" />
            <Text style={styles.additionalResultsText}>
              Additional services in {city}, {state}
            </Text>
          </View>
        )}

        {/* --------------------------------------------------------------------
            SECTION E: STATE-WIDE MATCHES
            Shows services from the broader state area
            These are already deduplicated (no ZIP code duplicates)
        -------------------------------------------------------------------- */}
        {searchResults.hasStateMatches && (
          <>
            {/* Render each state-level service as a card */}
            {searchResults.stateMatches.map((item) => (
              <ServiceCard
                key={item.post_id}
                item={item}
                isOwnPost={isOwnPost(item.user_id)}
                onChatPress={onChatPress}
              />
            ))}
          </>
        )}
      </>
    );
  };

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------
  
  /**
   * Main component render
   * Uses FlatList with single item for scroll performance
   * Alternative to ScrollView for better optimization
   */
  return (
    <View style={styles.container}>
      {/* Fixed header at top */}
      {renderHeader()}
      
      {/* Scrollable content area */}
      <FlatList
        data={[{ key: "content" }]}           // Single item for content
        renderItem={renderContent}            // Render function
        keyExtractor={(item) => item.key}     // Key extractor
        contentContainerStyle={styles.resultsScrollContainer}
      />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = createResponsiveStyles({
  // Main container - full screen
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  
  // Scrollable content area padding
  resultsScrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // --------------------------------------------------------------------------
  // HEADER STYLES
  // --------------------------------------------------------------------------
  
  // Blue header bar with back button and title
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#4A90E2",
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 60,                           // Extra padding for status bar
  },
  
  // Back arrow button
  backButton: {
    padding: 8,
  },
  
  // "Search Results" title text
  resultsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1,
    textAlign: "center",
  },
  
  // Placeholder for symmetric header layout
  placeholder: {
    width: 40,
  },
  
  // --------------------------------------------------------------------------
  // RESULT BANNER STYLES
  // --------------------------------------------------------------------------
  
  // Green banner for exact ZIP code results
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",               // Light green background
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",               // Green accent border
  },
  
  // Text inside info banner
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    marginLeft: 10,
    fontWeight: "500",
  },
  
  // Cyan banner for nearby ZIP code results
  nearbyResultsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F7FA",               // Light cyan background
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    marginTop: 20,                            // Extra spacing above
    borderLeftWidth: 4,
    borderLeftColor: "#00BCD4",               // Cyan accent border
  },
  
  // Text inside nearby results banner
  nearbyResultsText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    marginLeft: 10,
    fontWeight: "500",
  },
  
  // Orange banner when no local results found
  noLocalResultsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF4E5",               // Light orange background
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8C00",               // Orange accent border
  },
  
  // Text inside no local results banner
  noLocalResultsText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginLeft: 10,
    fontWeight: "600",
    lineHeight: 20,
  },
  
  // Blue banner for additional state results section
  additionalResultsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",               // Light blue background
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    marginTop: 20,                            // Extra spacing above
    borderLeftWidth: 4,
    borderLeftColor: "#4A90E2",               // Blue accent border
  },
  
  // Text inside additional results banner
  additionalResultsText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    marginLeft: 10,
    fontWeight: "500",
  },
  
  // --------------------------------------------------------------------------
  // EMPTY STATE STYLES
  // --------------------------------------------------------------------------
  
  // Container for "no results" empty state
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  
  // Primary "No services found" text
  noResultsText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  
  // Secondary suggestion text
  noResultsSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

export default SearchResultsList;