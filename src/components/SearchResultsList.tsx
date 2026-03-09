/**
 * SearchResultsList.tsx
 *
 * @updated 2026-01-04
 * @version 2.1.0 - Added star ratings display
 *
 * March 2026: Results now display as a 2-column compact grid.
 *             Tap a card to expand full details + Contact button.
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
// TYPE DEFINITIONS  (unchanged)
// ============================================================================

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
  distance?: number;
  is_active?: boolean;
  average_rating?: number;
  review_count?: number;
}

interface SearchResults {
  exactZipMatches: ServicePost[];
  nearbyZipMatches: ServicePost[];
  zipCodeMatches: ServicePost[];
  stateMatches: ServicePost[];
  hasZipCodeMatches: boolean;
  hasStateMatches: boolean;
}

interface SearchResultsListProps {
  searchResults: SearchResults;
  isOwnPost: (userId: number) => boolean;
  onChatPress: (item: ServicePost) => void;
  onBackPress: () => void;
  zipCode: string;
  city: string;
  state: string;
}

// ============================================================================
// MINI CARD  ← ADDED: compact 2-column card; tap to expand
// ============================================================================

const MiniServiceCard: React.FC<{
  item: ServicePost;
  onContactPress: () => void;
}> = ({ item, onContactPress }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <TouchableOpacity
      style={miniStyles.card}
      onPress={() => setExpanded(prev => !prev)}
      activeOpacity={0.85}
    >
      {/* Always-visible summary */}
      <Text style={miniStyles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={miniStyles.category}>
        <Ionicons name="briefcase" size={12} color="#4A90E2" />{" "}
        {item.service_category}
      </Text>
      {item.distance !== undefined && (
        <Text style={miniStyles.distance}>
          <Ionicons name="navigate" size={11} color="#4A90E2" />{" "}
          {item.distance} mi
        </Text>
      )}

      {/* Expanded details shown on tap */}
      {expanded && (
        <View style={miniStyles.details}>
          {item.business_name ? (
            <Text style={miniStyles.detailLine}>🏢 {item.business_name}</Text>
          ) : null}
          {item.description ? (
            <Text style={miniStyles.desc} numberOfLines={4}>{item.description}</Text>
          ) : null}
          {item.price_range ? (
            <Text style={miniStyles.detailLine}>💰 {item.price_range}</Text>
          ) : null}
          {item.city && item.state ? (
            <Text style={miniStyles.detailLine}>📍 {item.city}, {item.state}</Text>
          ) : null}
          <TouchableOpacity style={miniStyles.contactBtn} onPress={onContactPress}>
            <Ionicons name="chatbubble-ellipses" size={14} color="#fff" />
            <Text style={miniStyles.contactBtnText}> Contact</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Expand/collapse hint */}
      <Ionicons
        name={expanded ? "chevron-up" : "chevron-down"}
        size={14}
        color="#bbb"
        style={miniStyles.chevron}
      />
    </TouchableOpacity>
  );
};

const miniStyles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 5,
  },
  category: {
    fontSize: 12,
    color: "#4A90E2",
    fontWeight: "600",
    marginBottom: 3,
  },
  distance: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
  },
  details: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 8,
  },
  detailLine: {
    fontSize: 12,
    color: "#555",
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
    lineHeight: 17,
  },
  contactBtn: {
    flexDirection: "row",
    backgroundColor: "#4A90E2",
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  contactBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  chevron: {
    alignSelf: "center",
    marginTop: 4,
  },
});

// ============================================================================
// MAIN COMPONENT  (structure unchanged; only renderContent updated)
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
  const allResults = (searchResults.zipCodeMatches || [])
    .filter(item => item.is_active !== false);

  const hasResults = allResults.length > 0;
  const closestDistance = allResults[0]?.distance;
  const farthestDistance = allResults[allResults.length - 1]?.distance;

  const renderHeader = () => (
    <View style={styles.resultsHeader}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </TouchableOpacity>
      <Text style={styles.resultsTitle}>Search Results</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderContent = () => {
    // ── No results ──────────────────────────────────────────────────────────
    if (!hasResults) {
      return (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search" size={80} color="#ccc" />
          <Text style={styles.noResultsText}>No services found</Text>
          <Text style={styles.noResultsSubtext}>
            No services found within 25 miles of {zipCode}.{"\n"}
            Try searching in a nearby city or check back later for new listings.
          </Text>
        </View>
      );
    }

    // ── Results — 2-column grid ─────────────────────────────────────────────
    return (
      <>
        {/* Result count + distance banner (unchanged) */}
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
                  : `${closestDistance} - ${farthestDistance} miles away`}
              </Text>
            )}
          </View>
        </View>

        {/* ── 2-column mini card grid ── */}
        <View style={styles.gridContainer}>
          {allResults.map((item) => (
            <View key={item.post_id} style={styles.gridItem}>
              <MiniServiceCard
                item={item}
                onContactPress={() => onChatPress(item)}
              />
            </View>
          ))}
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={[{ key: "content" }]}
        renderItem={renderContent}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.resultsScrollContainer}
      />
    </View>
  );
};

// ============================================================================
// STYLES  (all original styles kept; 2 new grid styles added at the bottom)
// ============================================================================

const styles = createResponsiveStyles({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  resultsScrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 14,   // slightly tighter for grid
    paddingTop: 20,
    paddingBottom: 20,
  },

  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#4A90E2",
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  backButton: {
    padding: 8,
  },

  resultsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1,
    textAlign: "center",
  },

  placeholder: {
    width: 40,
  },

  resultsInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },

  resultsInfoTextContainer: {
    flex: 1,
    marginLeft: 10,
  },

  resultsInfoText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    marginBottom: 4,
  },

  resultsDistanceText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },

  // kept for any legacy references
  serviceCardContainer: {
    marginBottom: 20,
  },

  distanceIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -8,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#4A90E2",
  },

  distanceText: {
    fontSize: 13,
    color: "#4A90E2",
    fontWeight: "600",
    marginLeft: 6,
  },

  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  noResultsText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },

  noResultsSubtext: {
    marginTop: 12,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 22,
  },

  // ← ADDED: 2-column grid layout
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },

  gridItem: {
    width: "50%",
  },
});

export default SearchResultsList;