/**
 * ServiceDetailScreen.tsx
 *
 * @created March 2026
 *
 * Full-screen detail view for a service post.
 * Opened when user taps a MiniServiceCard in SearchResultsList.
 *
 * Shows: title, badge, business name, star rating, category,
 *        description, photos (scrollable + zoomable), price,
 *        location, and Contact Provider button.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/MainStackNavigator";
import StarRating from "./StarRating";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ============================================================================
// TYPES
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

type ServiceDetailRouteProp = RouteProp<RootStackParamList, "ServiceDetail">;
type ServiceDetailNavProp = StackNavigationProp<RootStackParamList, "ServiceDetail">;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ServiceDetailScreen: React.FC = () => {
  const navigation = useNavigation<ServiceDetailNavProp>();
  const route = useRoute<ServiceDetailRouteProp>();

  // item and onChatPress passed from SearchResultsList via navigation params
  const { item, onChatPress } = route.params;

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const openPhoto = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoModalVisible(true);
  };

  const goNext = () => {
    if (item.photos && selectedPhotoIndex < item.photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const goPrev = () => {
    if (selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Service Details
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Title + badge row */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={[
            styles.badge,
            item.post_type === "offer" ? styles.offerBadge : styles.requestBadge,
          ]}>
            <Text style={styles.badgeText}>
              {item.post_type === "offer" ? "OFFER" : "REQUEST"}
            </Text>
          </View>
        </View>

        {/* Business name */}
        {item.business_name ? (
          <Text style={styles.businessName}>🏢 {item.business_name}</Text>
        ) : item.poster_name ? (
          <Text style={styles.businessName}>👤 {item.poster_name}</Text>
        ) : null}

        {/* Star rating */}
        {item.review_count !== undefined && (
          <View style={styles.ratingRow}>
            <StarRating
              rating={item.average_rating || 0}
              size={18}
              showCount={true}
              reviewCount={item.review_count}
            />
          </View>
        )}

        <View style={styles.divider} />

        {/* Category */}
        <View style={styles.infoRow}>
          <Ionicons name="briefcase" size={16} color="#4A90E2" />
          <Text style={styles.infoText}>{item.service_category}</Text>
        </View>

        {/* Distance */}
        {item.distance !== undefined && (
          <View style={styles.infoRow}>
            <Ionicons name="navigate" size={16} color="#4A90E2" />
            <Text style={styles.infoText}>
              {item.distance} mile{item.distance !== 1 ? "s" : ""} away
            </Text>
          </View>
        )}

        {/* Location */}
        {(item.city || item.zip_code) && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color="#4A90E2" />
            <Text style={styles.infoText}>
              {[item.city, item.state].filter(Boolean).join(", ")}
              {item.zip_code ? `  ${item.zip_code}` : ""}
            </Text>
          </View>
        )}

        {/* Price */}
        {item.price_range && (
          <View style={styles.infoRow}>
            <Ionicons name="cash" size={16} color="#2E7D32" />
            <Text style={[styles.infoText, styles.priceText]}>{item.price_range}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Description */}
        {item.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About this service</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        ) : null}

        {/* Photos */}
        {item.photos && item.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Photos ({item.photos.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {item.photos.map((uri, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.photoWrapper}
                  onPress={() => openPhoto(index)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                  <View style={styles.zoomBadge}>
                    <Ionicons name="expand" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.photoHint}>Tap photo to zoom</Text>
          </View>
        )}

        {/* Contact button */}
        <TouchableOpacity
          style={styles.contactBtn}
          onPress={() => {
            navigation.goBack();
            // slight delay so screen pops before chat opens
            setTimeout(() => onChatPress(item), 300);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
          <Text style={styles.contactBtnText}>  Contact Provider</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Photo zoom modal ── */}
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.modalBg}>
          {/* Close */}
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setPhotoModalVisible(false)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          {/* Counter */}
          <View style={styles.modalCounter}>
            <Text style={styles.modalCounterText}>
              {selectedPhotoIndex + 1} / {item.photos?.length}
            </Text>
          </View>

          {/* Full photo */}
          <ScrollView
            style={{ flex: 1, width: SCREEN_WIDTH }}
            contentContainerStyle={styles.modalPhotoContainer}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <Image
              source={{ uri: item.photos?.[selectedPhotoIndex] }}
              style={styles.modalPhoto}
              resizeMode="contain"
            />
          </ScrollView>

          {/* Prev / Next arrows */}
          {item.photos && item.photos.length > 1 && (
            <>
              {selectedPhotoIndex > 0 && (
                <TouchableOpacity style={[styles.navBtn, styles.prevBtn]} onPress={goPrev}>
                  <Ionicons name="chevron-back" size={32} color="#fff" />
                </TouchableOpacity>
              )}
              {selectedPhotoIndex < item.photos.length - 1 && (
                <TouchableOpacity style={[styles.navBtn, styles.nextBtn]} onPress={goNext}>
                  <Ionicons name="chevron-forward" size={32} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  headerPlaceholder: {
    width: 36,
  },

  // Body
  body: {
    padding: 20,
    paddingBottom: 40,
  },

  // Title row
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#222",
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  offerBadge: {
    backgroundColor: "#4CAF50",
  },
  requestBadge: {
    backgroundColor: "#2196F3",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Business / poster name
  businessName: {
    fontSize: 15,
    color: "#555",
    fontStyle: "italic",
    marginBottom: 8,
  },

  // Rating row
  ratingRow: {
    marginBottom: 8,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 14,
  },

  // Info rows (category, distance, location, price)
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    color: "#444",
    marginLeft: 8,
  },
  priceText: {
    color: "#2E7D32",
    fontWeight: "700",
  },

  // Sections (description, photos)
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: "#444",
    lineHeight: 23,
  },

  // Photos
  photoWrapper: {
    marginRight: 10,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 10,
  },
  zoomBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    padding: 4,
  },
  photoHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#aaa",
    fontStyle: "italic",
  },

  // Contact button
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  contactBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },

  // Photo zoom modal
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  modalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
  },
  modalCounter: {
    position: "absolute",
    top: 58,
    alignSelf: "center",
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalCounterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalPhotoContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  navBtn: {
    position: "absolute",
    top: "50%",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 12,
    borderRadius: 24,
    zIndex: 10,
  },
  prevBtn: { left: 16 },
  nextBtn: { right: 16 },
});

export default ServiceDetailScreen;