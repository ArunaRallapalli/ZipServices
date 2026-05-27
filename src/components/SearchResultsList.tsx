/**
 * SearchResultsList.tsx
 *
 * OVERVIEW:
 * Renders the search results grid after a user submits a category + ZIP search.
 * Displays results as 2-column mini cards with photo, title, rating, location.
 * Tapping a card opens a full-detail modal (ServiceCard) with contact + cart options.
 *
 * CART INTEGRATION (added March 2026 - feature/stripe-connect-payments):
 * - Each mini card now shows an "Add to Cart" button below the text content
 * - Auth guard: guests are redirected to BusinessOwnerHomeScreen on cart tap
 * - Cart button also appears inside the full detail modal
 * - Requires onAddToCart and isAuthenticated props from SearchResultsScreen
 *
 * @updated March 2026
 * @version 2.9.0
 *
 * Changes from v2.8.0:
 * - Added cart button to MiniServiceCard (below text content)
 * - Added cart button inside full detail modal
 * - Added onAddToCart + isAuthenticated props to SearchResultsListProps
 * - Auth guard: unauthenticated cart tap navigates to BusinessOwnerHomeScreen
 * - Added Alert, useNavigation, NativeStackNavigationProp imports
 *
 * UPDATED March 2026 v3.0:
 * - Detail modal: replaced ServiceCard + per-photo strip with inline layout
 * - Detail modal now matches RecentPostsSection order: photo → title → description → reviews → price → delivery → buttons
 * - Removed category/type badges and "About this service" label from detail modal
 * - Single Add to Cart button per listing (not per photo)
 * - Add to Cart + Contact Provider stacked vertically (full width)
 * - delivery_timeline field added to ServicePost interface and displayed after price
 * - Header shows close button only (title in body below photos)
 */

import React, { useState } from "react";
import API_URL from '../config/apiConfig';
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
} from "react-native";
import { Alert } from '../Utils/Alert';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ReviewsModal from "./Reviewsmodal";
import { createResponsiveStyles } from "../Utils/globalStyles";
import api from '../api';

interface ServicePost {
  post_id: number;
  user_id: number;
  poster_type: string;
  post_type: string;
  title: string;
  description?: string;
  service_category: string;
  price?: string;
  delivery_timeline?: string;
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
  photo_prices?: number[];
  accepts_payment?: boolean;
  provider_accepts_zelle?: boolean;
  in_stock?: number;
  shipping_charge_cents?: number;
  post_payment_method?: string;
  post_payment_info?: string;
}

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
  onAddToCart?: AddToCartFn;
  isAuthenticated?: boolean;
  paymentCategories?: Set<string>;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const CATEGORY_META: Record<string, { icon: IoniconsName; color: string }> = {
  "Bakery":                { icon: "cafe",           color: "#795548" },
  "Beauty Services":       { icon: "eye-outline",    color: "#D81B60" },
  "Catering":              { icon: "restaurant",     color: "#E67E22" },
  "Cleaning":              { icon: "sparkles",       color: "#4A90E2" },
  "Construction/Renovation": { icon: "build",        color: "#FF6F00" },
  "Dance Lessons":         { icon: "musical-notes",  color: "#9B59B6" },
  "Electrical":            { icon: "flash",          color: "#F9A825" },
  "Entertainment":         { icon: "mic",            color: "#E91E63" },
  "Event Planning":        { icon: "calendar",       color: "#F39C12" },
  "Home Repair":           { icon: "hammer",         color: "#6D4C41" },
  "Landscaping":           { icon: "leaf",           color: "#27AE60" },
  "Moving":                { icon: "cube",           color: "#546E7A" },
  "Painting":              { icon: "brush",          color: "#FF7043" },
  "Pet Care":              { icon: "paw",            color: "#43A047" },
  "Photography":           { icon: "camera",         color: "#8E24AA" },
  "Plumbing":              { icon: "water",          color: "#1565C0" },
  "Preloved & Thrifting":  { icon: "shirt",          color: "#8D6E63" },
  "Rentals":               { icon: "key-outline",    color: "#0288D1" },
  "Shoe Repair":           { icon: "construct",      color: "#795548" },
  "Tailoring":             { icon: "color-palette",  color: "#00897B" },
  "Tutoring":              { icon: "school",         color: "#1E88E5" },
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
  onAddToCart?: AddToCartFn;
  isAuthenticated?: boolean;
  paymentCategories?: Set<string>;
}> = ({ item, isOwnPost, onChatPress, onAddToCart, isAuthenticated, paymentCategories }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'requested' | 'completed' | 'unavailable'>(
    item.service_category?.toLowerCase().trim() === 'preloved & thrifting' && item.in_stock != null && item.in_stock <= 0 ? 'unavailable' : 'idle'
  );
  const [liveInStock, setLiveInStock] = useState<number | null | undefined>(item.in_stock);
  const [soldPhotoIndexes, setSoldPhotoIndexes] = useState<number[]>([]);
  const [thriftPendingIndexes, setThriftPendingIndexes] = useState<number[]>([]);
  const [requestedPhotoIndexes, setRequestedPhotoIndexes] = useState<Set<number>>(new Set());
  const [stockChecking, setStockChecking] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<string | null>(null);
  const firstPhoto = item.photos?.[0] ?? null;
  const { icon, color } = getCategoryMeta(item.service_category);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const photos = item.photos ?? [];

  const openZoom = (index: number) => { setSelectedPhotoIndex(index); setZoomVisible(true); };
  const goNext = () => { if (selectedPhotoIndex < photos.length - 1) setSelectedPhotoIndex(i => i + 1); };
  const goPrev = () => { if (selectedPhotoIndex > 0) setSelectedPhotoIndex(i => i - 1); };

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
    if (modalVisible && item.post_id) {
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
    if (modalVisible) {
      setSelectedPhotoIndex(0);
      setRequestedPhotoIndexes(new Set());
      setSelectedPayMethod(availablePayMethods.length === 1 ? availablePayMethods[0] : null);
      if (isThriftingFree && (item.photos ?? []).length > 0) {
        setRequestStatus('idle');
      }
    }
  }, [modalVisible]);

  // After soldPhotoIndexes loads, if the current selection is sold, auto-advance
  // to the first available photo so the modal never opens on a "Sorry, not available" state
  React.useEffect(() => {
    if (soldPhotoIndexes.length === 0) return;
    if (soldPhotoIndexes.includes(selectedPhotoIndex)) {
      const firstAvailable = (item.photos ?? []).findIndex((_, idx) => !soldPhotoIndexes.includes(idx));
      if (firstAvailable !== -1) setSelectedPhotoIndex(firstAvailable);
    }
  }, [soldPhotoIndexes]);

  // When the user taps a different photo thumbnail, reset item-level state so each
  // photo is evaluated independently.
  React.useEffect(() => {
    if (!isThriftingFree || !(item.photos ?? []).length) return;
    if (!soldPhotoIndexes.includes(selectedPhotoIndex)) {
      setRequestStatus(prev => prev === 'unavailable' ? 'idle' : prev);
    }
  }, [selectedPhotoIndex]);

  const handleRequestItem = async () => {
    if (!isAuthenticated) {
      setModalVisible(false);
      setTimeout(() => navigation.navigate('BusinessOwnerHomeScreen'), 300);
      return;
    }
    if (isOwnPost) {
      Alert.alert('Cannot Request', 'You cannot request your own item.');
      return;
    }
    setRequestStatus('loading');
    try {
      const hasPhotos = (item.photos ?? []).length > 0;
      await api.post('/api/thrift-requests', {
        post_id:          item.post_id,
        provider_user_id: item.user_id,
        post_title:       item.title,
        post_photo_url:   item.photos?.[selectedPhotoIndex] ?? item.photos?.[0] ?? null,
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
      // e.status = HTTP status code; e.response = parsed JSON body
      const httpStatus = e?.status;
      if (httpStatus === 409) {
        const serverStatus = e?.response?.status || 'requested';
        if (serverStatus === 'unavailable') {
          setRequestStatus('unavailable');
          Alert.alert('Not Available', e?.message || 'No more units available for this item.');
        } else {
          // buyer already has active request for this photo
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
      setModalVisible(false);
      setTimeout(() => navigation.navigate('BusinessOwnerHomeScreen'), 300);
      return;
    }
    if (isOwnPost) {
      Alert.alert('Cannot Add', 'You cannot add your own service to cart.');
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
          if (post.sold_photo_indexes.includes(selectedPhotoIndex)) return; // this photo is sold
        }
        // Only block on in_stock for single-photo posts; multi-photo posts use sold_photo_indexes
        const isMultiPhoto = (item.photos?.length ?? 0) > 1;
        if (!isMultiPhoto && post?.in_stock != null && post.in_stock <= 0) return;
      } catch { /* proceed if check fails */ }
    }
    if (availablePayMethods.length > 0 && !selectedPayMethod) {
      Alert.alert('Select Payment Method', 'Please choose how you would like to pay before adding to cart.');
      return;
    }
    const firstPhotoUrl = item.photos?.[selectedPhotoIndex] ?? item.photos?.[0] ?? '';
    const added = onAddToCart?.(item, selectedPhotoIndex, firstPhotoUrl, item.photo_prices?.[selectedPhotoIndex], selectedPayMethod ?? undefined);
    if (added === false) return;
    setAddedToCart(true);
    Alert.alert(
      'Added to Cart',
      `"${item.title}" has been added to your cart.`,
      [
        { text: 'Keep Browsing', style: 'cancel', onPress: () => setModalVisible(false) },
        {
          text: 'View Cart',
          onPress: () => {
            setModalVisible(false);
            setTimeout(() => navigation.navigate('CartScreen'), 300);
          },
        },
      ],
    );
  };

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

          {/* Stars — tap opens ReviewsModal, stops card press */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              setShowReviewsModal(true);
            }}
            activeOpacity={0.7}
            style={miniStyles.starsRowTouchable}
          >
            <MiniStars rating={item.average_rating ?? 0} count={item.review_count} />
            <Ionicons name="chevron-forward" size={10} color="#bbb" />
          </TouchableOpacity>

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

      {/* Full detail Modal — inline layout matching RecentPostsSection */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={modalStyles.safeArea}>
          {/* Header — close button only */}
          <View style={modalStyles.header}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={modalStyles.body} showsVerticalScrollIndicator={false}>

            {/* 1. Photos — thumbnails with product ID and sold overlay */}
            {(item.photos ?? []).length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.photoScroll}>
                {item.photos!.map((uri, index) => {
                  const isSold    = soldPhotoIndexes.includes(index);
                  const isPending = !isSold && isThriftingFree && thriftPendingIndexes.includes(index);
                  const badgeLabel = isSold ? (isThriftingFree ? 'Unavailable' : 'Sold') : isPending ? 'Active Requests' : 'Available';
                  const badgeColor = isSold ? (isThriftingFree ? '#9E9E9E' : '#E53935') : isPending ? '#F59E0B' : '#2E7D32';
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => { openZoom(index); setAddedToCart(false); }}
                      style={[modalStyles.thumbCard, index === selectedPhotoIndex && modalStyles.thumbSelected]}
                      activeOpacity={0.7}
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
              <Text style={modalStyles.descriptionText}>{item.description.replace(/\s+/g, ' ').trim()}</Text>
            ) : (
              <Text style={modalStyles.noDescText}>No description provided.</Text>
            )}

            {/* 4. Reviews */}
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

            {/* 6. Available count — total photos minus sold photos */}
            {paymentCategories?.has(item.service_category) && !isThriftingFree && (item.photos ?? []).length > 0 && (
              (() => {
                const available = (item.photos?.length ?? 0) - soldPhotoIndexes.length;
                return available > 0 ? (
                  <View style={modalStyles.deliveryRow}>
                    <Ionicons name="cube-outline" size={14} color="#555" />
                    <Text style={modalStyles.deliveryText}> Available: {available} of {item.photos!.length}</Text>
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

            {/* 7+8. Action buttons + Contact Provider stacked */}
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
                      const hasPhotos = (item.photos ?? []).length > 0;
                      const selectedSold = hasPhotos && soldPhotoIndexes.includes(selectedPhotoIndex);
                      const allUnavailable = hasPhotos
                        ? (item.photos ?? []).every((_: any, idx: number) => soldPhotoIndexes.includes(idx))
                        : false;

                      // All items given away or no stock left
                      if (allUnavailable || requestStatus === 'unavailable' || (liveInStock != null && liveInStock <= 0)) {
                        return (
                          <View style={modalStyles.unavailableBox}>
                            <Text style={modalStyles.unavailableText}>Sorry, this item is not available.</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={modalStyles.keepBrowsingBtn}>
                              <Text style={modalStyles.keepBrowsingText}>Keep Browsing</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      }

                      // Selected photo already given away — pick a different one
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
                          <TouchableOpacity
                            style={modalStyles.doneBtn}
                            onPress={() => setModalVisible(false)}
                          >
                            <Text style={modalStyles.doneBtnText}>Done</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })()}
                  </>
                ) : (
                  /* ── Paid categories: Payment method selector + Add to Cart ── */
                  paymentCategories?.has(item.service_category) && (
                    soldPhotoIndexes.includes(selectedPhotoIndex) || ((item.photos ?? []).length > 0 && soldPhotoIndexes.length >= (item.photos ?? []).length) ? (
                      <View style={modalStyles.unavailableBox}>
                        <Text style={modalStyles.unavailableText}>Sorry, not available</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={modalStyles.keepBrowsingBtn}>
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
                            ? () => { setModalVisible(false); setTimeout(() => navigation.navigate('CartScreen'), 300); }
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
                  onPress={() => { setModalVisible(false); setTimeout(() => onChatPress(item), 300); }}
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
      </Modal>

      {/* Zoom Modal */}
      <Modal visible={zoomVisible} transparent animationType="fade" onRequestClose={() => setZoomVisible(false)}>
        <TouchableOpacity style={zoomStyles.overlay} activeOpacity={1} onPress={() => setZoomVisible(false)}>
          <TouchableOpacity style={zoomStyles.closeBtn} onPress={() => setZoomVisible(false)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {photos[selectedPhotoIndex] && (
            <Image source={{ uri: photos[selectedPhotoIndex] }} style={zoomStyles.zoomedImage} resizeMode="contain" />
          )}
          <View style={zoomStyles.navRow}>
            <TouchableOpacity style={zoomStyles.navBtn} onPress={goPrev}>
              <Ionicons name="chevron-back" size={28} color={selectedPhotoIndex === 0 ? '#555' : '#fff'} />
            </TouchableOpacity>
            <Text style={zoomStyles.counter}>{selectedPhotoIndex + 1} / {photos.length}</Text>
            <TouchableOpacity style={zoomStyles.navBtn} onPress={goNext}>
              <Ionicons name="chevron-forward" size={28} color={selectedPhotoIndex === photos.length - 1 ? '#555' : '#fff'} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ReviewsModal — opened from mini card stars */}
      <ReviewsModal
        visible={showReviewsModal}
        providerId={item.user_id}
        providerName={item.business_name || item.poster_name || 'Provider'}
        onClose={() => setShowReviewsModal(false)}
        onSignIn={() => {
          setShowReviewsModal(false);
          setModalVisible(false);
          setTimeout(() => navigation.navigate('BusinessOwnerHomeScreen'), 300);
        }}
      />
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
  starsRowTouchable: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  ratingCount: { fontSize: 9, color: "#aaa", marginLeft: 2 },
  locationRow: { flexDirection: "row", alignItems: "center" },
  locationText: { fontSize: 10, color: "#4A90E2", fontWeight: "700" },
});

const modalStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  closeBtn: { padding: 4 },
  body: { paddingBottom: 40 },
  photoScroll: { paddingHorizontal: 12, marginBottom: 8, marginTop: 8 },
  thumbCard: { marginRight: 8, borderRadius: 8, borderWidth: 2, borderColor: 'transparent', alignItems: 'center' },
  thumbSelected: { borderColor: '#4A90E2' },
  thumbSold: { borderColor: '#ccc' },
  thumbImgWrapper: { width: 100, height: 100, borderRadius: 6, overflow: 'hidden' },
  thumbImg: { width: 100, height: 100 },
  thumbLabel: { fontSize: 10, fontWeight: '700', color: '#4A90E2', marginTop: 3, textAlign: 'center' },
  photoBadge: { marginTop: 3, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center' as const },
  photoBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  photoCard: { width: 130, marginRight: 10, alignItems: 'center' },
  photoCardImg: { width: 120, height: 120, borderRadius: 8 },
  postTitle: {
    fontSize: 14, fontWeight: '700', color: '#1a1a1a',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  descriptionText: {
    fontSize: 14, color: '#444', lineHeight: 21,
    paddingHorizontal: 16, marginBottom: 6,
  },
  noDescText: { fontSize: 13, color: '#bbb', fontStyle: 'italic', paddingHorizontal: 16, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 },
  ratingText: { fontSize: 13, color: '#888', marginLeft: 4 },
  businessName: { fontSize: 13, color: '#666', fontStyle: 'italic', paddingHorizontal: 16, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 2 },
  locationText: { fontSize: 13, color: '#888' },
  priceRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 },
  priceText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 },
  deliveryText: { fontSize: 13, color: '#555', fontWeight: '600' },
  actionCol: {
    flexDirection: 'column', alignItems: 'center',
    marginHorizontal: 16, marginTop: 8, gap: 8,
  },
  cartButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2E7D32', paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 10, gap: 6, minWidth: 140,
  },
  cartButtonAdded: { backgroundColor: '#388E3C' },
  contactButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4A90E2', paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 10, gap: 6, minWidth: 160,
  },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  ownPostNote: {
    alignItems: 'center', marginTop: 16, marginHorizontal: 16,
    padding: 12, backgroundColor: '#f0f0f0', borderRadius: 8,
  },
  ownPostNoteText: { color: '#999', fontSize: 13, fontStyle: 'italic' },
  pickupInfoBox: { backgroundColor: '#F0F4FF', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#C5CAE9' },
  expiryNoteBox: { flexDirection: 'column' as const, backgroundColor: '#FBE9E7', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#FFCCBC' },
  expiryNoteText: { fontSize: 11, color: '#6D4C41', lineHeight: 16, flex: 1 },
  expiryNoteLine: { fontSize: 11, color: '#6D4C41', lineHeight: 16 },
  pickupInfoHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 4 },
  pickupInfoTitle: { fontSize: 13, fontWeight: '700' as const, color: '#4A90E2' },
  pickupInfoText: { fontSize: 12, color: '#555', lineHeight: 18 },
  doneBtn: { alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1.5, borderColor: '#4A90E2' },
  doneBtnText: { color: '#4A90E2', fontSize: 13, fontWeight: '700' as const },
  unavailableBox: { width: 180, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10, alignItems: 'center' as const, borderWidth: 1, borderColor: '#ddd' },
  unavailableText: { color: '#999', fontSize: 12, fontWeight: '600' as const, marginBottom: 8 },
  keepBrowsingBtn: { backgroundColor: '#4A90E2', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14 },
  keepBrowsingText: { color: '#fff', fontSize: 12, fontWeight: '700' as const },
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


// ADDED (feature/stripe-connect-payments): destructure new cart props
const SearchResultsList: React.FC<SearchResultsListProps> = ({
  searchResults,
  isOwnPost,
  onChatPress,
  onBackPress,
  zipCode,
  city,
  state,
  onAddToCart,
  isAuthenticated,
  paymentCategories,
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
              {/* ADDED (feature/stripe-connect-payments): pass cart props to each card */}
              <MiniServiceCard
                item={item}
                isOwnPost={isOwnPost(item.user_id)}
                onChatPress={onChatPress}
                onAddToCart={onAddToCart}
                isAuthenticated={isAuthenticated}
                paymentCategories={paymentCategories}
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

const zoomStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 48, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 6 },
  zoomedImage: { width: '100%', height: '70%' },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  navBtn: { padding: 12 },
  counter: { color: '#fff', fontSize: 14, marginHorizontal: 16 },
});

export default SearchResultsList;