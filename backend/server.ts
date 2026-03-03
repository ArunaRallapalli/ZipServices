// backend/server.ts
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import {pool} from './config/database';
import { supabase } from "./config/Supabase";
import zipCodeRoutes from './routes/zipCode';


// ✅ ADDED: Debugging and logging infrastructure
import logger from './utils/logger';
import { requestTracking, errorLogger, performanceMonitor } from './middleware/requestTracking';
import { debugEnv } from './utils/debug';


// Routers
import reviewsRoutes from './routes/reviews';
import availabilityRoutes from './routes/availability';
import usersRouter from "./routes/users";
import businessOwnerAuthRouter from "./routes/business_owner_auth";
import businessOwnersRouter from "./routes/Business_Owners_registration";
import messagesRouter from "./routes/messages";
//import businessOwnerSearchRouter from "./routes/Old_business_owners_search";
import businessOwnerProfileRouter from "./business-owners";
import serviceCategoriesRouter from "./routes/serviceCategories";
import servicePostsRouter from './routes/ServicePosts';
import passwordResetRoutes from './routes/Passwordreset';
import emailVerificationRoutes from './routes/EmailVerification';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// ✅ ADDED: Startup logging and environment check
logger.info('Starting GoZipMarket server...');
debugEnv();

// Make pool accessible in all routes
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).pool = pool;
  next();
});

// ✅ MUST ADD THESE - Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ ADD THIS - Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:19006',
  'https://gozipmarket.com',
  'https://www.gozipmarket.com',
  'https://arunarallapalli.github.io'
];

// ✅ CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true
}));


// ✅ ADDED: Request tracking and performance monitoring
app.use(requestTracking);
app.use(performanceMonitor(1000)); // Warn if requests take > 1 second

// Health check
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    console.log('Health check starting...');
    
    const result = await pool.query('SELECT 1 as health');
    
    res.json({ 
      status: "ok",
      message: "API is running",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
      error: error.message
    });
  }
})
// ✅ NEW ROUTES WITH /api PREFIX
app.use("/api/service-categories", serviceCategoriesRouter);
app.use("/api/users", usersRouter);
app.use('/', servicePostsRouter);

// ✅ EXISTING ROUTES (keep these for backward compatibility)
app.use("/users", usersRouter);
// ZIP code validation endpoint
app.use('/api/zip-code', zipCodeRoutes);
app.use("/business_owners", businessOwnerAuthRouter);
app.use("/business_owners/crud", businessOwnersRouter);
//app.use("/business_owners/search", businessOwnerSearchRouter);
app.use("/business-owners", businessOwnerProfileRouter);
app.use('/service-posts', servicePostsRouter);
app.use("/messages", messagesRouter);
app.use("/api/password-reset", passwordResetRoutes);
console.log("✅ Password reset routes registered at /api/password-reset");
app.use('/api/email-verification', emailVerificationRoutes);

// Availability routes
app.use('/api/availability', availabilityRoutes);
console.log('✅ Availability routes registered at /api/availability');

//Review routes
app.use('/api/reviews', reviewsRoutes);
console.log('✅ Review routes registered at /api/reviews');

// ✅ ADDED: Error logger (must be AFTER all routes)

app.use(errorLogger);
// Debug routes logging
console.log("=== REGISTERED ROUTES ===");
console.log("✅ NEW API ROUTES:");
console.log("   GET  /api/health");
console.log("   GET  /api/service-categories");
console.log("   GET  /api/users");
console.log("   GET  /api/users/:userId/profile");
console.log("   GET  /api/users/:userId/roles");
console.log("   POST /api/service-posts");
console.log('✅ Email verification routes registered at /api/email-verification');
console.log("")
console.log("");

app._router.stack.forEach((middleware: any, index: number) => {
  if (middleware.route) {
    const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
    console.log(`${index}: Direct route - ${methods} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    const routerPath = middleware.regexp.source
      .replace('\\/', '/')
      .replace(/\$.*/, '')
      .replace('^', '');
    console.log(`${index}: Router mounted at: ${routerPath}`);
    
    if (middleware.handle && middleware.handle.stack) {
      middleware.handle.stack.forEach((handler: any, handlerIndex: number) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
          console.log(`  ${handlerIndex}: ${methods} ${routerPath}${handler.route.path}`);
        }
      });
    }
  }
});
console.log("========================");

// Test endpoint
app.get("/debug/test-business-route", (req: Request, res: Response) => {
  res.json({ 
    message: 'Debug endpoint working',
    timestamp: new Date().toISOString(),
    testUrls: [
      'GET /business_owners/customers/:businessId',
      'GET /business_owners/customers/by-user/:userId',
      'GET /business_owners/customers/test'
    ]
  });
});

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method,
    message: "Check server logs for available routes"
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
console.log("🔄 Attempting to start server on port 5000...");

const server = app.listen(5000, "0.0.0.0", () => {
  // ✅ UPDATED: Use logger instead of console.log
  logger.info('Server running', {
    port: 5000,
    environment: process.env.NODE_ENV || 'development',
    urls: {
      local: 'http://localhost:5000',
      network: 'http://0.0.0.0:5000',
      lan: 'http://192.168.4.48:5000'
    }
  });
  
  logger.info('Available endpoints', {
    health: 'GET /api/health',
    categories: 'GET /api/service-categories',
    profile: 'GET /api/users/:userId/profile',
    availability: 'GET /api/availability/:userId'
  });
});

server.on('error', (error: any) => {
  logger.error('Server failed to start', {
    error: error.message,
    code: error.code,
    port: 5000
  });
  process.exit(1);
});