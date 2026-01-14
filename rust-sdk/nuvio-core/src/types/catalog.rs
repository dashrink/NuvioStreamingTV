//! Catalog type - represents a collection or category of content in the Nuvio Streaming TV platform.
//!
//! This type represents a catalog (e.g., "Action Movies", "New Releases", "Trending Shows")
//! that contains references to multiple content items. It uses item IDs rather than embedding
//! full Meta objects to keep the FFI boundary simple and efficient.

use serde::{Deserialize, Serialize};
use uniffi;

/// A catalog or collection of content items (movies, TV shows, etc.)
///
/// All fields use UniFFI-compatible types (no lifetimes, no generics) to ensure
/// safe FFI export to Kotlin and Swift.
#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Catalog {
    /// Unique identifier for this catalog
    pub id: String,

    /// Display name of the catalog (e.g., "Action Movies", "Trending Now")
    pub name: String,

    /// Optional description of the catalog
    pub description: Option<String>,

    /// List of content item IDs contained in this catalog
    /// References Meta.id values to avoid embedding full objects across FFI
    pub item_ids: Vec<String>,

    /// Optional URL to catalog cover/banner image
    pub cover_url: Option<String>,

    /// Optional sort order for displaying this catalog (lower numbers appear first)
    pub sort_order: Option<i32>,
}

impl Catalog {
    /// Creates a new Catalog instance with required fields
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::types::catalog::Catalog;
    ///
    /// let catalog = Catalog::new("cat-123".to_string(), "Action Movies".to_string());
    /// assert_eq!(catalog.id, "cat-123");
    /// assert_eq!(catalog.name, "Action Movies");
    /// assert_eq!(catalog.item_ids.len(), 0);
    /// ```
    pub fn new(id: String, name: String) -> Self {
        Self {
            id,
            name,
            description: None,
            item_ids: Vec::new(),
            cover_url: None,
            sort_order: None,
        }
    }

    /// Creates a Catalog instance with item IDs
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::types::catalog::Catalog;
    ///
    /// let items = vec!["item-1".to_string(), "item-2".to_string()];
    /// let catalog = Catalog::with_items("cat-123".to_string(), "Action Movies".to_string(), items);
    /// assert_eq!(catalog.item_ids.len(), 2);
    /// ```
    pub fn with_items(id: String, name: String, item_ids: Vec<String>) -> Self {
        Self {
            id,
            name,
            description: None,
            item_ids,
            cover_url: None,
            sort_order: None,
        }
    }

    /// Creates a Catalog instance with all fields specified
    #[allow(clippy::too_many_arguments)]
    pub fn with_details(
        id: String,
        name: String,
        description: Option<String>,
        item_ids: Vec<String>,
        cover_url: Option<String>,
        sort_order: Option<i32>,
    ) -> Self {
        Self {
            id,
            name,
            description,
            item_ids,
            cover_url,
            sort_order,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_catalog_new() {
        let catalog = Catalog::new("test-catalog".to_string(), "Test Catalog".to_string());
        assert_eq!(catalog.id, "test-catalog");
        assert_eq!(catalog.name, "Test Catalog");
        assert_eq!(catalog.description, None);
        assert_eq!(catalog.item_ids.len(), 0);
        assert_eq!(catalog.cover_url, None);
        assert_eq!(catalog.sort_order, None);
    }

    #[test]
    fn test_catalog_with_items() {
        let items = vec!["movie-1".to_string(), "movie-2".to_string(), "movie-3".to_string()];
        let catalog = Catalog::with_items("action-movies".to_string(), "Action Movies".to_string(), items.clone());

        assert_eq!(catalog.id, "action-movies");
        assert_eq!(catalog.name, "Action Movies");
        assert_eq!(catalog.item_ids, items);
        assert_eq!(catalog.item_ids.len(), 3);
    }

    #[test]
    fn test_catalog_with_details() {
        let items = vec!["show-1".to_string(), "show-2".to_string()];
        let catalog = Catalog::with_details(
            "trending".to_string(),
            "Trending Now".to_string(),
            Some("The hottest content right now".to_string()),
            items.clone(),
            Some("https://example.com/trending-cover.jpg".to_string()),
            Some(1),
        );

        assert_eq!(catalog.id, "trending");
        assert_eq!(catalog.name, "Trending Now");
        assert_eq!(catalog.description, Some("The hottest content right now".to_string()));
        assert_eq!(catalog.item_ids, items);
        assert_eq!(catalog.cover_url, Some("https://example.com/trending-cover.jpg".to_string()));
        assert_eq!(catalog.sort_order, Some(1));
    }

    #[test]
    fn test_catalog_serde_roundtrip() {
        // Test serialization and deserialization with all fields populated
        let items = vec![
            "item-1".to_string(),
            "item-2".to_string(),
            "item-3".to_string(),
            "item-4".to_string(),
        ];
        let original = Catalog::with_details(
            "new-releases".to_string(),
            "New Releases".to_string(),
            Some("Fresh content added this week".to_string()),
            items,
            Some("https://example.com/new-releases.jpg".to_string()),
            Some(2),
        );

        // Serialize to JSON
        let json = serde_json::to_string(&original).expect("Failed to serialize Catalog");

        // Deserialize back
        let deserialized: Catalog = serde_json::from_str(&json).expect("Failed to deserialize Catalog");

        // Verify no data loss
        assert_eq!(original, deserialized);
        assert_eq!(deserialized.id, "new-releases");
        assert_eq!(deserialized.name, "New Releases");
        assert_eq!(deserialized.item_ids.len(), 4);
        assert_eq!(deserialized.sort_order, Some(2));
    }

    #[test]
    fn test_catalog_serde_roundtrip_minimal() {
        // Test serialization with only required fields
        let original = Catalog::new("minimal-catalog".to_string(), "Minimal Catalog".to_string());

        // Serialize to JSON
        let json = serde_json::to_string(&original).expect("Failed to serialize Catalog");

        // Deserialize back
        let deserialized: Catalog = serde_json::from_str(&json).expect("Failed to deserialize Catalog");

        // Verify no data loss
        assert_eq!(original, deserialized);
        assert_eq!(deserialized.id, "minimal-catalog");
        assert_eq!(deserialized.name, "Minimal Catalog");
        assert_eq!(deserialized.description, None);
        assert_eq!(deserialized.item_ids.len(), 0);
        assert_eq!(deserialized.cover_url, None);
        assert_eq!(deserialized.sort_order, None);
    }

    #[test]
    fn test_catalog_optional_fields() {
        // Test that Option<T> fields handle None correctly
        let catalog = Catalog::new("test".to_string(), "Test".to_string());

        assert!(catalog.description.is_none());
        assert!(catalog.cover_url.is_none());
        assert!(catalog.sort_order.is_none());
        assert!(catalog.item_ids.is_empty());
    }

    #[test]
    fn test_catalog_clone() {
        // Verify Clone trait works correctly
        let items = vec!["clone-item-1".to_string(), "clone-item-2".to_string()];
        let original = Catalog::with_details(
            "clone-test".to_string(),
            "Clone Test".to_string(),
            Some("Testing clone".to_string()),
            items,
            Some("https://example.com/clone.jpg".to_string()),
            Some(99),
        );

        let cloned = original.clone();
        assert_eq!(original, cloned);
        assert_eq!(cloned.item_ids.len(), 2);
    }

    #[test]
    fn test_catalog_debug() {
        // Verify Debug trait works correctly
        let catalog = Catalog::new("debug-test".to_string(), "Debug Test".to_string());
        let debug_string = format!("{:?}", catalog);

        assert!(debug_string.contains("Catalog"));
        assert!(debug_string.contains("debug-test"));
        assert!(debug_string.contains("Debug Test"));
    }

    #[test]
    fn test_catalog_empty_items() {
        // Test catalog with empty item list
        let catalog = Catalog::with_items("empty".to_string(), "Empty Catalog".to_string(), Vec::new());
        assert_eq!(catalog.item_ids.len(), 0);
        assert!(catalog.item_ids.is_empty());
    }

    #[test]
    fn test_catalog_large_items_list() {
        // Test catalog with many items
        let items: Vec<String> = (0..100).map(|i| format!("item-{}", i)).collect();
        let catalog = Catalog::with_items("large".to_string(), "Large Catalog".to_string(), items);

        assert_eq!(catalog.item_ids.len(), 100);
        assert_eq!(catalog.item_ids[0], "item-0");
        assert_eq!(catalog.item_ids[99], "item-99");
    }

    #[test]
    fn test_catalog_partial_eq() {
        // Verify PartialEq trait works correctly
        let items1 = vec!["item-1".to_string(), "item-2".to_string()];
        let items2 = vec!["item-1".to_string(), "item-2".to_string()];
        let items3 = vec!["item-3".to_string(), "item-4".to_string()];

        let catalog1 = Catalog::with_items("test".to_string(), "Test".to_string(), items1);
        let catalog2 = Catalog::with_items("test".to_string(), "Test".to_string(), items2);
        let catalog3 = Catalog::with_items("test".to_string(), "Test".to_string(), items3);

        assert_eq!(catalog1, catalog2);
        assert_ne!(catalog1, catalog3);
    }
}
