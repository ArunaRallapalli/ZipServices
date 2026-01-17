// ============================================================================
// External API Configuration
// ============================================================================
// Centralized API endpoints that can be overridden via environment variables

export const API_ENDPOINTS = {
  ZIP_CODE_LOOKUP: process.env.ZIP_API_URL || 'https://api.zippopotam.us'
} as const;

// Response field mappings for ZIP code API
export const ZIP_API_FIELDS = {
  PLACES: 'places',
  PLACE_NAME: 'place name',
  STATE_ABBR: 'state abbreviation',
  LATITUDE: 'latitude',
  LONGITUDE: 'longitude'
} as const;