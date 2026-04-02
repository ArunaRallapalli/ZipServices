/**
 * SearchResultsScreen.tsx — UPDATED
 *
 * Branch: feature/search-page-recent-posts
 *
 * Changes from original:
 *  - Removed <CategoryTiles> (popular categories) from default view
 *  - Added <RecentPostsSection> showing:
 *      • Categories that actually have active posts (horizontal chips)
 *      • 3–5 latest posts as preview cards
 *      • "Can't find it? Search 100+ categories" nudge
 *  - Added fetchRecentPosts to load on mount
 *  - Header is now shorter (see SearchHeader.tsx)
 *  - Added handleAddToCart wired to Redux cartSlice
 *  - isAuthenticated passed to RecentPostsSection for cart auth guard
 */
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../store/cartSlice';
import type { RootState } from '../store/store';
import { createResponsiveStyles } from '../Utils/globalStyles';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Alert } from '../Utils/Alert';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../navigation/MainStackNavigator';

import Header from '../components/SearchHeader';
import SearchForm from '../components/SearchForm';
import SearchResultsList from '../components/SearchResultsList';
import RecentPostsSection from '../components/RecentPostsSection';

import {
  ServicePost,
  SearchResults,
  fetchLocationFromZip,
  fetchCategories,
  fetchPaymentCategories,
  searchServicePosts,
  fetchRecentPosts,
  isValidZipCode,
} from '../Utils/searchUtils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type SearchResultsRouteProp = RouteProp<TabParamList, 'Home'>;
type SearchResultsNavProp = NativeStackNavigationProp<RootStackParamList>;

interface CustomerInfo {
  user_id: number;
  user_type?: 'customer' | 'business_owner';
  full_name?: string;
  phone_number?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  email?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SearchResultsScreen: React.FC = () => {
  // --------------------------------------------------------------------------
  // HOOKS AND NAVIGATION
  // --------------------------------------------------------------------------

  const route = useRoute<SearchResultsRouteProp>();
  const navigation = useNavigation<SearchResultsNavProp>();
  const auth = useAuth();
  const dispatch = useDispatch(); // ← NEW
  const cartCount = useSelector((state: RootState) =>
    state.cart.items.filter(i => !i.saved_for_later).length
  );

  const routeParams = route.params || {};
  const customerInfo: CustomerInfo | undefined = routeParams.customerInfo;
  const isGuest = routeParams.isGuest || false;
  const preselectedCategory = routeParams.preselectedCategory || '';

  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------

  const [businessName, setBusinessName] = useState<string>('');
  const [zipCode, setZipCode] = useState(customerInfo?.zip_code || '');
  const [city, setCity] = useState(customerInfo?.city || '');
  const [state, setState] = useState(customerInfo?.state || '');
  const [serviceNeeded, setServiceNeeded] = useState(preselectedCategory || '');

  const [categories, setCategories] = useState<string[]>([]);
  const [paymentCategories, setPaymentCategories] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<SearchResults>({
    exactZipMatches: [],
    nearbyZipMatches: [],
    zipCodeMatches: [],
    stateMatches: [],
    hasZipCodeMatches: false,
    hasStateMatches: false,
  });

  // recent-posts section state
  const [recentPosts, setRecentPosts] = useState<ServicePost[]>([]);
  const [loadingRecentSection, setLoadingRecentSection] = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isZipValid, setIsZipValid] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --------------------------------------------------------------------------
  // REFS
  // --------------------------------------------------------------------------

  const zipDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // --------------------------------------------------------------------------
  // UTILITY
  // --------------------------------------------------------------------------

  const isOwnPost = (postUserId: number): boolean =>
    String(auth.userInfo?.user_id) === String(postUserId);

  // --------------------------------------------------------------------------
  // CART HANDLER — NEW
  // --------------------------------------------------------------------------

  const handleAddToCart = (
    item: ServicePost,
    photoIndex: number,
    photoUrl: string,
    photoPrice?: number,
  ) => {
    dispatch(addToCart({
      post_id: item.post_id,
      photo_index: photoIndex,
      photo_url: photoUrl,
      photo_price: photoPrice || undefined,
      title: item.title,
      service_category: item.service_category,
      price: parseFloat(String(item.price || '').replace(/[^0-9.]/g, '')) || undefined,
      provider_user_id: item.user_id,
      provider_name: item.business_name ?? item.poster_name ?? '',
      saved_for_later: false,
      quantity: 1,
      in_stock: item.in_stock,
    }));
  };

  // --------------------------------------------------------------------------
  // CHAT HANDLER
  // --------------------------------------------------------------------------

  const handleChatPress = async (item: ServicePost) => {
    try {
      if (!auth.isAuthenticated || !auth.userInfo?.user_id) {
        Alert.alert(
          'Sign In Required',
          'You need to be signed in to chat with service providers. Would you like to sign in now?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: handleSignIn, style: 'default' },
          ],
        );
        return;
      }

      if (isOwnPost(item.user_id)) {
        Alert.alert(
          'Cannot Contact Yourself',
          'This is your own post. You cannot send messages to yourself.',
          [{ text: 'OK', style: 'default' }],
        );
        return;
      }

      const extractUsername = (email: string | null | undefined): string => {
        if (!email) return 'Provider';
        return email.split('@')[0] || 'Provider';
      };

      const currentUserId =
        typeof auth.userInfo.user_id === 'string'
          ? parseInt(auth.userInfo.user_id, 10)
          : auth.userInfo.user_id;

      const otherUserId =
        typeof item.user_id === 'string' ? parseInt(item.user_id, 10) : item.user_id;

      const otherUserName =
        item.business_name ||
        (item.poster_name && item.poster_name.includes('@')
          ? extractUsername(item.poster_name)
          : item.poster_name) ||
        extractUsername(item.contact_email);

      navigation.navigate('ChatScreen', {
        currentUserId,
        otherUserId,
        otherUserName,
      });
    } catch (error) {
      console.error('Chat navigation error:', error);
      Alert.alert('Navigation Error', 'Unable to open chat. Please try again.');
    }
  };

  const handleSignIn = () => {
    try {
      navigation.navigate('BusinessOwnerHomeScreen');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Unable to navigate to sign-in screen');
    }
  };

  // --------------------------------------------------------------------------
  // PULL-TO-REFRESH
  // --------------------------------------------------------------------------

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const refreshTasks: Promise<any>[] = [
      fetchRecentPosts(9).then(setRecentPosts).catch(() => {}),
    ];
    if (hasSearched && serviceNeeded && (zipCode || (city && state))) {
      refreshTasks.push(performSearch(true));
    }
    await Promise.all(refreshTasks);
    setRefreshing(false);
  }, [hasSearched, serviceNeeded, zipCode, city, state]);

  // --------------------------------------------------------------------------
  // ZIP CODE HANDLING
  // --------------------------------------------------------------------------

  const handleZipChange = async (text: string) => {
    setZipCode(text);
    if (zipDebounceRef.current) clearTimeout(zipDebounceRef.current);

    if (text.length === 5 && isValidZipCode(text)) {
      zipDebounceRef.current = setTimeout(async () => {
        const location = await fetchLocationFromZip(text);
        if (location) {
          setCity(location.city);
          setState(location.state);
          setIsZipValid(true);
        } else {
          setIsZipValid(false);
          if (!isInitialMount.current) {
            Alert.alert(
              'Invalid ZIP Code',
              'Please enter a valid US ZIP code or enter your city and state manually.',
            );
          }
        }
      }, 500);
    } else {
      setIsZipValid(false);
      setCity('');
      setState('');
    }
  };

  // --------------------------------------------------------------------------
  // SEARCH
  // --------------------------------------------------------------------------

  const performSearch = async (
    silentRefresh: boolean = false,
    categoryOverride?: string,
  ) => {
    const searchCategory = categoryOverride || serviceNeeded;

    if (!searchCategory) {
      if (!silentRefresh) Alert.alert('Missing Information', 'Please select a service category.');
      return;
    }
    if (!zipCode || zipCode.trim() === '') {
      if (!silentRefresh)
        Alert.alert('ZIP Code Required', 'Please enter your ZIP code to search for services.');
      return;
    }
    if (zipCode.length < 5) {
      if (!silentRefresh)
        Alert.alert('Invalid ZIP Code', 'Please enter a complete 5-digit ZIP code.');
      return;
    }
    setLoading(true);
    try {
      const results = await searchServicePosts({
        businessName: businessName || undefined,
        serviceCategory: searchCategory,
        zipCode: zipCode || undefined,
        city: city || undefined,
        state: state || undefined,
      });
      setSearchResults(results);
      setHasSearched(true);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      if (!silentRefresh)
        Alert.alert('Search Error', 'Failed to search for services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => performSearch(false);

  // --------------------------------------------------------------------------
  // CATEGORY PRESS
  // --------------------------------------------------------------------------

  const handleCategoryPress = (categoryName: string) => {
    if (!zipCode || zipCode.trim() === '') {
      Alert.alert('ZIP Code Required', 'Please enter your ZIP code before selecting a category.');
      return;
    }
    if (zipCode.length < 5) {
      Alert.alert('Invalid ZIP Code', 'Please enter a complete 5-digit ZIP code.');
      return;
    }
    if (!isZipValid) {
      Alert.alert('Invalid ZIP Code', 'Please enter a valid ZIP code before selecting a category.');
      return;
    }

    setServiceNeeded(categoryName);
    setTimeout(() => performSearch(false, categoryName), 100);
  };

  const handleBackPress = () => {
    setShowResults(false);
    setHasSearched(false);
  };

  // --------------------------------------------------------------------------
  // EFFECTS
  // --------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      if (hasSearched && showResults && serviceNeeded && zipCode && isZipValid) {
        performSearch(true);
      }
    }, [hasSearched, showResults, serviceNeeded, zipCode, isZipValid]),
  );

  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const [fetched, paymentSet] = await Promise.all([
          fetchCategories(),
          fetchPaymentCategories(),
        ]);
        setCategories(fetched);
        setPaymentCategories(paymentSet);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadRecentSection = async () => {
        setLoadingRecentSection(true);
        try {
          const posts = await fetchRecentPosts(9);
          setRecentPosts(posts);
        } catch (error) {
          console.error('Error loading recent section:', error);
        } finally {
          setLoadingRecentSection(false);
        }
      };
      loadRecentSection();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (preselectedCategory && isZipValid && !hasSearched && categories.length > 0) {
        performSearch(true, preselectedCategory);
      }
    }, [preselectedCategory, isZipValid, hasSearched, categories]),
  );

  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  if (loadingCategories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (showResults) {
    return (
      <View style={{ flex: 1 }}>
        <SearchResultsList
          searchResults={searchResults}
          isOwnPost={isOwnPost}
          onChatPress={handleChatPress}
          onBackPress={handleBackPress}
          zipCode={zipCode}
          city={city}
          state={state}
          onAddToCart={handleAddToCart}
          isAuthenticated={auth.isAuthenticated}
          paymentCategories={paymentCategories}
        />
        {cartCount > 0 && (
          <TouchableOpacity
            style={styles.cartFab}
            onPress={() => navigation.navigate('CartScreen')}
          >
            <Ionicons name="cart" size={22} color="#fff" />
            <Text style={styles.cartFabText}>Cart ({cartCount})</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Shorter header */}
        <Header
          isAuthenticated={auth.isAuthenticated}
          customerName={customerInfo?.full_name}
          onSignInPress={handleSignIn}
        />

        {/* Search form */}
        <SearchForm
          businessName={businessName}
          setBusinessName={setBusinessName}
          zipCode={zipCode}
          setZipCode={setZipCode}
          city={city}
          setCity={setCity}
          state={state}
          setState={setState}
          serviceNeeded={serviceNeeded}
          setServiceNeeded={setServiceNeeded}
          categories={categories}
          isZipValid={isZipValid}
          isGuest={isGuest}
          handleSearch={handleSearch}
          onZipChange={handleZipChange}
        />

        {/* RecentPostsSection — now with cart props */}
        <RecentPostsSection
          recentPosts={recentPosts}
          isOwnPost={isOwnPost}
          onChatPress={handleChatPress}
          loading={loadingRecentSection}
          onAddToCart={handleAddToCart}
          isAuthenticated={auth.isAuthenticated}
          paymentCategories={paymentCategories}
          onReviewSubmitted={() => {
            fetchRecentPosts(9).then(setRecentPosts).catch(() => {});
          }}
        />

        {/* Support line */}
        <Text style={styles.supportText}>
          For questions or support, please contact us at support@gozipmarket.com
        </Text>
      </ScrollView>

      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.cartFab}
          onPress={() => navigation.navigate('CartScreen')}
        >
          <Ionicons name="cart" size={22} color="#fff" />
          <Text style={styles.cartFabText}>Cart ({cartCount})</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = createResponsiveStyles({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  cartFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#4A90E2',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cartFabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SearchResultsScreen;