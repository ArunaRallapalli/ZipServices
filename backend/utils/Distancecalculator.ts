/**
 * distanceCalculator.ts
 * 
 * Utilities for calculating distances between ZIP codes and filtering
 * service posts by geographic proximity (radius-based search).
 * 
 * FEATURES:
 * - Haversine formula for accurate distance calculation
 * - ZIP code to coordinates conversion
 * - Distance calculation in miles
 * - Caching to improve performance
 * 
 * USAGE:
 * const coords = await getZipCoordinates('85083');
 * const distance = calculateDistance(lat1, lon1, lat2, lon2);
 */

/**
 * Interface for geographic coordinates
 */
export interface Coordinates {
  lat: number;
  lon: number;
}

/**
 * Interface for ZIP code data from API
 */
interface ZipCodeData {
  'post code': string;
  country: string;
  'country abbreviation': string;
  places: Array<{
    'place name': string;
    longitude: string;
    latitude: string;
    state: string;
    'state abbreviation': string;
  }>;
}

/**
 * Simple in-memory cache for ZIP code coordinates
 * Reduces API calls and improves performance
 */
const zipCoordinatesCache = new Map<string, Coordinates>();

/**
 * Calculate distance between two geographic points using Haversine formula
 * 
 * The Haversine formula determines the great-circle distance between two points
 * on a sphere given their longitudes and latitudes.
 * 
 * @param lat1 - Latitude of first point (degrees)
 * @param lon1 - Longitude of first point (degrees)
 * @param lat2 - Latitude of second point (degrees)
 * @param lon2 - Longitude of second point (degrees)
 * @returns Distance in miles
 * 
 * @example
 * const distance = calculateDistance(33.5186, -112.2624, 33.4484, -112.0740);
 * console.log(`Distance: ${distance} miles`); // ~13.8 miles (Peoria to Phoenix)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles (use 6371 for kilometers)
  
  // Convert degrees to radians
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 * 
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get geographic coordinates (latitude, longitude) for a US ZIP code
 * 
 * Uses the free zippopotam.us API to look up ZIP code data.
 * Results are cached to reduce API calls.
 * 
 * @param zipCode - 5-digit US ZIP code
 * @returns Coordinates object or null if ZIP code is invalid
 * 
 * @example
 * const coords = await getZipCoordinates('85083');
 * if (coords) {
 *   console.log(`Lat: ${coords.lat}, Lon: ${coords.lon}`);
 * }
 */
export async function getZipCoordinates(
  zipCode: string
): Promise<Coordinates | null> {
  // Validate ZIP code format
  if (!zipCode || !/^\d{5}$/.test(zipCode)) {
    console.error(`❌ Invalid ZIP code format: ${zipCode}`);
    return null;
  }

  // Check cache first
  if (zipCoordinatesCache.has(zipCode)) {
    console.log(`💾 Using cached coordinates for ${zipCode}`);
    return zipCoordinatesCache.get(zipCode)!;
  }

  try {
    console.log(`🌐 Fetching coordinates for ZIP ${zipCode}...`);
    
    const response = await fetch(`http://api.zippopotam.us/us/${zipCode}`);
    
    if (!response.ok) {
      console.error(`❌ ZIP code ${zipCode} not found`);
      return null;
    }

    const data = await response.json() as ZipCodeData;
if (!data['post code']) {
  throw new Error('Invalid zip code response');
}
    
    if (!data.places || data.places.length === 0) {
      console.error(`❌ No location data for ZIP ${zipCode}`);
      return null;
    }

    const place = data.places[0];
    const coords: Coordinates = {
      lat: parseFloat(place.latitude),
      lon: parseFloat(place.longitude),
    };

    // Cache the result
    zipCoordinatesCache.set(zipCode, coords);

    console.log(`✅ Coordinates for ${zipCode}: ${coords.lat}, ${coords.lon} (${place['place name']}, ${place['state abbreviation']})`);
    
    return coords;
    
  } catch (error) {
    console.error(`❌ Error fetching coordinates for ZIP ${zipCode}:`, error);
    return null;
  }
}

/**
 * Get distance between two ZIP codes
 * 
 * Convenience function that combines coordinate lookup and distance calculation.
 * 
 * @param zipCode1 - First ZIP code
 * @param zipCode2 - Second ZIP code
 * @returns Distance in miles, or null if either ZIP code is invalid
 * 
 * @example
 * const distance = await getDistanceBetweenZips('85083', '85024');
 * if (distance !== null) {
 *   console.log(`Distance: ${distance.toFixed(1)} miles`);
 * }
 */
export async function getDistanceBetweenZips(
  zipCode1: string,
  zipCode2: string
): Promise<number | null> {
  const coords1 = await getZipCoordinates(zipCode1);
  const coords2 = await getZipCoordinates(zipCode2);

  if (!coords1 || !coords2) {
    return null;
  }

  return calculateDistance(coords1.lat, coords1.lon, coords2.lat, coords2.lon);
}

/**
 * Check if a ZIP code is within a certain radius of a center point
 * 
 * @param centerZip - Center ZIP code
 * @param targetZip - ZIP code to check
 * @param radiusMiles - Radius in miles
 * @returns True if targetZip is within radius of centerZip
 * 
 * @example
 * const isNearby = await isWithinRadius('85083', '85024', 25);
 * console.log(isNearby); // true (Phoenix is ~15 miles from Peoria)
 */
export async function isWithinRadius(
  centerZip: string,
  targetZip: string,
  radiusMiles: number
): Promise<boolean> {
  const distance = await getDistanceBetweenZips(centerZip, targetZip);
  
  if (distance === null) {
    return false;
  }

  return distance <= radiusMiles;
}

/**
 * Clear the ZIP coordinates cache
 * Useful for testing or if you need to free memory
 */
export function clearZipCache(): void {
  zipCoordinatesCache.clear();
  console.log('🗑️ ZIP coordinates cache cleared');
}

/**
 * Get cache statistics
 * Useful for monitoring and debugging
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: zipCoordinatesCache.size,
    entries: Array.from(zipCoordinatesCache.keys()),
  };
}