/**
 * ============================================================================
 * AUTHENTICATION MIDDLEWARE
 * ============================================================================
 * 
 * Last Updated: January 9, 2026
 * Changes: Added debug logging and fixed string/number comparison issues
 * 
 * This module provides JWT-based authentication and authorization middleware
 * for protecting API routes.
 * 
 * Key Features:
 * - JWT token verification
 * - User identity extraction from tokens
 * - Authorization checks for user-specific resources
 * - Debug logging for troubleshooting
 * 
 * Usage:
 * 1. authenticateToken - Verifies JWT token exists and is valid
 * 2. authorizeUser - Ensures authenticated user can only access their own data
 * 
 * Example:
 *   router.get('/:userId/profile', authenticateToken, authorizeUser, handler)
 * 
 * Security Notes:
 * - Tokens must be sent in Authorization header as "Bearer <token>"
 * - JWT_SECRET must be set in environment variables
 * - Tokens expire after 1 hour (configured in token generation)
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Extended Request interface to include authenticated user information
 * This allows us to access req.user in protected route handlers
 */
export interface AuthRequest extends Request {
  user?: {
    user_id: string;          // The authenticated user's ID from JWT
    business_id?: number;     // Optional: business owner's business ID
  };
}

/**
 * ============================================================================
 * MIDDLEWARE: authenticateToken
 * ============================================================================
 * 
 * Purpose: Verify that a valid JWT token is present in the request
 * 
 * How it works:
 * 1. Checks for Authorization header in format: "Bearer <token>"
 * 2. Extracts and verifies the JWT token
 * 3. If valid, attaches user info to req.user and calls next()
 * 4. If invalid or missing, returns 401 Unauthorized
 * 
 * Use this middleware on ANY route that requires authentication.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function to continue to route handler
 * 
 * @returns 401 if no token or invalid token, otherwise continues to next middleware
 * ============================================================================
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // Extract Authorization header from request
  const authHeader = req.headers.authorization;

  // Check if Authorization header exists and follows "Bearer <token>" format
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('🔐 ❌ No Bearer token in Authorization header');
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'No authentication token provided'
    });
    return;
  }

  // Extract the actual token (everything after "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // Verify the JWT token using the secret key
    // This will throw an error if token is invalid or expired
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'  // Use environment variable or fallback
    ) as { user_id: string; business_id?: number };

    console.log('🔐 ✅ Token verified successfully:', {
      user_id: decoded.user_id,
      business_id: decoded.business_id
    });

    // Attach the decoded user information to the request object
    // This makes it available to all subsequent middleware and route handlers
    req.user = decoded;
    
    // Token is valid - proceed to the next middleware or route handler
    next();
  } catch (err) {
    // Token verification failed (expired, tampered, or invalid)
    console.log('🔐 ❌ Token verification failed:', err);
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
    return;
  }
};

/**
 * ============================================================================
 * MIDDLEWARE: authorizeUser
 * ============================================================================
 * 
 * Purpose: Ensure authenticated user can only access their own resources
 * 
 * How it works:
 * 1. Assumes authenticateToken has already run (req.user exists)
 * 2. Compares authenticated user's ID with the requested resource's userId
 * 3. If they match, allows access
 * 4. If they don't match, returns 403 Forbidden
 * 
 * IMPORTANT: This middleware must come AFTER authenticateToken
 * 
 * Example: User 123 can access /users/123/profile but NOT /users/456/profile
 * 
 * @param req - Express request object (must have req.user from authenticateToken)
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @returns 403 if user tries to access another user's data, otherwise continues
 * ============================================================================
 */
export const authorizeUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // Extract the userId from URL parameters (e.g., /users/:userId/profile)
  // Supports both :userId and :user_id parameter names
  const requestedUserId = req.params.userId || req.params.user_id;
  
  // Get the authenticated user's ID from the JWT token (set by authenticateToken)
  const authenticatedUserId = req.user?.user_id;

  // 🔍 DEBUG LOGGING - Shows what's being compared
  console.log('🔒 ===== AUTHORIZATION CHECK =====');
  console.log('  Route:', req.method, req.path);
  console.log('  Requested user ID:', requestedUserId, `(type: ${typeof requestedUserId})`);
  console.log('  Authenticated user ID:', authenticatedUserId, `(type: ${typeof authenticatedUserId})`);
  console.log('  String comparison:', String(requestedUserId), '===', String(authenticatedUserId));
  console.log('  Match?', String(requestedUserId) === String(authenticatedUserId));
  console.log('🔒 ================================');

  // Safety check: ensure user is authenticated
  // This should never happen if authenticateToken ran first, but we check anyway
  if (!authenticatedUserId) {
    console.log('🔒 ❌ No authenticated user ID found');
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return;
  }

  // Security check: ensure user is accessing their own data
  // FIXED: Convert both to strings for proper comparison
  // This handles cases where one is a string and the other is a number
  if (requestedUserId && String(requestedUserId) !== String(authenticatedUserId)) {
    console.log('🔒 ❌ Authorization FAILED - User IDs do not match');
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'You can only access your own data'
    });
    return;
  }

  // Authorization successful - user is accessing their own data
  console.log('🔒 ✅ Authorization PASSED');
  next();
};