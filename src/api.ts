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
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Get token from AsyncStorage
    const token = await AsyncStorage.getItem('access_token');
    console.log('🔐 Token from AsyncStorage:', token ? 'exists' : 'missing');
    
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

      // ✅ PERMANENT FIX: Better auth error handling
      if (response.status === 401) {
        console.warn('🔐 Unauthorized - Token expired or invalid');
        
        // Clear the actual token key being used
        try {
          await AsyncStorage.removeItem('access_token');
          console.log('✅ Cleared expired token');
        } catch (clearError) {
          console.error('❌ Failed to clear token:', clearError);
        }
        
        // Create error with status code
        const error: any = new Error('Unauthorized');
        error.status = 401;
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
