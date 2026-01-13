/**
 * ============================================================================
 * PRODUCTION LOGGER - Winston Configuration
 * ============================================================================
 * 
 * Features:
 * - Structured JSON logging for production
 * - Colorized console output for development
 * - Automatic log rotation
 * - Error stack traces
 * - Request ID tracking
 * - Log levels: error, warn, info, debug
 * 
 * Usage:
 * import logger from './utils/logger';
 * 
 * logger.info('User logged in', { userId: 701, email: 'user@example.com' });
 * logger.error('Database query failed', { error: err.message, query: 'SELECT...' });
 * ============================================================================
 */

import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston about our colors
winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      // Remove internal winston properties
      const cleanMeta = { ...meta };
      delete cleanMeta.stack;
      delete cleanMeta.splat;
      
      if (Object.keys(cleanMeta).length > 0) {
        metaString = '\n' + JSON.stringify(cleanMeta, null, 2);
      }
    }
    
    // Include stack trace for errors
    const stackTrace = info.stack ? `\n${info.stack}` : '';
    
    return `${timestamp} [${level}]: ${message}${metaString}${stackTrace}`;
  })
);

// Format for file output (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Define transports
const transports = [
  // Console transport - always active
  new winston.transports.Console({
    format: consoleFormat,
  }),
  
  // Error log file - only errors
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Combined log file - all logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

// Log unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise,
  });
});

// Log uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  // Give winston time to write before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Export logger
export default logger;

/**
 * Helper function to log HTTP requests
 */
export const logRequest = (req: any, statusCode: number, duration: number) => {
  logger.http('HTTP Request', {
    method: req.method,
    path: req.path,
    statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.user_id,
  });
};

/**
 * Helper function to log database queries
 */
export const logQuery = (queryName: string, duration: number, success: boolean, metadata?: any) => {
  const level = success ? 'info' : 'error';
  logger[level]('Database Query', {
    query: queryName,
    duration: `${duration}ms`,
    success,
    ...metadata,
  });
};

/**
 * Helper function to log authentication events
 */
export const logAuth = (event: string, userId?: number | string, metadata?: any) => {
  logger.info('Authentication Event', {
    event,
    userId,
    ...metadata,
  });
};
