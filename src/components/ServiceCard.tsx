/**
 * ServiceCard Component
 * 
 * Displays a single service post in a card format with all relevant details.
 * This is a PRESENTATIONAL component - it receives data and callbacks as props.
 * 
 * Used by: SearchResultsList component (renders one card per search result)
 * 
 * Features:
 * - Visual distinction between OFFER and REQUEST posts with colored badges
 * - "Your Post" banner for posts created by the current user
 * - Comprehensive post information display (title, description, price, location, contact)
 * - "Contact Provider" button that triggers chat navigation
 * - Disabled state for user's own posts (can't contact yourself)
 * - Icons for better visual hierarchy and scannability
 * 
 * @component
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * ServicePost Interface
 * Represents all data for a single service listing
 * Matches the backend API response structure
 */
interface ServicePost {
  post_id: number;           // Unique identifier for the post
  user_id: number;           // ID of the user who created the post
  poster_type: string;       // Type of poster (e.g., "business_owner", "customer")
  post_type: string;         // Either "offer" (providing service) or "request" (seeking service)
  title: string;             // Post headline/title
  description?: string;      // Optional detailed description
  service_category: string;  // Category (e.g., "Plumbing", "Catering")
  price_range?: string;      // Optional price or budget range
  phone_number?: string;     // Optional contact phone
  contact_email?: string;    // Optional contact email
  zip_code?: string;         // Optional ZIP code
  city?: string;             // Optional city name
  state?: string;            // Optional state abbreviation
  poster_name?: string;      // Optional full name of poster
  business_name?: string;    // Optional business name (for business owners)
}

/**
 * ServiceCardProps Interface
 * Props required by the ServiceCard component
 */
interface ServiceCardProps {
  item: ServicePost;                           // The service post data to display
  isOwnPost: boolean;                          // True if this post belongs to the current user
  onChatPress: (item: ServicePost) => void;    // Callback when "Contact Provider" is pressed
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ServiceCard: React.FC<ServiceCardProps> = ({
  item,
  isOwnPost,
  onChatPress,
}) => {
  return (
    <View style={styles.card}>
      {/* 
        "Your Post" Banner
        - Only visible when isOwnPost === true
        - Helps user quickly identify their own posts in search results
        - Orange color scheme for visibility
      */}
      {isOwnPost && (
        <View style={styles.ownPostBanner}>
          <Text style={styles.ownPostText}>Your Post</Text>
        </View>
      )}

      {/* 
        Card Header
        - Contains title and post type badge
        - Flexbox layout: title takes remaining space, badge is fixed width
      */}
      <View style={styles.cardHeader}>
        {/* Service title - main headline of the post */}
        <Text style={styles.serviceTitle}>{item.title}</Text>
        
        {/* 
          Post Type Badge
          - Green badge for "offer" posts (someone providing a service)
          - Blue badge for "request" posts (someone seeking a service)
          - Helps users quickly identify post type
        */}
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

      {/* 
        Business Name
        - Only shown if business_name exists
        - Displayed in italic style as a subtitle
        - Format: "by [Business Name]"
      */}
      {item.business_name && (
        <Text style={styles.posterName}>by {item.business_name}</Text>
      )}

      {/* 
        Service Category
        - Shows which category this service belongs to
        - Includes briefcase icon for visual context
        - Blue color to indicate it's a category/tag
      */}
      <Text style={styles.categoryText}>
        <Ionicons name="briefcase" size={14} color="#4A90E2" />{" "}
        {item.service_category}
      </Text>

      {/* 
        Description
        - Full description of the service or request
        - Limited to 3 lines with ellipsis if too long
        - Only shown if description exists
      */}
      {item.description && (
        <Text style={styles.descriptionText} numberOfLines={3}>
          {item.description}
        </Text>
      )}

      {/* 
        Price Range
        - Shows price (for offers) or budget (for requests)
        - Includes cash icon
        - Green color to indicate financial information
        - Only shown if price_range exists
      */}
      {item.price_range && (
        <Text style={styles.priceText}>
          <Ionicons name="cash" size={14} color="#2E7D32" /> {item.price_range}
        </Text>
      )}

      {/* 
        Location Information
        - Displays ZIP code and/or city, state
        - Flexbox wrapping for responsive layout
        - Uses location icon for visual context
      */}
      <View style={styles.locationContainer}>
        {/* ZIP Code */}
        {item.zip_code && (
          <Text style={styles.locationText}>
            <Ionicons name="location" size={12} color="#666" /> {item.zip_code}
          </Text>
        )}
        {/* City, State */}
        {item.city && item.state && (
          <Text style={styles.locationText}>
            {item.city}, {item.state}
          </Text>
        )}
      </View>

      {/* 
        Contact Information Section
        - Optional phone number with call icon
        - Optional email with mail icon
        - Only shown if the respective fields exist
      */}
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

      {/* 
        Action Section - Conditional rendering based on post ownership
        
        Case 1: Not user's own post
        - Shows "Contact Provider" button
        - Clicking navigates to ChatScreen with provider
        - Blue background, prominent call-to-action
        
        Case 2: User's own post
        - Shows disabled state message
        - Gray background to indicate inactive state
        - Prevents user from contacting themselves
      */}
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

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Main card container - light gray background with border and shadow
  card: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: "#fafafa",
  },
  
  // Header section - contains title and badge
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  
  // Service title - bold, large text
  serviceTitle: {
    flex: 1,                  // Take remaining space
    fontWeight: "bold",
    fontSize: 18,
    color: "#333",
    marginRight: 10,          // Space between title and badge
  },
  
  // Badge container - base styles for both offer and request badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  
  // Green badge for "offer" posts
  offerBadge: {
    backgroundColor: "#4CAF50",
  },
  
  // Blue badge for "request" posts
  requestBadge: {
    backgroundColor: "#2196F3",
  },
  
  // Badge text - white, small, bold
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  
  // Business name - italic, gray, subtitle style
  posterName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    fontStyle: "italic",
  },
  
  // Category text - blue to indicate it's a tag/category
  categoryText: {
    fontSize: 14,
    color: "#4A90E2",
    marginBottom: 8,
    fontWeight: "600",
  },
  
  // Description text - gray, multi-line
  descriptionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,          // Better readability for multi-line text
  },
  
  // Price text - green to indicate financial information
  priceText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
    marginBottom: 8,
  },
  
  // Location container - wrapping flex row for responsive layout
  locationContainer: {
    flexDirection: "row",
    flexWrap: "wrap",        // Allow items to wrap to next line if needed
    marginBottom: 8,
  },
  
  // Location text - gray, with spacing
  locationText: {
    fontSize: 13,
    color: "#666",
    marginRight: 15,         // Space between multiple location items
    marginBottom: 4,
  },
  
  // Contact info text - gray, smaller font
  contactText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  
  // "Contact Provider" button - blue, prominent call-to-action
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
  
  // Button text - white, bold
  chatButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  
  // "Your Post" banner - orange theme for visibility
  ownPostBanner: {
    backgroundColor: "#FFF4E5",   // Light orange background
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FF8C00",   // Orange accent border
  },
  
  // "Your Post" banner text - orange, bold
  ownPostText: {
    color: "#FF8C00",
    fontSize: 13,
    fontWeight: "600",
  },
  
  // Disabled state container for own posts
  ownPostActions: {
    backgroundColor: "#f0f0f0",   // Light gray to indicate disabled
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  
  // Disabled state text - gray, centered, italic
  ownPostActionText: {
    color: "#666",
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default ServiceCard;

/**
 * ============================================================================
 * COMPONENT USAGE EXAMPLE
 * ============================================================================
 * 
 * <ServiceCard
 *   item={{
 *     post_id: 123,
 *     user_id: 456,
 *     post_type: "offer",
 *     title: "Professional Plumbing Services",
 *     description: "Licensed plumber with 10 years experience...",
 *     service_category: "Plumbing",
 *     price_range: "$50-$150/hour",
 *     business_name: "John's Plumbing",
 *     city: "Phoenix",
 *     state: "AZ",
 *     zip_code: "85001",
 *     phone_number: "(555) 123-4567",
 *     // ... other fields
 *   }}
 *   isOwnPost={false}
 *   onChatPress={(item) => {
 *     // Navigate to chat screen
 *     navigation.navigate("ChatScreen", {
 *       otherUserId: item.user_id,
 *       otherUserName: item.business_name || item.poster_name
 *     });
 *   }}
 * />
 * 
 * ============================================================================
 * DATA FLOW
 * ============================================================================
 * 
 * SearchResultsScreen (parent)
 *   └─> Performs search and gets results
 *   └─> Passes results to SearchResultsList
 *       └─> Maps over results array
 *           └─> Renders ServiceCard for each result
 *               └─> User clicks "Contact Provider"
 *                   └─> onChatPress callback
 *                       └─> Bubbles up to SearchResultsScreen
 *                           └─> Navigates to ChatScreen
 * 
 * ============================================================================
 */