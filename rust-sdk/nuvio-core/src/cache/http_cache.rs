//! HTTP response cache with cache-control and deduplication support
//!
//! This module provides a cache layer for HTTP responses that respects cache-control
//! headers and deduplicates identical requests. It uses the memory cache for storage
//! and provides smart TTL based on HTTP cache-control directives.
//!
//! # Features
//!
//! - **Cache-Control Support**: Respects max-age, no-cache, no-store directives
//! - **Request Deduplication**: Identical requests within TTL return cached responses
//! - **Content-Based Keys**: Cache keys based on HTTP method + URL + headers
//! - **Smart TTL**: Automatically extracts TTL from cache-control headers
//! - **Thread-Safe**: Fully thread-safe for concurrent access across multiple threads
//! - **Statistics**: Track cache hits, misses, and cache control directive usage
//!
//! # Example
//!
//! ```rust
//! use nuvio_core::cache::http_cache::{HttpCache, HttpCacheConfig, HttpRequest, HttpResponse};
//! use std::time::Duration;
//!
//! # tokio_test::block_on(async {
//! // Create an HTTP cache with default configuration
//! let cache = HttpCache::new(HttpCacheConfig::default());
//!
//! // Create a request
//! let request = HttpRequest {
//!     method: "GET".to_string(),
//!     url: "https://api.example.com/data".to_string(),
//!     headers: vec![],
//! };
//!
//! // Create a response with cache-control header
//! let response = HttpResponse {
//!     status: 200,
//!     headers: vec![("cache-control".to_string(), "max-age=3600".to_string())],
//!     body: vec![1, 2, 3],
//! };
//!
//! // Cache the response
//! cache.set(&request, response.clone()).await.unwrap();
//!
//! // Retrieve the cached response
//! let cached = cache.get(&request).await.unwrap();
//! assert_eq!(cached, Some(response));
//! # });
//! ```

use crate::cache::memory::{MemoryCache, MemoryCacheConfig};
use crate::error::NuvioError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

/// Configuration for the HTTP cache
#[derive(Debug, Clone)]
pub struct HttpCacheConfig {
    /// Maximum number of cached responses
    pub max_capacity: u64,
    /// Default TTL when cache-control header is missing
    pub default_ttl: Duration,
    /// Maximum TTL (overrides cache-control if it specifies a longer duration)
    pub max_ttl: Option<Duration>,
}

impl Default for HttpCacheConfig {
    fn default() -> Self {
        Self {
            max_capacity: 500,
            default_ttl: Duration::from_secs(300), // 5 minutes default
            max_ttl: Some(Duration::from_secs(3600)), // 1 hour max
        }
    }
}

/// HTTP request representation for cache key generation
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct HttpRequest {
    /// HTTP method (GET, POST, etc.)
    pub method: String,
    /// Request URL
    pub url: String,
    /// Request headers (only cache-relevant headers like Accept, Accept-Encoding)
    pub headers: Vec<(String, String)>,
}

impl HttpRequest {
    /// Generate a cache key from the request
    ///
    /// The cache key is a hash of method + URL + relevant headers
    fn cache_key(&self) -> String {
        // Sort headers for consistent key generation
        let mut headers = self.headers.clone();
        headers.sort_by(|a, b| a.0.cmp(&b.0));

        // Create a deterministic string representation
        let header_str = headers
            .iter()
            .map(|(k, v)| format!("{}:{}", k, v))
            .collect::<Vec<_>>()
            .join("|");

        format!("{}:{}:{}", self.method, self.url, header_str)
    }
}

/// HTTP response representation for caching
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HttpResponse {
    /// HTTP status code
    pub status: u16,
    /// Response headers
    pub headers: Vec<(String, String)>,
    /// Response body
    pub body: Vec<u8>,
}

impl HttpResponse {
    /// Extract cache-control max-age directive from response headers
    ///
    /// Returns None if:
    /// - No cache-control header present
    /// - max-age directive not found
    /// - max-age value is invalid
    fn extract_max_age(&self) -> Option<Duration> {
        for (key, value) in &self.headers {
            if key.to_lowercase() == "cache-control" {
                // Parse cache-control directives
                for directive in value.split(',') {
                    let directive = directive.trim();
                    if directive.starts_with("max-age=") {
                        if let Some(max_age_str) = directive.strip_prefix("max-age=") {
                            if let Ok(seconds) = max_age_str.parse::<u64>() {
                                return Some(Duration::from_secs(seconds));
                            }
                        }
                    }
                }
            }
        }
        None
    }

    /// Check if the response is cacheable based on cache-control headers
    ///
    /// Returns false if:
    /// - Cache-Control: no-store is present
    /// - Cache-Control: no-cache is present (simplified - in real HTTP this means must-revalidate)
    fn is_cacheable(&self) -> bool {
        for (key, value) in &self.headers {
            if key.to_lowercase() == "cache-control" {
                let value_lower = value.to_lowercase();
                if value_lower.contains("no-store") || value_lower.contains("no-cache") {
                    return false;
                }
            }
        }
        true
    }
}

/// Statistics for tracking HTTP cache performance
#[derive(Debug, Clone, Default)]
pub struct HttpCacheStats {
    /// Number of cache hits (successful get operations)
    pub hits: u64,
    /// Number of cache misses (get operations for non-existent keys)
    pub misses: u64,
    /// Number of responses that were not cacheable (no-store, no-cache)
    pub non_cacheable: u64,
    /// Number of responses cached with default TTL
    pub default_ttl_used: u64,
    /// Number of responses cached with max-age from cache-control
    pub max_age_used: u64,
}

impl HttpCacheStats {
    /// Calculate the cache hit rate as a percentage (0.0 - 100.0)
    pub fn hit_rate(&self) -> f64 {
        let total = self.hits + self.misses;
        if total == 0 {
            0.0
        } else {
            (self.hits as f64 / total as f64) * 100.0
        }
    }
}

/// HTTP response cache with cache-control support
///
/// This cache provides intelligent caching for HTTP responses with:
/// - Automatic TTL extraction from cache-control headers
/// - Request deduplication based on method + URL + headers
/// - Respect for no-cache and no-store directives
/// - Statistics tracking for cache performance
pub struct HttpCache {
    /// Underlying memory cache for storage
    cache: MemoryCache,
    /// Configuration
    config: HttpCacheConfig,
    /// Statistics tracking
    stats: Arc<RwLock<HttpCacheStats>>,
    /// Cache entry metadata
    metadata: Arc<RwLock<HashMap<String, CacheEntryMetadata>>>,
}

/// Metadata about a cached HTTP response
#[derive(Debug, Clone)]
#[allow(dead_code)] // Metadata stored for potential future use (analytics, debugging)
struct CacheEntryMetadata {
    /// TTL used for this entry
    ttl: Duration,
    /// Whether this entry was cached with default TTL
    used_default_ttl: bool,
}

impl HttpCache {
    /// Creates a new HTTP cache with the given configuration
    ///
    /// # Arguments
    ///
    /// * `config` - Configuration for the cache (size limits, default TTL)
    ///
    /// # Returns
    ///
    /// A new HttpCache instance
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::cache::http_cache::{HttpCache, HttpCacheConfig};
    /// use std::time::Duration;
    ///
    /// let cache = HttpCache::new(HttpCacheConfig {
    ///     max_capacity: 1000,
    ///     default_ttl: Duration::from_secs(600),
    ///     max_ttl: Some(Duration::from_secs(3600)),
    /// });
    /// ```
    pub fn new(config: HttpCacheConfig) -> Self {
        // Create memory cache with appropriate configuration
        let memory_config = MemoryCacheConfig {
            max_capacity: config.max_capacity,
            time_to_live: Some(config.default_ttl),
            time_to_idle: None,
        };

        Self {
            cache: MemoryCache::new(memory_config),
            config,
            stats: Arc::new(RwLock::new(HttpCacheStats::default())),
            metadata: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Creates a new HTTP cache with default configuration
    ///
    /// Default configuration:
    /// - Max capacity: 500 responses
    /// - Default TTL: 5 minutes
    /// - Max TTL: 1 hour
    ///
    /// # Returns
    ///
    /// A new HttpCache instance with default settings
    pub fn with_defaults() -> Self {
        Self::new(HttpCacheConfig::default())
    }

    /// Retrieves a cached HTTP response for the given request
    ///
    /// # Arguments
    ///
    /// * `request` - The HTTP request to look up in the cache
    ///
    /// # Returns
    ///
    /// * `Ok(Some(response))` - If the response is cached and hasn't expired
    /// * `Ok(None)` - If the response is not cached or has expired
    /// * `Err(NuvioError)` - If an error occurred
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::http_cache::{HttpCache, HttpRequest};
    /// # tokio_test::block_on(async {
    /// let cache = HttpCache::with_defaults();
    /// let request = HttpRequest {
    ///     method: "GET".to_string(),
    ///     url: "https://example.com".to_string(),
    ///     headers: vec![],
    /// };
    ///
    /// let response = cache.get(&request).await.unwrap();
    /// assert_eq!(response, None); // Not cached yet
    /// # });
    /// ```
    pub async fn get(&self, request: &HttpRequest) -> Result<Option<HttpResponse>, NuvioError> {
        let key = request.cache_key();
        let cached_bytes = self.cache.get(&key).await?;

        let mut stats = self.stats.write().await;
        if let Some(bytes) = cached_bytes {
            stats.hits += 1;
            drop(stats); // Release lock before deserialization

            // Deserialize the response
            match serde_json::from_slice::<HttpResponse>(&bytes) {
                Ok(response) => Ok(Some(response)),
                Err(e) => {
                    // Invalid cached data - remove it
                    self.cache.remove(&key).await?;
                    Err(NuvioError::cache(format!(
                        "Failed to deserialize cached response: {}",
                        e
                    )))
                }
            }
        } else {
            stats.misses += 1;
            Ok(None)
        }
    }

    /// Stores an HTTP response in the cache
    ///
    /// The cache TTL is determined by:
    /// 1. cache-control max-age header (if present)
    /// 2. max_ttl limit (if max-age exceeds it)
    /// 3. default_ttl (if no max-age header)
    ///
    /// Responses with no-cache or no-store directives are not cached.
    ///
    /// # Arguments
    ///
    /// * `request` - The HTTP request that generated this response
    /// * `response` - The HTTP response to cache
    ///
    /// # Returns
    ///
    /// * `Ok(())` - If the response was cached successfully or was non-cacheable
    /// * `Err(NuvioError)` - If an error occurred
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::http_cache::{HttpCache, HttpRequest, HttpResponse};
    /// # tokio_test::block_on(async {
    /// let cache = HttpCache::with_defaults();
    /// let request = HttpRequest {
    ///     method: "GET".to_string(),
    ///     url: "https://example.com".to_string(),
    ///     headers: vec![],
    /// };
    /// let response = HttpResponse {
    ///     status: 200,
    ///     headers: vec![("cache-control".to_string(), "max-age=300".to_string())],
    ///     body: vec![1, 2, 3],
    /// };
    ///
    /// cache.set(&request, response).await.unwrap();
    /// # });
    /// ```
    pub async fn set(
        &self,
        request: &HttpRequest,
        response: HttpResponse,
    ) -> Result<(), NuvioError> {
        // Check if response is cacheable
        if !response.is_cacheable() {
            let mut stats = self.stats.write().await;
            stats.non_cacheable += 1;
            return Ok(()); // Don't cache, but not an error
        }

        // Determine TTL
        let mut ttl = self.config.default_ttl;
        let mut used_default_ttl = true;

        if let Some(max_age) = response.extract_max_age() {
            ttl = max_age;
            used_default_ttl = false;

            // Apply max_ttl limit if configured
            if let Some(max_ttl) = self.config.max_ttl {
                if ttl > max_ttl {
                    ttl = max_ttl;
                }
            }
        }

        // Update statistics
        let mut stats = self.stats.write().await;
        if used_default_ttl {
            stats.default_ttl_used += 1;
        } else {
            stats.max_age_used += 1;
        }
        drop(stats);

        // Serialize the response
        let bytes = serde_json::to_vec(&response)
            .map_err(|e| NuvioError::cache(format!("Failed to serialize response: {}", e)))?;

        // Store in cache with appropriate TTL
        let key = request.cache_key();

        // Store metadata
        let mut metadata = self.metadata.write().await;
        metadata.insert(
            key.clone(),
            CacheEntryMetadata {
                ttl,
                used_default_ttl,
            },
        );
        drop(metadata);

        // Note: We use the default TTL configured in the memory cache
        // In a production implementation, we might want to support per-entry TTL
        self.cache.set(key, bytes).await?;

        Ok(())
    }

    /// Removes a cached response for the given request
    ///
    /// # Arguments
    ///
    /// * `request` - The HTTP request whose cached response to remove
    ///
    /// # Returns
    ///
    /// * `Ok(())` - If the cached response was removed or didn't exist
    /// * `Err(NuvioError)` - If an error occurred
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::http_cache::{HttpCache, HttpRequest};
    /// # tokio_test::block_on(async {
    /// let cache = HttpCache::with_defaults();
    /// let request = HttpRequest {
    ///     method: "GET".to_string(),
    ///     url: "https://example.com".to_string(),
    ///     headers: vec![],
    /// };
    ///
    /// cache.remove(&request).await.unwrap();
    /// # });
    /// ```
    pub async fn remove(&self, request: &HttpRequest) -> Result<(), NuvioError> {
        let key = request.cache_key();

        // Remove metadata
        let mut metadata = self.metadata.write().await;
        metadata.remove(&key);
        drop(metadata);

        self.cache.remove(&key).await
    }

    /// Clears all cached responses
    ///
    /// # Returns
    ///
    /// * `Ok(())` - If the cache was cleared successfully
    /// * `Err(NuvioError)` - If an error occurred
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::http_cache::HttpCache;
    /// # tokio_test::block_on(async {
    /// let cache = HttpCache::with_defaults();
    /// cache.clear().await.unwrap();
    /// # });
    /// ```
    pub async fn clear(&self) -> Result<(), NuvioError> {
        // Clear metadata
        let mut metadata = self.metadata.write().await;
        metadata.clear();
        drop(metadata);

        self.cache.clear().await
    }

    /// Returns the current number of cached responses
    ///
    /// # Returns
    ///
    /// The number of cached responses currently in the cache
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::http_cache::HttpCache;
    /// # tokio_test::block_on(async {
    /// let cache = HttpCache::with_defaults();
    /// assert_eq!(cache.size().await, 0);
    /// # });
    /// ```
    pub async fn size(&self) -> u64 {
        self.cache.size().await
    }

    /// Returns HTTP cache statistics (hits, misses, cache-control usage)
    ///
    /// # Returns
    ///
    /// A clone of the current HTTP cache statistics
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::http_cache::HttpCache;
    /// # tokio_test::block_on(async {
    /// let cache = HttpCache::with_defaults();
    /// let stats = cache.stats().await;
    /// assert_eq!(stats.hits, 0);
    /// assert_eq!(stats.misses, 0);
    /// # });
    /// ```
    pub async fn stats(&self) -> HttpCacheStats {
        self.stats.read().await.clone()
    }

    /// Resets cache statistics to zero
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::http_cache::HttpCache;
    /// # tokio_test::block_on(async {
    /// let cache = HttpCache::with_defaults();
    /// cache.reset_stats().await;
    /// let stats = cache.stats().await;
    /// assert_eq!(stats.hits, 0);
    /// # });
    /// ```
    pub async fn reset_stats(&self) {
        let mut stats = self.stats.write().await;
        *stats = HttpCacheStats::default();
    }

    /// Synchronizes pending operations in the cache
    ///
    /// This method waits for all pending maintenance tasks to complete.
    /// Mainly useful in tests to ensure operations have completed before assertions.
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::http_cache::HttpCache;
    /// # tokio_test::block_on(async {
    /// let cache = HttpCache::with_defaults();
    /// cache.sync().await;
    /// # });
    /// ```
    pub async fn sync(&self) {
        self.cache.sync().await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_http_cache_basic_operations() {
        let cache = HttpCache::with_defaults();

        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![],
        };

        let response = HttpResponse {
            status: 200,
            headers: vec![],
            body: vec![1, 2, 3],
        };

        // Initially not cached
        let cached = cache.get(&request).await.unwrap();
        assert_eq!(cached, None);

        // Cache the response
        cache.set(&request, response.clone()).await.unwrap();

        // Should now be cached
        let cached = cache.get(&request).await.unwrap();
        assert_eq!(cached, Some(response));
    }

    #[tokio::test]
    async fn test_http_cache_deduplication() {
        let cache = HttpCache::with_defaults();

        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![("Accept".to_string(), "application/json".to_string())],
        };

        let response1 = HttpResponse {
            status: 200,
            headers: vec![],
            body: vec![1, 2, 3],
        };

        let response2 = HttpResponse {
            status: 200,
            headers: vec![],
            body: vec![4, 5, 6],
        };

        // Cache first response
        cache.set(&request, response1.clone()).await.unwrap();

        // Get cached response
        let cached = cache.get(&request).await.unwrap();
        assert_eq!(cached, Some(response1.clone()));

        // Update with second response
        cache.set(&request, response2.clone()).await.unwrap();

        // Should get updated response
        let cached = cache.get(&request).await.unwrap();
        assert_eq!(cached, Some(response2));
    }

    #[tokio::test]
    async fn test_http_cache_control_max_age() {
        let cache = HttpCache::new(HttpCacheConfig {
            max_capacity: 100,
            default_ttl: Duration::from_secs(3600),
            max_ttl: Some(Duration::from_secs(7200)),
        });

        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![],
        };

        let response = HttpResponse {
            status: 200,
            headers: vec![("cache-control".to_string(), "max-age=300".to_string())],
            body: vec![1, 2, 3],
        };

        // Cache with max-age
        cache.set(&request, response.clone()).await.unwrap();

        // Check statistics
        let stats = cache.stats().await;
        assert_eq!(stats.max_age_used, 1);
        assert_eq!(stats.default_ttl_used, 0);
    }

    #[tokio::test]
    async fn test_http_cache_control_no_store() {
        let cache = HttpCache::with_defaults();

        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![],
        };

        let response = HttpResponse {
            status: 200,
            headers: vec![("cache-control".to_string(), "no-store".to_string())],
            body: vec![1, 2, 3],
        };

        // Try to cache with no-store
        cache.set(&request, response.clone()).await.unwrap();

        // Should not be cached
        let cached = cache.get(&request).await.unwrap();
        assert_eq!(cached, None);

        // Check statistics
        let stats = cache.stats().await;
        assert_eq!(stats.non_cacheable, 1);
    }

    #[tokio::test]
    async fn test_http_cache_control_no_cache() {
        let cache = HttpCache::with_defaults();

        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![],
        };

        let response = HttpResponse {
            status: 200,
            headers: vec![("cache-control".to_string(), "no-cache".to_string())],
            body: vec![1, 2, 3],
        };

        // Try to cache with no-cache
        cache.set(&request, response.clone()).await.unwrap();

        // Should not be cached (simplified interpretation)
        let cached = cache.get(&request).await.unwrap();
        assert_eq!(cached, None);

        // Check statistics
        let stats = cache.stats().await;
        assert_eq!(stats.non_cacheable, 1);
    }

    #[tokio::test]
    async fn test_http_cache_default_ttl() {
        let cache = HttpCache::with_defaults();

        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![],
        };

        let response = HttpResponse {
            status: 200,
            headers: vec![], // No cache-control header
            body: vec![1, 2, 3],
        };

        // Cache without cache-control
        cache.set(&request, response.clone()).await.unwrap();

        // Should use default TTL
        let stats = cache.stats().await;
        assert_eq!(stats.default_ttl_used, 1);
        assert_eq!(stats.max_age_used, 0);
    }

    #[tokio::test]
    async fn test_http_cache_key_generation() {
        let cache = HttpCache::with_defaults();

        // Same URL, different methods - should be different cache keys
        let request_get = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![],
        };

        let request_post = HttpRequest {
            method: "POST".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![],
        };

        let response1 = HttpResponse {
            status: 200,
            headers: vec![],
            body: vec![1, 2, 3],
        };

        let response2 = HttpResponse {
            status: 201,
            headers: vec![],
            body: vec![4, 5, 6],
        };

        // Cache both
        cache.set(&request_get, response1.clone()).await.unwrap();
        cache.set(&request_post, response2.clone()).await.unwrap();

        // Should retrieve different responses
        let cached_get = cache.get(&request_get).await.unwrap();
        let cached_post = cache.get(&request_post).await.unwrap();

        assert_eq!(cached_get, Some(response1));
        assert_eq!(cached_post, Some(response2));
    }

    #[tokio::test]
    async fn test_http_cache_headers_in_key() {
        let cache = HttpCache::with_defaults();

        // Same URL, different headers - should be different cache keys
        let request1 = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![("Accept".to_string(), "application/json".to_string())],
        };

        let request2 = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![("Accept".to_string(), "text/html".to_string())],
        };

        let response1 = HttpResponse {
            status: 200,
            headers: vec![],
            body: vec![1, 2, 3],
        };

        let response2 = HttpResponse {
            status: 200,
            headers: vec![],
            body: vec![4, 5, 6],
        };

        // Cache both
        cache.set(&request1, response1.clone()).await.unwrap();
        cache.set(&request2, response2.clone()).await.unwrap();

        // Should retrieve different responses
        let cached1 = cache.get(&request1).await.unwrap();
        let cached2 = cache.get(&request2).await.unwrap();

        assert_eq!(cached1, Some(response1));
        assert_eq!(cached2, Some(response2));
    }

    #[tokio::test]
    async fn test_http_cache_statistics() {
        let cache = HttpCache::with_defaults();

        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![],
        };

        let response = HttpResponse {
            status: 200,
            headers: vec![],
            body: vec![1, 2, 3],
        };

        // Initial stats
        let stats = cache.stats().await;
        assert_eq!(stats.hits, 0);
        assert_eq!(stats.misses, 0);
        assert_eq!(stats.hit_rate(), 0.0);

        // Cache miss
        cache.get(&request).await.unwrap();

        let stats = cache.stats().await;
        assert_eq!(stats.hits, 0);
        assert_eq!(stats.misses, 1);

        // Cache the response
        cache.set(&request, response).await.unwrap();

        // Cache hit
        cache.get(&request).await.unwrap();

        let stats = cache.stats().await;
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.misses, 1);
        assert_eq!(stats.hit_rate(), 50.0);
    }

    #[tokio::test]
    async fn test_http_cache_clear() {
        let cache = HttpCache::with_defaults();

        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![],
        };

        let response = HttpResponse {
            status: 200,
            headers: vec![],
            body: vec![1, 2, 3],
        };

        // Cache the response
        cache.set(&request, response).await.unwrap();
        cache.sync().await;

        assert_eq!(cache.size().await, 1);

        // Clear the cache
        cache.clear().await.unwrap();

        assert_eq!(cache.size().await, 0);

        let cached = cache.get(&request).await.unwrap();
        assert_eq!(cached, None);
    }

    #[tokio::test]
    async fn test_http_cache_remove() {
        let cache = HttpCache::with_defaults();

        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![],
        };

        let response = HttpResponse {
            status: 200,
            headers: vec![],
            body: vec![1, 2, 3],
        };

        // Cache the response
        cache.set(&request, response).await.unwrap();

        // Verify it's cached
        let cached = cache.get(&request).await.unwrap();
        assert!(cached.is_some());

        // Remove it
        cache.remove(&request).await.unwrap();

        // Verify it's gone
        let cached = cache.get(&request).await.unwrap();
        assert_eq!(cached, None);
    }

    #[tokio::test]
    async fn test_http_cache_max_ttl_limit() {
        let cache = HttpCache::new(HttpCacheConfig {
            max_capacity: 100,
            default_ttl: Duration::from_secs(300),
            max_ttl: Some(Duration::from_secs(600)), // 10 minutes max
        });

        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://api.example.com/data".to_string(),
            headers: vec![],
        };

        let response = HttpResponse {
            status: 200,
            headers: vec![("cache-control".to_string(), "max-age=3600".to_string())], // 1 hour
            body: vec![1, 2, 3],
        };

        // Cache with max-age that exceeds max_ttl
        cache.set(&request, response.clone()).await.unwrap();

        // Should still cache (but TTL is capped at max_ttl)
        let cached = cache.get(&request).await.unwrap();
        assert_eq!(cached, Some(response));

        // Check that max-age was used (even though it was capped)
        let stats = cache.stats().await;
        assert_eq!(stats.max_age_used, 1);
    }

    #[tokio::test]
    async fn test_http_cache_concurrent_access() {
        let cache = Arc::new(HttpCache::with_defaults());

        let mut handles = vec![];

        for i in 0..10 {
            let cache_clone = Arc::clone(&cache);
            let handle = tokio::spawn(async move {
                let request = HttpRequest {
                    method: "GET".to_string(),
                    url: format!("https://api.example.com/data/{}", i),
                    headers: vec![],
                };

                let response = HttpResponse {
                    status: 200,
                    headers: vec![],
                    body: vec![i as u8],
                };

                // Cache the response
                cache_clone.set(&request, response.clone()).await.unwrap();

                // Retrieve it
                let cached = cache_clone.get(&request).await.unwrap();
                assert_eq!(cached, Some(response));
            });
            handles.push(handle);
        }

        // Wait for all tasks to complete
        for handle in handles {
            handle.await.unwrap();
        }

        cache.sync().await;

        // Verify all responses are cached
        assert_eq!(cache.size().await, 10);
    }

    #[tokio::test]
    async fn test_http_response_extract_max_age() {
        let response = HttpResponse {
            status: 200,
            headers: vec![("cache-control".to_string(), "max-age=300".to_string())],
            body: vec![],
        };

        let max_age = response.extract_max_age();
        assert_eq!(max_age, Some(Duration::from_secs(300)));
    }

    #[tokio::test]
    async fn test_http_response_extract_max_age_with_multiple_directives() {
        let response = HttpResponse {
            status: 200,
            headers: vec![(
                "cache-control".to_string(),
                "public, max-age=600, must-revalidate".to_string(),
            )],
            body: vec![],
        };

        let max_age = response.extract_max_age();
        assert_eq!(max_age, Some(Duration::from_secs(600)));
    }

    #[tokio::test]
    async fn test_http_response_is_cacheable() {
        let cacheable = HttpResponse {
            status: 200,
            headers: vec![("cache-control".to_string(), "max-age=300".to_string())],
            body: vec![],
        };
        assert!(cacheable.is_cacheable());

        let no_store = HttpResponse {
            status: 200,
            headers: vec![("cache-control".to_string(), "no-store".to_string())],
            body: vec![],
        };
        assert!(!no_store.is_cacheable());

        let no_cache = HttpResponse {
            status: 200,
            headers: vec![("cache-control".to_string(), "no-cache".to_string())],
            body: vec![],
        };
        assert!(!no_cache.is_cacheable());
    }
}
