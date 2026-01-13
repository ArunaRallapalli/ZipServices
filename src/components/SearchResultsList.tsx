/**
 * SearchResultsList.tsx
 * 
 * @updated 2026-01-04
 * @version 2.1.0 - Added star ratings display
 * 
 * OVERVIEW:
 * Component that displays search results for service providers using radius-based search.
 * Shows results sorted by distance with visual distance indicators and star ratings.
 * 
 * UPDATED FOR RATINGS:
 * - Displays star ratings on each service card
 * - Shows review counts for providers with reviews
 * - ServicePost interface includes average_rating and review_count
 * 
 * KEY FEATURES:
 * - Distance-based result display (e.g., "7.3 miles away")
 * - Star ratings for service providers (e.g., ⭐ 4.8 (24 reviews))
 * - Visual indicators for proximity
 * - Handles empty state with helpful messaging
 * - Back navigation to search form
 * - Contact/chat functionality for each service
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
 * Service post data structure returned from radius-based search
 * NOW INCLUDES: distance field (in miles from search center)
 * NOW INCLUDES: average_rating and review_count for star ratings
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
  distance?: number;                  // Distance in miles from search center
  is_active?: boolean;                // Whether the post is active
  average_rating?: number;            // ← NEW: Average star rating (0-5)
  review_count?: number;              // ← NEW: Number of reviews received
}

/**
 * Search results from radius-based search
 * All results are in a single array, sorted by distance
 */
interface SearchResults {
  exactZipMatches: ServicePost[];     // All results (sorted by distance)
  nearbyZipMatches: ServicePost[];    // Deprecated (not used)
  zipCodeMatches: ServicePost[];      // Same as exactZipMatches
  stateMatches: ServicePost[];        // Deprecated (not used)
  hasZipCodeMatches: boolean;         // Flag: has any results
  hasStateMatches: boolean;           // Deprecated (always false)
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
  // RESULT PROCESSING
  // --------------------------------------------------------------------------
  
  /**
   * Get all results from the search
   * With radius-based search, all results are in zipCodeMatches
   * They're already sorted by distance (closest first)
   */
  const allResults = (searchResults.zipCodeMatches || [])
    .filter(item => item.is_active !== false);
  
  /**
   * Check if any results exist
   */
  const hasResults = allResults.length > 0;
  
  
  /**
   * Get distance range for display
   */
  const closestDistance = allResults[0]?.distance;
  const farthestDistance = allResults[allResults.length - 1]?.distance;

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
            No services found within 25 miles of {zipCode}.{"\n"}
            Try searching in a nearby city or check back later for new listings.
          </Text>
        </View>
      );
    }

    // --------------------------------------------------------------------------
    // SCENARIO 2: RESULTS FOUND
    // --------------------------------------------------------------------------
    return (
      <>
        {/* --------------------------------------------------------------------
            RESULTS HEADER WITH DISTANCE INFO
            Shows count of services and distance range
        -------------------------------------------------------------------- */}
        <View style={styles.resultsInfoContainer}>
          <Ionicons name="location" size={20} color="#4CAF50" />
          <View style={styles.resultsInfoTextContainer}>
            <Text style={styles.resultsInfoText}>
              Found {allResults.length} service{allResults.length !== 1 ? "s" : ""} near {zipCode}
            </Text>
            {closestDistance !== undefined && farthestDistance !== undefined && (
              <Text style={styles.resultsDistanceText}>
                {closestDistance === farthestDistance 
                  ? `${closestDistance} miles away`
                  : `${closestDistance} - ${farthestDistance} miles away`
                }
              </Text>
            )}
          </View>
        </View>

        {/* --------------------------------------------------------------------
            SERVICE CARDS
            Each card displays service info with distance and star rating
        -------------------------------------------------------------------- */}
        {allResults.map((item) => (
          <View key={item.post_id} style={styles.serviceCardContainer}>
            <ServiceCard
              item={item}
              isOwnPost={isOwnPost(item.user_id)}
              onChatPress={onChatPress}
            />
            
            {/* Distance indicator below each card */}
            {item.distance !== undefined && (
              <View style={styles.distanceIndicator}>
                <Ionicons name="navigate" size={16} color="#4A90E2" />
                <Text style={styles.distanceText}>
                  {item.distance} mile{item.distance !== 1 ? "s" : ""} away
                </Text>
              </View>
            )}
          </View>
        ))}
      </>
    );
  };

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------
  
  /**
   * Main component render
   * Uses FlatList with single item for scroll performance
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
    paddingBottom: 20,
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
  // RESULTS INFO BANNER STYLES
  // --------------------------------------------------------------------------
  
  // Green banner showing result count and distance range
  resultsInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",               // Light green background
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",               // Green accent border
  },
  
  // Container for info text (allows multiline)
  resultsInfoTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  
  // Primary info text (count)
  resultsInfoText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    marginBottom: 4,
  },
  
  // Secondary info text (distance range)
  resultsDistanceText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  
  // --------------------------------------------------------------------------
  // SERVICE CARD STYLES
  // --------------------------------------------------------------------------
  
  // Container for each service card with distance
  serviceCardContainer: {
    marginBottom: 20,
  },
  
  // Distance indicator below each card
  distanceIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",               // Light blue background
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -8,                            // Overlap with card slightly
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#4A90E2",                   // Blue border
  },
  
  // Distance text
  distanceText: {
    fontSize: 13,
    color: "#4A90E2",
    fontWeight: "600",
    marginLeft: 6,
  },
  
  // --------------------------------------------------------------------------
  // EMPTY STATE STYLES
  // --------------------------------------------------------------------------
  
  // Container for "no results" empty state
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
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
    marginTop: 12,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 22,
  },
});

export default SearchResultsList;