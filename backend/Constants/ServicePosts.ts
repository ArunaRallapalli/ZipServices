// ============================================================================
// Service Post Constants
// ============================================================================
// Centralized constants for service posts to prevent typos and enable
// easy updates across the entire codebase.

export const POST_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed'
} as const;

export const POST_TYPES = {
  OFFER: 'offer',
  REQUEST: 'request'
} as const;

export const POSTER_TYPES = {
  CUSTOMER: 'customer',
  BUSINESS_OWNER: 'business_owner'
} as const;

export const DEFAULT_SEARCH = {
  RADIUS_MILES: 25,
  PAGINATION_LIMIT: 100,
  PAGINATION_OFFSET: 0,
  DISTANCE_PRECISION: 1
} as const;

export const LOGGING = {
  PROGRESS_INTERVAL: 10  // Log every N posts during batch processing
} as const;

// Type exports for TypeScript
export type PostStatus = typeof POST_STATUS[keyof typeof POST_STATUS];
export type PostType = typeof POST_TYPES[keyof typeof POST_TYPES];
export type PosterType = typeof POSTER_TYPES[keyof typeof POSTER_TYPES];