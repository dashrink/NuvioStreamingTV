//! Stream resolution for Stremio addons.
//!
//! This module implements stream resolution logic per the Stremio protocol.
//! Streams represent playable video sources (URLs, torrents, YouTube IDs, etc.)
//! for specific content identified by type and ID.
//!
//! # Stremio Stream Protocol
//!
//! Stream endpoints follow the format:
//! - `{baseUrl}/stream/{type}/{id}.json`
//!
//! Where:
//! - `type` is the content type (movie, series, tv, etc.)
//! - `id` is the content identifier (IMDb ID, etc.) with optional video ID for series
//!
//! Response format:
//! ```json
//! {
//!   "streams": [
//!     { "url": "https://...", "quality": "1080p", "name": "HD", ... }
//!   ]
//! }
//! ```
//!
//! # Multi-Addon Aggregation
//!
//! This module supports fetching streams from multiple addons in parallel,
//! with graceful degradation: failures from individual addons don't block
//! results from other addons.

use crate::error::NuvioError;
use crate::stremio_service::fetcher::Fetcher;
use crate::stremio_service::types::{Addon, StremioStream};
use serde::{Deserialize, Serialize};

/// Response structure for stream endpoints per Stremio protocol
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct StreamResponse {
    /// Array of stream objects
    pub streams: Vec<StremioStream>,
}

/// Result from fetching streams from a single addon
#[derive(Debug)]
pub struct AddonStreamResult {
    /// Addon ID that provided these streams
    pub addon_id: String,

    /// Addon name for display purposes
    pub addon_name: String,

    /// Result: either streams or an error
    pub result: Result<Vec<StremioStream>, NuvioError>,
}

impl AddonStreamResult {
    /// Creates a successful result
    pub fn success(addon_id: String, addon_name: String, streams: Vec<StremioStream>) -> Self {
        Self {
            addon_id,
            addon_name,
            result: Ok(streams),
        }
    }

    /// Creates an error result
    pub fn error(addon_id: String, addon_name: String, error: NuvioError) -> Self {
        Self {
            addon_id,
            addon_name,
            result: Err(error),
        }
    }

    /// Returns true if this result is successful
    pub fn is_success(&self) -> bool {
        self.result.is_ok()
    }

    /// Returns the streams if successful, None otherwise
    pub fn streams(&self) -> Option<&Vec<StremioStream>> {
        self.result.as_ref().ok()
    }

    /// Returns the error if failed, None otherwise
    pub fn get_error(&self) -> Option<&NuvioError> {
        self.result.as_ref().err()
    }
}

/// Fetches streams for a specific content ID from a single addon.
///
/// # Arguments
///
/// * `fetcher` - HTTP fetcher instance for making requests
/// * `addon` - Addon to fetch streams from
/// * `content_type` - Content type (e.g., "movie", "series")
/// * `content_id` - Content identifier (e.g., "tt1234567" for IMDb ID, "tt1234567:1:1" for series)
///
/// # Returns
///
/// A `StreamResponse` containing array of streams, or an error
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
/// use nuvio_core::stremio_service::stream::fetch_streams;
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
///     // let response = fetch_streams(&fetcher, &addon, "movie", "tt1234567").await;
/// }
/// ```
pub async fn fetch_streams(
    fetcher: &Fetcher,
    addon: &Addon,
    content_type: &str,
    content_id: &str,
) -> Result<StreamResponse, NuvioError> {
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

    // Build stream URL per Stremio protocol
    let stream_url = build_stream_url(base_url, content_type, content_id);

    // Fetch stream JSON with retry
    let response_text = fetcher.fetch_with_retry(&stream_url).await?;

    // Parse response
    let stream_response: StreamResponse = serde_json::from_str(&response_text).map_err(|e| {
        NuvioError::serialization(format!(
            "Failed to parse stream response from addon {}: {}",
            addon.id, e
        ))
    })?;

    Ok(stream_response)
}

/// Builds the stream URL according to Stremio protocol.
///
/// # Arguments
///
/// * `base_url` - Base URL of the addon (without trailing slash)
/// * `content_type` - Content type (e.g., "movie", "series")
/// * `content_id` - Content identifier
///
/// # Returns
///
/// Formatted stream URL string
fn build_stream_url(base_url: &str, content_type: &str, content_id: &str) -> String {
    format!(
        "{}/stream/{}/{}.json",
        base_url,
        urlencoding::encode(content_type),
        urlencoding::encode(content_id)
    )
}

/// Resolves streams for a content ID from multiple addons in parallel.
///
/// This function fetches streams from all enabled addons concurrently.
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
/// Vector of `AddonStreamResult`, one per addon. Each result contains either
/// streams or an error, allowing partial success.
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::stream::resolve_streams;
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
///     let results = resolve_streams(&fetcher, &addons, "movie", "tt1234567").await;
///
///     // Count successful results
///     let success_count = results.iter().filter(|r| r.is_success()).count();
///     println!("Got streams from {} addons", success_count);
/// }
/// ```
pub async fn resolve_streams(
    fetcher: &Fetcher,
    addons: &[Addon],
    content_type: &str,
    content_id: &str,
) -> Vec<AddonStreamResult> {
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
            let addon_clone = (*addon).clone();
            let fetcher = fetcher.clone();
            let content_type = content_type.to_string();
            let content_id = content_id.to_string();

            tokio::spawn(async move {
                match fetch_streams(&fetcher, &addon_clone, &content_type, &content_id).await {
                    Ok(response) => {
                        // Enrich streams with addon information
                        let mut enriched_streams = response.streams;
                        for stream in &mut enriched_streams {
                            stream.addon_id = Some(addon_id.clone());
                            stream.addon_name = Some(addon_name.clone());
                            stream.addon = Some(addon_clone.manifest_url.clone());
                        }
                        AddonStreamResult::success(addon_id, addon_name, enriched_streams)
                    }
                    Err(e) => AddonStreamResult::error(addon_id, addon_name, e),
                }
            })
        })
        .collect();

    // Wait for all tasks to complete
    let results = futures::future::join_all(tasks).await;

    // Convert task results to AddonStreamResult
    results
        .into_iter()
        .map(|r| match r {
            Ok(result) => result,
            Err(join_err) => {
                // Task panicked - create error result
                AddonStreamResult::error(
                    "unknown".to_string(),
                    "unknown".to_string(),
                    NuvioError::network_error(format!("Task panicked: {}", join_err)),
                )
            }
        })
        .collect()
}

/// Aggregates all successful streams from multiple addons into a single list.
///
/// This is a convenience function that extracts streams from `resolve_streams`
/// results and flattens them into a single vector, discarding errors.
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
/// Vector of all streams from successful addon responses, sorted by addon priority
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::stream::aggregate_streams;
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
///     let streams = aggregate_streams(&fetcher, &addons, "movie", "tt1234567").await;
///     println!("Found {} total streams", streams.len());
/// }
/// ```
pub async fn aggregate_streams(
    fetcher: &Fetcher,
    addons: &[Addon],
    content_type: &str,
    content_id: &str,
) -> Vec<StremioStream> {
    // Get results from all addons
    let results = resolve_streams(fetcher, addons, content_type, content_id).await;

    // Create a mapping of addon_id to priority for sorting
    let addon_priorities: std::collections::HashMap<String, i32> =
        addons.iter().map(|a| (a.id.clone(), a.priority)).collect();

    // Collect all streams with their addon priority
    let mut streams_with_priority: Vec<(i32, StremioStream)> = results
        .into_iter()
        .filter_map(|result| {
            if let Ok(streams) = result.result {
                let priority = addon_priorities.get(&result.addon_id).copied().unwrap_or(0);
                Some(streams.into_iter().map(move |s| (priority, s)))
            } else {
                None
            }
        })
        .flatten()
        .collect();

    // Sort by priority (higher priority first)
    streams_with_priority.sort_by(|a, b| b.0.cmp(&a.0));

    // Extract streams (discard priority)
    streams_with_priority.into_iter().map(|(_, s)| s).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[test]
    fn test_build_stream_url() {
        let url = build_stream_url("https://example.com", "movie", "tt1234567");
        assert_eq!(url, "https://example.com/stream/movie/tt1234567.json");
    }

    #[test]
    fn test_build_stream_url_with_special_chars() {
        let url = build_stream_url("https://example.com", "series", "tt1234567:1:1");
        assert!(url.contains("stream/series/"));
        assert!(url.contains(".json"));
    }

    #[test]
    fn test_stream_response_serde() {
        let json = r#"{"streams": []}"#;
        let response: StreamResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.streams.len(), 0);
    }

    #[test]
    fn test_stream_response_with_streams() {
        let json = r#"{
            "streams": [
                {"url": "https://example.com/video.mp4"},
                {"ytId": "dQw4w9WgXcQ"}
            ]
        }"#;
        let response: StreamResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.streams.len(), 2);
        assert_eq!(
            response.streams[0].url,
            Some("https://example.com/video.mp4".to_string())
        );
        assert_eq!(response.streams[1].yt_id, Some("dQw4w9WgXcQ".to_string()));
    }

    #[test]
    fn test_addon_stream_result_success() {
        let streams = vec![StremioStream::new_url("https://test.com".to_string())];
        let result = AddonStreamResult::success(
            "addon1".to_string(),
            "Addon 1".to_string(),
            streams.clone(),
        );

        assert!(result.is_success());
        assert_eq!(result.streams().unwrap().len(), 1);
        assert!(result.get_error().is_none());
    }

    #[test]
    fn test_addon_stream_result_error() {
        let error = NuvioError::network_error("Test error");
        let result = AddonStreamResult::error("addon1".to_string(), "Addon 1".to_string(), error);

        assert!(!result.is_success());
        assert!(result.streams().is_none());
        assert!(result.get_error().is_some());
    }

    #[tokio::test]
    async fn test_fetch_streams_disabled_addon() {
        let fetcher = Fetcher::new().unwrap();
        let mut addon = Addon::new(
            "test".to_string(),
            "https://test.com/manifest.json".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
        );
        addon.enabled = false;

        let result = fetch_streams(&fetcher, &addon, "movie", "tt1234567").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_fetch_streams_success() {
        // Start mock server
        let mock_server = MockServer::start().await;

        // Mock the stream endpoint
        Mock::given(method("GET"))
            .and(path("/stream/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "streams": [
                    {
                        "url": "https://example.com/video1.mp4",
                        "name": "1080p",
                        "quality": "1080p"
                    },
                    {
                        "url": "https://example.com/video2.mp4",
                        "name": "720p",
                        "quality": "720p"
                    }
                ]
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

        let result = fetch_streams(&fetcher, &addon, "movie", "tt1234567").await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response.streams.len(), 2);
        assert_eq!(response.streams[0].name, Some("1080p".to_string()));
        assert_eq!(response.streams[1].name, Some("720p".to_string()));
    }

    #[tokio::test]
    async fn test_fetch_streams_empty_response() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/stream/movie/tt9999999.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "streams": []
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

        let result = fetch_streams(&fetcher, &addon, "movie", "tt9999999").await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap().streams.len(), 0);
    }

    #[tokio::test]
    async fn test_fetch_streams_invalid_json() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/stream/movie/tt1234567.json"))
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

        let result = fetch_streams(&fetcher, &addon, "movie", "tt1234567").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_fetch_streams_http_error() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/stream/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&mock_server)
            .await;

        let fetcher = Fetcher::new().unwrap();
        let addon = Addon::new(
            "test".to_string(),
            format!("{}/manifest.json", mock_server.uri()),
            "Test".to_string(),
            "1.0.0".to_string(),
        );

        let result = fetch_streams(&fetcher, &addon, "movie", "tt1234567").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_resolve_streams_multiple_addons() {
        let mock_server1 = MockServer::start().await;
        let mock_server2 = MockServer::start().await;

        // Mock first addon with 2 streams
        Mock::given(method("GET"))
            .and(path("/stream/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "streams": [
                    {"url": "https://addon1.com/video1.mp4", "name": "Addon1 HD"},
                    {"url": "https://addon1.com/video2.mp4", "name": "Addon1 SD"}
                ]
            })))
            .mount(&mock_server1)
            .await;

        // Mock second addon with 1 stream
        Mock::given(method("GET"))
            .and(path("/stream/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "streams": [
                    {"url": "https://addon2.com/video.mp4", "name": "Addon2 HD"}
                ]
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

        let results = resolve_streams(&fetcher, &addons, "movie", "tt1234567").await;

        // Should have 2 results
        assert_eq!(results.len(), 2);

        // Both should be successful
        assert!(results[0].is_success());
        assert!(results[1].is_success());

        // Check stream counts
        assert_eq!(results[0].streams().unwrap().len(), 2);
        assert_eq!(results[1].streams().unwrap().len(), 1);

        // Verify addon info was enriched
        let streams1 = results[0].streams().unwrap();
        assert_eq!(streams1[0].addon_id, Some("addon1".to_string()));
        assert_eq!(streams1[0].addon_name, Some("Addon 1".to_string()));
    }

    #[tokio::test]
    async fn test_resolve_streams_partial_failure() {
        let mock_server = MockServer::start().await;

        // Mock successful addon
        Mock::given(method("GET"))
            .and(path("/stream/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "streams": [
                    {"url": "https://working.com/video.mp4", "name": "HD"}
                ]
            })))
            .mount(&mock_server)
            .await;

        let fetcher = Fetcher::new().unwrap();
        let addons = vec![
            Addon::new(
                "working".to_string(),
                format!("{}/manifest.json", mock_server.uri()),
                "Working Addon".to_string(),
                "1.0.0".to_string(),
            ),
            Addon::new(
                "broken".to_string(),
                "https://invalid-domain-12345.com/manifest.json".to_string(),
                "Broken Addon".to_string(),
                "1.0.0".to_string(),
            ),
        ];

        let results = resolve_streams(&fetcher, &addons, "movie", "tt1234567").await;

        // Should have 2 results
        assert_eq!(results.len(), 2);

        // First should succeed, second should fail
        assert!(results[0].is_success());
        assert!(!results[1].is_success());

        // But we still get the successful result
        assert_eq!(results[0].streams().unwrap().len(), 1);
    }

    #[tokio::test]
    async fn test_resolve_streams_disabled_addons_filtered() {
        let fetcher = Fetcher::new().unwrap();
        let mut addon = Addon::new(
            "test".to_string(),
            "https://test.com/manifest.json".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
        );
        addon.enabled = false;

        let results = resolve_streams(&fetcher, &[addon], "movie", "tt1234567").await;

        // Should return empty results (no enabled addons)
        assert_eq!(results.len(), 0);
    }

    #[tokio::test]
    async fn test_aggregate_streams() {
        let mock_server1 = MockServer::start().await;
        let mock_server2 = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/stream/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "streams": [
                    {"url": "https://addon1.com/video.mp4", "name": "Addon1"}
                ]
            })))
            .mount(&mock_server1)
            .await;

        Mock::given(method("GET"))
            .and(path("/stream/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "streams": [
                    {"url": "https://addon2.com/video.mp4", "name": "Addon2"}
                ]
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
        addon1.priority = 10; // Higher priority

        let mut addon2 = Addon::new(
            "addon2".to_string(),
            format!("{}/manifest.json", mock_server2.uri()),
            "Addon 2".to_string(),
            "1.0.0".to_string(),
        );
        addon2.priority = 5; // Lower priority

        let addons = vec![addon1, addon2];
        let streams = aggregate_streams(&fetcher, &addons, "movie", "tt1234567").await;

        // Should have 2 streams total
        assert_eq!(streams.len(), 2);

        // Higher priority addon should come first
        assert_eq!(streams[0].addon_id, Some("addon1".to_string()));
        assert_eq!(streams[1].addon_id, Some("addon2".to_string()));
    }

    #[tokio::test]
    async fn test_aggregate_streams_with_failures() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/stream/movie/tt1234567.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "streams": [
                    {"url": "https://working.com/video.mp4"}
                ]
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

        let streams = aggregate_streams(&fetcher, &addons, "movie", "tt1234567").await;

        // Should only have streams from working addon
        assert_eq!(streams.len(), 1);
        assert_eq!(streams[0].addon_id, Some("working".to_string()));
    }
}
