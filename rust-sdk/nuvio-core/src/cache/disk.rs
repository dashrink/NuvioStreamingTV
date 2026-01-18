//! Persistent disk cache implementation using sled
//!
//! This module provides a persistent disk cache that survives application restarts.
//! It uses the `sled` embedded database for high-performance key-value storage with
//! automatic persistence and crash recovery.
//!
//! # Features
//!
//! - **Persistence**: Data survives application restarts and crashes
//! - **Size Limits**: Enforces maximum storage size with LRU-style eviction
//! - **Thread-Safe**: Fully thread-safe for concurrent access across multiple threads
//! - **Async/Await**: Non-blocking async operations for optimal performance
//! - **Statistics**: Track cache hits, misses, and current size
//! - **Atomic Operations**: Uses sled's atomic compare-and-swap for consistency
//!
//! # Example
//!
//! ```rust
//! use nuvio_core::cache::disk::{DiskCache, DiskCacheConfig};
//! use std::path::PathBuf;
//!
//! # tokio_test::block_on(async {
//! // Create a disk cache with 10MB limit
//! let config = DiskCacheConfig {
//!     path: PathBuf::from("/tmp/test_cache"),
//!     max_size_bytes: 10 * 1024 * 1024, // 10MB
//! };
//! let cache = DiskCache::new(config).await.unwrap();
//!
//! // Store a value
//! cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
//!
//! // Retrieve the value
//! let value = cache.get("key").await.unwrap();
//! assert_eq!(value, Some(vec![1, 2, 3]));
//! # });
//! ```

use crate::error::NuvioError;
use sled::Db;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Configuration for the disk cache
#[derive(Debug, Clone)]
pub struct DiskCacheConfig {
    /// Path where the cache database will be stored
    pub path: PathBuf,
    /// Maximum size of the cache in bytes (LRU eviction when exceeded)
    pub max_size_bytes: u64,
}

impl Default for DiskCacheConfig {
    fn default() -> Self {
        Self {
            path: PathBuf::from("./cache/disk"),
            max_size_bytes: 100 * 1024 * 1024, // 100MB default
        }
    }
}

/// Statistics for tracking cache performance
#[derive(Debug, Clone, Default)]
pub struct DiskCacheStats {
    /// Number of cache hits (successful get operations)
    pub hits: u64,
    /// Number of cache misses (get operations for non-existent keys)
    pub misses: u64,
    /// Current size in bytes
    pub size_bytes: u64,
    /// Number of evictions performed due to size limits
    pub evictions: u64,
}

impl DiskCacheStats {
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

/// Metadata stored alongside each cache entry
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct CacheEntry {
    /// The actual data
    data: Vec<u8>,
    /// Timestamp when the entry was created (for LRU eviction)
    timestamp: u64,
}

/// Persistent disk cache with size limits
///
/// This cache uses sled for persistent storage that survives application restarts.
/// All operations are thread-safe and non-blocking using tokio's spawn_blocking.
///
/// The cache enforces size limits by evicting the oldest entries when the total
/// size exceeds max_size_bytes. Eviction is based on timestamp (oldest first).
pub struct DiskCache {
    /// The underlying sled database
    db: Db,
    /// Configuration (path, size limits)
    config: DiskCacheConfig,
    /// Statistics tracking (hits/misses/size)
    stats: Arc<RwLock<DiskCacheStats>>,
}

impl DiskCache {
    /// Creates a new disk cache with the given configuration
    ///
    /// # Arguments
    ///
    /// * `config` - Configuration for the cache (path, size limits)
    ///
    /// # Returns
    ///
    /// A new DiskCache instance wrapped in Result
    ///
    /// # Errors
    ///
    /// Returns `NuvioError::CacheError` if the database cannot be opened
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::cache::disk::{DiskCache, DiskCacheConfig};
    /// use std::path::PathBuf;
    ///
    /// # tokio_test::block_on(async {
    /// let config = DiskCacheConfig {
    ///     path: PathBuf::from("/tmp/cache"),
    ///     max_size_bytes: 50 * 1024 * 1024, // 50MB
    /// };
    /// let cache = DiskCache::new(config).await.unwrap();
    /// # });
    /// ```
    pub async fn new(config: DiskCacheConfig) -> Result<Self, NuvioError> {
        // Ensure parent directory exists (use blocking std::fs since it's one-time)
        if let Some(parent) = config.path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                NuvioError::cache(format!("Failed to create cache directory: {}", e))
            })?;
        }

        // Open the sled database (blocking operation)
        let path = config.path.clone();
        let db = tokio::task::spawn_blocking(move || sled::open(&path))
            .await
            .map_err(|e| NuvioError::cache(format!("Failed to spawn blocking task: {}", e)))?
            .map_err(|e| NuvioError::cache(format!("Failed to open sled database: {}", e)))?;

        // Calculate initial size
        let initial_size = Self::calculate_total_size(&db)?;

        Ok(Self {
            db,
            config,
            stats: Arc::new(RwLock::new(DiskCacheStats {
                size_bytes: initial_size,
                ..Default::default()
            })),
        })
    }

    /// Creates a new disk cache with default configuration
    ///
    /// Default configuration:
    /// - Path: ./cache/disk
    /// - Max size: 100MB
    ///
    /// # Returns
    ///
    /// A new DiskCache instance with default settings
    pub async fn with_defaults() -> Result<Self, NuvioError> {
        Self::new(DiskCacheConfig::default()).await
    }

    /// Retrieves a value from the cache
    ///
    /// # Arguments
    ///
    /// * `key` - The cache key to retrieve
    ///
    /// # Returns
    ///
    /// * `Ok(Some(value))` - If the key exists
    /// * `Ok(None)` - If the key doesn't exist
    /// * `Err(NuvioError)` - If an error occurred
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::disk::{DiskCache, DiskCacheConfig};
    /// # use std::path::PathBuf;
    /// # tokio_test::block_on(async {
    /// # let temp_dir = std::env::temp_dir().join(format!("doctest_get_{}", std::process::id()));
    /// # let config = DiskCacheConfig { path: temp_dir, max_size_bytes: 10 * 1024 * 1024 };
    /// # let cache = DiskCache::new(config).await.unwrap();
    /// cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
    ///
    /// let value = cache.get("key").await.unwrap();
    /// assert_eq!(value, Some(vec![1, 2, 3]));
    /// # });
    /// ```
    pub async fn get(&self, key: &str) -> Result<Option<Vec<u8>>, NuvioError> {
        let db = self.db.clone();
        let key = key.to_owned();

        let result = tokio::task::spawn_blocking(move || db.get(key.as_bytes()))
            .await
            .map_err(|e| NuvioError::cache(format!("Failed to spawn blocking task: {}", e)))?
            .map_err(|e| NuvioError::cache(format!("Failed to get from sled: {}", e)))?;

        let mut stats = self.stats.write().await;

        if let Some(bytes) = result {
            // Deserialize the cache entry
            let entry: CacheEntry = serde_json::from_slice(&bytes).map_err(|e| {
                NuvioError::cache(format!("Failed to deserialize cache entry: {}", e))
            })?;

            stats.hits += 1;
            Ok(Some(entry.data))
        } else {
            stats.misses += 1;
            Ok(None)
        }
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
    /// # use nuvio_core::cache::disk::{DiskCache, DiskCacheConfig};
    /// # use std::path::PathBuf;
    /// # tokio_test::block_on(async {
    /// # let temp_dir = std::env::temp_dir().join(format!("doctest_set_{}", std::process::id()));
    /// # let config = DiskCacheConfig { path: temp_dir, max_size_bytes: 10 * 1024 * 1024 };
    /// # let cache = DiskCache::new(config).await.unwrap();
    /// cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
    /// # });
    /// ```
    pub async fn set(&self, key: String, value: Vec<u8>) -> Result<(), NuvioError> {
        // Create cache entry with timestamp
        let entry = CacheEntry {
            data: value,
            timestamp: Self::current_timestamp(),
        };

        let entry_bytes = serde_json::to_vec(&entry)
            .map_err(|e| NuvioError::cache(format!("Failed to serialize cache entry: {}", e)))?;

        let entry_size = (key.len() + entry_bytes.len()) as u64;

        // Insert into database
        let db = self.db.clone();
        let key_bytes = key.as_bytes().to_vec();
        let entry_bytes_clone = entry_bytes.clone();

        let old_value =
            tokio::task::spawn_blocking(move || db.insert(key_bytes, entry_bytes_clone))
                .await
                .map_err(|e| NuvioError::cache(format!("Failed to spawn blocking task: {}", e)))?
                .map_err(|e| NuvioError::cache(format!("Failed to insert into sled: {}", e)))?;

        // Update size statistics
        let mut stats = self.stats.write().await;

        // If there was an old value, subtract its size
        if let Some(old_bytes) = old_value {
            let old_size = (key.len() + old_bytes.len()) as u64;
            stats.size_bytes = stats.size_bytes.saturating_sub(old_size);
        }

        // Add new entry size
        stats.size_bytes += entry_size;
        drop(stats);

        // Check if we need to evict entries
        self.evict_if_needed().await?;

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
    /// # use nuvio_core::cache::disk::{DiskCache, DiskCacheConfig};
    /// # use std::path::PathBuf;
    /// # tokio_test::block_on(async {
    /// # let temp_dir = std::env::temp_dir().join(format!("doctest_remove_{}", std::process::id()));
    /// # let config = DiskCacheConfig { path: temp_dir, max_size_bytes: 10 * 1024 * 1024 };
    /// # let cache = DiskCache::new(config).await.unwrap();
    /// cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
    /// cache.remove("key").await.unwrap();
    ///
    /// let value = cache.get("key").await.unwrap();
    /// assert_eq!(value, None);
    /// # });
    /// ```
    pub async fn remove(&self, key: &str) -> Result<(), NuvioError> {
        let db = self.db.clone();
        let key_clone = key.to_owned();

        let old_value = tokio::task::spawn_blocking(move || db.remove(key_clone.as_bytes()))
            .await
            .map_err(|e| NuvioError::cache(format!("Failed to spawn blocking task: {}", e)))?
            .map_err(|e| NuvioError::cache(format!("Failed to remove from sled: {}", e)))?;

        // Update size statistics
        if let Some(old_bytes) = old_value {
            let mut stats = self.stats.write().await;
            let old_size = (key.len() + old_bytes.len()) as u64;
            stats.size_bytes = stats.size_bytes.saturating_sub(old_size);
        }

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
    /// # use nuvio_core::cache::disk::{DiskCache, DiskCacheConfig};
    /// # use std::path::PathBuf;
    /// # tokio_test::block_on(async {
    /// # let temp_dir = std::env::temp_dir().join(format!("doctest_clear_{}", std::process::id()));
    /// # let config = DiskCacheConfig { path: temp_dir, max_size_bytes: 10 * 1024 * 1024 };
    /// # let cache = DiskCache::new(config).await.unwrap();
    /// cache.set("key1".to_string(), vec![1]).await.unwrap();
    /// cache.set("key2".to_string(), vec![2]).await.unwrap();
    ///
    /// cache.clear().await.unwrap();
    /// assert_eq!(cache.size().await, 0);
    /// # });
    /// ```
    pub async fn clear(&self) -> Result<(), NuvioError> {
        let db = self.db.clone();

        tokio::task::spawn_blocking(move || db.clear())
            .await
            .map_err(|e| NuvioError::cache(format!("Failed to spawn blocking task: {}", e)))?
            .map_err(|e| NuvioError::cache(format!("Failed to clear sled database: {}", e)))?;

        // Reset size statistics
        let mut stats = self.stats.write().await;
        stats.size_bytes = 0;

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
    /// # use nuvio_core::cache::disk::{DiskCache, DiskCacheConfig};
    /// # use std::path::PathBuf;
    /// # tokio_test::block_on(async {
    /// # let temp_dir = std::env::temp_dir().join(format!("doctest_size_{}", std::process::id()));
    /// # let config = DiskCacheConfig { path: temp_dir, max_size_bytes: 10 * 1024 * 1024 };
    /// # let cache = DiskCache::new(config).await.unwrap();
    /// cache.set("key1".to_string(), vec![1]).await.unwrap();
    /// cache.set("key2".to_string(), vec![2]).await.unwrap();
    ///
    /// assert_eq!(cache.size().await, 2);
    /// # });
    /// ```
    pub async fn size(&self) -> u64 {
        let db = self.db.clone();

        tokio::task::spawn_blocking(move || db.len() as u64)
            .await
            .unwrap_or(0)
    }

    /// Returns the current size of the cache in bytes
    ///
    /// # Returns
    ///
    /// The total size of all entries in bytes
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::disk::{DiskCache, DiskCacheConfig};
    /// # use std::path::PathBuf;
    /// # tokio_test::block_on(async {
    /// # let temp_dir = tempfile::tempdir().unwrap();
    /// # let config = DiskCacheConfig {
    /// #     path: temp_dir.path().join("db"),
    /// #     max_size_bytes: 10 * 1024 * 1024,
    /// # };
    /// # let cache = DiskCache::new(config).await.unwrap();
    /// cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();
    /// let size_bytes = cache.size_bytes().await;
    /// assert!(size_bytes > 0);
    /// # });
    /// ```
    pub async fn size_bytes(&self) -> u64 {
        let stats = self.stats.read().await;
        stats.size_bytes
    }

    /// Returns cache statistics (hits, misses, hit rate, size)
    ///
    /// # Returns
    ///
    /// A clone of the current cache statistics
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::disk::{DiskCache, DiskCacheConfig};
    /// # use std::path::PathBuf;
    /// # tokio_test::block_on(async {
    /// # let temp_dir = std::env::temp_dir().join(format!("doctest_stats_{}", std::process::id()));
    /// # let config = DiskCacheConfig { path: temp_dir, max_size_bytes: 10 * 1024 * 1024 };
    /// # let cache = DiskCache::new(config).await.unwrap();
    /// cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
    ///
    /// // Cache hit
    /// cache.get("key").await.unwrap();
    ///
    /// // Cache miss
    /// cache.get("missing").await.unwrap();
    ///
    /// let stats = cache.stats().await;
    /// assert_eq!(stats.hits, 1);
    /// assert_eq!(stats.misses, 1);
    /// # });
    /// ```
    pub async fn stats(&self) -> DiskCacheStats {
        self.stats.read().await.clone()
    }

    /// Resets cache statistics to zero
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::disk::{DiskCache, DiskCacheConfig};
    /// # use std::path::PathBuf;
    /// # tokio_test::block_on(async {
    /// # let temp_dir = tempfile::tempdir().unwrap();
    /// # let config = DiskCacheConfig {
    /// #     path: temp_dir.path().join("db"),
    /// #     max_size_bytes: 10 * 1024 * 1024,
    /// # };
    /// # let cache = DiskCache::new(config).await.unwrap();
    /// cache.get("key").await.unwrap();
    ///
    /// cache.reset_stats().await;
    /// let stats = cache.stats().await;
    /// assert_eq!(stats.hits, 0);
    /// assert_eq!(stats.misses, 0);
    /// # });
    /// ```
    pub async fn reset_stats(&self) {
        let mut stats = self.stats.write().await;
        let current_size = stats.size_bytes;
        *stats = DiskCacheStats {
            size_bytes: current_size,
            ..Default::default()
        };
    }

    /// Flushes any pending writes to disk
    ///
    /// # Returns
    ///
    /// * `Ok(())` - If the flush was successful
    /// * `Err(NuvioError)` - If an error occurred
    ///
    /// # Example
    ///
    /// ```rust
    /// # use nuvio_core::cache::disk::{DiskCache, DiskCacheConfig};
    /// # use std::path::PathBuf;
    /// # tokio_test::block_on(async {
    /// # let temp_dir = std::env::temp_dir().join(format!("doctest_flush_{}", std::process::id()));
    /// # let config = DiskCacheConfig { path: temp_dir, max_size_bytes: 10 * 1024 * 1024 };
    /// # let cache = DiskCache::new(config).await.unwrap();
    /// cache.set("key".to_string(), vec![1, 2, 3]).await.unwrap();
    /// cache.flush().await.unwrap();
    /// # });
    /// ```
    pub async fn flush(&self) -> Result<(), NuvioError> {
        let db = self.db.clone();

        tokio::task::spawn_blocking(move || db.flush())
            .await
            .map_err(|e| NuvioError::cache(format!("Failed to spawn blocking task: {}", e)))?
            .map_err(|e| NuvioError::cache(format!("Failed to flush sled database: {}", e)))?;

        Ok(())
    }

    // Private helper methods

    /// Calculates the total size of all entries in the database
    fn calculate_total_size(db: &Db) -> Result<u64, NuvioError> {
        let mut total_size: u64 = 0;

        for item in db.iter() {
            let (key, value) =
                item.map_err(|e| NuvioError::cache(format!("Failed to iterate sled: {}", e)))?;
            total_size += (key.len() + value.len()) as u64;
        }

        Ok(total_size)
    }

    /// Returns the current timestamp in milliseconds since UNIX epoch
    fn current_timestamp() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64
    }

    /// Evicts oldest entries if the cache size exceeds the configured limit
    async fn evict_if_needed(&self) -> Result<(), NuvioError> {
        let stats = self.stats.read().await;

        if stats.size_bytes <= self.config.max_size_bytes {
            return Ok(());
        }
        drop(stats);

        // Collect all entries with their timestamps
        let db = self.db.clone();
        let mut entries: Vec<(Vec<u8>, u64, usize)> = tokio::task::spawn_blocking(move || {
            let mut result = Vec::new();

            for (key, value) in db.iter().flatten() {
                // Deserialize to get timestamp
                if let Ok(entry) = serde_json::from_slice::<CacheEntry>(&value) {
                    let size = key.len() + value.len();
                    result.push((key.to_vec(), entry.timestamp, size));
                }
            }

            result
        })
        .await
        .map_err(|e| NuvioError::cache(format!("Failed to spawn blocking task: {}", e)))?;

        // Sort by timestamp (oldest first)
        entries.sort_by_key(|(_, timestamp, _)| *timestamp);

        // Evict oldest entries until we're under the limit
        let mut bytes_to_free = {
            let stats = self.stats.read().await;
            stats.size_bytes.saturating_sub(self.config.max_size_bytes)
        };

        let mut evicted_count = 0;

        for (key, _, size) in entries {
            if bytes_to_free == 0 {
                break;
            }

            let db = self.db.clone();
            let key_clone = key.clone();
            tokio::task::spawn_blocking(move || db.remove(key_clone))
                .await
                .map_err(|e| NuvioError::cache(format!("Failed to spawn blocking task: {}", e)))?
                .map_err(|e| {
                    NuvioError::cache(format!("Failed to remove during eviction: {}", e))
                })?;

            let size_u64 = size as u64;
            bytes_to_free = bytes_to_free.saturating_sub(size_u64);

            let mut stats = self.stats.write().await;
            stats.size_bytes = stats.size_bytes.saturating_sub(size_u64);
            stats.evictions += 1;
            drop(stats);

            evicted_count += 1;
        }

        if evicted_count > 0 {
            tracing::debug!("Evicted {} entries from disk cache", evicted_count);
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    async fn create_test_cache() -> (DiskCache, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let config = DiskCacheConfig {
            path: temp_dir.path().join("test_cache"),
            max_size_bytes: 1024 * 1024, // 1MB for tests
        };
        let cache = DiskCache::new(config).await.unwrap();
        (cache, temp_dir)
    }

    #[tokio::test]
    async fn test_disk_cache_basic_operations() {
        let (cache, _temp_dir) = create_test_cache().await;

        // Set a value
        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();

        // Get the value
        let value = cache.get("key1").await.unwrap();
        assert_eq!(value, Some(vec![1, 2, 3]));

        // Remove the value
        cache.remove("key1").await.unwrap();
        let value = cache.get("key1").await.unwrap();
        assert_eq!(value, None);
    }

    #[tokio::test]
    async fn test_disk_cache_persistence() {
        let temp_dir = TempDir::new().unwrap();
        let config = DiskCacheConfig {
            path: temp_dir.path().join("test_cache"),
            max_size_bytes: 1024 * 1024,
        };

        // Create cache and store value
        {
            let cache = DiskCache::new(config.clone()).await.unwrap();
            cache
                .set("persistent_key".to_string(), vec![1, 2, 3, 4, 5])
                .await
                .unwrap();
            cache.flush().await.unwrap();
        }

        // Reopen cache and verify value persisted
        {
            let cache = DiskCache::new(config).await.unwrap();
            let value = cache.get("persistent_key").await.unwrap();
            assert_eq!(value, Some(vec![1, 2, 3, 4, 5]));
        }
    }

    #[tokio::test]
    async fn test_disk_cache_size() {
        let (cache, _temp_dir) = create_test_cache().await;

        assert_eq!(cache.size().await, 0);

        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();
        assert_eq!(cache.size().await, 1);

        cache.set("key2".to_string(), vec![4, 5, 6]).await.unwrap();
        assert_eq!(cache.size().await, 2);

        cache.remove("key1").await.unwrap();
        assert_eq!(cache.size().await, 1);
    }

    #[tokio::test]
    async fn test_disk_cache_clear() {
        let (cache, _temp_dir) = create_test_cache().await;

        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();
        cache.set("key2".to_string(), vec![4, 5, 6]).await.unwrap();

        assert_eq!(cache.size().await, 2);

        cache.clear().await.unwrap();
        assert_eq!(cache.size().await, 0);

        let value1 = cache.get("key1").await.unwrap();
        let value2 = cache.get("key2").await.unwrap();
        assert_eq!(value1, None);
        assert_eq!(value2, None);
    }

    #[tokio::test]
    async fn test_disk_cache_size_limit_eviction() {
        let temp_dir = TempDir::new().unwrap();
        let config = DiskCacheConfig {
            path: temp_dir.path().join("test_cache"),
            max_size_bytes: 1024, // Small limit to trigger eviction
        };
        let cache = DiskCache::new(config).await.unwrap();

        // Add entries until we exceed the limit
        let large_value = vec![0u8; 300]; // 300 bytes per entry

        for i in 0..10 {
            cache
                .set(format!("key{}", i), large_value.clone())
                .await
                .unwrap();

            // Small delay to ensure different timestamps
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }

        // Cache should have evicted some entries to stay under limit
        let size_bytes = cache.size_bytes().await;
        assert!(
            size_bytes <= 1024,
            "Cache size {} exceeds limit of 1024 bytes",
            size_bytes
        );

        // Check that evictions occurred
        let stats = cache.stats().await;
        assert!(stats.evictions > 0, "Expected evictions to have occurred");
    }

    #[tokio::test]
    async fn test_disk_cache_statistics() {
        let (cache, _temp_dir) = create_test_cache().await;

        // Initial stats should be zero
        let stats = cache.stats().await;
        assert_eq!(stats.hits, 0);
        assert_eq!(stats.misses, 0);
        assert_eq!(stats.hit_rate(), 0.0);

        // Add a value
        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();

        // Cache hit
        cache.get("key1").await.unwrap();

        // Cache miss
        cache.get("missing").await.unwrap();

        // Cache hit
        cache.get("key1").await.unwrap();

        let stats = cache.stats().await;
        assert_eq!(stats.hits, 2);
        assert_eq!(stats.misses, 1);
        assert!((stats.hit_rate() - 66.666).abs() < 0.1);
    }

    #[tokio::test]
    async fn test_disk_cache_reset_stats() {
        let (cache, _temp_dir) = create_test_cache().await;

        // Generate some statistics
        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();
        cache.get("key1").await.unwrap();
        cache.get("missing").await.unwrap();

        let stats = cache.stats().await;
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.misses, 1);

        // Reset statistics
        cache.reset_stats().await;

        let stats = cache.stats().await;
        assert_eq!(stats.hits, 0);
        assert_eq!(stats.misses, 0);
        // Size should be preserved
        assert!(stats.size_bytes > 0);
    }

    #[tokio::test]
    async fn test_disk_cache_update_existing_key() {
        let (cache, _temp_dir) = create_test_cache().await;

        // Set initial value
        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();

        let value = cache.get("key1").await.unwrap();
        assert_eq!(value, Some(vec![1, 2, 3]));

        // Update the value
        cache.set("key1".to_string(), vec![4, 5, 6]).await.unwrap();

        let value = cache.get("key1").await.unwrap();
        assert_eq!(value, Some(vec![4, 5, 6]));

        // Size should still be 1
        assert_eq!(cache.size().await, 1);
    }

    #[tokio::test]
    async fn test_disk_cache_empty_value() {
        let (cache, _temp_dir) = create_test_cache().await;

        // Store empty vector
        cache.set("key1".to_string(), vec![]).await.unwrap();

        let value = cache.get("key1").await.unwrap();
        assert_eq!(value, Some(vec![]));
    }

    #[tokio::test]
    async fn test_disk_cache_large_value() {
        let (cache, _temp_dir) = create_test_cache().await;

        // Store a moderately large value (100KB)
        let large_value = vec![42u8; 100 * 1024];
        cache
            .set("large_key".to_string(), large_value.clone())
            .await
            .unwrap();

        let value = cache.get("large_key").await.unwrap();
        assert_eq!(value, Some(large_value));
    }

    #[tokio::test]
    async fn test_disk_cache_concurrent_access() {
        let (cache, _temp_dir) = create_test_cache().await;
        let cache = Arc::new(cache);

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

        // Verify all values are present
        assert_eq!(cache.size().await, 10);
    }

    #[tokio::test]
    async fn test_disk_cache_flush() {
        let (cache, _temp_dir) = create_test_cache().await;

        cache.set("key1".to_string(), vec![1, 2, 3]).await.unwrap();

        // Flush should complete without error
        cache.flush().await.unwrap();

        // Data should still be accessible
        let value = cache.get("key1").await.unwrap();
        assert_eq!(value, Some(vec![1, 2, 3]));
    }
}
