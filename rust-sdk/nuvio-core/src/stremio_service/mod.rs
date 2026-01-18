//! Stremio Service module
//!
//! This module provides high-performance Stremio addon integration functionality for the Nuvio Streaming TV SDK.
//! It handles addon discovery, manifest parsing, catalog fetching, stream resolution, and meta aggregation
//! across multiple addon sources with proper error handling and FFI compatibility.
//!
//! # Core Functionality
//!
//! - Addon manifest parsing and validation
//! - Catalog fetching with pagination support
//! - Stream resolution by content ID across multiple addons
//! - Meta aggregation with priority-based conflict resolution
//! - Addon health checks and configuration management
//! - Parallel fetching with timeout and retry logic
//! - Response validation and sanitization
//!
//! # Architecture
//!
//! The service is built around async/await patterns using Tokio runtime, with proper FFI bridges
//! for Kotlin and Swift consumption. All types are UniFFI-compatible and errors propagate across
//! language boundaries as error codes.
//!
//! # Usage Example
//!
//! ```no_run
//! use nuvio_core::stremio_service::{StremioService, ServiceConfig};
//!
//! # async fn example() -> Result<(), Box<dyn std::error::Error>> {
//! // Create service with custom configuration
//! let config = ServiceConfig {
//!     default_timeout: 15,
//!     max_concurrent_requests: 20,
//!     ..Default::default()
//! };
//! let service = StremioService::with_config(config);
//!
//! // Discover and add an addon
//! let addon = service.discover("https://example.com/manifest.json").await?;
//! println!("Added addon: {}", addon.name);
//!
//! // Fetch catalog from addon
//! let catalog_items = service.get_catalog(&addon.id, "movie", "top", 1).await?;
//! println!("Found {} catalog items", catalog_items.len());
//!
//! // Resolve streams for a movie (IMDb ID)
//! let streams = service.resolve_streams("movie", "tt1234567").await;
//! println!("Found {} streams from {} addons",
//!          streams.len(), service.addon_count());
//!
//! // Aggregate metadata from all addons
//! if let Some(meta) = service.aggregate_meta("movie", "tt1234567").await {
//!     println!("Title: {}", meta.name);
//!     if let Some(year) = meta.year {
//!         println!("Year: {}", year);
//!     }
//! }
//! # Ok(())
//! # }
//! ```
//!
//! # Thread Safety
//!
//! The [`StremioService`] is thread-safe and can be cloned to share across threads:
//!
//! ```
//! use nuvio_core::stremio_service::StremioService;
//! use std::thread;
//!
//! let service = StremioService::new();
//! let service_clone = service.clone();
//!
//! // Use in different thread
//! thread::spawn(move || {
//!     println!("Addon count: {}", service_clone.addon_count());
//! });
//! ```
//!
//! # Submodules
//!
//! - [`types`] - Stremio-specific domain types (Addon, Manifest, Subtitle)
//! - [`addon`] - Addon discovery, configuration, and health checks
//! - [`catalog`] - Catalog fetching with pagination
//! - [`stream`] - Stream resolution and aggregation
//! - [`meta`] - Metadata aggregation from multiple sources
//! - [`fetcher`] - HTTP client with timeout, retry, and parallel fetching
//! - [`validation`] - Response validation and sanitization

use std::sync::{Arc, RwLock};

// Submodule declarations - will be uncommented as modules are implemented
pub mod addon;
pub mod catalog;
pub mod fetcher;
pub mod meta;
pub mod stream;
pub mod types;
pub mod validation;

// Re-exports - will be uncommented as types are implemented
// These are internal Stremio protocol types, not directly exposed via FFI
// The FFI layer will convert between these and Nuvio's main types
pub use types::{
    Addon, Catalog, CatalogExtra, Manifest, Meta, ResourceObject, SourceObject, StremioStream,
    Subtitle,
};

/// Configuration for the Stremio service
///
/// This struct controls the behavior of HTTP requests, timeouts, retries, and
/// concurrency limits when interacting with Stremio addons.
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::ServiceConfig;
///
/// // Use default configuration
/// let config = ServiceConfig::default();
///
/// // Create custom configuration for high-latency networks
/// let slow_network_config = ServiceConfig {
///     default_timeout: 30,  // 30 second timeout
///     max_concurrent_requests: 5,  // Limit concurrency
///     max_retries: 5,  // More retries
///     ..Default::default()
/// };
///
/// // Create configuration for fast networks with many addons
/// let fast_network_config = ServiceConfig {
///     default_timeout: 5,  // 5 second timeout
///     max_concurrent_requests: 50,  // Higher concurrency
///     max_retries: 1,  // Fewer retries
///     ..Default::default()
/// };
/// ```
#[derive(Debug, Clone)]
pub struct ServiceConfig {
    /// Default timeout for addon requests in seconds
    ///
    /// This timeout applies to each individual HTTP request to an addon.
    /// Adjust based on network conditions and addon response times.
    pub default_timeout: u64,

    /// Maximum number of concurrent addon requests
    ///
    /// Controls how many addons can be queried in parallel. Higher values
    /// improve performance but increase resource usage.
    pub max_concurrent_requests: usize,

    /// Maximum response size in bytes
    ///
    /// Responses larger than this limit will be rejected to prevent
    /// memory exhaustion attacks. Default is 10MB.
    pub max_response_size: u64,

    /// Number of retry attempts for failed requests
    ///
    /// Requests that fail due to transient network errors will be
    /// retried up to this many times before giving up.
    pub max_retries: u32,
}

impl Default for ServiceConfig {
    fn default() -> Self {
        Self {
            default_timeout: 10,
            max_concurrent_requests: 10,
            max_response_size: 10 * 1024 * 1024, // 10MB
            max_retries: 3,
        }
    }
}

/// Internal state of the Stremio service
///
/// This struct holds all mutable state for the service, including
/// the list of configured addons and service configuration.
#[derive(Debug, Clone, Default)]
pub struct ServiceState {
    /// List of configured addons
    pub addons: Vec<Addon>,

    /// Service configuration
    pub config: ServiceConfig,
}

/// Main Stremio service for addon management and content operations
///
/// The StremioService provides a unified API for managing Stremio addons and
/// fetching content from them. It uses `Arc<RwLock<>>` for thread-safe shared
/// state that can be cloned and used across threads.
///
/// # Thread Safety
///
/// The service uses `Arc<RwLock<ServiceState>>` which allows:
/// - Multiple concurrent readers
/// - Exclusive writer access
/// - Service instances can be cloned and shared across threads
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::StremioService;
///
/// let service = StremioService::new();
///
/// // Service can be cloned and shared across threads
/// let service_clone = service.clone();
/// ```
#[derive(Debug, Clone)]
pub struct StremioService {
    /// Shared state protected by RwLock for thread-safe access
    state: Arc<RwLock<ServiceState>>,
}

impl StremioService {
    /// Creates a new StremioService with default configuration
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::StremioService;
    ///
    /// let service = StremioService::new();
    /// ```
    pub fn new() -> Self {
        Self {
            state: Arc::new(RwLock::new(ServiceState::default())),
        }
    }

    /// Creates a new StremioService with custom configuration
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::{StremioService, ServiceConfig};
    ///
    /// let config = ServiceConfig {
    ///     default_timeout: 15,
    ///     max_concurrent_requests: 20,
    ///     ..Default::default()
    /// };
    ///
    /// let service = StremioService::with_config(config);
    /// ```
    pub fn with_config(config: ServiceConfig) -> Self {
        Self {
            state: Arc::new(RwLock::new(ServiceState {
                addons: Vec::new(),
                config,
            })),
        }
    }

    /// Gets the current number of configured addons
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::StremioService;
    ///
    /// let service = StremioService::new();
    /// assert_eq!(service.addon_count(), 0);
    /// ```
    pub fn addon_count(&self) -> usize {
        self.state
            .read()
            .expect("Failed to acquire read lock")
            .addons
            .len()
    }

    /// Gets a clone of all configured addons
    ///
    /// This returns a snapshot of the current addons. Changes to the
    /// returned vector do not affect the service's internal state.
    pub fn get_addons(&self) -> Vec<Addon> {
        self.state
            .read()
            .expect("Failed to acquire read lock")
            .addons
            .clone()
    }

    /// Adds an addon to the service
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::{StremioService, types::Addon};
    ///
    /// let service = StremioService::new();
    /// let addon = Addon::new(
    ///     "com.example.addon".to_string(),
    ///     "https://example.com/manifest.json".to_string(),
    ///     "Example Addon".to_string(),
    ///     "1.0.0".to_string(),
    /// );
    ///
    /// service.add_addon(addon);
    /// assert_eq!(service.addon_count(), 1);
    /// ```
    pub fn add_addon(&self, addon: Addon) {
        self.state
            .write()
            .expect("Failed to acquire write lock")
            .addons
            .push(addon);
    }

    /// Removes all addons from the service
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::StremioService;
    ///
    /// let service = StremioService::new();
    /// // ... add some addons ...
    /// service.clear_addons();
    /// assert_eq!(service.addon_count(), 0);
    /// ```
    pub fn clear_addons(&self) {
        self.state
            .write()
            .expect("Failed to acquire write lock")
            .addons
            .clear();
    }

    // ========================================================================
    // Public API Methods
    // ========================================================================

    /// Discovers an addon from a URL and adds it to the service.
    ///
    /// This method fetches the addon manifest from the provided URL, validates it,
    /// creates an Addon instance, and adds it to the service's addon list.
    ///
    /// # Arguments
    ///
    /// * `url` - The URL of the addon manifest (may or may not end with `manifest.json`)
    ///
    /// # Returns
    ///
    /// The discovered and added `Addon` instance
    ///
    /// # Errors
    ///
    /// Returns `NuvioError` if:
    /// - Network request fails
    /// - Manifest parsing fails
    /// - Manifest validation fails
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use nuvio_core::stremio_service::StremioService;
    ///
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// let service = StremioService::new();
    /// let addon = service.discover("https://example.com/manifest.json").await?;
    /// assert_eq!(service.addon_count(), 1);
    /// # Ok(())
    /// # }
    /// ```
    pub async fn discover(&self, url: &str) -> Result<Addon, crate::error::NuvioError> {
        use crate::stremio_service::addon::discover_addon;

        // Discover addon from URL
        let addon = discover_addon(url).await?;

        // Add to service
        self.add_addon(addon.clone());

        Ok(addon)
    }

    /// Fetches a catalog from a configured addon.
    ///
    /// This method retrieves a catalog of content items (movies, series, etc.) from
    /// a specific addon, with support for pagination.
    ///
    /// # Arguments
    ///
    /// * `addon_id` - ID of the addon to fetch catalog from
    /// * `content_type` - Content type (e.g., "movie", "series")
    /// * `catalog_id` - Catalog identifier (e.g., "top", "trending")
    /// * `page` - Page number (1-indexed) for pagination
    ///
    /// # Returns
    ///
    /// A vector of `Meta` objects representing catalog items
    ///
    /// # Errors
    ///
    /// Returns `NuvioError` if:
    /// - Addon is not found
    /// - Addon URL is missing
    /// - Network request fails
    /// - Response parsing fails
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use nuvio_core::stremio_service::StremioService;
    ///
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// let service = StremioService::new();
    /// // Assume addon is already added
    /// let metas = service.get_catalog("com.example.addon", "movie", "top", 1).await?;
    /// println!("Found {} items", metas.len());
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_catalog(
        &self,
        addon_id: &str,
        content_type: &str,
        catalog_id: &str,
        page: u32,
    ) -> Result<Vec<Meta>, crate::error::NuvioError> {
        use crate::stremio_service::catalog::{fetch_catalog, CatalogParams};
        use crate::stremio_service::types::Manifest;

        // Find addon by ID
        let addons = self.get_addons();
        let addon = addons.iter().find(|a| a.id == addon_id).ok_or_else(|| {
            crate::error::NuvioError::addon_not_found(format!("Addon not found: {}", addon_id))
        })?;

        // Get base URL from addon
        let base_url = addon
            .manifest_url
            .trim_end_matches("manifest.json")
            .trim_end_matches('/');

        // Create manifest for catalog fetching
        let mut manifest = Manifest::new(
            addon.id.clone(),
            addon.name.clone(),
            addon.version.clone(),
            format!("Addon: {}", addon.name),
        );
        manifest.url = Some(base_url.to_string());

        // Create catalog params
        let params =
            CatalogParams::for_page(content_type.to_string(), catalog_id.to_string(), page);

        // Create fetcher
        let service_config = self
            .state
            .read()
            .expect("Failed to read config")
            .config
            .clone();
        let fetcher_config = crate::stremio_service::fetcher::FetcherConfig {
            timeout_duration: std::time::Duration::from_secs(service_config.default_timeout),
            max_retries: service_config.max_retries,
            max_response_size: service_config.max_response_size,
        };
        let fetcher = crate::stremio_service::fetcher::Fetcher::with_config(fetcher_config)
            .map_err(|e| {
                crate::error::NuvioError::network_error(format!("Failed to create fetcher: {}", e))
            })?;

        // Fetch catalog
        let response = fetch_catalog(&fetcher, &manifest, &params).await?;

        Ok(response.metas)
    }

    /// Resolves streams for a content ID from all configured addons.
    ///
    /// This method fetches stream sources from all enabled addons in parallel,
    /// returning streams organized by addon with partial failure support.
    ///
    /// # Arguments
    ///
    /// * `content_type` - Content type (e.g., "movie", "series")
    /// * `content_id` - Content identifier (e.g., "tt1234567" for IMDb ID)
    ///
    /// # Returns
    ///
    /// A vector of streams from all successful addon responses, sorted by addon priority
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use nuvio_core::stremio_service::StremioService;
    ///
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// let service = StremioService::new();
    /// // Assume addons are configured
    /// let streams = service.resolve_streams("movie", "tt1234567").await;
    /// println!("Found {} streams", streams.len());
    /// # Ok(())
    /// # }
    /// ```
    pub async fn resolve_streams(
        &self,
        content_type: &str,
        content_id: &str,
    ) -> Vec<crate::stremio_service::types::StremioStream> {
        use crate::stremio_service::stream::aggregate_streams;

        // Get all addons
        let addons = self.get_addons();

        if addons.is_empty() {
            return Vec::new();
        }

        // Create fetcher with configured timeout
        let service_config = self
            .state
            .read()
            .expect("Failed to read config")
            .config
            .clone();
        let fetcher_config = crate::stremio_service::fetcher::FetcherConfig {
            timeout_duration: std::time::Duration::from_secs(service_config.default_timeout),
            max_retries: service_config.max_retries,
            max_response_size: service_config.max_response_size,
        };
        let fetcher = match crate::stremio_service::fetcher::Fetcher::with_config(fetcher_config) {
            Ok(f) => f,
            Err(_) => return Vec::new(),
        };

        // Aggregate streams from all addons
        aggregate_streams(&fetcher, &addons, content_type, content_id).await
    }

    /// Aggregates metadata for a content ID from all configured addons.
    ///
    /// This method fetches metadata from all enabled addons in parallel and merges
    /// the results using priority-based conflict resolution. Higher priority addon
    /// fields take precedence when conflicts occur.
    ///
    /// # Arguments
    ///
    /// * `content_type` - Content type (e.g., "movie", "series")
    /// * `content_id` - Content identifier (e.g., "tt1234567" for IMDb ID)
    ///
    /// # Returns
    ///
    /// Merged metadata object, or None if no addon returned metadata
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use nuvio_core::stremio_service::StremioService;
    ///
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// let service = StremioService::new();
    /// // Assume addons are configured
    /// if let Some(meta) = service.aggregate_meta("movie", "tt1234567").await {
    ///     println!("Found metadata: {}", meta.name);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn aggregate_meta(&self, content_type: &str, content_id: &str) -> Option<Meta> {
        use crate::stremio_service::meta::aggregate_meta;

        // Get all addons
        let addons = self.get_addons();

        if addons.is_empty() {
            return None;
        }

        // Create fetcher with configured timeout
        let service_config = self
            .state
            .read()
            .expect("Failed to read config")
            .config
            .clone();
        let fetcher_config = crate::stremio_service::fetcher::FetcherConfig {
            timeout_duration: std::time::Duration::from_secs(service_config.default_timeout),
            max_retries: service_config.max_retries,
            max_response_size: service_config.max_response_size,
        };
        let fetcher = match crate::stremio_service::fetcher::Fetcher::with_config(fetcher_config) {
            Ok(f) => f,
            Err(_) => return None,
        };

        // Aggregate metadata from all addons
        aggregate_meta(&fetcher, &addons, content_type, content_id).await
    }
}

impl Default for StremioService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_service_new() {
        let service = StremioService::new();
        assert_eq!(service.addon_count(), 0);
    }

    #[test]
    fn test_service_with_config() {
        let config = ServiceConfig {
            default_timeout: 20,
            max_concurrent_requests: 15,
            ..Default::default()
        };

        let service = StremioService::with_config(config.clone());
        assert_eq!(service.addon_count(), 0);

        // Verify config is stored correctly
        let state = service.state.read().expect("Failed to read state");
        assert_eq!(state.config.default_timeout, 20);
        assert_eq!(state.config.max_concurrent_requests, 15);
    }

    #[test]
    fn test_service_add_addon() {
        let service = StremioService::new();

        let addon = Addon::new(
            "com.example.test".to_string(),
            "https://example.com/manifest.json".to_string(),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        service.add_addon(addon.clone());
        assert_eq!(service.addon_count(), 1);

        let addons = service.get_addons();
        assert_eq!(addons.len(), 1);
        assert_eq!(addons[0].id, "com.example.test");
    }

    #[test]
    fn test_service_clear_addons() {
        let service = StremioService::new();

        let addon = Addon::new(
            "com.example.test".to_string(),
            "https://example.com/manifest.json".to_string(),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        service.add_addon(addon);
        assert_eq!(service.addon_count(), 1);

        service.clear_addons();
        assert_eq!(service.addon_count(), 0);
    }

    #[test]
    fn test_service_clone() {
        let service = StremioService::new();

        let addon = Addon::new(
            "com.example.test".to_string(),
            "https://example.com/manifest.json".to_string(),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        service.add_addon(addon);

        // Clone the service
        let service_clone = service.clone();

        // Both should see the same state
        assert_eq!(service.addon_count(), 1);
        assert_eq!(service_clone.addon_count(), 1);

        // Adding to one affects the other (shared state)
        let addon2 = Addon::new(
            "com.example.test2".to_string(),
            "https://example.com/manifest2.json".to_string(),
            "Test Addon 2".to_string(),
            "1.0.0".to_string(),
        );
        service_clone.add_addon(addon2);

        assert_eq!(service.addon_count(), 2);
        assert_eq!(service_clone.addon_count(), 2);
    }

    #[test]
    fn test_service_thread_safe() {
        let service = StremioService::new();
        let service_clone = service.clone();

        // Spawn a thread that adds addons
        let handle = thread::spawn(move || {
            for i in 0..10 {
                let addon = Addon::new(
                    format!("com.example.addon{}", i),
                    format!("https://example.com/manifest{}.json", i),
                    format!("Addon {}", i),
                    "1.0.0".to_string(),
                );
                service_clone.add_addon(addon);
            }
        });

        // Wait for thread to complete
        handle.join().expect("Thread panicked");

        // Verify all addons were added
        assert_eq!(service.addon_count(), 10);
    }

    #[test]
    fn test_service_concurrent_reads() {
        let service = StremioService::new();

        // Add some addons
        for i in 0..5 {
            let addon = Addon::new(
                format!("com.example.addon{}", i),
                format!("https://example.com/manifest{}.json", i),
                format!("Addon {}", i),
                "1.0.0".to_string(),
            );
            service.add_addon(addon);
        }

        // Spawn multiple reader threads
        let mut handles = vec![];
        for _ in 0..10 {
            let service_clone = service.clone();
            let handle = thread::spawn(move || {
                let count = service_clone.addon_count();
                assert_eq!(count, 5);
            });
            handles.push(handle);
        }

        // Wait for all threads
        for handle in handles {
            handle.join().expect("Thread panicked");
        }
    }

    #[test]
    fn test_service_get_addons_snapshot() {
        let service = StremioService::new();

        let addon = Addon::new(
            "com.example.test".to_string(),
            "https://example.com/manifest.json".to_string(),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        service.add_addon(addon.clone());

        // Get a snapshot
        let mut snapshot = service.get_addons();
        assert_eq!(snapshot.len(), 1);

        // Modify the snapshot
        snapshot.push(addon.clone());
        assert_eq!(snapshot.len(), 2);

        // Original service should be unchanged
        assert_eq!(service.addon_count(), 1);
    }

    // ========================================================================
    // Tests for Public API Methods
    // ========================================================================

    #[tokio::test]
    async fn test_api_discover() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        // Start mock server
        let mock_server = MockServer::start().await;

        // Mock manifest endpoint
        let manifest_json = r#"{
            "id": "com.test.addon",
            "name": "Test Addon",
            "version": "1.0.0",
            "description": "Test addon for API testing"
        }"#;

        Mock::given(method("GET"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(200).set_body_string(manifest_json))
            .mount(&mock_server)
            .await;

        // Test discover method
        let service = StremioService::new();
        let result = service.discover(&mock_server.uri()).await;

        assert!(result.is_ok(), "discover() should succeed");
        let addon = result.unwrap();
        assert_eq!(addon.id, "com.test.addon");
        assert_eq!(addon.name, "Test Addon");

        // Verify addon was added to service
        assert_eq!(service.addon_count(), 1);
        let addons = service.get_addons();
        assert_eq!(addons[0].id, "com.test.addon");
    }

    #[tokio::test]
    async fn test_api_get_catalog() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        // Start mock server
        let mock_server = MockServer::start().await;

        // Mock catalog endpoint
        let catalog_json = r#"{
            "metas": [
                {
                    "id": "tt1234567",
                    "content_type": "movie",
                    "name": "Test Movie 1"
                },
                {
                    "id": "tt2345678",
                    "content_type": "movie",
                    "name": "Test Movie 2"
                }
            ],
            "hasMore": false
        }"#;

        Mock::given(method("GET"))
            .and(path("/catalog/movie/top.json"))
            .respond_with(ResponseTemplate::new(200).set_body_string(catalog_json))
            .mount(&mock_server)
            .await;

        // Create service and add addon
        let service = StremioService::new();
        let addon = Addon::new(
            "com.test.addon".to_string(),
            format!("{}/manifest.json", mock_server.uri()),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );
        service.add_addon(addon);

        // Test get_catalog method
        let result = service
            .get_catalog("com.test.addon", "movie", "top", 1)
            .await;

        assert!(result.is_ok(), "get_catalog() should succeed");
        let metas = result.unwrap();
        assert_eq!(metas.len(), 2);
        assert_eq!(metas[0].id, "tt1234567");
        assert_eq!(metas[1].id, "tt2345678");
    }

    #[tokio::test]
    async fn test_api_get_catalog_addon_not_found() {
        let service = StremioService::new();

        let result = service
            .get_catalog("nonexistent.addon", "movie", "top", 1)
            .await;

        assert!(
            result.is_err(),
            "get_catalog() should fail for nonexistent addon"
        );
    }

    #[tokio::test]
    async fn test_api_resolve_streams() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        // Start two mock servers for two addons
        let mock_server1 = MockServer::start().await;
        let mock_server2 = MockServer::start().await;

        // Mock stream endpoint for addon 1
        Mock::given(method("GET"))
            .and(path("/stream/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "streams": [
                    {
                        "url": "https://addon1.com/video.mp4",
                        "name": "Addon1 HD"
                    }
                ]
            })))
            .mount(&mock_server1)
            .await;

        // Mock stream endpoint for addon 2
        Mock::given(method("GET"))
            .and(path("/stream/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "streams": [
                    {
                        "url": "https://addon2.com/video.mp4",
                        "name": "Addon2 HD"
                    }
                ]
            })))
            .mount(&mock_server2)
            .await;

        // Create service and add addons
        let service = StremioService::new();

        let mut addon1 = Addon::new(
            "addon1".to_string(),
            format!("{}/manifest.json", mock_server1.uri()),
            "Addon 1".to_string(),
            "1.0.0".to_string(),
        );
        addon1.priority = 10; // Higher priority

        let mut addon2 = Addon::new(
            "addon2".to_string(),
            format!("{}/manifest.json", mock_server2.uri()),
            "Addon 2".to_string(),
            "1.0.0".to_string(),
        );
        addon2.priority = 5; // Lower priority

        service.add_addon(addon1);
        service.add_addon(addon2);

        // Test resolve_streams method
        let streams = service.resolve_streams("movie", "tt1234567").await;

        assert_eq!(streams.len(), 2, "Should get streams from both addons");

        // Higher priority addon should come first
        assert_eq!(streams[0].addon_id, Some("addon1".to_string()));
        assert_eq!(streams[1].addon_id, Some("addon2".to_string()));
    }

    #[tokio::test]
    async fn test_api_resolve_streams_empty_addons() {
        let service = StremioService::new();
        let streams = service.resolve_streams("movie", "tt1234567").await;
        assert_eq!(streams.len(), 0, "Should return empty vec when no addons");
    }

    #[tokio::test]
    async fn test_api_aggregate_meta() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        // Start two mock servers for two addons
        let mock_server1 = MockServer::start().await;
        let mock_server2 = MockServer::start().await;

        // Mock meta endpoint for addon 1 (higher priority)
        Mock::given(method("GET"))
            .and(path("/meta/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "meta": {
                    "id": "tt1234567",
                    "content_type": "movie",
                    "name": "Test Movie",
                    "poster": "https://addon1.com/poster.jpg",
                    "year": 2024
                }
            })))
            .mount(&mock_server1)
            .await;

        // Mock meta endpoint for addon 2 (lower priority)
        Mock::given(method("GET"))
            .and(path("/meta/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "meta": {
                    "id": "tt1234567",
                    "content_type": "movie",
                    "name": "Test Movie",
                    "background": "https://addon2.com/bg.jpg",
                    "description": "A great movie"
                }
            })))
            .mount(&mock_server2)
            .await;

        // Create service and add addons
        let service = StremioService::new();

        let mut addon1 = Addon::new(
            "addon1".to_string(),
            format!("{}/manifest.json", mock_server1.uri()),
            "Addon 1".to_string(),
            "1.0.0".to_string(),
        );
        addon1.priority = 10; // Higher priority

        let mut addon2 = Addon::new(
            "addon2".to_string(),
            format!("{}/manifest.json", mock_server2.uri()),
            "Addon 2".to_string(),
            "1.0.0".to_string(),
        );
        addon2.priority = 5; // Lower priority

        service.add_addon(addon1);
        service.add_addon(addon2);

        // Test aggregate_meta method
        let meta = service.aggregate_meta("movie", "tt1234567").await;

        assert!(meta.is_some(), "Should get merged metadata");
        let meta = meta.unwrap();

        assert_eq!(meta.id, "tt1234567");
        assert_eq!(meta.name, "Test Movie");

        // Higher priority poster should be used
        assert_eq!(
            meta.poster,
            Some("https://addon1.com/poster.jpg".to_string())
        );

        // Background from lower priority addon should be merged (no conflict)
        assert_eq!(
            meta.background,
            Some("https://addon2.com/bg.jpg".to_string())
        );

        // Description from lower priority addon should be merged (no conflict)
        assert_eq!(meta.description, Some("A great movie".to_string()));

        assert_eq!(meta.year, Some(2024));
    }

    #[tokio::test]
    async fn test_api_aggregate_meta_empty_addons() {
        let service = StremioService::new();
        let meta = service.aggregate_meta("movie", "tt1234567").await;
        assert!(meta.is_none(), "Should return None when no addons");
    }
}
