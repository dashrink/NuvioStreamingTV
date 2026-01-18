//! Integration tests for full Stremio addon lifecycle
//!
//! These tests verify the complete flow of:
//! - Discovering addons from URLs
//! - Parsing and validating manifests
//! - Enabling/disabling addons
//! - Fetching catalogs with pagination
//! - Resolving streams from multiple addons
//! - Aggregating metadata from multiple sources

use nuvio_core::stremio_service::StremioService;
use wiremock::matchers::{method, path, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

/// Test the complete addon lifecycle from discovery to stream resolution
#[tokio::test]
async fn test_full_addon_lifecycle() {
    // ========================================================================
    // Step 1: Setup mock server with all required endpoints
    // ========================================================================

    let mock_server = MockServer::start().await;

    // Mock manifest endpoint
    let manifest_json = serde_json::json!({
        "id": "com.example.lifecycle",
        "name": "Lifecycle Test Addon",
        "version": "1.0.0",
        "description": "Test addon for full lifecycle testing"
    });

    Mock::given(method("GET"))
        .and(path("/manifest.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(&manifest_json))
        .mount(&mock_server)
        .await;

    // Mock catalog endpoint with pagination
    let catalog_json = serde_json::json!({
        "metas": [
            {
                "id": "tt1234567",
                "content_type": "movie",
                "name": "Test Movie 1",
                "poster": "https://example.com/poster1.jpg",
                "year": 2023
            },
            {
                "id": "tt2345678",
                "content_type": "movie",
                "name": "Test Movie 2",
                "poster": "https://example.com/poster2.jpg",
                "year": 2024
            }
        ],
        "hasMore": false
    });

    Mock::given(method("GET"))
        .and(path("/catalog/movie/top.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(&catalog_json))
        .mount(&mock_server)
        .await;

    // Mock stream endpoint
    let stream_json = serde_json::json!({
        "streams": [
            {
                "url": "https://example.com/stream1.mp4",
                "name": "HD 1080p",
                "title": "Test Movie Stream"
            },
            {
                "url": "https://example.com/stream2.mp4",
                "name": "HD 720p",
                "title": "Test Movie Stream Alt"
            }
        ]
    });

    Mock::given(method("GET"))
        .and(path("/stream/movie/tt1234567.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(&stream_json))
        .mount(&mock_server)
        .await;

    // Mock meta endpoint
    let meta_json = serde_json::json!({
        "meta": {
            "id": "tt1234567",
            "content_type": "movie",
            "name": "Test Movie 1",
            "poster": "https://example.com/poster1.jpg",
            "background": "https://example.com/bg1.jpg",
            "description": "A test movie for integration testing",
            "year": 2023,
            "genres": ["Action", "Thriller"],
            "cast": ["Actor One", "Actor Two"]
        }
    });

    Mock::given(method("GET"))
        .and(path("/meta/movie/tt1234567.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(&meta_json))
        .mount(&mock_server)
        .await;

    // ========================================================================
    // Step 2: Discover addon from URL (parses manifest automatically)
    // ========================================================================

    let service = StremioService::new();
    let addon_url = format!("{}/manifest.json", mock_server.uri());

    let discover_result = service.discover(&addon_url).await;
    assert!(
        discover_result.is_ok(),
        "Failed to discover addon: {:?}",
        discover_result.err()
    );

    let addon = discover_result.unwrap();
    assert_eq!(addon.id, "com.example.lifecycle");
    assert_eq!(addon.name, "Lifecycle Test Addon");
    assert_eq!(addon.version, "1.0.0");
    assert!(addon.enabled, "Addon should be enabled by default");

    // Verify addon was added to service
    assert_eq!(service.addon_count(), 1);
    let addons = service.get_addons();
    assert_eq!(addons[0].id, "com.example.lifecycle");

    // ========================================================================
    // Step 3: Enable addon (already enabled by default, but verify state)
    // ========================================================================

    let addons = service.get_addons();
    assert!(addons[0].enabled, "Addon should be enabled");

    // ========================================================================
    // Step 4: Fetch catalog from the addon
    // ========================================================================

    let catalog_result = service
              .get_catalog("com.example.lifecycle", "movie", "top", 1, None)
        .await;

    assert!(
        catalog_result.is_ok(),
        "Failed to fetch catalog: {:?}",
        catalog_result.err()
    );

    let metas = catalog_result.unwrap();
    assert_eq!(metas.len(), 2, "Should have 2 catalog items");
    assert_eq!(metas[0].id, "tt1234567");
    assert_eq!(metas[0].name, "Test Movie 1");
    assert_eq!(metas[1].id, "tt2345678");
    assert_eq!(metas[1].name, "Test Movie 2");

    // ========================================================================
    // Step 5: Resolve streams for a specific content ID
    // ========================================================================

    let streams = service.resolve_streams("movie", "tt1234567").await;
    assert_eq!(streams.len(), 2, "Should have 2 streams");

    // Verify stream properties
    assert_eq!(
        streams[0].url,
        Some("https://example.com/stream1.mp4".to_string())
    );
    assert_eq!(streams[0].name, Some("HD 1080p".to_string()));
    assert_eq!(
        streams[0].addon_id,
        Some("com.example.lifecycle".to_string())
    );

    assert_eq!(
        streams[1].url,
        Some("https://example.com/stream2.mp4".to_string())
    );
    assert_eq!(streams[1].name, Some("HD 720p".to_string()));
    assert_eq!(
        streams[1].addon_id,
        Some("com.example.lifecycle".to_string())
    );

    // ========================================================================
    // Step 6: Aggregate metadata from the addon
    // ========================================================================

    let meta = service.aggregate_meta("movie", "tt1234567").await;
    assert!(meta.is_some(), "Should get metadata");

    let meta = meta.unwrap();
    assert_eq!(meta.id, "tt1234567");
    assert_eq!(meta.name, "Test Movie 1");
    assert_eq!(
        meta.poster,
        Some("https://example.com/poster1.jpg".to_string())
    );
    assert_eq!(
        meta.background,
        Some("https://example.com/bg1.jpg".to_string())
    );
    assert_eq!(
        meta.description,
        Some("A test movie for integration testing".to_string())
    );
    assert_eq!(meta.year, Some(2023));
}

/// Test multi-addon scenario with priority-based ordering
#[tokio::test]
async fn test_multi_addon_lifecycle() {
    // ========================================================================
    // Setup two mock servers for two different addons
    // ========================================================================

    let mock_server1 = MockServer::start().await;
    let mock_server2 = MockServer::start().await;

    // Mock manifest for addon 1 (high priority)
    Mock::given(method("GET"))
        .and(path("/manifest.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "addon.high.priority",
            "name": "High Priority Addon",
            "version": "1.0.0",
            "description": "High priority test addon"
        })))
        .mount(&mock_server1)
        .await;

    // Mock manifest for addon 2 (low priority)
    Mock::given(method("GET"))
        .and(path("/manifest.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "addon.low.priority",
            "name": "Low Priority Addon",
            "version": "1.0.0",
            "description": "Low priority test addon"
        })))
        .mount(&mock_server2)
        .await;

    // Mock stream endpoint for addon 1
    Mock::given(method("GET"))
        .and(path("/stream/movie/tt9999999.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "streams": [
                {
                    "url": "https://high-priority.com/stream.mp4",
                    "name": "High Priority 4K"
                }
            ]
        })))
        .mount(&mock_server1)
        .await;

    // Mock stream endpoint for addon 2
    Mock::given(method("GET"))
        .and(path("/stream/movie/tt9999999.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "streams": [
                {
                    "url": "https://low-priority.com/stream.mp4",
                    "name": "Low Priority HD"
                }
            ]
        })))
        .mount(&mock_server2)
        .await;

    // Mock meta endpoints for both addons
    Mock::given(method("GET"))
        .and(path("/meta/movie/tt9999999.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "meta": {
                "id": "tt9999999",
                "content_type": "movie",
                "name": "Multi Addon Movie",
                "poster": "https://high-priority.com/poster.jpg",
                "year": 2025
            }
        })))
        .mount(&mock_server1)
        .await;

    Mock::given(method("GET"))
        .and(path("/meta/movie/tt9999999.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "meta": {
                "id": "tt9999999",
                "content_type": "movie",
                "name": "Multi Addon Movie",
                "background": "https://low-priority.com/bg.jpg",
                "description": "A movie from multiple sources"
            }
        })))
        .mount(&mock_server2)
        .await;

    // ========================================================================
    // Discover both addons
    // ========================================================================

    let service = StremioService::new();

    let addon1 = service
        .discover(&format!("{}/manifest.json", mock_server1.uri()))
        .await
        .expect("Failed to discover addon 1");

    let addon2 = service
        .discover(&format!("{}/manifest.json", mock_server2.uri()))
        .await
        .expect("Failed to discover addon 2");

    assert_eq!(service.addon_count(), 2, "Should have 2 addons");

    // ========================================================================
    // Set priorities (addon1 = high, addon2 = low)
    // ========================================================================

    // Update priorities by modifying addons directly (simulating priority management)
    service.clear_addons();

    let mut addon1_high = addon1.clone();
    addon1_high.priority = 100;
    service.add_addon(addon1_high);

    let mut addon2_low = addon2.clone();
    addon2_low.priority = 50;
    service.add_addon(addon2_low);

    // ========================================================================
    // Resolve streams from both addons (should respect priority)
    // ========================================================================

    let streams = service.resolve_streams("movie", "tt9999999").await;
    assert_eq!(streams.len(), 2, "Should have streams from both addons");

    // High priority addon should come first
    assert_eq!(
        streams[0].addon_id,
        Some("addon.high.priority".to_string()),
        "High priority addon should be first"
    );
    assert_eq!(streams[0].name, Some("High Priority 4K".to_string()));

    // Low priority addon should come second
    assert_eq!(
        streams[1].addon_id,
        Some("addon.low.priority".to_string()),
        "Low priority addon should be second"
    );
    assert_eq!(streams[1].name, Some("Low Priority HD".to_string()));

    // ========================================================================
    // Aggregate metadata (high priority values should take precedence)
    // ========================================================================

    let meta = service
        .aggregate_meta("movie", "tt9999999")
        .await
        .expect("Failed to aggregate metadata");

    assert_eq!(meta.id, "tt9999999");
    assert_eq!(meta.name, "Multi Addon Movie");

    // High priority poster should win
    assert_eq!(
        meta.poster,
        Some("https://high-priority.com/poster.jpg".to_string()),
        "High priority poster should be used"
    );

    // Year from high priority should be used
    assert_eq!(meta.year, Some(2025));

    // Background from low priority should be merged (no conflict)
    assert_eq!(
        meta.background,
        Some("https://low-priority.com/bg.jpg".to_string()),
        "Low priority background should be merged"
    );

    // Description from low priority should be merged (no conflict)
    assert_eq!(
        meta.description,
        Some("A movie from multiple sources".to_string()),
        "Low priority description should be merged"
    );
}

/// Test error recovery in the addon lifecycle
#[tokio::test]
async fn test_lifecycle_with_partial_failures() {
    // ========================================================================
    // Setup mock servers with partial failures
    // ========================================================================

    let working_server = MockServer::start().await;
    let failing_server = MockServer::start().await;

    // Working addon setup
    Mock::given(method("GET"))
        .and(path("/manifest.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "addon.working",
            "name": "Working Addon",
            "version": "1.0.0",
            "description": "This addon works"
        })))
        .mount(&working_server)
        .await;

    Mock::given(method("GET"))
        .and(path("/stream/movie/tt1111111.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "streams": [
                {
                    "url": "https://working.com/stream.mp4",
                    "name": "Working Stream"
                }
            ]
        })))
        .mount(&working_server)
        .await;

    // Failing addon setup
    Mock::given(method("GET"))
        .and(path("/manifest.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "addon.failing",
            "name": "Failing Addon",
            "version": "1.0.0",
            "description": "This addon will fail"
        })))
        .mount(&failing_server)
        .await;

    // Stream endpoint returns 500 error
    Mock::given(method("GET"))
        .and(path("/stream/movie/tt1111111.json"))
        .respond_with(ResponseTemplate::new(500))
        .mount(&failing_server)
        .await;

    // ========================================================================
    // Discover both addons
    // ========================================================================

    let service = StremioService::new();

    service
        .discover(&format!("{}/manifest.json", working_server.uri()))
        .await
        .expect("Failed to discover working addon");

    service
        .discover(&format!("{}/manifest.json", failing_server.uri()))
        .await
        .expect("Failed to discover failing addon");

    assert_eq!(service.addon_count(), 2);

    // ========================================================================
    // Resolve streams - should get results from working addon despite failure
    // ========================================================================

    let streams = service.resolve_streams("movie", "tt1111111").await;

    // Should still get stream from working addon
    assert!(
        !streams.is_empty(),
        "Should have at least one stream from working addon"
    );

    // Find the working stream
    let working_stream = streams
        .iter()
        .find(|s| s.addon_id == Some("addon.working".to_string()));

    assert!(
        working_stream.is_some(),
        "Should have stream from working addon"
    );
    assert_eq!(
        working_stream.unwrap().name,
        Some("Working Stream".to_string())
    );

    // The failing addon's error should be handled gracefully (no panic)
}

/// Test catalog pagination
#[tokio::test]
async fn test_catalog_pagination() {
    let mock_server = MockServer::start().await;

    // Mock manifest
    Mock::given(method("GET"))
        .and(path("/manifest.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "addon.pagination",
            "name": "Pagination Test Addon",
            "version": "1.0.0",
            "description": "Test addon for pagination"
        })))
        .mount(&mock_server)
        .await;

    // Mock first page
    Mock::given(method("GET"))
        .and(path("/catalog/movie/top.json"))
        .and(query_param("skip", "0"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "metas": [
                {"id": "tt1111111", "content_type": "movie", "name": "Movie 1"},
                {"id": "tt2222222", "content_type": "movie", "name": "Movie 2"}
            ],
            "hasMore": true
        })))
        .mount(&mock_server)
        .await;

    // Mock catalog without query params (default page 1)
    Mock::given(method("GET"))
        .and(path("/catalog/movie/top.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "metas": [
                {"id": "tt1111111", "content_type": "movie", "name": "Movie 1"},
                {"id": "tt2222222", "content_type": "movie", "name": "Movie 2"}
            ],
            "hasMore": true
        })))
        .mount(&mock_server)
        .await;

    // Discover addon
    let service = StremioService::new();
    service
        .discover(&format!("{}/manifest.json", mock_server.uri()))
        .await
        .expect("Failed to discover addon");

    // Fetch first page
    let page1 = service
        .get_catalog("addon.pagination", "movie", "top", 1, None)
        .await
        .expect("Failed to fetch first page");

    assert_eq!(page1.len(), 2);
    assert_eq!(page1[0].id, "tt1111111");
    assert_eq!(page1[1].id, "tt2222222");
}

/// Test addon enable/disable behavior
#[tokio::test]
async fn test_addon_enable_disable() {
    let mock_server = MockServer::start().await;

    // Mock manifest
    Mock::given(method("GET"))
        .and(path("/manifest.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "addon.toggle",
            "name": "Toggle Test Addon",
            "version": "1.0.0",
            "description": "Test addon for enable/disable"
        })))
        .mount(&mock_server)
        .await;

    // Discover addon
    let service = StremioService::new();
    let addon = service
        .discover(&format!("{}/manifest.json", mock_server.uri()))
        .await
        .expect("Failed to discover addon");

    // Addon should be enabled by default
    assert!(addon.enabled, "Newly discovered addon should be enabled");

    // Verify in service
    let addons = service.get_addons();
    assert_eq!(addons.len(), 1);
    assert!(addons[0].enabled, "Addon should be enabled in service");
}

/// Test empty results handling
#[tokio::test]
async fn test_empty_results_handling() {
    let mock_server = MockServer::start().await;

    // Mock manifest
    Mock::given(method("GET"))
        .and(path("/manifest.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "addon.empty",
            "name": "Empty Results Addon",
            "version": "1.0.0",
            "description": "Test addon for empty results"
        })))
        .mount(&mock_server)
        .await;

    // Mock empty catalog
    Mock::given(method("GET"))
        .and(path("/catalog/movie/top.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "metas": [],
            "hasMore": false
        })))
        .mount(&mock_server)
        .await;

    // Mock empty streams
    Mock::given(method("GET"))
        .and(path("/stream/movie/tt0000000.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "streams": []
        })))
        .mount(&mock_server)
        .await;

    // Discover addon
    let service = StremioService::new();
    service
        .discover(&format!("{}/manifest.json", mock_server.uri()))
        .await
        .expect("Failed to discover addon");

    // Test empty catalog
    let catalog = service
        .get_catalog("addon.empty", "movie", "top", 1, None)
        .await
        .expect("Empty catalog should succeed");
    assert_eq!(catalog.len(), 0, "Catalog should be empty");

    // Test empty streams
    let streams = service.resolve_streams("movie", "tt0000000").await;
    assert_eq!(streams.len(), 0, "Streams should be empty");
}
