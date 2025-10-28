import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

interface ServiceCardProps {
  item: ServicePost;
  isOwnPost: boolean;
  onChatPress: (item: ServicePost) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  item,
  isOwnPost,
  onChatPress,
}) => {
  return (
    <View style={styles.card}>
      {isOwnPost && (
        <View style={styles.ownPostBanner}>
          <Text style={styles.ownPostText}>Your Post</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <View
          style={[
            styles.badge,
            item.post_type === "offer" ? styles.offerBadge : styles.requestBadge,
          ]}
        >
          <Text style={styles.badgeText}>
            {item.post_type === "offer" ? "OFFER" : "REQUEST"}
          </Text>
        </View>
      </View>

      {item.business_name && (
        <Text style={styles.posterName}>by {item.business_name}</Text>
      )}

      <Text style={styles.categoryText}>
        <Ionicons name="briefcase" size={14} color="#4A90E2" />{" "}
        {item.service_category}
      </Text>

      {item.description && (
        <Text style={styles.descriptionText} numberOfLines={3}>
          {item.description}
        </Text>
      )}

      {item.price_range && (
        <Text style={styles.priceText}>
          <Ionicons name="cash" size={14} color="#2E7D32" /> {item.price_range}
        </Text>
      )}

      <View style={styles.locationContainer}>
        {item.zip_code && (
          <Text style={styles.locationText}>
            <Ionicons name="location" size={12} color="#666" /> {item.zip_code}
          </Text>
        )}
        {item.city && item.state && (
          <Text style={styles.locationText}>
            {item.city}, {item.state}
          </Text>
        )}
      </View>

      {item.phone_number && (
        <Text style={styles.contactText}>
          <Ionicons name="call" size={12} color="#666" /> {item.phone_number}
        </Text>
      )}

      {item.contact_email && (
        <Text style={styles.contactText}>
          <Ionicons name="mail" size={12} color="#666" /> {item.contact_email}
        </Text>
      )}

      {!isOwnPost ? (
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => onChatPress(item)}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#ffffff" />
          <Text style={styles.chatButtonText}> Contact Provider</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.ownPostActions}>
          <Text style={styles.ownPostActionText}>
            This is your post. You cannot contact yourself.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: "#fafafa",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  serviceTitle: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 18,
    color: "#333",
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  offerBadge: {
    backgroundColor: "#4CAF50",
  },
  requestBadge: {
    backgroundColor: "#2196F3",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  posterName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    fontStyle: "italic",
  },
  categoryText: {
    fontSize: 14,
    color: "#4A90E2",
    marginBottom: 8,
    fontWeight: "600",
  },
  descriptionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  priceText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: "#666",
    marginRight: 15,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  chatButton: {
    marginTop: 12,
    backgroundColor: "#4A90E2",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  chatButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  ownPostBanner: {
    backgroundColor: "#FFF4E5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FF8C00",
  },
  ownPostText: {
    color: "#FF8C00",
    fontSize: 13,
    fontWeight: "600",
  },
  ownPostActions: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  ownPostActionText: {
    color: "#666",
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default ServiceCard;