#!/bin/bash

###############################################################################
# AUTOMATED DEBUGGING SETUP SCRIPT
###############################################################################
# 
# This script automatically sets up the complete debugging infrastructure
# for your application.
#
# Usage:
#   chmod +x setup-debugging.sh
#   ./setup-debugging.sh
#
###############################################################################

set -e  # Exit on error

echo "🚀 Setting up debugging infrastructure..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

###############################################################################
# Step 1: Check Prerequisites
###############################################################################

echo "📋 Checking prerequisites..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js and npm first."
    exit 1
fi
print_status "npm found"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from your project root."
    exit 1
fi
print_status "package.json found"

echo ""

###############################################################################
# Step 2: Create Directory Structure
###############################################################################

echo "📁 Creating directory structure..."

mkdir -p backend/utils
print_status "Created backend/utils"

mkdir -p backend/middleware
print_status "Created backend/middleware"

mkdir -p logs
print_status "Created logs"

mkdir -p .vscode
print_status "Created .vscode"

mkdir -p scripts
print_status "Created scripts"

echo ""

###############################################################################
# Step 3: Install Dependencies
###############################################################################

echo "📦 Installing debugging dependencies..."

print_info "Installing winston, morgan, uuid..."
npm install winston morgan uuid --silent

print_info "Installing dev dependencies..."
npm install --save-dev @types/morgan @types/uuid nodemon --silent

print_status "All dependencies installed"

echo ""

###############################################################################
# Step 4: Update .gitignore
###############################################################################

echo "📝 Updating .gitignore..."

if [ -f ".gitignore" ]; then
    # Check if logs are already ignored
    if ! grep -q "logs/\*.log" .gitignore; then
        echo "" >> .gitignore
        echo "# Debugging logs" >> .gitignore
        echo "logs/*.log" >> .gitignore
        print_status "Added logs to .gitignore"
    else
        print_status "Logs already in .gitignore"
    fi
else
    echo "logs/*.log" > .gitignore
    print_status "Created .gitignore with logs"
fi

echo ""

###############################################################################
# Step 5: Check for Existing Files
###############################################################################

echo "🔍 Checking for provided setup files..."

FILES_TO_COPY=(
    ".vscode_launch.json:.vscode/launch.json"
    "logger.ts:backend/utils/logger.ts"
    "requestTracking.ts:backend/middleware/requestTracking.ts"
    "debug.ts:backend/utils/debug.ts"
)

MISSING_FILES=()

for file_pair in "${FILES_TO_COPY[@]}"; do
    IFS=':' read -r source dest <<< "$file_pair"
    if [ ! -f "$source" ]; then
        MISSING_FILES+=("$source")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    print_warning "The following files were not found in the current directory:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    print_info "These files should have been provided with this script."
    print_info "Please ensure all files are in the same directory as this script."
    echo ""
    read -p "Would you like to continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

###############################################################################
# Step 6: Copy Configuration Files
###############################################################################

echo "📋 Copying configuration files..."

for file_pair in "${FILES_TO_COPY[@]}"; do
    IFS=':' read -r source dest <<< "$file_pair"
    
    if [ -f "$source" ]; then
        # Check if destination already exists
        if [ -f "$dest" ]; then
            print_warning "$dest already exists"
            read -p "   Overwrite? (y/n) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cp "$source" "$dest"
                print_status "Copied $source → $dest"
            else
                print_info "Skipped $dest"
            fi
        else
            cp "$source" "$dest"
            print_status "Copied $source → $dest"
        fi
    fi
done

echo ""

###############################################################################
# Step 7: Update package.json Scripts
###############################################################################

echo "📝 Updating package.json scripts..."

# Check if debug script already exists
if grep -q '"debug"' package.json; then
    print_status "Debug scripts already exist in package.json"
else
    print_warning "Please manually add these scripts to your package.json:"
    echo ""
    echo '  "debug": "cross-env NODE_ENV=development node --inspect -r ts-node/register server.ts",'
    echo '  "debug:brk": "cross-env NODE_ENV=development node --inspect-brk -r ts-node/register server.ts",'
    echo '  "logs:error": "tail -f logs/error.log",'
    echo '  "logs:all": "tail -f logs/combined.log",'
    echo '  "logs:clear": "rm -rf logs/*.log"'
    echo ""
fi

echo ""

###############################################################################
# Step 8: Create Sample Test Files
###############################################################################

echo "📄 Creating sample test files..."

# Create a simple environment checker
cat > scripts/checkEnv.ts << 'EOF'
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Environment Variables Check\n');

const requiredVars = [
  'NODE_ENV',
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'JWT_SECRET',
];

const optionalVars = [
  'PORT',
  'FRONTEND_URL',
  'RESEND_API_KEY',
];

console.log('Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const display = value ? `SET (${value.length} chars)` : 'NOT SET';
  console.log(`  ${status} ${varName}: ${display}`);
});

console.log('\nOptional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚠️';
  const display = value ? `SET (${value.length} chars)` : 'NOT SET';
  console.log(`  ${status} ${varName}: ${display}`);
});
EOF

print_status "Created scripts/checkEnv.ts"

echo ""

###############################################################################
# Step 9: Create Quick Start Guide
###############################################################################

echo "📚 Creating quick start guide..."

cat > DEBUGGING_QUICKSTART.md << 'EOF'
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
EOF

print_status "Created DEBUGGING_QUICKSTART.md"

echo ""

###############################################################################
# Step 10: Final Instructions
###############################################################################

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  🎉 Debugging Infrastructure Setup Complete!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update your server.ts:"
echo "   ${BLUE}See IMPLEMENTATION_GUIDE.md Step 4${NC}"
echo ""
echo "2. Update your routes with logger:"
echo "   ${BLUE}See IMPLEMENTATION_GUIDE.md Step 5${NC}"
echo ""
echo "3. Test the setup:"
echo "   ${GREEN}npm run debug${NC}"
echo "   Then press ${GREEN}F5${NC} in VS Code"
echo ""
echo "4. Check logs:"
echo "   ${GREEN}npm run logs:all${NC}"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: ${YELLOW}DEBUGGING_QUICKSTART.md${NC}"
echo "   - Full Guide: ${YELLOW}IMPLEMENTATION_GUIDE.md${NC}"
echo ""
echo "🔍 Verify setup:"
echo "   ${GREEN}npm run check:env${NC}"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if all critical files exist
CRITICAL_FILES=(
    "backend/utils/logger.ts"
    "backend/middleware/requestTracking.ts"
    ".vscode/launch.json"
)

ALL_GOOD=true
for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Missing: $file"
        ALL_GOOD=false
    fi
done

if [ "$ALL_GOOD" = true ]; then
    print_status "All critical files in place"
    echo ""
    print_info "Ready to debug! Press F5 in VS Code to start."
else
    echo ""
    print_warning "Some files are missing. Please check the setup."
fi

echo ""
