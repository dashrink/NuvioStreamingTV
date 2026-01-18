//! Meta type - core metadata for content items in the Nuvio Streaming TV platform.
//!
//! This type represents the foundational metadata for movies, TV shows, and other
//! streaming content. It includes identifiers for external services (IMDB, TMDB) and
//! visual assets (posters, backgrounds).

use serde::{Deserialize, Serialize};
use uniffi;

/// Metadata for a content item (movie, TV show, etc.)
///
/// All fields use UniFFI-compatible types (no lifetimes, no generics) to ensure
/// safe FFI export to Kotlin and Swift.
#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Meta {
    /// Unique identifier for this content item
    pub id: String,

    /// Display name of the content
    pub name: String,

    /// Optional description or synopsis
    pub description: Option<String>,

    /// Optional URL to poster image
    pub poster_url: Option<String>,

    /// Optional URL to background image
    pub background_url: Option<String>,

    /// Optional IMDB identifier (e.g., "tt1234567")
    pub imdb_id: Option<String>,

    /// Optional TMDB (The Movie Database) identifier
    pub tmdb_id: Option<i32>,
}

impl Meta {
    /// Creates a new Meta instance with required fields
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::types::meta::Meta;
    ///
    /// let meta = Meta::new("123".to_string(), "The Matrix".to_string());
    /// assert_eq!(meta.id, "123");
    /// assert_eq!(meta.name, "The Matrix");
    /// ```
    pub fn new(id: String, name: String) -> Self {
        Self {
            id,
            name,
            description: None,
            poster_url: None,
            background_url: None,
            imdb_id: None,
            tmdb_id: None,
        }
    }

    /// Creates a Meta instance with all fields specified
    #[allow(clippy::too_many_arguments)]
    pub fn with_details(
        id: String,
        name: String,
        description: Option<String>,
        poster_url: Option<String>,
        background_url: Option<String>,
        imdb_id: Option<String>,
        tmdb_id: Option<i32>,
    ) -> Self {
        Self {
            id,
            name,
            description,
            poster_url,
            background_url,
            imdb_id,
            tmdb_id,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_meta_new() {
        let meta = Meta::new("test-id".to_string(), "Test Movie".to_string());
        assert_eq!(meta.id, "test-id");
        assert_eq!(meta.name, "Test Movie");
        assert_eq!(meta.description, None);
        assert_eq!(meta.poster_url, None);
        assert_eq!(meta.background_url, None);
        assert_eq!(meta.imdb_id, None);
        assert_eq!(meta.tmdb_id, None);
    }

    #[test]
    fn test_meta_with_details() {
        let meta = Meta::with_details(
            "123".to_string(),
            "The Matrix".to_string(),
            Some("A computer hacker learns about the true nature of reality.".to_string()),
            Some("https://example.com/poster.jpg".to_string()),
            Some("https://example.com/background.jpg".to_string()),
            Some("tt0133093".to_string()),
            Some(603),
        );

        assert_eq!(meta.id, "123");
        assert_eq!(meta.name, "The Matrix");
        assert!(meta.description.is_some());
        assert!(meta.poster_url.is_some());
        assert!(meta.background_url.is_some());
        assert_eq!(meta.imdb_id, Some("tt0133093".to_string()));
        assert_eq!(meta.tmdb_id, Some(603));
    }

    #[test]
    fn test_meta_serde_roundtrip() {
        // Test serialization and deserialization with all fields populated
        let original = Meta::with_details(
            "456".to_string(),
            "Inception".to_string(),
            Some(
                "A thief who steals corporate secrets through dream-sharing technology."
                    .to_string(),
            ),
            Some("https://example.com/inception-poster.jpg".to_string()),
            Some("https://example.com/inception-bg.jpg".to_string()),
            Some("tt1375666".to_string()),
            Some(27205),
        );

        // Serialize to JSON
        let json = serde_json::to_string(&original).expect("Failed to serialize Meta");

        // Deserialize back
        let deserialized: Meta = serde_json::from_str(&json).expect("Failed to deserialize Meta");

        // Verify no data loss
        assert_eq!(original, deserialized);
        assert_eq!(deserialized.id, "456");
        assert_eq!(deserialized.name, "Inception");
        assert_eq!(deserialized.tmdb_id, Some(27205));
    }

    #[test]
    fn test_meta_serde_roundtrip_minimal() {
        // Test serialization with only required fields
        let original = Meta::new("789".to_string(), "Minimal Movie".to_string());

        // Serialize to JSON
        let json = serde_json::to_string(&original).expect("Failed to serialize Meta");

        // Deserialize back
        let deserialized: Meta = serde_json::from_str(&json).expect("Failed to deserialize Meta");

        // Verify no data loss
        assert_eq!(original, deserialized);
        assert_eq!(deserialized.id, "789");
        assert_eq!(deserialized.name, "Minimal Movie");
        assert_eq!(deserialized.description, None);
        assert_eq!(deserialized.tmdb_id, None);
    }

    #[test]
    fn test_meta_optional_fields() {
        // Test that Option<T> fields handle None correctly
        let meta = Meta::new("test".to_string(), "Test".to_string());

        assert!(meta.description.is_none());
        assert!(meta.poster_url.is_none());
        assert!(meta.background_url.is_none());
        assert!(meta.imdb_id.is_none());
        assert!(meta.tmdb_id.is_none());
    }

    #[test]
    fn test_meta_clone() {
        // Verify Clone trait works correctly
        let original = Meta::with_details(
            "clone-test".to_string(),
            "Clone Test".to_string(),
            Some("Testing clone".to_string()),
            None,
            None,
            Some("tt9999999".to_string()),
            Some(12345),
        );

        let cloned = original.clone();
        assert_eq!(original, cloned);
    }

    #[test]
    fn test_meta_debug() {
        // Verify Debug trait works correctly
        let meta = Meta::new("debug-test".to_string(), "Debug Test".to_string());
        let debug_string = format!("{:?}", meta);

        assert!(debug_string.contains("Meta"));
        assert!(debug_string.contains("debug-test"));
        assert!(debug_string.contains("Debug Test"));
    }
}
