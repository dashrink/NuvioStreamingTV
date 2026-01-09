# Testing Platform Abstraction Pattern

This guide provides comprehensive testing strategies for verifying the platform-specific file pattern implementation in NuvioStreamingTV.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Build Commands](#build-commands)
- [Verification Methods](#verification-methods)
- [Testing Checklist](#testing-checklist)
- [Debugging Guide](#debugging-guide)
- [Common Issues](#common-issues)
- [Automated Testing](#automated-testing)

---

## Quick Start

### 1. Test TV Platform
```bash
# Start TV development server
npm run start:tv

# Or manually with environment variable
APP_VARIANT=tv npx expo start --clear
```

### 2. Test Mobile Platform
```bash
# Start mobile development server
npm run start
```

### 3. Verify File Resolution
Look for Metro bundler output:
```
[Metro] Resolving module './components/Focusable'
[Metro] Found: ./components/Focusable.tv.tsx    # On TV
[Metro] Found: ./components/Focusable.tsx       # On Mobile
```

---

## Build Commands

### Development

#### TV Platform Development
```bash
# Start development server for TV
npm run start:tv

# With cache clear (recommended after file changes)
APP_VARIANT=tv npx expo start --clear

# With verbose logging (for debugging)
APP_VARIANT=tv npx expo start --clear --verbose
```

#### Mobile Platform Development
```bash
# Start development server for mobile
npm run start

# With cache clear
npx expo start --clear

# With verbose logging
npx expo start --clear --verbose
```

### Production Builds

#### TV Platform Builds
```bash
# Prebuild native TV project
npm run prebuild:tv

# Or manually
APP_VARIANT=tv npx expo prebuild --clean

# Run on Android TV
APP_VARIANT=tv npx expo run:android

# Run on Apple TV
APP_VARIANT=tv npx expo run:ios
```

#### Mobile Platform Builds
```bash
# Prebuild native project
npx expo prebuild --clean

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

---

## Verification Methods

### Method 1: Metro Bundler Logs

**Enable Verbose Logging:**
```bash
APP_VARIANT=tv npx expo start --clear --verbose
```

**What to Look For:**
```
# TV Platform (should load .tv.tsx files)
[Metro] Resolving module './screens/CatalogScreen'
[Metro] Found: ./screens/CatalogScreen.tv.tsx ✅

# Mobile Platform (should load standard .tsx files)
[Metro] Resolving module './screens/CatalogScreen'
[Metro] Found: ./screens/CatalogScreen.tsx ✅
```

---

### Method 2: Runtime Debug Logging

**Add to Component:**
```typescript
// In CatalogScreen.tsx or CatalogScreen.tv.tsx
import { getResolvedPath } from '../utils/moduleResolver';

useEffect(() => {
  if (__DEV__) {
    const resolved = getResolvedPath('CatalogScreen', __filename);
    console.log('[CatalogScreen] Loaded file:', resolved);
  }
}, []);
```

**Expected Console Output:**
```javascript
// TV Platform
[CatalogScreen] Loaded file: CatalogScreen.tv.tsx ✅

// Mobile Platform
[CatalogScreen] Loaded file: CatalogScreen.tsx ✅
```

---

### Method 3: Visual Verification

Test platform-specific UI differences:

#### TV Platform Indicators
- ✅ Focusable components with visible focus rings
- ✅ Larger grid layouts (e.g., 6 columns)
- ✅ Larger fonts (e.g., 18-24px)
- ✅ D-pad navigation works
- ✅ Spatial navigation between items
- ✅ Scale animations on focus

#### Mobile Platform Indicators
- ✅ TouchableOpacity components (no focus rings)
- ✅ Smaller grid layouts (e.g., 3 columns)
- ✅ Smaller fonts (e.g., 12-14px)
- ✅ Touch gestures work
- ✅ No focus animations
- ✅ Standard scroll behavior

---

### Method 4: File Presence Check

**Verify Files Exist:**
```bash
# Check if TV versions exist
ls -la src/components/common/Focusable.tv.tsx
ls -la src/screens/CatalogScreen.tv.tsx

# Check if shared files exist
ls -la src/components/common/Focusable.shared.ts
ls -la src/screens/CatalogScreen.shared.ts

# Check mobile versions exist
ls -la src/components/common/Focusable.tsx
ls -la src/screens/CatalogScreen.tsx
```

---

### Method 5: Source Code Inspection

**Verify No Platform.isTV Checks:**
```bash
# Check mobile version has no Platform.isTV
grep "Platform\.isTV" src/components/common/Focusable.tsx
# Should return nothing ✅

# Check TV version has no Platform.isTV
grep "Platform\.isTV" src/components/common/Focusable.tv.tsx
# Should return nothing ✅

# Count remaining Platform.isTV in non-.tv files
grep -r "Platform\.isTV" src/ --include="*.tsx" --include="*.ts" \
  | grep -v ".tv.tsx" \
  | grep -v ".tv.ts" \
  | grep -v "moduleResolver.ts" \
  | grep -v "deviceDetection.ts" \
  | wc -l
```

---

## Testing Checklist

### Pre-Refactoring Checklist
Before splitting a component into `.tv.tsx`:

- [ ] Identify all `Platform.isTV` checks in the file
- [ ] Document platform-specific behavior differences
- [ ] Create `.shared.ts` file with interfaces
- [ ] Backup original file
- [ ] Read existing component tests (if any)

### During Refactoring Checklist
While creating TV and mobile versions:

- [ ] Create `ComponentName.shared.ts` with types
- [ ] Create `ComponentName.tv.tsx` with TV-specific logic
- [ ] Update `ComponentName.tsx` with mobile-specific logic
- [ ] Remove all `Platform.isTV` checks from both files
- [ ] Ensure both export same component name
- [ ] Import shared types in both versions
- [ ] Verify TypeScript types match

### Post-Refactoring Checklist
After completing refactoring:

**Build & Start:**
- [ ] Mobile build starts without errors: `npm run start`
- [ ] TV build starts without errors: `npm run start:tv`
- [ ] No TypeScript compilation errors
- [ ] No Metro bundler warnings

**Functional Testing:**
- [ ] Component renders on mobile device/emulator
- [ ] Component renders on TV device/emulator
- [ ] Mobile gestures work (touch, scroll, swipe)
- [ ] TV navigation works (D-pad, focus, spatial nav)
- [ ] All features work on both platforms
- [ ] No visual regressions

**Code Quality:**
- [ ] No `Platform.isTV` checks remain in component files
- [ ] Shared code properly extracted to `.shared.ts`
- [ ] Component interfaces match on both versions
- [ ] Code is well-documented
- [ ] Exports are consistent

**Verification:**
- [ ] Metro logs show correct file resolution
- [ ] Runtime debug logs confirm correct file loaded
- [ ] Visual inspection confirms platform-specific UI
- [ ] Migration status document updated

---

## Debugging Guide

### Issue: Wrong File Loaded

**Problem:** Metro is loading the wrong platform file.

**Solution:**
1. Clear Metro cache:
   ```bash
   APP_VARIANT=tv npx expo start --clear
   ```

2. Verify metro.config.js has correct sourceExts order:
   ```javascript
   sourceExts: [
     'tv.tsx',  // Must be first for TV priority
     'tv.ts',
     'tsx',
     'ts',
     // ...
   ]
   ```

3. Check file naming:
   - TV: `ComponentName.tv.tsx` (not `ComponentName.tvos.tsx`)
   - Mobile: `ComponentName.tsx`

4. Restart Metro bundler completely:
   ```bash
   # Kill all Metro processes
   pkill -f metro

   # Start fresh
   APP_VARIANT=tv npx expo start --clear
   ```

---

### Issue: TypeScript Errors

**Problem:** TypeScript complains about missing types or incompatible interfaces.

**Solution:**
1. Ensure `.shared.ts` file exists with proper exports:
   ```typescript
   // ComponentName.shared.ts
   export interface ComponentNameProps {
     // All props here
   }
   ```

2. Both versions import from shared:
   ```typescript
   // ComponentName.tsx
   import { ComponentNameProps } from './ComponentName.shared';

   // ComponentName.tv.tsx
   import { ComponentNameProps } from './ComponentName.shared';
   ```

3. Verify both versions have same export signature:
   ```typescript
   // Both files should export same way
   export default ComponentName;
   // Or
   export { ComponentName };
   ```

---

### Issue: Component Not Found

**Problem:** Import fails or component is undefined.

**Solution:**
1. Check import path is correct (don't include `.tv` in import):
   ```typescript
   // ✅ Correct
   import Focusable from './components/Focusable';

   // ❌ Wrong
   import Focusable from './components/Focusable.tv';
   ```

2. Verify both files exist:
   ```bash
   ls -la src/components/Focusable.tsx
   ls -la src/components/Focusable.tv.tsx
   ```

3. Check barrel exports (index.ts files):
   ```typescript
   // components/index.ts
   export { default as Focusable } from './Focusable';
   // Metro will auto-resolve to .tv.tsx on TV
   ```

---

### Issue: Platform Check Still Exists

**Problem:** After refactoring, `Platform.isTV` still shows up in code.

**Solution:**
1. Search for remaining checks:
   ```bash
   grep -n "Platform\.isTV" src/components/Focusable.tsx
   grep -n "Platform\.isTV" src/components/Focusable.tv.tsx
   ```

2. Remove them - they shouldn't be needed:
   ```typescript
   // ❌ Remove this from .tv.tsx
   if (Platform.isTV) {
     // This entire file IS TV-specific!
   }

   // ✅ Just write TV code directly
   // This file only loads on TV platform
   ```

---

### Issue: Features Missing on One Platform

**Problem:** Feature works on mobile but not TV (or vice versa).

**Solution:**
1. Check if feature is in shared code:
   ```typescript
   // ComponentName.shared.ts
   export const useSharedFeature = () => {
     // Logic here is accessible to both
   };
   ```

2. Verify both versions implement the feature:
   ```typescript
   // Both ComponentName.tsx and ComponentName.tv.tsx should:
   import { useSharedFeature } from './ComponentName.shared';

   const feature = useSharedFeature();
   ```

3. Test on actual device (emulator might behave differently)

---

## Common Issues

### Issue: Metro Cache Problems

**Symptoms:**
- Old code still running after changes
- Wrong file being loaded
- Stale imports

**Fix:**
```bash
# Nuclear option - clear everything
rm -rf node_modules
rm -rf .expo
rm -rf android/build
rm -rf ios/build
npm install
APP_VARIANT=tv npx expo start --clear
```

---

### Issue: Import Loops

**Symptoms:**
- "Cannot access before initialization" error
- Undefined component errors
- Circular dependency warnings

**Fix:**
```typescript
// ❌ Don't do this - creates loop
// ComponentName.tv.tsx importing from ComponentName.tsx
import { helper } from './ComponentName';

// ✅ Do this instead - use shared file
// ComponentName.shared.ts
export const helper = () => { /* ... */ };

// Both files import from shared
import { helper } from './ComponentName.shared';
```

---

### Issue: Environment Variable Not Set

**Symptoms:**
- TV build loading mobile files
- `APP_VARIANT` not recognized

**Fix:**
```bash
# Make sure APP_VARIANT is set before expo command
APP_VARIANT=tv npx expo start --clear

# Or add to package.json scripts (already done):
"start:tv": "APP_VARIANT=tv npx expo start --clear"

# Then use:
npm run start:tv
```

---

## Automated Testing

### Bash Script: Verify Pattern Compliance

Create `scripts/verify-platform-abstraction.sh`:

```bash
#!/bin/bash
# Verify platform abstraction pattern compliance

set -e

echo "🔍 Verifying Platform Abstraction Pattern..."
echo ""

# Count Platform.isTV in non-.tv files (excluding utilities)
echo "1. Checking for Platform.isTV in non-.tv files..."
RESULTS=$(grep -r "Platform\.isTV" src/ \
  --include="*.tsx" --include="*.ts" \
  | grep -v ".tv.tsx" \
  | grep -v ".tv.ts" \
  | grep -v "moduleResolver.ts" \
  | grep -v "deviceDetection.ts" \
  | grep -v "useTVMode.ts" \
  | grep -v "useTVEventHandler.ts" \
  | grep -v "useSpatialNavigation.ts" \
  | grep -v "TVNavigationContext.tsx" \
  || true)

if [ -z "$RESULTS" ]; then
  echo "   ✅ No Platform.isTV found in component files"
else
  echo "   ❌ Found Platform.isTV in component files:"
  echo "$RESULTS"
  exit 1
fi

echo ""
echo "2. Checking for .shared.ts files for refactored components..."
# Check if Focusable.shared.ts exists
if [ -f "src/components/common/Focusable.shared.ts" ]; then
  echo "   ✅ Focusable.shared.ts exists"
else
  echo "   ⚠️  Focusable.shared.ts missing"
fi

echo ""
echo "3. Checking file pairs (TV + Mobile versions)..."
# Check if TV version has corresponding mobile version
for tvfile in $(find src -name "*.tv.tsx" -o -name "*.tv.ts"); do
  base="${tvfile%.tv.tsx}"
  base="${base%.tv.ts}"
  mobilefile="${base}.tsx"
  if [ ! -f "$mobilefile" ]; then
    mobilefile="${base}.ts"
  fi

  if [ -f "$mobilefile" ]; then
    echo "   ✅ $tvfile <-> $mobilefile"
  else
    echo "   ❌ $tvfile has no mobile counterpart"
    exit 1
  fi
done

echo ""
echo "4. Verifying metro.config.js..."
if grep -q "'tv.tsx'" metro.config.js && grep -q "'tv.ts'" metro.config.js; then
  echo "   ✅ metro.config.js has tv.tsx and tv.ts in sourceExts"
else
  echo "   ❌ metro.config.js missing TV extensions"
  exit 1
fi

echo ""
echo "✅ All platform abstraction checks passed!"
echo ""
echo "📊 Summary:"
echo "   - No inline Platform.isTV checks in components"
echo "   - All .tv files have mobile counterparts"
echo "   - Metro config is correct"
echo ""
echo "Next: Test both platforms with:"
echo "   npm run start      # Mobile"
echo "   npm run start:tv   # TV"
```

**Usage:**
```bash
chmod +x scripts/verify-platform-abstraction.sh
./scripts/verify-platform-abstraction.sh
```

---

### Pre-Commit Hook (Optional)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Pre-commit hook to verify platform abstraction

echo "Running platform abstraction verification..."

# Run verification script
if [ -f "scripts/verify-platform-abstraction.sh" ]; then
  ./scripts/verify-platform-abstraction.sh
  if [ $? -ne 0 ]; then
    echo "❌ Platform abstraction verification failed"
    echo "Fix the issues above before committing"
    exit 1
  fi
fi

echo "✅ Platform abstraction verification passed"
```

---

## Testing Best Practices

### 1. Test on Real Devices

Emulators/simulators may not accurately reflect platform behavior:

- **TV:** Test on actual Android TV or Apple TV hardware
- **Mobile:** Test on physical phones and tablets
- **Focus Behavior:** TV focus management differs on real hardware

### 2. Test After Every Refactoring

Don't batch refactorings without testing:

```bash
# After refactoring Component1
npm run start      # Test mobile
npm run start:tv   # Test TV

# Then refactor Component2
# Test again...
```

### 3. Use Debug Logging Liberally

Add logging during development:

```typescript
if (__DEV__) {
  console.log('[Component] Platform:', Platform.OS, 'isTV:', Platform.isTV);
  console.log('[Component] Loaded:', getResolvedPath('Component', __filename));
}
```

### 4. Document Decisions

Update MIGRATION_STATUS.md when:
- Refactoring a component
- Deciding to keep inline checks
- Encountering issues

### 5. Progressive Testing

Test incrementally:
1. Refactor one component
2. Test both platforms
3. Commit changes
4. Move to next component

Don't refactor 10 components and then test!

---

## Platform-Specific Testing Scenarios

### TV Platform Testing

**Spatial Navigation:**
- [ ] D-pad up/down/left/right works
- [ ] Focus moves between components correctly
- [ ] Focus wraps at grid edges (if applicable)
- [ ] Back button returns to previous screen

**Focus Visual Feedback:**
- [ ] Focus ring/border visible
- [ ] Focus scale animation smooth
- [ ] Focused item clearly distinguishable
- [ ] Focus state persists correctly

**Remote Control:**
- [ ] Select button triggers onPress
- [ ] Long press works (if applicable)
- [ ] Menu button behavior correct
- [ ] Play/pause buttons work (if applicable)

**Layout:**
- [ ] Grid columns correct (e.g., 6 for TV)
- [ ] Font sizes appropriate for 10-foot viewing
- [ ] Spacing adequate for focus rings
- [ ] No overflow or clipping issues

---

### Mobile Platform Testing

**Touch Gestures:**
- [ ] Tap triggers onPress
- [ ] Long press works
- [ ] Scroll gestures smooth
- [ ] Swipe gestures work

**Visual Feedback:**
- [ ] Press opacity change visible
- [ ] No focus rings (TV-only)
- [ ] Touch target sizes appropriate
- [ ] Feedback immediate

**Layout:**
- [ ] Grid columns correct (e.g., 3 for mobile)
- [ ] Font sizes readable on small screens
- [ ] Compact layout utilized
- [ ] Responsive to screen orientation

---

## Continuous Integration (CI)

### GitHub Actions Example

```yaml
name: Platform Abstraction Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Verify Platform Abstraction
        run: ./scripts/verify-platform-abstraction.sh

      - name: TypeScript Check
        run: npx tsc --noEmit

      - name: Lint Check
        run: npx eslint src/
```

---

## Summary

✅ **Key Testing Commands:**
```bash
# Mobile dev
npm run start

# TV dev
npm run start:tv

# Verify pattern
./scripts/verify-platform-abstraction.sh

# Count remaining checks
grep -r "Platform\.isTV" src/ | grep -v ".tv.tsx" | wc -l
```

✅ **Testing Checklist:**
- Build both platforms
- Test on real devices
- Verify Metro resolution
- Check visual differences
- Confirm no regressions
- Update migration docs

✅ **Debug Tips:**
- Use verbose Metro logs
- Add runtime logging
- Clear cache frequently
- Test incrementally
- Document issues

---

*For pattern details, see `/src/PLATFORM_ABSTRACTION_PATTERN.md`*
*For migration tracking, see `/MIGRATION_STATUS.md`*
