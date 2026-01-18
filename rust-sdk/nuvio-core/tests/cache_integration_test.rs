//! Integration tests for cache functionality
//!
//! These tests verify that the cache system works correctly
//! with all three tiers (memory, disk, HTTP).

#[cfg(test)]
mod cache_tests {
    use nuvio_core::cache::{
        cache_key_for_cast, cache_key_for_episodes, cache_key_for_metadata, cache_key_for_streams,
        CacheConfiguration, NuvioCacheManager,
    };
    use tempfile::TempDir;

    #[test]
    fn test_cache_key_generation() {
        // Test metadata cache key
        let key = cache_key_for_metadata("movie".to_string(), "tt1234567".to_string());
        assert_eq!(key, "metadata:movie:tt1234567");

        // Test streams cache key without episode
        let key = cache_key_for_streams("tt1234567".to_string(), None);
        assert_eq!(key, "streams:tt1234567");

        // Test streams cache key with episode
        let key = cache_key_for_streams("tt1234567".to_string(), Some("ep1".to_string()));
        assert_eq!(key, "streams:tt1234567:ep1");

        // Test cast cache key
        let key = cache_key_for_cast("tt1234567".to_string());
        assert_eq!(key, "cast:tt1234567");

        // Test episodes cache key
        let key = cache_key_for_episodes("tt1234567".to_string(), 1);
        assert_eq!(key, "episodes:tt1234567:s1");
    }

    #[test]
    fn test_cache_manager_creation() {
        let temp_dir = TempDir::new().unwrap();
        let config = CacheConfiguration {
            memory_max_items: 100,
            memory_ttl_seconds: 300,
            disk_max_bytes: 10 * 1024 * 1024,
            disk_path: temp_dir.path().join("cache").to_string_lossy().to_string(),
        };

        let cache = NuvioCacheManager::new(config);
        assert!(cache.is_ok(), "Failed to create cache manager");
    }

    #[test]
    fn test_cache_set_and_get() {
        let temp_dir = TempDir::new().unwrap();
        let config = CacheConfiguration {
            memory_max_items: 100,
            memory_ttl_seconds: 300,
            disk_max_bytes: 10 * 1024 * 1024,
            disk_path: temp_dir.path().join("cache").to_string_lossy().to_string(),
        };

        let cache = NuvioCacheManager::new(config).unwrap();

        // Test set and get
        let key = "test_key".to_string();
        let value = vec![1, 2, 3, 4, 5];

        cache.set(key.clone(), value.clone()).unwrap();

        let retrieved = cache.get(key).unwrap();
        assert_eq!(retrieved, Some(value));
    }

    #[test]
    fn test_cache_remove() {
        let temp_dir = TempDir::new().unwrap();
        let config = CacheConfiguration {
            memory_max_items: 100,
            memory_ttl_seconds: 300,
            disk_max_bytes: 10 * 1024 * 1024,
            disk_path: temp_dir.path().join("cache").to_string_lossy().to_string(),
        };

        let cache = NuvioCacheManager::new(config).unwrap();

        // Set a value
        let key = "test_key".to_string();
        let value = vec![1, 2, 3];
        cache.set(key.clone(), value).unwrap();

        // Verify it exists
        assert!(cache.get(key.clone()).unwrap().is_some());

        // Remove it
        cache.remove(key.clone()).unwrap();

        // Verify it's gone
        assert!(cache.get(key).unwrap().is_none());
    }

    #[test]
    fn test_cache_clear() {
        let temp_dir = TempDir::new().unwrap();
        let config = CacheConfiguration {
            memory_max_items: 100,
            memory_ttl_seconds: 300,
            disk_max_bytes: 10 * 1024 * 1024,
            disk_path: temp_dir.path().join("cache").to_string_lossy().to_string(),
        };

        let cache = NuvioCacheManager::new(config).unwrap();

        // Set multiple values
        cache.set("key1".to_string(), vec![1]).unwrap();
        cache.set("key2".to_string(), vec![2]).unwrap();
        cache.set("key3".to_string(), vec![3]).unwrap();

        // Clear the cache
        cache.clear().unwrap();

        // Verify all are gone
        assert!(cache.get("key1".to_string()).unwrap().is_none());
        assert!(cache.get("key2".to_string()).unwrap().is_none());
        assert!(cache.get("key3".to_string()).unwrap().is_none());
    }

    #[test]
    fn test_cache_statistics() {
        let temp_dir = TempDir::new().unwrap();
        let config = CacheConfiguration {
            memory_max_items: 100,
            memory_ttl_seconds: 300,
            disk_max_bytes: 10 * 1024 * 1024,
            disk_path: temp_dir.path().join("cache").to_string_lossy().to_string(),
        };

        let cache = NuvioCacheManager::new(config).unwrap();

        // Initial stats should show zeros
        let stats = cache.stats();
        assert_eq!(stats.hits, 0);
        assert_eq!(stats.misses, 0);

        // Set a value and get it (should be a hit)
        cache.set("key1".to_string(), vec![1, 2, 3]).unwrap();
        let _ = cache.get("key1".to_string()).unwrap();

        // Try to get a non-existent value (should be a miss)
        let _ = cache.get("nonexistent".to_string()).unwrap();

        // Check stats
        let stats = cache.stats();
        assert!(stats.hits > 0, "Expected at least one cache hit");
        assert!(stats.misses > 0, "Expected at least one cache miss");
    }

    #[test]
    fn test_cache_persistence() {
        let temp_dir = TempDir::new().unwrap();
        let cache_path = temp_dir.path().join("cache").to_string_lossy().to_string();

        // Create cache and set a value
        {
            let config = CacheConfiguration {
                memory_max_items: 100,
                memory_ttl_seconds: 300,
                disk_max_bytes: 10 * 1024 * 1024,
                disk_path: cache_path.clone(),
            };

            let cache = NuvioCacheManager::new(config).unwrap();
            cache.set("persistent_key".to_string(), vec![1, 2, 3, 4, 5]).unwrap();
        }

        // Re-create cache (simulating app restart)
        {
            let config = CacheConfiguration {
                memory_max_items: 100,
                memory_ttl_seconds: 300,
                disk_max_bytes: 10 * 1024 * 1024,
                disk_path: cache_path,
            };

            let cache = NuvioCacheManager::new(config).unwrap();

            // Value should still be in disk cache
            let retrieved = cache.get("persistent_key".to_string()).unwrap();
            assert_eq!(retrieved, Some(vec![1, 2, 3, 4, 5]));
        }
    }

    #[test]
    fn test_default_configuration() {
        let temp_dir = TempDir::new().unwrap();

        // Temporarily override the default path for testing
        std::env::set_var("CACHE_PATH", temp_dir.path().to_string_lossy().to_string());

        let cache = NuvioCacheManager::with_defaults();

        // Should successfully create with defaults
        assert!(cache.is_ok(), "Failed to create cache with defaults");
    }
}
