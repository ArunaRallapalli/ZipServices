/**
 * ServiceCard Component - With Custom Photo Zoom
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Modal, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StarRating from "./StarRating";
import ReviewsModal from "./Reviewsmodal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  average_rating?: number;
  review_count?: number;
  photos?: string[];
}

interface ServiceCardProps {
  item: ServicePost;
  isOwnPost: boolean;
  onChatPress: (item: ServicePost) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ServiceCard: React.FC<ServiceCardProps> = ({
  item,
  isOwnPost,
  onChatPress,
}) => {
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  
  // ✅ Photo viewer state
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoModalVisible(true);
  };

  const closePhotoViewer = () => {
    setPhotoModalVisible(false);
  };

  const goToNextPhoto = () => {
    if (item.photos && selectedPhotoIndex < item.photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const goToPreviousPhoto = () => {
    if (selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

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

      {item.review_count !== undefined && (
        <TouchableOpacity 
          style={styles.ratingContainer}
          onPress={() => setShowReviewsModal(true)}
          activeOpacity={0.7}
        >
          <StarRating
            rating={item.average_rating || 0}
            size={16}
            showCount={true}
            reviewCount={item.review_count}
          />
          <Ionicons name="chevron-forward" size={16} color="#999" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
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
     
      {/* ========== PHOTO DISPLAY WITH ZOOM ========== */}
      {item.photos && item.photos.length > 0 && (
        <View style={styles.photosContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.photoScroll}
          >
            {item.photos.map((photoUrl, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.photoWrapper}
                onPress={() => openPhotoViewer(index)}
                activeOpacity={0.8}
              >
                <Image 
                  source={{ uri: photoUrl }} 
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                <View style={styles.zoomIndicator}>
                  <Ionicons name="expand" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.photoCount}>
            📸 {item.photos.length} photo{item.photos.length > 1 ? 's' : ''} • Tap to zoom
          </Text>
        </View>
      )}
      {/* ========== END PHOTO DISPLAY ========== */}
      
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

      <ReviewsModal
        visible={showReviewsModal}
        providerId={item.user_id}
        providerName={item.business_name || item.poster_name || 'Provider'}
        onClose={() => setShowReviewsModal(false)}
      />

      {/* ✅ CUSTOM PHOTO VIEWER MODAL */}
      <Modal
        visible={photoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closePhotoViewer}
      >
        <View style={styles.photoModalContainer}>
          <TouchableOpacity 
            style={styles.photoModalOverlay}
            activeOpacity={1}
            onPress={closePhotoViewer}
          >
            <View style={styles.photoModalContent}>
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closePhotoViewer}
              >
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>

              {/* Photo Counter */}
              <View style={styles.photoCounter}>
                <Text style={styles.photoCounterText}>
                  {selectedPhotoIndex + 1} / {item.photos?.length}
                </Text>
              </View>

              {/* Main Photo */}
              <ScrollView
                style={styles.photoScrollView}
                contentContainerStyle={styles.photoScrollContent}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Image
                  source={{ uri: item.photos?.[selectedPhotoIndex] }}
                  style={styles.fullPhoto}
                  resizeMode="contain"
                />
              </ScrollView>

              {/* Navigation Arrows */}
              {item.photos && item.photos.length > 1 && (
                <>
                  {selectedPhotoIndex > 0 && (
                    <TouchableOpacity 
                      style={[styles.navButton, styles.prevButton]}
                      onPress={goToPreviousPhoto}
                    >
                      <Ionicons name="chevron-back" size={32} color="#fff" />
                    </TouchableOpacity>
                  )}
                  
                  {selectedPhotoIndex < item.photos.length - 1 && (
                    <TouchableOpacity 
                      style={[styles.navButton, styles.nextButton]}
                      onPress={goToNextPhoto}
                    >
                      <Ionicons name="chevron-forward" size={32} color="#fff" />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
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
  
  // Photo Thumbnails
  photosContainer: {
    marginBottom: 12,
  },
  photoScroll: {
    marginBottom: 4,
  },
  photoWrapper: {
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  zoomIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  photoCount: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },

  // ✅ Photo Modal Styles
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  photoModalOverlay: {
    flex: 1,
  },
  photoModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  photoCounter: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  photoCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoScrollView: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  photoScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 24,
    zIndex: 10,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
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