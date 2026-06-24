/**
 * RecentPostsSection.tsx
 *
 * UPDATED March 2026 v5.0:
 * - Cart button added below text content (right side of mini card)
 * - Auth guard: guests redirected to BusinessOwnerHomeScreen on cart tap
 * - DetailModal: Add to Cart + Contact Provider side by side
 * - isAuthenticated prop added throughout
 * - 2-column mini card grid (home page): 1 photo thumbnail, title, stars, location
 * - Tap → DetailModal: full ServiceCard-style photo gallery + zoom + description + Contact Provider
 * - Photo rendering copied exactly from production ServiceCard (fixed pixel dims, no width:'100%')
 *
 * UPDATED March 2026 v5.1:
 * - DetailModal: removed category/type badges (Boutique, OFFER)
 * - DetailModal: removed "About this service" section label
 * - DetailModal: new display order — photo → title → description → reviews → price → delivery → buttons
 * - DetailModal: Add to Cart + Contact Provider now stacked vertically (full width each)
 * - DetailModal: single Add to Cart per listing (removed per-photo buttons)
 * - delivery_timeline field displayed after price
 * - Header now shows close button only (title moved into body below photos)
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
import { Alert } from '../Utils/Alert';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ServicePost } from '../Utils/searchUtils';
import ReviewsModal from './Reviewsmodal';
import api from '../api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 40) / 2;

// ============================================================================
// TYPES
// ============================================================================

type AddToCartFn = (
  item: ServicePost,
  photoIndex: number,
  photoUrl: string,
  photoPrice?: number,
  selectedPayMethod?: string,
) => boolean | void;

const PAYMENT_LABELS: Record<string, string> = {
  zelle: 'Zelle', venmo: 'Venmo', paypal: 'PayPal', cashapp: 'Cash App', cash: 'Cash', check: 'Check',
};

interface RecentPostsSectionProps {
  recentPosts: ServicePost[];
  isOwnPost: (postUserId: number) => boolean;
  onChatPress: (item: ServicePost) => void;
  loading: boolean;
  onReviewSubmitted?: () => void;
  onAddToCart?: AddToCartFn;
  isAuthenticated?: boolean;
  paymentCategories?: Set<string>;
}

// ✅ category icon/color map for placeholder
const CATEGORY_META: Record<string, { icon: any; color: string }> = {
  "Bakery":                  { icon: "cafe",           color: "#795548" },
  "Beauty Services":         { icon: "eye-outline",    color: "#D81B60" },
  "Catering":                { icon: "restaurant",     color: "#E67E22" },
  "Cleaning":                { icon: "sparkles",       color: "#4A90E2" },
  "Construction/Renovation": { icon: "build",          color: "#FF6F00" },
  "Dance Lessons":           { icon: "musical-notes",  color: "#9B59B6" },
  "DJ":                      { icon: "headset",        color: "#6C3483" },
  "Electrical":              { icon: "flash",          color: "#F9A825" },
  "Entertainment":           { icon: "mic",            color: "#E91E63" },
  "Event Planning":          { icon: "calendar",       color: "#F39C12" },
  "Home Repair":             { icon: "hammer",         color: "#6D4C41" },
  "Landscaping":             { icon: "leaf",           color: "#27AE60" },
  "Moving":                  { icon: "cube",           color: "#546E7A" },
  "Other":                   { icon: "apps",           color: "#607D8B" },
  "Painting":                { icon: "brush",          color: "#FF7043" },
  "Pet Care":                { icon: "paw",            color: "#43A047" },
  "Photography":             { icon: "camera",         color: "#8E24AA" },
  "Plumbing":                { icon: "water",          color: "#1565C0" },
  "Preloved & Thrifting":    { icon: "shirt",          color: "#8D6E63" },
  "Rentals":                 { icon: "key-outline",    color: "#0288D1" },
  "Shoe Repair":             { icon: "construct",      color: "#795548" },
  "Tailoring":               { icon: "color-palette",  color: "#00897B" },
  "Tutoring":                { icon: "school",         color: "#1E88E5" },
};
const DEFAULT_META = { icon: "briefcase", color: "#607D8B" };

// ============================================================================
// MINI STARS
// ============================================================================

const MiniStars: React.FC<{ rating: number; count?: number }> = ({ rating, count }) => (
  <>
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
  </>
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
  onReviewSubmitted?: () => void;
  onAddToCart?: AddToCartFn;
  isAuthenticated?: boolean;
  paymentCategories?: Set<string>;
}> = ({ item, visible, isOwnPost, onClose, onChatPress, onReviewSubmitted, onAddToCart, isAuthenticated, paymentCategories }) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'requested' | 'completed' | 'unavailable'>(
    item.service_category?.toLowerCase().trim() === 'preloved & thrifting' && item.in_stock != null && item.in_stock <= 0 ? 'unavailable' : 'idle'
  );
  const [liveInStock, setLiveInStock] = useState<number | null | undefined>(item.in_stock);
  const [soldPhotoIndexes, setSoldPhotoIndexes] = useState<number[]>([]);
  const [thriftPendingIndexes, setThriftPendingIndexes] = useState<number[]>([]);
  const [requestedPhotoIndexes, setRequestedPhotoIndexes] = useState<Set<number>>(new Set());
  const [stockChecking, setStockChecking] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const photos = item.photos ?? [];

  const availablePayMethods = React.useMemo(() => {
    if (!item.post_payment_method) return [];
    try {
      const parsed = JSON.parse(item.post_payment_method);
      return Array.isArray(parsed) ? parsed : [item.post_payment_method];
    } catch { return [item.post_payment_method]; }
  }, [item.post_payment_method]);

  const isThriftingFree =
    item.service_category?.toLowerCase().trim() === 'preloved & thrifting';

  // Fetch live in_stock + sold_photo_indexes when modal opens
  React.useEffect(() => {
    if (visible && item.post_id) {
      setStockChecking(true);
      api.get(`/api/service-posts/${item.post_id}`)
        .then((res: any) => {
          const post = res.post ?? res;
          if (post?.in_stock != null) setLiveInStock(post.in_stock);
          if (Array.isArray(post?.sold_photo_indexes)) setSoldPhotoIndexes(post.sold_photo_indexes);
          if (Array.isArray(post?.thrift_pending_indexes)) setThriftPendingIndexes(post.thrift_pending_indexes);
          if (isThriftingFree) {
            if (post?.in_stock != null && post.in_stock <= 0) setRequestStatus('unavailable');
            else setRequestStatus(prev => prev === 'unavailable' ? 'idle' : prev);
          }
        })
        .catch(() => {})
        .finally(() => setStockChecking(false));
    }
    // Reset selection and request state each time modal opens so stale state from
    // a previous user session (logout/login) doesn't disable the button.
    if (visible) {
      setSelectedPhotoIndex(0);
      setSelectedPayMethod(availablePayMethods.length === 1 ? availablePayMethods[0] : null);
      if (isThriftingFree && photos.length > 0) {
        setRequestStatus('idle');
      }
    }
  }, [visible]);

  // After soldPhotoIndexes loads, if the current selection is sold, auto-advance
  // to the first available photo so the modal never opens on a "Sorry, not available" state
  React.useEffect(() => {
    if (soldPhotoIndexes.length === 0) return;
    if (soldPhotoIndexes.includes(selectedPhotoIndex)) {
      const firstAvailable = photos.findIndex((_: any, idx: number) => !soldPhotoIndexes.includes(idx));
      if (firstAvailable !== -1) setSelectedPhotoIndex(firstAvailable);
    }
  }, [soldPhotoIndexes]);

  // When the user taps a different photo thumbnail, reset item-level state so each
  // photo is evaluated independently.
  React.useEffect(() => {
    if (!isThriftingFree || !photos.length) return;
    if (!soldPhotoIndexes.includes(selectedPhotoIndex)) {
      setRequestStatus(prev => prev === 'unavailable' ? 'idle' : prev);
    }
  }, [selectedPhotoIndex]);

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

  const handleRequestItem = async () => {
    if (!isAuthenticated) {
      onClose();
      setTimeout(() => navigation.navigate('BusinessOwnerHomeScreen'), 300);
      return;
    }
    setRequestStatus('loading');
    try {
      const hasPhotos = photos.length > 0;
      await api.post('/api/thrift-requests', {
        post_id:          item.post_id,
        provider_user_id: item.user_id,
        post_title:       item.title,
        post_photo_url:   photos[selectedPhotoIndex] ?? photos[0] ?? null,
        buyer_timezone:   Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(hasPhotos ? { photo_index: selectedPhotoIndex } : {}),
      });
      setRequestedPhotoIndexes(prev => new Set([...prev, selectedPhotoIndex]));
      setRequestStatus('idle');
      // Refresh pending indexes so badge switches to "Active Requests" immediately
      api.get(`/api/service-posts/${item.post_id}`)
        .then((res: any) => {
          const post = res.post ?? res;
          if (Array.isArray(post?.thrift_pending_indexes)) setThriftPendingIndexes(post.thrift_pending_indexes);
          if (Array.isArray(post?.sold_photo_indexes)) setSoldPhotoIndexes(post.sold_photo_indexes);
        })
        .catch(() => {});
      Alert.alert(
        'Request Sent!',
        `Your request for "${item.title}" has been sent to the seller. Select another photo to request more, or tap Done when finished.`,
        [{ text: 'OK' }],
      );
    } catch (e: any) {
      const httpStatus = e?.status;
      if (httpStatus === 409) {
        const serverStatus = e?.response?.status || 'requested';
        if (serverStatus === 'unavailable') {
          setRequestStatus('unavailable');
          Alert.alert('Not Available', e?.message || 'No more units available for this item.');
        } else {
          setRequestedPhotoIndexes(prev => new Set([...prev, selectedPhotoIndex]));
          setRequestStatus('idle');
          Alert.alert('Already Requested', e?.message || 'You already have an active request for this item.');
        }
      } else {
        setRequestStatus('idle');
        Alert.alert('Request Failed', e?.message || 'Something went wrong. Please try again.');
      }
    }
  };

  const handleAddListingToCart = async () => {
    if (!isAuthenticated) {
      onClose();
      setTimeout(() => navigation.navigate('BusinessOwnerHomeScreen'), 300);
      return;
    }
    // Live stock guard — re-check DB right before adding to prevent race conditions
    if (item.post_id) {
      try {
        const res: any = await api.get(`/api/service-posts/${item.post_id}`);
        const post = res.post ?? res;
        if (post?.in_stock != null) setLiveInStock(post.in_stock);
        if (Array.isArray(post?.sold_photo_indexes)) {
          setSoldPhotoIndexes(post.sold_photo_indexes);
          if (post.sold_photo_indexes.includes(selectedPhotoIndex)) return;
        }
        // Only block on in_stock for single-photo posts; multi-photo posts use sold_photo_indexes
        const isMultiPhoto = photos.length > 1;
        if (!isMultiPhoto && post?.in_stock != null && post.in_stock <= 0) return;
      } catch { /* proceed if check fails */ }
    }
    if (availablePayMethods.length > 0 && !selectedPayMethod) {
      Alert.alert('Select Payment Method', 'Please choose how you would like to pay before adding to cart.');
      return;
    }
    const firstPhotoUrl = photos[selectedPhotoIndex] ?? photos[0] ?? '';
    const added = onAddToCart?.(item, selectedPhotoIndex, firstPhotoUrl, item.photo_prices?.[selectedPhotoIndex] || undefined, selectedPayMethod ?? undefined);
    if (added === false) return;
    setAddedToCart(true);
    Alert.alert(
      'Added to Cart',
      `"${item.title}" has been added to your cart.`,
      [
        { text: 'Keep Browsing', style: 'cancel', onPress: onClose },
        {
          text: 'View Cart',
          onPress: () => {
            onClose();
            setTimeout(() => navigation.navigate('CartScreen'), 300);
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Header — close button only (title moved into body) */}
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={26} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modalStyles.body} showsVerticalScrollIndicator={false}>

          {/* 1. Photos — thumbnail selector with product ID and sold overlay */}
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.thumbScroll}>
              {photos.map((uri, index) => {
                const isSold    = soldPhotoIndexes.includes(index);
                const isPending = !isSold && isThriftingFree && thriftPendingIndexes.includes(index);
                const badgeLabel = isSold ? (isThriftingFree ? 'Unavailable' : 'Sold') : isPending ? 'Active Requests' : 'Available';
                const badgeColor = isSold ? (isThriftingFree ? '#9E9E9E' : '#E53935') : isPending ? '#F59E0B' : '#2E7D32';
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => { openZoom(index); setAddedToCart(false); }}
                    style={[modalStyles.thumbCard, index === selectedPhotoIndex && modalStyles.thumbSelected]}
                    activeOpacity={0.8}
                  >
                    <View style={modalStyles.thumbImgWrapper}>
                      <Image source={{ uri }} style={modalStyles.thumbImg} resizeMode="cover" />
                    </View>
                    <Text style={modalStyles.thumbLabel}>#{item.post_id}-{index + 1}</Text>
                    {(isThriftingFree || isSold) && (
                      <View style={[modalStyles.photoBadge, { backgroundColor: badgeColor }]}>
                        <Text style={modalStyles.photoBadgeText}>{badgeLabel}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* 2. Title */}
          <Text style={modalStyles.postTitle}>{item.title}</Text>

          {/* 3. Description */}
          {item.description ? (
            <Text style={modalStyles.descriptionText}>
              {item.description.replace(/\s+/g, ' ').trim()}
            </Text>
          ) : (
            <Text style={modalStyles.noDescriptionText}>No description provided.</Text>
          )}

          {/* 4. Reviews — tap to open */}
          <TouchableOpacity style={modalStyles.ratingRow} onPress={() => setShowReviewsModal(true)} activeOpacity={0.7}>
            {[1,2,3,4,5].map(s => (
              <Ionicons key={s} name={(item.average_rating ?? 0) >= s ? 'star' : 'star-outline'} size={15} color="#FFA500" />
            ))}
            <Text style={modalStyles.ratingText}>
              {item.review_count ? `(${item.review_count} reviews)` : '(No reviews yet)'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#999" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {/* Business name + Location */}
          {(item.business_name || item.poster_name) && (
            <Text style={modalStyles.businessName}>by {item.business_name || item.poster_name}</Text>
          )}
          {item.city && item.state && (
            <View style={modalStyles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={modalStyles.locationText}> {item.city}, {item.state}</Text>
            </View>
          )}

          {/* 5. Price */}
          {(item.price || item.service_category?.toLowerCase().trim() === 'preloved & thrifting') && (
            <View style={modalStyles.priceRow}>
              <Ionicons name="cash-outline" size={14} color="#2E7D32" />
              <Text style={modalStyles.priceText}>
                {item.service_category?.toLowerCase().trim() === 'preloved & thrifting' && (!item.price || parseFloat(item.price) === 0)
                  ? ' Free'
                  : ` $${item.price}`}
              </Text>
            </View>
          )}

          {/* In stock qty — shown right after Free for thrifting */}
          {isThriftingFree && (liveInStock ?? item.in_stock) != null && (liveInStock ?? item.in_stock)! > 0 && (
            <View style={modalStyles.deliveryRow}>
              <Ionicons name="cube-outline" size={14} color="#555" />
              <Text style={modalStyles.deliveryText}> In stock qty: {liveInStock ?? item.in_stock}</Text>
            </View>
          )}

          {/* 6. In Stock — only for payment-enabled non-thrifting categories */}
          {paymentCategories?.has(item.service_category) && !isThriftingFree && photos.length > 0 && (
            (() => {
              const available = photos.length - soldPhotoIndexes.length;
              return available > 0 ? (
                <View style={modalStyles.deliveryRow}>
                  <Ionicons name="cube-outline" size={14} color="#555" />
                  <Text style={modalStyles.deliveryText}> Available: {available} of {photos.length}</Text>
                </View>
              ) : null;
            })()
          )}

          {/* 7. Delivery Timeline — only for payment-enabled non-thrifting categories */}
          {paymentCategories?.has(item.service_category) && !isThriftingFree && item.delivery_timeline && (
            <View style={modalStyles.deliveryRow}>
              <Ionicons name="time-outline" size={14} color="#555" />
              <Text style={modalStyles.deliveryText}> Delivery: {item.delivery_timeline}</Text>
            </View>
          )}

          {/* Action buttons + Contact Provider — stacked full width */}
          {isOwnPost ? (
            <View style={modalStyles.ownPostNote}>
              <Text style={modalStyles.ownPostNoteText}>This is your post. You cannot contact yourself.</Text>
            </View>
          ) : (
            <View style={modalStyles.actionCol}>
              {isThriftingFree ? (
                /* ── FREE Thrifting: Pickup/Delivery info + Request Item ── */
                <>
                  <View style={modalStyles.pickupInfoBox}>
                    <View style={modalStyles.pickupInfoHeader}>
                      <Ionicons name="information-circle-outline" size={15} color="#4A90E2" />
                      <Text style={modalStyles.pickupInfoTitle}> Pickup / Delivery</Text>
                    </View>
                    <Text style={modalStyles.pickupInfoText}>
                      Please coordinate pickup and delivery using the seller chat below.
                    </Text>
                  </View>
                  <View style={modalStyles.expiryNoteBox}>
                    <Text style={modalStyles.expiryNoteLine}><Text style={{ fontWeight: '700' }}>Requesters:</Text> Please message the seller to arrange pickup or delivery.</Text>
                    <Text style={[modalStyles.expiryNoteLine, { marginTop: 6 }]}><Text style={{ fontWeight: '700' }}>Seller:</Text> Requests are held for <Text style={{ fontWeight: '700' }}>48 hours</Text>. If no action is taken within this time, they will automatically expire and the item will become available again.</Text>
                  </View>
                  {(() => {
                    const hasPhotos = photos.length > 0;
                    const selectedSold = hasPhotos && soldPhotoIndexes.includes(selectedPhotoIndex);
                    const allUnavailable = hasPhotos
                      ? photos.every((_: any, idx: number) => soldPhotoIndexes.includes(idx))
                      : false;

                    // All items given away or no stock left
                    if (allUnavailable || requestStatus === 'unavailable' || (liveInStock != null && liveInStock <= 0)) {
                      return (
                        <View style={modalStyles.unavailableBox}>
                          <Text style={modalStyles.unavailableText}>Sorry, this item is not available.</Text>
                          <TouchableOpacity onPress={onClose} style={modalStyles.keepBrowsingBtn}>
                            <Text style={modalStyles.keepBrowsingText}>Keep Browsing</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    // Selected photo already given away — prompt to pick another
                    if (selectedSold) {
                      return (
                        <View style={modalStyles.unavailableBox}>
                          <Text style={modalStyles.unavailableText}>This item is unavailable. Try selecting a different one.</Text>
                        </View>
                      );
                    }

                    const alreadyRequested = requestedPhotoIndexes.has(selectedPhotoIndex);
                    return (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[
                            modalStyles.cartButton,
                            alreadyRequested && modalStyles.cartButtonAdded,
                            requestStatus === 'loading' && { opacity: 0.6 },
                          ]}
                          onPress={alreadyRequested ? undefined : handleRequestItem}
                          disabled={requestStatus === 'loading' || alreadyRequested}
                        >
                          <Ionicons
                            name={alreadyRequested ? 'checkmark-circle' : 'hand-right-outline'}
                            size={18}
                            color="#fff"
                          />
                          <Text style={modalStyles.buttonText}>
                            {requestStatus === 'loading' ? ' Sending...' : alreadyRequested ? ' Sent' : ' Request'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={modalStyles.doneBtn} onPress={onClose}>
                          <Text style={modalStyles.doneBtnText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </>
              ) : (
                /* ── Paid categories: Payment method selector + Add to Cart ── */
                paymentCategories?.has(item.service_category) && (
                  soldPhotoIndexes.includes(selectedPhotoIndex) || (photos.length > 0 && soldPhotoIndexes.length >= photos.length) ? (
                    <View style={modalStyles.unavailableBox}>
                      <Text style={modalStyles.unavailableText}>Sorry, not available</Text>
                      <TouchableOpacity onPress={onClose} style={modalStyles.keepBrowsingBtn}>
                        <Text style={modalStyles.keepBrowsingText}>Keep Browsing</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {availablePayMethods.length > 0 && !addedToCart && (
                        <View style={modalStyles.payMethodSection}>
                          <Text style={modalStyles.payMethodLabel}>How would you like to pay?</Text>
                          <View style={modalStyles.payMethodChips}>
                            {availablePayMethods.map(method => (
                              <TouchableOpacity
                                key={method}
                                style={[modalStyles.payChip, selectedPayMethod === method && modalStyles.payChipSelected]}
                                onPress={() => setSelectedPayMethod(method)}
                                activeOpacity={0.7}
                              >
                                <Text style={[modalStyles.payChipText, selectedPayMethod === method && modalStyles.payChipTextSelected]}>
                                  {PAYMENT_LABELS[method] || method}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[modalStyles.cartButton, (addedToCart || stockChecking) && modalStyles.cartButtonAdded, stockChecking && { opacity: 0.6 }]}
                        onPress={addedToCart
                          ? () => { onClose(); setTimeout(() => navigation.navigate('CartScreen'), 300); }
                          : handleAddListingToCart}
                        disabled={stockChecking}
                      >
                        <Ionicons name={addedToCart ? 'cart' : 'cart-outline'} size={18} color="#fff" />
                        <Text style={modalStyles.buttonText}>{stockChecking ? ' Checking...' : addedToCart ? ' View Cart' : ' Add to Cart'}</Text>
                      </TouchableOpacity>
                    </>
                  )
                )
              )}
              <TouchableOpacity
                style={modalStyles.contactButton}
                onPress={() => { onClose(); setTimeout(() => onChatPress(item), 300); }}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                <Text style={modalStyles.buttonText}>
                  {isThriftingFree || paymentCategories?.has(item.service_category) ? ' Message Seller' : ' Contact Provider'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── Reviews Modal ── */}
      <ReviewsModal
        visible={showReviewsModal}
        providerId={item.user_id}
        providerName={item.business_name || item.poster_name || 'Provider'}
        onClose={() => {
          setShowReviewsModal(false);
          onReviewSubmitted?.();
        }}
        onSignIn={() => {
          setShowReviewsModal(false);
          onClose();
          setTimeout(() => navigation.navigate('BusinessOwnerHomeScreen'), 300);
        }}
      />

      {/* ── Fullscreen zoom ── */}
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
              <TouchableOpacity style={zoomStyles.closeBtn} onPress={() => setZoomVisible(false)}>
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>

              <View style={zoomStyles.counter}>
                <Text style={zoomStyles.counterText}>
                  {selectedPhotoIndex + 1} / {photos.length}
                </Text>
              </View>

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
                  style={zoomStyles.fullPhoto}
                  resizeMode="contain"
                />
              </ScrollView>

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
// MINI CARD — single thumbnail + title + stars + location + cart button
// ============================================================================

const MiniServiceCard: React.FC<{
  item: ServicePost;
  isOwnPost: boolean;
  onChatPress: (item: ServicePost) => void;
  onReviewSubmitted?: () => void;
  onAddToCart?: AddToCartFn;
  isAuthenticated?: boolean;
  paymentCategories?: Set<string>;
}> = ({ item, isOwnPost, onChatPress, onReviewSubmitted, onAddToCart, isAuthenticated, paymentCategories }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const firstPhoto = (item.photos ?? []).filter((uri: string) => !!uri)[0] ?? null;

  return (
    <>
      {(() => {
        const isThrifting = item.service_category?.toLowerCase().trim() === 'preloved & thrifting';
        const isBoutique = !isThrifting && paymentCategories?.has(item.service_category);
        const accentColor = isThrifting ? '#27AE60' : isBoutique ? '#E67E22' : '#4A90E2';
        const badgeLabel = isThrifting ? 'FREE' : isBoutique ? 'SALE' : 'SERVICE';
        return (
      <TouchableOpacity
        style={[miniStyles.card, { borderLeftWidth: 4, borderLeftColor: accentColor }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.80}
      >
        {/* Single photo thumbnail */}
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
            {/* Type badge on photo */}
            <View style={[miniStyles.typeBadge, { backgroundColor: accentColor }]}>
              <Text style={miniStyles.typeBadgeText}>{badgeLabel}</Text>
            </View>
          </View>
        ) : (
          <View style={[
            miniStyles.noPhotoBox,
            { backgroundColor: (CATEGORY_META[item.service_category] ?? DEFAULT_META).color + '22' }
          ]}>
            <View style={[
              miniStyles.noPhotoIconCircle,
              { backgroundColor: (CATEGORY_META[item.service_category] ?? DEFAULT_META).color }
            ]}>
              <Ionicons
                name={(CATEGORY_META[item.service_category] ?? DEFAULT_META).icon}
                size={22}
                color="#fff"
              />
            </View>
            {/* Type badge when no photo */}
            <View style={[miniStyles.typeBadge, { backgroundColor: accentColor }]}>
              <Text style={miniStyles.typeBadgeText}>{badgeLabel}</Text>
            </View>
          </View>
        )}

        {/* Text content — right side */}
        <View style={miniStyles.content}>
          <Text style={miniStyles.title} numberOfLines={2}>{item.title}</Text>

          {/* Stars — tap opens ReviewsModal */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              setShowReviewsModal(true);
            }}
            activeOpacity={0.7}
            style={miniStyles.starsRow}
          >
            <MiniStars rating={item.average_rating ?? 0} count={item.review_count} />
            <Ionicons name="chevron-forward" size={10} color="#bbb" />
          </TouchableOpacity>

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
        );
      })()}

      <DetailModal
        item={item}
        visible={modalVisible}
        isOwnPost={isOwnPost}
        onClose={() => setModalVisible(false)}
        onChatPress={onChatPress}
        onReviewSubmitted={onReviewSubmitted}
        onAddToCart={onAddToCart}
        isAuthenticated={isAuthenticated}
        paymentCategories={paymentCategories}
      />

      {/* ReviewsModal opened directly from mini card stars */}
      <ReviewsModal
        visible={showReviewsModal}
        providerId={item.user_id}
        providerName={item.business_name || item.poster_name || 'Provider'}
        onClose={() => {
          setShowReviewsModal(false);
          onReviewSubmitted?.();
        }}
      />
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type Tab = 'all' | 'services' | 'boutique';

const RecentPostsSection: React.FC<RecentPostsSectionProps> = ({
  recentPosts,
  isOwnPost,
  onChatPress,
  loading,
  onReviewSubmitted,
  onAddToCart,
  isAuthenticated,
  paymentCategories,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('all');

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

  // Group into rows of 2 — offers only, filtered by active tab
  const allOffers = recentPosts.filter(p => p.post_type !== 'request' && p.is_active !== false);
  const offers = allOffers.filter(p => {
    const isThrifting = p.service_category?.toLowerCase().trim() === 'preloved & thrifting';
    if (activeTab === 'boutique') return !isThrifting && paymentCategories?.has(p.service_category);
    if (activeTab === 'services') return !isThrifting && !paymentCategories?.has(p.service_category);
    return true; // 'all' — thrifting items show under All
  });
  const rows: ServicePost[][] = [];
  for (let i = 0; i < offers.length; i += 2) {
    rows.push(offers.slice(i, i + 2));
  }

  return (
    <View style={sectionStyles.outerContainer}>

      {/* Now Available */}
      <View style={sectionStyles.nowAvailableRow}>
        <View style={sectionStyles.nowAvailableDot} />
        <Text style={sectionStyles.nowAvailableText}>NOW AVAILABLE</Text>
        <View style={sectionStyles.nowAvailableDot} />
      </View>

      {/* Tab buttons */}
      <View style={sectionStyles.tabRow}>
        {([
          { key: 'all',      label: 'All' },
          { key: 'services', label: 'Services' },
          { key: 'boutique', label: 'Sale' },
        ] as { key: Tab; label: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[sectionStyles.tabBtn, activeTab === tab.key && sectionStyles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[sectionStyles.tabBtnText, activeTab === tab.key && sectionStyles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
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

      {/* Empty state for filtered tab */}
      {offers.length === 0 && (
        <View style={sectionStyles.tabEmptyContainer}>
          <Ionicons name="search-outline" size={32} color="#ccc" />
          <Text style={sectionStyles.tabEmptyText}>No listings in this category yet.</Text>
        </View>
      )}

      {/* 2-column grid */}
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={sectionStyles.row}>
          {row.map((post, i) => (
            <MiniServiceCard
              key={post.post_id ?? rowIndex * 2 + i}
              item={post}
              isOwnPost={isOwnPost(post.user_id)}
              onChatPress={onChatPress}
              onReviewSubmitted={onReviewSubmitted}
              onAddToCart={onAddToCart}
              isAuthenticated={isAuthenticated}
              paymentCategories={paymentCategories}
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
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  photoImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  expandHint: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    padding: 3,
  },
  typeBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  typeBadgeNoPhoto: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingVertical: 2,
    alignItems: 'center',
  },
  typeBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  noPhotoBox: {
    width: 70,
    height: 70,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  noPhotoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 17,
    marginBottom: 4,
    minHeight: 34,
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
    marginBottom: 2,
  },
  ratingText: { fontSize: 13, color: '#888', marginLeft: 4 },
  businessName: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  locationText: { fontSize: 13, color: '#888' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  priceText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  deliveryText: { fontSize: 13, color: '#555', fontWeight: '600' },
  cartButtonAdded: { backgroundColor: '#388E3C' },
  postTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  actionCol: {
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Photos
  mainPhoto: { width: '100%', height: 260, marginBottom: 8 },
  thumbScroll: { paddingHorizontal: 12, marginBottom: 10 },
  thumbCard: { marginRight: 8, borderRadius: 8, borderWidth: 2, borderColor: 'transparent', alignItems: 'center' },
  thumbSelected: { borderColor: '#4A90E2' },
  thumbSold: { borderColor: '#ccc' },
  thumbImgWrapper: { width: 110, height: 110, borderRadius: 6, overflow: 'hidden' },
  thumbImg: { width: 110, height: 110 },
  thumbLabel: { fontSize: 10, fontWeight: '700', color: '#4A90E2', marginTop: 3, textAlign: 'center' },
  photoBadge: { marginTop: 3, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center' as const },
  photoBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  photosContainer: { paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  photoScroll: { marginBottom: 4 },
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
  descriptionText: { fontSize: 14, color: '#444', lineHeight: 20, paddingHorizontal: 16, marginBottom: 4 },
  noDescriptionText: {
    fontSize: 13,
    color: '#bbb',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    marginTop: 4,
  },

  // ── Action row: Contact + Cart side by side ──
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 6,
    minWidth: 160,
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 6,
    minWidth: 140,
  },
  contactButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  ownPostNote: {
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  ownPostNoteText: { color: '#999', fontSize: 13, fontStyle: 'italic' },

  // ── Shop Items section ──
  shopSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  shopSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
    gap: 10,
  },
  shopItemPhoto: { width: 56, height: 56, borderRadius: 6 },
  shopItemInfo: { flex: 1 },
  shopItemName: { fontSize: 13, fontWeight: '600', color: '#222', marginBottom: 2 },
  shopItemPrice: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  shopItemBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopItemBtnAdded: { backgroundColor: '#388E3C' },
  shopItemPriceTbd: { fontSize: 12, color: '#999', fontStyle: 'italic' },

  // ── Per-photo inline card ──
  photoCard: {
    width: 130,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoCardSelected: {
    borderColor: '#4A90E2',
  },
  photoPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 5,
  },
  photoCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#2E7D32',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginTop: 5,
    width: '100%',
  },
  photoCartBtnAdded: { backgroundColor: '#388E3C' },
  photoCartBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pickupInfoBox: { backgroundColor: '#F0F4FF', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#C5CAE9' },
  expiryNoteBox: { flexDirection: 'column' as const, backgroundColor: '#FBE9E7', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#FFCCBC' },
  expiryNoteText: { fontSize: 11, color: '#6D4C41', lineHeight: 16, flex: 1 },
  expiryNoteLine: { fontSize: 11, color: '#6D4C41', lineHeight: 16 },
  pickupInfoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pickupInfoTitle: { fontSize: 13, fontWeight: '700', color: '#4A90E2' },
  pickupInfoText: { fontSize: 12, color: '#555', lineHeight: 18 },
  doneBtn: { alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1.5, borderColor: '#4A90E2' },
  doneBtnText: { color: '#4A90E2', fontSize: 13, fontWeight: '700' as const },
  unavailableBox: { width: 180, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  unavailableText: { color: '#999', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  keepBrowsingBtn: { backgroundColor: '#4A90E2', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14 },
  keepBrowsingText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  payMethodSection: { width: '100%', marginBottom: 10 },
  payMethodLabel: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8 },
  payMethodChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payChip: {
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#4A90E2', backgroundColor: '#fff',
  },
  payChipSelected: { backgroundColor: '#4A90E2' },
  payChipText: { fontSize: 13, fontWeight: '600', color: '#4A90E2' },
  payChipTextSelected: { color: '#fff' },
});

// ============================================================================
// STYLES — FULLSCREEN ZOOM
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
    height: SCREEN_HEIGHT * 0.8,
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
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tabBtn: {
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#4A90E2', backgroundColor: '#fff',
  },
  tabBtnActive: { backgroundColor: '#4A90E2' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#4A90E2' },
  tabBtnTextActive: { color: '#fff' },
  tabEmptyContainer: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  tabEmptyText: { fontSize: 14, color: '#aaa' },
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