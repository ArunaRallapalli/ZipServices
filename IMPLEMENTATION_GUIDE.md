# 🚀 Complete Debugging Setup - Implementation Guide

## 📋 Overview

This guide will set up a **production-ready debugging system** for your app with:
- ✅ VS Code breakpoint debugging
- ✅ Structured logging with Winston
- ✅ Request tracking with unique IDs
- ✅ Performance monitoring
- ✅ Error tracking and reporting
- ✅ Database query debugging

---

## Step 1: Install Dependencies

```bash
# Navigate to your backend directory
cd backend

# Install debugging dependencies
npm install winston morgan uuid

# Install dev dependencies
npm install --save-dev @types/morgan @types/uuid nodemon
```

---

## Step 2: Create Directory Structure

```bash
# Create necessary directories
mkdir -p utils
mkdir -p middleware
mkdir -p logs
mkdir -p scripts
mkdir -p .vscode

# Create .gitignore entry for logs
echo "logs/*.log" >> .gitignore
```

---

## Step 3: Copy Files to Your Project

### 3.1 Copy VS Code Configuration

```bash
# Copy launch.json to .vscode folder
cp .vscode_launch.json .vscode/launch.json
```

**File Location:** `.vscode/launch.json`

### 3.2 Copy Logger Utility

```bash
# Copy logger to utils folder
cp logger.ts backend/utils/logger.ts
```

**File Location:** `backend/utils/logger.ts`

### 3.3 Copy Request Tracking Middleware

```bash
# Copy request tracking to middleware folder
cp requestTracking.ts backend/middleware/requestTracking.ts
```

**File Location:** `backend/middleware/requestTracking.ts`

### 3.4 Copy Debug Utilities

```bash
# Copy debug utilities to utils folder
cp debug.ts backend/utils/debug.ts
```

**File Location:** `backend/utils/debug.ts`

---

## Step 4: Update server.ts

Add these imports at the top of your `backend/server.ts`:

```typescript
import logger from './utils/logger';
import { requestTracking, errorLogger, performanceMonitor } from './middleware/requestTracking';
import { debugEnv } from './utils/debug';

// Log environment on startup
debugEnv();
```

Add middleware **BEFORE** your routes:

```typescript
// Replace console.log with logger
logger.info('Starting server...');

// Add request tracking (put this BEFORE routes)
app.use(requestTracking);
app.use(performanceMonitor(1000)); // Warn if requests take > 1 second

// Your existing middleware
app.use(express.json());
app.use(cors());

// Your routes here...
app.use('/api/availability', availabilityRoutes);
app.use('/api/users', userRoutes);
// ... etc

// Add error logger LAST (after all routes)
app.use(errorLogger);
```

Replace console.log statements:

```typescript
// BEFORE:
console.log('✅ Server running at http://localhost:5000');

// AFTER:
logger.info('Server running', {
  port: PORT,
  environment: process.env.NODE_ENV,
  url: `http://localhost:${PORT}`
});
```

---

## Step 5: Update Your Routes with Better Logging

### Example: Update availability.ts

```typescript
import logger from '../utils/logger';
import { debugAuth } from '../utils/debug';
import { trackedQuery } from '../middleware/requestTracking';

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId, dates, isAvailable, notes } = req.body;
    
    // Use logger instead of console.log
    logger.info('Setting availability', {
      requestId: req.id,
      userId,
      dateCount: dates?.length,
      isAvailable
    });
    
    // Debug auth issues
    if (String(userId) !== String(req.user?.user_id)) {
      debugAuth('availability-post', req, userId);
      return res.status(403).json({
        success: false,
        error: 'You can only set your own availability'
      });
    }
    
    // Use tracked query for database operations
    const { data, error } = await trackedQuery(
      'upsert-availability',
      () => supabase
        .from('availability')
        .upsert(records, { onConflict: 'user_id,date' })
        .select(),
      req.id
    );
    
    if (error) {
      logger.error('Failed to set availability', {
        requestId: req.id,
        error: error.message,
        userId
      });
      throw error;
    }
    
    logger.info('Availability set successfully', {
      requestId: req.id,
      userId,
      recordCount: data?.length
    });
    
    res.json({ success: true, availability: data });
  } catch (error: any) {
    logger.error('Error in availability POST', {
      requestId: req.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, error: 'Failed to set availability' });
  }
});
```

---

## Step 6: Update package.json Scripts

Add these scripts to your `backend/package.json`:

```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development ts-node --project tsconfig.backend.json server.ts",
    "debug": "cross-env NODE_ENV=development node --inspect -r ts-node/register server.ts",
    "debug:brk": "cross-env NODE_ENV=development node --inspect-brk -r ts-node/register server.ts",
    "logs:error": "tail -f logs/error.log",
    "logs:all": "tail -f logs/combined.log",
    "logs:clear": "rm -rf logs/*.log"
  }
}
```

---

## Step 7: Using VS Code Debugger

### Setting Breakpoints

1. Open any TypeScript file (e.g., `availability.ts`)
2. Click in the **gutter** (left of line numbers) to set a red dot breakpoint
3. Press **F5** to start debugging
4. Select **"🐛 Debug Backend Server"** from dropdown

### When Breakpoint Hits

- **Variables Panel** (left) - See all variable values
- **Call Stack** - See function call chain
- **Debug Console** - Run code in current context
- **Watch** - Monitor specific expressions

### Keyboard Shortcuts

- **F5** - Start/Continue
- **F9** - Toggle Breakpoint
- **F10** - Step Over (next line)
- **F11** - Step Into (go into function)
- **Shift+F11** - Step Out (exit function)

### Conditional Breakpoints

1. Right-click on breakpoint
2. Select "Edit Breakpoint"
3. Add condition: `userId === 701`
4. Breakpoint only triggers when condition is true

---

## Step 8: Monitor Logs in Production

### View Real-Time Logs

```bash
# Watch all logs
npm run logs:all

# Watch only errors
npm run logs:error

# Clear old logs
npm run logs:clear
```

### Log Locations

- `logs/combined.log` - All logs (JSON format)
- `logs/error.log` - Only errors (JSON format)
- Console - Development output (colored)

### Reading JSON Logs

```bash
# Pretty-print JSON logs
cat logs/combined.log | jq

# Filter by level
cat logs/combined.log | jq 'select(.level == "error")'

# Filter by userId
cat logs/combined.log | jq 'select(.userId == "701")'

# Last 10 errors
tail -10 logs/error.log | jq
```

---

## Step 9: Debug Common Scenarios

### Scenario 1: Authorization Fails

Set breakpoint and check:

```typescript
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const { userId } = req.body;
  
  // 🔴 SET BREAKPOINT HERE
  debugAuth('my-route', req, userId);
  
  if (String(userId) !== String(req.user?.user_id)) {
    // Check Variables panel:
    // - userId (type and value)
    // - req.user.user_id (type and value)
    // - String(userId) === String(req.user?.user_id)
    return res.status(403).json({ error: 'Unauthorized' });
  }
});
```

### Scenario 2: Database Query Fails

```typescript
// 🔴 SET BREAKPOINT BEFORE QUERY
const { data, error } = await trackedQuery(
  'fetch-user',
  () => supabase.from('users').select('*').eq('user_id', userId).single(),
  req.id
);

// 🔴 SET BREAKPOINT AFTER QUERY
if (error) {
  // Check:
  // - error.message
  // - error.code
  // - userId value
  logger.error('Query failed', { error, userId });
}
```

### Scenario 3: Type Mismatch

```typescript
import { debugType } from './utils/debug';

// Compare types
debugType('user IDs', userId, req.user?.user_id);

// Output shows:
// - Actual values
// - Types (number vs string)
// - String representations
```

---

## Step 10: Testing the Setup

### Test 1: Breakpoint Debugging

1. Open `backend/routes/availability.ts`
2. Set breakpoint on line with `if (String(userId)...)`
3. Press **F5** → Select "Debug Backend Server"
4. Make API request (block calendar date)
5. Debugger should pause at breakpoint
6. Inspect variables, step through code

### Test 2: Request Tracking

```bash
# Start server
npm run dev

# Make request (from frontend or curl)
curl -X POST http://localhost:5000/api/availability \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": 701, "dates": ["2026-01-15"], "isAvailable": false}'

# Check logs - should see:
# - Unique request ID
# - Request details
# - Query execution time
# - Response status
```

### Test 3: Error Tracking

```typescript
// Add intentional error
router.post('/test-error', (req, res) => {
  throw new Error('Test error');
});

// Make request - check logs/error.log
// Should see full stack trace and context
```

---

## Step 11: Production Deployment Checklist

### Before Deploying

- [ ] All breakpoints removed
- [ ] Debug console.logs removed (keep logger statements)
- [ ] Error handling in all routes
- [ ] Environment variables set
- [ ] Log directory writable
- [ ] Winston configured for production

### Production Environment Variables

```bash
NODE_ENV=production
LOG_LEVEL=info  # Don't use 'debug' in production
```

### Monitor Production Logs

```bash
# SSH into server
ssh your-server

# Watch logs
tail -f /path/to/app/logs/error.log

# Or use log aggregation service:
# - Papertrail
# - Loggly
# - Datadog
```

---

## Step 12: Advanced Debugging Tips

### Debug Async Issues

```typescript
import { debugTiming } from './utils/debug';

const result = await debugTiming(
  'fetch-user-data',
  async () => {
    const user = await getUser();
    const bookings = await getBookings();
    return { user, bookings };
  }
);
// Logs execution time automatically
```

### Compare State Changes

```typescript
import { debugCompare } from './utils/debug';

const before = { userId: 701, status: 'pending' };
// ... some operation ...
const after = { userId: 701, status: 'confirmed' };

debugCompare('booking-status', before, after);
// Logs only what changed
```

### Add Checkpoints

```typescript
import { debugCheckpoint } from './utils/debug';

debugCheckpoint('Start processing');
// ... code ...
debugCheckpoint('Validation complete', { userId, dates });
// ... more code ...
debugCheckpoint('Database updated');

// Logs show execution flow with timestamps
```

---

## 📚 Quick Reference

### Logger Levels

```typescript
logger.error('Critical error', { userId, error });  // Always logged
logger.warn('Warning message', { data });           // Important
logger.info('Information', { count });              // Normal
logger.http('HTTP request', { method, path });      // HTTP only
logger.debug('Debug info', { details });            // Development only
```

### Common Patterns

```typescript
// Log with context
logger.info('Action description', {
  requestId: req.id,
  userId: req.user?.user_id,
  additionalData: value
});

// Log errors
try {
  // code
} catch (error: any) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    context: { userId, action }
  });
}

// Track performance
const start = Date.now();
// ... operation ...
logger.info('Operation complete', {
  duration: `${Date.now() - start}ms`
});
```

---

## 🎉 You're All Set!

Your debugging system is now production-ready with:
- ✅ Breakpoint debugging in VS Code
- ✅ Structured logging
- ✅ Request tracking
- ✅ Performance monitoring
- ✅ Error tracking
- ✅ Database debugging

**Next Steps:**
1. Test the setup with a few API calls
2. Set some breakpoints and step through code
3. Check the logs to see the output
4. Deploy to production with confidence!

---

**Need Help?**
- Logs not appearing? Check file permissions on `logs/` folder
- Breakpoints not working? Make sure you selected the right debug configuration
- Performance issues? Check `logs/combined.log` for slow queries

**Happy Debugging! 🐛**
