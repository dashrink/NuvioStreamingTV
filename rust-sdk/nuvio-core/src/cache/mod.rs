//! Cache module
//!
//! This module provides a multi-tier caching system for the Nuvio Streaming TV SDK.
//! It implements three distinct cache tiers that work together to provide fast,
//! persistent, and HTTP-aware caching capabilities.
//!
//! # Cache Tiers
//!
//! - [`memory`] - Fast in-memory LRU cache using moka (configurable size and TTL)
//! - [`disk`] - Persistent disk cache using sled (survives app restarts)
//! - [`http_cache`] - HTTP response cache with cache-control header support
//!
//! # Cache Manager
//!
//! The [`CacheManager`] coordinates all three cache tiers, implementing a hierarchical
//! caching strategy:
//! 1. Check memory cache first (fastest)
//! 2. Fall back to disk cache on memory miss
//! 3. Promote disk hits to memory cache (write-through)
//!
//! # Architecture
//!
//! ```text
//! ┌─────────────────┐
//! │  CacheManager   │  ← UniFFI-exposed interface
//! └────────┬────────┘
//!          │
//!    ┌─────┴─────┬─────────────┬──────────────┐
//!    │           │             │              │
//!    ▼           ▼             ▼              ▼
//! Memory      Disk         HTTP          Statistics
//! (moka)     (sled)      (custom)       (hit/miss)
//! ```
//!
//! # Thread Safety
//!
//! All cache operations are thread-safe and use async/await for non-blocking I/O.
//! The cache manager uses Arc for shared ownership across threads.
//!
//! # Example
//!
//! ```rust
//! use nuvio_core::cache::memory::MemoryCache;
//!
//! # tokio_test::block_on(async {
//! // Create an in-memory cache
//! let cache = MemoryCache::with_defaults();
//! cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
//! # });
//! ```

// Cache tier modules
pub mod disk;
pub mod http_cache;
pub mod memory;

// FFI module for UniFFI exports
pub mod ffi;

// Re-exports
pub use disk::{DiskCache, DiskCacheConfig, DiskCacheStats};
pub use ffi::{
    cache_key_for_cast, cache_key_for_episodes, cache_key_for_metadata, cache_key_for_streams,
    CacheConfiguration, NuvioCacheManager,
};
pub use http_cache::{HttpCache, HttpCacheConfig, HttpCacheStats, HttpRequest, HttpResponse};
pub use memory::{MemoryCache, MemoryCacheConfig, MemoryCacheStats};

/// Cache statistics for monitoring cache performance
#[derive(Debug, Clone, Default, uniffi::Record)]
pub struct CacheStats {
    /// Total number of cache hits across all tiers
    pub hits: u64,
    /// Total number of cache misses
    pub misses: u64,
    /// Current number of items in memory cache
    pub memory_items: u64,
    /// Current number of items in disk cache
    pub disk_items: u64,
    /// Total memory used by memory cache (bytes)
    pub memory_bytes: u64,
    /// Total disk used by disk cache (bytes)
    pub disk_bytes: u64,
}

impl CacheStats {
    /// Calculate the cache hit rate as a percentage (0.0 - 100.0)
    pub fn hit_rate(&self) -> f64 {
        let total = self.hits + self.misses;
        if total == 0 {
            0.0
        } else {
            (self.hits as f64 / total as f64) * 100.0
        }
    }

    /// Calculate the cache miss rate as a percentage (0.0 - 100.0)
    pub fn miss_rate(&self) -> f64 {
        100.0 - self.hit_rate()
    }
}

/// Multi-tier cache manager that coordinates memory, disk, and HTTP caches
///
/// The CacheManager implements a hierarchical caching strategy:
/// 1. Check memory cache first (fastest)
/// 2. Fall back to disk cache on memory miss
/// 3. Promote disk hits to memory cache (write-through)
///
/// This provides optimal performance while maintaining persistence and
/// respecting HTTP cache semantics.
pub struct CacheManager {
    /// In-memory cache (fastest tier)
    memory: std::sync::Arc<MemoryCache>,
    /// Persistent disk cache (survives restarts)
    disk: std::sync::Arc<DiskCache>,
    /// HTTP response cache (separate from key-value cache)
    http: std::sync::Arc<HttpCache>,
}

impl CacheManager {
    /// Creates a new cache manager with the given configurations
    pub async fn new(
        memory_config: MemoryCacheConfig,
        disk_config: DiskCacheConfig,
        http_config: HttpCacheConfig,
    ) -> Result<Self, crate::error::NuvioError> {
        let memory = std::sync::Arc::new(MemoryCache::new(memory_config));
        let disk = std::sync::Arc::new(DiskCache::new(disk_config).await?);
        let http = std::sync::Arc::new(HttpCache::new(http_config));

        Ok(Self { memory, disk, http })
    }

    /// Creates a new cache manager with default configurations
    pub async fn with_defaults() -> Result<Self, crate::error::NuvioError> {
        Self::new(
            MemoryCacheConfig::default(),
            DiskCacheConfig::default(),
            HttpCacheConfig::default(),
        )
        .await
    }

    /// Retrieves a value from the cache, checking tiers in order
    pub async fn get(&self, key: &String) -> Result<Option<Vec<u8>>, crate::error::NuvioError> {
        // Check memory cache first (fastest tier)
        if let Some(value) = self.memory.get(key).await? {
            return Ok(Some(value));
        }

        // Fall back to disk cache
        if let Some(value) = self.disk.get(key).await? {
            // Promote to memory cache (write-through caching)
            self.memory.set(key.clone(), value.clone()).await?;
            return Ok(Some(value));
        }

        // Not found in any tier
        Ok(None)
    }

    /// Stores a value in all cache tiers
    pub async fn set(&self, key: String, value: Vec<u8>) -> Result<(), crate::error::NuvioError> {
        // Write to both memory and disk caches
        self.memory.set(key.clone(), value.clone()).await?;
        self.disk.set(key, value).await?;
        Ok(())
    }

    /// Removes a value from all cache tiers
    pub async fn remove(&self, key: &String) -> Result<(), crate::error::NuvioError> {
        // Remove from both memory and disk caches
        self.memory.remove(key).await?;
        self.disk.remove(key).await?;
        Ok(())
    }

    /// Clears all cache tiers
    pub async fn clear(&self) -> Result<(), crate::error::NuvioError> {
        // Clear all cache tiers
        self.memory.clear().await?;
        self.disk.clear().await?;
        self.http.clear().await?;
        Ok(())
    }

    /// Returns aggregate cache statistics across all tiers
    pub async fn stats(&self) -> CacheStats {
        let memory_stats = self.memory.stats().await;
        let disk_stats = self.disk.stats().await;

        CacheStats {
            hits: memory_stats.hits + disk_stats.hits,
            misses: memory_stats.misses + disk_stats.misses,
            memory_items: self.memory.size().await,
            disk_items: self.disk.size().await,
            memory_bytes: 0, // Memory cache doesn't track byte size
            disk_bytes: disk_stats.size_bytes,
        }
    }

    /// Returns a reference to the memory cache
    pub fn memory(&self) -> &std::sync::Arc<MemoryCache> {
        &self.memory
    }

    /// Returns a reference to the disk cache
    pub fn disk(&self) -> &std::sync::Arc<DiskCache> {
        &self.disk
    }

    /// Returns a reference to the HTTP cache
    pub fn http(&self) -> &std::sync::Arc<HttpCache> {
        &self.http
    }

    /// Synchronizes all cache tiers
    pub async fn sync(&self) {
        self.memory.sync().await;
        self.http.sync().await;
        // Disk cache doesn't need sync (operations are synchronous)
    }
}
