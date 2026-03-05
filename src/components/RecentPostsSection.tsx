/**
 * RecentPostsSection.tsx
 *
 * OVERVIEW:
 * Displays the most recently posted active service listings in place of
 * the old "Popular Service Categories" tiles.
 *
 * Renders full ServiceCard components so the UX is identical to search results:
 *  - Photo gallery with zoom
 *  - Star ratings
 *  - "Contact Provider" button
 *  - "Your Post" banner for own posts
 *
 * Posts are returned newest-first from the API (created_at DESC).
 * Every time a new post is added it will appear at the top on next load/refresh.
 *
 * PROPS:
 *  - recentPosts    : ServicePost[] from fetchRecentPosts() — newest first
 *  - isOwnPost      : same helper from SearchResultsScreen
 *  - onChatPress    : same chat handler from SearchResultsScreen
 *  - loading        : shows spinner while data loads
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServicePost } from '../Utils/searchUtils';
import ServiceCard from './ServiceCard';

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
// MAIN COMPONENT
// ============================================================================

const RecentPostsSection: React.FC<RecentPostsSectionProps> = ({
  recentPosts,
  isOwnPost,
  onChatPress,
  loading,
}) => {

  // --------------------------------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading recent listings…</Text>
      </View>
    );
  }

  // --------------------------------------------------------------------------
  // EMPTY STATE
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // RENDER — full ServiceCard list, newest first
  // --------------------------------------------------------------------------
  return (
    <View style={styles.outerContainer}>

      {/* Now Available label */}
      <View style={styles.nowAvailableRow}>
        <View style={styles.nowAvailableDot} />
        <Text style={styles.nowAvailableText}>NOW AVAILABLE</Text>
        <View style={styles.nowAvailableDot} />
      </View>

      {/* Section header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recently Posted Services</Text>
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      </View>
      <Text style={styles.sectionSubtitle}>
        Newest listings first · Contact a provider directly below
      </Text>

      {/* Full ServiceCards — identical to search results */}
      {recentPosts.map((post, i) => (
        <ServiceCard
          key={post.post_id ?? i}
          item={post}
          isOwnPost={isOwnPost(post.user_id)}
          onChatPress={onChatPress}
        />
      ))}

      {/* Bottom nudge pointing to full search */}
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

  // ---------- Loading ----------
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 10,
  },

  // ---------- Empty ----------
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    backgroundColor: '#ffffff',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },

  // ---------- Outer wrapper ----------
  outerContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingTop: 22,
    paddingBottom: 30,
  },

  // ---------- Now Available ----------
  nowAvailableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  nowAvailableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  nowAvailableText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4CAF50',
    letterSpacing: 2,
  },

  // ---------- Section header ----------
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  newBadge: {
    backgroundColor: '#E53935',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 16,
  },

  // ---------- Bottom nudge ----------
  nudgeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  nudgeText: {
    flex: 1,
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
    marginLeft: 6,
  },
  nudgeBold: {
    fontWeight: '700',
    color: '#4A90E2',
  },
});

export default RecentPostsSection;