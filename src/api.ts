/**
 * ============================================================================
 * API Client - Centralized API Request Handler
 * ============================================================================
 * 
 * Last Updated: January 15, 2026
 * Changes: 
 * - Added session expiration flag for graceful logout
 * - Automatic JWT token inclusion in all requests
 * - Automatic token cleanup on 401 errors (expired tokens)
 * - Improved error handling for expired sessions
 * 
 * FEATURES:
 * - Automatic token injection from AsyncStorage
 * - Auto-logout on expired tokens (401 errors)
 * - Centralized error handling
 * - Support for GET, POST, PUT, DELETE, PATCH requests
 * - Proper TypeScript types
 * - Response parsing and validation
 * - Console logging for debugging
 * ============================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from './config/apiConfig';

/**
 * Generic API response type
 */
export type ApiResponse<T = any> = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
  [key: string]: any;
};

/**
 * Base fetch wrapper with automatic token injection
 * 
 * @param endpoint - API endpoint (e.g., '/api/users/175/profile')
 * @param options - Standard fetch options (method, headers, body, etc.)
 * @returns Parsed JSON response
 */
/** Decode JWT payload without verifying signature (client-side only) */
function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.exp ?? null; // seconds since epoch
  } catch {
    return null;
  }
}

/** Silently refresh the token if it expires within 24 hours */
async function maybeRefreshToken(token: string): Promise<string> {
  const exp = decodeJwtExpiry(token);
  if (!exp) return token;
  const secondsLeft = exp - Math.floor(Date.now() / 1000);
  if (secondsLeft > 24 * 60 * 60) return token; // more than 1 day left — no refresh needed

  try {
    console.log('🔄 Token expiring soon, refreshing silently...');
    const response = await fetch(`${API_URL}/business_owners/refresh-token`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) return token; // refresh failed — use existing token, let it expire naturally
    const data = await response.json();
    const newToken: string = data.token;
    if (!newToken) return token;

    // Persist the new token
    await AsyncStorage.setItem('access_token', newToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', newToken);
    }
    console.log('✅ Token refreshed silently');
    return newToken;
  } catch {
    return token; // network error — use existing token
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const asyncToken = await AsyncStorage.getItem('access_token');
    const webToken = typeof window !== 'undefined'
      ? (localStorage.getItem('access_token') ?? localStorage.getItem('token'))
      : null;
    const rawToken = asyncToken ?? webToken;

    // Silently refresh if expiring within 24 hours
    const token = rawToken ? await maybeRefreshToken(rawToken) : rawToken;
    console.log('🔐 Token from storage:', token ? 'exists' : 'missing');
    
    // Build headers with Content-Type
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge with any custom headers from options
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Build full URL
    const url = `${API_URL}${endpoint}`;

    // Log request (helpful for debugging)
    console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`, {
      hasToken: !!token,
      hasBody: !!options.body
    });

    // Make request
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parse response text first
    const text = await response.text();
    let data: any;

    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.warn('⚠️ Failed to parse JSON response:', text.substring(0, 100));
      data = { message: text };
    }

    // Handle non-OK responses (4xx, 5xx)
    if (!response.ok) {
      const errorMessage = data.error || data.message || `Request failed with status ${response.status}`;
      
      console.error(`❌ API Error [${response.status}]:`, {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        hasToken: !!token
      });

      // 401 = token expired/invalid — clear it and treat as session expiry
    if (response.status === 401) {
  console.warn(`🔐 Auth error [401] - Token expired or invalid`);
  try {
    await AsyncStorage.removeItem('access_token');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
    }
    console.log('✅ Cleared expired token');
  } catch (clearError) {
    console.error('❌ Failed to clear token:', clearError);
  }
  const error: any = new Error('Your session has expired. Please sign in again.');
  error.status = 401;
  throw error;
}
      // 403 = forbidden (valid token, but no permission) — do NOT clear token
      if (response.status === 403) {
        console.warn(`🔐 Auth error [403] - Forbidden (insufficient permissions)`);
        const error: any = new Error(errorMessage || 'You do not have permission to perform this action.');
        error.status = 403;
        throw error;
      }
      
      // For other errors, throw with details
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).response = data;
      throw error;
    }

    // ✅ SUCCESS CASE: Return data
    console.log(`✅ API Success: ${options.method || 'GET'} ${endpoint}`, {
      status: response.status,
      hasData: !!data
    });

    return data as T;

  } catch (error: any) {
    // Network or other errors
    console.error(`❌ API Request Failed:`, {
      endpoint,
      error: error.message,
      type: error.name
    });
    throw error;
  }
}
/**
 * API Client Object with convenience methods
 */
const api = {
  /**
   * GET request
   * 
   * @param endpoint - API endpoint path
   * @param options - Optional fetch options
   * @returns Parsed response data
   * 
   * @example
   * const profile = await api.get('/api/users/175/profile');
   * const bookings = await api.get('/api/availability/bookings/175');
   */
  get: <T = any>(endpoint: string, options: RequestInit = {}) => {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  /**
   * POST request
   * 
   * @param endpoint - API endpoint path
   * @param data - Request body data (will be JSON stringified)
   * @param options - Optional fetch options
   * @returns Parsed response data
   * 
   * @example
   * const result = await api.post('/api/reviews', {
   *   bookingId: 1,
   *   providerId: 175,
   *   customerId: 176,
   *   rating: 5,
   *   reviewText: 'Great service!'
   * });
   */
  post: <T = any>(endpoint: string, data?: any, options: RequestInit = {}) => {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PUT request
   * 
   * @param endpoint - API endpoint path
   * @param data - Request body data (will be JSON stringified)
   * @param options - Optional fetch options
   * @returns Parsed response data
   * 
   * @example
   * const updated = await api.put('/api/users/175', {
   *   email: 'newemail@example.com'
   * });
   */
  put: <T = any>(endpoint: string, data?: any, options: RequestInit = {}) => {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PATCH request
   * 
   * @param endpoint - API endpoint path
   * @param data - Request body data (will be JSON stringified)
   * @param options - Optional fetch options
   * @returns Parsed response data
   * 
   * @example
   * const result = await api.patch('/api/availability/bookings/123', {
   *   status: 'completed'
   * });
   */
  patch: <T = any>(endpoint: string, data?: any, options: RequestInit = {}) => {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * DELETE request
   * 
   * @param endpoint - API endpoint path
   * @param options - Optional fetch options
   * @returns Parsed response data
   * 
   * @example
   * await api.delete('/api/service-posts/123');
   */
  delete: <T = any>(endpoint: string, options: RequestInit = {}) => {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

/**
 * Quick backend health check
 * Tests connectivity to the backend server
 * 
 * @throws Error if backend is unreachable
 */
export async function pingBackend(): Promise<void> {
  try {
    const data = await api.get('/ping');
    console.log('✅ Backend reachable:', data);
  } catch (error) {
    console.error('❌ Backend unreachable:', error);
    throw new Error('Cannot connect to backend server');
  }
}

/**
 * Check backend health with full diagnostics
 * 
 * @returns Health status object
 */
export async function checkBackendHealth(): Promise<any> {
  try {
    const data = await api.get('/api/health');
    console.log('✅ Backend health check passed:', data);
    return data;
  } catch (error) {
    console.error('❌ Backend health check failed:', error);
    throw error;
  }
}

/**
 * Type definitions for common payloads
 */
export type SignUpPayload = {
  name: string;
  email: string;
  password: string;
  user_type?: 'customer' | 'business_owner';
  phone_number?: string;
  zip_code?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type ReviewPayload = {
  bookingId: number;
  providerId: number;
  customerId: number;
  rating: number;
  reviewText?: string;
};

export type BookingPayload = {
  provider_user_id: number;
  customer_user_id: number;
  booking_date: string;
  time_slot: string;
  service_description?: string;
  estimated_price?: number;
};

/**
 * Export the API client as default
 */

export default {
  ...api,
  baseURL: API_URL,  // ← ADD THIS LINE
};
