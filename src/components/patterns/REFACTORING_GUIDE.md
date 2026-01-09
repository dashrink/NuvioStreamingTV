# TV Code Refactoring Guide: .tv.tsx Pattern

This guide explains how to refactor components to use the `.tv.tsx` pattern for TV-specific implementations.

## Overview

The goal is to extract TV-specific code into separate files using this naming convention:
- **Standard version**: `MyComponent.tsx` or `myUtils.ts`
- **TV version**: `MyComponent.tv.tsx` or `myUtils.tv.ts`

Metro bundler automatically selects the appropriate version based on platform.

## Quick Start

### 1. Simple Component Extraction

**Before:**
```typescript
// MyComponent.tsx
const MyComponent = ({ items }) => {
  const isTV = Platform.isTV;

  return (
    <View style={isTV ? styles.tvContainer : styles.mobileContainer}>
      {isTV ? (
        <FocusableGrid items={items} />
      ) : (
        <ScrollableGrid items={items} />
      )}
    </View>
  );
};
```

**After:**

Create two separate files:

**MyComponent.tsx** (Standard version):
```typescript
export const MyComponent = ({ items }) => {
  return (
    <View style={styles.mobileContainer}>
      <ScrollableGrid items={items} />
    </View>
  );
};
```

**MyComponent.tv.tsx** (TV version):
```typescript
import { Focusable, useSpatialNavigation } from '@tv';

export const MyComponent = ({ items }) => {
  const { focusedIndex } = useSpatialNavigation(items.length, { itemsPerRow: 6 });

  return (
    <View style={styles.tvContainer}>
      <FocusableGrid items={items} focusedIndex={focusedIndex} />
    </View>
  );
};
```

### 2. Utility/Styling Extraction

**Before:**
```typescript
// playerStyles.ts
const isTV = deviceType === 'tv';

export const BUTTON_SIZE = isTV ? 56 : 44;
export const BUTTON_PADDING = isTV ? 24 : 16;
```

**After:**

**playerStyles.ts** (Standard version):
```typescript
export const BUTTON_SIZE = 44;
export const BUTTON_PADDING = 16;
```

**playerStyles.tv.ts** (TV version):
```typescript
export const BUTTON_SIZE = 56;
export const BUTTON_PADDING = 24;
```

### 3. Hook Extraction

**Before:**
```typescript
// useNavigation.ts
export const useNavigation = () => {
  const isTV = Platform.isTV;

  const handleNavigate = useCallback((direction) => {
    if (isTV) {
      handleDPadNavigation(direction);
    } else {
      handleTouchNavigation(direction);
    }
  }, [isTV]);

  return { handleNavigate };
};
```

**After:**

**useNavigation.ts** (Standard version):
```typescript
export const useNavigation = () => {
  const handleNavigate = useCallback((direction) => {
    handleTouchNavigation(direction);
  }, []);

  return { handleNavigate };
};
```

**useNavigation.tv.ts** (TV version):
```typescript
export const useNavigation = () => {
  const handleNavigate = useCallback((direction) => {
    handleDPadNavigation(direction);
  }, []);

  return { handleNavigate };
};
```

## Best Practices

### 1. Shared Props Interface

Always define shared props in a comments or separate file:

```typescript
// MyComponent.shared.ts or inline comments
/**
 * Shared props for MyComponent
 * Both standard and TV versions must support these props
 */
interface MyComponentProps {
  items: Item[];
  onItemPress: (item: Item) => void;
  title: string;
}
```

Then use the same interface in both `.tsx` and `.tv.tsx`:

```typescript
// MyComponent.tsx
export const MyComponent: React.FC<MyComponentProps> = (props) => {
  // Standard implementation
};

// MyComponent.tv.tsx
export const MyComponent: React.FC<MyComponentProps> = (props) => {
  // TV implementation
};
```

### 2. Export from Parent Directory

Create an `index.ts` in the component directory:

```typescript
// components/home/index.ts
export { CatalogSection } from './CatalogSection';
export { HeroCarousel } from './HeroCarousel';

// Metro will automatically resolve to:
// - CatalogSection.tv.tsx on TV platform
// - CatalogSection.tsx on other platforms
```

### 3. Shared Logic Pattern

When both versions need common logic, extract it:

```typescript
// useItemProcessing.shared.ts
export const processItem = (item: Item): ProcessedItem => {
  return { ...item, processed: true };
};

// useItemProcessing.ts (Standard)
import { processItem } from './useItemProcessing.shared';

export const useItemProcessing = (items: Item[]) => {
  return items.map(processItem);
};

// useItemProcessing.tv.ts (TV)
import { processItem } from './useItemProcessing.shared';

export const useItemProcessing = (items: Item[]) => {
  // Add TV-specific processing
  return items.map(item => ({
    ...processItem(item),
    focusable: true,
  }));
};
```

### 4. Using Module Resolver

For complex scenarios where Metro resolution isn't available:

```typescript
import { selectPlatformComponent } from '@utils/moduleResolver';

// Explicit platform selection
const CatalogSection = selectPlatformComponent(
  CatalogSectionTV,
  CatalogSectionStandard
);
```

## File Organization

```
src/
├── components/
│   ├── home/
│   │   ├── index.ts
│   │   ├── CatalogSection.tsx          # Standard
│   │   ├── CatalogSection.tv.tsx       # TV
│   │   ├── HeroCarousel.tsx            # Standard
│   │   ├── HeroCarousel.tv.tsx         # TV
│   │   └── types.ts                    # Shared types
│   │
│   ├── player/
│   │   ├── controls/
│   │   │   ├── PlayerControls.tsx      # Standard
│   │   │   ├── PlayerControls.tv.tsx   # TV
│   │   │   └── index.ts
│   │   │
│   │   └── utils/
│   │       ├── playerStyles.ts         # Standard styles
│   │       ├── playerStyles.tv.ts      # TV styles
│   │       └── index.ts
│   │
│   └── patterns/
│       ├── AbstractResponsiveComponent.ts
│       └── REFACTORING_GUIDE.md        # This file
│
└── hooks/
    ├── useSpatialNavigation.ts         # Standard
    ├── useSpatialNavigation.tv.ts      # TV (if needed)
    └── useNavigation.ts
```

## Type Safety

Use TypeScript to ensure both versions have compatible signatures:

```typescript
// Create a shared type
interface ComponentVersion<P> {
  (props: P): React.ReactElement;
}

// Standard version
const Standard: ComponentVersion<MyProps> = (props) => {
  // Must match this signature
};

// TV version
const TV: ComponentVersion<MyProps> = (props) => {
  // Must match this signature
};
```

## Testing

Test both versions independently:

```typescript
// MyComponent.test.ts
import { render, screen } from '@testing-library/react-native';
import { MyComponent } from './MyComponent';

describe('MyComponent - Standard', () => {
  test('renders scroll list', () => {
    render(<MyComponent items={mockItems} />);
    expect(screen.getByTestId('scroll-list')).toBeTruthy();
  });
});

// MyComponent.tv.test.ts
import { render, screen } from '@testing-library/react-native';
import { MyComponent } from './MyComponent.tv';

describe('MyComponent - TV', () => {
  test('renders focusable grid', () => {
    render(<MyComponent items={mockItems} />);
    expect(screen.getByTestId('focusable-grid')).toBeTruthy();
  });
});
```

## Common Patterns

### Pattern 1: Layout Differences

```typescript
// Standard: Scrollable vertical list
export const ItemList = ({ items }) => (
  <ScrollView>
    {items.map(item => <ItemCard key={item.id} item={item} />)}
  </ScrollView>
);

// TV: D-pad navigable grid
export const ItemList = ({ items }) => (
  <FocusableGrid
    items={items}
    columns={6}
    onItemPress={handleItemPress}
  />
);
```

### Pattern 2: Sizing Differences

```typescript
// Standard
export const BUTTON_SIZE = 44;
export const SPACING = 12;

// TV
export const BUTTON_SIZE = 56;
export const SPACING = 16;
```

### Pattern 3: Input Handling

```typescript
// Standard: Touch gestures
export const useInput = () => {
  const handlePress = () => { /* touch */ };
  return { handlePress };
};

// TV: D-pad/remote
export const useInput = () => {
  const handleKeyDown = (key) => { /* d-pad */ };
  return { handleKeyDown };
};
```

### Pattern 4: Conditional Features

```typescript
// Standard: Swipe gestures
export const usePan = () => {
  return PanResponder.create({ /* ... */ });
};

// TV: Remote buttons
export const usePan = () => {
  return useRemoteControl();
};
```

## Migration Checklist

- [ ] Identify component with TV conditional logic
- [ ] Create `.tv.tsx` or `.tv.ts` variant
- [ ] Extract TV-specific code to new file
- [ ] Define shared props/interface
- [ ] Implement standard version in original file
- [ ] Test both versions
- [ ] Remove conditional checks from original
- [ ] Update imports in parent files
- [ ] Run full test suite
- [ ] Test on both TV and standard devices

## Troubleshooting

### Metro Not Selecting Correct File

**Problem**: Metro is not picking up `.tv.tsx` file

**Solution**:
1. Check metro.config.js has `'tv.tsx'` in sourceExts first
2. Ensure file names are exactly `.tv.tsx` (not `.tv.tsx.ts` etc.)
3. Restart bundler: `npm start -- --reset-cache`

### Type Mismatches

**Problem**: TypeScript complaining about different signatures

**Solution**:
1. Use shared interface for both versions
2. Ensure both files export the same component name
3. Use `satisfies` operator for type checking

### Import Confusion

**Problem**: Hard to know which version is being imported

**Solution**:
1. Always import from index.ts barrel export
2. Use comments to indicate which version is loaded
3. Consider using module resolver explicitly in dev mode

## Tools and Utilities

### Using selectPlatformComponent

```typescript
import { selectPlatformComponent } from '@utils/moduleResolver';
import MyComponentStandard from './MyComponent';
import MyComponentTV from './MyComponent.tv';

export const MyComponent = selectPlatformComponent(
  MyComponentTV,
  MyComponentStandard
);
```

### Using getResponsiveValue

```typescript
import { getResponsiveValue } from '@utils/tvStyles';

const fontSize = getResponsiveValue({
  phone: 14,
  tablet: 16,
  largeTablet: 18,
  tv: 24,
  default: 14,
});
```

## Next Steps

1. Start with low-impact files (utility files, modals)
2. Move to medium-impact (components)
3. Finally refactor high-impact screens and hooks
4. Run full test suite after each major phase
5. Deploy and monitor performance

## Resources

- TV Navigation Infrastructure: `/src/tv/`
- Focus Components: `/src/components/common/Focusable.tsx`
- TV Styles: `/src/utils/tvStyles/`
- Module Resolver: `/src/utils/moduleResolver.ts`
- Abstract Patterns: `/src/components/patterns/`

