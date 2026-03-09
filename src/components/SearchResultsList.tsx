/**
 * SearchResultsList.tsx
 *
 * @updated March 2026
 * @version 2.5.0
 *
 * 2-column mini card grid.
 * Tap any card → Modal slides up showing full ServiceCard (photos, zoom, stars, contact).
 * No navigation or ServiceDetailScreen needed.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ServiceCard from "./ServiceCard";
import { createResponsiveStyles } from "../Utils/globalStyles";

// ============================================================================
// TYPE DEFINITIONS
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
  photos?: string[];
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
// HELPERS
// ============================================================================

const CATEGORY_COLORS: Record<string, string> = {
  "Cleaning":        "#4A90E2",
  "Catering":        "#E67E22",
  "Landscaping":     "#27AE60",
  "Dance Lessons":   "#9B59B6",
  "Entertainment":   "#E91E63",
  "Event Planning":  "#F39C12",
  "Beauty Services": "#E91E8C",
  "Shoe Repair":     "#795548",
};

const categoryColor = (cat: string) => CATEGORY_COLORS[cat] ?? "#607D8B";

const initials = (cat: string) =>
  cat.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

// ============================================================================
// MINI STARS
// ============================================================================

const MiniStars: React.FC<{ rating: number; count?: number }> = ({ rating, count }) => (
  <View style={miniStyles.starsRow}>
    {[1, 2, 3, 4, 5].map(s => (
      <Ionicons
        key={s}
        name={rating >= s ? "star" : rating >= s - 0.5 ? "star-half" : "star-outline"}
        size={11}
        color="#FFA500"
      />
    ))}
    {count !== undefined && count > 0 && (
      <Text style={miniStyles.ratingCount}> ({count})</Text>
    )}
  </View>
);

// ============================================================================
// MINI SERVICE CARD — tap opens Modal with full ServiceCard
// ============================================================================

const MiniServiceCard: React.FC<{
  item: ServicePost;
  isOwnPost: boolean;
  onChatPress: (item: ServicePost) => void;
}> = ({ item, isOwnPost, onChatPress }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const firstPhoto = item.photos?.[0] ?? null;
  const color = categoryColor(item.service_category);

  return (
    <>
      {/* ── Mini card ── */}
      <TouchableOpacity
        style={miniStyles.card}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.82}
      >
        {/* Photo or colored placeholder */}
        {firstPhoto ? (
          <Image
            source={{ uri: firstPhoto }}
            style={miniStyles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[miniStyles.thumbnail, miniStyles.placeholder, { backgroundColor: color }]}>
            <Text style={miniStyles.placeholderText}>{initials(item.service_category)}</Text>
          </View>
        )}

        {/* Text */}
        <View style={miniStyles.content}>
          <Text style={miniStyles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={miniStyles.category} numberOfLines={1}>{item.service_category}</Text>
          <MiniStars rating={item.average_rating ?? 0} count={item.review_count} />
          {item.city && item.state && (
            <View style={miniStyles.locationRow}>
              <Ionicons name="location-outline" size={11} color="#888" />
              <Text style={miniStyles.locationText} numberOfLines={1}>
                {" "}{item.city}, {item.state}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Full detail Modal with ServiceCard ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={modalStyles.safeArea}>
          {/* Header with close button */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={modalStyles.closeBtn}
            >
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>

          {/* ServiceCard — handles photos, zoom, stars, reviews, contact */}
          <ScrollView
            contentContainerStyle={modalStyles.body}
            showsVerticalScrollIndicator={false}
          >
            <ServiceCard
              item={item}
              isOwnPost={isOwnPost}
              onChatPress={(item) => {
                setModalVisible(false);
                setTimeout(() => onChatPress(item), 300);
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const miniStyles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
  },
  thumbnail: {
    width: "100%",
    height: 80,
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },
  content: {
    padding: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
    lineHeight: 17,
    marginBottom: 3,
  },
  category: {
    fontSize: 11,
    color: "#4A90E2",
    fontWeight: "600",
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  ratingCount: {
    fontSize: 10,
    color: "#888",
    marginLeft: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 11,
    color: "#888",
  },
});

const modalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginRight: 8,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 16,
    paddingBottom: 40,
  },
});

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

    // ── Results ─────────────────────────────────────────────────────────────
    return (
      <>
        {/* Result count + distance banner */}
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

        <Text style={styles.tapHint}>Tap a card to view full details & contact</Text>

        {/* 2-column grid */}
        <View style={styles.gridContainer}>
          {allResults.map((item) => (
            <View key={item.post_id} style={styles.gridItem}>
              <MiniServiceCard
                item={item}
                isOwnPost={isOwnPost(item.user_id)}
                onChatPress={onChatPress}
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
// STYLES
// ============================================================================

const styles = createResponsiveStyles({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  resultsScrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 30,
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
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
    marginBottom: 2,
  },
  resultsDistanceText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  tapHint: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 10,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  gridItem: {
    width: "50%",
  },
  // kept for legacy references
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
});

export default SearchResultsList;