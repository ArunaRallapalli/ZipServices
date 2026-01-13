# 🐛 Debugging Quick Start

## Start Debugging

### Option 1: VS Code Debugger (Recommended)
1. Open any `.ts` file
2. Click in the gutter (left of line numbers) to set breakpoint (red dot)
3. Press **F5**
4. Select "🐛 Debug Backend Server"
5. Make API request - execution will pause at breakpoint

### Option 2: Command Line
```bash
npm run debug
```

Then attach VS Code debugger or use Chrome DevTools at `chrome://inspect`

## Check Environment

```bash
npm run check:env
```

## View Logs

```bash
# All logs (live)
npm run logs:all

# Only errors (live)
npm run logs:error

# Clear old logs
npm run logs:clear
```

## Debug Common Issues

### Type Mismatch (number vs string)
```typescript
import { debugType } from './utils/debug';
debugType('comparing IDs', userId, req.user?.user_id);
```

### Authorization Failures
```typescript
import { debugAuth } from './utils/debug';
debugAuth('route-name', req, providedUserId);
```

### Slow Queries
Check `logs/combined.log` for "Slow Request Detected" warnings

## Keyboard Shortcuts

- **F5** - Start/Continue
- **F9** - Toggle Breakpoint
- **F10** - Step Over (next line)
- **F11** - Step Into (enter function)
- **Shift+F11** - Step Out (exit function)

## More Help

See `IMPLEMENTATION_GUIDE.md` for complete documentation.
