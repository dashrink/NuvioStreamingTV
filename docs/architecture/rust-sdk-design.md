# Rust SDK Core Module Structure Design

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Project:** NuvioStreamingTV Tri-Layer Architecture Migration
**Purpose:** Define Rust SDK core module hierarchy, business logic boundaries, and integration strategy for native platform migration.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Module Hierarchy](#module-hierarchy)
3. [Core Module Definitions](#core-module-definitions)
4. [Business Logic Extraction Plan](#business-logic-extraction-plan)
5. [Existing nuvio-core Integration](#existing-nuvio-core-integration)
6. [Module Responsibilities Matrix](#module-responsibilities-matrix)
7. [Cross-Cutting Concerns](#cross-cutting-concerns)
8. [FFI Surface Architecture](#ffi-surface-architecture)
9. [Migration Sequencing](#migration-sequencing)
10. [Performance Considerations](#performance-considerations)

---

## Executive Summary

The Rust SDK core (`nuvio-core`) is designed as a high-performance, platform-agnostic business logic layer that will replace TypeScript/JavaScript services in the React Native application. The architecture follows a modular design with clear separation of concerns, optimized for TV platforms while supporting mobile devices.

### Design Principles

1. **Platform Agnostic** - Zero platform-specific code in Rust core; all platform concerns handled in Kotlin/Swift
2. **Performance First** - Optimized for TV hardware constraints (limited CPU/memory)
3. **Type Safety** - Leverage Rust's type system for correctness guarantees
4. **Memory Efficiency** - Minimize allocations; use zero-copy patterns where possible
5. **Async by Default** - All I/O operations use async/await (tokio runtime)
6. **FFI-Ready** - All public APIs designed for C-compatible FFI boundaries
7. **Testable** - Dependency injection for services; extensive unit/integration test coverage

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kotlin/Swift Native UI Layer                  │
│  (Platform-specific: UI, Navigation, Video Players, etc.)        │
└────────────────────────────┬────────────────────────────────────┘
                             │ FFI Boundary (UniFFI)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Rust SDK Core (nuvio-core)                   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Core Domain │  │  Integration │  │ Platform Abs │         │
│  │   Modules    │  │   Modules    │  │   Modules    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Cross-Cutting: Storage, Cache, HTTP       │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Key Metrics

- **Core Modules:** 12 primary domain modules
- **Integration Modules:** 5 external API clients
- **Platform Abstraction Modules:** 4 platform interfaces
- **Shared Infrastructure:** 6 cross-cutting concern modules
- **Total Public API Surface:** ~150 FFI-exposed functions
- **Estimated SLOC:** 15,000-20,000 lines of Rust code

---

## Module Hierarchy

### Top-Level Crate Structure

```
rust-sdk/
├── nuvio-core/              # Main SDK crate
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs           # Crate root, public API exports
│   │   ├── error.rs         # Error types and Result aliases
│   │   ├── ffi.rs           # FFI boundary layer (UniFFI)
│   │   │
│   │   ├── core/            # Core domain modules
│   │   │   ├── mod.rs
│   │   │   ├── account.rs   # Account & authentication
│   │   │   ├── profile.rs   # Multi-profile management
│   │   │   ├── catalog.rs   # Content catalog & addons
│   │   │   ├── library.rs   # User library (watchlist, watched, collection)
│   │   │   ├── metadata.rs  # Content metadata & enrichment
│   │   │   ├── stream.rs    # Stream resolution & selection
│   │   │   ├── download.rs  # Offline content management
│   │   │   ├── settings.rs  # Application settings
│   │   │   ├── theme.rs     # Theme engine
│   │   │   ├── performance.rs # Performance detection & optimization
│   │   │   ├── focus.rs     # TV focus management state
│   │   │   └── watch.rs     # Watch progress tracking
│   │   │
│   │   ├── integration/     # External API integrations
│   │   │   ├── mod.rs
│   │   │   ├── tmdb.rs      # TMDB API client
│   │   │   ├── trakt.rs     # Trakt.tv API client
│   │   │   ├── stremio.rs   # Stremio protocol client
│   │   │   ├── mdblist.rs   # MDBList API client
│   │   │   └── github.rs    # GitHub releases API
│   │   │
│   │   ├── platform/        # Platform abstraction layer
│   │   │   ├── mod.rs
│   │   │   ├── storage.rs   # Storage trait & implementations
│   │   │   ├── http.rs      # HTTP client abstraction
│   │   │   ├── time.rs      # Time/date utilities
│   │   │   └── crypto.rs    # Cryptographic operations
│   │   │
│   │   ├── infra/           # Infrastructure & cross-cutting
│   │   │   ├── mod.rs
│   │   │   ├── cache.rs     # In-memory & persistent caching
│   │   │   ├── event.rs     # Event bus for cross-module communication
│   │   │   ├── logger.rs    # Logging facade
│   │   │   ├── rate_limit.rs # Rate limiting for API calls
│   │   │   ├── sync.rs      # Background sync coordinator
│   │   │   └── telemetry.rs # Performance telemetry
│   │   │
│   │   └── types/           # Shared type definitions
│   │       ├── mod.rs
│   │       ├── content.rs   # Content types (Movie, Show, Episode)
│   │       ├── user.rs      # User-related types (Profile, Account)
│   │       ├── addon.rs     # Addon & catalog types
│   │       ├── stream.rs    # Stream & subtitle types
│   │       └── config.rs    # Configuration types
│   │
│   └── tests/               # Integration tests
│       ├── account_tests.rs
│       ├── catalog_tests.rs
│       └── ...
│
├── bindings/                # Platform-specific bindings
│   ├── kotlin/              # Android/Kotlin bindings (generated by UniFFI)
│   ├── swift/               # iOS/Swift bindings (generated by UniFFI)
│   └── nuvio.udl            # UniFFI interface definition
│
└── examples/                # Usage examples
    ├── basic_usage.rs
    └── ...
```

---

## Core Module Definitions

### 1. Account Module (`core/account.rs`)

**Purpose:** Manages user authentication, account state, and session management.

**Responsibilities:**
- User authentication (currently local-only; cloud auth disabled)
- Session token management
- Account lifecycle (create, delete, update)
- Profile isolation enforcement (`@user:{scope}:` pattern)

**Public API:**
```rust
pub struct AccountManager {
    current_user: Option<Account>,
    storage: Arc<dyn StorageBackend>,
    event_bus: Arc<EventBus>,
}

impl AccountManager {
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;
    pub async fn initialize(&mut self) -> Result<()>;
    pub async fn get_current_account(&self) -> Option<Account>;
    pub async fn create_local_account(&mut self, username: String) -> Result<Account>;
    pub async fn is_authenticated(&self) -> bool;
    pub fn get_storage_scope(&self) -> String; // "@user:{id}:"
}

#[derive(Debug, Clone)]
pub struct Account {
    pub id: String,
    pub username: String,
    pub created_at: i64,
    pub last_active: i64,
}
```

**Business Logic Extracted From:**
- `src/services/AccountService.ts`
- `src/contexts/AccountContext.tsx`

**Migration Priority:** HIGH (Week 7-8)

---

### 2. Profile Module (`core/profile.rs`)

**Purpose:** Multi-profile management with PIN protection and profile-scoped storage.

**Responsibilities:**
- Profile CRUD operations (max 5 profiles per account)
- PIN-based access control (SHA-256 hashing)
- Profile switching with state isolation
- Progressive lockout on failed PIN attempts (3/5/10 attempts → 5s/30s/5min delays)

**Public API:**
```rust
pub struct ProfileManager {
    profiles: Vec<Profile>,
    active_profile: Option<ProfileId>,
    storage: Arc<dyn StorageBackend>,
    lockout_tracker: LockoutTracker,
}

impl ProfileManager {
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;
    pub async fn create_profile(&mut self, name: String, pin: Option<String>) -> Result<Profile>;
    pub async fn delete_profile(&mut self, profile_id: ProfileId) -> Result<()>;
    pub async fn switch_profile(&mut self, profile_id: ProfileId, pin: Option<String>) -> Result<()>;
    pub async fn verify_pin(&self, profile_id: ProfileId, pin: String) -> Result<bool>;
    pub async fn get_all_profiles(&self) -> Vec<Profile>;
    pub fn get_active_profile(&self) -> Option<&Profile>;
    pub fn get_profile_storage_key(&self, key: &str) -> String; // "@user:{scope}:profile:{id}:{key}"
}

#[derive(Debug, Clone)]
pub struct Profile {
    pub id: ProfileId,
    pub name: String,
    pub pin_hash: Option<String>, // SHA-256
    pub avatar_index: u8,
    pub created_at: i64,
    pub last_used: i64,
}

pub type ProfileId = String;
```

**Business Logic Extracted From:**
- `src/contexts/ProfileContext.tsx`
- `src/hooks/useProfiles.ts`

**Migration Priority:** MEDIUM (Week 13-14)

---

### 3. Catalog Module (`core/catalog.rs`)

**Purpose:** Content catalog management, addon protocol, and search indexing.

**Responsibilities:**
- Addon manifest parsing (Stremio protocol)
- Catalog loading from multiple addons (parallel)
- Content indexing for search
- Addon discovery and registration
- Delta sync for catalog updates

**Public API:**
```rust
pub struct CatalogManager {
    addons: Vec<Addon>,
    index: SearchIndex,
    cache: AddonCache,
    event_bus: Arc<EventBus>,
}

impl CatalogManager {
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;
    pub async fn add_addon(&mut self, url: String) -> Result<Addon>;
    pub async fn remove_addon(&mut self, addon_id: &str) -> Result<()>;
    pub async fn get_all_addons(&self) -> Vec<Addon>;
    pub async fn load_catalog(&self, addon_id: &str, catalog_id: &str) -> Result<Vec<ContentItem>>;
    pub async fn search(&self, query: &str) -> Result<Vec<SearchResult>>;
    pub async fn refresh_catalogs(&mut self) -> Result<()>;
}

#[derive(Debug, Clone)]
pub struct Addon {
    pub id: String,
    pub name: String,
    pub version: String,
    pub manifest_url: String,
    pub catalogs: Vec<CatalogInfo>,
    pub resources: Vec<ResourceType>,
}

#[derive(Debug, Clone)]
pub enum ResourceType {
    Catalog,
    Meta,
    Stream,
    Subtitles,
}
```

**Business Logic Extracted From:**
- `src/services/catalogService.ts`
- `src/services/stremioService.ts`
- `src/contexts/CatalogContext.tsx`

**Migration Priority:** HIGH (Week 9-10)

---

### 4. Library Module (`core/library.rs`)

**Purpose:** User library management (watchlist, watched history, collection, ratings).

**Responsibilities:**
- Watchlist management (add/remove content)
- Watched history tracking
- Personal collection management
- Ratings and reviews
- Library synchronization with Trakt.tv

**Public API:**
```rust
pub struct LibraryManager {
    watchlist: HashSet<ContentId>,
    watched: HashMap<ContentId, WatchedEntry>,
    collection: HashSet<ContentId>,
    ratings: HashMap<ContentId, Rating>,
    storage: Arc<dyn StorageBackend>,
    sync_engine: Option<Arc<TraktSync>>,
}

impl LibraryManager {
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;
    pub async fn add_to_watchlist(&mut self, content_id: ContentId) -> Result<()>;
    pub async fn remove_from_watchlist(&mut self, content_id: &ContentId) -> Result<()>;
    pub fn is_in_watchlist(&self, content_id: &ContentId) -> bool;
    pub async fn mark_as_watched(&mut self, content_id: ContentId, timestamp: i64) -> Result<()>;
    pub fn get_watched_entry(&self, content_id: &ContentId) -> Option<&WatchedEntry>;
    pub async fn set_rating(&mut self, content_id: ContentId, rating: u8) -> Result<()>;
    pub async fn get_all_watchlist(&self) -> Vec<ContentId>;
    pub async fn sync_with_trakt(&mut self) -> Result<SyncStats>;
}

#[derive(Debug, Clone)]
pub struct WatchedEntry {
    pub content_id: ContentId,
    pub watched_at: i64,
    pub play_count: u32,
}

pub type ContentId = String; // "tmdb:{type}:{id}" or "imdb:{id}"
```

**Business Logic Extracted From:**
- `src/hooks/useLibrary.ts`
- `src/services/watchedService.ts`

**Migration Priority:** HIGH (Week 9-10)

---

### 5. Metadata Module (`core/metadata.rs`)

**Purpose:** Content metadata fetching, enrichment, and caching.

**Responsibilities:**
- TMDB metadata fetching (movies, TV shows, episodes)
- Metadata enrichment (ratings from MDBList, parental guide, intro timestamps)
- Multi-source metadata aggregation
- Smart caching with TTL (7-day default for TMDB)
- Image URL generation and optimization

**Public API:**
```rust
pub struct MetadataManager {
    tmdb_client: Arc<TmdbClient>,
    mdblist_client: Option<Arc<MdbListClient>>,
    cache: MetadataCache,
    storage: Arc<dyn StorageBackend>,
}

impl MetadataManager {
    pub fn new(tmdb_api_key: String, storage: Arc<dyn StorageBackend>) -> Self;
    pub async fn get_movie(&self, tmdb_id: u32) -> Result<Movie>;
    pub async fn get_show(&self, tmdb_id: u32) -> Result<Show>;
    pub async fn get_episode(&self, show_id: u32, season: u32, episode: u32) -> Result<Episode>;
    pub async fn get_credits(&self, tmdb_id: u32, content_type: ContentType) -> Result<Credits>;
    pub async fn search_multi(&self, query: &str, page: u32) -> Result<SearchResults>;
    pub async fn get_aggregated_ratings(&self, imdb_id: &str) -> Result<AggregatedRatings>;
    pub fn image_url(&self, path: &str, size: ImageSize) -> String;
}

#[derive(Debug, Clone)]
pub struct Movie {
    pub tmdb_id: u32,
    pub imdb_id: Option<String>,
    pub title: String,
    pub overview: String,
    pub release_date: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub vote_average: f32,
    pub genres: Vec<Genre>,
}
```

**Business Logic Extracted From:**
- `src/services/tmdbService.ts`
- `src/services/mdbListService.ts`
- `src/hooks/useMetadata.ts`

**Migration Priority:** HIGH (Week 9-10)

---

### 6. Stream Module (`core/stream.rs`)

**Purpose:** Stream resolution, source selection, and quality management.

**Responsibilities:**
- Stream resolution from multiple addons
- Quality selection (4K/1080p/720p/480p) based on device performance
- Debrid service integration (Real-Debrid, AllDebrid, Premiumize)
- Stream caching and prioritization
- Subtitle fetching and synchronization

**Public API:**
```rust
pub struct StreamManager {
    catalog_manager: Arc<CatalogManager>,
    debrid_clients: Vec<Arc<dyn DebridClient>>,
    cache: StreamCache,
    quality_selector: QualitySelector,
}

impl StreamManager {
    pub fn new(catalog_manager: Arc<CatalogManager>) -> Self;
    pub async fn resolve_streams(&self, content_id: ContentId) -> Result<Vec<Stream>>;
    pub async fn select_best_stream(&self, streams: Vec<Stream>, preferences: StreamPreferences) -> Option<Stream>;
    pub async fn fetch_subtitles(&self, content_id: ContentId) -> Result<Vec<Subtitle>>;
    pub fn set_quality_preference(&mut self, quality: QualityPreference);
}

#[derive(Debug, Clone)]
pub struct Stream {
    pub url: String,
    pub title: String,
    pub quality: Option<String>,
    pub size: Option<u64>,
    pub source: String,
    pub debrid_service: Option<String>,
}

#[derive(Debug, Clone)]
pub enum QualityPreference {
    Auto,        // Based on device performance
    FourK,
    FullHD,
    HD,
    SD,
}
```

**Business Logic Extracted From:**
- `src/services/streamCacheService.ts`
- `src/services/debridService.ts`
- `src/hooks/useStreams.ts`

**Migration Priority:** HIGH (Week 11-12)

---

### 7. Download Module (`core/download.rs`)

**Purpose:** Offline content management with pause/resume support.

**Responsibilities:**
- Download queue management
- Multi-threaded download with resume capability
- Storage quota management
- Download progress tracking
- Offline playback metadata caching

**Public API:**
```rust
pub struct DownloadManager {
    downloads: HashMap<DownloadId, DownloadState>,
    queue: VecDeque<DownloadId>,
    storage: Arc<dyn StorageBackend>,
    max_concurrent: usize,
    quota_limit: u64, // bytes
}

impl DownloadManager {
    pub fn new(storage: Arc<dyn StorageBackend>, quota_limit: u64) -> Self;
    pub async fn add_download(&mut self, content_id: ContentId, stream: Stream) -> Result<DownloadId>;
    pub async fn pause_download(&mut self, download_id: DownloadId) -> Result<()>;
    pub async fn resume_download(&mut self, download_id: DownloadId) -> Result<()>;
    pub async fn cancel_download(&mut self, download_id: DownloadId) -> Result<()>;
    pub async fn delete_download(&mut self, download_id: DownloadId) -> Result<()>;
    pub fn get_download_progress(&self, download_id: DownloadId) -> Option<DownloadProgress>;
    pub fn get_all_downloads(&self) -> Vec<DownloadInfo>;
    pub fn get_used_storage(&self) -> u64;
}

#[derive(Debug, Clone)]
pub struct DownloadState {
    pub id: DownloadId,
    pub content_id: ContentId,
    pub status: DownloadStatus,
    pub progress: f32, // 0.0 to 1.0
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub file_path: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum DownloadStatus {
    Queued,
    Downloading,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

pub type DownloadId = String;
```

**Business Logic Extracted From:**
- `src/contexts/DownloadsContext.tsx`
- `src/services/downloadService.ts`

**Migration Priority:** CRITICAL (Week 5-6)

---

### 8. Settings Module (`core/settings.rs`)

**Purpose:** Application settings management with validation and persistence.

**Responsibilities:**
- Settings schema and validation
- Profile-scoped and global settings
- Settings synchronization across devices (future)
- Default values and migration
- Settings change notifications

**Public API:**
```rust
pub struct SettingsManager {
    settings: Arc<RwLock<AppSettings>>,
    storage: Arc<dyn StorageBackend>,
    validators: HashMap<String, Box<dyn SettingValidator>>,
    event_bus: Arc<EventBus>,
}

impl SettingsManager {
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;
    pub async fn load_settings(&mut self) -> Result<()>;
    pub async fn get_setting<T: DeserializeOwned>(&self, key: &str) -> Option<T>;
    pub async fn set_setting<T: Serialize>(&mut self, key: &str, value: T) -> Result<()>;
    pub fn get_all_settings(&self) -> AppSettings;
    pub async fn reset_to_defaults(&mut self) -> Result<()>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub video_quality: QualityPreference,
    pub subtitle_language: String,
    pub auto_play_next: bool,
    pub skip_intro: bool,
    pub parental_controls: ParentalSettings,
    pub accessibility: AccessibilitySettings,
    pub experimental_features: HashSet<String>,
}
```

**Business Logic Extracted From:**
- `src/hooks/useSettings.ts`
- `src/services/settingsService.ts`

**Migration Priority:** MEDIUM (Week 13-14)

---

### 9. Theme Module (`core/theme.rs`)

**Purpose:** Theme engine with color management and accessibility support.

**Responsibilities:**
- Theme definition and loading
- Color palette management
- Dark/light mode support
- Accessibility color validation (WCAG contrast ratios)
- Custom theme creation

**Public API:**
```rust
pub struct ThemeEngine {
    themes: HashMap<ThemeId, Theme>,
    current_theme: ThemeId,
    accessibility_mode: AccessibilityMode,
}

impl ThemeEngine {
    pub fn new() -> Self;
    pub fn register_theme(&mut self, theme: Theme) -> ThemeId;
    pub fn apply_theme(&mut self, theme_id: ThemeId) -> Result<()>;
    pub fn get_current_theme(&self) -> &Theme;
    pub fn set_accessibility_mode(&mut self, mode: AccessibilityMode);
    pub fn validate_contrast(&self, foreground: Color, background: Color) -> f32; // WCAG ratio
}

#[derive(Debug, Clone)]
pub struct Theme {
    pub id: ThemeId,
    pub name: String,
    pub colors: ColorPalette,
}

#[derive(Debug, Clone)]
pub struct ColorPalette {
    pub primary: Color,
    pub secondary: Color,
    pub background: Color,
    pub surface: Color,
    pub error: Color,
    pub text_primary: Color,
    pub text_secondary: Color,
}

pub type ThemeId = String;
pub type Color = u32; // ARGB
```

**Business Logic Extracted From:**
- `src/contexts/ThemeContext.tsx`

**Migration Priority:** LOW (Week 17-18)

---

### 10. Performance Module (`core/performance.rs`)

**Purpose:** Device performance detection and adaptive optimization.

**Responsibilities:**
- CPU core count detection
- Memory availability detection
- Device tier classification (High/Medium/Low)
- Performance profiling and telemetry
- Adaptive quality/feature toggling

**Public API:**
```rust
pub struct PerformanceMonitor {
    device_tier: DeviceTier,
    cpu_cores: usize,
    available_memory: u64,
    performance_profile: PerformanceProfile,
}

impl PerformanceMonitor {
    pub fn detect() -> Self;
    pub fn get_device_tier(&self) -> DeviceTier;
    pub fn get_recommended_quality(&self) -> QualityPreference;
    pub fn should_enable_feature(&self, feature: &str) -> bool;
    pub fn record_frame_time(&mut self, duration_ms: f32);
    pub fn get_avg_fps(&self) -> f32;
}

#[derive(Debug, Clone, PartialEq)]
pub enum DeviceTier {
    High,    // 8+ cores, 4GB+ RAM
    Medium,  // 4-7 cores, 2-4GB RAM
    Low,     // <4 cores, <2GB RAM
}

#[derive(Debug, Clone)]
pub struct PerformanceProfile {
    pub enable_animations: bool,
    pub max_cache_size: u64,
    pub preload_threshold: usize,
}
```

**Business Logic Extracted From:**
- `src/contexts/PerformanceContext.tsx`
- `src/hooks/usePerformance.ts`

**Migration Priority:** CRITICAL (Week 1-2)

---

### 11. Focus Module (`core/focus.rs`)

**Purpose:** TV focus management state tracking (focus tree, spatial navigation state).

**Responsibilities:**
- Focus tree state management
- Last focused element tracking per screen
- Focus history stack
- Focus restoration on navigation back
- Focus event coordination

**Public API:**
```rust
pub struct FocusManager {
    focus_tree: HashMap<ScreenId, FocusNode>,
    current_screen: Option<ScreenId>,
    focus_history: Vec<FocusEntry>,
    event_bus: Arc<EventBus>,
}

impl FocusManager {
    pub fn new(event_bus: Arc<EventBus>) -> Self;
    pub fn register_screen(&mut self, screen_id: ScreenId);
    pub fn set_focus(&mut self, screen_id: ScreenId, element_id: ElementId);
    pub fn get_focused_element(&self, screen_id: &ScreenId) -> Option<ElementId>;
    pub fn push_focus(&mut self, screen_id: ScreenId, element_id: ElementId);
    pub fn pop_focus(&mut self) -> Option<FocusEntry>;
    pub fn clear_screen_focus(&mut self, screen_id: &ScreenId);
}

#[derive(Debug, Clone)]
pub struct FocusNode {
    pub screen_id: ScreenId,
    pub focused_element: Option<ElementId>,
    pub last_updated: i64,
}

pub type ScreenId = String;
pub type ElementId = String;
```

**Business Logic Extracted From:**
- `src/contexts/FocusContext.tsx`
- `src/hooks/useFocusManagement.ts`

**Migration Priority:** CRITICAL (Week 3-4)

---

### 12. Watch Module (`core/watch.rs`)

**Purpose:** Watch progress tracking and scrobbling.

**Responsibilities:**
- Playback progress tracking (timestamp, percentage)
- Scrobbling to Trakt.tv (start/pause/stop events)
- Resume point calculation
- "Continue watching" recommendations
- Watch history management

**Public API:**
```rust
pub struct WatchProgressTracker {
    active_sessions: HashMap<SessionId, WatchSession>,
    storage: Arc<dyn StorageBackend>,
    trakt_sync: Option<Arc<TraktSync>>,
}

impl WatchProgressTracker {
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;
    pub async fn start_session(&mut self, content_id: ContentId) -> SessionId;
    pub async fn update_progress(&mut self, session_id: SessionId, position_seconds: u32, duration_seconds: u32) -> Result<()>;
    pub async fn end_session(&mut self, session_id: SessionId) -> Result<()>;
    pub async fn get_resume_point(&self, content_id: &ContentId) -> Option<u32>;
    pub async fn get_continue_watching(&self, limit: usize) -> Vec<ContinueWatchingItem>;
}

#[derive(Debug, Clone)]
pub struct WatchSession {
    pub session_id: SessionId,
    pub content_id: ContentId,
    pub started_at: i64,
    pub last_position: u32,
    pub duration: u32,
}

pub type SessionId = String;
```

**Business Logic Extracted From:**
- `src/services/watchedService.ts`
- `src/hooks/useWatchProgress.ts`

**Migration Priority:** HIGH (Week 11-12)

---

## Business Logic Extraction Plan

### Phase 1: Foundation (Weeks 1-6) - CRITICAL PRIORITY

**Objective:** Establish core infrastructure and performance-critical modules.

#### Week 1-2: Performance Detection System
- **Module:** `core/performance.rs`
- **Reason:** Foundation for adaptive quality selection throughout the app
- **Extracted From:**
  - `src/contexts/PerformanceContext.tsx`
  - Device detection logic from various components
- **Key Features:**
  - CPU core detection (via `num_cpus` crate)
  - Memory detection (platform-specific FFI)
  - Device tier classification algorithm
  - Performance profile recommendations

#### Week 3-4: Focus Management State
- **Module:** `core/focus.rs`
- **Reason:** Critical for TV navigation; state management benefits from Rust's efficiency
- **Extracted From:**
  - `src/contexts/FocusContext.tsx`
  - Focus state tracking logic
- **Key Features:**
  - Focus tree data structure (HashMap with screen IDs)
  - Focus history stack (VecDeque)
  - Event emission for focus changes

#### Week 5-6: Download Management
- **Module:** `core/download.rs`
- **Reason:** Performance-critical; large file handling benefits from Rust's memory safety
- **Extracted From:**
  - `src/contexts/DownloadsContext.tsx`
  - `src/services/downloadService.ts`
- **Key Features:**
  - Multi-threaded downloader (tokio async tasks)
  - Pause/resume with byte-range requests
  - Storage quota enforcement
  - Progress tracking with atomic operations

### Phase 2: Integration Layer (Weeks 7-12) - HIGH PRIORITY

**Objective:** Migrate external API integrations and user data management.

#### Week 7-8: Trakt Integration
- **Module:** `integration/trakt.rs` + `core/library.rs`
- **Reason:** Complex OAuth flow, rate limiting, and sync logic
- **Extracted From:**
  - `src/services/traktService.ts`
  - `src/contexts/TraktContext.tsx`
- **Key Features:**
  - OAuth 2.0 client (Device Code flow)
  - Rate limiting (token bucket algorithm)
  - Optimistic updates with conflict resolution
  - Background sync worker

#### Week 9-10: Catalog & Metadata Management
- **Modules:** `core/catalog.rs`, `core/metadata.rs`, `integration/tmdb.rs`, `integration/stremio.rs`
- **Reason:** Complex data aggregation and caching logic
- **Extracted From:**
  - `src/services/catalogService.ts`
  - `src/services/tmdbService.ts`
  - `src/services/stremioService.ts`
- **Key Features:**
  - Parallel addon loading (tokio::join!)
  - Full-text search indexing (tantivy crate)
  - Smart caching with TTL
  - Delta sync for catalog updates

#### Week 11-12: Stream Resolution & Watch Tracking
- **Modules:** `core/stream.rs`, `core/watch.rs`
- **Reason:** Performance-critical for playback startup time
- **Extracted From:**
  - `src/services/streamCacheService.ts`
  - `src/services/watchedService.ts`
- **Key Features:**
  - Parallel stream resolution from multiple addons
  - Quality selection based on device tier
  - Scrobbling to Trakt with retry logic
  - Resume point calculation

### Phase 3: User State & Settings (Weeks 13-16) - MEDIUM PRIORITY

**Objective:** Migrate account, profile, and settings management.

#### Week 13-14: Account & Profile Management
- **Modules:** `core/account.rs`, `core/profile.rs`
- **Reason:** Security-sensitive; benefits from Rust's type safety
- **Extracted From:**
  - `src/services/AccountService.ts`
  - `src/contexts/AccountContext.tsx`
  - `src/contexts/ProfileContext.tsx`
- **Key Features:**
  - Secure PIN hashing (SHA-256 via ring crate)
  - Progressive lockout enforcement
  - Profile-scoped storage keys
  - Profile switching with state isolation

#### Week 15-16: Settings Management
- **Module:** `core/settings.rs`
- **Reason:** Complex validation and migration logic
- **Extracted From:**
  - `src/hooks/useSettings.ts`
  - Settings logic scattered across multiple files
- **Key Features:**
  - Schema validation
  - Settings migration on version upgrades
  - Change notifications via event bus
  - Default value management

### Phase 4: UI Support (Weeks 17-18) - LOW PRIORITY

**Objective:** Migrate remaining UI support logic.

#### Week 17-18: Theme Engine
- **Module:** `core/theme.rs`
- **Reason:** Color calculations benefit from performance optimization
- **Extracted From:**
  - `src/contexts/ThemeContext.tsx`
- **Key Features:**
  - WCAG contrast ratio calculations
  - Color interpolation for animations
  - Theme validation

---

## Existing nuvio-core Integration

### Current State Analysis

Based on the specification's reference to `rust-sdk/nuvio-core/`, this section documents integration with any existing Rust SDK work.

**Note:** As of this design phase, the `rust-sdk/nuvio-core/` directory does not exist in the worktree. This design assumes a greenfield Rust SDK implementation.

### Integration Strategy (If Existing Code Found)

If existing `nuvio-core` code is discovered:

1. **Inventory Existing Modules**
   - List all existing `.rs` files and their responsibilities
   - Document public API surface
   - Identify any FFI bindings already implemented

2. **Compatibility Assessment**
   - Check if existing code aligns with tri-layer architecture design
   - Verify compatibility with UniFFI (if not already using it)
   - Assess test coverage and code quality

3. **Migration Path**
   - Preserve existing modules that fit the design
   - Refactor modules that need architectural changes
   - Add missing modules as defined in this design

4. **API Versioning**
   - If breaking changes needed, implement semantic versioning
   - Provide migration guide for Kotlin/Swift consumers

### Placeholder for Existing API Documentation

**File to Reference:** `rust-sdk/API_DOCUMENTATION.md`

If the Rust SDK already has API documentation:
- Review existing API contracts
- Ensure consistency with this design
- Document any differences or extensions needed

---

## Module Responsibilities Matrix

| Module | Primary Responsibility | Storage Required | External APIs | FFI Exposed | Priority |
|--------|------------------------|------------------|---------------|-------------|----------|
| `account` | User authentication & sessions | Yes | None (local auth only) | Yes | HIGH |
| `profile` | Multi-profile with PIN protection | Yes | None | Yes | MEDIUM |
| `catalog` | Addon management & indexing | Yes | Stremio manifests | Yes | HIGH |
| `library` | Watchlist, watched, collection | Yes | None (local) | Yes | HIGH |
| `metadata` | Content metadata & enrichment | Yes (cache) | TMDB, MDBList | Yes | HIGH |
| `stream` | Stream resolution & quality | Yes (cache) | Debrid services | Yes | HIGH |
| `download` | Offline content management | Yes (files + DB) | None | Yes | CRITICAL |
| `settings` | App settings management | Yes | None | Yes | MEDIUM |
| `theme` | Theme engine | Yes | None | Partial | LOW |
| `performance` | Device performance detection | No | None | Yes | CRITICAL |
| `focus` | TV focus state management | No | None | Yes | CRITICAL |
| `watch` | Watch progress & scrobbling | Yes | Trakt.tv | Yes | HIGH |
| **Integration Layer** | | | | | |
| `integration/tmdb` | TMDB API client | No | TMDB | No (internal) | HIGH |
| `integration/trakt` | Trakt.tv API client | Yes (OAuth) | Trakt.tv | Yes (OAuth flow) | HIGH |
| `integration/stremio` | Stremio protocol client | No | Addons | No (internal) | HIGH |
| `integration/mdblist` | MDBList API client | No | MDBList | No (internal) | MEDIUM |
| `integration/github` | GitHub releases API | No | GitHub | No (internal) | LOW |
| **Platform Layer** | | | | | |
| `platform/storage` | Storage trait abstraction | - | Platform-specific | No (trait only) | CRITICAL |
| `platform/http` | HTTP client abstraction | - | Platform-specific | No (trait only) | CRITICAL |
| `platform/time` | Time/date utilities | - | Platform-specific | No (trait only) | MEDIUM |
| `platform/crypto` | Cryptographic operations | - | Platform-specific | No (trait only) | HIGH |
| **Infrastructure** | | | | | |
| `infra/cache` | In-memory & persistent cache | Yes | None | No (internal) | HIGH |
| `infra/event` | Event bus for cross-module comm | No | None | Partial | MEDIUM |
| `infra/logger` | Logging facade | No | Platform logging | No | MEDIUM |
| `infra/rate_limit` | API rate limiting | No | None | No (internal) | HIGH |
| `infra/sync` | Background sync coordinator | No | None | No (internal) | MEDIUM |
| `infra/telemetry` | Performance telemetry | Yes | Optional backend | Partial | LOW |

---

## Cross-Cutting Concerns

### 1. Error Handling

**Strategy:** Unified error type with context and FFI-safe representation.

```rust
// error.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum NuvioError {
    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Network error: {0}")]
    Network(String),

    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Rate limited: retry after {retry_after_seconds}s")]
    RateLimited { retry_after_seconds: u32 },

    #[error("Unknown error: {0}")]
    Unknown(String),
}

pub type Result<T> = std::result::Result<T, NuvioError>;

// FFI-safe error representation
#[repr(C)]
pub struct FFIError {
    code: i32,
    message: *const c_char,
}

impl From<NuvioError> for FFIError {
    fn from(err: NuvioError) -> Self {
        // Convert Rust error to C-compatible representation
        // Memory management: caller must free message with nuvio_free_error_message
    }
}
```

**Panic Handling Across FFI:**
```rust
use std::panic::catch_unwind;

#[no_mangle]
pub extern "C" fn nuvio_example_function() -> FFIError {
    match catch_unwind(|| {
        // Actual implementation
        Ok(())
    }) {
        Ok(result) => match result {
            Ok(_) => FFIError::success(),
            Err(e) => FFIError::from(e),
        },
        Err(panic) => FFIError::panic_occurred(),
    }
}
```

### 2. Logging

**Strategy:** Structured logging with platform-specific backends.

```rust
// infra/logger.rs
pub trait LogBackend: Send + Sync {
    fn log(&self, level: LogLevel, target: &str, message: &str);
}

pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

pub struct Logger {
    backend: Arc<dyn LogBackend>,
    level: LogLevel,
}

// Usage
log::info!(target: "nuvio::catalog", "Loaded {} addons", count);
```

**Platform Integration:**
- **Android:** Bridge to Android Logcat via JNI
- **iOS:** Bridge to OSLog via C bridging

### 3. Storage Abstraction

**Strategy:** Trait-based storage with multiple implementations.

```rust
// platform/storage.rs
#[async_trait]
pub trait StorageBackend: Send + Sync {
    async fn get(&self, key: &str) -> Result<Option<Vec<u8>>>;
    async fn set(&self, key: &str, value: &[u8]) -> Result<()>;
    async fn delete(&self, key: &str) -> Result<()>;
    async fn list_keys(&self, prefix: &str) -> Result<Vec<String>>;
    async fn clear_prefix(&self, prefix: &str) -> Result<()>;
}

// Implementations:
pub struct MMKVStorageBackend; // MMKV via FFI (Android/iOS)
pub struct SqliteStorageBackend; // SQLite (fallback)
pub struct InMemoryStorageBackend; // In-memory (testing)
```

**Implementation Notes:**
- MMKV integration requires FFI calls to platform-specific MMKV libraries
- Android: JNI bridge to `com.tencent.mmkv.MMKV`
- iOS: C bridging to MMKV C++ API

### 4. HTTP Client

**Strategy:** Async HTTP client with retry logic and caching.

```rust
// platform/http.rs
#[async_trait]
pub trait HttpClient: Send + Sync {
    async fn get(&self, url: &str) -> Result<HttpResponse>;
    async fn post(&self, url: &str, body: &[u8]) -> Result<HttpResponse>;
    async fn put(&self, url: &str, body: &[u8]) -> Result<HttpResponse>;
    async fn delete(&self, url: &str) -> Result<HttpResponse>;
}

pub struct HttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
}

// Implementation using reqwest
pub struct ReqwestClient {
    client: reqwest::Client,
    retry_policy: RetryPolicy,
}

impl ReqwestClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("NuvioTV/1.0")
            .build()
            .unwrap();

        Self {
            client,
            retry_policy: RetryPolicy::exponential_backoff(3),
        }
    }
}
```

### 5. Event Bus

**Strategy:** Pub/sub event system for cross-module communication.

```rust
// infra/event.rs
pub struct EventBus {
    subscribers: Arc<RwLock<HashMap<EventType, Vec<Box<dyn EventHandler>>>>>,
}

pub enum EventType {
    SettingsChanged,
    ProfileSwitched,
    AddonAdded,
    AddonRemoved,
    CatalogRefreshed,
    DownloadCompleted,
    WatchProgressUpdated,
}

pub trait EventHandler: Send + Sync {
    fn handle(&self, event: &Event);
}

pub struct Event {
    pub event_type: EventType,
    pub payload: serde_json::Value,
    pub timestamp: i64,
}

impl EventBus {
    pub fn subscribe(&mut self, event_type: EventType, handler: Box<dyn EventHandler>);
    pub fn publish(&self, event: Event);
}
```

**Usage Example:**
```rust
// When profile switches, notify all interested modules
event_bus.publish(Event {
    event_type: EventType::ProfileSwitched,
    payload: json!({"profile_id": new_profile_id}),
    timestamp: Utc::now().timestamp(),
});
```

### 6. Caching

**Strategy:** Multi-layer caching (memory + persistent).

```rust
// infra/cache.rs
pub struct CacheManager<K, V> {
    memory_cache: Arc<RwLock<LruCache<K, CachedValue<V>>>>,
    storage: Arc<dyn StorageBackend>,
    ttl: Duration,
}

pub struct CachedValue<V> {
    value: V,
    expires_at: i64,
}

impl<K, V> CacheManager<K, V>
where
    K: Hash + Eq + Serialize + DeserializeOwned,
    V: Serialize + DeserializeOwned + Clone,
{
    pub async fn get(&self, key: &K) -> Option<V>;
    pub async fn set(&self, key: K, value: V) -> Result<()>;
    pub async fn invalidate(&self, key: &K) -> Result<()>;
    pub async fn clear(&mut self) -> Result<()>;
}
```

**Cache Policies:**
- **TMDB Metadata:** 7-day TTL, 100-item LRU cache
- **Stream URLs:** 1-hour TTL, no LRU (session-only)
- **Addon Manifests:** 24-hour TTL, no eviction
- **Library State:** No TTL, persist to storage immediately

---

## FFI Surface Architecture

### UniFFI Integration

**UniFFI** is the primary FFI binding generator for Kotlin and Swift. It automates the two-layer binding pattern (Rust → C ABI → JNI → Kotlin / Rust → C → Swift).

**Interface Definition (`.udl` file):**
```udl
// bindings/nuvio.udl
namespace nuvio {
    // Global initialization
    void initialize(string storage_path, string log_level);
    void shutdown();
};

// Account management
interface AccountManager {
    constructor();
    [Throws=NuvioError]
    Account? get_current_account();
    [Throws=NuvioError]
    Account create_local_account(string username);
    boolean is_authenticated();
};

// Profile management
interface ProfileManager {
    constructor(StorageBackend storage);
    [Throws=NuvioError]
    Profile create_profile(string name, string? pin);
    [Throws=NuvioError]
    void switch_profile(string profile_id, string? pin);
    sequence<Profile> get_all_profiles();
};

// Data types
dictionary Account {
    string id;
    string username;
    i64 created_at;
    i64 last_active;
};

dictionary Profile {
    string id;
    string name;
    u8 avatar_index;
    i64 created_at;
    i64 last_used;
};

// Errors
[Error]
enum NuvioError {
    "Storage",
    "Network",
    "Auth",
    "NotFound",
    "InvalidInput",
    "RateLimited",
    "Unknown",
};
```

**Generated Bindings:**
- **Kotlin:** `nuvio.kt` with data classes and JNI wrappers
- **Swift:** `nuvio.swift` with structs and C bridging

### FFI Memory Management Rules

**CRITICAL:** Memory allocated by Rust MUST be freed by Rust.

**Pattern 1: Rust Allocates, Platform Frees via Rust**
```rust
#[no_mangle]
pub extern "C" fn nuvio_get_profile(profile_id: *const c_char) -> *mut Profile {
    // Rust allocates
    let profile = Box::new(Profile { /* ... */ });
    Box::into_raw(profile) // Transfer ownership to caller
}

#[no_mangle]
pub extern "C" fn nuvio_free_profile(profile: *mut Profile) {
    if !profile.is_null() {
        unsafe {
            // Rust reclaims ownership and drops
            let _ = Box::from_raw(profile);
        }
    }
}
```

**Pattern 2: String Ownership**
```rust
#[no_mangle]
pub extern "C" fn nuvio_get_username() -> *const c_char {
    let username = CString::new("user123").unwrap();
    username.into_raw() // Caller MUST call nuvio_free_string
}

#[no_mangle]
pub extern "C" fn nuvio_free_string(s: *const c_char) {
    if !s.is_null() {
        unsafe {
            let _ = CString::from_raw(s as *mut c_char);
        }
    }
}
```

**UniFFI Benefit:** UniFFI automates these patterns, generating correct memory management code for both Kotlin and Swift.

### Async Operations Across FFI

**Challenge:** Rust async/await doesn't directly map to Kotlin coroutines or Swift concurrency.

**Solution 1: Callback-Based (Legacy)**
```rust
#[no_mangle]
pub extern "C" fn nuvio_fetch_metadata_async(
    tmdb_id: u32,
    callback: extern "C" fn(*mut Metadata, FFIError),
) {
    tokio::spawn(async move {
        match fetch_metadata(tmdb_id).await {
            Ok(metadata) => callback(Box::into_raw(Box::new(metadata)), FFIError::success()),
            Err(err) => callback(std::ptr::null_mut(), FFIError::from(err)),
        }
    });
}
```

**Solution 2: UniFFI Async Support (Modern)**
```rust
// UniFFI automatically bridges to Kotlin suspend functions and Swift async/await
#[uniffi::export]
async fn fetch_metadata(tmdb_id: u32) -> Result<Metadata, NuvioError> {
    // Regular Rust async code
    tmdb_client.get_movie(tmdb_id).await
}
```

**Generated Kotlin:**
```kotlin
suspend fun fetchMetadata(tmdbId: UInt): Metadata {
    // UniFFI handles the FFI boundary and coroutine bridging
}
```

**Generated Swift:**
```swift
func fetchMetadata(tmdbId: UInt32) async throws -> Metadata {
    // UniFFI handles the FFI boundary and async/await bridging
}
```

---

## Migration Sequencing

### Overall Timeline: 18 Weeks

| Phase | Weeks | Modules | Status |
|-------|-------|---------|--------|
| Foundation | 1-6 | Performance, Focus, Download | CRITICAL |
| Integration | 7-12 | Trakt, Catalog, Metadata, Stream, Watch | HIGH |
| User State | 13-16 | Account, Profile, Settings | MEDIUM |
| UI Support | 17-18 | Theme | LOW |

### Parallel Work Streams

**Week 1-6:**
- **Rust SDK:** Implement foundation modules (performance, focus, download)
- **Kotlin/Swift:** Begin FFI wrapper layer development
- **Testing:** Set up Rust unit tests and FFI integration tests

**Week 7-12:**
- **Rust SDK:** Implement integration layer (Trakt, TMDB, Stremio clients)
- **Kotlin/Swift:** Implement native UI screens with FFI bindings
- **Testing:** End-to-end tests for critical flows (authentication, playback)

**Week 13-16:**
- **Rust SDK:** Complete user state modules (account, profile, settings)
- **Kotlin/Swift:** Complete remaining UI components
- **Testing:** Performance benchmarks and memory leak detection

**Week 17-18:**
- **Rust SDK:** Implement theme engine
- **Kotlin/Swift:** Final UI polish and platform-specific optimizations
- **Testing:** Full regression testing and QA sign-off

### Rollback Strategy

Each phase can be rolled back independently:

1. **Feature Flags:** Use feature flags to toggle between old (React Native) and new (Rust core) implementations
2. **Gradual Rollout:** Roll out to 10% → 50% → 100% of users
3. **A/B Testing:** Compare performance metrics between old and new implementations
4. **Circuit Breaker:** Automatically fallback to old implementation if error rate exceeds threshold

---

## Performance Considerations

### Optimization Targets

| Operation | Current (React Native) | Target (Rust Core) | Expected Improvement |
|-----------|------------------------|--------------------|--------------------|
| App Cold Start | 3-5 seconds | 1-2 seconds | 2-3x faster |
| Profile Switch | 500-800ms | <100ms | 5-8x faster |
| Catalog Load (100 items) | 800-1200ms | 200-400ms | 3-4x faster |
| Stream Resolution (10 addons) | 2-4 seconds | 500-1000ms | 3-4x faster |
| Metadata Search (1000 items) | 200-400ms | 20-50ms | 8-10x faster |
| MMKV Storage Read | 2-5ms | 0.5-1ms | 3-5x faster |
| Watch Progress Update | 50-100ms | 10-20ms | 4-5x faster |

### Memory Efficiency

**React Native Baseline:**
- JS Heap: 50-100 MB
- Native Heap: 100-150 MB
- **Total:** 150-250 MB

**Rust Core Target:**
- Rust Core Memory: 20-40 MB
- Native UI Memory: 80-120 MB
- **Total:** 100-160 MB
- **Reduction:** 40-50 MB (20-30% improvement)

### Concurrency Model

**Tokio Async Runtime:**
- **Thread Pool Size:** Based on CPU cores (typically 4-8 threads on TV devices)
- **Work Stealing Scheduler:** Efficient task distribution across threads
- **Async I/O:** Non-blocking HTTP requests and file I/O

**Parallel Operations:**
- Catalog loading from multiple addons: `tokio::join!` for parallel execution
- Metadata enrichment: Parallel TMDB + MDBList requests
- Stream resolution: Parallel queries to 10+ addons

### Caching Strategy

**LRU Cache Configuration:**
- **Metadata Cache:** 100 items, 7-day TTL, ~5 MB
- **Addon Manifest Cache:** 50 items, 24-hour TTL, ~2 MB
- **Stream Cache:** 20 items, 1-hour TTL, ~1 MB
- **Total Memory:** ~8 MB

**Cache Hit Ratios (Target):**
- Metadata: 85-90%
- Addon Manifests: 95%+
- Streams: 70-75%

---

## Summary

This Rust SDK design provides a comprehensive, modular architecture for migrating business logic from the React Native application to a high-performance, platform-agnostic Rust core. The design prioritizes TV platform requirements while maintaining flexibility for mobile platforms.

**Key Takeaways:**
1. **12 core domain modules** organized by responsibility (account, profile, catalog, library, metadata, stream, download, settings, theme, performance, focus, watch)
2. **5 integration modules** for external APIs (TMDB, Trakt, Stremio, MDBList, GitHub)
3. **4 platform abstraction modules** for cross-platform compatibility (storage, HTTP, time, crypto)
4. **6 infrastructure modules** for cross-cutting concerns (cache, event bus, logger, rate limiting, sync, telemetry)
5. **FFI-ready architecture** using UniFFI for automated Kotlin/Swift bindings
6. **18-week migration plan** with clear priorities (Critical → High → Medium → Low)
7. **2-3x performance improvements** expected across all operations
8. **20-30% memory reduction** compared to React Native baseline

**Next Steps:**
1. Review and approve this design with stakeholders
2. Create detailed FFI boundary design (subtask-4-2)
3. Design Kotlin and Swift native layers (subtasks-4-3, 4-4)
4. Begin Rust SDK implementation (Phase 1: Foundation modules)
