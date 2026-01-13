// ============================================================================
// Supabase Error Codes
// ============================================================================
// PostgreSQL error codes from Supabase PostgREST

export const SUPABASE_ERROR = {
  NOT_FOUND: 'PGRST116',  // Resource not found (404)
  // Add more as needed:
  // INVALID_REQUEST: 'PGRST102',
  // PERMISSION_DENIED: 'PGRST301',
} as const;

export type SupabaseErrorCode = typeof SUPABASE_ERROR[keyof typeof SUPABASE_ERROR];