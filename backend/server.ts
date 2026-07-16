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
import ordersRouter from './routes/orders';
import thriftRequestsRouter from './routes/thriftRequests';
import { sendSmartNotification } from './routes/messages';
import { sendAdminAlert } from './services/emailServices';

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
// [2026-07-14] Client-side error reporting — frontend POSTs here when critical operations fail
// (e.g. photo upload produces zero saved photos). Sends admin alert email via Resend.
app.post('/api/client-error', express.json(), async (req: Request, res: Response) => {
  const { screen, error, userId, details } = req.body || {};
  const subject = `Client error — ${screen || 'unknown screen'}`;
  const body = [
    `Screen:  ${screen || 'unknown'}`,
    `User ID: ${userId || 'anonymous'}`,
    `Error:   ${error || 'no message'}`,
    details ? `Details: ${details}` : '',
    `Time:    ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n');
  console.warn(`⚠️ Client error reported — ${screen}: ${error}`);
  sendAdminAlert(subject, body).catch(() => {});
  res.json({ ok: true });
});

// ✅ NEW ROUTES WITH /api PREFIX
app.use("/api/service-categories", serviceCategoriesRouter);
app.use("/api/users", usersRouter);
app.use('/', servicePostsRouter);
app.use('/', ordersRouter);
app.use('/', thriftRequestsRouter);

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

export default app;

if (process.env.NODE_ENV !== 'test') {
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

// ── Hourly unread message sweep ─────────────────────────────────────────────
// Finds all users who have unread messages, are not currently active,
// and have not been emailed in the last hour — then fires a notification.
async function sweepUnreadMessages(): Promise<void> {
  try {
    console.log('🔔 Hourly sweep: checking for unread messages...');

    const ONE_HOUR_AGO    = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const TEN_MINS_AGO    = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

    // Find all unread messages (we filter per-user below)
    const { data: unread, error } = await supabase
      .from('messages')
      .select('receiver_id, sender_id, created_at')
      .eq('is_read', false);

    if (error || !unread || unread.length === 0) return;

    // Unique receiver IDs
    const receiverIds = [...new Set(unread.map((m: any) => Number(m.receiver_id)))];

    // Fetch their activity/email timestamps
    const { data: users } = await supabase
      .from('users')
      .select('user_id, last_seen_at, last_email_sent_at')
      .in('user_id', receiverIds);

    if (!users) return;

    for (const user of users) {
      const userId = Number(user.user_id);

      // Skip if active within last 10 minutes
      if (user.last_seen_at && user.last_seen_at > TEN_MINS_AGO) continue;

      // Skip if already emailed within last hour
      if (user.last_email_sent_at && user.last_email_sent_at > ONE_HOUR_AGO) continue;

      // Get this user's unread messages sorted oldest first
      const userUnread = unread
        .filter((m: any) => Number(m.receiver_id) === userId)
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (userUnread.length === 0) continue;

      // Per-user 3-hour cutoff: if their oldest unread message is > 3 hours old, stop notifying
      const oldestUnread = userUnread[0];
      const msOld = Date.now() - new Date(oldestUnread.created_at).getTime();
      if (msOld > THREE_HOURS_MS) {
        console.log(`⏭️ Skipping user ${userId} — oldest unread message is ${Math.round(msOld / 3600000)}h old`);
        continue;
      }

      // Use the most recent sender for the notification
      const latestMsg = userUnread[userUnread.length - 1];
      if (!latestMsg) continue;

      await sendSmartNotification(Number(latestMsg.sender_id), userId);
    }

    console.log('✅ Hourly sweep complete');
  } catch (err) {
    console.error('❌ Hourly message sweep error:', err);
  }
}

// Run sweep every hour
setInterval(sweepUnreadMessages, 60 * 60 * 1000);

// ── 24h pending order expiry sweep ──────────────────────────────────────────
// Finds pending orders whose expires_at has passed, marks them as 'expired',
// and reverts in_stock for each item so the product becomes available again.
async function sweepExpiredOrders(): Promise<void> {
  try {
    console.log('⏰ Order expiry sweep: checking for expired pending orders...');

    const now = new Date().toISOString();
    const fallbackCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Query 1: orders with expires_at explicitly in the past
    const { data: expiredByDate, error: err1 } = await supabase
      .from('payments')
      .select('id, items')
      .eq('status', 'pending')
      .lt('expires_at', now);

    // Query 2: orders where expires_at is NULL (placed before column existed) and older than 12h
    const { data: expiredByAge, error: err2 } = await supabase
      .from('payments')
      .select('id, items')
      .eq('status', 'pending')
      .is('expires_at', null)
      .lt('created_at', fallbackCutoff);

    if (err1) console.error('⚠️ Sweep query 1 error:', err1.message);
    if (err2) console.error('⚠️ Sweep query 2 error:', err2.message);

    const expiredOrders = [
      ...(expiredByDate || []),
      ...(expiredByAge  || []),
    ];

    if (expiredOrders.length === 0) {
      console.log('⏰ Sweep complete — no expired orders found');
      return;
    }

    console.log(`⏰ Found ${expiredOrders.length} expired order(s) — reverting stock and marking expired`);

    for (const order of expiredOrders) {
      // Mark as expired
      await supabase.from('payments').update({ status: 'expired' }).eq('id', order.id);
      console.log(`✅ Order #${order.id} marked expired`);

      // Revert in_stock for each item
      if (!order.items) continue;
      const stockIncrements = new Map<number, number>();
      for (const item of order.items) {
        const postId = Number(item.post_id);
        const qty    = Number(item.quantity ?? 1);
        if (postId) stockIncrements.set(postId, (stockIncrements.get(postId) ?? 0) + qty);
      }
      await Promise.all(
        Array.from(stockIncrements.entries()).map(async ([postId, qty]) => {
          const { data: post } = await supabase
            .from('service_posts').select('in_stock').eq('id', postId).single();
          const newStock = Number(post?.in_stock ?? 0) + qty;
          await supabase.from('service_posts').update({ in_stock: newStock }).eq('id', postId);
          console.log(`✅ in_stock reverted for post #${postId} +${qty} → ${newStock} (order expired)`);
        }),
      );
    }

    console.log('✅ Order expiry sweep complete');
  } catch (err) {
    console.error('❌ Order expiry sweep error:', err);
  }
}

// Run expiry sweep immediately on startup, then every 30 minutes
sweepExpiredOrders();
setInterval(sweepExpiredOrders, 30 * 60 * 1000);

// ── 24h thrift request expiry sweep ─────────────────────────────────────────
// Finds 'requested' thrift rows whose 24h window has passed, marks them
// 'expired', and restores in_stock so the units become available again.
async function sweepExpiredThriftRequests(): Promise<void> {
  try {
    console.log('⏰ Thrift expiry sweep: checking for expired requests...');

    const now = new Date().toISOString();

    const { data: expiredRows, error } = await supabase
      .from('thrift_requests')
      .select('id, post_id, photo_index')
      .eq('status', 'requested')
      .not('expires_at', 'is', null)
      .lt('expires_at', now);

    if (error) { console.error('❌ Thrift expiry sweep query error:', error); return; }

    if (!expiredRows || expiredRows.length === 0) {
      console.log('✅ Thrift expiry sweep complete — nothing to expire');
      return;
    }

    const ids = expiredRows.map((r: any) => r.id);
    await supabase.from('thrift_requests').update({ status: 'expired' }).in('id', ids);

    // Group by post_id — separate photo-based from no-photo
    const byPost = new Map<number, { photoIndexes: number[]; noPhotoCount: number }>();
    for (const r of expiredRows) {
      if (!byPost.has(r.post_id)) byPost.set(r.post_id, { photoIndexes: [], noPhotoCount: 0 });
      const entry = byPost.get(r.post_id)!;
      if (r.photo_index !== null && r.photo_index !== undefined) {
        entry.photoIndexes.push(r.photo_index);
      } else {
        entry.noPhotoCount++;
      }
    }

    for (const [postId, { photoIndexes, noPhotoCount }] of byPost) {
      const { data: post } = await supabase.from('service_posts').select('in_stock, thrift_reserved_indexes').eq('id', postId).single();
      const updates: any = {};
      if (photoIndexes.length > 0) {
        const current = post?.thrift_reserved_indexes ?? [];
        updates.thrift_reserved_indexes = current.filter((i: number) => !photoIndexes.includes(i));
        console.log(`♻️  Post #${postId}: photo(s) [${photoIndexes}] released from reserved`);
      }
      if (noPhotoCount > 0) {
        updates.in_stock = Number(post?.in_stock ?? 0) + noPhotoCount;
        console.log(`♻️  Post #${postId}: in_stock restored to ${updates.in_stock}`);
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('service_posts').update(updates).eq('id', postId);
      }
    }

    console.log(`✅ Thrift expiry sweep complete — expired ${ids.length} request(s)`);
  } catch (err) {
    console.error('❌ Thrift expiry sweep error:', err);
  }
}

// Run immediately on startup, then every 30 minutes
sweepExpiredThriftRequests();
setInterval(sweepExpiredThriftRequests, 30 * 60 * 1000);

// ── Seed required service categories ────────────────────────────────────────
// Ensures specific categories always exist in the database.
// Safe to re-run — uses upsert on category_name.
async function seedServiceCategories(): Promise<void> {
  const required = [
    'Babysitting',
    'Bakery',
    'Beauty Services',
    'Boutique',
    'Catering',
    'Cleaning',
    'Construction/Renovation',
    'Dance Lessons',
    'Decorations',
    'DJ',
    'Electrical',
    'Entertainment',
    'Event Planning',
    'Financial Planning',
    'Home Help',
    'Home Repair',
    'Landscaping',
    'Moving',
    'Nanny Services',
    'Other',
    'Painting',
    'Pet Care',
    'Photography',
    'Plumbing',
    'Preloved & Thrifting',
    'Priest Services',
    'Rentals',
    'Shoe Repair',
    'Tailoring',
    'Tech Support',
    'Tutoring',
    'Yoga Instruction',
  ];

  try {
    const rows = required.map(name => ({ category_name: name, is_active: true }));
    const { error } = await supabase
      .from('service_categories')
      .upsert(rows, { onConflict: 'category_name', ignoreDuplicates: true });
    if (error) {
      console.error('⚠️ Category seed error:', error.message);
    } else {
      console.log(`✅ Service categories seeded (${required.length} entries ensured)`);
    }
  } catch (err: any) {
    console.error('❌ Category seed failed:', err.message);
  }
}

seedServiceCategories();

server.on('error', (error: any) => {
  logger.error('Server failed to start', {
    error: error.message,
    code: error.code,
    port: 5000
  });
  process.exit(1);
});

} // end: if (process.env.NODE_ENV !== 'test')

