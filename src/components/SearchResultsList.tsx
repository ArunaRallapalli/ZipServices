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

interface SearchResults {
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

const SearchResultsList: React.FC<SearchResultsListProps> = ({
  searchResults,
  isOwnPost,
  onChatPress,
  onBackPress,
  zipCode,
  city,
  state,
}) => {
  const hasResults =
    searchResults.zipCodeMatches.length > 0 ||
    searchResults.stateMatches.length > 0;

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
            Try adjusting your search criteria or check back later for new
            listings
          </Text>
        </View>
      );
    }

    return (
      <>
        {searchResults.hasZipCodeMatches && (
          <>
            <View style={styles.infoContainer}>
              <Ionicons name="location" size={20} color="#4CAF50" />
              <Text style={styles.infoText}>
                Found {searchResults.zipCodeMatches.length} service
                {searchResults.zipCodeMatches.length !== 1 ? "s" : ""} in your
                area ({zipCode})
              </Text>
            </View>

            {searchResults.zipCodeMatches.map((item) => (
              <ServiceCard
                key={item.post_id}
                item={item}
                isOwnPost={isOwnPost(item.user_id)}
                onChatPress={onChatPress}
              />
            ))}
          </>
        )}

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

        {searchResults.hasZipCodeMatches && searchResults.hasStateMatches && (
          <View style={styles.additionalResultsContainer}>
            <Ionicons name="map" size={20} color="#4A90E2" />
            <Text style={styles.additionalResultsText}>
              Additional services in {city}, {state}
            </Text>
          </View>
        )}

        {searchResults.hasStateMatches && (
          <>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  resultsScrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    marginLeft: 10,
    fontWeight: "500",
  },
  noLocalResultsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF4E5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8C00",
  },
  noLocalResultsText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginLeft: 10,
    fontWeight: "600",
    lineHeight: 20,
  },
  additionalResultsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#4A90E2",
  },
  additionalResultsText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    marginLeft: 10,
    fontWeight: "500",
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noResultsText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  noResultsSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

export default SearchResultsList;