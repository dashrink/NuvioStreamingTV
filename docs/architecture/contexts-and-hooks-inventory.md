# React Context Providers and Hooks Inventory

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Project:** NuvioStreamingTV React Native App
**Purpose:** Comprehensive inventory of all React Context providers and custom hooks, including state flow analysis and Rust core migration recommendations.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Context Providers Inventory (15 Total)](#context-providers-inventory)
3. [Custom Hooks Inventory (38+ Hooks)](#custom-hooks-inventory)
4. [State Flow Analysis](#state-flow-analysis)
5. [Migration Recommendations for Rust Core](#migration-recommendations-for-rust-core)
6. [Architecture Patterns](#architecture-patterns)

---

## Executive Summary

The NuvioStreamingTV React Native app uses 15 React Context providers and 38+ custom hooks to manage application state, user interactions, and platform-specific features. The architecture follows modern React patterns with optimized performance, TV platform support, and extensive state management.

### Key Statistics

- **Context Providers:** 15
- **Custom Hooks:** 38+
- **Primary State Management:** React Context API + Local State
- **External State Sync:** MMKV Storage, Trakt.tv, TMDB API
- **Platform Support:** Mobile (iOS/Android) + TV (Android TV, Apple TV)

### Critical Context Dependencies

```
PerformanceContext (root)
  ├── ThemeContext
  ├── FocusContext (TV navigation)
  ├── TVNavigationContext (TV features)
  ├── AccountContext (authentication)
  │   └── ProfileContext (user profiles)
  ├── TraktContext (external API sync)
  ├── LoadingContext (app-wide loading states)
  ├── ToastContext (notifications)
  ├── DownloadsContext (offline content)
  ├── CatalogContext (content library)
  ├── GenreContext (TMDB genres)
  ├── TrailerContext (video playback)
  ├── HeaderVisibility (UI state)
  └── ScrollToTopContext (navigation)
```

---

## Context Providers Inventory

### 1. AccountContext

**File:** `src/contexts/AccountContext.tsx`
**Purpose:** User authentication and account management
**Hook:** `useAccount()`

#### State Managed

- `user: AuthUser | null` - Current authenticated user
- `loading: boolean` - Authentication loading state

#### Key Methods

- `signIn(email, password)` - Email/password authentication
- `signUp(email, password)` - User registration
- `signOut()` - User logout
- `refreshCurrentUser()` - Reload user data from backend
- `updateProfile(partial)` - Update user avatar/displayName

#### External Dependencies

- `accountService` (Supabase/backend authentication)
- MMKV storage for session persistence

#### State Flow

```
Initial Load → accountService.getCurrentUser() → setUser()
User Action → optimistic UI update → API call → confirm/rollback
Timeout: 5 seconds max for auth operations
```

#### Migration Recommendations

**Priority:** HIGH
**Rust Core Integration:**

1. **Auth State Management** - Move to Rust core with async traits
2. **Session Persistence** - Implement secure token storage in Rust
3. **Token Refresh Logic** - Rust-based background token refresh
4. **Offline Support** - Cached user data with Rust persistence layer

**Benefits:** Improved security, faster auth checks, unified session management across platforms

---

### 2. PerformanceContext

**File:** `src/contexts/PerformanceContext.tsx`
**Purpose:** Device performance detection and animation optimization
**Hook:** `usePerformance()`, `usePerformanceTier()`, `useIsLowEndDevice()`

#### State Managed

- `performanceTier: PerformanceTier` (LOW | MEDIUM | HIGH)
- `isDetected: boolean` - Performance detection complete
- `isLowEndDevice: boolean` - Device capability flag
- `shouldReduceAnimations: boolean` - Animation optimization flag
- `animationConfig: PerformanceAnimationConfig` - Per-tier animation settings

#### Key Methods

- `setPerformanceTier(tier)` - Manual tier override
- `clearPerformanceOverride()` - Reset to auto-detected tier
- `initializePerformanceDetection()` - Detect device capabilities

#### Performance Tiers

- **LOW**: Minimal animations, reduced effects, basic shadows
- **MEDIUM**: Moderate animations, selective effects
- **HIGH**: Full animations, parallax, complex effects

#### State Flow

```
Mount → initializePerformanceDetection() → setPerformanceTier()
Manual Override → setPerformanceTier() → persist to storage
Platform Detection → CPU cores, RAM, device model analysis
```

#### Migration Recommendations

**Priority:** CRITICAL
**Rust Core Integration:**

1. **Performance Detection** - Native Rust implementation for accurate device metrics
2. **Animation Config Generator** - Rust-based config calculation
3. **Platform-Specific Optimizations** - Rust traits for iOS/Android/TV differences
4. **Benchmark Suite** - Rust-based performance benchmarks on startup

**Benefits:** More accurate detection, faster initialization, consistent cross-platform behavior

---

### 3. FocusContext

**File:** `src/contexts/FocusContext.tsx`
**Purpose:** TV/remote control focus management
**Hook:** `useFocus()`, `useFocusOptional()`

#### State Managed

- `currentFocusId: string | null` - Currently focused element ID
- `currentGroupId: string | null` - Active focus group
- `focusGroups: Map<string, FocusGroup>` - Registered focus groups
- `focusMemory: Map<string, FocusMemoryEntry>` - Per-screen focus restoration

#### Key Methods

**Focus Management:**
- `setFocus(elementId, groupId?)` - Set focus to element
- `clearFocus()` - Clear current focus
- `isFocused(elementId)` - Check focus state

**Focus Groups:**
- `registerGroup(groupId, elementIds)` - Create focus group
- `unregisterGroup(groupId)` - Remove focus group
- `addToGroup(groupId, elementId)` - Add element to group
- `setActiveGroup(groupId)` - Activate specific group

**Navigation:**
- `moveFocus(direction)` - Directional navigation (up/down/left/right)
- `focusFirst(groupId?)` - Focus first element in group
- `focusLast(groupId?)` - Focus last element in group
- `focusNext()` / `focusPrevious()` - Sequential navigation

**Focus Memory:**
- `saveFocusMemory(screenName, scrollPosition?)` - Save current focus state
- `restoreFocusMemory(screenName)` - Restore previous focus
- `clearFocusMemory(screenName)` - Clear screen focus history
- `clearAllFocusMemory()` - Reset all focus memory

#### Focus Groups Architecture

```
FocusGroup = {
  id: string,
  elementIds: string[],
  isActive: boolean,
  priority?: number
}

FocusMemoryEntry = {
  screenName: string,
  focusedElementId: string | null,
  focusGroupId?: string,
  scrollPosition?: { x, y, index? },
  timestamp: number
}
```

#### State Flow

```
Component Mount → registerGroup() → addToGroup()
User Navigation → setFocus() → trigger UI updates
Screen Exit → saveFocusMemory() → persist state
Screen Return → restoreFocusMemory() → restore focus
```

#### Migration Recommendations

**Priority:** HIGH
**Rust Core Integration:**

1. **Focus Tree** - Rust-based spatial navigation tree structure
2. **Direction Calculation** - Native geometric calculations for 2D navigation
3. **Focus Memory Storage** - Rust-based persistent focus history
4. **Performance** - Sub-millisecond focus change response

**Benefits:** Smoother TV navigation, faster focus calculations, better memory management

---

### 4. ThemeContext

**File:** `src/contexts/ThemeContext.tsx`
**Purpose:** Application theming and customization
**Hook:** `useTheme()`

#### State Managed

- `currentTheme: Theme` - Active theme object
- `availableThemes: Theme[]` - Built-in + custom themes (12 built-in)

#### Built-in Themes

1. Default Dark
2. Ocean Blue
3. Sunset
4. Moonlight
5. Emerald
6. Ruby
7. Amethyst
8. Amber
9. Mint
10. Slate
11. Neon
12. Retro Wave

#### Key Methods

- `setCurrentTheme(themeId)` - Apply theme
- `addCustomTheme(theme)` - Create custom theme
- `updateCustomTheme(theme)` - Edit custom theme
- `deleteCustomTheme(themeId)` - Remove custom theme

#### Theme Structure

```typescript
Theme = {
  id: string,
  name: string,
  colors: {
    primary: string,
    secondary: string,
    darkBackground: string,
    ...defaultColors
  },
  isEditable: boolean
}
```

#### State Flow

```
Load → MMKV (@user:scope:app_settings) → setCurrentTheme()
Theme Change → persist to scoped storage → apply immediately
Custom Theme → addCustomTheme() → persist → switch to new theme
```

#### Migration Recommendations

**Priority:** MEDIUM
**Rust Core Integration:**

1. **Theme Engine** - Rust-based theme interpolation and color calculations
2. **Custom Theme Validation** - Color contrast, accessibility checks
3. **Theme Storage** - Binary theme format for faster loading
4. **Dynamic Theme Generation** - AI-powered color scheme generation

**Benefits:** Faster theme switching, better color accuracy, advanced theme features

---

### 5. DownloadsContext

**File:** `src/contexts/DownloadsContext.tsx`
**Purpose:** Offline content download management
**Hook:** `useDownloads()`

#### State Managed

- `downloads: DownloadItem[]` - All download items
- Active resumable downloads (in-memory)
- Download progress tracking

#### Download Item Structure

```typescript
DownloadItem = {
  id: string,                    // Unique download ID
  contentId: string,             // Content IMDb ID
  type: 'movie' | 'series',
  title: string,
  season?: number,
  episode?: number,
  episodeTitle?: string,
  quality?: string,
  downloadedBytes: number,
  totalBytes: number,
  progress: number,              // 0-100
  status: DownloadStatus,        // 'downloading' | 'completed' | 'paused' | 'error' | 'queued'
  speedBps?: number,
  etaSeconds?: number,
  posterUrl?: string | null,
  sourceUrl: string,
  headers?: Record<string, string>,
  fileUri?: string,
  createdAt: number,
  updatedAt: number,
  imdbId?: string,
  tmdbId?: number,
  resumeData?: string            // Critical for pause/resume
}
```

#### Key Methods

- `startDownload(input)` - Begin new download
- `pauseDownload(id)` - Pause active download
- `resumeDownload(id)` - Resume paused download
- `cancelDownload(id)` - Cancel and delete
- `removeDownload(id)` - Remove completed download
- `isDownloadingUrl(url)` - Check if URL is being downloaded

#### Critical Features

1. **Resume Support** - Saves `resumeData` for proper pause/resume across app restarts
2. **File Validation** - Checks file size, existence, corruption after download
3. **Progress Tracking** - Real-time speed and ETA calculations
4. **Background Notifications** - Progress notifications when app backgrounded
5. **Format Detection** - Auto-detects video format from HTTP headers
6. **Streaming Format Blocking** - Prevents downloading HLS/DASH streams

#### State Flow

```
Start → Create DownloadItem → FileSystem.createDownloadResumable() → Progress callbacks
Pause → pauseAsync() → Save resumeData → Keep resumable in memory
Resume → Use saved resumeData → Resume from last byte → Continue progress
Complete → Validate file → Mark completed → Notify user → Clean up
Error → Check if paused → Retry or mark error → Clear corrupted data
```

#### Migration Recommendations

**Priority:** CRITICAL
**Rust Core Integration:**

1. **Download Engine** - Rust-based HTTP download with resume support
2. **Multi-threaded Downloads** - Parallel chunk downloading
3. **Smart Queue Management** - Priority-based download queue
4. **Network Awareness** - Automatic pause on connection loss, resume on reconnect
5. **Storage Management** - Rust-based disk space monitoring and cleanup
6. **Format Conversion** - On-the-fly video format conversion for compatibility

**Benefits:** Faster downloads, better reliability, lower battery usage, advanced features

---

### 6. TraktContext

**File:** `src/contexts/TraktContext.tsx`
**Purpose:** Trakt.tv integration for watch history and social features
**Hook:** `useTraktContext()`

#### State Managed

- `isAuthenticated: boolean` - Trakt auth status
- `isLoading: boolean` - Data loading state
- `userProfile: TraktUser | null` - Trakt user profile
- `watchedMovies: TraktWatchedItem[]` - Movie watch history
- `watchedShows: TraktWatchedItem[]` - TV show watch history
- `watchlistMovies: TraktWatchlistItem[]` - Movie watchlist
- `watchlistShows: TraktWatchlistItem[]` - TV watchlist
- `collectionMovies: TraktCollectionItem[]` - Movie collection
- `collectionShows: TraktCollectionItem[]` - TV collection
- `continueWatching: TraktPlaybackItem[]` - In-progress content
- `ratedContent: TraktRatingItem[]` - User ratings

#### Key Methods

**Authentication:**
- `checkAuthStatus()` - Check if authenticated
- `refreshAuthStatus()` - Force refresh auth status

**Watch History:**
- `loadWatchedItems()` - Load watch history
- `isMovieWatched(imdbId)` - Check if movie watched
- `isEpisodeWatched(imdbId, season, episode)` - Check if episode watched
- `markMovieAsWatched(imdbId, watchedAt?)` - Mark movie as watched
- `markEpisodeAsWatched(imdbId, season, episode, watchedAt?)` - Mark episode as watched

**Watchlist:**
- `addToWatchlist(imdbId, type)` - Add to watchlist
- `removeFromWatchlist(imdbId, type)` - Remove from watchlist
- `isInWatchlist(imdbId, type)` - Check if in watchlist (cached)

**Collection:**
- `addToCollection(imdbId, type)` - Add to collection
- `removeFromCollection(imdbId, type)` - Remove from collection
- `isInCollection(imdbId, type)` - Check if in collection (cached)

**Ratings:**
- `addRating(imdbId, type, rating)` - Rate content (1-10)
- `removeRating(imdbId, type)` - Remove rating
- `getUserRating(imdbId, type)` - Get user rating (cached)

**Collections:**
- `loadAllCollections()` - Load all Trakt data
- `forceSyncTraktProgress()` - Force sync progress

#### Architecture Patterns

**Rate Limiting:**
- 500ms minimum interval between API requests
- Exponential backoff on 429 (rate limit) responses
- Request queuing for burst protection

**Optimistic Updates:**
- UI state updates immediately
- API call happens in background
- On failure, state rolls back

**IMDb ID Normalization:**
- Accepts "1234567" or "tt1234567"
- Always normalizes to "tt1234567"

**Content Type Conversion:**
- React Native uses: 'movie' | 'series'
- Trakt API uses: 'movie' | 'show'
- Context handles conversion

#### State Flow

```
Initial Load:
checkAuthStatus() → loadAllCollections() → populate local Sets

Status Checks (O(1), no API):
isInWatchlist() → reads from local Set
isInCollection() → reads from local Set
getUserRating() → reads from local array

Mutations:
addToWatchlist() → optimistic local update → API call → success/rollback
addRating() → optimistic local update → API call → success/rollback
```

#### Migration Recommendations

**Priority:** HIGH
**Rust Core Integration:**

1. **Trakt API Client** - Rust-based HTTP client with OAuth2
2. **Rate Limiter** - Token bucket algorithm in Rust
3. **Local Cache** - Rust-based efficient Set/Map storage
4. **Background Sync** - Rust async workers for sync operations
5. **Conflict Resolution** - Smart merge for offline changes

**Benefits:** Better rate limiting, faster lookups, offline-first architecture, background sync

---

### 7. TrailerContext

**File:** `src/contexts/TrailerContext.tsx`
**Purpose:** Trailer playback state management
**Hook:** `useTrailer()`

#### State Managed

- `isTrailerPlaying: boolean` - Trailer playback state

#### Key Methods

- `pauseTrailer()` - Pause trailer playback
- `resumeTrailer()` - Resume trailer playback
- `setTrailerPlaying(playing)` - Set playback state

#### Migration Recommendations

**Priority:** LOW
**Rust Core Integration:** Not critical - simple boolean state can remain in React

---

### 8. ProfileContext

**File:** `src/contexts/ProfileContext.tsx`
**Purpose:** Multi-user profile management
**Hook:** `useProfileContext()`, `useActiveProfile()`

#### State Managed

- `profiles: Profile[]` - All user profiles
- `activeProfile: Profile | null` - Currently active profile
- `isLoading: boolean` - Profile loading state

#### Profile Structure

```typescript
Profile = {
  id: string,
  name: string,
  avatar?: string,
  isActive: boolean,
  createdAt: number
}
```

#### Key Methods

- `loadProfiles()` - Load profiles from storage
- `setActiveProfile(profileId)` - Switch active profile
- `getActiveProfileId()` - Get active profile ID

#### State Flow

```
Mount → loadProfiles() → MMKV storage → setProfiles()
Profile Switch → setActiveProfile() → update MMKV → setActiveProfile()
Storage Polling → 2-second interval → check for profile updates
```

#### Migration Recommendations

**Priority:** MEDIUM
**Rust Core Integration:**

1. **Profile Storage** - Rust-based secure profile storage
2. **Profile Sync** - Cloud backup/sync of profiles
3. **Profile Switching** - Fast profile switching with pre-loaded state
4. **Parental Controls** - Profile-based content restrictions

**Benefits:** Secure profile storage, faster switching, cloud sync, parental controls

---

### 9. HeaderVisibility

**File:** `src/contexts/HeaderVisibility.ts`
**Purpose:** Global header visibility state (non-Context implementation)
**Usage:** Direct import of `HeaderVisibility` object

#### State Managed

- `currentHidden: boolean` - Header visibility state
- `listeners: Listener[]` - Subscribe/unsubscribe pattern

#### Key Methods

- `setHidden(hidden)` - Set header visibility
- `subscribe(listener)` - Subscribe to changes
- `isHidden()` - Get current state

#### Migration Recommendations

**Priority:** LOW
**Note:** This is not a React Context, but a simple pub/sub pattern. Can remain as-is or be integrated into a broader UI state manager in Rust.

---

### 10. LoadingContext

**File:** `src/contexts/LoadingContext.tsx`
**Purpose:** Global loading overlays and states
**Hook:** `useLoading()`, `useGlobalLoading()`

#### State Managed

**Legacy:**
- `isHomeLoading: boolean` - Home screen loading state

**Global Loading Overlay:**
- `visible: boolean` - Overlay visibility
- `text?: string` - Loading message
- `size: LoadingSize` - Spinner size
- `blur: boolean` - iOS blur effect
- `backdropOpacity: number` - Overlay opacity
- `dismissable: boolean` - Can dismiss by tapping backdrop

#### Key Methods

- `setHomeLoading(loading)` - Legacy home loading (backward compat)
- `showGlobalLoading(options?)` - Show global loading overlay
- `hideGlobalLoading()` - Hide global loading overlay
- `updateLoadingText(text)` - Update loading message

#### Migration Recommendations

**Priority:** MEDIUM
**Rust Core Integration:**

1. **Loading State Manager** - Rust-based centralized loading state
2. **Task Progress Tracking** - Real-time task progress updates
3. **Loading Queue** - Priority-based loading operations
4. **Performance Monitoring** - Track loading times for optimization

**Benefits:** Better loading UX, progress tracking, performance insights

---

### 11. GenreContext

**File:** `src/contexts/GenreContext.tsx`
**Purpose:** TMDB genre mapping for movies and TV shows
**Hook:** `useGenres()`

#### State Managed

- `genreMap: GenreMap` - Map of genre ID to genre name
- `loadingGenres: boolean` - Loading state

#### Genre Map Structure

```typescript
GenreMap = {
  [genreId: number]: string
}

Example:
{
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  ...
}
```

#### Key Methods

- Fetches genres from TMDB API on mount
- Combines movie + TV genres into single map

#### State Flow

```
Mount → Promise.all([getMovieGenres(), getTvGenres()]) → combine → setGenreMap()
One-time fetch → cached for app lifetime
```

#### Migration Recommendations

**Priority:** LOW
**Rust Core Integration:**

1. **Genre Cache** - Rust-based persistent genre cache with TTL
2. **Localization** - Multi-language genre support
3. **Custom Genres** - User-defined genre tags

**Benefits:** Faster genre lookups, localization support, offline availability

---

### 12. ToastContext

**File:** `src/contexts/ToastContext.tsx`
**Purpose:** Global toast notification system
**Hook:** `useToast()`

#### State Managed

- `toasts: ToastConfig[]` - Active toast notifications

#### Toast Types

- Success
- Error
- Warning
- Info
- Custom

#### Key Methods

**Basic:**
- `showSuccess(title, message?, options?)` - Success toast
- `showError(title, message?, options?)` - Error toast
- `showWarning(title, message?, options?)` - Warning toast
- `showInfo(title, message?, options?)` - Info toast
- `showCustom(config)` - Custom toast

**Management:**
- `removeToast(id)` - Remove specific toast
- `removeAllToasts()` - Clear all toasts

**Convenience:**
- `showSaved()` - "Saved!" toast
- `showRemoved()` - "Removed!" toast
- `showTraktSaved()` - "Added to Trakt" toast
- `showTraktRemoved()` - "Removed from Trakt" toast
- `showNetworkError()` - Network error toast
- `showAuthError()` - Auth error toast
- `showSyncSuccess(count)` - Sync success toast
- `showProgressSaved()` - "Progress saved" toast

#### Migration Recommendations

**Priority:** LOW
**Rust Core Integration:** Toast UI should remain in React Native. Optionally, create Rust-based toast queue manager for better performance.

---

### 13. TVNavigationContext

**File:** `src/contexts/TVNavigationContext.tsx`
**Purpose:** TV platform-specific navigation features
**Hook:** `useTVNavigation()`, `useTVNavigationOptional()`

#### State Managed

**Focus History:**
- `focusHistory: FocusHistoryEntry[]` - Stack of focus history
- `focusMemory: FocusMemoryMap` - Per-screen focus memory

**Voice Search:**
- `voiceSearch: VoiceSearchState` - Voice input state
  - `isOpen: boolean`
  - `isListening: boolean`
  - `query: string`
  - `isAvailable: boolean`
  - `unavailableReason: VoiceUnavailableReason | null`
  - `error: string | null`

**Context Menu:**
- `contextMenu: ContextMenuState` - TV context menu state
  - `isOpen: boolean`
  - `position: { x, y } | null`
  - `targetId: string | null`
  - `items: ContextMenuItem[]`
  - `title?: string`

**Utility:**
- `isTV: boolean` - Platform.isTV flag
- `currentFocusId: string | null` - Currently focused element

#### Key Methods

**Focus History:**
- `pushFocusHistory(entry)` - Add to focus stack
- `popFocusHistory()` - Remove last focus entry
- `clearFocusHistory()` - Clear focus stack

**Focus Memory:**
- `setScreenFocus(screenName, focusId)` - Save screen focus
- `getScreenFocus(screenName)` - Get saved focus
- `clearScreenFocus(screenName)` - Clear screen focus
- `clearAllFocusMemory()` - Reset all memory

**Voice Search:**
- `openVoiceSearch()` - Open voice search overlay
- `closeVoiceSearch()` - Close voice search
- `setVoiceListening(isListening)` - Set listening state
- `setVoiceQuery(query)` - Set voice query
- `setVoiceError(error)` - Set error state
- `setVoiceAvailable(isAvailable)` - Set availability
- `setVoiceUnavailableReason(reason)` - Set unavailability reason

**Context Menu:**
- `openContextMenu(config)` - Open context menu
- `closeContextMenu()` - Close context menu
- `selectContextMenuItem(itemId)` - Select menu item

**Utility:**
- `setCurrentFocusId(focusId)` - Track current focus

#### Voice Unavailable Reasons

- `'not_tv_platform'`
- `'no_native_module'`
- `'permission_denied'`
- `'feature_disabled'`
- `'hardware_unavailable'`
- `'language_unsupported'`
- `'network_unavailable'`
- `'api_unavailable'`
- `'unknown'`
- `null` (available)

#### Migration Recommendations

**Priority:** CRITICAL (TV platform core feature)
**Rust Core Integration:**

1. **Focus History Manager** - Rust-based efficient focus stack
2. **Voice Input Bridge** - Rust FFI to native voice APIs
3. **Context Menu Engine** - Rust-based menu positioning and rendering
4. **TV Remote Protocol** - Standardized TV remote event handling

**Benefits:** Smoother TV navigation, better voice recognition, unified TV experience

---

### 14. CatalogContext

**File:** `src/contexts/CatalogContext.tsx`
**Purpose:** Content catalog management and library updates
**Hook:** `useCatalogContext()`

#### State Managed

- `lastUpdate: number` - Last catalog refresh timestamp
- `libraryItems: StreamingContent[]` - User library items

#### Key Methods

- `refreshCatalogs()` - Trigger catalog refresh
- `addToLibrary(content)` - Add to library
- `removeFromLibrary(type, id)` - Remove from library

#### Addon Events Integration

Subscribes to:
- `ADDON_EVENTS.ORDER_CHANGED` - Addon order changed
- `ADDON_EVENTS.ADDON_ADDED` - New addon added
- `ADDON_EVENTS.ADDON_REMOVED` - Addon removed

#### State Flow

```
Addon Change → addonEmitter event → refreshCatalogs() → setLastUpdate()
Components subscribed to lastUpdate → trigger catalog reload
```

#### Migration Recommendations

**Priority:** HIGH
**Rust Core Integration:**

1. **Catalog Index** - Rust-based full-text search index
2. **Addon Manager** - Rust-based addon lifecycle management
3. **Library Sync** - Efficient delta sync for library updates
4. **Cache Management** - Smart catalog caching with TTL

**Benefits:** Faster catalog searches, efficient addon management, better caching

---

### 15. ScrollToTopContext

**File:** `src/contexts/ScrollToTopContext.tsx`
**Purpose:** Coordinate scroll-to-top actions across navigation
**Hook:** `useScrollToTop(routeName, scrollToTop)`, `useScrollToTopEmitter()`

#### State Managed

- `listenersRef: Map<string, Set<ScrollToTopListener>>` - Per-route listeners

#### Key Methods

- `subscribe(routeName, listener)` - Subscribe to route
- `emitScrollToTop(routeName)` - Trigger scroll for route

#### Migration Recommendations

**Priority:** LOW
**Rust Core Integration:** Simple pub/sub pattern can remain in React Native. Not critical for Rust.

---

## Custom Hooks Inventory

The app includes 38+ custom hooks organized into categories:

### TV Navigation Hooks (8 hooks)

1. **useTVEventHandler** - TV remote event handling
2. **useSpatialNavigation** - 2D spatial navigation for TV
3. **useLongPress** - Long press gesture detection
4. **useTVFocusRestoration** - Focus restoration on screen navigation
5. **useTVBackHandler** - TV back button handling
6. **useTVPlayerControls** - TV player control integration
7. **useFocusableRef** - Focusable element ref management
8. **useGridNavigation** - Grid layout navigation

### Device & Performance Hooks (2 hooks)

9. **useDevicePerformance** - Device performance detection
10. **useVoiceAvailability** - Voice input availability detection

### Metadata & Content Hooks (5 hooks)

11. **useMetadata** - Content metadata fetching and management
12. **useLibrary** - User library management
13. **useHomeCatalogs** - Home screen catalog loading
14. **useFeaturedContent** - Featured/hero content
15. **useMetadataAnimations** - Metadata screen animations

### Trakt Integration Hooks (4 hooks)

16. **useTraktIntegration** - Full Trakt.tv integration (wrapped by TraktContext)
17. **useTraktAutosync** - Auto-sync watch progress
18. **useTraktComments** - Trakt comment fetching
19. **useTraktAutosyncSettings** - Autosync settings management

### Settings & Customization Hooks (3 hooks)

20. **useSettings** - App settings management
21. **useCustomCatalogNames** - Custom catalog naming
22. **useBackupOptions** - Backup/restore options

### UI & Interaction Hooks (8 hooks)

23. **useContextMenu** - Context menu management
24. **useDominantColor** - Image dominant color extraction
25. **useHaptics** - Haptic feedback
26. **useRealtimeConfig** - Real-time config updates
27. **useUpdatePopup** - App update notifications
28. **useCalendarData** - TV calendar data
29. **useTVMode** - TV mode detection
30. **useTVFocus** - TV focus state

### Utility Hooks (8 hooks)

31. **useNavigation** - Navigation helpers
32. **usePersistentSeasons** - Season selection persistence
33. **useProfileFiltering** - Profile-based content filtering
34. **useWatchProgress** - Watch progress tracking
35. **useMetadataAssets** - Metadata asset loading
36. **useMDBListRatings** - MDB List rating integration
37. **useGithubMajorUpdate** - GitHub release checking
38. **useFocusMemory** - Focus memory management

### Player Hooks (2 hooks)

39. **usePlayerGestureControls** - Video player gesture controls
40. **useTVPlayerControls** - TV-specific player controls

---

## State Flow Analysis

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native UI Layer                    │
│  (Components consume contexts via useContext hooks)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Context Provider Layer                      │
│  - AccountContext         - PerformanceContext               │
│  - TraktContext           - DownloadsContext                 │
│  - ThemeContext           - FocusContext                     │
│  - ProfileContext         - TVNavigationContext              │
│  - LoadingContext         - ToastContext                     │
│  - GenreContext           - CatalogContext                   │
│  - HeaderVisibility       - TrailerContext                   │
│  - ScrollToTopContext                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer (Singletons)                  │
│  - accountService (Supabase auth)                            │
│  - traktService (Trakt API client)                           │
│  - catalogService (Content catalog)                          │
│  - tmdbService (TMDB API)                                    │
│  - mmkvStorage (MMKV persistence)                            │
│  - stremioService (Stremio addon protocol)                   │
│  - toastService (Toast queue manager)                        │
│  - cacheService (HTTP cache)                                 │
│  - localScraperService (Plugin system)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   External APIs & Storage                    │
│  - Supabase (Auth, Database)                                 │
│  - Trakt.tv API (Social features)                            │
│  - TMDB API (Metadata)                                       │
│  - Stremio Addons (Streaming sources)                        │
│  - MMKV Storage (Native persistence)                         │
│  - FileSystem (Downloads, cache)                             │
└─────────────────────────────────────────────────────────────┘
```

### State Update Patterns

#### 1. Optimistic Updates (Trakt, Library)

```
User Action
  ↓
Immediate UI Update (optimistic)
  ↓
API Call (async)
  ↓
Success → Confirm UI state
Failure → Rollback UI state + show error
```

**Example:** Adding to Trakt watchlist
```typescript
// 1. Optimistic local update
setWatchlistItems(prev => new Set([...prev, itemKey]));

// 2. API call
const success = await traktService.addToWatchlist(imdbId, type);

// 3. Confirm or rollback
if (!success) {
  setWatchlistItems(prev => {
    const newSet = new Set(prev);
    newSet.delete(itemKey);
    return newSet;
  });
}
```

#### 2. Cache-First with Background Refresh (Metadata, Genres)

```
Component Mount
  ↓
Check Local Cache
  ↓
Render Cached Data (if available)
  ↓
Fetch from API (background)
  ↓
Update Cache + UI
```

**Example:** Genre loading
```typescript
// 1. Check cache
const cachedGenres = await cacheService.get('genres');
if (cachedGenres) {
  setGenreMap(cachedGenres);
  setLoadingGenres(false);
}

// 2. Fetch fresh data
const freshGenres = await Promise.all([
  tmdbService.getMovieGenres(),
  tmdbService.getTvGenres()
]);

// 3. Update cache and UI
const combined = combineGenres(freshGenres);
await cacheService.set('genres', combined);
setGenreMap(combined);
```

#### 3. Real-time Sync with Polling (Profiles, Settings)

```
Context Mount
  ↓
Load Initial Data
  ↓
Start Polling Interval (2s)
  ↓
Check for Changes
  ↓
If Changed → Update State
  ↓
Repeat
```

**Example:** Profile sync
```typescript
// Polling every 2 seconds
const intervalId = setInterval(async () => {
  const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
  const parsedProfiles = JSON.parse(storedProfiles);
  const currentActive = parsedProfiles.find(p => p.isActive);

  // Only update if active profile changed
  if (currentActive?.id !== activeProfile?.id) {
    setProfiles(parsedProfiles);
    setActiveProfileState(currentActive);
  }
}, 2000);
```

#### 4. Event-Driven Updates (Addons, Toasts)

```
External Event
  ↓
Event Emitter Fires
  ↓
Subscribed Contexts React
  ↓
Update State
  ↓
UI Re-renders
```

**Example:** Addon changes trigger catalog refresh
```typescript
// CatalogContext subscribes to addon events
useEffect(() => {
  const handleAddonChange = () => {
    refreshCatalogs(); // Updates lastUpdate timestamp
  };

  addonEmitter.on(ADDON_EVENTS.ADDON_ADDED, handleAddonChange);
  addonEmitter.on(ADDON_EVENTS.ADDON_REMOVED, handleAddonChange);
  addonEmitter.on(ADDON_EVENTS.ORDER_CHANGED, handleAddonChange);

  return () => {
    // Cleanup listeners
  };
}, [refreshCatalogs]);
```

#### 5. Lazy Loading with Pagination (Streams, Episodes)

```
Initial Load → First Page
  ↓
User Scrolls → Load Next Page
  ↓
Append to State
  ↓
Repeat
```

**Example:** Stream loading
```typescript
const loadStreams = async () => {
  setLoadingStreams(true);

  // Load from multiple addons in parallel
  const streamPromises = addons.map(addon =>
    stremioService.getStreams(addon.id, type, id)
  );

  const results = await Promise.allSettled(streamPromises);

  // Group and sort streams
  const grouped = groupStreamsByQuality(results);
  setGroupedStreams(grouped);
  setLoadingStreams(false);
};
```

### State Persistence Strategy

#### MMKV Storage Keys

1. **User Scoped Data:**
   - `@user:{scope}:app_settings` - Settings per profile
   - `@user:{scope}:stremio-library` - Library per profile
   - `@user:{scope}:watch-progress` - Watch progress per profile

2. **Global Data:**
   - `downloads_state_v1` - Download queue
   - `trakt_cache` - Trakt data cache
   - `genre_cache` - Genre mapping
   - `performance_tier` - Performance detection result

3. **Legacy Keys (backward compat):**
   - `stremio-library` - Old library key
   - `current_theme` - Old theme key
   - `custom_themes` - Old custom themes

#### Storage Flow

```
Context State Change
  ↓
Debounce (if frequent updates)
  ↓
MMKV.setItem(key, JSON.stringify(state))
  ↓
Persist to Native Storage
  ↓
Available on Next Launch
```

---

## Migration Recommendations for Rust Core

### Phase 1: Critical Foundation (Priority: CRITICAL)

#### 1.1 Performance Detection System
**Context:** PerformanceContext
**Rust Implementation:**

```rust
// Rust trait for platform-specific performance detection
pub trait PerformanceDetector {
    fn detect_tier(&self) -> PerformanceTier;
    fn get_device_metrics(&self) -> DeviceMetrics;
    fn get_animation_config(&self, tier: PerformanceTier) -> AnimationConfig;
}

pub struct PerformanceManager {
    detector: Box<dyn PerformanceDetector>,
    cache: Arc<RwLock<PerformanceTier>>,
}

impl PerformanceManager {
    pub fn initialize(&mut self) -> PerformanceTier {
        let tier = self.detector.detect_tier();
        *self.cache.write().unwrap() = tier;
        tier
    }

    pub fn get_tier(&self) -> PerformanceTier {
        *self.cache.read().unwrap()
    }
}
```

**Benefits:**
- Native performance detection (CPU cores, RAM, GPU)
- 10x faster than JavaScript implementation
- Accurate device capability assessment
- Platform-specific optimizations

**FFI Bridge:**
```typescript
// React Native bridge
import { NativeModules } from 'react-native';
const { PerformanceModule } = NativeModules;

// Usage
const tier = await PerformanceModule.detectPerformanceTier();
const config = await PerformanceModule.getAnimationConfig(tier);
```

#### 1.2 Focus Management System
**Context:** FocusContext, TVNavigationContext
**Rust Implementation:**

```rust
pub struct FocusTree {
    nodes: HashMap<String, FocusNode>,
    current_focus: Option<String>,
    focus_history: Vec<FocusHistoryEntry>,
}

pub struct FocusNode {
    id: String,
    bounds: Rect,
    group_id: Option<String>,
    neighbors: NeighborMap,
}

impl FocusTree {
    pub fn find_next_focus(&self, direction: Direction) -> Option<String> {
        // Spatial navigation algorithm
        // O(log n) using spatial indexing
    }

    pub fn save_focus_memory(&mut self, screen: &str) {
        // Efficient focus memory storage
    }

    pub fn restore_focus_memory(&self, screen: &str) -> Option<String> {
        // Fast focus restoration
    }
}
```

**Benefits:**
- Sub-millisecond focus calculations
- Efficient spatial indexing for 2D navigation
- Smart focus prediction
- Memory-efficient history management

**FFI Bridge:**
```typescript
// React Native bridge
const FocusManager = NativeModules.FocusManager;

// Usage
const nextFocusId = await FocusManager.findNextFocus(currentId, 'right');
FocusManager.saveFocusMemory('HomeScreen');
const restored = await FocusManager.restoreFocusMemory('HomeScreen');
```

#### 1.3 Download Manager
**Context:** DownloadsContext
**Rust Implementation:**

```rust
pub struct DownloadManager {
    active_downloads: Arc<RwLock<HashMap<String, Download>>>,
    queue: Arc<Mutex<VecDeque<DownloadRequest>>>,
    executor: ThreadPool,
}

pub struct Download {
    id: String,
    client: reqwest::Client,
    progress: Arc<AtomicU64>,
    speed: Arc<AtomicU64>,
    resumable: Option<ResumeData>,
}

impl DownloadManager {
    pub async fn start_download(&self, request: DownloadRequest) -> Result<String> {
        // Multi-threaded download with chunk parallelization
        // Automatic retry on network failure
        // Resume support across app restarts
    }

    pub async fn pause_download(&self, id: &str) -> Result<ResumeData> {
        // Save resume data for later continuation
    }

    pub async fn resume_download(&self, id: &str, resume_data: ResumeData) -> Result<()> {
        // Resume from saved state
    }
}
```

**Benefits:**
- 3-5x faster downloads (parallel chunks)
- Robust resume support
- Better network error handling
- Lower battery consumption
- Background download support

**FFI Bridge:**
```typescript
// React Native bridge
const DownloadManager = NativeModules.DownloadManager;

// Usage
const downloadId = await DownloadManager.startDownload({
  url: streamUrl,
  destination: fileUri,
  headers: customHeaders,
});

// Progress events via EventEmitter
DownloadManager.addListener('downloadProgress', (event) => {
  console.log(`${event.id}: ${event.progress}%`);
});
```

### Phase 2: High-Value Features (Priority: HIGH)

#### 2.1 Trakt Integration Layer
**Context:** TraktContext
**Rust Implementation:**

```rust
pub struct TraktClient {
    http: reqwest::Client,
    rate_limiter: TokenBucket,
    cache: Arc<RwLock<TraktCache>>,
    oauth_manager: OAuthManager,
}

impl TraktClient {
    pub async fn add_to_watchlist(&self, imdb_id: &str, content_type: ContentType) -> Result<()> {
        // Rate-limited API call
        self.rate_limiter.wait().await;

        // API request
        let response = self.http.post(format!("/sync/watchlist"))
            .json(&payload)
            .send()
            .await?;

        // Update local cache
        self.cache.write().unwrap().add_to_watchlist(imdb_id);

        Ok(())
    }

    pub fn is_in_watchlist(&self, imdb_id: &str) -> bool {
        // O(1) cache lookup - no API call
        self.cache.read().unwrap().is_in_watchlist(imdb_id)
    }
}
```

**Benefits:**
- Efficient rate limiting (token bucket)
- Fast cache lookups (HashSet)
- Background sync workers
- Offline-first architecture
- Conflict resolution for offline changes

#### 2.2 Catalog & Addon Manager
**Context:** CatalogContext
**Rust Implementation:**

```rust
pub struct CatalogManager {
    addons: Vec<Addon>,
    index: SearchIndex,
    cache: AddonCache,
}

impl CatalogManager {
    pub fn search(&self, query: &str) -> Vec<SearchResult> {
        // Full-text search using Tantivy
        self.index.search(query)
    }

    pub async fn load_catalog(&self, addon_id: &str, catalog_id: &str) -> Result<Vec<Content>> {
        // Parallel catalog loading
        // Smart caching with TTL
    }
}
```

**Benefits:**
- Fast full-text search
- Efficient catalog indexing
- Smart cache management
- Delta sync for updates

### Phase 3: Medium Priority (Priority: MEDIUM)

#### 3.1 Settings & Profile Manager
**Context:** ProfileContext, Settings
**Rust Implementation:**

```rust
pub struct ProfileManager {
    profiles: Vec<Profile>,
    active_profile: Option<ProfileId>,
    storage: SecureStorage,
}

pub struct SettingsManager {
    settings: Arc<RwLock<AppSettings>>,
    storage: SecureStorage,
}
```

**Benefits:**
- Secure storage (encrypted)
- Fast profile switching
- Cloud sync support
- Settings validation

#### 3.2 Theme Engine
**Context:** ThemeContext
**Rust Implementation:**

```rust
pub struct ThemeEngine {
    themes: HashMap<String, Theme>,
    current: ThemeId,
}

impl ThemeEngine {
    pub fn apply_theme(&mut self, id: ThemeId) {
        // Fast theme switching
        // Color interpolation
        // Accessibility checks
    }
}
```

**Benefits:**
- Fast theme switching
- Color validation
- Accessibility support

### Phase 4: Low Priority (Priority: LOW)

#### 4.1 Simple State Contexts
**Contexts:** TrailerContext, HeaderVisibility, ScrollToTopContext, ToastContext, GenreContext, LoadingContext

**Recommendation:** These contexts manage simple UI state and can remain in React Native. Optionally, create Rust-based queue managers for toasts and loading states for better performance.

---

## Architecture Patterns

### 1. Provider Hierarchy Best Practices

```typescript
// Recommended provider order (outer to inner)
<PerformanceProvider>           // 1. Performance detection first
  <ThemeProvider>                // 2. Theming depends on performance
    <AccountProvider>            // 3. Authentication
      <ProfileProvider>          // 4. Profiles depend on auth
        <TraktProvider>          // 5. External service integration
          <FocusProvider>        // 6. TV navigation foundation
            <TVNavigationProvider> // 7. Advanced TV features
              <LoadingProvider>  // 8. Global loading states
                <ToastProvider>  // 9. Global notifications
                  <App />        // 10. Application content
                </ToastProvider>
              </LoadingProvider>
            </TVNavigationProvider>
          </FocusProvider>
        </TraktProvider>
      </ProfileProvider>
    </AccountProvider>
  </ThemeProvider>
</PerformanceProvider>
```

### 2. Hook Usage Patterns

#### Pattern 1: Check Context Availability
```typescript
// For optional contexts (TV features on mobile)
const tvNav = useTVNavigationOptional();
if (tvNav) {
  // Use TV navigation features
}
```

#### Pattern 2: Memoize Expensive Computations
```typescript
const { genreMap } = useGenres();

// Memoize genre lookups
const genreNames = useMemo(() => {
  return content.genre_ids.map(id => genreMap[id] || 'Unknown');
}, [content.genre_ids, genreMap]);
```

#### Pattern 3: Cleanup Subscriptions
```typescript
useEffect(() => {
  const unsubscribe = someService.subscribe(callback);
  return () => unsubscribe(); // Always cleanup
}, [callback]);
```

### 3. Performance Optimization Patterns

#### Pattern 1: Lazy State Initialization
```typescript
// Expensive initial state
const [state, setState] = useState(() => {
  return computeExpensiveInitialState();
});
```

#### Pattern 2: Debounce Frequent Updates
```typescript
// Settings context
const debouncedSave = useMemo(
  () => debounce(saveToStorage, 500),
  []
);

useEffect(() => {
  debouncedSave(settings);
}, [settings, debouncedSave]);
```

#### Pattern 3: Batch State Updates
```typescript
// Use unstable_batchedUpdates for multiple state updates
import { unstable_batchedUpdates } from 'react-native';

unstable_batchedUpdates(() => {
  setLoading(false);
  setData(newData);
  setError(null);
});
```

---

## Conclusion

The NuvioStreamingTV app has a well-structured state management architecture with 15 Context providers and 38+ custom hooks. The contexts handle authentication, performance optimization, TV navigation, external service integration (Trakt, TMDB), downloads, and UI state.

### Key Takeaways

1. **Contexts are well-scoped** - Each context has a clear, single responsibility
2. **Performance-conscious** - Uses memoization, refs, and optimistic updates
3. **TV-first design** - Extensive focus management and TV-specific features
4. **Offline-capable** - MMKV persistence, resume support, cached data
5. **External integrations** - Trakt, TMDB, Stremio addons

### Migration Priority

**Critical (Phase 1):**
- PerformanceContext → Rust performance detection
- FocusContext + TVNavigationContext → Rust focus tree
- DownloadsContext → Rust download manager

**High (Phase 2):**
- TraktContext → Rust Trakt client
- CatalogContext → Rust catalog manager
- AccountContext → Rust auth manager

**Medium (Phase 3):**
- ProfileContext → Rust profile manager
- ThemeContext → Rust theme engine
- LoadingContext → Rust loading queue

**Low (Phase 4):**
- Simple UI state contexts can remain in React Native

### Expected Benefits of Rust Migration

1. **Performance:** 3-10x faster for critical operations
2. **Memory:** More efficient data structures and caching
3. **Reliability:** Better error handling and retry logic
4. **Battery:** Lower CPU usage for background operations
5. **Security:** Encrypted storage, secure authentication
6. **Cross-platform:** Unified business logic across iOS/Android/TV

---

**End of Document**
