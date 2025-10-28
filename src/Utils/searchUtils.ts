import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../config/apiConfig";

const ZIP_API = "https://api.zippopotam.us/us";

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

export interface SearchResults {
  zipCodeMatches: ServicePost[];
  stateMatches: ServicePost[];
  hasZipCodeMatches: boolean;
  hasStateMatches: boolean;
}

export const knownZipCodes: { [key: string]: { city: string; state: string } } = {
  '85288': { city: 'Tempe', state: 'AZ' },
};

/**
 * Fetch location data from ZIP code
 */
export const fetchLocationFromZip = async (
  zipCode: string
): Promise<{ city: string; state: string } | null> => {
  if (knownZipCodes[zipCode]) {
    return knownZipCodes[zipCode];
  }

  try {
    const response = await fetch(`${ZIP_API}/${zipCode}`);
    if (response.ok) {
      const data = await response.json();
      if (data.places && data.places.length > 0) {
        return {
          city: data.places[0]["place name"],
          state: data.places[0]["state abbreviation"],
        };
      }
    }
  } catch (error) {
    console.error("Error fetching location:", error);
  }
  return null;
};

/**
 * Fetch service categories from API
 */
export const fetchCategories = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_URL}/api/categories`);
    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }
    const data = await response.json();
    return data.categories || [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

/**
 * Search for service posts
 */
export const searchServicePosts = async (params: {
  businessName?: string;
  serviceCategory: string;
  zipCode?: string;
  city?: string;
  state?: string;
}): Promise<SearchResults> => {
  try {
    const token = await AsyncStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const queryParams = new URLSearchParams();
    if (params.businessName) queryParams.append("business_name", params.businessName);
    queryParams.append("service_category", params.serviceCategory);
    if (params.zipCode) queryParams.append("zip_code", params.zipCode);
    if (params.city) queryParams.append("city", params.city);
    if (params.state) queryParams.append("state", params.state);

    const response = await fetch(
      `${API_URL}/api/search-posts?${queryParams.toString()}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Search failed");
    }

    const data = await response.json();
    return {
      zipCodeMatches: data.zipCodeMatches || [],
      stateMatches: data.stateMatches || [],
      hasZipCodeMatches: data.hasZipCodeMatches || false,
      hasStateMatches: data.hasStateMatches || false,
    };
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};

/**
 * Validate ZIP code format
 */
export const isValidZipCode = (zipCode: string): boolean => {
  return /^\d{5}$/.test(zipCode);
};

/**
 * Popular categories configuration
 */
export const popularCategories = [
  { name: "Catering", family: "Ionicons" as const, icon: "restaurant", color: "#FF6B6B", bgColor: "#FFE5E5" },
  { name: "Beauty Services", family: "FontAwesome" as const, icon: "paint-brush", color: "#FF8C00", bgColor: "#FFF2E5" },
  { name: "Decorations", family: "Ionicons" as const, icon: "color-palette", color: "#1E90FF", bgColor: "#E5F2FF" },
  { name: "Tailoring", family: "MaterialCommunityIcons" as const, icon: "tshirt-crew", color: "#32CD32", bgColor: "#E8F5E8" },
  { name: "Cleaning", family: "MaterialCommunityIcons" as const, icon: "broom", color: "#BA55D3", bgColor: "#F5E8F5" },
  { name: "Plumbing", family: "MaterialCommunityIcons" as const, icon: "wrench", color: "#FF4500", bgColor: "#FFE8E0" },
];