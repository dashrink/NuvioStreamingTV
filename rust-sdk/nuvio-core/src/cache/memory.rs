//! In-memory LRU cache implementation using moka
//!
//! This module provides a fast in-memory cache with Least Recently Used (LRU) eviction
//! policy and Time-To-Live (TTL) support. It uses the `moka` crate for high-performance
//! async caching with automatic eviction.
//!
//! # Features
//!
//! - **LRU Eviction**: Automatically evicts least-recently-used items when size limit reached
//! - **TTL Support**: Items expire after configurable time-to-live duration
//! - **Thread-Safe**: Fully thread-safe for concurrent access across multiple threads
//! - **Async/Await**: Non-blocking async operations for optimal performance
//! - **Statistics**: Track cache hits, misses, and current size
//!
//! # Example
//!
//! ```rust
//! use nuvio_core::cache::memory::{MemoryCache, MemoryCacheConfig};
//! use std::time::Duration;
//!
//! # tokio_test::block_on(async {
//! // Create a cache with 100 item limit and 5 minute TTL
//! let cache = MemoryCache::new(MemoryCacheConfig {
//!     max_capacity: 100,
//!     time_to_live: Some(Duration::from_secs(300)),
//!     time_to_idle: None,
//! });
//!
//! // Store a value
//! cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
//!
//! // Retrieve the value
//! let value = cache.get(&"key".to_string()).await.unwrap();
//! assert_eq!(value, Some(vec![1, 2, 3]));
//! # });
//! ```

use crate::error::NuvioError;
use moka::future::Cache;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

/// Configuration for the memory cache
#[derive(Debug, Clone)]
pub struct MemoryCacheConfig {
    /// Maximum number of entries in the cache (LRU eviction when exceeded)
    pub max_capacity: u64,
    /// Time-to-live: Duration after which entries expire (from creation)
    pub time_to_live: Option<Duration>,
    /// Time-to-idle: Duration after which entries expire (from last access)
    pub time_to_idle: Option<Duration>,
}

impl Default for MemoryCacheConfig {
    fn default() -> Self {
        Self {
            max_capacity: 1000,
            time_to_live: Some(Duration::from_secs(3600)), // 1 hour default
            time_to_idle: None,
        }
    }
}

/// Statistics for tracking cache performance
#[derive(Debug, Clone, Default)]
pub struct MemoryCacheStats {
    /// Number of cache hits (successful get operations)
    pub hits: u64,
    /// Number of cache misses (get operations for non-existent keys)
    pub misses: u64,
}

impl MemoryCacheStats {
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

/// In-memory LRU cache with TTL support
///
/// This cache uses moka for high-performance async caching with automatic
/// LRU eviction and TTL expiration. All operations are thread-safe and non-blocking.
///
/// The cache enforces size limits through LRU eviction - when the cache reaches
/// max_capacity, the least-recently-used items are automatically removed.
/// Items also expire based on TTL (time-to-live) or TTI (time-to-idle) settings.
pub struct MemoryCache {
    /// The underlying moka cache
    cache: Cache<String, Vec<u8>>,
    /// Statistics tracking (hits/misses)
    stats: Arc<RwLock<MemoryCacheStats>>,
}

impl MemoryCache {
    /// Creates a new memory cache with the given configuration
    ///
    /// # Arguments
    ///
    /// * `config` - Configuration for the cache (size limits, TTL settings)
    ///
    /// # Returns
    ///
    /// A new MemoryCache instance
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::cache::memory::{MemoryCache, MemoryCacheConfig};
    /// use std::time::Duration;
    ///
    /// let cache = MemoryCache::new(MemoryCacheConfig {
    ///     max_capacity: 500,
    ///     time_to_live: Some(Duration::from_secs(600)),
    ///     time_to_idle: None,
    /// });
    /// ```
    pub fn new(config: MemoryCacheConfig) -> Self {
        let mut builder = Cache::builder().max_capacity(config.max_capacity);

        if let Some(ttl) = config.time_to_live {
            builder = builder.time_to_live(ttl);
        }

        if let Some(tti) = config.time_to_idle {
            builder = builder.time_to_idle(tti);
        }

        Self {
            cache: builder.build(),
            stats: Arc::new(RwLock::new(MemoryCacheStats::default())),
        }
    }

    /// Creates a new memory cache with default configuration
    ///
    /// Default configuration:
    /// - Max capacity: 1000 items
    /// - TTL: 1 hour
    /// - No TTI
    ///
    /// # Returns
    ///
    /// A new MemoryCache instance with default settings
    pub fn with_defaults() -> Self {
        Self::new(MemoryCacheConfig::default())
    }

    /// Retrieves a value from the cache
    ///
    /// # Arguments
    ///
    /// * `key` - The cache key to retrieve
    ///
    /// # Returns
    ///
    /// * `Ok(Some(value))` - If the key exists and hasn't expired
    /// * `Ok(None)` - If the key doesn't exist or has expired
    /// * `Err(NuvioError)` - If an error occurred
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::memory::MemoryCache;
    /// # tokio_test::block_on(async {
    /// let cache = MemoryCache::with_defaults();
    /// cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
    ///
    /// let value = cache.get(&"key".to_string()).await.unwrap();
    /// assert_eq!(value, Some(vec![1, 2, 3]));
    /// # });
    /// ```
    pub async fn get(&self, key: &String) -> Result<Option<Vec<u8>>, NuvioError> {
        let value = self.cache.get(key).await;

        let mut stats = self.stats.write().await;
        if value.is_some() {
            stats.hits += 1;
        } else {
            stats.misses += 1;
        }

        Ok(value)
    }

    /// Stores a value in the cache
    ///
    /// # Arguments
    ///
    /// * `key` - The cache key
    /// * `value` - The value to store (raw bytes)
    ///
    /// # Returns
    ///
    /// * `Ok(())` - If the value was stored successfully
    /// * `Err(NuvioError)` - If an error occurred
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::memory::MemoryCache;
    /// # tokio_test::block_on(async {
    /// let cache = MemoryCache::with_defaults();
    /// cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
    /// # });
    /// ```
    pub async fn set(&self, key: String, value: Vec<u8>) -> Result<(), NuvioError> {
        self.cache.insert(key, value).await;
        Ok(())
    }

    /// Removes a value from the cache
    ///
    /// # Arguments
    ///
    /// * `key` - The cache key to remove
    ///
    /// # Returns
    ///
    /// * `Ok(())` - If the key was removed or didn't exist
    /// * `Err(NuvioError)` - If an error occurred
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::memory::MemoryCache;
    /// # tokio_test::block_on(async {
    /// let cache = MemoryCache::with_defaults();
    /// cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
    /// cache.remove(&"key".to_string()).await.unwrap();
    ///
    /// let value = cache.get(&"key".to_string()).await.unwrap();
    /// assert_eq!(value, None);
    /// # });
    /// ```
    pub async fn remove(&self, key: &String) -> Result<(), NuvioError> {
        self.cache.invalidate(key).await;
        Ok(())
    }

    /// Clears all entries from the cache
    ///
    /// # Returns
    ///
    /// * `Ok(())` - If the cache was cleared successfully
    /// * `Err(NuvioError)` - If an error occurred
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::memory::MemoryCache;
    /// # tokio_test::block_on(async {
    /// let cache = MemoryCache::with_defaults();
    /// cache.set("key1".to_string(), vec![1]).await.unwrap();
    /// cache.set("key2".to_string(), vec![2]).await.unwrap();
    ///
    /// cache.clear().await.unwrap();
    /// assert_eq!(cache.size().await, 0);
    /// # });
    /// ```
    pub async fn clear(&self) -> Result<(), NuvioError> {
        self.cache.invalidate_all();
        // Wait for invalidation to complete
        self.cache.run_pending_tasks().await;
        Ok(())
    }

    /// Returns the current number of entries in the cache
    ///
    /// # Returns
    ///
    /// The number of entries currently in the cache
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::memory::MemoryCache;
    /// # tokio_test::block_on(async {
    /// let cache = MemoryCache::with_defaults();
    /// cache.set("key1".to_string(), vec![1]).await.unwrap();
    /// cache.set("key2".to_string(), vec![2]).await.unwrap();
    /// cache.sync().await;
    ///
    /// assert_eq!(cache.size().await, 2);
    /// # });
    /// ```
    pub async fn size(&self) -> u64 {
        self.cache.entry_count()
    }

    /// Returns cache statistics (hits, misses, hit rate)
    ///
    /// # Returns
    ///
    /// A clone of the current cache statistics
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::memory::MemoryCache;
    /// # tokio_test::block_on(async {
    /// let cache = MemoryCache::with_defaults();
    /// cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
    ///
    /// // Cache hit
    /// cache.get(&"key".to_string()).await.unwrap();
    ///
    /// // Cache miss
    /// cache.get(&"missing".to_string()).await.unwrap();
    ///
    /// let stats = cache.stats().await;
    /// assert_eq!(stats.hits, 1);
    /// assert_eq!(stats.misses, 1);
    /// # });
    /// ```
    pub async fn stats(&self) -> MemoryCacheStats {
        self.stats.read().await.clone()
    }

    /// Resets cache statistics to zero
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::memory::MemoryCache;
    /// # tokio_test::block_on(async {
    /// let cache = MemoryCache::with_defaults();
    /// cache.get(&"key".to_string()).await.unwrap();
    ///
    /// cache.reset_stats().await;
    /// let stats = cache.stats().await;
    /// assert_eq!(stats.hits, 0);
    /// assert_eq!(stats.misses, 0);
    /// # });
    /// ```
    pub async fn reset_stats(&self) {
        let mut stats = self.stats.write().await;
        *stats = MemoryCacheStats::default();
    }

    /// Synchronizes pending operations in the cache
    ///
    /// This method waits for all pending maintenance tasks (eviction, expiration) to complete.
    /// Mainly useful in tests to ensure operations have completed before assertions.
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::memory::MemoryCache;
    /// # tokio_test::block_on(async {
    /// let cache = MemoryCache::with_defaults();
    /// cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
    /// cache.sync().await;  // Ensure insertion is complete
    /// # });
    /// ```
    pub async fn sync(&self) {
        self.cache.run_pending_tasks().await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_memory_cache_basic_operations() {
        let cache = MemoryCache::with_defaults();

        // Set a value
        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();

        // Get the value
        let value = cache.get(&"key1".to_string()).await.unwrap();
        assert_eq!(value, Some(vec![1, 2, 3]));

        // Remove the value
        cache.remove(&"key1".to_string()).await.unwrap();
        let value = cache.get(&"key1".to_string()).await.unwrap();
        assert_eq!(value, None);
    }

    #[tokio::test]
    async fn test_memory_cache_size() {
        let cache = MemoryCache::with_defaults();

        assert_eq!(cache.size().await, 0);

        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();
        cache.sync().await;
        assert_eq!(cache.size().await, 1);

        cache.set("key2".to_string(), vec![4, 5, 6]).await.unwrap();
        cache.sync().await;
        assert_eq!(cache.size().await, 2);

        cache.remove(&"key1".to_string()).await.unwrap();
        cache.sync().await;
        assert_eq!(cache.size().await, 1);
    }

    #[tokio::test]
    async fn test_memory_cache_clear() {
        let cache = MemoryCache::with_defaults();

        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();
        cache.set("key2".to_string(), vec![4, 5, 6]).await.unwrap();
        cache.sync().await;

        assert_eq!(cache.size().await, 2);

        cache.clear().await.unwrap();
        assert_eq!(cache.size().await, 0);

        let value1 = cache.get(&"key1".to_string()).await.unwrap();
        let value2 = cache.get(&"key2".to_string()).await.unwrap();
        assert_eq!(value1, None);
        assert_eq!(value2, None);
    }

    #[tokio::test]
    async fn test_memory_cache_lru_eviction() {
        // Create a cache with max capacity of 100
        let cache = MemoryCache::new(MemoryCacheConfig {
            max_capacity: 100,
            time_to_live: None,
            time_to_idle: None,
        });

        // Add 200 items - this should trigger LRU eviction
        for i in 0..200 {
            cache.set(format!("key{}", i), vec![i as u8]).await.unwrap();
        }

        // Wait for all operations and evictions to process
        cache.sync().await;
        sleep(Duration::from_millis(200)).await;
        cache.sync().await;

        // Cache should respect max capacity (with some tolerance for async processing)
        // Moka may temporarily exceed capacity slightly during eviction processing
        let final_size = cache.size().await;
        assert!(
            final_size <= 110,
            "Cache size {} significantly exceeds max capacity of 100",
            final_size
        );

        // Cache should not be empty - items should be retained up to capacity
        assert!(
            final_size >= 80,
            "Cache size {} is unexpectedly low, expected around 100",
            final_size
        );
    }

    #[tokio::test]
    async fn test_memory_cache_ttl_expiration() {
        // Create a cache with 1 second TTL
        let cache = MemoryCache::new(MemoryCacheConfig {
            max_capacity: 100,
            time_to_live: Some(Duration::from_millis(500)),
            time_to_idle: None,
        });

        // Set a value
        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();

        // Value should be present immediately
        let value = cache.get(&"key1".to_string()).await.unwrap();
        assert_eq!(value, Some(vec![1, 2, 3]));

        // Wait for TTL to expire
        sleep(Duration::from_millis(600)).await;

        // Value should be expired and return None
        let value = cache.get(&"key1".to_string()).await.unwrap();
        assert_eq!(value, None);
    }

    #[tokio::test]
    async fn test_memory_cache_tti_expiration() {
        // Create a cache with 500ms time-to-idle
        let cache = MemoryCache::new(MemoryCacheConfig {
            max_capacity: 100,
            time_to_live: None,
            time_to_idle: Some(Duration::from_millis(500)),
        });

        // Set a value
        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();

        // Access within TTI window (at 200ms)
        sleep(Duration::from_millis(200)).await;
        let value = cache.get(&"key1".to_string()).await.unwrap();
        assert_eq!(value, Some(vec![1, 2, 3]));

        // Access again within TTI window (at 400ms from last access)
        sleep(Duration::from_millis(300)).await;
        let value = cache.get(&"key1".to_string()).await.unwrap();
        assert_eq!(value, Some(vec![1, 2, 3]));

        // Wait longer than TTI without access
        sleep(Duration::from_millis(600)).await;

        // Value should be expired
        let value = cache.get(&"key1".to_string()).await.unwrap();
        assert_eq!(value, None);
    }

    #[tokio::test]
    async fn test_memory_cache_statistics() {
        let cache = MemoryCache::with_defaults();

        // Initial stats should be zero
        let stats = cache.stats().await;
        assert_eq!(stats.hits, 0);
        assert_eq!(stats.misses, 0);
        assert_eq!(stats.hit_rate(), 0.0);

        // Add a value
        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();

        // Cache hit
        cache.get(&"key1".to_string()).await.unwrap();

        // Cache miss
        cache.get(&"missing".to_string()).await.unwrap();

        // Cache hit
        cache.get(&"key1".to_string()).await.unwrap();

        let stats = cache.stats().await;
        assert_eq!(stats.hits, 2);
        assert_eq!(stats.misses, 1);
        assert!((stats.hit_rate() - 66.666).abs() < 0.1);
    }

    #[tokio::test]
    async fn test_memory_cache_reset_stats() {
        let cache = MemoryCache::with_defaults();

        // Generate some statistics
        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();
        cache.get(&"key1".to_string()).await.unwrap();
        cache.get(&"missing".to_string()).await.unwrap();

        let stats = cache.stats().await;
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.misses, 1);

        // Reset statistics
        cache.reset_stats().await;

        let stats = cache.stats().await;
        assert_eq!(stats.hits, 0);
        assert_eq!(stats.misses, 0);
    }

    #[tokio::test]
    async fn test_memory_cache_concurrent_access() {
        let cache = Arc::new(MemoryCache::with_defaults());

        // Spawn multiple tasks that access the cache concurrently
        let mut handles = vec![];

        for i in 0..10 {
            let cache_clone = Arc::clone(&cache);
            let handle = tokio::spawn(async move {
                let key = format!("key{}", i);
                let value = vec![i as u8];

                // Set value
                cache_clone.set(key.clone(), value.clone()).await.unwrap();

                // Get value
                let retrieved = cache_clone.get(&key).await.unwrap();
                assert_eq!(retrieved, Some(value));
            });
            handles.push(handle);
        }

        // Wait for all tasks to complete
        for handle in handles {
            handle.await.unwrap();
        }

        // Wait for all insertions to be processed
        cache.sync().await;

        // Verify all values are present
        assert_eq!(cache.size().await, 10);
    }

    #[tokio::test]
    async fn test_memory_cache_update_existing_key() {
        let cache = MemoryCache::with_defaults();

        // Set initial value
        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();
        cache.sync().await;

        let value = cache.get(&"key1".to_string()).await.unwrap();
        assert_eq!(value, Some(vec![1, 2, 3]));

        // Update the value
        cache.set("key1".to_string(), vec![4, 5, 6]).await.unwrap();
        cache.sync().await;

        let value = cache.get(&"key1".to_string()).await.unwrap();
        assert_eq!(value, Some(vec![4, 5, 6]));

        // Size should still be 1
        assert_eq!(cache.size().await, 1);
    }

    #[tokio::test]
    async fn test_memory_cache_empty_value() {
        let cache = MemoryCache::with_defaults();

        // Store empty vector
        cache.set("key1".to_string(), vec![]).await.unwrap();

        let value = cache.get(&"key1".to_string()).await.unwrap();
        assert_eq!(value, Some(vec![]));
    }

    #[tokio::test]
    async fn test_memory_cache_large_value() {
        let cache = MemoryCache::with_defaults();

        // Store a large value (1MB)
        let large_value = vec![42u8; 1024 * 1024];
        cache
            .set("large_key".to_string(), large_value.clone())
            .await
            .unwrap();

        let value = cache.get(&"large_key".to_string()).await.unwrap();
        assert_eq!(value, Some(large_value));
    }
}
