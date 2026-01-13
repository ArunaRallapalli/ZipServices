/**
 * ============================================================================
 * REQUEST TRACKING MIDDLEWARE
 * ============================================================================
 * 
 * Features:
 * - Unique request ID for each API call
 * - Request duration tracking
 * - Automatic logging of all requests
 * - Request/Response body logging (configurable)
 * - Error context tracking
 * 
 * Usage in server.ts:
 * import { requestTracking, errorLogger } from './middleware/requestTracking';
 * 
 * app.use(requestTracking);
 * // ... your routes ...
 * app.use(errorLogger); // Must be last
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger, { logRequest } from '../utils/logger';

// Extend Express Request to include custom properties
declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

/**
 * Main request tracking middleware
 * Adds request ID and tracks timing
 */
export const requestTracking = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  req.id = uuidv4();
  req.startTime = Date.now();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);
  
  // Log incoming request
  logger.debug('Incoming Request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  // Log request body for POST/PUT/PATCH (exclude sensitive fields)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const sanitizedBody = sanitizeBody(req.body);
    logger.debug('Request Body', {
      requestId: req.id,
      body: sanitizedBody,
    });
  }
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - req.startTime;
    
    // Log response
    logRequest(req, res.statusCode, duration);
    
    // Log response body for errors
    if (res.statusCode >= 400) {
      logger.warn('Error Response', {
        requestId: req.id,
        statusCode: res.statusCode,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        response: typeof data === 'string' ? data : JSON.stringify(data),
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Error logging middleware
 * Must be added AFTER all routes
 */
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  const duration = Date.now() - (req.startTime || Date.now());
  
  // Log the error with full context
  logger.error('Request Error', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    query: req.query,
    body: sanitizeBody(req.body),
    statusCode: err.statusCode || 500,
    duration: `${duration}ms`,
    userId: (req as any).user?.user_id,
  });
  
  // Send error response
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    requestId: req.id,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Sanitize request/response body
 * Remove sensitive fields from logs
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'secret',
    'authorization',
    'creditCard',
    'ssn',
  ];
  
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Performance monitoring middleware
 * Warns if requests take too long
 */
export const performanceMonitor = (thresholdMs: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      if (duration > thresholdMs) {
        logger.warn('Slow Request Detected', {
          requestId: req.id,
          method: req.method,
          path: req.path,
          duration: `${duration}ms`,
          threshold: `${thresholdMs}ms`,
          statusCode: res.statusCode,
        });
      }
    });
    
    next();
  };
};

/**
 * Database query wrapper with automatic logging
 * Use this to wrap all Supabase queries
 */
export async function trackedQuery<T>(
  queryName: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  requestId?: string
): Promise<{ data: T | null; error: any }> {
  const start = Date.now();
  
  logger.debug('Database Query Started', {
    requestId,
    query: queryName,
  });
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    if (result.error) {
      logger.error('Database Query Failed', {
        requestId,
        query: queryName,
        duration: `${duration}ms`,
        error: result.error.message || result.error,
        code: result.error.code,
      });
    } else {
      logger.debug('Database Query Success', {
        requestId,
        query: queryName,
        duration: `${duration}ms`,
        rowCount: Array.isArray(result.data) ? result.data.length : 1,
      });
    }
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    
    logger.error('Database Query Exception', {
      requestId,
      query: queryName,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
    });
    
    throw error;
  }
}
