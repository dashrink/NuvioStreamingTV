//! Meta aggregation for Stremio addons.
//!
//! This module implements metadata aggregation logic per the Stremio protocol.
//! Meta objects contain detailed information about content items (movies, series, etc.)
//! including posters, descriptions, cast, ratings, and other metadata.
//!
//! # Stremio Meta Protocol
//!
//! Meta endpoints follow the format:
//! - `{baseUrl}/meta/{type}/{id}.json`
//!
//! Where:
//! - `type` is the content type (movie, series, tv, etc.)
//! - `id` is the content identifier (IMDb ID, etc.)
//!
//! Response format:
//! ```json
//! {
//!   "meta": {
//!     "id": "tt1234567",
//!     "type": "movie",
//!     "name": "Example Movie",
//!     "poster": "https://...",
//!     ...
//!   }
//! }
//! ```
//!
//! # Multi-Addon Aggregation and Merging
//!
//! This module supports fetching metadata from multiple addons in parallel,
//! with priority-based conflict resolution. When multiple addons provide
//! metadata for the same content, fields from higher-priority addons take
//! precedence during merging.

use crate::error::NuvioError;
use crate::stremio_service::fetcher::Fetcher;
use crate::stremio_service::types::{Addon, StremioMeta};
use serde::{Deserialize, Serialize};

/// Response structure for meta endpoints per Stremio protocol
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct MetaResponse {
    /// Meta object containing detailed content information
    pub meta: StremioMeta,
}

/// Result from fetching metadata from a single addon
#[derive(Debug)]
pub struct AddonMetaResult {
    /// Addon ID that provided this metadata
    pub addon_id: String,

    /// Addon name for display purposes
    pub addon_name: String,

    /// Addon priority for conflict resolution
    pub addon_priority: i32,

    /// Result: either metadata or an error
    pub result: Result<StremioMeta, NuvioError>,
}

impl AddonMetaResult {
    /// Creates a successful result
    pub fn success(addon_id: String, addon_name: String, addon_priority: i32, meta: StremioMeta) -> Self {
        Self {
            addon_id,
            addon_name,
            addon_priority,
            result: Ok(meta),
        }
    }

    /// Creates an error result
    pub fn error(
        addon_id: String,
        addon_name: String,
        addon_priority: i32,
        error: NuvioError,
    ) -> Self {
        Self {
            addon_id,
            addon_name,
            addon_priority,
            result: Err(error),
        }
    }

    /// Returns true if this result is successful
    pub fn is_success(&self) -> bool {
        self.result.is_ok()
    }

    /// Returns the metadata if successful, None otherwise
    pub fn meta(&self) -> Option<&StremioMeta> {
        self.result.as_ref().ok()
    }

    /// Returns the error if failed, None otherwise
    pub fn get_error(&self) -> Option<&NuvioError> {
        self.result.as_ref().err()
    }
}

/// Fetches metadata for a specific content ID from a single addon.
///
/// # Arguments
///
/// * `fetcher` - HTTP fetcher instance for making requests
/// * `addon` - Addon to fetch metadata from
/// * `content_type` - Content type (e.g., "movie", "series")
/// * `content_id` - Content identifier (e.g., "tt1234567" for IMDb ID)
///
/// # Returns
///
/// A `MetaResponse` containing the metadata object, or an error
///
/// # Errors
///
/// Returns `NuvioError` if:
/// - Addon URL is missing
/// - HTTP request fails
/// - Response JSON is invalid
/// - Response structure doesn't match protocol
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::meta::fetch_meta;
/// use nuvio_core::stremio_service::fetcher::Fetcher;
/// use nuvio_core::stremio_service::types::Addon;
///
/// async fn example() {
///     let fetcher = Fetcher::new().unwrap();
///     let addon = Addon::new(
///         "com.example".to_string(),
///         "https://example.com/manifest.json".to_string(),
///         "Example".to_string(),
///         "1.0.0".to_string(),
///     );
///
///     // let response = fetch_meta(&fetcher, &addon, "movie", "tt1234567").await;
/// }
/// ```
pub async fn fetch_meta(
    fetcher: &Fetcher,
    addon: &Addon,
    content_type: &str,
    content_id: &str,
) -> Result<MetaResponse, NuvioError> {
    // Ensure addon is enabled
    if !addon.enabled {
        return Err(NuvioError::addon_not_found(format!(
            "Addon {} is disabled",
            addon.id
        )));
    }

    // Extract base URL from addon manifest_url
    let base_url = addon
        .manifest_url
        .trim_end_matches("manifest.json")
        .trim_end_matches('/');

    // Build meta URL per Stremio protocol
    let meta_url = build_meta_url(base_url, content_type, content_id);

    // Fetch meta JSON with retry
    let response_text = fetcher.fetch_with_retry(&meta_url).await?;

    // Parse response
    let meta_response: MetaResponse = serde_json::from_str(&response_text).map_err(|e| {
        NuvioError::serialization(format!(
            "Failed to parse meta response from addon {}: {}",
            addon.id, e
        ))
    })?;

    Ok(meta_response)
}

/// Builds the meta URL according to Stremio protocol.
///
/// # Arguments
///
/// * `base_url` - Base URL of the addon (without trailing slash)
/// * `content_type` - Content type (e.g., "movie", "series")
/// * `content_id` - Content identifier
///
/// # Returns
///
/// Formatted meta URL string
fn build_meta_url(base_url: &str, content_type: &str, content_id: &str) -> String {
    format!(
        "{}/meta/{}/{}.json",
        base_url,
        urlencoding::encode(content_type),
        urlencoding::encode(content_id)
    )
}

/// Resolves metadata for a content ID from multiple addons in parallel.
///
/// This function fetches metadata from all enabled addons concurrently.
/// Individual addon failures don't prevent results from other addons.
///
/// # Arguments
///
/// * `fetcher` - HTTP fetcher instance
/// * `addons` - Slice of addons to query
/// * `content_type` - Content type (e.g., "movie", "series")
/// * `content_id` - Content identifier
///
/// # Returns
///
/// Vector of `AddonMetaResult`, one per addon. Each result contains either
/// metadata or an error, allowing partial success.
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::meta::resolve_meta;
/// use nuvio_core::stremio_service::fetcher::Fetcher;
/// use nuvio_core::stremio_service::types::Addon;
///
/// async fn example() {
///     let fetcher = Fetcher::new().unwrap();
///     let addons = vec![
///         Addon::new(
///             "addon1".to_string(),
///             "https://addon1.com/manifest.json".to_string(),
///             "Addon 1".to_string(),
///             "1.0.0".to_string(),
///         ),
///     ];
///
///     let results = resolve_meta(&fetcher, &addons, "movie", "tt1234567").await;
///
///     // Count successful results
///     let success_count = results.iter().filter(|r| r.is_success()).count();
///     println!("Got metadata from {} addons", success_count);
/// }
/// ```
pub async fn resolve_meta(
    fetcher: &Fetcher,
    addons: &[Addon],
    content_type: &str,
    content_id: &str,
) -> Vec<AddonMetaResult> {
    // Filter to only enabled addons
    let enabled_addons: Vec<&Addon> = addons.iter().filter(|a| a.enabled).collect();

    if enabled_addons.is_empty() {
        return Vec::new();
    }

    // Spawn concurrent tasks for each addon
    let tasks: Vec<_> = enabled_addons
        .iter()
        .map(|addon| {
            let addon_id = addon.id.clone();
            let addon_name = addon.name.clone();
            let addon_priority = addon.priority;
            let addon_clone = (*addon).clone();
            let fetcher = fetcher.clone();
            let content_type = content_type.to_string();
            let content_id = content_id.to_string();

            tokio::spawn(async move {
                match fetch_meta(&fetcher, &addon_clone, &content_type, &content_id).await {
                    Ok(response) => AddonMetaResult::success(
                        addon_id,
                        addon_name,
                        addon_priority,
                        response.meta,
                    ),
                    Err(e) => AddonMetaResult::error(addon_id, addon_name, addon_priority, e),
                }
            })
        })
        .collect();

    // Wait for all tasks to complete
    let results: Vec<Result<AddonMetaResult, tokio::task::JoinError>> = futures::future::join_all(tasks).await;

    // Convert task results to AddonMetaResult
    results
        .into_iter()
        .map(|r| match r {
            Ok(result) => result,
            Err(join_err) => {
                // Task panicked - create error result
                AddonMetaResult::error(
                    "unknown".to_string(),
                    "unknown".to_string(),
                    0,
                    NuvioError::network_error(format!("Task panicked: {}", join_err)),
                )
            }
        })
        .collect()
}

/// Merges metadata from multiple addons with priority-based conflict resolution.
///
/// When multiple addons provide metadata for the same content, this function
/// merges them intelligently:
/// - Higher priority addon fields override lower priority fields
/// - Only non-empty fields are merged (None/empty values don't override existing values)
/// - Arrays (genres, cast, etc.) are merged and deduplicated
///
/// # Arguments
///
/// * `results` - Metadata results from multiple addons (includes priority)
///
/// # Returns
///
/// Merged metadata object with best information from all sources, or None if no
/// successful results
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::meta::{resolve_meta, merge_meta};
/// use nuvio_core::stremio_service::fetcher::Fetcher;
/// use nuvio_core::stremio_service::types::Addon;
///
/// async fn example() {
///     let fetcher = Fetcher::new().unwrap();
///     let mut addon1 = Addon::new(
///         "addon1".to_string(),
///         "https://addon1.com/manifest.json".to_string(),
///         "Addon 1".to_string(),
///         "1.0.0".to_string(),
///     );
///     addon1.priority = 10; // Higher priority
///
///     let addons = vec![addon1];
///     let results = resolve_meta(&fetcher, &addons, "movie", "tt1234567").await;
///
///     if let Some(merged) = merge_meta(&results) {
///         println!("Merged metadata: {:?}", merged);
///     }
/// }
/// ```
pub fn merge_meta(results: &[AddonMetaResult]) -> Option<StremioMeta> {
    // Sort results by priority (higher priority first)
    let mut sorted_results: Vec<&AddonMetaResult> =
        results.iter().filter(|r| r.is_success()).collect();

    if sorted_results.is_empty() {
        return None;
    }

    sorted_results.sort_by(|a, b| b.addon_priority.cmp(&a.addon_priority));

    // Start with the highest priority metadata as base
    let base_meta = sorted_results[0].meta()?.clone();

    // If only one result, return it directly
    if sorted_results.len() == 1 {
        return Some(base_meta);
    }

    // Merge remaining metadata into base
    let mut merged = base_meta;

    for result in sorted_results.iter().skip(1) {
        if let Some(meta) = result.meta() {
            // Only merge non-empty optional fields that are currently None
            if merged.poster.is_none() && meta.poster.is_some() {
                merged.poster = meta.poster.clone();
            }
            if merged.poster_shape.is_none() && meta.poster_shape.is_some() {
                merged.poster_shape = meta.poster_shape.clone();
            }
            if merged.background.is_none() && meta.background.is_some() {
                merged.background = meta.background.clone();
            }
            if merged.logo.is_none() && meta.logo.is_some() {
                merged.logo = meta.logo.clone();
            }
            if merged.description.is_none() && meta.description.is_some() {
                merged.description = meta.description.clone();
            }
            if merged.release_info.is_none() && meta.release_info.is_some() {
                merged.release_info = meta.release_info.clone();
            }
            if merged.imdb_rating.is_none() && meta.imdb_rating.is_some() {
                merged.imdb_rating = meta.imdb_rating.clone();
            }
            if merged.year.is_none() && meta.year.is_some() {
                merged.year = meta.year;
            }
            if merged.runtime.is_none() && meta.runtime.is_some() {
                merged.runtime = meta.runtime.clone();
            }
            if merged.certification.is_none() && meta.certification.is_some() {
                merged.certification = meta.certification.clone();
            }
            if merged.country.is_none() && meta.country.is_some() {
                merged.country = meta.country.clone();
            }
            if merged.imdb_id.is_none() && meta.imdb_id.is_some() {
                merged.imdb_id = meta.imdb_id.clone();
            }
            if merged.slug.is_none() && meta.slug.is_some() {
                merged.slug = meta.slug.clone();
            }
            if merged.released.is_none() && meta.released.is_some() {
                merged.released = meta.released.clone();
            }

            // Merge array fields (genres, cast, director, writer) with deduplication
            if let Some(meta_genres) = &meta.genres {
                if let Some(ref mut merged_genres) = merged.genres {
                    for genre in meta_genres {
                        if !merged_genres.contains(genre) {
                            merged_genres.push(genre.clone());
                        }
                    }
                } else {
                    merged.genres = Some(meta_genres.clone());
                }
            }

            if let Some(meta_cast) = &meta.cast {
                if let Some(ref mut merged_cast) = merged.cast {
                    for actor in meta_cast {
                        if !merged_cast.contains(actor) {
                            merged_cast.push(actor.clone());
                        }
                    }
                } else {
                    merged.cast = Some(meta_cast.clone());
                }
            }

            if let Some(meta_director) = &meta.director {
                if let Some(ref mut merged_director) = merged.director {
                    for director in meta_director {
                        if !merged_director.contains(director) {
                            merged_director.push(director.clone());
                        }
                    }
                } else {
                    merged.director = Some(meta_director.clone());
                }
            }

            if let Some(meta_writer) = &meta.writer {
                if let Some(ref mut merged_writer) = merged.writer {
                    for writer in meta_writer {
                        if !merged_writer.contains(writer) {
                            merged_writer.push(writer.clone());
                        }
                    }
                } else {
                    merged.writer = Some(meta_writer.clone());
                }
            }

            // Merge behavior hints
            if let Some(meta_hints) = &meta.behavior_hints {
                if let Some(ref mut merged_hints) = merged.behavior_hints {
                    for (key, value) in meta_hints {
                        merged_hints
                            .entry(key.clone())
                            .or_insert_with(|| value.clone());
                    }
                } else {
                    merged.behavior_hints = Some(meta_hints.clone());
                }
            }
        }
    }

    Some(merged)
}

/// Aggregates metadata from multiple addons and returns the merged result.
///
/// This is a convenience function that combines `resolve_meta` and `merge_meta`.
/// It fetches metadata from all addons in parallel and merges the results using
/// priority-based conflict resolution.
///
/// # Arguments
///
/// * `fetcher` - HTTP fetcher instance
/// * `addons` - Slice of addons to query
/// * `content_type` - Content type (e.g., "movie", "series")
/// * `content_id` - Content identifier
///
/// # Returns
///
/// Merged metadata object or None if no addon returned metadata
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::meta::aggregate_meta;
/// use nuvio_core::stremio_service::fetcher::Fetcher;
/// use nuvio_core::stremio_service::types::Addon;
///
/// async fn example() {
///     let fetcher = Fetcher::new().unwrap();
///     let addons = vec![
///         Addon::new(
///             "addon1".to_string(),
///             "https://addon1.com/manifest.json".to_string(),
///             "Addon 1".to_string(),
///             "1.0.0".to_string(),
///         ),
///     ];
///
///     if let Some(meta) = aggregate_meta(&fetcher, &addons, "movie", "tt1234567").await {
///         println!("Found metadata: {}", meta.name);
///     }
/// }
/// ```
pub async fn aggregate_meta(
    fetcher: &Fetcher,
    addons: &[Addon],
    content_type: &str,
    content_id: &str,
) -> Option<StremioMeta> {
    let results = resolve_meta(fetcher, addons, content_type, content_id).await;
    merge_meta(&results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[test]
    fn test_build_meta_url() {
        let url = build_meta_url("https://example.com", "movie", "tt1234567");
        assert_eq!(url, "https://example.com/meta/movie/tt1234567.json");
    }

    #[test]
    fn test_build_meta_url_with_special_chars() {
        let url = build_meta_url("https://example.com", "series", "tt1234567:1:1");
        assert!(url.contains("meta/series/"));
        assert!(url.contains(".json"));
    }

    #[test]
    fn test_meta_response_serde() {
        let json = r#"{"meta": {"id": "tt1234567", "content_type": "movie", "name": "Test"}}"#;
        let response: MetaResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.meta.id, "tt1234567");
        assert_eq!(response.meta.content_type, "movie");
        assert_eq!(response.meta.name, "Test");
    }

    #[test]
    fn test_addon_meta_result_success() {
        let meta = StremioMeta::new("tt123".to_string(), "movie".to_string(), "Test".to_string());
        let result = AddonMetaResult::success(
            "addon1".to_string(),
            "Addon 1".to_string(),
            10,
            meta.clone(),
        );

        assert!(result.is_success());
        assert_eq!(result.meta().unwrap().id, "tt123");
        assert_eq!(result.addon_priority, 10);
        assert!(result.get_error().is_none());
    }

    #[test]
    fn test_addon_meta_result_error() {
        let error = NuvioError::network_error("Test error");
        let result = AddonMetaResult::error("addon1".to_string(), "Addon 1".to_string(), 5, error);

        assert!(!result.is_success());
        assert!(result.meta().is_none());
        assert!(result.get_error().is_some());
        assert_eq!(result.addon_priority, 5);
    }

    #[tokio::test]
    async fn test_fetch_meta_disabled_addon() {
        let fetcher = Fetcher::new().unwrap();
        let mut addon = Addon::new(
            "test".to_string(),
            "https://test.com/manifest.json".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
        );
        addon.enabled = false;

        let result = fetch_meta(&fetcher, &addon, "movie", "tt1234567").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_fetch_meta_success() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/meta/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "meta": {
                    "id": "tt1234567",
                    "content_type": "movie",
                    "name": "Test Movie",
                    "poster": "https://example.com/poster.jpg",
                    "year": 2024
                }
            })))
            .mount(&mock_server)
            .await;

        let fetcher = Fetcher::new().unwrap();
        let addon = Addon::new(
            "test".to_string(),
            format!("{}/manifest.json", mock_server.uri()),
            "Test".to_string(),
            "1.0.0".to_string(),
        );

        let result = fetch_meta(&fetcher, &addon, "movie", "tt1234567").await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response.meta.id, "tt1234567");
        assert_eq!(response.meta.name, "Test Movie");
        assert_eq!(response.meta.year, Some(2024));
    }

    #[tokio::test]
    async fn test_fetch_meta_invalid_json() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/meta/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_string("invalid json"))
            .mount(&mock_server)
            .await;

        let fetcher = Fetcher::new().unwrap();
        let addon = Addon::new(
            "test".to_string(),
            format!("{}/manifest.json", mock_server.uri()),
            "Test".to_string(),
            "1.0.0".to_string(),
        );

        let result = fetch_meta(&fetcher, &addon, "movie", "tt1234567").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_resolve_meta_multiple_addons() {
        let mock_server1 = MockServer::start().await;
        let mock_server2 = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/meta/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "meta": {
                    "id": "tt1234567",
                    "content_type": "movie",
                    "name": "Test Movie",
                    "poster": "https://addon1.com/poster.jpg"
                }
            })))
            .mount(&mock_server1)
            .await;

        Mock::given(method("GET"))
            .and(path("/meta/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "meta": {
                    "id": "tt1234567",
                    "content_type": "movie",
                    "name": "Test Movie",
                    "background": "https://addon2.com/bg.jpg"
                }
            })))
            .mount(&mock_server2)
            .await;

        let fetcher = Fetcher::new().unwrap();
        let addons = vec![
            Addon::new(
                "addon1".to_string(),
                format!("{}/manifest.json", mock_server1.uri()),
                "Addon 1".to_string(),
                "1.0.0".to_string(),
            ),
            Addon::new(
                "addon2".to_string(),
                format!("{}/manifest.json", mock_server2.uri()),
                "Addon 2".to_string(),
                "1.0.0".to_string(),
            ),
        ];

        let results = resolve_meta(&fetcher, &addons, "movie", "tt1234567").await;

        assert_eq!(results.len(), 2);
        assert!(results[0].is_success());
        assert!(results[1].is_success());
    }

    #[test]
    fn test_merge_meta_single_source() {
        let mut meta = StremioMeta::new("tt123".to_string(), "movie".to_string(), "Test".to_string());
        meta.poster = Some("https://example.com/poster.jpg".to_string());
        meta.year = Some(2024);

        let results = vec![AddonMetaResult::success(
            "addon1".to_string(),
            "Addon 1".to_string(),
            10,
            meta.clone(),
        )];

        let merged = merge_meta(&results);
        assert!(merged.is_some());
        let merged = merged.unwrap();
        assert_eq!(merged.id, "tt123");
        assert_eq!(
            merged.poster,
            Some("https://example.com/poster.jpg".to_string())
        );
        assert_eq!(merged.year, Some(2024));
    }

    #[test]
    fn test_merge_meta_priority_precedence() {
        // Higher priority addon
        let mut meta1 = StremioMeta::new("tt123".to_string(), "movie".to_string(), "Test".to_string());
        meta1.poster = Some("https://high-priority.com/poster.jpg".to_string());
        meta1.year = Some(2024);

        // Lower priority addon
        let mut meta2 = StremioMeta::new("tt123".to_string(), "movie".to_string(), "Test".to_string());
        meta2.poster = Some("https://low-priority.com/poster.jpg".to_string());
        meta2.background = Some("https://low-priority.com/bg.jpg".to_string());

        let results = vec![
            AddonMetaResult::success("addon1".to_string(), "Addon 1".to_string(), 10, meta1),
            AddonMetaResult::success("addon2".to_string(), "Addon 2".to_string(), 5, meta2),
        ];

        let merged = merge_meta(&results);
        assert!(merged.is_some());
        let merged = merged.unwrap();

        // Higher priority poster should be used
        assert_eq!(
            merged.poster,
            Some("https://high-priority.com/poster.jpg".to_string())
        );
        // Background from lower priority should be merged (no conflict)
        assert_eq!(
            merged.background,
            Some("https://low-priority.com/bg.jpg".to_string())
        );
        assert_eq!(merged.year, Some(2024));
    }

    #[test]
    fn test_merge_meta_array_deduplication() {
        let mut meta1 = StremioMeta::new("tt123".to_string(), "movie".to_string(), "Test".to_string());
        meta1.genres = Some(vec!["Action".to_string(), "Drama".to_string()]);
        meta1.cast = Some(vec!["Actor A".to_string(), "Actor B".to_string()]);

        let mut meta2 = StremioMeta::new("tt123".to_string(), "movie".to_string(), "Test".to_string());
        meta2.genres = Some(vec!["Drama".to_string(), "Thriller".to_string()]);
        meta2.cast = Some(vec!["Actor B".to_string(), "Actor C".to_string()]);

        let results = vec![
            AddonMetaResult::success("addon1".to_string(), "Addon 1".to_string(), 10, meta1),
            AddonMetaResult::success("addon2".to_string(), "Addon 2".to_string(), 5, meta2),
        ];

        let merged = merge_meta(&results);
        assert!(merged.is_some());
        let merged = merged.unwrap();

        // Genres should be merged without duplicates
        let genres = merged.genres.unwrap();
        assert_eq!(genres.len(), 3);
        assert!(genres.contains(&"Action".to_string()));
        assert!(genres.contains(&"Drama".to_string()));
        assert!(genres.contains(&"Thriller".to_string()));

        // Cast should be merged without duplicates
        let cast = merged.cast.unwrap();
        assert_eq!(cast.len(), 3);
        assert!(cast.contains(&"Actor A".to_string()));
        assert!(cast.contains(&"Actor B".to_string()));
        assert!(cast.contains(&"Actor C".to_string()));
    }

    #[test]
    fn test_merge_meta_no_results() {
        let results: Vec<AddonMetaResult> = vec![];
        let merged = merge_meta(&results);
        assert!(merged.is_none());
    }

    #[test]
    fn test_merge_meta_only_errors() {
        let results = vec![
            AddonMetaResult::error(
                "addon1".to_string(),
                "Addon 1".to_string(),
                10,
                NuvioError::network_error("Error 1"),
            ),
            AddonMetaResult::error(
                "addon2".to_string(),
                "Addon 2".to_string(),
                5,
                NuvioError::network_error("Error 2"),
            ),
        ];

        let merged = merge_meta(&results);
        assert!(merged.is_none());
    }

    #[tokio::test]
    async fn test_aggregate_meta() {
        let mock_server1 = MockServer::start().await;
        let mock_server2 = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/meta/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "meta": {
                    "id": "tt1234567",
                    "content_type": "movie",
                    "name": "Test Movie",
                    "poster": "https://addon1.com/poster.jpg",
                    "genres": ["Action"]
                }
            })))
            .mount(&mock_server1)
            .await;

        Mock::given(method("GET"))
            .and(path("/meta/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "meta": {
                    "id": "tt1234567",
                    "content_type": "movie",
                    "name": "Test Movie",
                    "background": "https://addon2.com/bg.jpg",
                    "genres": ["Action", "Drama"]
                }
            })))
            .mount(&mock_server2)
            .await;

        let fetcher = Fetcher::new().unwrap();
        let mut addon1 = Addon::new(
            "addon1".to_string(),
            format!("{}/manifest.json", mock_server1.uri()),
            "Addon 1".to_string(),
            "1.0.0".to_string(),
        );
        addon1.priority = 10;

        let mut addon2 = Addon::new(
            "addon2".to_string(),
            format!("{}/manifest.json", mock_server2.uri()),
            "Addon 2".to_string(),
            "1.0.0".to_string(),
        );
        addon2.priority = 5;

        let addons = vec![addon1, addon2];
        let meta = aggregate_meta(&fetcher, &addons, "movie", "tt1234567").await;

        assert!(meta.is_some());
        let meta = meta.unwrap();
        assert_eq!(meta.id, "tt1234567");
        assert_eq!(meta.name, "Test Movie");
        // Higher priority poster
        assert_eq!(
            meta.poster,
            Some("https://addon1.com/poster.jpg".to_string())
        );
        // Lower priority background (no conflict)
        assert_eq!(
            meta.background,
            Some("https://addon2.com/bg.jpg".to_string())
        );
        // Merged genres
        assert_eq!(meta.genres.unwrap().len(), 2);
    }

    #[tokio::test]
    async fn test_aggregate_meta_with_failures() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/meta/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "meta": {
                    "id": "tt1234567",
                    "content_type": "movie",
                    "name": "Test Movie"
                }
            })))
            .mount(&mock_server)
            .await;

        let fetcher = Fetcher::new().unwrap();
        let addons = vec![
            Addon::new(
                "working".to_string(),
                format!("{}/manifest.json", mock_server.uri()),
                "Working".to_string(),
                "1.0.0".to_string(),
            ),
            Addon::new(
                "broken".to_string(),
                "https://invalid-12345.com/manifest.json".to_string(),
                "Broken".to_string(),
                "1.0.0".to_string(),
            ),
        ];

        let meta = aggregate_meta(&fetcher, &addons, "movie", "tt1234567").await;

        // Should still get metadata from working addon
        assert!(meta.is_some());
        let meta = meta.unwrap();
        assert_eq!(meta.id, "tt1234567");
        assert_eq!(meta.name, "Test Movie");
    }
}
