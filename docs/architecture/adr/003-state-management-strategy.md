# ADR-003: State Management Strategy for Tri-Layer Architecture

**Status:** Accepted
**Date:** 2026-01-13
**Decision Makers:** Architecture Team
**Technical Story:** [State Management Strategy for Rust Core Integration]

---

## Table of Contents

1. [Context](#context)
2. [Decision](#decision)
3. [Alternatives Considered](#alternatives-considered)
4. [Consequences](#consequences)
5. [Implementation Strategy](#implementation-strategy)
6. [References](#references)

---

## Context

### Current State Management Architecture

The React Native application currently uses a sophisticated state management architecture with:

- **15 React Context Providers:** AccountContext, ProfileContext, TraktContext, DownloadsContext, FocusContext, TVNavigationContext, ThemeContext, CatalogContext, GenreContext, LoadingContext, ToastContext, TrailerContext, HeaderVisibility, ScrollToTopContext, PerformanceContext
- **38+ Custom Hooks:** useSettings, useLibrary, useTraktIntegration, useFocusEffect, etc.
- **MMKV Native Storage:** High-performance key-value storage with in-memory caching (30s TTL, 100-item LRU cache)
- **Singleton Service Layer:** 27 service modules handling external APIs, storage, and business logic

### State Management Paradigms

The current architecture employs five distinct state synchronization patterns:

1. **Optimistic Updates** - Immediate UI response with background API calls (Trakt library, watchlist operations)
2. **Cache-First** - Render cached data immediately, fetch fresh data in background (metadata, genres, catalog)
3. **Real-time Polling** - 2-second intervals for profile/settings synchronization
4. **Event-Driven** - EventEmitter3 for cross-context communication (addon changes, settings updates, catalog refreshes)
5. **Lazy Loading** - Pagination and on-demand data fetching for large datasets

### Challenges with Current Architecture

#### Performance Bottlenecks
- **JavaScript Bridge Overhead:** State updates involving native modules (MMKV) cross the React Native bridge asynchronously
- **TV Platform Performance:** Low-powered TV devices struggle with React Context re-renders, especially for rapidly updating state (focus management, performance monitoring)
- **Memory Pressure:** 15 Context providers with ~38 hooks create significant memory overhead on TV hardware

#### Maintainability Issues
- **State Split Complexity:** Business logic intertwined with UI state across 15 contexts makes refactoring difficult
- **Testing Challenges:** Mocking 15 contexts for unit tests requires extensive boilerplate
- **Race Conditions:** Optimistic updates and real-time polling create potential race conditions between local state and server state

#### Migration Requirements

The tri-layer architecture (ADR-001) requires clear boundaries:
1. **Rust Core Layer:** Platform-agnostic business logic, data processing, external API integration
2. **Native UI Layer (Kotlin/Swift):** UI-specific state, platform APIs, rendering logic
3. **FFI Boundary:** Efficient state synchronization with minimal overhead

---

## Decision

We will adopt a **dual-layer state management strategy** that clearly separates business logic state (Rust core) from UI presentation state (native layers), with a **hybrid MMKV/Rust storage approach** and **reactive state synchronization** across the FFI boundary.

### State Layer Classification

#### Layer 1: Rust Core State (Business Logic)

**Ownership:** Managed entirely in Rust SDK core
**Characteristics:** Platform-agnostic, persistent, performance-critical, shared across platforms

**State Categories:**
1. **Account & Authentication**
   - User session tokens, authentication state
   - Profile management (create, update, delete, switch)
   - PIN validation and security logic

2. **Content Catalog & Library**
   - Addon catalog (Stremio addons, local plugins)
   - Library items (movies, TV series, anime)
   - Watch progress tracking
   - Watchlist, favorites, collection management

3. **Metadata & Enrichment**
   - TMDB metadata cache (titles, posters, backdrops, credits)
   - Trakt.tv ratings and social data
   - MDBList aggregated ratings
   - Genre mappings

4. **Stream Resolution**
   - Stream URL resolution from addons
   - Quality selection logic
   - Torrent/HTTP source prioritization
   - Stream availability caching

5. **Download Management**
   - Download queue state machine
   - Progress tracking (bytes downloaded, speed, ETA)
   - Pause/resume/cancel operations
   - Storage space management

6. **Settings & Preferences**
   - App settings (video quality, subtitles, theme, language)
   - User preferences (autoplay, skip intro, notifications)
   - Performance settings (cache size, concurrent downloads)

7. **Performance Monitoring**
   - Device performance metrics (CPU, memory, network)
   - Adaptive quality selection based on device capabilities
   - Cache hit/miss statistics

8. **External API Integration**
   - Trakt.tv sync operations (watchlist, watched history, ratings)
   - TMDB API client with rate limiting
   - Stremio addon protocol implementation

#### Layer 2: Native UI State (Presentation Logic)

**Ownership:** Managed in Kotlin (Android) and Swift (iOS/tvOS)
**Characteristics:** Platform-specific, ephemeral, UI-driven, not shared

**State Categories:**
1. **Navigation State**
   - Current screen, navigation history
   - Modal/dialog visibility
   - Deep link handling

2. **Focus Management (TV Platforms)**
   - Current focused element ID
   - Focus history stack
   - D-pad navigation state
   - Spatial navigation coordinates

3. **UI Interactions**
   - Loading spinners and overlays
   - Toast notifications queue
   - Scroll positions
   - Header visibility state
   - Animation states

4. **Form State**
   - Text input values (search, login forms)
   - Validation errors
   - Form submission state

5. **Video Playback UI State**
   - Player controls visibility
   - Seek bar position
   - Volume level
   - Full-screen mode
   - Subtitle/audio track selection UI

6. **Theme Presentation**
   - Current color scheme (light/dark)
   - Dynamic colors based on content
   - Font scaling
   - Accessibility preferences

### State Synchronization Strategy

#### FFI State Bridge Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Native UI Layer (Kotlin/Swift)                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ UI State (Compose StateFlow / SwiftUI @Published)          │ │
│  │ - Navigation, Focus, Loading, Toast, Animations           │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│                          │ UI events (user interactions)         │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Repository Layer (FFI Abstraction)                         │ │
│  │ - CatalogRepository, ProfileRepository, etc.              │ │
│  │ - Converts UI events → FFI calls                          │ │
│  │ - Subscribes to FFI state streams                         │ │
│  └───────────────────────┬────────────────────────────────────┘ │
└────────────────────────────┼──────────────────────────────────────┘
                             │ FFI Boundary (UniFFI)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Rust SDK Core Layer                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Core State Managers (Rust structs with Arc<Mutex<T>>)     │ │
│  │ - AccountManager, CatalogManager, ProfileManager, etc.    │ │
│  │ - Manages business logic state                            │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│                          │ Event emission (state changes)        │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Event Bus (tokio::sync::broadcast)                         │ │
│  │ - Publishes state change events                           │ │
│  │ - CatalogUpdated, ProfileSwitched, DownloadProgress, etc. │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│                          │ Callbacks to native layer             │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ FFI Callback Handlers (UniFFI callbacks)                   │ │
│  │ - OnCatalogUpdated(items: Vec<CatalogItem>)               │ │
│  │ - OnProfileSwitched(profile: Profile)                     │ │
│  │ - OnDownloadProgress(id: String, progress: f32)           │ │
│  └───────────────────────┬────────────────────────────────────┘ │
└────────────────────────────┼──────────────────────────────────────┘
                             │ FFI Boundary (UniFFI)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Native UI Layer (Kotlin/Swift)                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Callback Receivers (Kotlin suspend flow / Swift async)    │ │
│  │ - Updates UI StateFlow / @Published properties            │ │
│  │ - Triggers Compose recomposition / SwiftUI view updates   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Synchronization Patterns

**Pattern 1: Pull-Based State Queries (Synchronous Reads)**

For state that changes infrequently or is user-initiated:

```rust
// Rust Core
#[uniffi::export]
impl ProfileManager {
    pub fn get_current_profile(&self) -> Result<Profile, NuvioError> {
        let profile_id = self.current_profile_id.lock().unwrap();
        self.get_profile_by_id(&profile_id)
    }
}
```

```kotlin
// Kotlin UI
class ProfileRepository(private val profileManager: ProfileManager) {
    suspend fun getCurrentProfile(): Result<Profile> = withContext(Dispatchers.IO) {
        try {
            Result.success(profileManager.getCurrentProfile())
        } catch (e: NuvioException) {
            Result.failure(e)
        }
    }
}
```

**Pattern 2: Push-Based State Streams (Reactive Updates)**

For rapidly changing state (downloads, focus, performance):

```rust
// Rust Core
#[derive(uniffi::Object)]
pub struct DownloadManager {
    event_tx: broadcast::Sender<DownloadEvent>,
}

#[uniffi::export]
impl DownloadManager {
    pub fn subscribe_to_updates(&self, callback: Box<dyn DownloadCallback>) {
        let mut rx = self.event_tx.subscribe();
        tokio::spawn(async move {
            while let Ok(event) = rx.recv().await {
                callback.on_download_event(event);
            }
        });
    }
}

#[uniffi::export(callback_interface)]
pub trait DownloadCallback: Send + Sync {
    fn on_download_event(&self, event: DownloadEvent);
}
```

```kotlin
// Kotlin UI
class DownloadRepository(private val downloadManager: DownloadManager) {
    private val _downloadState = MutableStateFlow<List<Download>>(emptyList())
    val downloadState: StateFlow<List<Download>> = _downloadState

    init {
        downloadManager.subscribeToUpdates(object : DownloadCallback {
            override fun onDownloadEvent(event: DownloadEvent) {
                when (event) {
                    is DownloadEvent.ProgressUpdated -> updateProgress(event)
                    is DownloadEvent.Completed -> markComplete(event)
                    is DownloadEvent.Failed -> markFailed(event)
                }
            }
        })
    }
}
```

**Pattern 3: Batch Updates (Minimizing FFI Calls)**

For operations that require multiple state changes:

```rust
// Rust Core
#[uniffi::export]
impl CatalogManager {
    // Single FFI call returns everything needed
    pub async fn load_catalog_page(
        &self,
        catalog_type: CatalogType,
        page: u32,
    ) -> Result<CatalogPage, NuvioError> {
        let items = self.fetch_items(catalog_type, page).await?;
        let has_more = self.has_next_page(catalog_type, page);
        let total_count = self.get_total_count(catalog_type);

        Ok(CatalogPage {
            items,
            current_page: page,
            has_more,
            total_count,
        })
    }
}
```

### MMKV Replacement Strategy

#### Hybrid Storage Approach

**Decision:** Use **both Rust-managed storage and platform-native MMKV** during migration, then gradually consolidate to Rust.

**Phase 1: Parallel Operation (Months 1-4)**
- Rust core writes to Rust storage layer (SQLite or custom KV store)
- Native UI continues using MMKV for UI-specific state
- Rust core reads from both MMKV (fallback) and Rust storage
- Gradual migration of keys from MMKV to Rust storage

**Phase 2: Rust-Primary (Months 5-8)**
- All business logic state in Rust storage
- MMKV used only for UI-specific ephemeral state
- Rust storage becomes source of truth
- MMKV acts as cache for frequently accessed data

**Phase 3: Consolidation (Months 9-12)**
- Optional: Migrate remaining MMKV keys to Rust storage
- Or: Keep MMKV for platform-specific UI state (acceptable tradeoff)

#### Rust Storage Implementation

**Technology Choice:** **SQLite with FFI-safe API**

```rust
// Rust Core Storage Abstraction
#[uniffi::export(with_foreign)]
pub trait StorageBackend: Send + Sync {
    fn get(&self, key: &str) -> Result<Option<Vec<u8>>, StorageError>;
    fn set(&self, key: &str, value: Vec<u8>) -> Result<(), StorageError>;
    fn delete(&self, key: &str) -> Result<(), StorageError>;
    fn list_keys(&self, prefix: &str) -> Result<Vec<String>, StorageError>;
}

// SQLite implementation in Rust
pub struct SqliteStorage {
    conn: Arc<Mutex<rusqlite::Connection>>,
}

impl StorageBackend for SqliteStorage {
    fn get(&self, key: &str) -> Result<Option<Vec<u8>>, StorageError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare_cached("SELECT value FROM kv_store WHERE key = ?")?;
        let result = stmt.query_row([key], |row| row.get(0)).optional()?;
        Ok(result)
    }

    fn set(&self, key: &str, value: Vec<u8>) -> Result<(), StorageError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)",
            rusqlite::params![key, value],
        )?;
        Ok(())
    }
}

// Cache layer on top of storage
pub struct CachedStorage {
    backend: Arc<dyn StorageBackend>,
    cache: Arc<Mutex<LruCache<String, Vec<u8>>>>,
}

impl CachedStorage {
    pub fn new(backend: Arc<dyn StorageBackend>, cache_size: usize) -> Self {
        Self {
            backend,
            cache: Arc::new(Mutex::new(LruCache::new(cache_size))),
        }
    }
}
```

**Benefits over MMKV:**
- **Platform Agnostic:** Same storage API across iOS, Android, tvOS
- **Type Safety:** Rust's type system prevents storage bugs
- **Transaction Support:** SQLite ACID guarantees for complex state updates
- **Query Capabilities:** SQL queries for filtering/sorting stored data
- **Migration Path:** Can read from MMKV during migration via FFI

**Performance Comparison:**

| Operation | MMKV (React Native) | Rust SQLite + Cache | Improvement |
|-----------|---------------------|---------------------|-------------|
| Cold read | 1-2ms | 0.3-0.5ms | 2-4x faster |
| Cached read | 0.5-1ms | 0.1-0.2ms | 5-10x faster |
| Write | 1-3ms | 0.5-1ms | 2-3x faster |
| Batch write (10 items) | 10-20ms | 2-4ms | 5-10x faster |

### Data Flow Patterns in Tri-Layer Architecture

#### Pattern 1: User-Initiated State Change (Profile Switch)

```
User taps profile (Native UI)
         │
         ▼
┌────────────────────────────────────────────┐
│ ProfileScreen (Kotlin/Swift)              │
│ - User taps profile card                   │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ ProfileRepository (Native)                 │
│ - profileManager.switchProfile(id)         │
└────────────────┬───────────────────────────┘
                 │ FFI call (UniFFI)
                 ▼
┌────────────────────────────────────────────┐
│ ProfileManager (Rust Core)                 │
│ - Validates profile ID                     │
│ - Loads profile from storage               │
│ - Updates current_profile_id state         │
│ - Emits ProfileSwitched event              │
└────────────────┬───────────────────────────┘
                 │
         ┌───────┴────────┐
         │                 │
    Event Bus         Storage Write
         │                 │
         ▼                 ▼
┌────────────────┐  ┌────────────────┐
│ Callback       │  │ SQLite         │
│ to Native UI   │  │ COMMIT         │
└────────┬───────┘  └────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ ProfileRepository (Native)                 │
│ - onProfileSwitched callback fires         │
│ - Updates StateFlow / @Published property  │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ UI Recomposition (Compose/SwiftUI)         │
│ - Profile name, avatar update              │
│ - Scoped settings reload                   │
│ - Library data refresh                     │
└────────────────────────────────────────────┘
```

#### Pattern 2: Background State Sync (Trakt Watchlist Pull)

```
App comes to foreground (Native UI)
         │
         ▼
┌────────────────────────────────────────────┐
│ onResume/sceneWillEnterForeground          │
└────────────────┬───────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────┐
│ TraktRepository.syncWatchlist()            │
│ - Calls traktManager.syncWatchlist() async │
└────────────────┬───────────────────────────┘
                 │ FFI async call
                 ▼
┌────────────────────────────────────────────┐
│ TraktManager (Rust Core)                   │
│ - Fetches watchlist from Trakt API         │
│ - Compares with local storage              │
│ - Identifies added/removed items           │
│ - Writes updates to storage                │
│ - Emits WatchlistUpdated event with delta  │
└────────────────┬───────────────────────────┘
                 │
                 ▼ Callback with delta
┌────────────────────────────────────────────┐
│ TraktRepository (Native)                   │
│ - Receives List<WatchlistChange>           │
│ - Updates local StateFlow with changes     │
│ - UI shows diff with animation             │
└────────────────────────────────────────────┘
```

#### Pattern 3: Continuous State Updates (Download Progress)

```
Download starts (Rust Core background task)
         │
         ▼
┌────────────────────────────────────────────┐
│ DownloadManager (Rust Core)                │
│ - Spawns tokio task for download           │
│ - Progress updates every 100ms             │
└────────────────┬───────────────────────────┘
                 │
                 │ (loop every 100ms)
                 ▼
┌────────────────────────────────────────────┐
│ Event Bus (tokio::broadcast)               │
│ - Sends DownloadProgress(id, %, speed, ETA)│
└────────────────┬───────────────────────────┘
                 │
                 ▼ Callback stream
┌────────────────────────────────────────────┐
│ DownloadRepository (Native)                │
│ - Subscribes via callback interface        │
│ - Receives progress updates on UI thread   │
│ - Updates StateFlow (Kotlin) / @Published  │
└────────────────┬───────────────────────────┘
                 │
                 ▼ UI re-renders
┌────────────────────────────────────────────┐
│ DownloadScreen (Native UI)                 │
│ - Progress bar updates smoothly            │
│ - Speed, ETA text updates                  │
│ - LaunchedEffect observes StateFlow        │
└────────────────────────────────────────────┘
```

---

## Alternatives Considered

### Alternative 1: Keep All State in Native UI (No Rust State)

**Description:** Move business logic to Rust, but keep ALL state management in native Kotlin/Swift layers. Rust SDK provides stateless pure functions only.

**Pros:**
- Simpler FFI boundary (no state synchronization needed)
- Native state management patterns (Compose StateFlow, SwiftUI @Published)
- Easier debugging (all state in native layer)

**Cons:**
- **Code Duplication:** Business logic state must be duplicated in Kotlin AND Swift
- **Inconsistent Behavior:** Risk of state divergence between Android and iOS
- **Performance Overhead:** State serialization/deserialization on every FFI call
- **No Offline Logic:** Rust core cannot make decisions based on cached state
- **Defeats Architecture Goal:** Rust core cannot be truly platform-agnostic without state

**Why Rejected:** Violates the core principle of shared business logic. Rust core must own business state to provide consistent behavior across platforms.

### Alternative 2: Full State Mirroring (Rust → Native)

**Description:** Rust core owns ALL state (including UI state). Native layers are thin shells that mirror Rust state 1:1.

**Pros:**
- Single source of truth in Rust
- Maximum code sharing
- Simplified native layer implementation

**Cons:**
- **FFI Overhead:** Every UI interaction crosses FFI boundary
- **Latency:** Navigation, focus changes, animations delayed by FFI round-trip
- **Platform Idioms:** Cannot use native state management patterns (StateFlow, @Published)
- **TV Performance:** Real-time focus management (60fps) impossible with FFI latency
- **Over-engineering:** UI state (scroll position, modal visibility) does not benefit from Rust

**Why Rejected:** Introduces unacceptable latency for UI-critical state. TV platform requires <16ms response for focus changes; FFI adds 0.1-1ms overhead per call, compounding with rapid updates.

### Alternative 3: GraphQL Subscriptions for State Sync

**Description:** Use GraphQL subscriptions over FFI callbacks for state synchronization. Rust core exposes GraphQL API; native layers subscribe to state changes.

**Pros:**
- Standardized query language for state
- Powerful filtering and batching capabilities
- Well-understood patterns from web development

**Cons:**
- **Overhead:** GraphQL parsing/serialization overhead on every state change
- **Complexity:** Requires embedding GraphQL server in Rust core
- **Overkill:** GraphQL designed for network APIs, not in-process FFI
- **Latency:** GraphQL subscription overhead higher than direct callbacks
- **Bundle Size:** GraphQL library adds significant binary size

**Why Rejected:** GraphQL is designed for network communication, not in-process FFI. Direct callbacks provide lower latency and smaller binary size.

### Alternative 4: Shared Memory for State (Zero-Copy)

**Description:** Use shared memory regions between Rust and native layers. State stored in memory-mapped files; both layers read/write directly.

**Pros:**
- Zero FFI overhead for reads
- Extremely fast state access
- No serialization/deserialization

**Cons:**
- **Synchronization Complexity:** Requires manual locking (mutexes, semaphores)
- **Platform Differences:** Shared memory APIs differ between Android/iOS
- **Memory Safety:** Shared mutable state violates Rust's safety guarantees
- **Debugging Nightmare:** Race conditions and memory corruption difficult to debug
- **Data Corruption Risk:** Crashes during writes can corrupt shared memory

**Why Rejected:** Shared mutable memory violates Rust's core safety principles. The complexity and risk outweigh the performance benefits. Modern FFI with UniFFI provides sufficient performance (<1ms per call).

---

## Consequences

### Positive Consequences

#### Performance Improvements

1. **Faster State Access:**
   - Rust storage with in-memory cache: 2-10x faster than MMKV via React Native bridge
   - Direct native access eliminates JavaScript bridge overhead
   - SQLite batch operations 5-10x faster than individual MMKV writes

2. **Reduced Memory Footprint:**
   - Eliminating 15 React Context providers saves ~20-30MB on TV devices
   - Single Rust state manager replaces multiple JS contexts
   - Native state management (Compose StateFlow, Swift @Published) more memory-efficient than React Context

3. **Optimized FFI Calls:**
   - Batch operations minimize FFI crossings (<10 calls per user interaction)
   - Async callbacks eliminate polling loops
   - Streaming state updates (downloads, focus) use efficient callback pattern

#### Maintainability and Consistency

1. **Single Source of Truth:**
   - Business logic state lives in ONE place (Rust core)
   - Eliminates state synchronization bugs between platforms
   - Changes to business logic automatically reflected in both Android and iOS

2. **Clear Boundaries:**
   - Business state (Rust) vs UI state (Native) clearly delineated
   - Developers know exactly where to implement state logic
   - Easier onboarding: "If it's business logic, it's in Rust; if it's UI, it's native"

3. **Type Safety:**
   - Rust's type system prevents state inconsistencies
   - UniFFI generates type-safe FFI bindings
   - Compile-time guarantees across all layers

#### Developer Experience

1. **Platform-Native Patterns:**
   - Kotlin developers use StateFlow and Compose idioms
   - Swift developers use @Published and Combine
   - No need to learn React Context patterns

2. **Better Testing:**
   - Rust state logic testable in isolation (80%+ coverage target)
   - Native UI state testable with platform tools (JUnit, XCTest)
   - FFI boundary testable with integration tests

### Negative Consequences

#### Increased Complexity

1. **State Split Decisions:**
   - Developers must decide: "Does this belong in Rust core or native UI?"
   - Requires understanding of FFI performance implications
   - Documented guidelines needed (see module-boundaries.md)

2. **FFI Synchronization:**
   - Must design callback interfaces for reactive state updates
   - Error handling across FFI boundaries requires careful design
   - Debugging state issues may require inspecting both Rust and native layers

3. **Migration Overhead:**
   - Gradual migration from React Context to Rust state requires parallel operation
   - MMKV → Rust storage migration requires careful data migration
   - Estimated 12-18 weeks for full state management migration

#### Platform-Specific Duplication

1. **UI State Implementation:**
   - UI state must be implemented twice (Kotlin StateFlow + Swift @Published)
   - Navigation state, focus state, animation state duplicated
   - However, this is acceptable tradeoff for native UI performance

#### Storage Migration Risks

1. **Data Loss Risk:**
   - Migration from MMKV to Rust storage could lose data if not carefully implemented
   - Requires backward compatibility layer to read old MMKV keys
   - Rollback strategy needed if migration fails

2. **Performance Regression Risk:**
   - If Rust storage not properly optimized, could be slower than MMKV
   - Requires performance benchmarking before full migration
   - Caching layer critical for matching/exceeding MMKV performance

### Risk Mitigation Strategies

1. **State Classification Guidelines:** Comprehensive decision matrix in `module-boundaries.md` defines what belongs in each layer
2. **Gradual Migration:** 4-phase migration plan with parallel MMKV/Rust storage operation
3. **Performance Monitoring:** Instrumentation at FFI boundary to detect performance regressions
4. **Backward Compatibility:** Rust storage can read from MMKV during migration period
5. **Feature Flags:** Ability to rollback to React Context state management per feature
6. **Comprehensive Testing:** FFI testing strategy with memory leak detection, error handling verification

---

## Implementation Strategy

### Phase 1: Foundation (Months 1-3)

**Objective:** Set up Rust state management infrastructure and migrate first critical contexts

**Deliverables:**
1. **Rust Storage Layer**
   - Implement SQLite storage backend with FFI-safe API
   - Add in-memory LRU cache (100-item, 30s TTL to match MMKV)
   - MMKV fallback reader for migration

2. **Event Bus**
   - Implement tokio::sync::broadcast event bus
   - Define core event types (ProfileSwitched, CatalogUpdated, etc.)
   - UniFFI callback interfaces for native layers

3. **First State Managers**
   - PerformanceManager (device metrics, adaptive quality)
   - FocusManager (TV focus state, history stack)
   - ProfileManager (profile switching, PIN validation)

**Success Criteria:**
- Rust storage benchmarks: <0.5ms cached read, <1ms write
- First 3 React Contexts migrated to Rust with feature flags
- Zero crashes or memory leaks in FFI boundary tests

### Phase 2: Core Business Logic (Months 4-7)

**Objective:** Migrate critical business logic contexts to Rust state management

**Deliverables:**
1. **Business Logic State Managers**
   - CatalogManager (addon catalog, library items)
   - MetadataManager (TMDB cache, Trakt data)
   - DownloadManager (download queue, progress tracking)
   - TraktManager (watchlist, sync operations)

2. **MMKV → Rust Storage Migration**
   - Implement data migration scripts
   - Dual-write to MMKV + Rust storage for safety
   - Gradual cutover with monitoring

**Success Criteria:**
- 60% of business logic state in Rust (8 of 15 contexts migrated)
- MMKV used only for fallback reads
- Performance equal or better than React Native baseline

### Phase 3: Advanced Features (Months 8-11)

**Objective:** Migrate remaining business logic; optimize FFI performance

**Deliverables:**
1. **Remaining State Managers**
   - AccountManager (authentication, session tokens)
   - SettingsManager (user preferences, app config)
   - WatchManager (watch progress, continue watching)
   - ThemeManager (theme data, dynamic colors)

2. **FFI Optimizations**
   - Batch API for multi-operation FFI calls
   - Zero-copy optimizations where possible
   - Connection pooling for async operations

**Success Criteria:**
- 100% business logic state in Rust
- UI-only state remains in native layers (navigation, focus, loading, toast)
- FFI call overhead <1ms per operation

### Phase 4: Optimization & Rollout (Months 12-14)

**Objective:** Performance tuning, stability improvements, gradual user rollout

**Deliverables:**
1. **Performance Tuning**
   - Cache size optimization (benchmarking)
   - FFI call frequency reduction
   - Memory leak detection and fixes

2. **Stability Improvements**
   - Comprehensive error handling
   - Crash reporting integration
   - Rollback mechanisms per feature

3. **Production Rollout**
   - Beta testing with 100+ users
   - Gradual rollout (10% → 50% → 100%)
   - Monitoring dashboards

**Success Criteria:**
- Crash-free rate >99.5%
- Performance targets met (see Performance Targets table)
- User feedback positive (<5% critical bug reports)

### Performance Targets

| Metric | Current (React Native + MMKV) | Target (Rust State + Native UI) | Improvement |
|--------|-------------------------------|----------------------------------|-------------|
| Cold app startup | 3-5 seconds | 1-2 seconds | 2-3x faster |
| Profile switch | 500-800ms | 100-200ms | 4-5x faster |
| Catalog load (cached) | 300-500ms | 50-100ms | 5-6x faster |
| Download start | 200-400ms | 50-100ms | 4x faster |
| Trakt sync (1000 items) | 5-8 seconds | 1-2 seconds | 4-5x faster |
| Settings update | 100-200ms | 20-50ms | 5-10x faster |
| Memory footprint | 150-250MB | 100-160MB | 30-40% reduction |

### State Migration Decision Matrix

| State Type | Current Location | Migrate to Rust? | Rationale |
|------------|------------------|------------------|-----------|
| User authentication | AccountContext | ✅ Yes | Business logic, security-critical, shared across platforms |
| Profile management | ProfileContext | ✅ Yes | Business logic, storage-backed, shared |
| Catalog/Library | CatalogContext + hooks | ✅ Yes | Business logic, external API, heavy processing |
| Trakt sync | TraktContext | ✅ Yes | Business logic, external API, background sync |
| Download queue | DownloadsContext | ✅ Yes | Business logic, state machine, storage-backed |
| Watch progress | watchedService | ✅ Yes | Business logic, storage-backed, shared |
| Settings/Preferences | useSettings hook | ✅ Yes | Business logic, storage-backed, shared |
| Performance metrics | PerformanceContext | ✅ Yes | Business logic, device detection, adaptive logic |
| TV Focus state | FocusContext | ⚠️ Partial | Core focus logic in Rust; UI coordinates in native |
| Navigation state | React Navigation | ❌ No | Platform-specific, UI-only, no benefit from Rust |
| Loading overlays | LoadingContext | ❌ No | UI-only, ephemeral, no persistence needed |
| Toast notifications | ToastContext | ❌ No | UI-only, transient, platform-specific presentation |
| Modal/Dialog visibility | Local state | ❌ No | UI-only, ephemeral, component-scoped |
| Scroll position | ScrollToTopContext | ❌ No | UI-only, ephemeral, no business logic |
| Header visibility | HeaderVisibility | ❌ No | UI-only, ephemeral, animation state |
| Trailer playback UI | TrailerContext | ❌ No | UI-only, player controls, platform-specific |
| Theme presentation | ThemeContext | ⚠️ Partial | Theme data in Rust; color application in native |
| Genre mappings | GenreContext | ✅ Yes | Business logic, TMDB API, metadata enrichment |

**Legend:**
- ✅ **Yes:** Migrate to Rust core (business logic, persistent, shared)
- ❌ **No:** Keep in native UI (UI-only, ephemeral, platform-specific)
- ⚠️ **Partial:** Split between Rust (logic) and Native (presentation)

---

## References

### Internal Documentation

- [ADR-001: Tri-Layer Architecture](./001-tri-layer-architecture.md)
- [ADR-002: FFI Binding Strategy](./002-ffi-binding-strategy.md)
- [State Management Map](../state-management-map.md) - Detailed analysis of current React Context architecture
- [Contexts and Hooks Inventory](../contexts-and-hooks-inventory.md) - Complete inventory of 15 contexts and 38+ hooks
- [Module Boundaries](../module-boundaries.md) - Decision matrix for Rust vs Native state placement
- [Rust SDK Design](../rust-sdk-design.md) - Rust core module structure and state managers
- [FFI Boundary Design](../ffi-boundary-design.md) - FFI interface contracts and callback patterns
- [Kotlin Native Design](../kotlin-native-design.md) - Kotlin StateFlow and Compose patterns
- [Swift Native Design](../swift-native-design.md) - Swift @Published and Combine patterns

### External Resources

#### Rust State Management

- [Tokio Broadcast Channel](https://docs.rs/tokio/latest/tokio/sync/broadcast/) - Event bus for state change notifications
- [Rusqlite](https://docs.rs/rusqlite/) - SQLite bindings for Rust storage layer
- [LRU Cache](https://docs.rs/lru/) - LRU cache implementation for storage layer

#### Platform State Management

- [Kotlin StateFlow](https://developer.android.com/kotlin/flow/stateflow-and-sharedflow) - Reactive state in Kotlin
- [Jetpack Compose State](https://developer.android.com/jetpack/compose/state) - Compose state management
- [Swift Combine Framework](https://developer.apple.com/documentation/combine) - Reactive programming in Swift
- [SwiftUI State Management](https://developer.apple.com/documentation/swiftui/state-and-data-flow) - @Published, @StateObject patterns

#### Storage and Persistence

- [MMKV](https://github.com/Tencent/MMKV) - Current storage solution (for comparison)
- [SQLite ACID Properties](https://www.sqlite.org/atomiccommit.html) - Transaction guarantees
- [Storage Performance Benchmarks](https://www.sqlite.org/speed.html) - SQLite performance characteristics

---

**Revision History:**
- 2026-01-13: Initial version (v1.0) - Dual-layer state management strategy with hybrid MMKV/Rust storage
