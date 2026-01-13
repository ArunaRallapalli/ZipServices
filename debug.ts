/**
 * ============================================================================
 * DEBUGGING UTILITIES
 * ============================================================================
 * 
 * Helper functions for common debugging scenarios
 * 
 * Usage:
 * import { debugAuth, debugType, debugDatabase } from './utils/debug';
 * ============================================================================
 */

import logger from './logger';

/**
 * Debug authentication issues
 * Logs detailed auth information for troubleshooting
 */
export function debugAuth(context: string, req: any, providedUserId?: any) {
  const authInfo = {
    context,
    providedUserId: {
      value: providedUserId,
      type: typeof providedUserId,
    },
    tokenUserId: {
      value: req.user?.user_id,
      type: typeof req.user?.user_id,
    },
    stringComparison: {
      provided: String(providedUserId),
      token: String(req.user?.user_id),
      match: String(providedUserId) === String(req.user?.user_id),
    },
    strictComparison: {
      match: providedUserId === req.user?.user_id,
    },
    authHeader: req.headers.authorization ? 'present' : 'missing',
    hasUser: !!req.user,
  };
  
  logger.debug('Auth Debug', authInfo);
  
  return authInfo;
}

/**
 * Debug type mismatches
 * Helps identify type-related bugs
 */
export function debugType(label: string, ...values: any[]) {
  const typeInfo = values.map((value, index) => ({
    value: value,
    type: typeof value,
    constructor: value?.constructor?.name,
    isNull: value === null,
    isUndefined: value === undefined,
    stringValue: String(value),
  }));
  
  logger.debug(`Type Debug: ${label}`, { types: typeInfo });
  
  return typeInfo;
}

/**
 * Debug database queries
 * Logs query details and results
 */
export function debugDatabase(
  operation: string,
  table: string,
  filters: any,
  result: any
) {
  const dbInfo = {
    operation,
    table,
    filters,
    success: !result.error,
    error: result.error?.message,
    errorCode: result.error?.code,
    rowCount: Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0),
    dataPreview: Array.isArray(result.data) 
      ? result.data.slice(0, 2) 
      : result.data,
  };
  
  logger.debug('Database Debug', dbInfo);
  
  return dbInfo;
}

/**
 * Debug API request/response
 * Logs full request and response details
 */
export function debugAPI(
  direction: 'request' | 'response',
  details: {
    method?: string;
    url?: string;
    headers?: any;
    body?: any;
    statusCode?: number;
    error?: any;
  }
) {
  logger.debug(`API ${direction}`, {
    direction,
    ...details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Create a debug checkpoint
 * Useful for tracking code execution flow
 */
let checkpointCounter = 0;

export function debugCheckpoint(label: string, data?: any) {
  checkpointCounter++;
  
  logger.debug(`Checkpoint #${checkpointCounter}: ${label}`, {
    checkpoint: checkpointCounter,
    label,
    data,
    timestamp: new Date().toISOString(),
    stack: new Error().stack?.split('\n').slice(2, 5).join('\n'),
  });
  
  return checkpointCounter;
}

/**
 * Debug async operation timing
 * Measures execution time of async functions
 */
export async function debugTiming<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  logger.debug(`Timing Start: ${label}`);
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    logger.debug(`Timing Complete: ${label}`, {
      duration: `${duration}ms`,
      success: true,
    });
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    
    logger.error(`Timing Failed: ${label}`, {
      duration: `${duration}ms`,
      error: error.message,
    });
    
    throw error;
  }
}

/**
 * Compare two objects and log differences
 * Useful for debugging state changes
 */
export function debugCompare(label: string, obj1: any, obj2: any) {
  const differences: any = {};
  
  const allKeys = new Set([
    ...Object.keys(obj1 || {}),
    ...Object.keys(obj2 || {}),
  ]);
  
  for (const key of allKeys) {
    if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      differences[key] = {
        before: obj1[key],
        after: obj2[key],
      };
    }
  }
  
  logger.debug(`Compare: ${label}`, {
    hasDifferences: Object.keys(differences).length > 0,
    differences,
  });
  
  return differences;
}

/**
 * Debug middleware wrapper
 * Wraps any middleware with debug logging
 */
export function debugMiddleware(name: string, middleware: any) {
  return async (req: any, res: any, next: any) => {
    logger.debug(`Middleware Enter: ${name}`, {
      path: req.path,
      method: req.method,
    });
    
    try {
      await middleware(req, res, next);
      
      logger.debug(`Middleware Exit: ${name}`, {
        statusCode: res.statusCode,
      });
    } catch (error: any) {
      logger.error(`Middleware Error: ${name}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  };
}

/**
 * Assert with logging
 * Throws error and logs if condition is false
 */
export function debugAssert(
  condition: boolean,
  message: string,
  context?: any
) {
  if (!condition) {
    logger.error('Assertion Failed', {
      message,
      context,
      stack: new Error().stack,
    });
    throw new Error(`Assertion Failed: ${message}`);
  }
}

/**
 * Format error for logging
 * Extracts useful information from error objects
 */
export function formatError(error: any): any {
  return {
    message: error.message,
    name: error.name,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    ...error,
  };
}

/**
 * Debug environment variables
 * Logs (safely) which env vars are set
 */
export function debugEnv() {
  const envInfo: any = {};
  
  const safeKeys = [
    'NODE_ENV',
    'PORT',
    'SUPABASE_URL',
    'FRONTEND_URL',
  ];
  
  for (const key of safeKeys) {
    envInfo[key] = process.env[key] ? 'SET' : 'NOT SET';
  }
  
  // For sensitive keys, just log if they exist
  const sensitiveKeys = [
    'JWT_SECRET',
    'SUPABASE_KEY',
    'RESEND_API_KEY',
  ];
  
  for (const key of sensitiveKeys) {
    envInfo[key] = process.env[key] 
      ? `SET (${process.env[key]?.length} chars)` 
      : 'NOT SET';
  }
  
  logger.debug('Environment Variables', envInfo);
  
  return envInfo;
}
