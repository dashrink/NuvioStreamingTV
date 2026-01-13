# Module Boundary Specifications for Tri-Layer Architecture

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Project:** NuvioStreamingTV Tri-Layer Architecture Migration
**Purpose:** Define clear boundaries between Rust core, Kotlin/Swift native layers, and FFI interfaces with comprehensive responsibility matrix and decision-making guidelines

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architectural Principles](#architectural-principles)
3. [Layer Definitions](#layer-definitions)
4. [Module Boundary Decision Matrix](#module-boundary-decision-matrix)
5. [Rust Core Layer: Business Logic Boundaries](#rust-core-layer-business-logic-boundaries)
6. [Native Platform Layer: UI and Platform APIs](#native-platform-layer-ui-and-platform-apis)
7. [FFI Boundary Layer: Interface Contracts](#ffi-boundary-layer-interface-contracts)
8. [Cross-Cutting Concerns: Shared Responsibilities](#cross-cutting-concerns-shared-responsibilities)
9. [Decision-Making Guidelines](#decision-making-guidelines)
10. [Anti-Patterns and What NOT to Put in Each Layer](#anti-patterns-and-what-not-to-put-in-each-layer)
11. [Migration Patterns](#migration-patterns)
12. [Validation and Testing](#validation-and-testing)
13. [References](#references)

---

## Executive Summary

The NuvioStreamingTV tri-layer architecture separates concerns across three distinct layers with well-defined boundaries:

1. **Rust Core Layer (nuvio-core)** - Platform-agnostic business logic, data processing, external API integrations
2. **Native Platform Layer (Kotlin/Swift)** - Platform-specific UI, navigation, video players, system APIs
3. **FFI Boundary Layer (UniFFI)** - Type-safe interface contracts, memory management, async bridges

This document provides a comprehensive specification of what belongs in each layer, decision-making guidelines for ambiguous cases, and validation criteria for architectural consistency.

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Platform Agnostic Core** | Rust core contains ZERO platform-specific code; all platform concerns in Kotlin/Swift |
| **UI in Native Layer** | All UI rendering, user interaction, and visual presentation stays in native code |
| **FFI as Contract** | FFI layer is a pure translation layer with no business logic |
| **Single Source of Truth** | Business logic lives in ONE place: Rust core |
| **Performance at Boundaries** | Minimize FFI crossings; batch operations where possible |
| **Type Safety Everywhere** | Strong typing across all layers with compile-time guarantees |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     NATIVE PLATFORM LAYER                            │
│                    (Kotlin/Swift - Platform-Specific)                │
│                                                                       │
│  Responsibilities:                                                    │
│  • UI Components (Jetpack Compose, SwiftUI)                          │
│  • Navigation (Compose Navigation, NavigationStack)                  │
│  • Video Players (ExoPlayer, AVPlayer)                               │
│  • Platform APIs (Android SDK, iOS SDK)                              │
│  • Focus Management UI (D-pad handlers, focus indicators)            │
│  • Theme Presentation (colors, fonts, layouts)                       │
│  • Deep Links & Notifications                                        │
│  • Local File System Access                                          │
│                                                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ FFI BOUNDARY LAYER
                               │ (UniFFI - Interface Contracts)
                               │
                               │ • Type Conversion
                               │ • Memory Management
                               │ • Error Translation
                               │ • Async Bridge
                               │ • Serialization
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       RUST CORE LAYER                                │
│                  (nuvio-core - Business Logic)                       │
│                                                                       │
│  Responsibilities:                                                    │
│  • Account & Profile Management (logic, validation)                  │
│  • Catalog & Library (content organization, filtering)               │
│  • Metadata Enrichment (TMDB/Trakt/MDBList integration)             │
│  • Stream Resolution (addon queries, quality selection)              │
│  • Download Management (state machine, progress tracking)            │
│  • Watch Progress (calculation, synchronization)                     │
│  • Settings & Preferences (storage, defaults, validation)            │
│  • Performance Monitoring (metrics, thresholds)                      │
│  • Focus State (TV navigation state)                                 │
│  • Theme Engine (theme data, switching logic)                        │
│  • Caching & Storage Abstraction                                     │
│  • External API Clients (HTTP, retry, rate limiting)                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architectural Principles

### Principle 1: Separation of Concerns

Each layer has a distinct responsibility:

- **Rust Core:** "What" and "How" of business logic
- **Native Platform:** "Where" and "When" of UI presentation
- **FFI Boundary:** "Translation" between Rust and native

### Principle 2: Platform Agnosticism in Core

**Rule:** If code needs `#[cfg(target_os = "android")]` or `#[cfg(target_os = "ios")]`, it does NOT belong in Rust core.

**Rationale:**
- Single codebase for all platforms reduces maintenance
- Testing is simpler with platform-agnostic code
- Platform-specific bugs are isolated to native layers

**Exception:** Platform abstraction traits (e.g., `StorageProvider`, `HttpClient`) can be defined in Rust core, implemented in native layers.

### Principle 3: UI Belongs in Native Layer

**Rule:** All rendering, user interaction, and visual presentation code stays in Kotlin/Swift.

**Rationale:**
- Native UI frameworks (Jetpack Compose, SwiftUI) are optimized for their platforms
- Platform conventions for navigation, gestures, accessibility are best handled natively
- Hot reload and UI debugging tools are platform-native

### Principle 4: FFI is a Translation Layer Only

**Rule:** FFI layer contains NO business logic. It only converts types and manages memory.

**Rationale:**
- FFI code is difficult to test and debug
- Business logic duplication across layers leads to inconsistency
- UniFFI automates most FFI code generation; manual FFI should be minimal

### Principle 5: Data Flows Down, Events Flow Up

**Data Flow (Rust → Native):**
```
Rust Core → FFI Serialization → Native Repository → ViewModel → UI
```

**Event Flow (Native → Rust):**
```
UI → ViewModel → Repository → FFI Deserialization → Rust Core
```

### Principle 6: Minimize FFI Boundary Crossings

**Performance Target:** <1ms overhead per FFI call

**Strategies:**
1. **Batch Operations:** `getProfiles()` returns all profiles, not `getProfile(id)` called N times
2. **Coarse-Grained APIs:** `updateProfileSettings(settings)` instead of `setName()`, `setAvatar()`, etc.
3. **Event Streaming:** Use callbacks/streams for real-time updates instead of polling
4. **Caching:** Native layer caches Rust data to avoid redundant FFI calls

---

## Layer Definitions

### Layer 1: Rust Core (nuvio-core)

**Location:** `rust-sdk/nuvio-core/src/`

**Language:** Rust (100% safe Rust; no unsafe except in FFI boundary)

**Purpose:** Platform-agnostic business logic, data processing, external API integrations, and state management.

**Key Characteristics:**
- No dependencies on platform-specific libraries (Android SDK, iOS SDK)
- No UI code or rendering logic
- No direct file system access (uses platform abstraction traits)
- Async-first with Tokio runtime
- Strongly typed with comprehensive error handling

**Modules:**
- Core Domain: `account`, `profile`, `catalog`, `library`, `metadata`, `stream`, `download`, `settings`, `theme`, `performance`, `focus`, `watch`
- Integration: `tmdb`, `trakt`, `stremio`, `mdblist`, `github`
- Platform Abstraction: `storage`, `http`, `time`, `crypto`
- Infrastructure: `cache`, `event_bus`, `logger`, `rate_limiter`, `sync`, `telemetry`

### Layer 2: Native Platform Layer (Kotlin/Swift)

**Location:**
- Android: `android/app/src/main/java/com/nuvio/`
- iOS/tvOS: `ios/NuvioTV/`

**Languages:** Kotlin (Android), Swift (iOS/tvOS)

**Purpose:** Platform-specific UI, navigation, video playback, system APIs, and user interaction.

**Key Characteristics:**
- Depends on platform SDKs (Android SDK, iOS SDK, TVUIKit)
- UI framework-specific code (Jetpack Compose, SwiftUI, UIKit)
- Direct access to platform APIs (camera, notifications, file system)
- Lifecycle management (Activities, ViewControllers, Scenes)

**Kotlin Packages:**
- `ui/` - Jetpack Compose screens and components
- `presentation/` - ViewModels with StateFlow
- `repository/` - FFI call abstraction
- `player/` - ExoPlayer integration
- `tv/` - Android TV Leanback components
- `service/` - Background services (downloads, notifications)
- `util/` - Platform-specific utilities

**Swift Modules:**
- `Views/` - SwiftUI screens and components
- `ViewModels/` - ObservableObject ViewModels
- `Repositories/` - FFI call abstraction
- `Player/` - AVPlayer integration
- `TV/` - tvOS focus management
- `Services/` - Background tasks
- `Utilities/` - Platform-specific utilities

### Layer 3: FFI Boundary Layer (UniFFI)

**Location:**
- Rust: `rust-sdk/nuvio-core/src/ffi.rs` + `nuvio.udl`
- Generated Kotlin: `android/app/src/main/java/uniffi/nuvio/`
- Generated Swift: `ios/NuvioTV/Generated/`

**Languages:** Rust (FFI definitions), UniFFI IDL (.udl), Generated Kotlin/Swift

**Purpose:** Type-safe interface contracts, memory management, error translation, and async bridging.

**Key Characteristics:**
- No business logic (pure translation layer)
- Automated code generation via UniFFI
- Memory safety guarantees (catch_unwind, Arc<T>)
- C ABI compatibility (`extern "C"`)
- Error handling without panics

**Components:**
- **UniFFI Definitions (.udl):** Interface specifications for all FFI-exposed types and functions
- **C FFI Layer (Rust):** `extern "C"` functions with panic handling
- **Generated Bindings (Kotlin/Swift):** Type-safe wrappers with native idioms (suspend functions, async/await)

---

## Module Boundary Decision Matrix

Use this matrix to determine where functionality belongs:

| Criteria | Rust Core | Native Platform | FFI Boundary |
|----------|-----------|-----------------|--------------|
| **Business Logic** | ✅ YES | ❌ NO | ❌ NO |
| **Data Validation** | ✅ YES | 🟡 Presentation-only | ❌ NO |
| **UI Rendering** | ❌ NO | ✅ YES | ❌ NO |
| **Navigation** | ❌ NO | ✅ YES | ❌ NO |
| **Video Playback** | ❌ NO | ✅ YES | 🟡 Control signals |
| **External API Calls** | ✅ YES | ❌ NO | ❌ NO |
| **Caching** | ✅ YES | 🟡 UI-level cache | ❌ NO |
| **State Management** | ✅ YES | 🟡 UI state only | ❌ NO |
| **Error Handling** | ✅ YES | 🟡 Presentation | ✅ Translation |
| **Async Operations** | ✅ YES | 🟡 UI async | ✅ Bridge |
| **Data Storage** | ✅ Abstraction | ✅ Implementation | ❌ NO |
| **Platform APIs** | ❌ NO | ✅ YES | 🟡 Callback signatures |
| **Focus Management** | ✅ State | ✅ UI logic | ❌ NO |
| **Theme Engine** | ✅ Data + Logic | ✅ Presentation | ❌ NO |
| **Analytics/Telemetry** | ✅ YES | 🟡 UI events | ❌ NO |
| **Localization** | ❌ NO | ✅ YES | 🟡 String keys |
| **Accessibility** | ❌ NO | ✅ YES | ❌ NO |
| **Performance Monitoring** | ✅ Metrics | ✅ UI profiling | ❌ NO |
| **Memory Management** | ✅ Arc<T> | ✅ ARC/GC | ✅ Ownership transfer |
| **Type Definitions** | ✅ Core types | 🟡 UI models | ✅ FFI types |

**Legend:**
- ✅ YES - Primary responsibility of this layer
- 🟡 Partial - Shared responsibility with specific scope
- ❌ NO - Does not belong in this layer

---

## Rust Core Layer: Business Logic Boundaries

### What Belongs in Rust Core

#### 1. Domain Business Logic

**Definition:** Core application rules, workflows, and data transformations independent of UI or platform.

**Examples:**

✅ **Account Management**
```rust
// rust-sdk/nuvio-core/src/core/account.rs
pub struct AccountManager {
    auth_state: Arc<RwLock<AuthState>>,
    storage: Box<dyn StorageProvider>,
}

impl AccountManager {
    /// Validates email format and password strength
    pub async fn create_account(&self, email: String, password: String) -> Result<Account> {
        // Validation logic
        if !is_valid_email(&email) {
            return Err(NuvioError::InvalidEmail);
        }

        // Password hashing
        let hashed = hash_password(&password)?;

        // Store account
        self.storage.set("account", &Account { email, password: hashed }).await?;
        Ok(account)
    }
}
```

✅ **Profile Management**
```rust
// rust-sdk/nuvio-core/src/core/profile.rs
pub struct ProfileManager {
    max_profiles: usize,
}

impl ProfileManager {
    /// Enforces business rule: maximum 5 profiles per account
    pub async fn create_profile(&self, name: String) -> Result<Profile> {
        let existing = self.list_profiles().await?;
        if existing.len() >= self.max_profiles {
            return Err(NuvioError::MaxProfilesExceeded);
        }

        // Profile creation logic
        let profile = Profile::new(Uuid::new_v4(), name);
        self.storage.set(&format!("profile:{}", profile.id), &profile).await?;
        Ok(profile)
    }
}
```

✅ **Catalog Management**
```rust
// rust-sdk/nuvio-core/src/core/catalog.rs
pub struct CatalogManager {
    cache: Arc<Cache>,
    stremio_client: StremioClient,
}

impl CatalogManager {
    /// Fetches catalog from addons, applies filters, caching
    pub async fn get_catalog(&self, catalog_id: &str, filters: CatalogFilters) -> Result<Catalog> {
        // Check cache first (business logic: 7-day TTL)
        if let Some(cached) = self.cache.get(catalog_id).await? {
            return Ok(cached);
        }

        // Fetch from Stremio addons
        let catalog = self.stremio_client.get_catalog(catalog_id).await?;

        // Apply filters (genre, rating, year)
        let filtered = catalog.apply_filters(&filters);

        // Cache with TTL
        self.cache.set(catalog_id, &filtered, Duration::days(7)).await?;

        Ok(filtered)
    }
}
```

#### 2. Data Processing and Transformation

**Definition:** Algorithms that transform, aggregate, or process data.

**Examples:**

✅ **Metadata Enrichment**
```rust
// rust-sdk/nuvio-core/src/core/metadata.rs
pub struct MetadataEnricher {
    tmdb_client: TmdbClient,
    trakt_client: TraktClient,
    mdblist_client: MdbListClient,
}

impl MetadataEnricher {
    /// Aggregates metadata from multiple sources
    pub async fn enrich_show(&self, imdb_id: &str) -> Result<EnrichedMetadata> {
        // Parallel API calls
        let (tmdb_data, trakt_data, ratings) = tokio::try_join!(
            self.tmdb_client.get_show(imdb_id),
            self.trakt_client.get_show(imdb_id),
            self.mdblist_client.get_ratings(imdb_id),
        )?;

        // Data merging logic
        let metadata = EnrichedMetadata {
            title: tmdb_data.title,
            poster: tmdb_data.poster_url,
            plot: tmdb_data.overview,
            runtime: tmdb_data.runtime,
            genres: tmdb_data.genres,
            ratings: ratings.aggregate(),
            trakt_id: trakt_data.ids.trakt,
        };

        Ok(metadata)
    }
}
```

✅ **Stream Resolution**
```rust
// rust-sdk/nuvio-core/src/core/stream.rs
pub struct StreamResolver {
    addons: Vec<StremioAddon>,
}

impl StreamResolver {
    /// Queries addons, ranks streams by quality/availability
    pub async fn resolve_streams(&self, meta_id: &str) -> Result<Vec<Stream>> {
        // Query all addons in parallel
        let stream_futures = self.addons.iter().map(|addon| addon.get_streams(meta_id));
        let results = futures::future::join_all(stream_futures).await;

        // Flatten and deduplicate
        let mut streams: Vec<Stream> = results
            .into_iter()
            .filter_map(Result::ok)
            .flatten()
            .collect();

        // Rank by quality (4K > 1080p > 720p) and seeds
        streams.sort_by_key(|s| (s.quality.rank(), s.seeds));
        streams.reverse();

        Ok(streams)
    }
}
```

#### 3. External API Integrations

**Definition:** HTTP clients, API request/response handling, rate limiting, retries.

**Examples:**

✅ **TMDB API Client**
```rust
// rust-sdk/nuvio-core/src/integration/tmdb.rs
pub struct TmdbClient {
    http_client: Arc<dyn HttpClient>,
    api_key: String,
    cache: Arc<Cache>,
    rate_limiter: Arc<RateLimiter>,
}

impl TmdbClient {
    /// Fetches show with retry logic, rate limiting, caching
    pub async fn get_show(&self, tmdb_id: u64) -> Result<TmdbShow> {
        // Rate limiting (40 req/10s)
        self.rate_limiter.acquire().await?;

        // Check cache (7-day TTL)
        let cache_key = format!("tmdb:show:{}", tmdb_id);
        if let Some(cached) = self.cache.get(&cache_key).await? {
            return Ok(cached);
        }

        // HTTP request with retry
        let url = format!("https://api.themoviedb.org/3/tv/{}?api_key={}", tmdb_id, self.api_key);
        let response = self.http_client.get(&url)
            .retry(3, Duration::seconds(2))
            .await?;

        // Parse JSON
        let show: TmdbShow = serde_json::from_str(&response.body)?;

        // Cache
        self.cache.set(&cache_key, &show, Duration::days(7)).await?;

        Ok(show)
    }
}
```

#### 4. State Management and Synchronization

**Definition:** Application state that persists across sessions, synchronization logic.

**Examples:**

✅ **Watch Progress Tracking**
```rust
// rust-sdk/nuvio-core/src/core/watch.rs
pub struct WatchProgressTracker {
    storage: Box<dyn StorageProvider>,
    sync_client: Arc<dyn SyncClient>,
}

impl WatchProgressTracker {
    /// Updates watch progress with Trakt sync
    pub async fn update_progress(&self, session_id: Uuid, position_ms: u64, duration_ms: u64) -> Result<()> {
        let progress_pct = (position_ms as f64 / duration_ms as f64) * 100.0;

        // Store locally
        let watch_entry = WatchEntry {
            session_id,
            position_ms,
            duration_ms,
            progress_pct,
            updated_at: Utc::now(),
        };
        self.storage.set(&format!("watch:{}", session_id), &watch_entry).await?;

        // Sync to Trakt if progress > 80% (marked as watched)
        if progress_pct >= 80.0 {
            self.sync_client.mark_watched(session_id).await?;
        }

        Ok(())
    }
}
```

✅ **Download State Machine**
```rust
// rust-sdk/nuvio-core/src/core/download.rs
pub struct DownloadManager {
    downloads: Arc<RwLock<HashMap<Uuid, Download>>>,
    event_bus: Arc<EventBus>,
}

impl DownloadManager {
    /// State machine: Queued -> Downloading -> Paused/Completed/Failed
    pub async fn update_state(&self, download_id: Uuid, new_state: DownloadState) -> Result<()> {
        let mut downloads = self.downloads.write().await;
        let download = downloads.get_mut(&download_id)
            .ok_or(NuvioError::DownloadNotFound)?;

        // Validate state transition
        match (&download.state, &new_state) {
            (DownloadState::Queued, DownloadState::Downloading) => Ok(()),
            (DownloadState::Downloading, DownloadState::Paused) => Ok(()),
            (DownloadState::Paused, DownloadState::Downloading) => Ok(()),
            (DownloadState::Downloading, DownloadState::Completed) => Ok(()),
            _ => Err(NuvioError::InvalidStateTransition),
        }?;

        download.state = new_state;
        download.updated_at = Utc::now();

        // Emit event for UI update
        self.event_bus.publish(DownloadEvent::StateChanged { download_id, state: new_state }).await;

        Ok(())
    }
}
```

#### 5. Caching and Performance Optimization

**Definition:** In-memory caching, LRU eviction, TTL management.

**Examples:**

✅ **Multi-Layer Cache**
```rust
// rust-sdk/nuvio-core/src/infrastructure/cache.rs
pub struct Cache {
    memory: Arc<RwLock<LruCache<String, CacheEntry>>>,
    storage: Box<dyn StorageProvider>,
}

impl Cache {
    /// Get from memory cache first, fallback to storage
    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        // Check memory cache
        {
            let cache = self.memory.read().await;
            if let Some(entry) = cache.get(key) {
                if !entry.is_expired() {
                    return Ok(Some(serde_json::from_str(&entry.value)?));
                }
            }
        }

        // Fallback to storage
        if let Some(value) = self.storage.get(key).await? {
            // Promote to memory cache
            self.memory.write().await.put(key.to_string(), CacheEntry {
                value,
                expires_at: Utc::now() + Duration::seconds(30),
            });
            return Ok(Some(serde_json::from_str(&value)?));
        }

        Ok(None)
    }
}
```

#### 6. Settings and Configuration

**Definition:** Application settings, defaults, validation, persistence.

**Examples:**

✅ **Settings Manager**
```rust
// rust-sdk/nuvio-core/src/core/settings.rs
pub struct SettingsManager {
    storage: Box<dyn StorageProvider>,
    defaults: Settings,
}

impl SettingsManager {
    /// Get settings with fallback to defaults
    pub async fn get(&self) -> Result<Settings> {
        match self.storage.get("settings").await? {
            Some(settings) => Ok(settings),
            None => Ok(self.defaults.clone()),
        }
    }

    /// Update settings with validation
    pub async fn update(&self, updates: SettingsUpdate) -> Result<Settings> {
        let mut settings = self.get().await?;

        // Validation
        if let Some(quality) = updates.video_quality {
            if !Self::is_valid_quality(&quality) {
                return Err(NuvioError::InvalidQuality);
            }
            settings.video_quality = quality;
        }

        // Persist
        self.storage.set("settings", &settings).await?;
        Ok(settings)
    }
}
```

### What Does NOT Belong in Rust Core

❌ **UI Rendering and Components**
```rust
// WRONG: Do not put UI code in Rust
// This belongs in Jetpack Compose or SwiftUI
pub fn render_profile_card(profile: &Profile) -> Widget {
    // NO! Rust core should not render UI
}
```

❌ **Navigation Logic**
```rust
// WRONG: Do not manage navigation in Rust
// This belongs in Compose Navigation or NavigationStack
pub fn navigate_to_player(stream: Stream) {
    // NO! Navigation is platform-specific
}
```

❌ **Video Player Control**
```rust
// WRONG: Do not control video player directly from Rust
// This belongs in ExoPlayer or AVPlayer wrappers
pub fn play_video(url: &str) {
    // NO! Video playback is platform-specific
}
```

❌ **Platform-Specific File Access**
```rust
// WRONG: Do not use platform-specific file paths
// Use platform abstraction traits instead
pub async fn save_thumbnail(path: &Path) {
    std::fs::write(path, data).unwrap(); // NO!
}
```

❌ **Direct Android/iOS SDK Calls**
```rust
// WRONG: Do not call Android or iOS APIs from Rust core
#[cfg(target_os = "android")]
pub fn show_toast(message: &str) {
    // Call Android Toast API - NO!
}
```

---

## Native Platform Layer: UI and Platform APIs

### What Belongs in Native Platform Layer

#### 1. UI Components and Rendering

**Definition:** All visual presentation, user interaction, and UI framework-specific code.

**Examples:**

✅ **Jetpack Compose Screen (Kotlin)**
```kotlin
// android/app/src/main/java/com/nuvio/ui/screens/ProfileListScreen.kt
@Composable
fun ProfileListScreen(
    viewModel: ProfileViewModel = hiltViewModel(),
    onProfileClick: (Profile) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp)
    ) {
        items(uiState.profiles) { profile ->
            ProfileCard(
                profile = profile,
                onClick = { onProfileClick(profile) }
            )
        }
    }
}

@Composable
fun ProfileCard(profile: Profile, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp)
            .clickable { onClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(modifier = Modifier.padding(16.dp)) {
            // Avatar
            AsyncImage(
                model = profile.avatar,
                contentDescription = "Profile avatar",
                modifier = Modifier.size(48.dp).clip(CircleShape)
            )

            Spacer(modifier = Modifier.width(16.dp))

            // Name
            Text(
                text = profile.name,
                style = MaterialTheme.typography.titleMedium
            )
        }
    }
}
```

✅ **SwiftUI Screen (Swift)**
```swift
// ios/NuvioTV/Views/ProfileListView.swift
struct ProfileListView: View {
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(viewModel.profiles) { profile in
                        ProfileCard(profile: profile) {
                            viewModel.selectProfile(profile)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Profiles")
            .task {
                await viewModel.loadProfiles()
            }
        }
    }
}

struct ProfileCard: View {
    let profile: Profile
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Avatar
                AsyncImage(url: URL(string: profile.avatar)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    ProgressView()
                }
                .frame(width: 48, height: 48)
                .clipShape(Circle())

                // Name
                Text(profile.name)
                    .font(.title3)
                    .foregroundColor(.primary)

                Spacer()
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}
```

#### 2. Navigation and Routing

**Definition:** Screen transitions, deep linking, navigation stacks, tab bars.

**Examples:**

✅ **Compose Navigation (Kotlin)**
```kotlin
// android/app/src/main/java/com/nuvio/navigation/NuvioNavGraph.kt
@Composable
fun NuvioNavGraph(
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        composable("home") {
            HomeScreen(
                onMovieClick = { movie ->
                    navController.navigate("details/${movie.id}")
                }
            )
        }

        composable(
            route = "details/{movieId}",
            arguments = listOf(navArgument("movieId") { type = NavType.StringType })
        ) { backStackEntry ->
            val movieId = backStackEntry.arguments?.getString("movieId")
            DetailsScreen(
                movieId = movieId,
                onPlayClick = { stream ->
                    navController.navigate("player/${stream.id}")
                }
            )
        }

        composable("player/{streamId}") { backStackEntry ->
            val streamId = backStackEntry.arguments?.getString("streamId")
            PlayerScreen(streamId = streamId)
        }
    }
}
```

✅ **NavigationStack (Swift)**
```swift
// ios/NuvioTV/Navigation/Router.swift
enum Route: Hashable {
    case home
    case details(movieId: String)
    case player(streamId: String)
    case settings
}

struct ContentView: View {
    @StateObject private var router = Router()

    var body: some View {
        NavigationStack(path: $router.path) {
            HomeView()
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .home:
                        HomeView()
                    case .details(let movieId):
                        DetailsView(movieId: movieId)
                    case .player(let streamId):
                        PlayerView(streamId: streamId)
                    case .settings:
                        SettingsView()
                    }
                }
        }
        .environmentObject(router)
    }
}

class Router: ObservableObject {
    @Published var path = NavigationPath()

    func navigate(to route: Route) {
        path.append(route)
    }

    func popToRoot() {
        path.removeLast(path.count)
    }
}
```

#### 3. Video Player Integration

**Definition:** Video playback, controls, subtitles, picture-in-picture.

**Examples:**

✅ **ExoPlayer Integration (Kotlin)**
```kotlin
// android/app/src/main/java/com/nuvio/player/VideoPlayerManager.kt
class VideoPlayerManager(
    private val context: Context,
    private val repository: StreamRepository
) {
    private var player: ExoPlayer? = null
    private var progressTracker: Job? = null

    fun initializePlayer(streamUrl: String, sessionId: String): ExoPlayer {
        val player = ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(context))
            .build()

        val mediaItem = MediaItem.fromUri(streamUrl)
        player.setMediaItem(mediaItem)
        player.prepare()

        // Start progress tracking
        progressTracker = CoroutineScope(Dispatchers.IO).launch {
            while (player.isPlaying) {
                val position = player.currentPosition
                val duration = player.duration
                repository.updateWatchProgress(sessionId, position, duration)
                delay(1000)
            }
        }

        this.player = player
        return player
    }

    fun release() {
        progressTracker?.cancel()
        player?.release()
        player = null
    }
}

@Composable
fun VideoPlayer(
    streamId: String,
    viewModel: PlayerViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val playerManager = remember { VideoPlayerManager(context, viewModel.repository) }
    val stream by viewModel.getStream(streamId).collectAsState(initial = null)

    DisposableEffect(stream) {
        stream?.let { s ->
            val player = playerManager.initializePlayer(s.url, s.sessionId)
            // Attach player to UI
        }

        onDispose {
            playerManager.release()
        }
    }

    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                player = playerManager.player
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}
```

✅ **AVPlayer Integration (Swift)**
```swift
// ios/NuvioTV/Player/AVPlayerManager.swift
class AVPlayerManager: ObservableObject {
    private var player: AVPlayer?
    private var progressObserver: Any?
    private let repository: StreamRepository

    init(repository: StreamRepository) {
        self.repository = repository
    }

    func play(streamUrl: URL, sessionId: UUID) {
        let playerItem = AVPlayerItem(url: streamUrl)
        player = AVPlayer(playerItem: playerItem)

        // Add periodic time observer for watch progress
        let interval = CMTime(seconds: 1.0, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        progressObserver = player?.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self = self,
                  let duration = self.player?.currentItem?.duration else { return }

            let position = CMTimeGetSeconds(time)
            let total = CMTimeGetSeconds(duration)

            Task {
                try await self.repository.updateWatchProgress(
                    sessionId: sessionId,
                    positionMs: UInt64(position * 1000),
                    durationMs: UInt64(total * 1000)
                )
            }
        }

        player?.play()
    }

    func pause() {
        player?.pause()
    }

    func cleanup() {
        if let observer = progressObserver {
            player?.removeTimeObserver(observer)
        }
        player = nil
    }
}

struct VideoPlayerView: View {
    let streamId: String
    @StateObject private var viewModel = PlayerViewModel()
    @StateObject private var playerManager: AVPlayerManager

    init(streamId: String, repository: StreamRepository) {
        self.streamId = streamId
        _playerManager = StateObject(wrappedValue: AVPlayerManager(repository: repository))
    }

    var body: some View {
        VideoPlayer(player: playerManager.player)
            .ignoresSafeArea()
            .task {
                if let stream = await viewModel.loadStream(streamId: streamId) {
                    playerManager.play(
                        streamUrl: URL(string: stream.url)!,
                        sessionId: stream.sessionId
                    )
                }
            }
            .onDisappear {
                playerManager.cleanup()
            }
    }
}
```

#### 4. Platform APIs (Notifications, File System, Camera, etc.)

**Definition:** Direct access to platform-specific system services.

**Examples:**

✅ **Notification Service (Kotlin)**
```kotlin
// android/app/src/main/java/com/nuvio/service/NotificationService.kt
class NotificationService(private val context: Context) {
    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    fun showDownloadProgress(downloadId: String, title: String, progress: Int) {
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText("Downloading...")
            .setSmallIcon(R.drawable.ic_download)
            .setProgress(100, progress, false)
            .setOngoing(true)
            .build()

        notificationManager.notify(downloadId.hashCode(), notification)
    }

    fun showDownloadComplete(downloadId: String, title: String) {
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText("Download complete")
            .setSmallIcon(R.drawable.ic_check)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(downloadId.hashCode(), notification)
    }
}
```

✅ **File System Access (Swift)**
```swift
// ios/NuvioTV/Services/FileSystemService.swift
class FileSystemService {
    private let fileManager = FileManager.default

    func getDocumentsDirectory() -> URL {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    func saveDownload(data: Data, filename: String) throws {
        let fileURL = getDocumentsDirectory().appendingPathComponent(filename)
        try data.write(to: fileURL)
    }

    func loadDownload(filename: String) throws -> Data {
        let fileURL = getDocumentsDirectory().appendingPathComponent(filename)
        return try Data(contentsOf: fileURL)
    }

    func deleteDownload(filename: String) throws {
        let fileURL = getDocumentsDirectory().appendingPathComponent(filename)
        try fileManager.removeItem(at: fileURL)
    }

    func listDownloads() throws -> [String] {
        let documentsURL = getDocumentsDirectory()
        let files = try fileManager.contentsOfDirectory(at: documentsURL, includingPropertiesForKeys: nil)
        return files.map { $0.lastPathComponent }
    }
}
```

#### 5. Focus Management and TV Navigation UI

**Definition:** D-pad handling, focus indicators, spatial navigation, voice search UI.

**Examples:**

✅ **TV Focus Management (Kotlin)**
```kotlin
// android/app/src/main/java/com/nuvio/tv/focus/TVFocusManager.kt
@Composable
fun FocusableCard(
    title: String,
    onFocus: () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isFocused by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }

    Card(
        modifier = modifier
            .focusRequester(focusRequester)
            .onFocusChanged { state ->
                isFocused = state.isFocused
                if (state.isFocused) onFocus()
            }
            .focusable(),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isFocused) 16.dp else 4.dp
        ),
        border = if (isFocused) {
            BorderStroke(2.dp, Color.White)
        } else null
    ) {
        // Card content
        Text(
            text = title,
            modifier = Modifier
                .padding(16.dp)
                .clickable { onClick() }
        )
    }
}

// TV Grid with D-pad navigation
@Composable
fun TVContentGrid(
    items: List<ContentItem>,
    onItemClick: (ContentItem) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(5),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(items) { item ->
            FocusableCard(
                title = item.title,
                onFocus = { /* Update focused item in Rust state */ },
                onClick = { onItemClick(item) }
            )
        }
    }
}
```

✅ **tvOS Focus Engine (Swift)**
```swift
// ios/NuvioTV/TV/TVFocusableButton.swift
struct TVFocusableButton: View {
    let title: String
    let action: () -> Void
    @FocusState private var isFocused: Bool

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.title3)
                .padding()
                .frame(maxWidth: .infinity)
                .background(isFocused ? Color.white : Color.gray)
                .foregroundColor(isFocused ? Color.black : Color.white)
                .cornerRadius(8)
                .scaleEffect(isFocused ? 1.1 : 1.0)
                .animation(.easeInOut(duration: 0.2), value: isFocused)
        }
        .buttonStyle(PlainButtonStyle())
        .focused($isFocused)
    }
}

// TV Grid with Focus Engine
struct TVContentGrid: View {
    let items: [ContentItem]
    let onItemSelect: (ContentItem) -> Void
    @Namespace private var namespace

    var body: some View {
        ScrollView {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 20), count: 5), spacing: 20) {
                ForEach(items) { item in
                    TVContentCard(item: item, namespace: namespace)
                        .onTapGesture {
                            onItemSelect(item)
                        }
                }
            }
            .padding()
        }
    }
}

struct TVContentCard: View {
    let item: ContentItem
    let namespace: Namespace.ID
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack {
            AsyncImage(url: URL(string: item.poster)) { image in
                image
                    .resizable()
                    .aspectRatio(2/3, contentMode: .fit)
            } placeholder: {
                ProgressView()
            }
            .frame(width: 200, height: 300)
            .cornerRadius(8)
            .shadow(radius: isFocused ? 20 : 5)

            Text(item.title)
                .font(.caption)
                .lineLimit(1)
        }
        .scaleEffect(isFocused ? 1.1 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isFocused)
        .focused($isFocused)
        .onChange(of: isFocused) { focused in
            if focused {
                // Notify Rust SDK of focus change
                Task {
                    try await FocusRepository.shared.updateFocusedItem(itemId: item.id)
                }
            }
        }
    }
}
```

#### 6. Theme Presentation (Colors, Fonts, Layouts)

**Definition:** Visual styling, theme switching UI, dark/light mode handling.

**Examples:**

✅ **Jetpack Compose Theme (Kotlin)**
```kotlin
// android/app/src/main/java/com/nuvio/ui/theme/Theme.kt
@Composable
fun NuvioTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = Color(0xFF6200EE),
            secondary = Color(0xFF03DAC6),
            background = Color(0xFF121212),
            surface = Color(0xFF1E1E1E),
        )
    } else {
        lightColorScheme(
            primary = Color(0xFF6200EE),
            secondary = Color(0xFF03DAC6),
            background = Color(0xFFFFFFFF),
            surface = Color(0xFFF5F5F5),
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}

// Theme switcher
@Composable
fun ThemeSwitcher(viewModel: ThemeViewModel = hiltViewModel()) {
    val currentTheme by viewModel.currentTheme.collectAsState()

    Row {
        Button(onClick = { viewModel.setTheme(Theme.LIGHT) }) {
            Text("Light")
        }
        Button(onClick = { viewModel.setTheme(Theme.DARK) }) {
            Text("Dark")
        }
        Button(onClick = { viewModel.setTheme(Theme.SYSTEM) }) {
            Text("System")
        }
    }
}
```

✅ **SwiftUI Theme (Swift)**
```swift
// ios/NuvioTV/Theme/ThemeManager.swift
struct NuvioTheme {
    let primary: Color
    let secondary: Color
    let background: Color
    let surface: Color

    static let light = NuvioTheme(
        primary: Color(hex: "6200EE"),
        secondary: Color(hex: "03DAC6"),
        background: .white,
        surface: Color(.systemGray6)
    )

    static let dark = NuvioTheme(
        primary: Color(hex: "6200EE"),
        secondary: Color(hex: "03DAC6"),
        background: .black,
        surface: Color(.systemGray5)
    )
}

class ThemeManager: ObservableObject {
    @Published var currentTheme: NuvioTheme = .dark
    private let repository: ThemeRepository

    init(repository: ThemeRepository) {
        self.repository = repository
        Task {
            await loadTheme()
        }
    }

    func loadTheme() async {
        do {
            let themeData = try await repository.getCurrentTheme()
            currentTheme = themeData.isDark ? .dark : .light
        } catch {
            print("Failed to load theme: \(error)")
        }
    }

    func setTheme(_ theme: ThemeMode) async {
        do {
            try await repository.setTheme(theme)
            currentTheme = theme == .dark ? .dark : .light
        } catch {
            print("Failed to set theme: \(error)")
        }
    }
}

// Theme environment key
struct ThemeKey: EnvironmentKey {
    static let defaultValue: NuvioTheme = .dark
}

extension EnvironmentValues {
    var theme: NuvioTheme {
        get { self[ThemeKey.self] }
        set { self[ThemeKey.self] = newValue }
    }
}

// Usage in views
struct ContentView: View {
    @EnvironmentObject var themeManager: ThemeManager

    var body: some View {
        VStack {
            Text("Hello")
        }
        .background(themeManager.currentTheme.background)
        .foregroundColor(themeManager.currentTheme.primary)
    }
}
```

### What Does NOT Belong in Native Platform Layer

❌ **Business Logic**
```kotlin
// WRONG: Do not duplicate business logic in Kotlin/Swift
// This belongs in Rust core
class ProfileManager {
    fun createProfile(name: String): Profile {
        // Validation logic - NO! This should be in Rust
        if (name.isBlank()) throw IllegalArgumentException("Name required")
        if (profiles.size >= 5) throw IllegalStateException("Max profiles exceeded")
        return Profile(UUID.randomUUID(), name)
    }
}
```

❌ **External API Calls**
```swift
// WRONG: Do not make API calls directly from Swift/Kotlin
// This belongs in Rust core
func fetchMetadata(tmdbId: Int) async throws -> Metadata {
    let url = URL(string: "https://api.themoviedb.org/3/tv/\(tmdbId)")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(Metadata.self, from: data)
}
```

❌ **Complex Data Processing**
```kotlin
// WRONG: Do not implement complex algorithms in Kotlin/Swift
// This belongs in Rust core
fun rankStreams(streams: List<Stream>): List<Stream> {
    return streams.sortedWith(compareBy(
        { -it.quality.rank() },
        { -it.seeds },
        { it.size }
    ))
}
```

❌ **State Management Logic**
```swift
// WRONG: Do not manage application state in Swift/Kotlin
// This belongs in Rust core (native layer only manages UI state)
class DownloadManager {
    func updateState(downloadId: UUID, newState: DownloadState) {
        // State machine logic - NO! This should be in Rust
        guard let download = downloads[downloadId] else { return }
        // Complex state transition validation...
    }
}
```

---

## FFI Boundary Layer: Interface Contracts

### What Belongs in FFI Boundary Layer

#### 1. Type Definitions and Conversions

**Definition:** UniFFI interface definitions (.udl), type mappings, serialization/deserialization.

**Examples:**

✅ **UniFFI Interface Definition (.udl)**
```udl
// rust-sdk/nuvio-core/nuvio.udl

namespace nuvio {
    // Initialize SDK
    [Throws=NuvioError]
    void initialize(string storage_path);
};

// Profile types
dictionary Profile {
    string id;
    string name;
    string avatar;
    timestamp created_at;
};

dictionary CreateProfileRequest {
    string name;
    string? avatar;
};

// Profile interface
interface ProfileManager {
    constructor();

    [Throws=NuvioError]
    sequence<Profile> list_profiles();

    [Throws=NuvioError]
    Profile create_profile(CreateProfileRequest request);

    [Throws=NuvioError]
    void delete_profile(string profile_id);

    [Throws=NuvioError]
    Profile? get_current_profile();

    [Throws=NuvioError]
    void switch_profile(string profile_id);
};

// Error types
[Error]
enum NuvioError {
    "InvalidEmail",
    "MaxProfilesExceeded",
    "ProfileNotFound",
    "NetworkError",
    "StorageError",
};
```

✅ **C FFI Implementation (Rust)**
```rust
// rust-sdk/nuvio-core/src/ffi.rs

use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::Arc;

// UniFFI generates these functions, but here's the pattern:

#[no_mangle]
pub extern "C" fn nuvio_profile_manager_create() -> *mut ProfileManager {
    catch_unwind(AssertUnwindSafe(|| {
        let manager = ProfileManager::new();
        Box::into_raw(Box::new(manager))
    }))
    .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub extern "C" fn nuvio_profile_manager_list_profiles(
    manager: *const ProfileManager,
    out_profiles: *mut *mut u8,
    out_len: *mut usize,
    error: *mut *mut FfiError,
) -> bool {
    catch_unwind(AssertUnwindSafe(|| {
        let manager = unsafe { &*manager };

        // Call business logic
        match manager.list_profiles_blocking() {
            Ok(profiles) => {
                // Serialize to JSON
                let json = serde_json::to_string(&profiles).unwrap();
                let bytes = json.into_bytes();

                unsafe {
                    *out_len = bytes.len();
                    *out_profiles = bytes.as_ptr() as *mut u8;
                    std::mem::forget(bytes);
                }

                true
            }
            Err(e) => {
                unsafe {
                    *error = Box::into_raw(Box::new(FfiError::from(e)));
                }
                false
            }
        }
    }))
    .unwrap_or(false)
}

#[no_mangle]
pub extern "C" fn nuvio_free_string(ptr: *mut u8, len: usize) {
    if !ptr.is_null() {
        unsafe {
            let _ = Vec::from_raw_parts(ptr, len, len);
        }
    }
}
```

#### 2. Memory Management Functions

**Definition:** Allocation, deallocation, ownership transfer across FFI boundary.

**Examples:**

✅ **Memory Management (Rust FFI)**
```rust
// rust-sdk/nuvio-core/src/ffi/memory.rs

/// Allocate memory for a Rust object, transfer ownership to caller
#[no_mangle]
pub extern "C" fn nuvio_alloc<T>(value: T) -> *mut T {
    Box::into_raw(Box::new(value))
}

/// Free memory allocated by Rust
#[no_mangle]
pub extern "C" fn nuvio_free<T>(ptr: *mut T) {
    if !ptr.is_null() {
        unsafe {
            let _ = Box::from_raw(ptr);
        }
    }
}

/// Clone an Arc pointer (increment reference count)
#[no_mangle]
pub extern "C" fn nuvio_arc_clone<T>(ptr: *const Arc<T>) -> *mut Arc<T> {
    if ptr.is_null() {
        return std::ptr::null_mut();
    }

    unsafe {
        let arc = &*ptr;
        let cloned = Arc::clone(arc);
        Box::into_raw(Box::new(cloned))
    }
}

/// Decrement Arc reference count
#[no_mangle]
pub extern "C" fn nuvio_arc_release<T>(ptr: *mut Arc<T>) {
    if !ptr.is_null() {
        unsafe {
            let _ = Box::from_raw(ptr);
        }
    }
}

/// Allocate string and transfer ownership
#[no_mangle]
pub extern "C" fn nuvio_string_alloc(s: &str) -> *mut c_char {
    match CString::new(s) {
        Ok(cstr) => cstr.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Free string allocated by Rust
#[no_mangle]
pub extern "C" fn nuvio_string_free(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe {
            let _ = CString::from_raw(ptr);
        }
    }
}
```

#### 3. Error Translation

**Definition:** Converting Rust errors to FFI-safe error codes/enums.

**Examples:**

✅ **Error Translation (Rust)**
```rust
// rust-sdk/nuvio-core/src/ffi/error.rs

#[repr(C)]
pub struct FfiError {
    pub code: i32,
    pub message: *mut c_char,
}

impl FfiError {
    pub fn from(error: NuvioError) -> Self {
        let (code, message) = match error {
            NuvioError::InvalidEmail => (1, "Invalid email format"),
            NuvioError::MaxProfilesExceeded => (2, "Maximum 5 profiles allowed"),
            NuvioError::ProfileNotFound => (3, "Profile not found"),
            NuvioError::NetworkError(e) => (100, &format!("Network error: {}", e)),
            NuvioError::StorageError(e) => (200, &format!("Storage error: {}", e)),
        };

        FfiError {
            code,
            message: nuvio_string_alloc(message),
        }
    }
}

#[no_mangle]
pub extern "C" fn nuvio_error_free(error: *mut FfiError) {
    if !error.is_null() {
        unsafe {
            let error = Box::from_raw(error);
            if !error.message.is_null() {
                nuvio_string_free(error.message);
            }
        }
    }
}
```

✅ **Error Handling (Kotlin)**
```kotlin
// android/app/src/main/java/uniffi/nuvio/NuvioError.kt
// Generated by UniFFI

sealed class NuvioError : Exception() {
    data class InvalidEmail(override val message: String = "Invalid email format") : NuvioError()
    data class MaxProfilesExceeded(override val message: String = "Maximum 5 profiles allowed") : NuvioError()
    data class ProfileNotFound(override val message: String = "Profile not found") : NuvioError()
    data class NetworkError(override val message: String) : NuvioError()
    data class StorageError(override val message: String) : NuvioError()
}

// Usage in repository
class ProfileRepository(private val manager: ProfileManager) {
    suspend fun createProfile(name: String): Result<Profile> = withContext(Dispatchers.IO) {
        try {
            val request = CreateProfileRequest(name, null)
            val profile = manager.createProfile(request)
            Result.success(profile)
        } catch (e: NuvioError.MaxProfilesExceeded) {
            Result.failure(e)
        } catch (e: NuvioError) {
            Result.failure(e)
        }
    }
}
```

✅ **Error Handling (Swift)**
```swift
// ios/NuvioTV/Generated/NuvioError.swift
// Generated by UniFFI

enum NuvioError: Error {
    case invalidEmail(message: String = "Invalid email format")
    case maxProfilesExceeded(message: String = "Maximum 5 profiles allowed")
    case profileNotFound(message: String = "Profile not found")
    case networkError(message: String)
    case storageError(message: String)
}

// Usage in repository
class ProfileRepository {
    private let manager: ProfileManager

    init(manager: ProfileManager) {
        self.manager = manager
    }

    func createProfile(name: String) async throws -> Profile {
        let request = CreateProfileRequest(name: name, avatar: nil)
        do {
            return try await manager.createProfile(request: request)
        } catch let error as NuvioError {
            throw error
        }
    }
}
```

#### 4. Async Bridge (Callbacks, Futures)

**Definition:** Bridging Rust futures to Kotlin coroutines and Swift async/await.

**Examples:**

✅ **Async Bridge (Rust)**
```rust
// rust-sdk/nuvio-core/src/ffi/async_bridge.rs

pub type FfiCallback = extern "C" fn(data: *mut u8, len: usize, error: *mut FfiError, user_data: *mut c_void);

#[no_mangle]
pub extern "C" fn nuvio_profile_manager_list_profiles_async(
    manager: *const ProfileManager,
    callback: FfiCallback,
    user_data: *mut c_void,
) {
    let manager = unsafe { &*manager };
    let manager_clone = manager.clone();

    tokio::spawn(async move {
        match manager_clone.list_profiles().await {
            Ok(profiles) => {
                let json = serde_json::to_string(&profiles).unwrap();
                let bytes = json.into_bytes();

                callback(
                    bytes.as_ptr() as *mut u8,
                    bytes.len(),
                    std::ptr::null_mut(),
                    user_data,
                );

                std::mem::forget(bytes);
            }
            Err(e) => {
                callback(
                    std::ptr::null_mut(),
                    0,
                    Box::into_raw(Box::new(FfiError::from(e))),
                    user_data,
                );
            }
        }
    });
}
```

✅ **Async Bridge (Kotlin with Coroutines)**
```kotlin
// android/app/src/main/java/uniffi/nuvio/ProfileManager.kt
// Generated by UniFFI

class ProfileManager {
    private val handle: Long // C pointer

    suspend fun listProfiles(): List<Profile> = suspendCancellableCoroutine { continuation ->
        val callback: FfiCallback = { data, len, error, _ ->
            if (error != null) {
                val nuvioError = NuvioError.fromFfi(error)
                continuation.resumeWithException(nuvioError)
            } else {
                val json = String(data.readBytes(len))
                val profiles = Json.decodeFromString<List<Profile>>(json)
                continuation.resume(profiles)
            }
        }

        nuvio_profile_manager_list_profiles_async(handle, callback, null)
    }
}
```

✅ **Async Bridge (Swift with async/await)**
```swift
// ios/NuvioTV/Generated/ProfileManager.swift
// Generated by UniFFI

class ProfileManager {
    private let handle: OpaquePointer

    func listProfiles() async throws -> [Profile] {
        return try await withCheckedThrowingContinuation { continuation in
            let callback: FfiCallback = { data, len, error, userData in
                if let error = error {
                    let nuvioError = NuvioError.fromFfi(error)
                    continuation.resume(throwing: nuvioError)
                } else {
                    let jsonData = Data(bytes: data, count: Int(len))
                    let profiles = try! JSONDecoder().decode([Profile].self, from: jsonData)
                    continuation.resume(returning: profiles)
                }
            }

            nuvio_profile_manager_list_profiles_async(handle, callback, nil)
        }
    }
}
```

### What Does NOT Belong in FFI Boundary Layer

❌ **Business Logic**
```rust
// WRONG: Do not put business logic in FFI layer
#[no_mangle]
pub extern "C" fn nuvio_validate_and_create_profile(name: *const c_char) -> *mut Profile {
    // Validation logic in FFI - NO!
    let name_str = unsafe { CStr::from_ptr(name).to_str().unwrap() };
    if name_str.is_empty() {
        return std::ptr::null_mut();
    }
    // This belongs in ProfileManager, not FFI layer
}
```

❌ **External API Calls**
```rust
// WRONG: Do not make API calls from FFI layer
#[no_mangle]
pub extern "C" fn nuvio_fetch_metadata(tmdb_id: u64) -> *mut c_char {
    // HTTP call in FFI - NO!
    let response = reqwest::blocking::get(&format!("https://api.themoviedb.org/3/tv/{}", tmdb_id))
        .unwrap()
        .text()
        .unwrap();
    CString::new(response).unwrap().into_raw()
}
```

❌ **Complex Data Transformations**
```rust
// WRONG: Do not process data in FFI layer
#[no_mangle]
pub extern "C" fn nuvio_rank_streams(streams: *const u8, len: usize) -> *mut u8 {
    // Ranking logic in FFI - NO!
    // This should call ProfileManager.rank_streams() instead
}
```

---

## Cross-Cutting Concerns: Shared Responsibilities

Some concerns span multiple layers. Here's how to split them:

### 1. Logging and Telemetry

| Layer | Responsibility |
|-------|----------------|
| **Rust Core** | • Business logic logging (info, debug, trace)<br>• Performance metrics collection<br>• Error logging with context |
| **Native Platform** | • UI event logging (button clicks, screen views)<br>• Platform-specific logging (Logcat, OSLog)<br>• Crash reporting integration (Crashlytics, Sentry) |
| **FFI Boundary** | • FFI call logging (entry/exit)<br>• Memory leak detection<br>• Performance profiling of FFI overhead |

### 2. Error Handling

| Layer | Responsibility |
|-------|----------------|
| **Rust Core** | • Define error types (NuvioError enum)<br>• Error context and tracing<br>• Recovery strategies |
| **Native Platform** | • Present errors to user (toasts, dialogs)<br>• Map errors to localized messages<br>• User-facing error UI |
| **FFI Boundary** | • Convert Rust errors to FFI-safe representations<br>• Prevent panics across FFI<br>• Error code translation |

### 3. Caching

| Layer | Responsibility |
|-------|----------------|
| **Rust Core** | • Business logic caching (API responses, metadata)<br>• LRU cache implementation<br>• TTL management |
| **Native Platform** | • UI-level caching (images, thumbnails)<br>• Platform cache directories<br>• Memory pressure handling |
| **FFI Boundary** | • No caching (pure translation layer) |

### 4. Async Operations

| Layer | Responsibility |
|-------|----------------|
| **Rust Core** | • Tokio async runtime<br>• Futures and async/await<br>• Background task spawning |
| **Native Platform** | • Coroutines (Kotlin) / async-await (Swift)<br>• Main thread dispatching<br>• Lifecycle-aware cancellation |
| **FFI Boundary** | • Bridge Rust futures to native async<br>• Callback mechanisms<br>• Async result delivery |

### 5. Data Validation

| Layer | Responsibility |
|-------|----------------|
| **Rust Core** | • Business rule validation (email format, profile limits)<br>• Data integrity checks<br>• Schema validation |
| **Native Platform** | • Presentation validation (form fields, input masks)<br>• Real-time user feedback (red borders, error text) |
| **FFI Boundary** | • Type safety checks<br>• Null pointer validation |

---

## Decision-Making Guidelines

### Decision Tree: Where Does This Code Belong?

```
START: I need to implement feature X

├─ Does it involve rendering UI?
│  ├─ YES → Native Platform Layer (Kotlin/Swift)
│  └─ NO → Continue
│
├─ Does it involve platform-specific APIs (file system, camera, notifications)?
│  ├─ YES → Native Platform Layer (Kotlin/Swift)
│  └─ NO → Continue
│
├─ Does it involve navigation or screen transitions?
│  ├─ YES → Native Platform Layer (Kotlin/Swift)
│  └─ NO → Continue
│
├─ Does it involve video player control (play, pause, seek)?
│  ├─ YES → Native Platform Layer (ExoPlayer/AVPlayer wrappers)
│  └─ NO → Continue
│
├─ Is it just type conversion or memory management?
│  ├─ YES → FFI Boundary Layer (UniFFI)
│  └─ NO → Continue
│
├─ Does it involve business logic, data processing, or external API calls?
│  ├─ YES → Rust Core Layer
│  └─ NO → Re-evaluate the question
│
└─ Still unsure? Default to Rust Core for business logic, Native for UI
```

### Guiding Questions

**Question 1:** "If I implemented this in Rust, would it need `#[cfg(target_os)]`?"
- **YES** → Belongs in Native Platform Layer
- **NO** → Could belong in Rust Core

**Question 2:** "Does this involve pixels, colors, fonts, or user interaction?"
- **YES** → Belongs in Native Platform Layer
- **NO** → Could belong in Rust Core

**Question 3:** "Is this a pure data transformation with no UI?"
- **YES** → Belongs in Rust Core
- **NO** → Might belong in Native Platform Layer

**Question 4:** "Does this require calling platform SDKs (Android SDK, iOS SDK)?"
- **YES** → Belongs in Native Platform Layer
- **NO** → Could belong in Rust Core

**Question 5:** "Is this just converting types between languages?"
- **YES** → Belongs in FFI Boundary Layer (UniFFI)
- **NO** → Belongs in Rust Core or Native Layer

### Common Scenarios

| Scenario | Layer | Rationale |
|----------|-------|-----------|
| **Validating email format** | Rust Core | Business logic, platform-agnostic |
| **Displaying email validation error in red text** | Native Platform | UI presentation |
| **Fetching user profile from TMDB API** | Rust Core | External API integration |
| **Showing loading spinner while fetching** | Native Platform | UI state |
| **Ranking streams by quality** | Rust Core | Data processing algorithm |
| **Rendering stream list in grid** | Native Platform | UI rendering |
| **Tracking watch progress (position/duration)** | Rust Core | Business logic |
| **Displaying progress bar in video player** | Native Platform | UI presentation |
| **Managing download state machine** | Rust Core | State management |
| **Showing download notification** | Native Platform | Platform API (NotificationManager) |
| **Handling D-pad navigation** | Native Platform | Platform-specific input |
| **Storing focused item ID** | Rust Core | Application state |
| **Converting Profile to JSON** | FFI Boundary | Type serialization |
| **Displaying Profile in card** | Native Platform | UI rendering |
| **Caching TMDB API responses** | Rust Core | Data caching |
| **Caching poster images** | Native Platform | UI-level caching |
| **Implementing retry logic for API calls** | Rust Core | Business logic |
| **Showing retry button after error** | Native Platform | UI interaction |

---

## Anti-Patterns and What NOT to Put in Each Layer

### Rust Core Anti-Patterns

❌ **Platform-Specific Code**
```rust
// WRONG
#[cfg(target_os = "android")]
fn show_toast(message: &str) {
    // Android-specific code in Rust core - NO!
}
```

❌ **UI Logic**
```rust
// WRONG
fn get_profile_card_background_color(theme: Theme) -> Color {
    // UI presentation logic in Rust core - NO!
    match theme {
        Theme::Dark => Color::rgb(30, 30, 30),
        Theme::Light => Color::rgb(245, 245, 245),
    }
}
```

❌ **Direct File System Access**
```rust
// WRONG
fn save_profile(profile: &Profile) -> Result<()> {
    std::fs::write("/data/local/profiles.json", serde_json::to_string(profile)?)?;
    // Platform-specific path - NO! Use storage abstraction trait
    Ok(())
}
```

### Native Platform Anti-Patterns

❌ **Business Logic Duplication**
```kotlin
// WRONG
class ProfileManager {
    fun createProfile(name: String): Profile {
        // Validation duplicated from Rust - NO!
        if (name.isBlank()) throw IllegalArgumentException()
        if (profiles.size >= 5) throw IllegalStateException()
        return Profile(UUID.randomUUID(), name)
    }
}
```

❌ **External API Calls**
```swift
// WRONG
func fetchMetadata(tmdbId: Int) async throws -> Metadata {
    let url = URL(string: "https://api.themoviedb.org/3/tv/\(tmdbId)")!
    // Direct API call in Swift - NO! Call Rust SDK
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(Metadata.self, from: data)
}
```

❌ **Complex Algorithms**
```kotlin
// WRONG
fun rankStreams(streams: List<Stream>): List<Stream> {
    // Ranking algorithm duplicated from Rust - NO!
    return streams.sortedWith(compareBy({ -it.quality }, { -it.seeds }))
}
```

### FFI Boundary Anti-Patterns

❌ **Business Logic**
```rust
// WRONG
#[no_mangle]
pub extern "C" fn nuvio_validate_email(email: *const c_char) -> bool {
    // Validation logic in FFI - NO! Call Rust SDK
    let email_str = unsafe { CStr::from_ptr(email).to_str().unwrap() };
    email_str.contains('@') && email_str.contains('.')
}
```

❌ **State Storage**
```rust
// WRONG
static mut CURRENT_PROFILE: Option<Profile> = None;

#[no_mangle]
pub extern "C" fn nuvio_set_current_profile(profile: *const Profile) {
    // Global mutable state in FFI - NO! Store in Rust SDK
    unsafe {
        CURRENT_PROFILE = Some((*profile).clone());
    }
}
```

❌ **Complex Error Handling**
```rust
// WRONG
#[no_mangle]
pub extern "C" fn nuvio_fetch_and_cache_metadata(id: u64) -> *mut Metadata {
    // Too much logic in FFI - NO! This should be a simple wrapper
    let metadata = fetch_from_tmdb(id).unwrap();
    let enriched = enrich_with_trakt(&metadata).unwrap();
    cache_metadata(&enriched).unwrap();
    Box::into_raw(Box::new(enriched))
}
```

---

## Migration Patterns

### Pattern 1: Extracting Business Logic from React Native Services to Rust Core

**Before (TypeScript):**
```typescript
// src/services/profileService.ts
export class ProfileService {
  private storage = MMKV;

  async createProfile(name: string): Promise<Profile> {
    const profiles = this.listProfiles();
    if (profiles.length >= 5) {
      throw new Error('Maximum 5 profiles allowed');
    }

    const profile = {
      id: uuid(),
      name,
      avatar: DEFAULT_AVATAR,
      createdAt: new Date(),
    };

    this.storage.set(`profile:${profile.id}`, JSON.stringify(profile));
    return profile;
  }
}
```

**After (Rust Core):**
```rust
// rust-sdk/nuvio-core/src/core/profile.rs
pub struct ProfileManager {
    storage: Box<dyn StorageProvider>,
    max_profiles: usize,
}

impl ProfileManager {
    pub async fn create_profile(&self, name: String) -> Result<Profile> {
        let profiles = self.list_profiles().await?;
        if profiles.len() >= self.max_profiles {
            return Err(NuvioError::MaxProfilesExceeded);
        }

        let profile = Profile {
            id: Uuid::new_v4(),
            name,
            avatar: DEFAULT_AVATAR.to_string(),
            created_at: Utc::now(),
        };

        self.storage.set(&format!("profile:{}", profile.id), &profile).await?;
        Ok(profile)
    }
}
```

**After (Kotlin Native):**
```kotlin
// android/app/src/main/java/com/nuvio/repository/ProfileRepository.kt
class ProfileRepository(private val manager: ProfileManager) {
    suspend fun createProfile(name: String): Result<Profile> = withContext(Dispatchers.IO) {
        try {
            val request = CreateProfileRequest(name, null)
            val profile = manager.createProfile(request)
            Result.success(profile)
        } catch (e: NuvioError) {
            Result.failure(e)
        }
    }
}
```

### Pattern 2: Moving State Management from React Context to Rust Core

**Before (React Context):**
```typescript
// src/contexts/AccountContext.tsx
export const AccountContext = React.createContext<AccountContextValue | null>(null);

export const AccountProvider: React.FC = ({ children }) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAccount = async () => {
    setLoading(true);
    const stored = await storage.getObject('account');
    setAccount(stored);
    setLoading(false);
  };

  return (
    <AccountContext.Provider value={{ account, loading, loadAccount }}>
      {children}
    </AccountContext.Provider>
  );
};
```

**After (Rust Core):**
```rust
// rust-sdk/nuvio-core/src/core/account.rs
pub struct AccountManager {
    current_account: Arc<RwLock<Option<Account>>>,
    storage: Box<dyn StorageProvider>,
}

impl AccountManager {
    pub async fn load_account(&self) -> Result<Option<Account>> {
        let account = self.storage.get("account").await?;
        *self.current_account.write().await = account.clone();
        Ok(account)
    }

    pub async fn get_current_account(&self) -> Option<Account> {
        self.current_account.read().await.clone()
    }
}
```

**After (Kotlin ViewModel):**
```kotlin
// android/app/src/main/java/com/nuvio/presentation/AccountViewModel.kt
class AccountViewModel(
    private val repository: AccountRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow<AccountUiState>(AccountUiState.Loading)
    val uiState: StateFlow<AccountUiState> = _uiState.asStateFlow()

    init {
        loadAccount()
    }

    fun loadAccount() {
        viewModelScope.launch {
            _uiState.value = AccountUiState.Loading
            repository.loadAccount().fold(
                onSuccess = { account ->
                    _uiState.value = AccountUiState.Success(account)
                },
                onFailure = { error ->
                    _uiState.value = AccountUiState.Error(error.message ?: "Unknown error")
                }
            )
        }
    }
}

sealed class AccountUiState {
    object Loading : AccountUiState()
    data class Success(val account: Account?) : AccountUiState()
    data class Error(val message: String) : AccountUiState()
}
```

### Pattern 3: Replacing React Native Native Modules with Rust SDK

**Before (React Native Native Module - Swift):**
```swift
// ios/NuvioTV/Modules/RNVideoPlayerModule.swift
@objc(RNVideoPlayerModule)
class RNVideoPlayerModule: NSObject {
  @objc
  func playVideo(_ url: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    // Native module exposes video player to JS
    let player = AVPlayer(url: URL(string: url)!)
    player.play()
    resolver(nil)
  }
}
```

**After (Rust Core - No change needed, Rust doesn't control video player):**
```rust
// rust-sdk/nuvio-core/src/core/stream.rs
// Rust only resolves streams, doesn't play them
pub struct StreamResolver {
    pub async fn resolve_streams(&self, meta_id: &str) -> Result<Vec<Stream>> {
        // Returns stream URLs for native player
    }
}
```

**After (Swift Native):**
```swift
// ios/NuvioTV/Player/VideoPlayerView.swift
// Direct AVPlayer usage, no RN bridge needed
struct VideoPlayerView: View {
    @StateObject private var playerManager: AVPlayerManager
    let streamId: String

    var body: some View {
        VideoPlayer(player: playerManager.player)
            .task {
                // Get stream from Rust SDK
                if let stream = try? await StreamRepository.shared.resolveStream(streamId: streamId) {
                    playerManager.play(streamUrl: URL(string: stream.url)!)
                }
            }
    }
}
```

---

## Validation and Testing

### Boundary Validation Checklist

Use this checklist to validate that code is in the correct layer:

#### Rust Core Validation

- [ ] Contains no `#[cfg(target_os)]` directives for platform-specific logic
- [ ] No direct UI framework imports (no SwiftUI, Jetpack Compose)
- [ ] All I/O uses platform abstraction traits (StorageProvider, HttpClient)
- [ ] All public functions are FFI-safe (no references with lifetimes in public API)
- [ ] No panics in FFI-exposed functions (all use `catch_unwind`)
- [ ] Comprehensive error handling with `Result<T, NuvioError>`
- [ ] All async functions use Tokio runtime
- [ ] Unit tests cover business logic without mocking FFI

#### Native Platform Validation

- [ ] No business logic duplication from Rust core
- [ ] All external API calls go through Rust SDK (via Repository pattern)
- [ ] All UI rendering uses native frameworks (Compose/SwiftUI)
- [ ] All FFI calls are wrapped in Repository layer (not called directly from ViewModels)
- [ ] Navigation uses platform-native routing (Compose Navigation, NavigationStack)
- [ ] Video players use platform-native libraries (ExoPlayer, AVPlayer)
- [ ] All platform APIs (notifications, file system) are accessed directly
- [ ] UI state management uses platform patterns (StateFlow, @Published)

#### FFI Boundary Validation

- [ ] Contains only type definitions and memory management
- [ ] No business logic in FFI layer
- [ ] All FFI functions use `extern "C"` with C ABI
- [ ] All FFI functions wrapped in `catch_unwind` for panic safety
- [ ] Memory ownership is explicit (Box::into_raw, Arc cloning)
- [ ] All strings use CString for FFI safety
- [ ] Error handling uses FFI-safe error codes (no unwrap/panic)
- [ ] UniFFI .udl definitions match Rust implementations

### Testing Strategies by Layer

#### Rust Core Testing

```rust
// rust-sdk/nuvio-core/src/core/profile.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_profile_max_limit() {
        let storage = MockStorageProvider::new();
        let manager = ProfileManager::new(storage, 5);

        // Create 5 profiles
        for i in 0..5 {
            manager.create_profile(format!("Profile {}", i)).await.unwrap();
        }

        // 6th should fail
        let result = manager.create_profile("Profile 6".to_string()).await;
        assert!(matches!(result, Err(NuvioError::MaxProfilesExceeded)));
    }
}
```

#### Native Platform Testing

```kotlin
// android/app/src/test/java/com/nuvio/repository/ProfileRepositoryTest.kt
class ProfileRepositoryTest {
    @Test
    fun `createProfile returns success when SDK succeeds`() = runTest {
        val mockManager = mockk<ProfileManager>()
        coEvery { mockManager.createProfile(any()) } returns mockProfile

        val repository = ProfileRepository(mockManager)
        val result = repository.createProfile("Test")

        assertTrue(result.isSuccess)
        assertEquals("Test", result.getOrNull()?.name)
    }
}
```

#### FFI Boundary Testing

```rust
// rust-sdk/nuvio-core/tests/ffi_tests.rs
#[test]
fn test_ffi_profile_create_and_free() {
    let manager = nuvio_profile_manager_create();
    assert!(!manager.is_null());

    let request = CreateProfileRequest {
        name: CString::new("Test").unwrap().into_raw(),
        avatar: std::ptr::null_mut(),
    };

    let mut error: *mut FfiError = std::ptr::null_mut();
    let profile = nuvio_profile_manager_create_profile(manager, &request, &mut error);

    assert!(error.is_null());
    assert!(!profile.is_null());

    // Clean up
    nuvio_profile_free(profile);
    nuvio_profile_manager_free(manager);
}
```

---

## References

### Internal Documentation

1. **[Rust SDK Core Module Structure Design](./rust-sdk-design.md)** - Detailed Rust SDK architecture
2. **[FFI Boundary Interfaces and Serialization Strategy](./ffi-boundary-design.md)** - FFI layer design with UniFFI
3. **[Kotlin (Android) Native Layer Architecture Design](./kotlin-native-design.md)** - Kotlin native layer patterns
4. **[Swift (iOS/tvOS) Native Layer Architecture Design](./swift-native-design.md)** - Swift native layer patterns
5. **[State Management Map](./state-management-map.md)** - Application state flows
6. **[Component Inventory](./component-inventory.md)** - UI component catalog
7. **[Service Layer Catalog](./service-layer-catalog.md)** - Existing service modules

### External Resources

1. **UniFFI Documentation** - https://mozilla.github.io/uniffi-rs/
2. **Rust FFI Guide** - https://doc.rust-lang.org/nomicon/ffi.html
3. **Jetpack Compose Documentation** - https://developer.android.com/jetpack/compose
4. **SwiftUI Documentation** - https://developer.apple.com/xcode/swiftui/
5. **Android TV Development** - https://developer.android.com/training/tv
6. **tvOS Development** - https://developer.apple.com/tvos/

---

## Appendix: Quick Reference Tables

### Responsibility Matrix

| Functionality | Rust Core | Kotlin/Swift Native | FFI Boundary |
|---------------|-----------|---------------------|--------------|
| Account validation | ✅ | ❌ | ❌ |
| Profile UI cards | ❌ | ✅ | ❌ |
| TMDB API calls | ✅ | ❌ | ❌ |
| Navigation | ❌ | ✅ | ❌ |
| Stream ranking | ✅ | ❌ | ❌ |
| Video player | ❌ | ✅ | 🟡 |
| Watch progress | ✅ | ❌ | ❌ |
| Progress bar UI | ❌ | ✅ | ❌ |
| Download state | ✅ | ❌ | ❌ |
| Notifications | ❌ | ✅ | ❌ |
| Type conversion | ❌ | ❌ | ✅ |
| Memory mgmt | 🟡 | 🟡 | ✅ |
| Error translation | ❌ | ❌ | ✅ |
| Caching (data) | ✅ | ❌ | ❌ |
| Caching (images) | ❌ | ✅ | ❌ |
| Theme data | ✅ | ❌ | ❌ |
| Theme UI | ❌ | ✅ | ❌ |
| D-pad handling | ❌ | ✅ | ❌ |
| Focus state | ✅ | ❌ | ❌ |

### Technology Stack by Layer

| Layer | Languages | Frameworks | Tools |
|-------|-----------|------------|-------|
| **Rust Core** | Rust | Tokio, Serde, Reqwest | cargo, rustc, cargo-ndk |
| **Android Native** | Kotlin | Jetpack Compose, Coroutines, Flow, Leanback | Gradle, Android Studio |
| **iOS/tvOS Native** | Swift | SwiftUI, Combine, UIKit, TVUIKit | Xcode, Swift Package Manager |
| **FFI Boundary** | Rust, Kotlin, Swift | UniFFI | uniffi_bindgen, cbindgen (fallback) |

---

**End of Module Boundary Specifications**

This document provides comprehensive guidance for determining layer boundaries in the NuvioStreamingTV tri-layer architecture. When in doubt, refer to the Decision-Making Guidelines section and validate against the Boundary Validation Checklist.
