/**
 * searchUtils.ts
 * 
 * Last Updated: January 5, 2026
 * Changes: Migrated from fetch to api client for automatic token handling (internal APIs only)
 * 
 * OVERVIEW:
 * This utility module provides core functionality for the service search feature.
 * It handles:
 * - Type definitions for service posts, search results, and categories
 * - API communication for fetching categories and searching service posts
 * - Location data resolution from ZIP codes using external API
 * - ZIP code validation
 * - Popular category configuration with icons and colors
 * 
 * UPDATED: Now supports radius-based search with distance calculation
 * Backend returns posts sorted by distance with mile information
 * 
 * KEY FEATURES:
 * - Fetches service categories from backend with fallback to hardcoded list
 * - Radius-based search: finds services within X miles of ZIP code
 * - Returns posts sorted by distance (closest first)
 * - Each result includes distance in miles
 * - Integrates with zippopotam.us API for ZIP code to location conversion
 */

import { Alert } from "./Alert";
import api from "../api"; // ADDED: January 5, 2026

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Represents a service post from a business or service provider
 * NOW INCLUDES: distance field (in miles) from radius search
 */
export interface ServicePost {
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
  distance?: number;        // NEW: Distance in miles from search center
}

/**
 * Structured search results
 * UPDATED: Now uses radius-based results instead of exact/nearby/state separation
 */
export interface SearchResults {
  exactZipMatches: ServicePost[];      // Posts sorted by distance (all results)
  nearbyZipMatches: ServicePost[];     // Deprecated (not used with radius search)
  zipCodeMatches: ServicePost[];       // Same as exactZipMatches (for compatibility)
  stateMatches: ServicePost[];         // Deprecated (not used with radius search)
  hasZipCodeMatches: boolean;          // Quick check for any results
  hasStateMatches: boolean;            // Always false with radius search
}

/**
 * Parameters for searching service posts
 */
export interface SearchParams {
  businessName?: string;
  serviceCategory: string;
  zipCode?: string;
  city?: string;
  state?: string;
  radius?: number;          // NEW: Search radius in miles (default: 25)
}

/**
 * Location data structure returned from ZIP code lookup
 */
export interface LocationData {
  city: string;
  state: string;
}

/**
 * Icon family types supported by React Native icon libraries
 */
export type IconFamily = "Ionicons" | "FontAwesome" | "FontAwesome5" | "MaterialCommunityIcons" | "MaterialIcons" | "AntDesign";

/**
 * Category configuration with display properties
 */
export interface Category {
  name: string;
  family: IconFamily;
  icon: string;
  color: string;      // Icon color
  bgColor: string;    // Background color
}

// ============================================================================
// POPULAR CATEGORIES CONFIGURATION
// ============================================================================

/**
 * Predefined popular service categories displayed as quick-access tiles
 * Each category includes icon styling for visual representation
 */
export const popularCategories: Category[] = [
  { name: "Catering", family: "Ionicons", icon: "restaurant", color: "#FF6B6B", bgColor: "#FFE5E5" },
  { name: "Beauty Services", family: "FontAwesome", icon: "paint-brush", color: "#FF8C00", bgColor: "#FFF2E5" },
  { name: "Decorations", family: "Ionicons", icon: "color-palette", color: "#1E90FF", bgColor: "#E5F2FF" },
  { name: "Tailoring", family: "MaterialCommunityIcons", icon: "tshirt-crew", color: "#32CD32", bgColor: "#E8F5E8" },
  { name: "Cleaning", family: "MaterialCommunityIcons", icon: "broom", color: "#BA55D3", bgColor: "#F5E8F5" },
  { name: "Plumbing", family: "MaterialCommunityIcons", icon: "wrench", color: "#FF4500", bgColor: "#FFE8E0" },
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a string is a valid 5-digit US ZIP code
 * @param zip - The ZIP code string to validate
 * @returns true if valid, false otherwise
 */
export const isValidZipCode = (zip: string): boolean => {
  return /^\d{5}$/.test(zip);
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetches available service categories from the backend API
 * Falls back to a hardcoded list if the API call fails
 * UPDATED: January 5, 2026 - Using api.get() instead of fetch
 * 
 * @returns Promise resolving to an array of category names
 * 
 * FLOW:
 * 1. Attempts to fetch from /api/service-categories endpoint
 * 2. Validates response structure
 * 3. Returns categories if successful
 * 4. Shows alert and returns fallback list on error
 */
export const fetchCategories = async (): Promise<string[]> => {
  console.log("🔄 [searchUtils] Fetching categories from API...");
  
  // Fallback categories used if API fails
  const fallbackCategories = [
    'Cleaning', 'Plumbing', 'Electrical', 'Landscaping', 'Home Repair',
    'Pet Care', 'Moving', 'Tutoring', 'Photography', 'Catering',
    'Beauty Services', 'Decorations', 'Tailoring'
  ];

  try {
    // UPDATED: Using api client instead of fetch
    const data = await api.get('/api/service-categories');
    
    console.log("✅ [searchUtils] Categories data received:", data);

    // Validate data structure and return categories
    if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
      console.log(`✅ [searchUtils] Found ${data.categories.length} categories`);
      return data.categories;
    } else {
      console.warn("⚠️ [searchUtils] Invalid data structure");
      throw new Error("Invalid categories data structure");
    }
  } catch (error: any) {
    // Log error and notify user
    console.error("❌ [searchUtils] Category fetch error:", error);
    Alert.alert(
      "Categories Loading Issue",
      "Unable to load categories from server. Using default categories instead.",
      [{ text: "OK" }]
    );
    console.log("⚠️ [searchUtils] Using fallback categories");
    return fallbackCategories;
  }
};

/**
 * Fetches city and state information for a given ZIP code
 * Queries external API for real-time ZIP code data
 * NOTE: This uses an EXTERNAL API (zippopotam.us), not our backend
 * 
 * @param zipCode - The 5-digit ZIP code to lookup
 * @returns Promise resolving to LocationData or null if not found
 * 
 * USES: Zippopotam.us API for ZIP code to location conversion
 * This free API provides accurate, up-to-date ZIP code information
 * for all US ZIP codes without requiring an API key
 */
export const fetchLocationFromZip = async (zipCode: string): Promise<LocationData | null> => {
  try {
    console.log(`🔍 [searchUtils] Fetching location for ZIP: ${zipCode}`);
    
    // Query zippopotam.us API for ZIP code data
    // NOTE: This is an EXTERNAL API, not our backend, so we use native fetch
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);

    // If ZIP code not found, return null
    if (!response.ok) {
      console.log(`❌ [searchUtils] ZIP code not found: ${zipCode}`);
      return null;
    }

    // Parse response data
    const data = await response.json();
    console.log(`✅ [searchUtils] ZIP data received:`, data);

    // Extract city and state from first place in response
    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      return {
        city: place["place name"],
        state: place["state abbreviation"]
      };
    }

    return null;
  } catch (error) {
    console.error("❌ [searchUtils] Zip fetch error:", error);
    return null;
  }
};

/**
 * Searches for service posts using RADIUS-BASED search
 * UPDATED: January 5, 2026 - Using api.get() instead of fetch
 * 
 * NEW BACKEND INTEGRATION:
 * - Uses /api/service-posts/search endpoint with radius parameter
 * - Backend calculates distances using Haversine formula
 * - Returns posts sorted by distance (closest first)
 * - Each post includes distance in miles
 * 
 * @param params - Search parameters including category, ZIP, and optional radius
 * @returns Promise resolving to SearchResults with posts sorted by distance
 * 
 * BACKEND RESPONSE FORMAT:
 * {
 *   success: true,
 *   posts: [
 *     { ...postData, distance: 7.3 },  // miles from search center
 *     { ...postData, distance: 16.7 },
 *   ],
 *   searchCenter: { zipCode: "85083", lat: 33.7352, lon: -112.1294 },
 *   radius: 25,
 *   count: 2
 * }
 * 
 * FLOW:
 * 1. Build query with category, ZIP code, and radius
 * 2. Call backend search endpoint
 * 3. Backend calculates distances for all posts in category
 * 4. Backend filters posts beyond radius
 * 5. Backend sorts by distance (closest first)
 * 6. Frontend receives sorted posts with distance info
 * 7. Return structured results
 */
export const searchServicePosts = async (params: SearchParams): Promise<SearchResults> => {
  console.log("🔍 [searchUtils] Searching with params:", params);

  const { serviceCategory, zipCode, radius = 25 } = params;

  // Initialize result arrays
  let allPosts: ServicePost[] = [];

  try {
    // ========================================================================
    // RADIUS-BASED SEARCH
    // ========================================================================
    // NEW: Uses backend's radius calculation instead of separate ZIP/state searches
    // Backend handles distance calculation, filtering, and sorting
    
    if (zipCode) {
      console.log(`🎯 [searchUtils] Starting radius search for ${serviceCategory} within ${radius} miles of ${zipCode}`);
      
      // Build query parameters for radius search
      const searchParams = new URLSearchParams({
        service_category: serviceCategory,
        zip_code: zipCode,
        radius: radius.toString(),
      });

      const searchUrl = `/api/service-posts/search?${searchParams.toString()}`;
      console.log("📍 [searchUtils] Search URL:", searchUrl);

      // UPDATED: Using api client instead of fetch
      const data = await api.get(searchUrl);
      
      console.log("📥 [searchUtils] Search response:", data);
      
      // ====================================================================
      // PARSE NEW BACKEND RESPONSE FORMAT
      // ====================================================================
      // Expected structure:
      // {
      //   success: true,
      //   posts: [...],           // Array of posts with distance field
      //   searchCenter: {...},    // Center point info
      //   radius: 25,             // Search radius used
      //   count: 2                // Number of results
      // }
      
      if (data.success && Array.isArray(data.posts)) {
        allPosts = data.posts;
        
        console.log(`✅ [searchUtils] Found ${data.count} posts within ${data.radius} miles`);
        
        // Log search center info for debugging
        if (data.searchCenter) {
          console.log(`📍 [searchUtils] Search center: ${data.searchCenter.zipCode} at (${data.searchCenter.lat}, ${data.searchCenter.lon})`);
        }
        
        // Log distance for each result
        if (allPosts.length > 0) {
          console.log("📏 [searchUtils] Results by distance:");
          allPosts.forEach((post, index) => {
            console.log(`   ${index + 1}. ${post.title} - ${post.distance} miles (${post.city}, ${post.state})`);
          });
        } else {
          console.log(`ℹ️ [searchUtils] No services found within ${radius} miles of ${zipCode}`);
        }
      } else {
        console.warn("⚠️ [searchUtils] Invalid response structure:", data);
      }
    } else {
      console.warn("⚠️ [searchUtils] No ZIP code provided for radius search");
    }

    // ========================================================================
    // RETURN STRUCTURED RESULTS
    // ========================================================================
    // All posts are already sorted by distance from backend
    // Distance information is included in each post
    
    const hasResults = allPosts.length > 0;
    
    const results: SearchResults = {
      exactZipMatches: allPosts,          // All results (sorted by distance)
      nearbyZipMatches: [],               // Not used with radius search
      zipCodeMatches: allPosts,           // Same as exactZipMatches (for compatibility)
      stateMatches: [],                   // Not used with radius search
      hasZipCodeMatches: hasResults,
      hasStateMatches: false,             // Radius search doesn't separate state matches
    };

    console.log("✅ [searchUtils] Search complete:", {
      totalResults: allPosts.length,
      hasResults: hasResults,
      closestDistance: allPosts[0]?.distance,
      farthestDistance: allPosts[allPosts.length - 1]?.distance,
    });

    return results;
    
  } catch (error: any) {
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    // Return empty results on error
    // Log error for debugging
    
    console.error("❌ [searchUtils] Search error:", error);
    
    // Show user-friendly error message
    Alert.alert(
      "Search Error",
      "Unable to search for services. Please check your connection and try again.",
      [{ text: "OK" }]
    );
    
    // Return empty results structure
    return {
      exactZipMatches: [],
      nearbyZipMatches: [],
      zipCodeMatches: [],
      stateMatches: [],
      hasZipCodeMatches: false,
      hasStateMatches: false,
    };
  }
};