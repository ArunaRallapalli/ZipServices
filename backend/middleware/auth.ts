/**
 * ============================================================================
 * AUTHENTICATION MIDDLEWARE
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Extended Request interface to include authenticated user information
 */
export interface AuthRequest extends Request {
  user?: {
    user_id: string | number;
    business_id?: number;
    email?: string;
    userType?: string;
  };
}

/**
 * MIDDLEWARE: authenticateToken
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    console.log('🔐 ❌ No Bearer token in Authorization header');
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'No authentication token provided'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as { user_id: string; business_id?: number; email?: string; userType?: string };

    console.log('🔐 ✅ Token verified successfully:', {
      user_id: decoded.user_id,
      business_id: decoded.business_id
    });

    req.user = decoded;
    
    next();
  } catch (err) {
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
 * MIDDLEWARE: authorizeUser
 */
export const authorizeUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const requestedUserId = req.params.userId || req.params.user_id;
  const authenticatedUserId = req.user?.user_id;

  console.log('🔒 ===== AUTHORIZATION CHECK =====');
  console.log('  Route:', req.method, req.path);
  console.log('  Requested user ID:', requestedUserId, `(type: ${typeof requestedUserId})`);
  console.log('  Authenticated user ID:', authenticatedUserId, `(type: ${typeof authenticatedUserId})`);
  console.log('  String comparison:', String(requestedUserId), '===', String(authenticatedUserId));
  console.log('  Match?', String(requestedUserId) === String(authenticatedUserId));
  console.log('🔒 ================================');

  if (!authenticatedUserId) {
    console.log('🔒 ❌ No authenticated user ID found');
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return;
  }

  if (requestedUserId && String(requestedUserId) !== String(authenticatedUserId)) {
    console.log('🔒 ❌ Authorization FAILED - User IDs do not match');
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'You can only access your own data'
    });
    return;
  }

  console.log('🔒 ✅ Authorization PASSED');
  next();
};