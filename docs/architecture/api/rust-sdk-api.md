# Rust SDK Core Public API Surface

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Project:** NuvioStreamingTV Tri-Layer Architecture Migration
**Purpose:** Define the public API surface of the Rust SDK core (`nuvio-core`) for FFI boundary exposure to Kotlin and Swift native layers.

---

## Table of Contents

1. [Overview](#overview)
2. [Error Handling](#error-handling)
3. [Core Domain Modules](#core-domain-modules)
   - [Account Module](#account-module)
   - [Profile Module](#profile-module)
   - [Catalog Module](#catalog-module)
   - [Library Module](#library-module)
   - [Metadata Module](#metadata-module)
   - [Stream Module](#stream-module)
   - [Download Module](#download-module)
   - [Settings Module](#settings-module)
   - [Theme Module](#theme-module)
   - [Performance Module](#performance-module)
   - [Focus Module](#focus-module)
   - [Watch Module](#watch-module)
4. [Integration Modules](#integration-modules)
5. [Async Patterns](#async-patterns)
6. [FFI Considerations](#ffi-considerations)

---

## Overview

The Rust SDK core (`nuvio-core`) provides a platform-agnostic business logic layer with a clean public API designed for FFI exposure. All public APIs follow these principles:

- **FFI-Safe Types**: All types use C-compatible representations for FFI boundary crossing
- **Memory Safety**: Explicit ownership semantics with documented lifetime management
- **Error Handling**: Result-based error propagation with FFI-safe error types
- **Async by Default**: All I/O operations use tokio async/await runtime
- **Type Safety**: Leverage Rust's type system for correctness guarantees
- **Zero-Copy Patterns**: Minimize allocations and use references where possible

### Crate Structure

```rust
// lib.rs - Crate root
pub mod core;        // Core domain modules
pub mod integration; // External API integrations (internal)
pub mod platform;    // Platform abstraction traits
pub mod infra;       // Infrastructure (internal)
pub mod types;       // Shared type definitions
pub mod error;       // Error types
pub mod ffi;         // FFI boundary layer (UniFFI)
```

---

## Error Handling

### NuvioError

Unified error type for all SDK operations, designed for FFI-safe representation.

```rust
use thiserror::Error;

/// Primary error type for all Rust SDK operations
#[derive(Error, Debug, Clone)]
pub enum NuvioError {
    /// Storage backend error (MMKV, SQLite)
    #[error("Storage error: {0}")]
    Storage(String),

    /// Network communication error (HTTP, timeout)
    #[error("Network error: {0}")]
    Network(String),

    /// Authentication or authorization error
    #[error("Authentication error: {0}")]
    Auth(String),

    /// Resource not found (content, profile, addon)
    #[error("Not found: {0}")]
    NotFound(String),

    /// Invalid input parameter or validation failure
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    /// Rate limiting exceeded, retry after delay
    #[error("Rate limited: retry after {retry_after_seconds}s")]
    RateLimited { retry_after_seconds: u32 },

    /// Serialization/deserialization error
    #[error("Serialization error: {0}")]
    Serialization(String),

    /// Unknown or unexpected error
    #[error("Unknown error: {0}")]
    Unknown(String),
}

/// Result type alias using NuvioError
pub type Result<T> = std::result::Result<T, NuvioError>;
```

### FFI Error Representation

```rust
/// FFI-safe error code for cross-language error handling
#[repr(i32)]
pub enum ErrorCode {
    Success = 0,
    Storage = 1,
    Network = 2,
    Auth = 3,
    NotFound = 4,
    InvalidInput = 5,
    RateLimited = 6,
    Serialization = 7,
    Unknown = 99,
}

/// FFI-safe error structure (C-compatible)
#[repr(C)]
pub struct FFIError {
    pub code: ErrorCode,
    pub message: *const c_char,
}

impl From<NuvioError> for FFIError {
    fn from(err: NuvioError) -> Self {
        // Implementation details in ffi.rs
    }
}
```

---

## Core Domain Modules

### Account Module

**Module:** `core::account`
**Purpose:** User authentication, account state, and session management.
**Priority:** HIGH (Week 7-8)

#### AccountManager

```rust
use std::sync::Arc;
use crate::platform::StorageBackend;
use crate::infra::EventBus;

/// Manages user authentication and account lifecycle
pub struct AccountManager {
    current_user: Option<Account>,
    storage: Arc<dyn StorageBackend>,
    event_bus: Arc<EventBus>,
}

impl AccountManager {
    /// Creates a new AccountManager instance
    ///
    /// # Arguments
    /// * `storage` - Storage backend implementation (MMKV/SQLite)
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;

    /// Initializes the account manager and loads current account
    ///
    /// # Returns
    /// * `Ok(())` - Successfully initialized
    /// * `Err(NuvioError::Storage)` - Storage backend error
    pub async fn initialize(&mut self) -> Result<()>;

    /// Gets the currently authenticated account
    ///
    /// # Returns
    /// * `Some(Account)` - Current account if authenticated
    /// * `None` - No active authentication
    pub async fn get_current_account(&self) -> Option<Account>;

    /// Creates a new local account (cloud auth disabled)
    ///
    /// # Arguments
    /// * `username` - Unique username for the account
    ///
    /// # Returns
    /// * `Ok(Account)` - Successfully created account
    /// * `Err(NuvioError::InvalidInput)` - Invalid username
    /// * `Err(NuvioError::Storage)` - Storage error
    pub async fn create_local_account(&mut self, username: String) -> Result<Account>;

    /// Checks if a user is currently authenticated
    ///
    /// # Returns
    /// * `true` - User is authenticated
    /// * `false` - No active authentication
    pub async fn is_authenticated(&self) -> bool;

    /// Gets the storage scope prefix for current account
    ///
    /// # Returns
    /// * Storage key prefix in format "@user:{id}:"
    ///
    /// # Note
    /// All account-scoped storage keys should use this prefix
    pub fn get_storage_scope(&self) -> String;
}
```

#### Account Type

```rust
/// User account representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    /// Unique account identifier (UUID v4)
    pub id: String,

    /// Account username
    pub username: String,

    /// Account creation timestamp (Unix epoch seconds)
    pub created_at: i64,

    /// Last activity timestamp (Unix epoch seconds)
    pub last_active: i64,
}
```

---

### Profile Module

**Module:** `core::profile`
**Purpose:** Multi-profile management with PIN protection and profile-scoped storage.
**Priority:** MEDIUM (Week 13-14)

#### ProfileManager

```rust
use std::collections::HashMap;
use crate::platform::StorageBackend;

/// Maximum number of profiles per account
pub const MAX_PROFILES: usize = 5;

/// Manages multiple profiles with PIN protection
pub struct ProfileManager {
    profiles: Vec<Profile>,
    active_profile: Option<ProfileId>,
    storage: Arc<dyn StorageBackend>,
    lockout_tracker: LockoutTracker,
}

impl ProfileManager {
    /// Creates a new ProfileManager instance
    ///
    /// # Arguments
    /// * `storage` - Storage backend implementation
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;

    /// Creates a new profile
    ///
    /// # Arguments
    /// * `name` - Profile display name
    /// * `pin` - Optional 4-digit PIN for protection
    ///
    /// # Returns
    /// * `Ok(Profile)` - Successfully created profile
    /// * `Err(NuvioError::InvalidInput)` - Invalid name or PIN format
    /// * `Err(NuvioError::Storage)` - Maximum profiles exceeded or storage error
    pub async fn create_profile(&mut self, name: String, pin: Option<String>) -> Result<Profile>;

    /// Deletes an existing profile
    ///
    /// # Arguments
    /// * `profile_id` - Profile to delete
    ///
    /// # Returns
    /// * `Ok(())` - Successfully deleted
    /// * `Err(NuvioError::NotFound)` - Profile not found
    /// * `Err(NuvioError::Storage)` - Storage error
    pub async fn delete_profile(&mut self, profile_id: ProfileId) -> Result<()>;

    /// Switches to a different profile
    ///
    /// # Arguments
    /// * `profile_id` - Target profile ID
    /// * `pin` - PIN if profile is protected
    ///
    /// # Returns
    /// * `Ok(())` - Successfully switched
    /// * `Err(NuvioError::Auth)` - Incorrect PIN or locked out
    /// * `Err(NuvioError::NotFound)` - Profile not found
    pub async fn switch_profile(&mut self, profile_id: ProfileId, pin: Option<String>) -> Result<()>;

    /// Verifies a profile PIN
    ///
    /// # Arguments
    /// * `profile_id` - Profile to verify
    /// * `pin` - PIN to verify
    ///
    /// # Returns
    /// * `Ok(true)` - Correct PIN
    /// * `Ok(false)` - Incorrect PIN (increments lockout counter)
    /// * `Err(NuvioError::Auth)` - Profile locked out
    pub async fn verify_pin(&self, profile_id: ProfileId, pin: String) -> Result<bool>;

    /// Gets all profiles for current account
    ///
    /// # Returns
    /// * Vector of all profiles (PIN hashes excluded)
    pub async fn get_all_profiles(&self) -> Vec<Profile>;

    /// Gets the currently active profile
    ///
    /// # Returns
    /// * `Some(&Profile)` - Active profile reference
    /// * `None` - No active profile
    pub fn get_active_profile(&self) -> Option<&Profile>;

    /// Gets profile-scoped storage key
    ///
    /// # Arguments
    /// * `key` - Base storage key
    ///
    /// # Returns
    /// * Full storage key in format "@user:{scope}:profile:{id}:{key}"
    pub fn get_profile_storage_key(&self, key: &str) -> String;
}
```

#### Profile Type

```rust
/// Profile identifier (UUID v4)
pub type ProfileId = String;

/// User profile representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    /// Unique profile identifier
    pub id: ProfileId,

    /// Profile display name
    pub name: String,

    /// SHA-256 hashed PIN (None if unprotected)
    #[serde(skip_serializing)]
    pub pin_hash: Option<String>,

    /// Avatar index (0-9)
    pub avatar_index: u8,

    /// Profile creation timestamp (Unix epoch seconds)
    pub created_at: i64,

    /// Last used timestamp (Unix epoch seconds)
    pub last_used: i64,
}

/// PIN lockout tracker (progressive delays)
struct LockoutTracker {
    attempts: HashMap<ProfileId, u8>,
    lockout_until: HashMap<ProfileId, i64>,
}

// Lockout policy: 3/5/10 attempts → 5s/30s/5min delays
```

---

### Catalog Module

**Module:** `core::catalog`
**Purpose:** Content catalog management, addon protocol, and search indexing.
**Priority:** HIGH (Week 9-10)

#### CatalogManager

```rust
use crate::infra::EventBus;
use std::sync::Arc;

/// Manages content catalogs and addon integration
pub struct CatalogManager {
    addons: Vec<Addon>,
    index: SearchIndex,
    cache: AddonCache,
    event_bus: Arc<EventBus>,
}

impl CatalogManager {
    /// Creates a new CatalogManager instance
    ///
    /// # Arguments
    /// * `storage` - Storage backend for addon persistence
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;

    /// Adds a new addon by manifest URL
    ///
    /// # Arguments
    /// * `url` - Addon manifest URL (Stremio protocol)
    ///
    /// # Returns
    /// * `Ok(Addon)` - Successfully added addon
    /// * `Err(NuvioError::Network)` - Failed to fetch manifest
    /// * `Err(NuvioError::InvalidInput)` - Invalid manifest format
    pub async fn add_addon(&mut self, url: String) -> Result<Addon>;

    /// Removes an addon
    ///
    /// # Arguments
    /// * `addon_id` - Addon ID to remove
    ///
    /// # Returns
    /// * `Ok(())` - Successfully removed
    /// * `Err(NuvioError::NotFound)` - Addon not found
    pub async fn remove_addon(&mut self, addon_id: &str) -> Result<()>;

    /// Gets all registered addons
    ///
    /// # Returns
    /// * Vector of all addon manifests
    pub async fn get_all_addons(&self) -> Vec<Addon>;

    /// Loads a catalog from a specific addon
    ///
    /// # Arguments
    /// * `addon_id` - Source addon ID
    /// * `catalog_id` - Catalog ID to load
    ///
    /// # Returns
    /// * `Ok(Vec<ContentItem>)` - Catalog content items
    /// * `Err(NuvioError::NotFound)` - Addon or catalog not found
    /// * `Err(NuvioError::Network)` - Network error
    pub async fn load_catalog(&self, addon_id: &str, catalog_id: &str) -> Result<Vec<ContentItem>>;

    /// Searches across all catalogs
    ///
    /// # Arguments
    /// * `query` - Search query string
    ///
    /// # Returns
    /// * `Ok(Vec<SearchResult>)` - Matching content items
    /// * `Err(NuvioError)` - Search error
    pub async fn search(&self, query: &str) -> Result<Vec<SearchResult>>;

    /// Refreshes all catalog data (delta sync)
    ///
    /// # Returns
    /// * `Ok(())` - Successfully refreshed
    /// * `Err(NuvioError)` - Refresh error
    pub async fn refresh_catalogs(&mut self) -> Result<()>;
}
```

#### Addon Types

```rust
/// Addon manifest (Stremio protocol)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Addon {
    /// Addon unique identifier
    pub id: String,

    /// Addon display name
    pub name: String,

    /// Addon version string (semver)
    pub version: String,

    /// Manifest URL
    pub manifest_url: String,

    /// Available catalogs
    pub catalogs: Vec<CatalogInfo>,

    /// Supported resource types
    pub resources: Vec<ResourceType>,
}

/// Catalog information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogInfo {
    pub id: String,
    pub type_: ContentType,
    pub name: String,
    pub extra: Vec<ExtraField>,
}

/// Resource types supported by addons
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResourceType {
    /// Content catalogs
    Catalog,

    /// Metadata enrichment
    Meta,

    /// Stream resolution
    Stream,

    /// Subtitle sources
    Subtitles,
}

/// Content item from catalog
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentItem {
    pub id: ContentId,
    pub type_: ContentType,
    pub name: String,
    pub poster: Option<String>,
    pub background: Option<String>,
}

/// Search result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub content: ContentItem,
    pub relevance_score: f32,
    pub source_addon: String,
}
```

---

### Library Module

**Module:** `core::library`
**Purpose:** User library management (watchlist, watched history, collection, ratings).
**Priority:** HIGH (Week 9-10)

#### LibraryManager

```rust
use std::collections::{HashSet, HashMap};

/// Manages user's content library
pub struct LibraryManager {
    watchlist: HashSet<ContentId>,
    watched: HashMap<ContentId, WatchedEntry>,
    collection: HashSet<ContentId>,
    ratings: HashMap<ContentId, Rating>,
    storage: Arc<dyn StorageBackend>,
    sync_engine: Option<Arc<TraktSync>>,
}

impl LibraryManager {
    /// Creates a new LibraryManager instance
    ///
    /// # Arguments
    /// * `storage` - Storage backend for persistence
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;

    /// Adds content to watchlist
    ///
    /// # Arguments
    /// * `content_id` - Content identifier (tmdb:{type}:{id} or imdb:{id})
    ///
    /// # Returns
    /// * `Ok(())` - Successfully added
    /// * `Err(NuvioError::Storage)` - Storage error
    pub async fn add_to_watchlist(&mut self, content_id: ContentId) -> Result<()>;

    /// Removes content from watchlist
    ///
    /// # Arguments
    /// * `content_id` - Content identifier
    ///
    /// # Returns
    /// * `Ok(())` - Successfully removed
    /// * `Err(NuvioError::NotFound)` - Not in watchlist
    pub async fn remove_from_watchlist(&mut self, content_id: &ContentId) -> Result<()>;

    /// Checks if content is in watchlist
    ///
    /// # Arguments
    /// * `content_id` - Content identifier
    ///
    /// # Returns
    /// * `true` - In watchlist
    /// * `false` - Not in watchlist
    pub fn is_in_watchlist(&self, content_id: &ContentId) -> bool;

    /// Marks content as watched
    ///
    /// # Arguments
    /// * `content_id` - Content identifier
    /// * `timestamp` - Watch timestamp (Unix epoch seconds)
    ///
    /// # Returns
    /// * `Ok(())` - Successfully marked
    /// * `Err(NuvioError::Storage)` - Storage error
    pub async fn mark_as_watched(&mut self, content_id: ContentId, timestamp: i64) -> Result<()>;

    /// Gets watched entry for content
    ///
    /// # Arguments
    /// * `content_id` - Content identifier
    ///
    /// # Returns
    /// * `Some(&WatchedEntry)` - Entry if content was watched
    /// * `None` - Content not watched
    pub fn get_watched_entry(&self, content_id: &ContentId) -> Option<&WatchedEntry>;

    /// Sets user rating for content
    ///
    /// # Arguments
    /// * `content_id` - Content identifier
    /// * `rating` - Rating value (1-10)
    ///
    /// # Returns
    /// * `Ok(())` - Successfully set
    /// * `Err(NuvioError::InvalidInput)` - Invalid rating value
    pub async fn set_rating(&mut self, content_id: ContentId, rating: u8) -> Result<()>;

    /// Gets all watchlist content IDs
    ///
    /// # Returns
    /// * Vector of content IDs in watchlist
    pub async fn get_all_watchlist(&self) -> Vec<ContentId>;

    /// Synchronizes library with Trakt.tv
    ///
    /// # Returns
    /// * `Ok(SyncStats)` - Sync statistics
    /// * `Err(NuvioError)` - Sync error
    pub async fn sync_with_trakt(&mut self) -> Result<SyncStats>;
}
```

#### Library Types

```rust
/// Content identifier (format: "tmdb:{type}:{id}" or "imdb:{id}")
pub type ContentId = String;

/// Watched entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchedEntry {
    /// Content identifier
    pub content_id: ContentId,

    /// Last watched timestamp (Unix epoch seconds)
    pub watched_at: i64,

    /// Number of times watched
    pub play_count: u32,
}

/// User rating (1-10)
pub type Rating = u8;

/// Trakt sync statistics
#[derive(Debug, Clone)]
pub struct SyncStats {
    pub added: u32,
    pub updated: u32,
    pub removed: u32,
    pub not_found: u32,
}
```

---

### Metadata Module

**Module:** `core::metadata`
**Purpose:** Content metadata fetching, enrichment, and caching.
**Priority:** HIGH (Week 9-10)

#### MetadataManager

```rust
use crate::integration::{TmdbClient, MdbListClient};

/// Manages content metadata from multiple sources
pub struct MetadataManager {
    tmdb_client: Arc<TmdbClient>,
    mdblist_client: Option<Arc<MdbListClient>>,
    cache: MetadataCache,
    storage: Arc<dyn StorageBackend>,
}

impl MetadataManager {
    /// Creates a new MetadataManager instance
    ///
    /// # Arguments
    /// * `tmdb_api_key` - TMDB API key
    /// * `storage` - Storage backend for caching
    pub fn new(tmdb_api_key: String, storage: Arc<dyn StorageBackend>) -> Self;

    /// Fetches movie metadata
    ///
    /// # Arguments
    /// * `tmdb_id` - TMDB movie ID
    ///
    /// # Returns
    /// * `Ok(Movie)` - Movie metadata
    /// * `Err(NuvioError::NotFound)` - Movie not found
    /// * `Err(NuvioError::Network)` - Network error
    pub async fn get_movie(&self, tmdb_id: u32) -> Result<Movie>;

    /// Fetches TV show metadata
    ///
    /// # Arguments
    /// * `tmdb_id` - TMDB show ID
    ///
    /// # Returns
    /// * `Ok(Show)` - Show metadata
    /// * `Err(NuvioError)` - Fetch error
    pub async fn get_show(&self, tmdb_id: u32) -> Result<Show>;

    /// Fetches episode metadata
    ///
    /// # Arguments
    /// * `show_id` - TMDB show ID
    /// * `season` - Season number
    /// * `episode` - Episode number
    ///
    /// # Returns
    /// * `Ok(Episode)` - Episode metadata
    /// * `Err(NuvioError)` - Fetch error
    pub async fn get_episode(&self, show_id: u32, season: u32, episode: u32) -> Result<Episode>;

    /// Fetches cast and crew credits
    ///
    /// # Arguments
    /// * `tmdb_id` - TMDB content ID
    /// * `content_type` - Movie or TV show
    ///
    /// # Returns
    /// * `Ok(Credits)` - Cast and crew information
    /// * `Err(NuvioError)` - Fetch error
    pub async fn get_credits(&self, tmdb_id: u32, content_type: ContentType) -> Result<Credits>;

    /// Searches across all content types
    ///
    /// # Arguments
    /// * `query` - Search query string
    /// * `page` - Result page number (1-indexed)
    ///
    /// # Returns
    /// * `Ok(SearchResults)` - Search results
    /// * `Err(NuvioError)` - Search error
    pub async fn search_multi(&self, query: &str, page: u32) -> Result<SearchResults>;

    /// Fetches aggregated ratings from multiple sources
    ///
    /// # Arguments
    /// * `imdb_id` - IMDB content ID
    ///
    /// # Returns
    /// * `Ok(AggregatedRatings)` - Ratings from TMDB, IMDB, Rotten Tomatoes, etc.
    /// * `Err(NuvioError)` - Fetch error
    pub async fn get_aggregated_ratings(&self, imdb_id: &str) -> Result<AggregatedRatings>;

    /// Generates TMDB image URL
    ///
    /// # Arguments
    /// * `path` - Image path from TMDB
    /// * `size` - Desired image size
    ///
    /// # Returns
    /// * Full TMDB image URL
    pub fn image_url(&self, path: &str, size: ImageSize) -> String;
}
```

#### Metadata Types

```rust
/// Movie metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Movie {
    pub tmdb_id: u32,
    pub imdb_id: Option<String>,
    pub title: String,
    pub overview: String,
    pub release_date: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub vote_average: f32,
    pub vote_count: u32,
    pub runtime: Option<u32>,
    pub genres: Vec<Genre>,
    pub production_countries: Vec<String>,
}

/// TV show metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Show {
    pub tmdb_id: u32,
    pub imdb_id: Option<String>,
    pub name: String,
    pub overview: String,
    pub first_air_date: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub vote_average: f32,
    pub number_of_seasons: u32,
    pub number_of_episodes: u32,
    pub genres: Vec<Genre>,
    pub status: String,
}

/// Episode metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Episode {
    pub tmdb_id: u32,
    pub name: String,
    pub overview: String,
    pub season_number: u32,
    pub episode_number: u32,
    pub air_date: Option<String>,
    pub still_path: Option<String>,
    pub vote_average: f32,
    pub runtime: Option<u32>,
}

/// Genre
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Genre {
    pub id: u32,
    pub name: String,
}

/// Content type
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ContentType {
    Movie,
    Show,
    Episode,
}

/// Image size options
#[derive(Debug, Clone, Copy)]
pub enum ImageSize {
    W92,
    W154,
    W185,
    W342,
    W500,
    W780,
    Original,
}

/// Cast and crew credits
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Credits {
    pub cast: Vec<CastMember>,
    pub crew: Vec<CrewMember>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CastMember {
    pub id: u32,
    pub name: String,
    pub character: String,
    pub profile_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrewMember {
    pub id: u32,
    pub name: String,
    pub job: String,
    pub department: String,
}

/// Aggregated ratings from multiple sources
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregatedRatings {
    pub tmdb: Option<f32>,
    pub imdb: Option<f32>,
    pub rotten_tomatoes: Option<u8>,
    pub metacritic: Option<u8>,
}
```

---

### Stream Module

**Module:** `core::stream`
**Purpose:** Stream resolution, source selection, and quality management.
**Priority:** HIGH (Week 11-12)

#### StreamManager

```rust
/// Manages stream resolution and quality selection
pub struct StreamManager {
    catalog_manager: Arc<CatalogManager>,
    debrid_clients: Vec<Arc<dyn DebridClient>>,
    cache: StreamCache,
    quality_selector: QualitySelector,
}

impl StreamManager {
    /// Creates a new StreamManager instance
    ///
    /// # Arguments
    /// * `catalog_manager` - Reference to catalog manager
    pub fn new(catalog_manager: Arc<CatalogManager>) -> Self;

    /// Resolves streams for content from all addons
    ///
    /// # Arguments
    /// * `content_id` - Content identifier
    ///
    /// # Returns
    /// * `Ok(Vec<Stream>)` - Available streams
    /// * `Err(NuvioError)` - Resolution error
    pub async fn resolve_streams(&self, content_id: ContentId) -> Result<Vec<Stream>>;

    /// Selects best stream based on preferences
    ///
    /// # Arguments
    /// * `streams` - Available streams
    /// * `preferences` - User quality and source preferences
    ///
    /// # Returns
    /// * `Some(Stream)` - Best matching stream
    /// * `None` - No suitable stream found
    pub async fn select_best_stream(
        &self,
        streams: Vec<Stream>,
        preferences: StreamPreferences
    ) -> Option<Stream>;

    /// Fetches subtitles for content
    ///
    /// # Arguments
    /// * `content_id` - Content identifier
    ///
    /// # Returns
    /// * `Ok(Vec<Subtitle>)` - Available subtitles
    /// * `Err(NuvioError)` - Fetch error
    pub async fn fetch_subtitles(&self, content_id: ContentId) -> Result<Vec<Subtitle>>;

    /// Sets quality preference
    ///
    /// # Arguments
    /// * `quality` - Desired quality preference
    pub fn set_quality_preference(&mut self, quality: QualityPreference);
}
```

#### Stream Types

```rust
/// Stream source
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stream {
    /// Stream URL (HTTP/HTTPS)
    pub url: String,

    /// Display title
    pub title: String,

    /// Quality label (4K, 1080p, 720p, etc.)
    pub quality: Option<String>,

    /// File size in bytes
    pub size: Option<u64>,

    /// Source addon or service name
    pub source: String,

    /// Debrid service if applicable
    pub debrid_service: Option<String>,
}

/// Quality preference
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum QualityPreference {
    /// Automatic based on device performance
    Auto,

    /// 4K / 2160p
    FourK,

    /// 1080p Full HD
    FullHD,

    /// 720p HD
    HD,

    /// 480p SD
    SD,
}

/// Stream selection preferences
#[derive(Debug, Clone)]
pub struct StreamPreferences {
    pub quality: QualityPreference,
    pub prefer_cached: bool,
    pub prefer_debrid: bool,
    pub max_size_mb: Option<u64>,
}

/// Subtitle track
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subtitle {
    /// Subtitle URL
    pub url: String,

    /// Language code (ISO 639-1)
    pub lang: String,

    /// Format (srt, vtt, etc.)
    pub format: String,
}
```

---

### Download Module

**Module:** `core::download`
**Purpose:** Offline content management with pause/resume support.
**Priority:** CRITICAL (Week 5-6)

#### DownloadManager

```rust
use std::collections::{HashMap, VecDeque};

/// Maximum concurrent downloads
pub const MAX_CONCURRENT_DOWNLOADS: usize = 3;

/// Manages offline content downloads
pub struct DownloadManager {
    downloads: HashMap<DownloadId, DownloadState>,
    queue: VecDeque<DownloadId>,
    storage: Arc<dyn StorageBackend>,
    max_concurrent: usize,
    quota_limit: u64, // bytes
}

impl DownloadManager {
    /// Creates a new DownloadManager instance
    ///
    /// # Arguments
    /// * `storage` - Storage backend for downloads
    /// * `quota_limit` - Maximum storage quota in bytes
    pub fn new(storage: Arc<dyn StorageBackend>, quota_limit: u64) -> Self;

    /// Adds a download to the queue
    ///
    /// # Arguments
    /// * `content_id` - Content identifier
    /// * `stream` - Stream to download
    ///
    /// # Returns
    /// * `Ok(DownloadId)` - Download ID
    /// * `Err(NuvioError::InvalidInput)` - Quota exceeded
    pub async fn add_download(&mut self, content_id: ContentId, stream: Stream) -> Result<DownloadId>;

    /// Pauses an active download
    ///
    /// # Arguments
    /// * `download_id` - Download to pause
    ///
    /// # Returns
    /// * `Ok(())` - Successfully paused
    /// * `Err(NuvioError::NotFound)` - Download not found
    pub async fn pause_download(&mut self, download_id: DownloadId) -> Result<()>;

    /// Resumes a paused download
    ///
    /// # Arguments
    /// * `download_id` - Download to resume
    ///
    /// # Returns
    /// * `Ok(())` - Successfully resumed
    /// * `Err(NuvioError::NotFound)` - Download not found
    pub async fn resume_download(&mut self, download_id: DownloadId) -> Result<()>;

    /// Cancels a download
    ///
    /// # Arguments
    /// * `download_id` - Download to cancel
    ///
    /// # Returns
    /// * `Ok(())` - Successfully cancelled
    /// * `Err(NuvioError::NotFound)` - Download not found
    pub async fn cancel_download(&mut self, download_id: DownloadId) -> Result<()>;

    /// Deletes a completed download
    ///
    /// # Arguments
    /// * `download_id` - Download to delete
    ///
    /// # Returns
    /// * `Ok(())` - Successfully deleted
    /// * `Err(NuvioError::NotFound)` - Download not found
    pub async fn delete_download(&mut self, download_id: DownloadId) -> Result<()>;

    /// Gets download progress
    ///
    /// # Arguments
    /// * `download_id` - Download ID
    ///
    /// # Returns
    /// * `Some(DownloadProgress)` - Current progress
    /// * `None` - Download not found
    pub fn get_download_progress(&self, download_id: DownloadId) -> Option<DownloadProgress>;

    /// Gets all downloads
    ///
    /// # Returns
    /// * Vector of all download information
    pub fn get_all_downloads(&self) -> Vec<DownloadInfo>;

    /// Gets total used storage
    ///
    /// # Returns
    /// * Used storage in bytes
    pub fn get_used_storage(&self) -> u64;
}
```

#### Download Types

```rust
/// Download identifier (UUID v4)
pub type DownloadId = String;

/// Download state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadState {
    pub id: DownloadId,
    pub content_id: ContentId,
    pub status: DownloadStatus,
    pub progress: f32, // 0.0 to 1.0
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub file_path: String,
}

/// Download status
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum DownloadStatus {
    Queued,
    Downloading,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

/// Download progress information
#[derive(Debug, Clone)]
pub struct DownloadProgress {
    pub progress: f32,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub speed_bytes_per_sec: u64,
    pub eta_seconds: Option<u64>,
}

/// Download information (for listing)
#[derive(Debug, Clone)]
pub struct DownloadInfo {
    pub id: DownloadId,
    pub content_id: ContentId,
    pub status: DownloadStatus,
    pub progress: f32,
    pub size_bytes: u64,
}
```

---

### Settings Module

**Module:** `core::settings`
**Purpose:** Application settings management with validation and persistence.
**Priority:** MEDIUM (Week 13-14)

#### SettingsManager

```rust
use serde::{Serialize, Deserialize};
use serde_json::Value as JsonValue;

/// Manages application settings
pub struct SettingsManager {
    settings: Arc<RwLock<AppSettings>>,
    storage: Arc<dyn StorageBackend>,
    validators: HashMap<String, Box<dyn SettingValidator>>,
    event_bus: Arc<EventBus>,
}

impl SettingsManager {
    /// Creates a new SettingsManager instance
    ///
    /// # Arguments
    /// * `storage` - Storage backend
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;

    /// Loads settings from storage
    ///
    /// # Returns
    /// * `Ok(())` - Successfully loaded
    /// * `Err(NuvioError::Storage)` - Load error
    pub async fn load_settings(&mut self) -> Result<()>;

    /// Gets a setting value
    ///
    /// # Arguments
    /// * `key` - Setting key (dot-notation supported)
    ///
    /// # Returns
    /// * `Some(T)` - Setting value
    /// * `None` - Setting not found
    pub async fn get_setting<T: DeserializeOwned>(&self, key: &str) -> Option<T>;

    /// Sets a setting value
    ///
    /// # Arguments
    /// * `key` - Setting key
    /// * `value` - New value
    ///
    /// # Returns
    /// * `Ok(())` - Successfully set
    /// * `Err(NuvioError::InvalidInput)` - Validation failed
    pub async fn set_setting<T: Serialize>(&mut self, key: &str, value: T) -> Result<()>;

    /// Gets all settings
    ///
    /// # Returns
    /// * Complete settings structure
    pub fn get_all_settings(&self) -> AppSettings;

    /// Resets all settings to defaults
    ///
    /// # Returns
    /// * `Ok(())` - Successfully reset
    /// * `Err(NuvioError::Storage)` - Storage error
    pub async fn reset_to_defaults(&mut self) -> Result<()>;
}
```

#### Settings Types

```rust
/// Application settings
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

/// Parental control settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParentalSettings {
    pub enabled: bool,
    pub max_rating: String,
    pub pin_required: bool,
}

/// Accessibility settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessibilitySettings {
    pub high_contrast: bool,
    pub large_text: bool,
    pub screen_reader: bool,
    pub closed_captions: bool,
}
```

---

### Theme Module

**Module:** `core::theme`
**Purpose:** Theme engine with color management and accessibility support.
**Priority:** LOW (Week 17-18)

#### ThemeEngine

```rust
/// Theme engine with color management
pub struct ThemeEngine {
    themes: HashMap<ThemeId, Theme>,
    current_theme: ThemeId,
    accessibility_mode: AccessibilityMode,
}

impl ThemeEngine {
    /// Creates a new ThemeEngine instance
    pub fn new() -> Self;

    /// Registers a new theme
    ///
    /// # Arguments
    /// * `theme` - Theme definition
    ///
    /// # Returns
    /// * Theme ID
    pub fn register_theme(&mut self, theme: Theme) -> ThemeId;

    /// Applies a theme
    ///
    /// # Arguments
    /// * `theme_id` - Theme to apply
    ///
    /// # Returns
    /// * `Ok(())` - Successfully applied
    /// * `Err(NuvioError::NotFound)` - Theme not found
    pub fn apply_theme(&mut self, theme_id: ThemeId) -> Result<()>;

    /// Gets the current theme
    ///
    /// # Returns
    /// * Reference to current theme
    pub fn get_current_theme(&self) -> &Theme;

    /// Sets accessibility mode
    ///
    /// # Arguments
    /// * `mode` - Accessibility mode
    pub fn set_accessibility_mode(&mut self, mode: AccessibilityMode);

    /// Validates WCAG contrast ratio
    ///
    /// # Arguments
    /// * `foreground` - Foreground color (ARGB)
    /// * `background` - Background color (ARGB)
    ///
    /// # Returns
    /// * WCAG contrast ratio (1.0-21.0)
    pub fn validate_contrast(&self, foreground: Color, background: Color) -> f32;
}
```

#### Theme Types

```rust
/// Theme identifier
pub type ThemeId = String;

/// Color (ARGB format: 0xAARRGGBB)
pub type Color = u32;

/// Theme definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub id: ThemeId,
    pub name: String,
    pub colors: ColorPalette,
}

/// Color palette
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorPalette {
    pub primary: Color,
    pub secondary: Color,
    pub background: Color,
    pub surface: Color,
    pub error: Color,
    pub text_primary: Color,
    pub text_secondary: Color,
}

/// Accessibility mode
#[derive(Debug, Clone, Copy)]
pub enum AccessibilityMode {
    Normal,
    HighContrast,
    LargeText,
}
```

---

### Performance Module

**Module:** `core::performance`
**Purpose:** Device performance detection and adaptive optimization.
**Priority:** CRITICAL (Week 1-2)

#### PerformanceMonitor

```rust
/// Device performance monitor and optimizer
pub struct PerformanceMonitor {
    device_tier: DeviceTier,
    cpu_cores: usize,
    available_memory: u64,
    performance_profile: PerformanceProfile,
}

impl PerformanceMonitor {
    /// Detects device performance characteristics
    ///
    /// # Returns
    /// * Performance monitor instance
    pub fn detect() -> Self;

    /// Gets device performance tier
    ///
    /// # Returns
    /// * Device tier (High/Medium/Low)
    pub fn get_device_tier(&self) -> DeviceTier;

    /// Gets recommended quality for device
    ///
    /// # Returns
    /// * Recommended quality preference
    pub fn get_recommended_quality(&self) -> QualityPreference;

    /// Checks if feature should be enabled
    ///
    /// # Arguments
    /// * `feature` - Feature name
    ///
    /// # Returns
    /// * `true` - Feature should be enabled
    /// * `false` - Feature should be disabled for performance
    pub fn should_enable_feature(&self, feature: &str) -> bool;

    /// Records frame rendering time
    ///
    /// # Arguments
    /// * `duration_ms` - Frame time in milliseconds
    pub fn record_frame_time(&mut self, duration_ms: f32);

    /// Gets average FPS
    ///
    /// # Returns
    /// * Average frames per second
    pub fn get_avg_fps(&self) -> f32;
}
```

#### Performance Types

```rust
/// Device performance tier
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum DeviceTier {
    /// High-end: 8+ cores, 4GB+ RAM
    High,

    /// Mid-range: 4-7 cores, 2-4GB RAM
    Medium,

    /// Low-end: <4 cores, <2GB RAM
    Low,
}

/// Performance profile with optimization settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceProfile {
    pub enable_animations: bool,
    pub max_cache_size: u64,
    pub preload_threshold: usize,
}
```

---

### Focus Module

**Module:** `core::focus`
**Purpose:** TV focus management state tracking.
**Priority:** CRITICAL (Week 3-4)

#### FocusManager

```rust
/// TV focus state manager
pub struct FocusManager {
    focus_tree: HashMap<ScreenId, FocusNode>,
    current_screen: Option<ScreenId>,
    focus_history: Vec<FocusEntry>,
    event_bus: Arc<EventBus>,
}

impl FocusManager {
    /// Creates a new FocusManager instance
    ///
    /// # Arguments
    /// * `event_bus` - Event bus for focus events
    pub fn new(event_bus: Arc<EventBus>) -> Self;

    /// Registers a screen for focus tracking
    ///
    /// # Arguments
    /// * `screen_id` - Screen identifier
    pub fn register_screen(&mut self, screen_id: ScreenId);

    /// Sets focus to an element
    ///
    /// # Arguments
    /// * `screen_id` - Screen containing element
    /// * `element_id` - Element to focus
    pub fn set_focus(&mut self, screen_id: ScreenId, element_id: ElementId);

    /// Gets currently focused element on screen
    ///
    /// # Arguments
    /// * `screen_id` - Screen identifier
    ///
    /// # Returns
    /// * `Some(ElementId)` - Focused element ID
    /// * `None` - No focus on screen
    pub fn get_focused_element(&self, screen_id: &ScreenId) -> Option<ElementId>;

    /// Pushes focus state to history
    ///
    /// # Arguments
    /// * `screen_id` - Screen identifier
    /// * `element_id` - Element identifier
    pub fn push_focus(&mut self, screen_id: ScreenId, element_id: ElementId);

    /// Pops focus state from history
    ///
    /// # Returns
    /// * `Some(FocusEntry)` - Previous focus state
    /// * `None` - No history
    pub fn pop_focus(&mut self) -> Option<FocusEntry>;

    /// Clears focus for a screen
    ///
    /// # Arguments
    /// * `screen_id` - Screen to clear
    pub fn clear_screen_focus(&mut self, screen_id: &ScreenId);
}
```

#### Focus Types

```rust
/// Screen identifier
pub type ScreenId = String;

/// Element identifier
pub type ElementId = String;

/// Focus node in focus tree
#[derive(Debug, Clone)]
pub struct FocusNode {
    pub screen_id: ScreenId,
    pub focused_element: Option<ElementId>,
    pub last_updated: i64,
}

/// Focus history entry
#[derive(Debug, Clone)]
pub struct FocusEntry {
    pub screen_id: ScreenId,
    pub element_id: ElementId,
    pub timestamp: i64,
}
```

---

### Watch Module

**Module:** `core::watch`
**Purpose:** Watch progress tracking and scrobbling.
**Priority:** HIGH (Week 11-12)

#### WatchProgressTracker

```rust
/// Watch progress tracker with scrobbling
pub struct WatchProgressTracker {
    active_sessions: HashMap<SessionId, WatchSession>,
    storage: Arc<dyn StorageBackend>,
    trakt_sync: Option<Arc<TraktSync>>,
}

impl WatchProgressTracker {
    /// Creates a new WatchProgressTracker instance
    ///
    /// # Arguments
    /// * `storage` - Storage backend
    pub fn new(storage: Arc<dyn StorageBackend>) -> Self;

    /// Starts a watch session
    ///
    /// # Arguments
    /// * `content_id` - Content being watched
    ///
    /// # Returns
    /// * Session ID
    pub async fn start_session(&mut self, content_id: ContentId) -> SessionId;

    /// Updates watch progress
    ///
    /// # Arguments
    /// * `session_id` - Active session
    /// * `position_seconds` - Current playback position
    /// * `duration_seconds` - Total content duration
    ///
    /// # Returns
    /// * `Ok(())` - Successfully updated
    /// * `Err(NuvioError::NotFound)` - Session not found
    pub async fn update_progress(
        &mut self,
        session_id: SessionId,
        position_seconds: u32,
        duration_seconds: u32
    ) -> Result<()>;

    /// Ends a watch session
    ///
    /// # Arguments
    /// * `session_id` - Session to end
    ///
    /// # Returns
    /// * `Ok(())` - Successfully ended
    /// * `Err(NuvioError::NotFound)` - Session not found
    pub async fn end_session(&mut self, session_id: SessionId) -> Result<()>;

    /// Gets resume point for content
    ///
    /// # Arguments
    /// * `content_id` - Content identifier
    ///
    /// # Returns
    /// * `Some(u32)` - Resume position in seconds
    /// * `None` - No resume point
    pub async fn get_resume_point(&self, content_id: &ContentId) -> Option<u32>;

    /// Gets "continue watching" items
    ///
    /// # Arguments
    /// * `limit` - Maximum items to return
    ///
    /// # Returns
    /// * Vector of continue watching items
    pub async fn get_continue_watching(&self, limit: usize) -> Vec<ContinueWatchingItem>;
}
```

#### Watch Types

```rust
/// Session identifier (UUID v4)
pub type SessionId = String;

/// Watch session
#[derive(Debug, Clone)]
pub struct WatchSession {
    pub session_id: SessionId,
    pub content_id: ContentId,
    pub started_at: i64,
    pub last_position: u32,
    pub duration: u32,
}

/// Continue watching item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContinueWatchingItem {
    pub content_id: ContentId,
    pub position_seconds: u32,
    pub duration_seconds: u32,
    pub progress_percent: f32,
    pub last_watched: i64,
}
```

---

## Integration Modules

Integration modules provide API clients for external services. These are **internal modules** (not exposed via FFI) used by core modules.

### Integration Module Overview

```rust
// integration/mod.rs
pub mod tmdb;      // TMDB API client
pub mod trakt;     // Trakt.tv API client
pub mod stremio;   // Stremio protocol client
pub mod mdblist;   // MDBList API client
pub mod github;    // GitHub releases API client

// Re-exports for internal use
pub use tmdb::TmdbClient;
pub use trakt::TraktClient;
pub use stremio::StremioClient;
pub use mdblist::MdbListClient;
pub use github::GithubClient;
```

These clients handle:
- HTTP request/response
- Rate limiting
- Error handling
- Response parsing
- Caching strategies

---

## Async Patterns

### Tokio Runtime

All async operations use the tokio runtime:

```rust
// Runtime initialization (called from FFI layer)
use tokio::runtime::Runtime;

lazy_static! {
    pub static ref RUNTIME: Runtime = Runtime::new().unwrap();
}

// Async function example
pub async fn fetch_data() -> Result<Data> {
    // Async I/O operations
    let response = http_client.get(url).await?;
    let data = parse_response(response).await?;
    Ok(data)
}

// FFI bridge to async (handled by UniFFI)
#[uniffi::export]
async fn fetch_data_ffi() -> Result<Data> {
    fetch_data().await
}
```

### Parallel Execution

Use `tokio::join!` for parallel operations:

```rust
// Parallel catalog loading
let (result1, result2, result3) = tokio::join!(
    load_catalog(addon1),
    load_catalog(addon2),
    load_catalog(addon3),
);
```

### Background Tasks

Spawn background tasks with tokio:

```rust
// Background sync task
tokio::spawn(async move {
    loop {
        sync_library().await;
        tokio::time::sleep(Duration::from_secs(3600)).await;
    }
});
```

---

## FFI Considerations

### Memory Management

**Critical Rule:** Memory allocated by Rust MUST be freed by Rust.

```rust
// Ownership transfer pattern (handled by UniFFI)
#[uniffi::export]
fn get_profile(profile_id: String) -> Option<Profile> {
    // UniFFI handles memory management automatically
    profile_manager.get_profile(&profile_id)
}

// Manual pattern (if not using UniFFI)
#[no_mangle]
pub extern "C" fn nuvio_get_profile(profile_id: *const c_char) -> *mut Profile {
    let profile = Box::new(/* ... */);
    Box::into_raw(profile) // Transfer ownership to caller
}

#[no_mangle]
pub extern "C" fn nuvio_free_profile(profile: *mut Profile) {
    if !profile.is_null() {
        unsafe { let _ = Box::from_raw(profile); }
    }
}
```

### Error Handling Across FFI

Never panic across FFI boundary:

```rust
use std::panic::catch_unwind;

#[no_mangle]
pub extern "C" fn nuvio_safe_call() -> FFIError {
    match catch_unwind(|| {
        // Actual implementation
        Ok(())
    }) {
        Ok(result) => match result {
            Ok(_) => FFIError::success(),
            Err(e) => FFIError::from(e),
        },
        Err(_) => FFIError::panic(),
    }
}
```

### UniFFI Integration

Primary FFI binding generator (recommended):

```udl
// bindings/nuvio.udl
namespace nuvio {};

// Interface definitions
interface AccountManager {
    constructor();
    [Throws=NuvioError]
    Account? get_current_account();
};

// Type definitions
dictionary Account {
    string id;
    string username;
    i64 created_at;
};

// Error definitions
[Error]
enum NuvioError {
    "Storage",
    "Network",
    "Auth",
    // ...
};
```

UniFFI generates:
- Kotlin bindings with JNI bridge
- Swift bindings with C bridging
- Automatic memory management
- Type-safe async/await mapping

---

## Summary

This API surface defines **approximately 150 FFI-exposed functions** across 12 core modules:

| Module | Priority | Public Functions | Key Types |
|--------|----------|------------------|-----------|
| Account | HIGH | 6 | Account |
| Profile | MEDIUM | 7 | Profile, ProfileId |
| Catalog | HIGH | 6 | Addon, ContentItem, SearchResult |
| Library | HIGH | 8 | ContentId, WatchedEntry, Rating |
| Metadata | HIGH | 7 | Movie, Show, Episode, Credits |
| Stream | HIGH | 4 | Stream, QualityPreference, Subtitle |
| Download | CRITICAL | 8 | DownloadState, DownloadStatus, DownloadProgress |
| Settings | MEDIUM | 5 | AppSettings, ParentalSettings |
| Theme | LOW | 5 | Theme, ColorPalette, ThemeId |
| Performance | CRITICAL | 5 | DeviceTier, PerformanceProfile |
| Focus | CRITICAL | 6 | FocusNode, ScreenId, ElementId |
| Watch | HIGH | 5 | WatchSession, ContinueWatchingItem |

**Total Estimated SLOC:** 15,000-20,000 lines of Rust code

All APIs follow consistent patterns:
- ✅ Result-based error handling
- ✅ Async/await for I/O operations
- ✅ FFI-safe types
- ✅ Documented memory ownership
- ✅ UniFFI compatibility

---

**Next Steps:**
1. Implement Rust SDK modules following this API specification
2. Generate FFI bindings using UniFFI
3. Implement Kotlin/Swift native layers consuming these APIs
4. Establish testing strategy for FFI boundaries
