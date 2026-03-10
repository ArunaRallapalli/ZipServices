/**
 * RecentPostsSection.tsx
 *
 * UPDATED March 2026 v3.1:
 * Mini card shows: photo (or icon placeholder), title, star rating, location
 * Card has visible border for better UI separation
 * Tap → detail modal shows: all photos, description (normalized), Contact Provider button
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// HELPERS — category icon + color for placeholder
// ============================================================================

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_META: Record<string, { icon: IoniconsName; color: string }> = {
  'Cleaning':        { icon: 'sparkles',       color: '#4A90E2' },
  'Catering':        { icon: 'restaurant',      color: '#E67E22' },
  'Landscaping':     { icon: 'leaf',            color: '#27AE60' },
  'Dance Lessons':   { icon: 'musical-notes',   color: '#9B59B6' },
  'Entertainment':   { icon: 'mic',             color: '#E91E63' },
  'Event Planning':  { icon: 'calendar',        color: '#F39C12' },
  'Beauty Services': { icon: 'cut',             color: '#D81B60' },
  'Shoe Repair':     { icon: 'construct',       color: '#795548' },
  'Plumbing':        { icon: 'water',           color: '#1565C0' },
  'Electrical':      { icon: 'flash',           color: '#F9A825' },
  'Home Repair':     { icon: 'hammer',          color: '#6D4C41' },
  'Pet Care':        { icon: 'paw',             color: '#43A047' },
  'Moving':          { icon: 'cube',            color: '#546E7A' },
  'Tutoring':        { icon: 'school',          color: '#1E88E5' },
  'Photography':     { icon: 'camera',          color: '#8E24AA' },
  'Tailoring':       { icon: 'color-palette',   color: '#00897B' },
};
const DEFAULT_META = { icon: 'briefcase' as IoniconsName, color: '#607D8B' };
const getCategoryMeta = (cat: string) => CATEGORY_META[cat] ?? DEFAULT_META;

// Normalize description: collapse multiple spaces/newlines into single space, trim
const normalizeText = (text?: string): string =>
  (text ?? '').replace(/\s+/g, ' ').trim();

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
    {count !== undefined && count > 0 && (
      <Text style={miniStyles.ratingCount}> ({count})</Text>
    )}
  </View>
);

// ============================================================================
// DETAIL MODAL — photos + description + contact button
// ============================================================================

const DetailModal: React.FC<{
  item: ServicePost;
  visible: boolean;
  isOwnPost: boolean;
  onClose: () => void;
  onChatPress: (item: ServicePost) => void;
}> = ({ item, visible, isOwnPost, onClose, onChatPress }) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const photos = item.photos ?? [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={modalStyles.safeArea}>
        {/* Header */}
        <View style={modalStyles.header}>
          <Text style={modalStyles.headerTitle} numberOfLines={1}>{item.title}</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={26} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modalStyles.body} showsVerticalScrollIndicator={false}>

          {/* ── Photos ── */}
          {photos.length > 0 && (
            <View style={modalStyles.photosSection}>

              {/* Compact fixed-height photo */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setZoomVisible(true)}
                style={modalStyles.compactPhotoWrapper}
              >
                <Image
                  source={{ uri: photos[photoIndex] }}
                  style={modalStyles.compactPhoto}
                  resizeMode="cover"
                />
                {/* Zoom hint overlay */}
                <View style={modalStyles.zoomHint}>
                  <Ionicons name="expand-outline" size={16} color="#fff" />
                  <Text style={modalStyles.zoomHintText}>Tap to zoom</Text>
                </View>
                {/* Counter */}
                {photos.length > 1 && (
                  <View style={modalStyles.photoCounter}>
                    <Text style={modalStyles.photoCounterText}>
                      {photoIndex + 1} / {photos.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Thumbnail strip */}
              {photos.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={modalStyles.thumbStrip}
                  contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 6 }}
                >
                  {photos.map((uri, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setPhotoIndex(i)}
                      style={[modalStyles.thumb, i === photoIndex && modalStyles.thumbActive]}
                    >
                      <Image source={{ uri }} style={modalStyles.thumbImage} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* ── Full-screen zoom modal ── */}
          <Modal
            visible={zoomVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setZoomVisible(false)}
          >
            <View style={modalStyles.zoomOverlay}>
              <TouchableOpacity
                style={modalStyles.zoomClose}
                onPress={() => setZoomVisible(false)}
              >
                <Ionicons name="close-circle" size={36} color="#fff" />
              </TouchableOpacity>
              <ScrollView
                style={{ width: SCREEN_WIDTH }}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                maximumZoomScale={4}
                minimumZoomScale={1}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                bouncesZoom
              >
                <Image
                  source={{ uri: photos[photoIndex] }}
                  style={{ width: SCREEN_WIDTH, aspectRatio: 4 / 3 }}
                  resizeMode="contain"
                />
              </ScrollView>
              {photos.length > 1 && (
                <View style={modalStyles.zoomCounter}>
                  <Text style={modalStyles.zoomCounterText}>
                    {photoIndex + 1} / {photos.length}
                  </Text>
                </View>
              )}
            </View>
          </Modal>

          {/* ── Service info ── */}
          <View style={modalStyles.infoSection}>

            {/* Category + post type */}
            <View style={modalStyles.metaRow}>
              <View style={modalStyles.categoryBadge}>
                <Text style={modalStyles.categoryText}>{item.service_category}</Text>
              </View>
              <View style={[
                modalStyles.typeBadge,
                item.post_type === 'offer' ? modalStyles.offerBadge : modalStyles.requestBadge,
              ]}>
                <Text style={modalStyles.typeBadgeText}>
                  {item.post_type === 'offer' ? 'OFFER' : 'REQUEST'}
                </Text>
              </View>
            </View>

            {/* Rating */}
            {item.review_count !== undefined && (
              <View style={modalStyles.ratingRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Ionicons
                    key={s}
                    name={(item.average_rating ?? 0) >= s ? 'star' : 'star-outline'}
                    size={16}
                    color="#FFA500"
                  />
                ))}
                <Text style={modalStyles.ratingText}>
                  {item.review_count > 0 ? ` (${item.review_count} review${item.review_count !== 1 ? 's' : ''})` : ' (No reviews yet)'}
                </Text>
              </View>
            )}

            {/* Business name */}
            {item.business_name && (
              <Text style={modalStyles.businessName}>by {item.business_name}</Text>
            )}

            {/* Location */}
            {item.city && item.state && (
              <View style={modalStyles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#888" />
                <Text style={modalStyles.locationText}> {item.city}, {item.state}</Text>
              </View>
            )}

            {/* Price */}
            {item.price_range && (
              <View style={modalStyles.priceRow}>
                <Ionicons name="cash-outline" size={14} color="#2E7D32" />
                <Text style={modalStyles.priceText}> {item.price_range}</Text>
              </View>
            )}

            {/* Description */}
            {item.description ? (
              <View style={modalStyles.descriptionBox}>
                <Text style={modalStyles.descriptionLabel}>About this service</Text>
                <Text style={modalStyles.descriptionText}>{normalizeText(item.description)}</Text>
              </View>
            ) : (
              <View style={modalStyles.descriptionBox}>
                <Text style={modalStyles.noDescriptionText}>No description provided.</Text>
              </View>
            )}

          </View>

          {/* ── Contact button ── */}
          {isOwnPost ? (
            <View style={modalStyles.ownPostNote}>
              <Text style={modalStyles.ownPostNoteText}>This is your post.</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={modalStyles.contactButton}
              onPress={() => {
                onClose();
                setTimeout(() => onChatPress(item), 300);
              }}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
              <Text style={modalStyles.contactButtonText}>Contact Provider</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ============================================================================
// MINI CARD — photo (if available) + title + rating
// ============================================================================

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
        {/* Photo — real photo OR icon placeholder */}
        {firstPhoto ? (
          <Image
            source={{ uri: firstPhoto }}
            style={miniStyles.thumbnail}
            resizeMode="contain"
          />
        ) : (
          <View style={miniStyles.placeholder}>
            <View style={[miniStyles.iconCircle, { backgroundColor: color }]}>
              <Ionicons name={icon} size={22} color="#fff" />
            </View>
          </View>
        )}

        {/* Text content */}
        <View style={miniStyles.content}>
          <Text style={miniStyles.title} numberOfLines={2}>{item.title}</Text>
          <MiniStars rating={item.average_rating ?? 0} count={item.review_count} />
          {/* Location */}
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

const miniStyles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1.5,              // ← visible border
    borderColor: '#e0e8f4',        // ← soft blue-grey border
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 4 / 3,          // full image, no cropping
    backgroundColor: '#f0f4fa',
  },
  placeholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4fa',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    color: '#4A90E2',            // ← blue
    fontWeight: '700',           // ← bold
  },
});

// ============================================================================
// MODAL STYLES
// ============================================================================

const modalStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    marginRight: 8,
  },
  closeBtn: { padding: 4 },
  body: { paddingBottom: 40 },

  // Photos
  photosSection: { backgroundColor: '#f0f0f0' },

  // Compact photo (fixed height so description is always visible)
  compactPhotoWrapper: {
    width: '100%',
    height: 180,                   // ← fixed compact height
    position: 'relative',
    backgroundColor: '#000',
  },
  compactPhoto: {
    width: '100%',
    height: 180,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  zoomHintText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Full-screen zoom overlay
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomClose: {
    position: 'absolute',
    top: 44,
    right: 16,
    zIndex: 10,
  },
  zoomCounter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  zoomCounterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  photoCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCounterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  thumbStrip: {
    backgroundColor: '#111',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  thumb: {
    marginRight: 6,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: { borderColor: '#4A90E2' },
  thumbImage: { width: 52, height: 52 },

  // Info
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    marginHorizontal: 0,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
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

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ratingText: { fontSize: 13, color: '#888', marginLeft: 4 },

  businessName: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 6 },

  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  locationText: { fontSize: 13, color: '#888' },

  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  priceText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },

  descriptionBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
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
  noDescriptionText: { fontSize: 13, color: '#bbb', fontStyle: 'italic' },

  // Contact button
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading recent listings…</Text>
      </View>
    );
  }

  if (recentPosts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="storefront-outline" size={42} color="#ccc" />
        <Text style={styles.emptyTitle}>No listings yet</Text>
        <Text style={styles.emptySubtitle}>
          Be the first to post a service on Gozipmarket!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>

      <View style={styles.nowAvailableRow}>
        <View style={styles.nowAvailableDot} />
        <Text style={styles.nowAvailableText}>NOW AVAILABLE</Text>
        <View style={styles.nowAvailableDot} />
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recently Posted Services</Text>
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      </View>
      <Text style={styles.sectionSubtitle}>
        Tap a card to view details &amp; contact provider
      </Text>

      {/* 2-column grid */}
      <View style={styles.gridContainer}>
        {recentPosts.map((post, i) => (
          <View key={post.post_id ?? i} style={styles.gridItem}>
            <MiniServiceCard
              item={post}
              isOwnPost={isOwnPost(post.user_id)}
              onChatPress={onChatPress}
            />
          </View>
        ))}
      </View>

      <View style={styles.nudgeContainer}>
        <Ionicons name="search" size={15} color="#4A90E2" />
        <Text style={styles.nudgeText}>
          Can't find what you need?{' '}
          <Text style={styles.nudgeBold}>Search from 100+ categories</Text>
          {' '}using the form above ↑
        </Text>
      </View>

    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    backgroundColor: '#ffffff',
  },
  loadingText: { fontSize: 14, color: '#888', marginLeft: 10 },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 9,
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
  sectionSubtitle: { fontSize: 12, color: '#888', marginBottom: 12 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  gridItem: { width: '50%' },
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