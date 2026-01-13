# 🐛 Production-Ready Debugging Setup - Complete Package

## 📦 What You're Getting

A **complete debugging infrastructure** for your TypeScript backend with:

- ✅ **VS Code Breakpoint Debugging** - Step through code line by line
- ✅ **Structured Logging** - Winston logger with JSON output
- ✅ **Request Tracking** - Unique IDs for every API call
- ✅ **Performance Monitoring** - Automatic slow query detection
- ✅ **Error Tracking** - Full stack traces with context
- ✅ **Database Debugging** - Query execution tracking

---

## 📁 Files Included

### Core Configuration Files
1. **launch.json** - VS Code debugger configuration
   - Place in: `.vscode/launch.json`

2. **logger.ts** - Production logging system
   - Place in: `backend/utils/logger.ts`

3. **requestTracking.ts** - Request tracking middleware
   - Place in: `backend/middleware/requestTracking.ts`

4. **debug.ts** - Debugging utility functions
   - Place in: `backend/utils/debug.ts`

### Documentation
5. **IMPLEMENTATION_GUIDE.md** - Complete step-by-step setup
6. **setup-debugging.sh** - Automated setup script

---

## 🚀 Quick Start (3 Methods)

### Method 1: Automated Setup (Recommended) ⭐

```bash
# 1. Place all files in your project root
# 2. Make script executable
chmod +x setup-debugging.sh

# 3. Run setup
./setup-debugging.sh

# 4. Follow on-screen instructions
```

### Method 2: Manual Setup

Follow the **IMPLEMENTATION_GUIDE.md** step-by-step.

### Method 3: Copy & Paste

1. Copy files to locations specified above
2. Install dependencies:
   ```bash
   npm install winston morgan uuid
   npm install --save-dev @types/morgan @types/uuid nodemon
   ```
3. Update your `server.ts` (see guide)

---

## 📋 Installation Checklist

- [ ] Install dependencies (`winston`, `morgan`, `uuid`)
- [ ] Copy `launch.json` to `.vscode/`
- [ ] Copy `logger.ts` to `backend/utils/`
- [ ] Copy `requestTracking.ts` to `backend/middleware/`
- [ ] Copy `debug.ts` to `backend/utils/`
- [ ] Update `server.ts` to use new middleware
- [ ] Update routes to use logger instead of console.log
- [ ] Test debugger (Press F5 in VS Code)
- [ ] Check logs are being created (`logs/` folder)

---

## 🎯 How to Use

### Start Debugging in VS Code

1. Open any `.ts` file
2. Click left of line number to set breakpoint (red dot)
3. Press **F5**
4. Select "🐛 Debug Backend Server"
5. Execution pauses at breakpoint
6. Use Variables panel to inspect values

### View Live Logs

```bash
# All logs
npm run logs:all

# Only errors
npm run logs:error

# Clear logs
npm run logs:clear
```

### Debug Specific Issues

```typescript
// Type mismatches
import { debugType } from './utils/debug';
debugType('user IDs', userId, req.user?.user_id);

// Authorization failures
import { debugAuth } from './utils/debug';
debugAuth('route-name', req, userId);

// Database queries
import { trackedQuery } from '../middleware/requestTracking';
const result = await trackedQuery('query-name', () => supabase.from('table')...);
```

---

## 📚 Documentation Structure

1. **README.md** (this file) - Overview and quick start
2. **IMPLEMENTATION_GUIDE.md** - Detailed setup instructions
3. **DEBUGGING_QUICKSTART.md** - Created by setup script

---

## 🔧 What Gets Installed

### NPM Packages

```json
{
  "dependencies": {
    "winston": "^3.11.0",    // Structured logging
    "morgan": "^1.10.0",     // HTTP request logging
    "uuid": "^9.0.1"         // Unique request IDs
  },
  "devDependencies": {
    "@types/morgan": "^1.9.9",
    "@types/uuid": "^9.0.7",
    "nodemon": "^3.0.2"      // Auto-restart on changes
  }
}
```

### New Scripts

```json
{
  "scripts": {
    "debug": "node --inspect -r ts-node/register server.ts",
    "debug:brk": "node --inspect-brk -r ts-node/register server.ts",
    "logs:error": "tail -f logs/error.log",
    "logs:all": "tail -f logs/combined.log",
    "logs:clear": "rm -rf logs/*.log"
  }
}
```

---

## 🎓 Learning Resources

### VS Code Debugging

- **F5** - Start debugging
- **F9** - Toggle breakpoint
- **F10** - Step over (next line)
- **F11** - Step into (enter function)
- **Shift+F11** - Step out (exit function)

### Logger Usage

```typescript
import logger from './utils/logger';

logger.info('Message', { userId: 701, action: 'login' });
logger.error('Error occurred', { error: err.message, stack: err.stack });
logger.warn('Warning', { issue: 'slow query' });
logger.debug('Debug info', { details: {...} });
```

### Common Patterns

```typescript
// Track request
logger.info('Processing request', {
  requestId: req.id,
  userId: req.user?.user_id,
  action: 'create-post'
});

// Measure performance
const start = Date.now();
// ... operation ...
logger.info('Operation complete', {
  duration: `${Date.now() - start}ms`
});

// Handle errors
try {
  // code
} catch (error: any) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    context: { userId, action }
  });
  throw error;
}
```

---

## 🔍 Troubleshooting

### Breakpoints Not Working

- ✅ Check you selected "Debug Backend Server" in dropdown
- ✅ Ensure `sourceMaps: true` in tsconfig
- ✅ Restart VS Code
- ✅ Try `npm run debug:brk` instead

### Logs Not Appearing

- ✅ Check `logs/` folder exists
- ✅ Check file permissions
- ✅ Ensure winston is installed
- ✅ Check `logger.ts` is imported in server.ts

### Type Errors

- ✅ Run `npm install @types/morgan @types/uuid`
- ✅ Restart TypeScript server in VS Code
- ✅ Check import paths

---

## 🚀 Production Deployment

### Before Deploying

1. Remove all breakpoints
2. Set `NODE_ENV=production`
3. Set `LOG_LEVEL=info` (not debug)
4. Ensure logs/ folder is writable
5. Set up log rotation
6. Consider log aggregation service (Papertrail, Loggly, etc.)

### Environment Variables

```bash
NODE_ENV=production
LOG_LEVEL=info
PORT=5000
```

---

## 📊 What You Get Out of the Box

### 1. Request Tracking
Every request gets:
- Unique ID (UUID)
- Duration timing
- Status code
- User identification
- Full context on errors

### 2. Structured Logs
```json
{
  "timestamp": "2026-01-09T20:00:00.000Z",
  "level": "info",
  "message": "User logged in",
  "userId": 701,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 3. Performance Monitoring
Automatic warnings for:
- Slow requests (>1 second)
- Database queries (execution time logged)
- API calls (duration tracked)

### 4. Error Context
Every error includes:
- Full stack trace
- Request details
- User context
- Previous operations

---

## 💡 Tips & Best Practices

### Use Structured Logging

```typescript
// ❌ Bad
console.log('User 701 logged in');

// ✅ Good
logger.info('User logged in', { userId: 701, timestamp: new Date() });
```

### Set Conditional Breakpoints

Right-click breakpoint → "Edit Breakpoint"
```typescript
userId === 701  // Only break for specific user
error !== null  // Only break on errors
```

### Use Watch Expressions

Add to Watch panel:
```typescript
String(userId)              // See string representation
typeof userId               // Check type
userId === req.user.user_id // Compare directly
```

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ Press F5 → Server starts with debugger attached
2. ✅ Set breakpoint → Execution pauses
3. ✅ Make API call → See request in logs/combined.log
4. ✅ Error occurs → Full details in logs/error.log
5. ✅ Variables panel → Shows all current values

---

## 📞 Need Help?

Common issues and solutions are in **IMPLEMENTATION_GUIDE.md** Step 12.

For specific debugging scenarios, see the guide's "Debug Common Scenarios" section.

---

## 🔄 Updates & Maintenance

### Keep Logs Clean

```bash
# Run weekly
npm run logs:clear
```

### Monitor Log Size

```bash
# Check log sizes
ls -lh logs/

# Logs auto-rotate at 5MB
# Keep last 5 files (25MB total)
```

### Update Dependencies

```bash
npm update winston morgan uuid
npm update -D @types/morgan @types/uuid
```

---

## ✨ What Makes This Production-Ready

- ✅ **Zero performance impact** when not debugging
- ✅ **Automatic log rotation** prevents disk filling
- ✅ **Structured JSON logs** for easy parsing
- ✅ **Request ID tracking** through entire request lifecycle
- ✅ **Error context preservation** for debugging production issues
- ✅ **Performance monitoring** with configurable thresholds
- ✅ **Type-safe** TypeScript throughout

---

**You're now equipped with professional-grade debugging tools! 🚀**

Start with pressing **F5** in VS Code and explore from there.
