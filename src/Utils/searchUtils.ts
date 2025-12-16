/**
 * searchUtils.ts
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
 * KEY FEATURES:
 * - Fetches service categories from backend with fallback to hardcoded list
 * - Searches service posts by category, ZIP code, city, and state
 * - Separates exact ZIP matches from nearby ZIP matches
 * - Deduplicates results between ZIP code and state matches
 * - Integrates with zippopotam.us API for ZIP code to location conversion
 */

import API_URL from "../config/apiConfig";
import { Alert } from "./Alert";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Represents a service post from a business or service provider
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
}

/**
 * Structured search results separating exact ZIP, nearby ZIP, and state-level matches
 */
export interface SearchResults {
  exactZipMatches: ServicePost[];      // Posts matching the exact ZIP code
  nearbyZipMatches: ServicePost[];     // Posts matching nearby ZIP codes
  zipCodeMatches: ServicePost[];       // Combined exact + nearby (for backward compatibility)
  stateMatches: ServicePost[];         // Posts matching the state (excluding ZIP matches)
  hasZipCodeMatches: boolean;          // Quick check for any ZIP results
  hasStateMatches: boolean;            // Quick check for state results
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
    // Construct API endpoint URL
    const apiUrl = `${API_URL}/api/service-categories`;
    console.log("📍 [searchUtils] API URL:", apiUrl);
    
    // Make GET request to fetch categories
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log("📥 [searchUtils] Response status:", response.status);
    
    // Check if request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse JSON response
    const data = await response.json();
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
 * First checks local cache, then queries external API if not found
 * 
 * @param zipCode - The 5-digit ZIP code to lookup
 * @returns Promise resolving to LocationData or null if not found
 * 
 * USES: Zippopotam.us API for ZIP code to location conversion
 */
export const fetchLocationFromZip = async (zipCode: string): Promise<LocationData | null> => {
  // Local cache for commonly used ZIP codes (avoids API calls)
  const knownZipCodes: { [key: string]: LocationData } = {
    '85288': { city: 'Tempe', state: 'AZ' },
  };

  // Check local cache first
  if (knownZipCodes[zipCode]) {
    console.log(`✅ [searchUtils] Known ZIP code: ${zipCode}`);
    return knownZipCodes[zipCode];
  }

  try {
    console.log(`🔍 [searchUtils] Fetching location for ZIP: ${zipCode}`);
    
    // Query zippopotam.us API for ZIP code data
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
 * Searches for service posts based on provided parameters
 * Performs two searches: one by ZIP code, one by state
 * Keeps exact and nearby ZIP matches separate
 * Deduplicates results to avoid showing same post twice
 * 
 * @param params - Search parameters including category, ZIP, and location
 * @returns Promise resolving to SearchResults with separated exact, nearby, and state matches
 * 
 * FLOW:
 * 1. Search by ZIP code (if provided) - returns exact and nearby matches separately
 * 2. Search by state (if provided) - returns state-wide matches
 * 3. Deduplicate state results to exclude posts already in ZIP results
 * 4. Return structured results with all match types
 */
export const searchServicePosts = async (params: SearchParams): Promise<SearchResults> => {
  console.log("🔍 [searchUtils] Searching with params:", params);

  const { serviceCategory, zipCode, state } = params;

  // Initialize result arrays
  let exactMatches: ServicePost[] = [];
  let nearbyMatches: ServicePost[] = [];
  let stateMatches: ServicePost[] = [];

  try {
    // ========================================================================
    // SEARCH BY ZIP CODE
    // ========================================================================
    if (zipCode) {
      // Build query parameters for ZIP code search
      const zipParams = new URLSearchParams({
        service_category: serviceCategory,
        zip_code: zipCode,
      });

      const zipUrl = `${API_URL}/api/service-posts/search?${zipParams.toString()}`;
      console.log("🔍 [searchUtils] ZIP search URL:", zipUrl);

      // Execute ZIP code search
      const zipResponse = await fetch(zipUrl);
      
      if (zipResponse.ok) {
        const zipData = await zipResponse.json();
        console.log("📥 [searchUtils] ZIP results:", zipData);
        
        if (zipData.success) {
          // Keep exact and nearby matches separate
          exactMatches = Array.isArray(zipData.exactMatches) ? zipData.exactMatches : [];
          nearbyMatches = Array.isArray(zipData.nearbyMatches) ? zipData.nearbyMatches : [];
          console.log(`✅ [searchUtils] ZIP results: ${exactMatches.length} exact + ${nearbyMatches.length} nearby`);
        }
      }
    }

    // ========================================================================
    // SEARCH BY STATE
    // ========================================================================
    if (state) {
      // Build query parameters for state search
      const stateParams = new URLSearchParams({
        service_category: serviceCategory,
        state: state,
      });

      const stateUrl = `${API_URL}/api/service-posts/search?${stateParams.toString()}`;
      console.log("🔍 [searchUtils] State search URL:", stateUrl);

      // Execute state search
      const stateResponse = await fetch(stateUrl);
      
      if (stateResponse.ok) {
        const stateData = await stateResponse.json();
        console.log("📥 [searchUtils] State results:", stateData);
        
        if (stateData.success) {
          // Combine exact and nearby state matches
          const exact = Array.isArray(stateData.exactMatches) ? stateData.exactMatches : [];
          const nearby = Array.isArray(stateData.nearbyMatches) ? stateData.nearbyMatches : [];
          const allStateResults = [...exact, ...nearby];
          
          // DEDUPLICATION: Remove any posts that already appear in ZIP results (exact or nearby)
          // This prevents showing the same service provider twice
          const allZipPostIds = [...exactMatches, ...nearbyMatches].map(post => post.post_id);
          stateMatches = allStateResults.filter(
            (statePost: ServicePost) => !allZipPostIds.includes(statePost.post_id)
          );
          console.log(`✅ [searchUtils] State results: ${exact.length} exact + ${nearby.length} nearby = ${allStateResults.length} total, ${stateMatches.length} after deduplication`);
        }
      }
    }

    // Combine exact and nearby for backward compatibility
    const allZipMatches = [...exactMatches, ...nearbyMatches];

    // Return structured results
    return {
      exactZipMatches: exactMatches,
      nearbyZipMatches: nearbyMatches,
      zipCodeMatches: allZipMatches,        // Combined for backward compatibility
      stateMatches: stateMatches,
      hasZipCodeMatches: allZipMatches.length > 0,
      hasStateMatches: stateMatches.length > 0,
    };
  } catch (error) {
    // Return empty results on error
    console.error("❌ [searchUtils] Search error:", error);
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