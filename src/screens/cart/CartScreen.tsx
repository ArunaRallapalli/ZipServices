/**
 * CartScreen.tsx
 * Shows per-photo items added to cart with add/remove/save for later options.
 * Each item represents a single photo from a service post.
 * Authenticated users only — guests are redirected to BusinessOwnerHomeScreen.
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, Image, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { removeFromCart, setQuantity } from '../../store/cartSlice';
import type { RootState } from '../../store/store';

const CartScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { isAuthenticated, userId } = useAuth();
  const { items } = useSelector((state: RootState) => state.cart);

  const THRIFTING_CATEGORY = 'preloved & thrifting';
  const allActiveItems = items.filter(i => !i.saved_for_later);

  // Auto-remove thrifting items — they use the Request flow, not cart/checkout
  React.useEffect(() => {
    allActiveItems
      .filter(i => i.service_category?.toLowerCase().trim() === THRIFTING_CATEGORY)
      .forEach(i => dispatch(removeFromCart({ post_id: i.post_id, photo_index: i.photo_index })));
  }, []);

  const activeItems = allActiveItems.filter(
    i => i.service_category?.toLowerCase().trim() !== THRIFTING_CATEGORY
  );
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'ship' | 'pickup'>('ship');

  // Group active items by provider — used for auto-split checkout
  const providerGroups: Record<number, typeof activeItems> = {};
  for (const item of activeItems) {
    if (!providerGroups[item.provider_user_id]) providerGroups[item.provider_user_id] = [];
    providerGroups[item.provider_user_id].push(item);
  }
  const providerIds = Object.keys(providerGroups).map(Number);
  const firstGroupItems = providerIds.length > 0 ? providerGroups[providerIds[0]] : [];
  const multipleProviders = providerIds.length > 1;

  // Shipping charge from the first provider's post (fallback $10)
  const firstGroupShippingCents = firstGroupItems[0]?.shipping_charge_cents ?? 1000;
  const shippingDisplay = `$${(firstGroupShippingCents / 100).toFixed(2)} for each order`;

  const handleCheckout = () => {
    navigation.navigate('BoutiqueCheckoutScreen', { fulfillmentMethod, items: firstGroupItems });
  };

  const renderItem = ({ item }: { item: any }) => {
    const qty = item.quantity ?? 1;
    const stockLimit = item.in_stock != null && item.in_stock > 0 ? item.in_stock : 999;
    const atStockLimit = qty >= stockLimit;
    const unitPrice = item.photo_price != null ? (parseFloat(String(item.photo_price).replace(/[^0-9.]/g, '')) || 0) : (parseFloat(String(item.price || 0).replace(/[^0-9.]/g, '')) || 0);
    const lineTotal = unitPrice * qty;

    return (
      <View style={styles.card}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Ionicons name="image-outline" size={28} color="#ccc" />
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.productId}>#P{item.post_id}-{(item.photo_index ?? 0) + 1}</Text>
          <Text style={styles.category}>{item.service_category}</Text>

          {/* Price × Qty */}
          {unitPrice > 0 ? (
            <View style={styles.priceRow}>
              <Text style={styles.price}>${unitPrice.toFixed(2)} × {qty}</Text>
              <Text style={styles.lineTotal}> = ${lineTotal.toFixed(2)}</Text>
            </View>
          ) : item.price ? (
            <Text style={styles.price}>{item.price}</Text>
          ) : null}

          {item.provider_name && (
            <Text style={styles.provider}>by {item.provider_name}</Text>
          )}

          {/* Quantity controls */}
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => dispatch(setQuantity({ post_id: item.post_id, photo_index: item.photo_index, quantity: qty - 1 }))}
              disabled={qty <= 1}
            >
              <Ionicons name="remove" size={16} color={qty <= 1 ? '#ccc' : '#4A90E2'} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => dispatch(setQuantity({ post_id: item.post_id, photo_index: item.photo_index, quantity: qty + 1 }))}
              disabled={atStockLimit}
            >
              <Ionicons name="add" size={16} color={atStockLimit ? '#ccc' : '#4A90E2'} />
            </TouchableOpacity>
            {atStockLimit && (
              <Text style={styles.stockNote}>Max stock reached</Text>
            )}
          </View>

          <View style={styles.actions}>
            {item.provider_user_id === userId ? (
              <Text style={styles.ownPostNote}>This is your post</Text>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.removeBtn]}
                onPress={() => dispatch(removeFromCart({ post_id: item.post_id, photo_index: item.photo_index }))}
              >
                <Ionicons name="trash-outline" size={16} color="#E53935" />
                <Text style={[styles.actionText, { color: '#E53935' }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptySubtitle}>Please sign in to view your cart</Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => navigation.navigate('BusinessOwnerHomeScreen')}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#4A90E2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={{ width: 40 }} />
      </View>

      {activeItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Your Cart Is Empty</Text>
          <Text style={styles.emptySubtitle}>Browse services and add items to your cart</Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => navigation.navigate('TabWrapperScreen')}
          >
            <Text style={styles.signInBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[{ key: 'content' }]}
          renderItem={() => (
            <View>
              {/* Active Cart Items */}
              {activeItems.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>
                    Cart ({activeItems.length} item{activeItems.length !== 1 ? 's' : ''})
                  </Text>
                  {activeItems.map(item => (
                    <React.Fragment key={`${item.post_id}_${item.photo_index}`}>
                      {renderItem({ item })}
                    </React.Fragment>
                  ))}
                </>
              )}


              {/* Category separation notice — above fulfillment */}
              {activeItems.length > 0 && (
                <Text style={styles.categorySeparationNote}>
                  <Text style={styles.categorySeparationNoteLabel}>Note: </Text><Text style={styles.categorySeparationNoteBody}>Items from different categories must be checked out separately.</Text>
                </Text>
              )}

              {/* Fulfillment selector */}
              {activeItems.length > 0 && (
                <View style={styles.fulfillmentContainer}>
                  <Text style={styles.fulfillmentLabel}>Fulfillment <Text style={styles.fulfillmentSubLabel}>(select from below)</Text></Text>
                  {(
                    <View style={styles.fulfillmentRow}>
                      <TouchableOpacity
                        style={[styles.fulfillmentBtn, fulfillmentMethod === 'pickup' && styles.fulfillmentBtnActive]}
                        onPress={() => setFulfillmentMethod('pickup')}
                      >
                        <Ionicons name="storefront-outline" size={15} color={fulfillmentMethod === 'pickup' ? '#fff' : '#4A90E2'} />
                        <Text style={[styles.fulfillmentBtnText, fulfillmentMethod === 'pickup' && styles.fulfillmentBtnTextActive]}>
                          Pickup from Boutique
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.fulfillmentBtn, fulfillmentMethod === 'ship' && styles.fulfillmentBtnActive]}
                        onPress={() => setFulfillmentMethod('ship')}
                      >
                        <Ionicons name="car-outline" size={15} color={fulfillmentMethod === 'ship' ? '#fff' : '#4A90E2'} />
                        <Text style={[styles.fulfillmentBtnText, fulfillmentMethod === 'ship' && styles.fulfillmentBtnTextActive]}>
                          Ship to Me{'\n'}{shippingDisplay}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Proceed to Checkout + Browse More */}
              {activeItems.length > 0 && (
                <View style={styles.checkoutContainer}>
                  <View style={styles.checkoutNotesWrapper}>
                    {multipleProviders && (
                      <View style={styles.multiProviderBanner}>
                        <Ionicons name="information-circle-outline" size={16} color="#1565C0" />
                        <Text style={styles.multiProviderText}>
                          Your cart has items from {providerIds.length} sellers. You'll check out one seller at a time — remaining items stay in your cart.
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.checkoutBtn}
                    onPress={handleCheckout}
                  >
                    <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.browseMoreBtn}
                    onPress={() => navigation.navigate('TabWrapperScreen')}
                  >
                    <Ionicons name="search-outline" size={16} color="#4A90E2" />
                    <Text style={styles.browseMoreBtnText}>Browse More</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          keyExtractor={item => item.key}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  sectionHeader: {
    fontSize: 15, fontWeight: '700', color: '#555',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16,
    marginBottom: 10, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e0e0e0', elevation: 1,
  },
  photo: { width: 90, height: 110 },
  noPhoto: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, padding: 12 },
  title: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 2 },
  productId: { fontSize: 11, color: '#888', marginBottom: 2, fontWeight: '600' },
  postTitle: { fontSize: 11, color: '#888', marginBottom: 4, fontStyle: 'italic' },
  category: { fontSize: 12, color: '#4A90E2', fontWeight: '600', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  price: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },
  lineTotal: { fontSize: 13, color: '#2E7D32', fontWeight: '700' },
  provider: { fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: 6 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#4A90E2',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 14, fontWeight: '700', color: '#333', minWidth: 20, textAlign: 'center' },
  stockNote: { fontSize: 11, color: '#E53935', fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeBtn: {},
  ownPostNote: { fontSize: 12, color: '#aaa', fontStyle: 'italic' },
  actionText: { fontSize: 12, color: '#4A90E2', fontWeight: '600' },
  checkoutNotesWrapper: { width: '100%', marginBottom: 10 },
  multiProviderBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#E3F2FD', borderRadius: 8, padding: 12,
    marginBottom: 8,
    borderWidth: 1, borderColor: '#90CAF9',
  },
  multiProviderText: { fontSize: 12, fontWeight: '700', color: '#1565C0', flex: 1, lineHeight: 18 },
  fulfillmentContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  fulfillmentLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  thriftingNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EEF4FF', borderRadius: 8, padding: 12 },
  thriftingNoteText: { fontSize: 13, color: '#333', lineHeight: 19, marginBottom: 10 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4A90E2', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
  chatBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  fulfillmentRow: { flexDirection: 'row', gap: 8 },
  fulfillmentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#4A90E2', backgroundColor: '#fff',
  },
  fulfillmentBtnActive: { backgroundColor: '#4A90E2' },
  fulfillmentBtnText: { fontSize: 12, fontWeight: '600', color: '#4A90E2', textAlign: 'center' },
  fulfillmentBtnTextActive: { color: '#fff' },
  checkoutContainer: { padding: 16, alignItems: 'center' },
  browseMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingVertical: 8, paddingHorizontal: 20,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#4A90E2',
  },
  browseMoreBtnText: { fontSize: 14, color: '#4A90E2', fontWeight: '600' },
  categoryNoteBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFEBEE', borderRadius: 8, padding: 12,
    marginHorizontal: 16, marginTop: 10,
    borderWidth: 1, borderColor: '#EF9A9A',
  },
  categoryNote: { fontSize: 12, color: '#E53935', textAlign: 'center', marginBottom: 8, lineHeight: 17 },
  categorySeparationNote: {
    fontSize: 13, fontWeight: '400', color: '#E53935',
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
  },
  categorySeparationNoteLabel: { fontWeight: '700' },
  categorySeparationNoteBody: { fontWeight: '400' },
  fulfillmentSubLabel: { fontSize: 12, fontWeight: '700', color: '#888' },
  checkoutNote: { fontSize: 13, color: '#E53935', textAlign: 'center', marginBottom: 8, fontWeight: '600' },
  checkoutBtn: {
    backgroundColor: '#4A90E2', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 36,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  checkoutBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#555', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  signInBtn: {
    backgroundColor: '#4A90E2', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10,
  },
  signInBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default CartScreen;
