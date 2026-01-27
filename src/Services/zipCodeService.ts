// src/services/zipCodeService.ts
import { API_URL } from '../config/api';

export interface ZipValidationResult {
  valid: boolean;
  city?: string;
  state?: string;
  stateAbbr?: string;
  latitude?: number;
  longitude?: number;
  error?: string;
}

/**
 * Validates a ZIP code using the backend API
 * This avoids CORS issues by having the backend make the external API call
 */
export const validateZipCode = async (zipCode: string): Promise<ZipValidationResult> => {
  // Basic format check
  if (!zipCode || !/^\d{5}$/.test(zipCode)) {
    return {
      valid: false,
      error: 'Please enter a 5-digit ZIP code'
    };
  }

  try {
    // Call YOUR backend, not zippopotam.us directly
    const response = await fetch(
      `${API_URL}/api/zip-code/validate/${zipCode}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data: ZipValidationResult = await response.json();
      return data;
    }

    if (response.status === 404) {
      return {
        valid: false,
        error: 'ZIP code not found'
      };
    }

    // Other errors - fail open (accept the ZIP)
    console.warn('ZIP validation failed, accepting ZIP anyway');
    return {
      valid: true,
      city: 'Unknown',
      state: 'Unknown',
      stateAbbr: 'XX',
      error: 'Could not verify, but accepting as valid'
    };

  } catch (error) {
    console.error('ZIP validation error:', error);
    
    // Fail open - don't block user due to validation service issue
    return {
      valid: true,
      city: 'Unknown',
      state: 'Unknown',
      stateAbbr: 'XX',
      error: 'Could not verify, but accepting as valid'
    };
  }
};