// backend/routes/zipCode.ts
import { Router, Request, Response } from 'express';

const router = Router();

// Type definition for zippopotam.us API response
interface ZippopotamResponse {
  'country': string;
  'country abbreviation': string;
  'post code': string;
  places: Array<{
    'place name': string;
    'longitude': string;
    'state': string;
    'state abbreviation': string;
    'latitude': string;
  }>;
}

// Cache ZIP results to avoid repeated API calls
const zipCache = new Map<string, any>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface ZipValidationResult {
  valid: boolean;
  city?: string;
  state?: string;
  stateAbbr?: string;
  latitude?: number;
  longitude?: number;
  error?: string;
}

/**
 * GET /api/zip-code/validate/:zipCode
 * Validates a US ZIP code and returns location data
 */
router.get('/validate/:zipCode', async (req: Request, res: Response) => {
  const { zipCode } = req.params;

  // Basic format validation
  if (!/^\d{5}$/.test(zipCode)) {
    return res.status(400).json({
      valid: false,
      error: 'Invalid ZIP code format. Must be 5 digits.'
    });
  }

  try {
    // Check cache first
    const cached = zipCache.get(zipCode);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ ZIP ${zipCode} found in cache`);
      return res.json(cached.data);
    }

    // Call zippopotam.us API
    console.log(`🔍 Validating ZIP code: ${zipCode}`);
    const apiResponse = await fetch(
      `https://api.zippopotam.us/us/${zipCode}`
    );

    if (!apiResponse.ok) {
      if (apiResponse.status === 404) {
        return res.status(404).json({
          valid: false,
          error: 'ZIP code not found'
        });
      }
      throw new Error(`API returned ${apiResponse.status}`);
    }

    const data = await apiResponse.json() as ZippopotamResponse;

    // Extract location data
    if (data && data.places && data.places.length > 0) {
      const place = data.places[0];
      const result: ZipValidationResult = {
        valid: true,
        city: place['place name'],
        state: place['state'],
        stateAbbr: place['state abbreviation'],
        latitude: parseFloat(place.latitude),
        longitude: parseFloat(place.longitude)
      };

      // Cache the result
      zipCache.set(zipCode, {
        data: result,
        timestamp: Date.now()
      });

      console.log(`✅ ZIP ${zipCode} validated: ${result.city}, ${result.stateAbbr}`);
      return res.json(result);
    }

    return res.status(404).json({
      valid: false,
      error: 'ZIP code not found'
    });

  } catch (error: any) {
    console.error(`❌ Error validating ZIP ${zipCode}:`, error.message);
    
    // Fail open - accept the ZIP if validation service is down
    return res.json({
      valid: true,
      city: 'Unknown',
      state: 'Unknown',
      stateAbbr: 'XX',
      error: 'Could not verify ZIP code, but accepting as valid'
    });
  }
});

export default router;