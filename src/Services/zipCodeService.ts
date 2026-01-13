// ============================================================================
// ZIP Code Service
// ============================================================================
// Abstraction layer for ZIP code lookups. Makes it easy to:
// - Mock in tests
// - Switch to different APIs
// - Add caching
// - Add error handling

import { API_ENDPOINTS, ZIP_API_FIELDS } from '../Constants/api';

export interface ZipCoordinates {
  lat: number;
  lon: number;
  city: string;
  state: string;
}

// Cache to avoid repeated API calls (optional but recommended)
const zipCache = new Map<string, ZipCoordinates | null>();

/**
 * Get geographic coordinates and location data for a US ZIP code
 * @param zipCode - 5-digit US ZIP code
 * @returns Coordinates and location data, or null if invalid
 */
export async function getZipCoordinates(zipCode: string): Promise<ZipCoordinates | null> {
  // Check cache first
  if (zipCache.has(zipCode)) {
    return zipCache.get(zipCode) || null;
  }

  try {
    const response = await fetch(`${API_ENDPOINTS.ZIP_CODE_LOOKUP}/us/${zipCode}`);
    
    if (!response.ok) {
      zipCache.set(zipCode, null);
      return null;
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data[ZIP_API_FIELDS.PLACES] || data[ZIP_API_FIELDS.PLACES].length === 0) {
      zipCache.set(zipCode, null);
      return null;
    }

    const place = data[ZIP_API_FIELDS.PLACES][0];
    
    const coordinates: ZipCoordinates = {
      lat: parseFloat(place[ZIP_API_FIELDS.LATITUDE]),
      lon: parseFloat(place[ZIP_API_FIELDS.LONGITUDE]),
      city: place[ZIP_API_FIELDS.PLACE_NAME],
      state: place[ZIP_API_FIELDS.STATE_ABBR]
    };

    // Cache the result
    zipCache.set(zipCode, coordinates);
    
    return coordinates;
  } catch (error) {
    console.error(`Error fetching coordinates for ZIP ${zipCode}:`, error);
    zipCache.set(zipCode, null);
    return null;
  }
}

/**
 * Get only city and state for a ZIP code (for post creation)
 * @param zipCode - 5-digit US ZIP code
 * @returns City and state, or null if invalid
 */
export async function getZipLocation(zipCode: string): Promise<{ city: string; state: string } | null> {
  const coords = await getZipCoordinates(zipCode);
  return coords ? { city: coords.city, state: coords.state } : null;
}

/**
 * Clear the ZIP code cache (useful for tests)
 */
export function clearZipCache(): void {
  zipCache.clear();
}
