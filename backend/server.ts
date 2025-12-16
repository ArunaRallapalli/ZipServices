// backend/server.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import pool from "./config/pool"; // ✅ Import the pool instead of creating new one
import { supabase } from "./config/Supabase"; // ✅ ADD THIS LINE

// Routers
import usersRouter from "./routes/users";
import businessOwnerAuthRouter from "./routes/business_owner_auth";
import businessOwnersRouter from "./routes/Business_Owners_registration";
import messagesRouter from "./routes/messages";
//import businessOwnerSearchRouter from "./routes/Old_business_owners_search";
import businessOwnerProfileRouter from "./business-owners";
import serviceCategoriesRouter from "./routes/serviceCategories";
import servicePostsRouter from './routes/ServicePosts';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Make pool accessible in all routes
app.use((req, _res, next) => {
  (req as any).pool = pool;
  next();
});

// ✅ Middleware must be BEFORE routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
}));
app.use(express.json());

// Health check
app.get("/ping", (_req: Request, res: Response) => {
  res.json({ message: "pong" });
});

// ✅ Database health check - MODIFIED TO USE SUPABASE CLIENT
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id')
      .limit(1);
    
    if (error) throw error;
    
    res.json({ 
      status: "ok",
      message: "API is running",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ✅ NEW ROUTES WITH /api PREFIX
app.use("/api/service-categories", serviceCategoriesRouter);
app.use("/api/users", usersRouter);
app.use('/', servicePostsRouter);

// ✅ EXISTING ROUTES (keep these for backward compatibility)
app.use("/users", usersRouter);
app.use("/business_owners", businessOwnerAuthRouter);
app.use("/business_owners/crud", businessOwnersRouter);
//app.use("/business_owners/search", businessOwnerSearchRouter);
app.use("/business-owners", businessOwnerProfileRouter);
app.use('/service-posts', servicePostsRouter);
app.use("/messages", messagesRouter);

// Debug routes logging
console.log("=== REGISTERED ROUTES ===");
console.log("✅ NEW API ROUTES:");
console.log("   GET  /api/health");
console.log("   GET  /api/service-categories");
console.log("   GET  /api/users");
console.log("   GET  /api/users/:userId/profile");
console.log("   GET  /api/users/:userId/roles");
console.log("   POST /api/service-posts");
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
  console.log("✅ Server running at:");
  console.log("  - Local: http://localhost:5000");
  console.log("  - Network: http://0.0.0.0:5000");
  console.log("  - LAN: http://192.168.4.48:5000");
  console.log("\n🔗 Test these endpoints:");
  console.log("  curl http://localhost:5000/api/health");
  console.log("  curl http://localhost:5000/api/service-categories");
  console.log("  curl http://localhost:5000/api/users/175/profile");
});

server.on('error', (error: any) => {
  console.error("❌ Server failed to start:", error);
  process.exit(1);
});