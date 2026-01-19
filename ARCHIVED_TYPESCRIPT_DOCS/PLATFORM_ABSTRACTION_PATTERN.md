# Platform Abstraction Pattern Guide

## Overview

This document describes the **Platform-Specific File Extension Pattern** used in NuvioStreamingTV to cleanly separate TV platform code from mobile/tablet code, eliminating the need for inline `Platform.isTV` conditionals.

## Table of Contents

- [Why This Pattern?](#why-this-pattern)
- [How It Works](#how-it-works)
- [File Naming Convention](#file-naming-convention)
- [Resolution Precedence](#resolution-precedence)
- [When to Use This Pattern](#when-to-use-this-pattern)
- [Project Structure](#project-structure)
- [Implementation Examples](#implementation-examples)
- [Shared Code Pattern](#shared-code-pattern)
- [Migration Guide](#migration-guide)
- [Testing & Verification](#testing--verification)
- [Best Practices](#best-practices)

---

## Why This Pattern?

### Problems with Inline Platform Checks

```typescript
// ❌ OLD PATTERN - Avoid this
const ItemWrapper = Platform.isTV ? Focusable : TouchableOpacity;
const fontSize = Platform.isTV ? 24 : 14;
const numColumns = Platform.isTV ? 6 : 3;

if (Platform.isTV) {
  // 50 lines of TV-specific logic
} else {
  // 50 lines of mobile-specific logic
}
```

**Problems:**
- Mixed concerns - TV and mobile logic intertwined
- Hard to maintain - changes affect both platforms
- Poor tree-shaking - both code paths bundled
- Difficult to test - need to mock `Platform.isTV` everywhere
- Cognitive overload - developers must understand both contexts simultaneously

### Benefits of File Extension Pattern

```typescript
// ✅ NEW PATTERN - Prefer this
// File: CatalogScreen.tv.tsx (TV-specific)
const ItemWrapper = Focusable;
const fontSize = 24;
const numColumns = 6;
// Only TV code here

// File: CatalogScreen.tsx (Mobile-specific)
const ItemWrapper = TouchableOpacity;
const fontSize = 14;
const numColumns = 3;
// Only mobile code here
```

**Benefits:**
- **Clear separation** - Each platform has its own file
- **Automatic resolution** - Metro bundler handles file selection
- **Better tree-shaking** - Only platform-specific code bundled
- **Easier testing** - Test each platform variant independently
- **Improved readability** - No conditional logic cluttering code
- **Better IDE support** - Clearer imports and references

---

## How It Works

Metro bundler (React Native's bundler) automatically resolves platform-specific files based on the file extension **before** the code runs.

### Example

Given this import:
```typescript
import CatalogScreen from './screens/CatalogScreen';
```

Metro will automatically resolve to:
- **TV Platform**: `CatalogScreen.tv.tsx` (if it exists)
- **Mobile Platform**: `CatalogScreen.tsx` (standard file)

No runtime checks needed! The decision happens at build time.

---

## File Naming Convention

### Standard Components
```
ComponentName.tsx         // Mobile/tablet version (fallback)
ComponentName.tv.tsx      // TV version (priority on TV platform)
ComponentName.shared.ts   // Shared types, interfaces, constants
```

### Hooks
```
useCustomHook.ts          // Mobile/tablet version
useCustomHook.tv.ts       // TV version
```

### Utilities & Styles
```
utilityFunction.ts        // Mobile/tablet version
utilityFunction.tv.ts     // TV version
styles.ts                 // Mobile/tablet styles
styles.tv.ts              // TV styles
```

### Important Rules
1. **Same export names** - Both files must export the same component/function name
2. **Compatible interfaces** - Both versions should accept the same props (use `.shared.ts`)
3. **No cross-imports** - `.tv.tsx` should not import from `.tsx` or vice versa
4. **Shared code** - Use `.shared.ts` files for common types, constants, and utilities

---

## Resolution Precedence

Metro bundler checks files in this order:

### On TV Platform (Platform.isTV === true)
1. `ComponentName.tv.tsx` ✅ **LOADS THIS if exists**
2. `ComponentName.tv.ts`
3. `ComponentName.tsx` (fallback)
4. `ComponentName.ts` (fallback)

### On Mobile/Tablet Platform (Platform.isTV === false)
1. `ComponentName.tsx` ✅ **LOADS THIS**
2. `ComponentName.ts`
3. `ComponentName.tv.tsx` (ignored)
4. `ComponentName.tv.ts` (ignored)

### Configuration

This is configured in `/metro.config.js`:
```javascript
config.resolver = {
  sourceExts: [
    'tv.tsx',    // TV-specific TypeScript React (highest priority)
    'tv.ts',     // TV-specific TypeScript
    'tsx',       // Standard TypeScript React
    'ts',        // Standard TypeScript
    'jsx',
    'js',
    'svg'
  ],
  // ... other config
};
```

---

## When to Use This Pattern

### ✅ Use `.tv.tsx` Pattern When:

1. **Significant UI differences**
   - Different layouts (grid vs list, spatial nav vs touch)
   - Different component structures
   - TV uses 10-foot UI, mobile uses compact UI

2. **Different interaction models**
   - TV uses D-pad/remote navigation
   - Mobile uses touch gestures
   - Different focus management

3. **Platform-specific features**
   - TV: Focusable components, spatial navigation
   - Mobile: TouchableOpacity, ScrollView gestures

4. **Large conditional blocks**
   - If you have `if (Platform.isTV)` blocks > 20 lines
   - Multiple scattered platform checks in one file

### ❌ Don't Use Pattern When:

1. **Small differences**
   - Single line conditionals (e.g., `fontSize: Platform.isTV ? 24 : 14`)
   - Better to use inline checks or configuration objects

2. **Shared logic dominant**
   - 90% of code is identical, only 10% differs
   - Use runtime helper functions from `moduleResolver.ts` instead

3. **Dynamic runtime decisions**
   - Feature flags, A/B tests, user preferences
   - These require runtime logic, not build-time resolution

---

## Project Structure

```
src/
├── screens/
│   ├── CatalogScreen.tsx         # Mobile version
│   ├── CatalogScreen.tv.tsx      # TV version
│   ├── CatalogScreen.shared.ts   # Shared types & constants
│   ├── MetadataScreen.tsx
│   ├── MetadataScreen.tv.tsx
│   └── MetadataScreen.shared.ts
├── components/
│   ├── common/
│   │   ├── Focusable.tsx         # Mobile fallback (simple Pressable)
│   │   ├── Focusable.tv.tsx      # TV with animations & spatial nav
│   │   └── Focusable.shared.ts   # Props interface
│   ├── tv/                       # TV-only components (no mobile version)
│   │   ├── TVLibraryGrid.tsx
│   │   ├── TVLibraryFolders.tsx
│   │   └── TVContinueWatchingSection.tsx
├── navigation/
│   ├── AppNavigator.tsx          # Mobile tab navigation
│   ├── AppNavigator.tv.tsx       # TV stack navigation (no tabs)
│   └── AppNavigator.shared.ts    # Route types
├── hooks/
│   ├── useTVMode.ts              # TV-only hook (no mobile version)
│   ├── useTVEventHandler.ts
│   └── useSpatialNavigation.ts
├── utils/
│   ├── moduleResolver.ts         # Runtime helpers (fallback)
│   └── tvStyles/                 # TV-specific styling utilities
└── PLATFORM_ABSTRACTION_PATTERN.md  # This file
```

---

## Implementation Examples

### Example 1: Simple Component Refactoring

#### Before (Bad - Mixed Platform Code)
```typescript
// CatalogItem.tsx
import { Platform, TouchableOpacity } from 'react-native';
import Focusable from './Focusable';

const CatalogItem: React.FC<Props> = ({ item, onPress }) => {
  const ItemWrapper = Platform.isTV ? Focusable : TouchableOpacity;
  const fontSize = Platform.isTV ? 18 : 14;
  const scale = Platform.isTV ? 1.08 : 1.0;

  return (
    <ItemWrapper onPress={onPress} scaleOnFocus={scale}>
      <Image source={{ uri: item.poster }} />
      <Text style={{ fontSize }}>{item.name}</Text>
    </ItemWrapper>
  );
};
```

#### After (Good - Separated Files)

**CatalogItem.shared.ts**
```typescript
// Shared types and interfaces
export interface CatalogItemProps {
  item: {
    id: string;
    name: string;
    poster: string;
  };
  onPress: () => void;
}
```

**CatalogItem.tsx** (Mobile)
```typescript
import { TouchableOpacity, Image, Text } from 'react-native';
import { CatalogItemProps } from './CatalogItem.shared';

const CatalogItem: React.FC<CatalogItemProps> = ({ item, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Image source={{ uri: item.poster }} />
      <Text style={{ fontSize: 14 }}>{item.name}</Text>
    </TouchableOpacity>
  );
};

export default CatalogItem;
```

**CatalogItem.tv.tsx** (TV)
```typescript
import { Image, Text } from 'react-native';
import Focusable from './Focusable';
import { CatalogItemProps } from './CatalogItem.shared';

const CatalogItem: React.FC<CatalogItemProps> = ({ item, onPress }) => {
  return (
    <Focusable onPress={onPress} scaleOnFocus={1.08}>
      <Image source={{ uri: item.poster }} />
      <Text style={{ fontSize: 18 }}>{item.name}</Text>
    </Focusable>
  );
};

export default CatalogItem;
```

**Usage (Same on Both Platforms)**
```typescript
// Consumer code doesn't change!
import CatalogItem from './components/CatalogItem';
// Metro automatically loads CatalogItem.tv.tsx on TV
// and CatalogItem.tsx on mobile
```

---

### Example 2: Screen with Shared Logic

**CatalogScreen.shared.ts**
```typescript
// Shared interfaces
export interface CatalogScreenProps {
  route: RouteProp<RootStackParamList, 'Catalog'>;
  navigation: StackNavigationProp<RootStackParamList, 'Catalog'>;
}

// Shared data fetching
export const useCatalogData = (catalogId: string) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalogItems(catalogId).then(setItems).finally(() => setLoading(false));
  }, [catalogId]);

  return { items, loading };
};

// Shared constants (platform-agnostic)
export const CATALOG_CONSTANTS = {
  ITEM_LIMIT: 100,
  CACHE_DURATION: 5 * 60 * 1000,
};
```

**CatalogScreen.tsx** (Mobile)
```typescript
import { FlatList, TouchableOpacity } from 'react-native';
import { CatalogScreenProps, useCatalogData } from './CatalogScreen.shared';

const CatalogScreen: React.FC<CatalogScreenProps> = ({ route }) => {
  const { items, loading } = useCatalogData(route.params.catalogId);

  return (
    <FlatList
      data={items}
      numColumns={3}
      renderItem={({ item }) => (
        <TouchableOpacity>
          {/* Mobile layout */}
        </TouchableOpacity>
      )}
    />
  );
};

export default CatalogScreen;
```

**CatalogScreen.tv.tsx** (TV)
```typescript
import { FlashList } from '@shopify/flash-list';
import Focusable from '../components/Focusable';
import { CatalogScreenProps, useCatalogData } from './CatalogScreen.shared';

const CatalogScreen: React.FC<CatalogScreenProps> = ({ route }) => {
  const { items, loading } = useCatalogData(route.params.catalogId);

  return (
    <FlashList
      data={items}
      numColumns={6}
      renderItem={({ item }) => (
        <Focusable nextFocusDown={...} nextFocusRight={...}>
          {/* TV layout with spatial navigation */}
        </Focusable>
      )}
    />
  );
};

export default CatalogScreen;
```

---

## Shared Code Pattern

### What Goes in `.shared.ts` Files?

✅ **Include:**
- TypeScript interfaces and types
- Shared constants (not platform-dependent)
- Shared data fetching logic
- Business logic (not UI-related)
- Shared utility functions
- PropTypes / validation schemas

❌ **Don't Include:**
- UI components
- Platform-specific styling
- Platform-specific constants (e.g., grid columns, font sizes)
- Render logic

### Example Shared File

```typescript
// PlayerControls.shared.ts
export interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (position: number) => void;
  duration: number;
  position: number;
}

export const usePlayerState = (videoId: string) => {
  // Shared hook logic
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  return { isPlaying, position, setIsPlaying, setPosition };
};

export const PLAYER_CONSTANTS = {
  SEEK_INTERVAL: 10,
  VOLUME_STEP: 0.1,
};
```

---

## Migration Guide

### Step-by-Step Refactoring Process

1. **Identify Platform Conditionals**
   ```bash
   # Find all Platform.isTV checks
   grep -r "Platform\.isTV" src/ --include="*.tsx" --include="*.ts"
   ```

2. **Create Shared Types File**
   ```typescript
   // ComponentName.shared.ts
   export interface ComponentNameProps {
     // Props used by both versions
   }

   export const sharedConstants = {
     // Constants used by both versions
   };
   ```

3. **Split TV Version**
   ```bash
   # Copy original file to .tv.tsx
   cp src/screens/CatalogScreen.tsx src/screens/CatalogScreen.tv.tsx
   ```

4. **Remove TV Code from Mobile Version**
   - Open `ComponentName.tsx`
   - Remove all `Platform.isTV === true` branches
   - Keep only mobile/tablet logic
   - Import from `.shared.ts`

5. **Remove Mobile Code from TV Version**
   - Open `ComponentName.tv.tsx`
   - Remove all `Platform.isTV === false` branches
   - Keep only TV logic
   - Import from `.shared.ts`

6. **Test Both Platforms**
   ```bash
   # Test mobile
   npm run start

   # Test TV
   npm run start:tv
   ```

7. **Verify No Conditionals Remain**
   ```bash
   # Check mobile file
   grep "Platform\.isTV" src/screens/CatalogScreen.tsx
   # Should return nothing

   # Check TV file
   grep "Platform\.isTV" src/screens/CatalogScreen.tv.tsx
   # Should return nothing
   ```

---

## Testing & Verification

### 1. Build-Time Verification

Check which files Metro is loading:
```bash
# Start with verbose logging
APP_VARIANT=tv npx expo start --clear --verbose
```

Metro will show which files it resolves:
```
[Metro] Resolving module './screens/CatalogScreen'
[Metro] Found: ./screens/CatalogScreen.tv.tsx
```

### 2. Runtime Verification

Add debug logging in component:
```typescript
// CatalogScreen.tsx or CatalogScreen.tv.tsx
import { getResolvedPath } from '../utils/moduleResolver';

useEffect(() => {
  if (__DEV__) {
    const resolved = getResolvedPath('CatalogScreen', __filename);
    console.log('[CatalogScreen] Loaded:', resolved);
  }
}, []);
```

Expected output:
- **TV**: `[CatalogScreen] Loaded: CatalogScreen.tv.tsx`
- **Mobile**: `[CatalogScreen] Loaded: CatalogScreen.tsx`

### 3. Test Commands

```bash
# Test on TV platform
npm run start:tv
# or
APP_VARIANT=tv npx expo start --clear

# Build TV-specific native project
npm run prebuild:tv
# or
APP_VARIANT=tv npx expo prebuild --clean

# Test on mobile/tablet
npm run start
```

### 4. Automated Verification Script

```bash
#!/bin/bash
# verify-platform-separation.sh

echo "Checking for Platform.isTV in non-.tv files..."

# Should return 0 results
results=$(grep -r "Platform\.isTV" src/ \
  --include="*.tsx" --include="*.ts" \
  | grep -v ".tv.tsx" \
  | grep -v ".tv.ts" \
  | grep -v "moduleResolver.ts" \
  | grep -v "deviceDetection.ts")

if [ -z "$results" ]; then
  echo "✅ Success: No Platform.isTV found in non-.tv files"
  exit 0
else
  echo "❌ Failed: Found Platform.isTV in non-.tv files:"
  echo "$results"
  exit 1
fi
```

---

## Best Practices

### 1. Consistent Export Names
```typescript
// ✅ Good - Same export name
// CatalogScreen.tsx
export default CatalogScreen;

// CatalogScreen.tv.tsx
export default CatalogScreen; // Same name!
```

```typescript
// ❌ Bad - Different export names
// CatalogScreen.tsx
export default CatalogScreen;

// CatalogScreen.tv.tsx
export default TVCatalogScreen; // Different name breaks imports!
```

### 2. Use Barrel Exports
```typescript
// components/index.ts
export { default as CatalogItem } from './CatalogItem';
// Metro will automatically load CatalogItem.tv.tsx on TV
```

### 3. Document Platform Differences
```typescript
// CatalogScreen.tv.tsx
/**
 * TV-optimized Catalog Screen
 *
 * Key differences from mobile version:
 * - 6-column grid (vs 3-column mobile)
 * - Focusable components with spatial navigation
 * - Larger fonts for 10-foot viewing
 * - D-pad navigation instead of touch
 */
```

### 4. Keep Interfaces in Sync
```typescript
// CatalogScreen.shared.ts
export interface CatalogScreenProps {
  // Document props used by both versions
  catalogId: string;
  onItemPress: (id: string) => void;
}

// Both CatalogScreen.tsx and CatalogScreen.tv.tsx
// must implement this interface
```

### 5. Avoid Cross-Platform Imports
```typescript
// ❌ Bad - .tv.tsx importing from .tsx
// CatalogScreen.tv.tsx
import { someHelper } from './CatalogScreen'; // DON'T DO THIS

// ✅ Good - Use shared file
// CatalogScreen.shared.ts
export const someHelper = () => { /* ... */ };

// CatalogScreen.tv.tsx
import { someHelper } from './CatalogScreen.shared';
```

### 6. Progressive Migration
- Don't try to refactor everything at once
- Start with high-impact files (many conditionals)
- Test thoroughly after each refactoring
- Use migration tracking document (see MIGRATION_STATUS.md)

### 7. Fallback for Runtime Checks
For rare cases where you still need runtime checks:
```typescript
import { selectPlatformValue } from '../utils/moduleResolver';

// Small differences can still use runtime helpers
const fontSize = selectPlatformValue(24, 14);
const padding = selectPlatformValue(16, 8);
```

---

## FAQs

### Q: Do I need to create both `.tsx` and `.tv.tsx` for every component?
**A:** No! Only create `.tv.tsx` when there are significant platform differences. If a component is identical or nearly identical, just use `.tsx`.

### Q: What happens if only `.tv.tsx` exists?
**A:** Mobile platforms will fail to find the component and throw an error. Always provide a standard `.tsx` fallback.

### Q: Can I have `.android.tsx` and `.ios.tsx` alongside `.tv.tsx`?
**A:** Yes, but precedence matters. Metro checks `.tv.tsx` first on TV platforms, then falls back to `.android.tsx` or `.ios.tsx` based on OS.

### Q: How do I test that the right file is loaded?
**A:** Use the `getResolvedPath()` helper or check Metro's verbose logs.

### Q: Should hooks use `.tv.ts` pattern?
**A:** Only if the hook has platform-specific logic. Most hooks can be shared since they're business logic, not UI.

### Q: What about styles?
**A:** You can use `.tv.ts` for style files if TV styles are significantly different. Otherwise, use runtime helpers like `selectPlatformValue()`.

---

## Related Documents

- **Migration Tracking**: See `/MIGRATION_STATUS.md` for refactoring progress
- **Testing Guide**: See `/TESTING_PLATFORM_ABSTRACTION.md` for testing strategies
- **Module Resolver**: See `/src/utils/moduleResolver.ts` for runtime helpers
- **Metro Config**: See `/metro.config.js` for bundler configuration

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│              Metro Bundler (Build Time)             │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   TV Platform              Mobile Platform
        │                         │
        ▼                         ▼
  ┌─────────────┐          ┌──────────────┐
  │ App.tv.tsx  │          │   App.tsx    │
  └─────────────┘          └──────────────┘
        │                         │
        ▼                         ▼
┌──────────────────┐       ┌──────────────┐
│ Component.tv.tsx │       │Component.tsx │
│ (TV-specific)    │       │  (Mobile)    │
└────────┬─────────┘       └──────┬───────┘
         │                        │
         └────────┬───────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │ Component.shared │
        │  (Common Types)  │
        └──────────────────┘
```

---

## Summary

✅ **Use `.tv.tsx` pattern for:**
- Significant UI/UX differences between TV and mobile
- Different component structures and layouts
- Platform-specific interactions (D-pad vs touch)

✅ **Benefits:**
- Cleaner code - no inline conditionals
- Better tree-shaking - smaller bundles
- Easier testing - test platforms independently
- Improved maintainability - clear separation of concerns

✅ **Key Points:**
- Metro handles resolution automatically at build time
- No runtime performance cost
- Same exports required in both files
- Use `.shared.ts` for common code
- Progressive migration - refactor incrementally

---

*For questions or suggestions, see the project's main README or contact the development team.*
