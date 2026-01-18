//! FFI bindings for cache management
//!
//! This module provides UniFFI-compatible exports for the cache system,
//! allowing native access from Kotlin and Swift platforms.

use super::{CacheManager, CacheStats, DiskCacheConfig, HttpCacheConfig, MemoryCacheConfig};
use crate::error::NuvioResult;
use std::sync::Arc;
use std::time::Duration;

/// Configuration for initializing the cache manager
#[derive(uniffi::Record, Debug, Clone)]
pub struct CacheConfiguration {
    /// Maximum number of items in memory cache
    pub memory_max_items: u64,
    /// TTL for memory cache in seconds
    pub memory_ttl_seconds: u64,
    /// Maximum disk cache size in bytes
    pub disk_max_bytes: u64,
    /// Path to disk cache directory
    pub disk_path: String,
}

impl Default for CacheConfiguration {
    fn default() -> Self {
        Self {
            memory_max_items: 1000,
            memory_ttl_seconds: 3600, // 1 hour
            disk_max_bytes: 100 * 1024 * 1024, // 100MB
            disk_path: "./cache/disk".to_string(),
        }
    }
}

/// UniFFI-exported cache manager
///
/// This wraps the internal CacheManager and provides blocking FFI methods
/// that can be called from Kotlin and Swift.
#[derive(uniffi::Object)]
pub struct NuvioCacheManager {
    inner: Arc<CacheManager>,
}

#[uniffi::export]
impl NuvioCacheManager {
    /// Creates a new cache manager with the given configuration
    #[uniffi::constructor]
    pub fn new(config: CacheConfiguration) -> NuvioResult<Arc<Self>> {
        let memory_config = MemoryCacheConfig {
            max_capacity: config.memory_max_items,
            time_to_live: Some(Duration::from_secs(config.memory_ttl_seconds)),
            time_to_idle: None,
        };

        let disk_config = DiskCacheConfig {
            path: std::path::PathBuf::from(config.disk_path),
            max_size_bytes: config.disk_max_bytes,
        };

        let http_config = HttpCacheConfig::default();

        let rt = crate::http::get_runtime();
        let inner = rt.block_on(async { CacheManager::new(memory_config, disk_config, http_config).await })?;

        Ok(Arc::new(Self {
            inner: Arc::new(inner),
        }))
    }

    /// Creates a new cache manager with default configuration
    #[uniffi::constructor]
    pub fn with_defaults() -> NuvioResult<Arc<Self>> {
        Self::new(CacheConfiguration::default())
    }

    /// Stores a value in the cache
    ///
    /// # Arguments
    ///
    /// * `key` - The cache key
    /// * `value` - The value to store (raw bytes)
    pub fn set(&self, key: String, value: Vec<u8>) -> NuvioResult<()> {
        let rt = crate::http::get_runtime();
        rt.block_on(async { self.inner.set(key, value).await })
    }

    /// Retrieves a value from the cache
    ///
    /// # Arguments
    ///
    /// * `key` - The cache key to retrieve
    ///
    /// # Returns
    ///
    /// The cached value if it exists, or None if not found or expired
    pub fn get(&self, key: String) -> NuvioResult<Option<Vec<u8>>> {
        let rt = crate::http::get_runtime();
        rt.block_on(async { self.inner.get(&key).await })
    }

    /// Removes a value from the cache
    ///
    /// # Arguments
    ///
    /// * `key` - The cache key to remove
    pub fn remove(&self, key: String) -> NuvioResult<()> {
        let rt = crate::http::get_runtime();
        rt.block_on(async { self.inner.remove(&key).await })
    }

    /// Clears all entries from the cache
    pub fn clear(&self) -> NuvioResult<()> {
        let rt = crate::http::get_runtime();
        rt.block_on(async { self.inner.clear().await })
    }

    /// Returns cache statistics
    pub fn stats(&self) -> CacheStats {
        let rt = crate::http::get_runtime();
        rt.block_on(async { self.inner.stats().await })
    }
}

/// Convenience functions for common cache operations

/// Creates a cache key for metadata caching
///
/// # Arguments
///
/// * `content_type` - Type of content (e.g., "movie", "series")
/// * `content_id` - Unique identifier for the content
#[uniffi::export]
pub fn cache_key_for_metadata(content_type: String, content_id: String) -> String {
    format!("metadata:{}:{}", content_type, content_id)
}

/// Creates a cache key for stream data caching
///
/// # Arguments
///
/// * `content_id` - Unique identifier for the content
/// * `episode_id` - Optional episode identifier for series
#[uniffi::export]
pub fn cache_key_for_streams(content_id: String, episode_id: Option<String>) -> String {
    match episode_id {
        Some(ep_id) => format!("streams:{}:{}", content_id, ep_id),
        None => format!("streams:{}", content_id),
    }
}

/// Creates a cache key for cast information
///
/// # Arguments
///
/// * `content_id` - Unique identifier for the content
#[uniffi::export]
pub fn cache_key_for_cast(content_id: String) -> String {
    format!("cast:{}", content_id)
}

/// Creates a cache key for episode lists
///
/// # Arguments
///
/// * `series_id` - Unique identifier for the series
/// * `season` - Season number
#[uniffi::export]
pub fn cache_key_for_episodes(series_id: String, season: u32) -> String {
    format!("episodes:{}:s{}", series_id, season)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_key_generation() {
        assert_eq!(
            cache_key_for_metadata("movie".to_string(), "tt1234567".to_string()),
            "metadata:movie:tt1234567"
        );

        assert_eq!(
            cache_key_for_streams("tt1234567".to_string(), None),
            "streams:tt1234567"
        );

        assert_eq!(
            cache_key_for_streams("tt1234567".to_string(), Some("ep1".to_string())),
            "streams:tt1234567:ep1"
        );

        assert_eq!(
            cache_key_for_cast("tt1234567".to_string()),
            "cast:tt1234567"
        );

        assert_eq!(
            cache_key_for_episodes("tt1234567".to_string(), 1),
            "episodes:tt1234567:s1"
        );
    }
}
