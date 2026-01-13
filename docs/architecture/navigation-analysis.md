# Navigation Architecture Analysis

## Overview

This document provides a comprehensive analysis of the navigation architecture and routing patterns used in the NuvioStreamingTV React Native application. The app implements a sophisticated hybrid navigation system with platform-specific optimizations for iOS, Android, and TV platforms.

## Navigation Stack Hierarchy

### Root Structure

```
App (Root)
├── NavigationContainer
│   ├── AppNavigator (Stack Navigator)
│   │   ├── Onboarding
│   │   ├── ProfileSelector (conditional)
│   │   ├── MainTabs (Tab Navigator)
│   │   │   ├── Home
│   │   │   ├── Library
│   │   │   ├── Search
│   │   │   ├── Downloads (conditional)
│   │   │   └── Settings
│   │   └── Modal/Screen Stack (20+ screens)
```

### Navigation Libraries

- **Primary**: `@react-navigation/native` (v6.x)
- **Stack**: `@react-navigation/native-stack`
- **Tabs (Android)**: `@react-navigation/bottom-tabs`
- **Tabs (iOS)**: `@bottom-tabs/react-navigation` (native bottom tabs)
- **Supporting**: `react-native-screens` (native optimization)

## Route Definitions

### Root Stack Navigator (`RootStackParamList`)

The app uses a centrally-defined TypeScript type for all routes with strongly-typed parameters:

```typescript
export type RootStackParamList = {
  // Onboarding & Auth
  Onboarding: undefined;
  ProfileSelector: undefined;
  Account: undefined;
  AccountManage: undefined;

  // Main Navigation
  MainTabs: undefined;

  // Content Screens
  Metadata: {
    id: string;
    type: string;
    episodeId?: string;
    addonId?: string;
  };

  Streams: {
    id: string;
    type: string;
    title?: string;
    episodeId?: string;
    episodeThumbnail?: string;
    fromPlayer?: boolean;
    metadata?: object;
    resumeTime?: number;
    duration?: number;
  };

  // Video Players
  PlayerIOS: { /* 15+ params */ };
  PlayerAndroid: { /* 15+ params */ };

  // Catalog & Discovery
  Catalog: { id: string; type: string; addonId?: string; name?: string; genreFilter?: string };
  Search: undefined;
  Calendar: undefined;

  // Settings Screens (13 total)
  Settings: undefined;
  CatalogSettings: undefined;
  NotificationSettings: undefined;
  // ... (10+ more settings screens)

  // Additional Screens
  CastMovies: { castMember: object };
  AIChat: { contentId: string; contentType: 'movie' | 'series'; /* ... */ };
  BackdropGallery: { tmdbId: number; type: 'movie' | 'tv'; title: string };
  Contributors: undefined;
  DebridIntegration: undefined;
};
```

### Tab Navigator (`MainTabParamList`)

```typescript
export type MainTabParamList = {
  Home: undefined;
  Library: undefined;
  Search: undefined;
  Downloads: undefined;  // Conditional based on settings
  Settings: undefined;
};
```

## Navigation Flow & Guards

### Initial Route Logic

The app implements a sophisticated initialization flow in `App.tsx`:

1. **Splash Screen** → Shows during initialization
2. **Onboarding Check** → If first launch, show onboarding
3. **Profile Selection** → If no active profile, show profile selector
4. **Main App** → If onboarded and profile selected, show MainTabs

```typescript
// App.tsx initialization flow
useEffect(() => {
  const initializeApp = async () => {
    // Check onboarding status
    const onboardingCompleted = await mmkvStorage.getItem('hasCompletedOnboarding');
    setHasCompletedOnboarding(onboardingCompleted === 'true');

    // Load profiles (sets active profile state)
    await loadProfiles();

    // Initialize services
    await UpdateService.initialize();
    memoryMonitorService.start();
    await aiService.initialize();
  };

  initializeApp();
}, []);
```

### Conditional Routing

The app uses several conditional rendering patterns:

1. **Downloads Tab**: Only shown if `settings.enableDownloads !== false`
2. **Profile Selector**: Required if no active profile exists
3. **Onboarding**: Required on first launch
4. **Platform-Specific Players**: `PlayerIOS` vs `PlayerAndroid`

## Platform-Specific Navigation

### iOS Navigation

#### Native Bottom Tabs
```typescript
const { createNativeBottomTabNavigator } = require('@bottom-tabs/react-navigation');
const IOSTab = createNativeBottomTabNavigator();

// Uses SF Symbols for icons
<IOSTab.Screen
  name="Home"
  options={{
    tabBarIcon: () => ({ sfSymbol: 'house' }),
  }}
/>
```

**Features:**
- Native iOS bottom tab bar with blur effects
- SF Symbol icons
- System-level haptics
- Native animations
- Translucent background with blur

#### Glass/Blur Effects
- Uses `expo-glass-effect` when available (liquid glass effect)
- Falls back to `expo-blur` (BlurView)
- Custom glass morphism for floating navigation on tablets

### Android Navigation

#### Custom Bottom Tabs
```typescript
const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom render function with LinearGradient
const renderTabBar = (props: BottomTabBarProps) => {
  return (
    <View>
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.98)']}
      />
      {/* Custom tab items */}
    </View>
  );
};
```

**Features:**
- Custom-rendered tab bar with gradient background
- Material Community Icons
- Animated focus states with spring animations
- D-pad navigation support
- Immersive mode integration

### TV Platform Navigation

The app implements comprehensive TV-specific navigation optimizations:

#### TV Navigation Context (`TVNavigationContext`)

Provides centralized TV navigation state management:

```typescript
interface TVNavigationContextValue {
  // Focus Management
  focusHistory: FocusHistoryEntry[];
  focusMemory: FocusMemoryMap;
  currentFocusId: string | null;

  // Voice Search (TV remotes)
  voiceSearch: VoiceSearchState;
  openVoiceSearch: () => void;
  closeVoiceSearch: () => void;

  // Context Menus (long-press on TV)
  contextMenu: ContextMenuState;
  openContextMenu: (config) => void;
  closeContextMenu: () => void;

  // Platform Detection
  isTV: boolean;
}
```

#### TV Focus System

**Focusable Component**:
- Wraps interactive elements with TV remote focus indicators
- Animated border, scale, and glow effects
- Supports multiple variants: `card`, `button`, `listItem`, `hero`, `nav`
- Platform-aware (zero overhead on non-TV platforms)

```typescript
<Focusable
  variant="card"
  onPress={handlePress}
  hasTVPreferredFocus={isFirst}
  nextFocusDown={nextItemId}  // Android TV D-pad
  tvParallaxProperties={{ ... }}  // tvOS parallax
>
  <ContentCard />
</Focusable>
```

**Focus Navigation**:
- **Focus History**: Stack-based focus history for back navigation
- **Focus Memory**: Remembers last focused element per screen
- **Spatial Navigation**: D-pad directional focus (Android TV)
- **Parallax Effects**: Siri Remote tilt effects (tvOS)

#### TV-Specific Screens

The app uses platform-specific file extensions:
- `.tv.tsx` - TV-optimized versions of screens
- Examples: `HomeScreen.tv.tsx`, `MetadataScreen.tv.tsx`, `SearchScreen.tv.tsx`

**TV Screen Features**:
- Grid-based layouts optimized for 10-foot UI
- Larger touch targets (min 80x80dp)
- Focus-first interaction model
- Voice search integration
- D-pad/remote control navigation

#### TV Back Handler

```typescript
// useTVMode hook
const useTVMode = () => {
  useEffect(() => {
    // Android TV back button
    BackHandler.addEventListener('hardwareBackPress', backAction);

    // Apple TV menu button
    if (Platform.OS === 'ios' && evt.eventType === 'menu') {
      backAction();
    }
  }, []);
};
```

### Tablet Navigation

**Floating Top Navigation Bar**:
- Text-only pill navigation for tablets
- Positioned at top with glass/blur effect
- Profile switcher integrated into nav bar
- Animated hide/show based on scroll position

```typescript
// Tablet detection
const isTablet = useMemo(() => {
  const { width, height } = dimensions;
  const smallestDimension = Math.min(width, height);
  return Platform.OS === 'ios'
    ? Platform.isPad === true
    : smallestDimension >= 768;
}, [dimensions]);

// Top floating nav for tablets
if (isTablet) {
  return (
    <Animated.View style={{ top: insets.top + 12 }}>
      {/* Pill-shaped nav bar */}
    </Animated.View>
  );
}
```

## Animation & Transitions

### Screen Transitions

Platform-specific animation configurations:

```typescript
// iOS - Smooth slide transitions
animation: 'slide_from_right',
animationDuration: 300,

// Android - Faster, optimized transitions
animation: 'slide_from_right',
animationDuration: 250,

// Modal presentations
presentation: Platform.OS === 'ios' ? 'modal' : 'card',

// Custom interpolators for specific screens
cardStyleInterpolator: customFadeInterpolator,
```

### Tab Transitions

Custom tab switching animations with opacity and scale:

```typescript
sceneStyleInterpolator: ({ current }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0, 1, 0],
    }),
    transform: [{
      scale: current.progress.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [0.95, 1, 0.95],
      }),
    }],
  },
}),
```

### Focus Animations

TV focus uses Reanimated 2 for smooth 60fps animations:

```typescript
const animatedFocusStyle = useAnimatedStyle(() => {
  const scale = interpolate(focusAnim.value, [0, 1], [1.0, 1.08]);
  const borderColor = interpolateColor(
    focusAnim.value,
    [0, 1],
    ['transparent', colors.primary]
  );
  return { transform: [{ scale }], borderColor };
}, [focusAnim]);
```

## Performance Optimizations

### Screen Freezing

Prevents background re-renders:

```typescript
screenOptions={{
  freezeOnBlur: true,  // Freeze inactive screens
  lazy: true,          // Lazy load tabs
  detachInactiveScreens: true,  // Unmount inactive screens
}}
```

### Native Screen Containers

```typescript
enableScreens(true);  // react-native-screens optimization
enableFreeze(true);   // Freeze background screens
```

### Platform-Specific Optimizations

- **iOS**: Native bottom tabs for better performance
- **Android**: Custom tab bar to avoid extra view hierarchy
- **TV**: Optimized focus tracking with minimal re-renders

## Deep Linking

### Current State

The app does **not currently implement deep linking**. There is no `linking` configuration in the `NavigationContainer`.

### Potential Deep Link Structure

Based on the route definitions, a potential linking structure could be:

```typescript
const linking = {
  prefixes: ['nuvio://', 'https://nuvio.app'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Library: 'library',
          Search: 'search',
          Settings: 'settings',
        },
      },
      Metadata: 'content/:type/:id',
      Streams: 'streams/:type/:id',
      Catalog: 'catalog/:addonId/:type/:id',
      PlayerIOS: 'play',
      PlayerAndroid: 'play',
    },
  },
};

// Example URLs:
// nuvio://content/movie/tt1234567
// nuvio://catalog/community.iptv/movie/top
// https://nuvio.app/search?q=inception
```

## TV vs Mobile Navigation Differences

### Layout Differences

| Feature | Mobile/Tablet | TV |
|---------|---------------|-----|
| Tab Bar | Bottom (mobile) / Top (tablet) | Hidden or minimal |
| Focus Indicators | Touch-based | Visual focus rings |
| Navigation | Tap/Swipe | D-pad/Remote |
| Input | Touch keyboard | Voice search |
| Back Button | Header/Gesture | Remote back/menu |
| Content Density | High | Low (10-foot UI) |

### Interaction Model

**Mobile**:
- Touch-first interaction
- Swipe gestures for back navigation
- Modal sheets for secondary actions
- Pull-to-refresh

**TV**:
- Focus-first interaction
- D-pad/remote directional navigation
- Context menus on long-press
- Voice search integration
- Spatial navigation with focus memory

### Screen Variants

The app maintains separate screen implementations for TV:

```
src/screens/
├── HomeScreen.tsx          # Mobile/tablet
├── HomeScreen.tv.tsx       # TV-optimized
├── MetadataScreen.tsx      # Mobile/tablet
├── MetadataScreen.tv.tsx   # TV-optimized
└── ...
```

**TV Screen Optimizations**:
- Grid layouts instead of lists
- Larger cards (180x270dp vs 120x180dp)
- Reduced content density
- Focus-optimized component order
- Voice search integration
- D-pad spatial navigation hints

## Context Integration

### Navigation-Related Contexts

1. **TVNavigationContext**: TV-specific focus and navigation state
2. **ProfileContext**: Profile selection and active profile state
3. **LoadingContext**: Global loading states affecting navigation visibility
4. **ThemeContext**: Theme state for navigation styling
5. **HeaderVisibility**: Controls header show/hide animations

### Navigation Ref Pattern

The app uses navigation ref for programmatic navigation outside components:

```typescript
// In App.tsx
const navigationRef = React.useRef<NavigationContainerRef>(null);

// Used for profile-based navigation
useEffect(() => {
  if (activeProfile && navigationRef.current) {
    navigationRef.current.navigate('MainTabs');
  }
}, [activeProfile]);
```

## Route Guards & Middleware

### Onboarding Guard

```typescript
const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

// Initial route determined by onboarding status
{hasCompletedOnboarding === false ? (
  <Stack.Screen name="Onboarding" component={OnboardingScreen} />
) : (
  <Stack.Screen name="MainTabs" component={MainTabs} />
)}
```

### Profile Guard

```typescript
const [hasActiveProfile, setHasActiveProfile] = useState<boolean | null>(null);

// Navigate to ProfileSelector if no active profile
useEffect(() => {
  if (!hasActiveProfile && hasCompletedOnboarding) {
    navigationRef.current?.navigate('ProfileSelector');
  }
}, [hasActiveProfile, hasCompletedOnboarding]);
```

### Authentication Guard

No explicit authentication guards are present. The app appears to support both authenticated and guest usage.

## Navigation State Management

### State Persistence

The app uses `mmkvStorage` for persistence but does not persist navigation state between sessions. Each launch starts fresh at the appropriate entry point (onboarding, profile selector, or main tabs).

### Focus State Restoration

TV navigation implements focus state restoration:

```typescript
// TVNavigationContext
const [focusMemory, setFocusMemory] = useState<FocusMemoryMap>({});

// Remember last focused element per screen
setScreenFocus: (screenName: string, focusId: string) => {
  setFocusMemory(prev => ({ ...prev, [screenName]: focusId }));
};

// Restore focus when returning to screen
const lastFocusedId = getScreenFocus(screenName);
if (lastFocusedId) {
  restoreFocus(lastFocusedId);
}
```

## Best Practices & Patterns

### Type Safety

- Strongly-typed route parameters with TypeScript
- Type-safe navigation props via `NativeStackNavigationProp<RootStackParamList>`
- Compile-time route validation

### Component Organization

- Centralized route definitions in `AppNavigator.tsx`
- Separate tab and stack navigators
- Platform-specific navigator selection
- Reusable navigation components (`Focusable`, `TVBackHandler`)

### Performance

- Screen freezing for background screens
- Lazy loading of tabs
- Native screen containers
- Optimized animations (60fps)
- Minimal re-renders with `useMemo` and `useCallback`

### Accessibility

- Proper `accessibilityRole` and `accessibilityLabel`
- Screen reader support
- Focus indicators for keyboard/TV navigation
- Haptic feedback on iOS

## Migration Considerations

### Current Architecture Strengths

1. **Type Safety**: Comprehensive TypeScript types for routes
2. **Platform Optimization**: Platform-specific implementations
3. **TV Support**: Sophisticated TV navigation system
4. **Performance**: Screen freezing, lazy loading, native optimizations
5. **Modularity**: Clean separation of concerns

### Potential Improvements

1. **Deep Linking**: Add URL-based navigation support
2. **State Persistence**: Persist navigation state between sessions
3. **Route Guards**: More formalized authentication/authorization guards
4. **Error Boundaries**: Navigation-level error handling
5. **Analytics**: Navigation event tracking
6. **Testing**: Navigation flow testing utilities

### Native Integration Considerations

When migrating to native, consider:

1. **Navigation Libraries**: React Navigation vs native navigation controllers
2. **Shared Routes**: How to maintain route parity between platforms
3. **Deep Linking**: Platform-specific URL handling (Universal Links, App Links)
4. **State Bridge**: Syncing navigation state between RN and native
5. **TV Navigation**: Maintain TV-specific optimizations
6. **Animations**: Native transition animations vs React Navigation

## Conclusion

The NuvioStreamingTV navigation architecture is sophisticated and well-architected with:

- **Hybrid approach**: Platform-specific optimizations while maintaining shared logic
- **Type-safe routing**: Comprehensive TypeScript integration
- **TV-first design**: Extensive TV remote and focus management
- **Performance-focused**: Screen freezing, lazy loading, native optimizations
- **Accessibility**: Comprehensive support for different input methods

The architecture is production-ready and demonstrates advanced React Navigation patterns suitable for a cross-platform streaming application with TV support.
