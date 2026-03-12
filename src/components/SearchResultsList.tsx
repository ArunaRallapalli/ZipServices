/**
 * SearchResultsList.tsx
 *
 * @updated March 2026
 * @version 2.7.0
 *
 * 2-column mini card grid.
 * - Row layout: 90x90 photo (fixed pixels) + text — same as RecentPostsSection
 * - Tap → Modal with full ServiceCard
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
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ServiceCard from "./ServiceCard";
import { createResponsiveStyles } from "../Utils/globalStyles";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const CATEGORY_META: Record<string, { icon: IoniconsName; color: string }> = {
  "Cleaning":        { icon: "sparkles",       color: "#4A90E2" },
  "Catering":        { icon: "restaurant",      color: "#E67E22" },
  "Landscaping":     { icon: "leaf",            color: "#27AE60" },
  "Dance Lessons":   { icon: "musical-notes",   color: "#9B59B6" },
  "Entertainment":   { icon: "mic",             color: "#E91E63" },
  "Event Planning":  { icon: "calendar",        color: "#F39C12" },
  "Beauty Services": { icon: "cut",             color: "#D81B60" },
  "Shoe Repair":     { icon: "construct",       color: "#795548" },
  "Plumbing":        { icon: "water",           color: "#1565C0" },
  "Electrical":      { icon: "flash",           color: "#F9A825" },
  "Home Repair":     { icon: "hammer",          color: "#6D4C41" },
  "Pet Care":        { icon: "paw",             color: "#43A047" },
  "Moving":          { icon: "cube",            color: "#546E7A" },
  "Tutoring":        { icon: "school",          color: "#1E88E5" },
  "Photography":     { icon: "camera",          color: "#8E24AA" },
  "Tailoring":       { icon: "color-palette",   color: "#00897B" },
};

const DEFAULT_META = { icon: "briefcase" as IoniconsName, color: "#607D8B" };
const getCategoryMeta = (cat: string) => CATEGORY_META[cat] ?? DEFAULT_META;

const MiniStars: React.FC<{ rating: number; count?: number }> = ({ rating, count }) => (
  <View style={miniStyles.starsRow}>
    {[1, 2, 3, 4, 5].map(s => (
      <Ionicons
        key={s}
        name={rating >= s ? "star" : rating >= s - 0.5 ? "star-half" : "star-outline"}
        size={10}
        color="#FFA500"
      />
    ))}
    {count !== undefined && count > 0 && (
      <Text style={miniStyles.ratingCount}> ({count})</Text>
    )}
  </View>
);

const MiniServiceCard: React.FC<{
  item: ServicePost;
  isOwnPost: boolean;
  onChatPress: (item: ServicePost) => void;
}> = ({ item, isOwnPost, onChatPress }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const firstPhoto = item.photos?.[0] ?? null;
  const { icon, color } = getCategoryMeta(item.service_category);

  return (
    <>
      <TouchableOpacity
        style={miniStyles.card}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.80}
      >
        {firstPhoto ? (
          <View style={miniStyles.photoWrapper}>
            <Image
              source={{ uri: firstPhoto }}
              style={miniStyles.photoImage}
              resizeMode="cover"
            />
            <View style={miniStyles.expandHint}>
              <Ionicons name="expand" size={14} color="#fff" />
            </View>
          </View>
        ) : (
          <View style={[miniStyles.noPhotoBox, { backgroundColor: color + "22" }]}>
            <View style={[miniStyles.iconCircle, { backgroundColor: color }]}>
              <Ionicons name={icon} size={22} color="#fff" />
            </View>
          </View>
        )}

        <View style={miniStyles.content}>
          <Text style={miniStyles.title} numberOfLines={2}>{item.title}</Text>
          <View style={[miniStyles.categoryPill, { backgroundColor: color }]}>
            <Text style={miniStyles.categoryPillText} numberOfLines={1}>
              {item.service_category}
            </Text>
          </View>
          <MiniStars rating={item.average_rating ?? 0} count={item.review_count} />
          {item.city && item.state && (
            <View style={miniStyles.locationRow}>
              <Ionicons name="location-outline" size={10} color="#4A90E2" />
              <Text style={miniStyles.locationText} numberOfLines={1}>
                {" "}{item.city}, {item.state}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={modalStyles.safeArea}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle} numberOfLines={1}>{item.title}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={modalStyles.body} showsVerticalScrollIndicator={false}>
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
    margin: 5,
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    padding: 8,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  photoWrapper: { position: "relative", marginRight: 8 },
  photoImage: { width: 90, height: 90, borderRadius: 8 },
  expandHint: {
    position: "absolute", top: 4, right: 4,
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 10, padding: 3,
  },
  noPhotoBox: {
    width: 90, height: 90, borderRadius: 8,
    justifyContent: "center", alignItems: "center", marginRight: 8,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
  },
  content: { flex: 1, justifyContent: "flex-start" },
  title: { fontSize: 12, fontWeight: "700", color: "#1a1a1a", lineHeight: 16, marginBottom: 4 },
  categoryPill: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginBottom: 4 },
  categoryPillText: { color: "#fff", fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },
  starsRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  ratingCount: { fontSize: 9, color: "#aaa", marginLeft: 2 },
  locationRow: { flexDirection: "row", alignItems: "center" },
  locationText: { fontSize: 10, color: "#4A90E2", fontWeight: "700" },
});

const modalStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#eee",
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#222", marginRight: 8 },
  closeBtn: { padding: 4 },
  body: { padding: 16, paddingBottom: 40 },
});

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
    if (!hasResults) {
      return (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search" size={80} color="#ccc" />
          <Text style={styles.noResultsText}>No services found</Text>
          <Text style={styles.noResultsSubtext}>
            No services found within 25 miles of {zipCode}.{"\n"}
            Try searching in a nearby city or check back later.
          </Text>
        </View>
      );
    }

    return (
      <>
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

const styles = createResponsiveStyles({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  resultsScrollContainer: { flexGrow: 1, paddingHorizontal: 8, paddingTop: 16, paddingBottom: 30 },
  resultsHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#4A90E2", paddingVertical: 15, paddingHorizontal: 20, paddingTop: 60,
  },
  backButton: { padding: 8 },
  resultsTitle: { fontSize: 22, fontWeight: "bold", color: "#ffffff", flex: 1, textAlign: "center" },
  placeholder: { width: 40 },
  resultsInfoContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9",
    padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: "#4CAF50",
  },
  resultsInfoTextContainer: { flex: 1, marginLeft: 10 },
  resultsInfoText: { fontSize: 14, color: "#333", fontWeight: "600", marginBottom: 2 },
  resultsDistanceText: { fontSize: 12, color: "#666", fontWeight: "500" },
  tapHint: { fontSize: 12, color: "#999", textAlign: "center", fontStyle: "italic", marginBottom: 10 },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  gridItem: { width: "50%" },
  serviceCardContainer: { marginBottom: 20 },
  distanceIndicator: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#E3F2FD",
    paddingVertical: 8, paddingHorizontal: 12, borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8, marginTop: -8,
    borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 3, borderColor: "#4A90E2",
  },
  distanceText: { fontSize: 13, color: "#4A90E2", fontWeight: "600", marginLeft: 6 },
  noResultsContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40, paddingHorizontal: 20 },
  noResultsText: { marginTop: 20, fontSize: 18, fontWeight: "600", color: "#666", textAlign: "center" },
  noResultsSubtext: { marginTop: 12, fontSize: 14, color: "#999", textAlign: "center", lineHeight: 22 },
});

export default SearchResultsList;