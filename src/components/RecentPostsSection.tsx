/**
 * RecentPostsSection.tsx
 *
 * UPDATED March 2026 v4.0:
 * - 2-column mini card grid (home page): 1 photo thumbnail, title, stars, location
 * - Tap → DetailModal: full ServiceCard-style photo gallery + zoom + description + Contact Provider
 * - Photo rendering copied exactly from production ServiceCard (fixed pixel dims, no width:'100%')
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServicePost } from '../Utils/searchUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 40) / 2; // 2 columns with padding

// ============================================================================
// TYPES
// ============================================================================

interface RecentPostsSectionProps {
  recentPosts: ServicePost[];
  isOwnPost: (postUserId: number) => boolean;
  onChatPress: (item: ServicePost) => void;
  loading: boolean;
}

// ============================================================================
// MINI STARS
// ============================================================================

const MiniStars: React.FC<{ rating: number; count?: number }> = ({ rating, count }) => (
  <View style={miniStyles.starsRow}>
    {[1, 2, 3, 4, 5].map(s => (
      <Ionicons
        key={s}
        name={rating >= s ? 'star' : rating >= s - 0.5 ? 'star-half' : 'star-outline'}
        size={10}
        color="#FFA500"
      />
    ))}
    {count !== undefined && (
      <Text style={miniStyles.ratingCount}>({count})</Text>
    )}
  </View>
);

// ============================================================================
// DETAIL MODAL — ServiceCard photo approach, copied exactly from production
// ============================================================================

const DetailModal: React.FC<{
  item: ServicePost;
  visible: boolean;
  isOwnPost: boolean;
  onClose: () => void;
  onChatPress: (item: ServicePost) => void;
}> = ({ item, visible, isOwnPost, onClose, onChatPress }) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const photos = item.photos ?? [];

  const openZoom = (index: number) => {
    setSelectedPhotoIndex(index);
    setZoomVisible(true);
  };

  const goNext = () => {
    if (selectedPhotoIndex < photos.length - 1) setSelectedPhotoIndex(i => i + 1);
  };
  const goPrev = () => {
    if (selectedPhotoIndex > 0) setSelectedPhotoIndex(i => i - 1);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Header */}
        <View style={modalStyles.header}>
          <Text style={modalStyles.headerTitle} numberOfLines={2}>{item.title}</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={26} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modalStyles.body} showsVerticalScrollIndicator={false}>

          {/* ── Category + Type badges ── */}
          <View style={modalStyles.metaRow}>
            <View style={modalStyles.categoryBadge}>
              <Text style={modalStyles.categoryText}>{item.service_category}</Text>
            </View>
            <View style={[
              modalStyles.typeBadge,
              item.post_type === 'offer' ? modalStyles.offerBadge : modalStyles.requestBadge
            ]}>
              <Text style={modalStyles.typeBadgeText}>
                {item.post_type?.toUpperCase() ?? 'OFFER'}
              </Text>
            </View>
          </View>

          {/* ── Rating ── */}
          <View style={modalStyles.ratingRow}>
            {[1,2,3,4,5].map(s => (
              <Ionicons
                key={s}
                name={(item.average_rating ?? 0) >= s ? 'star' : 'star-outline'}
                size={15}
                color="#FFA500"
              />
            ))}
            <Text style={modalStyles.ratingText}>
              {item.review_count ? `(${item.review_count} reviews)` : '(No reviews yet)'}
            </Text>
          </View>

          {/* ── Business name ── */}
          {(item.business_name || item.poster_name) && (
            <Text style={modalStyles.businessName}>
              by {item.business_name || item.poster_name}
            </Text>
          )}

          {/* ── Location ── */}
          {item.city && item.state && (
            <View style={modalStyles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={modalStyles.locationText}> {item.city}, {item.state}</Text>
            </View>
          )}

          {/* ── Price ── */}
          {item.price_range && (
            <View style={modalStyles.priceRow}>
              <Ionicons name="cash-outline" size={14} color="#2E7D32" />
              <Text style={modalStyles.priceText}> {item.price_range}</Text>
            </View>
          )}

          {/* ── PHOTOS — exact ServiceCard pattern ── */}
          {photos.length > 0 && (
            <View style={modalStyles.photosContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={modalStyles.photoScroll}
              >
                {photos.map((uri, index) => (
                  <TouchableOpacity
                    key={index}
                    style={modalStyles.photoWrapper}
                    onPress={() => openZoom(index)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri }}
                      style={modalStyles.photoImage}   // 120×120 fixed pixels — same as ServiceCard
                      resizeMode="cover"
                    />
                    <View style={modalStyles.zoomIndicator}>
                      <Ionicons name="expand" size={20} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={modalStyles.photoCount}>
                📸 {photos.length} photo{photos.length > 1 ? 's' : ''} · Tap to zoom
              </Text>
            </View>
          )}

          {/* ── Description ── */}
          {item.description ? (
            <View style={modalStyles.descriptionBox}>
              <Text style={modalStyles.descriptionLabel}>About this service</Text>
              <Text style={modalStyles.descriptionText}>
                {item.description.replace(/\s+/g, ' ').trim()}
              </Text>
            </View>
          ) : (
            <Text style={modalStyles.noDescriptionText}>No description provided.</Text>
          )}

          {/* ── Contact / Own post ── */}
          {isOwnPost ? (
            <View style={modalStyles.ownPostNote}>
              <Text style={modalStyles.ownPostNoteText}>This is your post. You cannot contact yourself.</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={modalStyles.contactButton}
              onPress={() => {
                onClose();
                setTimeout(() => onChatPress(item), 300);
              }}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
              <Text style={modalStyles.contactButtonText}> Contact Provider</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── Full-screen zoom modal — exact ServiceCard pattern ── */}
      <Modal
        visible={zoomVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomVisible(false)}
      >
        <View style={zoomStyles.container}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setZoomVisible(false)}
          >
            <View style={zoomStyles.content}>
              {/* Close */}
              <TouchableOpacity style={zoomStyles.closeBtn} onPress={() => setZoomVisible(false)}>
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>

              {/* Counter */}
              <View style={zoomStyles.counter}>
                <Text style={zoomStyles.counterText}>
                  {selectedPhotoIndex + 1} / {photos.length}
                </Text>
              </View>

              {/* Pinch-to-zoom image — SCREEN_WIDTH × SCREEN_HEIGHT*0.8, same as ServiceCard */}
              <ScrollView
                style={{ width: SCREEN_WIDTH }}
                contentContainerStyle={zoomStyles.scrollContent}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Image
                  source={{ uri: photos[selectedPhotoIndex] }}
                  style={zoomStyles.fullPhoto}   // SCREEN_WIDTH × SCREEN_HEIGHT*0.8
                  resizeMode="contain"
                />
              </ScrollView>

              {/* Prev / Next arrows */}
              {photos.length > 1 && selectedPhotoIndex > 0 && (
                <TouchableOpacity
                  style={[zoomStyles.navBtn, zoomStyles.prevBtn]}
                  onPress={goPrev}
                >
                  <Ionicons name="chevron-back" size={32} color="#fff" />
                </TouchableOpacity>
              )}
              {photos.length > 1 && selectedPhotoIndex < photos.length - 1 && (
                <TouchableOpacity
                  style={[zoomStyles.navBtn, zoomStyles.nextBtn]}
                  onPress={goNext}
                >
                  <Ionicons name="chevron-forward" size={32} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </Modal>
  );
};

// ============================================================================
// MINI CARD — single thumbnail (fixed 120×120) + title + stars + location
// ============================================================================

const MiniServiceCard: React.FC<{
  item: ServicePost;
  isOwnPost: boolean;
  onChatPress: (item: ServicePost) => void;
}> = ({ item, isOwnPost, onChatPress }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const firstPhoto = item.photos?.[0] ?? null;

  return (
    <>
      <TouchableOpacity
        style={miniStyles.card}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.80}
      >
        {/* Single photo thumbnail — fixed 120×120 pixels, same as ServiceCard */}
        {firstPhoto ? (
          <View style={miniStyles.photoWrapper}>
            <Image
              source={{ uri: firstPhoto }}
              style={miniStyles.photoImage}   // CARD_WIDTH × 120 fixed pixels
              resizeMode="cover"
            />
            <View style={miniStyles.expandHint}>
              <Ionicons name="expand" size={14} color="#fff" />
            </View>
          </View>
        ) : (
          <View style={miniStyles.noPhotoBox}>
            <Ionicons name="image-outline" size={28} color="#ccc" />
          </View>
        )}

        {/* Text */}
        <View style={miniStyles.content}>
          <Text style={miniStyles.title} numberOfLines={2}>{item.title}</Text>
          <MiniStars rating={item.average_rating ?? 0} count={item.review_count} />
          {item.city && item.state && (
            <View style={miniStyles.locationRow}>
              <Ionicons name="location-outline" size={10} color="#4A90E2" />
              <Text style={miniStyles.locationText} numberOfLines={1}>
                {' '}{item.city}, {item.state}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <DetailModal
        item={item}
        visible={modalVisible}
        isOwnPost={isOwnPost}
        onClose={() => setModalVisible(false)}
        onChatPress={onChatPress}
      />
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const RecentPostsSection: React.FC<RecentPostsSectionProps> = ({
  recentPosts,
  isOwnPost,
  onChatPress,
  loading,
}) => {
  if (loading) {
    return (
      <View style={sectionStyles.loadingContainer}>
        <ActivityIndicator size="small" color="#4A90E2" />
        <Text style={sectionStyles.loadingText}>Loading recent listings…</Text>
      </View>
    );
  }

  if (recentPosts.length === 0) {
    return (
      <View style={sectionStyles.emptyContainer}>
        <Ionicons name="storefront-outline" size={42} color="#ccc" />
        <Text style={sectionStyles.emptyTitle}>No listings yet</Text>
        <Text style={sectionStyles.emptySubtitle}>
          Be the first to post a service on Gozipmarket!
        </Text>
      </View>
    );
  }

  // Group into rows of 2 for the grid
  const rows: ServicePost[][] = [];
  for (let i = 0; i < recentPosts.length; i += 2) {
    rows.push(recentPosts.slice(i, i + 2));
  }

  return (
    <View style={sectionStyles.outerContainer}>

      {/* Now Available */}
      <View style={sectionStyles.nowAvailableRow}>
        <View style={sectionStyles.nowAvailableDot} />
        <Text style={sectionStyles.nowAvailableText}>NOW AVAILABLE</Text>
        <View style={sectionStyles.nowAvailableDot} />
      </View>

      {/* Section header */}
      <View style={sectionStyles.sectionHeaderRow}>
        <Text style={sectionStyles.sectionTitle}>Recently Posted Services</Text>
        <View style={sectionStyles.newBadge}>
          <Text style={sectionStyles.newBadgeText}>NEW</Text>
        </View>
      </View>
      <Text style={sectionStyles.sectionSubtitle}>
        Tap a card to view details &amp; contact provider
      </Text>

      {/* 2-column grid */}
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={sectionStyles.row}>
          {row.map((post, i) => (
            <MiniServiceCard
              key={post.post_id ?? rowIndex * 2 + i}
              item={post}
              isOwnPost={isOwnPost(post.user_id)}
              onChatPress={onChatPress}
            />
          ))}
          {/* Spacer if odd number of posts */}
          {row.length === 1 && <View style={{ flex: 1, margin: 5 }} />}
        </View>
      ))}

      {/* Bottom nudge */}
      <View style={sectionStyles.nudgeContainer}>
        <Ionicons name="search" size={15} color="#4A90E2" />
        <Text style={sectionStyles.nudgeText}>
          Can't find what you need?{' '}
          <Text style={sectionStyles.nudgeBold}>Search from 100+ categories</Text>
          {' '}using the form above ↑
        </Text>
      </View>

    </View>
  );
};

// ============================================================================
// STYLES — MINI CARD
// ============================================================================

const miniStyles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 5,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoImage: {
    width: CARD_WIDTH,      // explicit pixel width — same pattern as ServiceCard's 120px
    height: 120,             // fixed height — same as ServiceCard
  },
  expandHint: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    padding: 3,
  },
  noPhotoBox: {
    width: CARD_WIDTH,
    height: 120,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 16,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  ratingCount: {
    fontSize: 9,
    color: '#aaa',
    marginLeft: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 10,
    color: '#4A90E2',
    fontWeight: '700',
  },
});

// ============================================================================
// STYLES — DETAIL MODAL
// ============================================================================

const modalStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  closeBtn: { padding: 4 },
  body: { paddingBottom: 20 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: { fontSize: 12, color: '#4A90E2', fontWeight: '700' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  offerBadge: { backgroundColor: '#E8F5E9' },
  requestBadge: { backgroundColor: '#E3F2FD' },
  typeBadgeText: { fontSize: 11, fontWeight: '800', color: '#555' },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  ratingText: { fontSize: 13, color: '#888', marginLeft: 4 },
  businessName: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  locationText: { fontSize: 13, color: '#888' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  priceText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },

  // Photos — identical to ServiceCard
  photosContainer: { paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  photoScroll: { marginBottom: 4 },
  photoWrapper: {
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: 120,    // exact same as ServiceCard
    height: 120,   // exact same as ServiceCard
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

  descriptionBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: { fontSize: 14, color: '#444', lineHeight: 21 },
  noDescriptionText: {
    fontSize: 13,
    color: '#bbb',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    marginTop: 8,
  },

  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  contactButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  ownPostNote: {
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  ownPostNoteText: { color: '#999', fontSize: 13, fontStyle: 'italic' },
});

// ============================================================================
// STYLES — FULLSCREEN ZOOM (identical to ServiceCard)
// ============================================================================

const zoomStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  counter: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  counterText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,   // exact same as ServiceCard
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 24,
    zIndex: 10,
  },
  prevBtn: { left: 20 },
  nextBtn: { right: 20 },
});

// ============================================================================
// STYLES — SECTION
// ============================================================================

const sectionStyles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    backgroundColor: '#fff',
  },
  loadingText: { fontSize: 14, color: '#888', marginLeft: 10 },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    backgroundColor: '#fff',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#999', marginTop: 14 },
  emptySubtitle: {
    fontSize: 13,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  outerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingTop: 22,
    paddingBottom: 30,
  },
  nowAvailableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  nowAvailableDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  nowAvailableText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4CAF50',
    letterSpacing: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  newBadge: {
    backgroundColor: '#E53935',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  sectionSubtitle: { fontSize: 12, color: '#888', marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 4 },
  nudgeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  nudgeText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 18, marginLeft: 6 },
  nudgeBold: { fontWeight: '700', color: '#4A90E2' },
});

export default RecentPostsSection;