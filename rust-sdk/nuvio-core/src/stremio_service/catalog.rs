//! Catalog fetching with pagination for Stremio addons.
//!
//! This module implements catalog fetching logic per the Stremio protocol,
//! with support for pagination via skip/limit parameters. Catalogs are
//! collections of Meta objects organized by type (movie, series, etc.)
//! and category (trending, popular, genre-based, etc.).
//!
//! # Stremio Catalog Protocol
//!
//! Catalog endpoints follow the format:
//! - Simple: `{baseUrl}/catalog/{type}/{id}.json`
//! - With pagination: `{baseUrl}/catalog/{type}/{id}.json?skip={skip}&limit={limit}`
//! - With extras: `{baseUrl}/catalog/{type}/{id}/{extraArgs}.json`
//!
//! Response format:
//! ```json
//! {
//!   "metas": [
//!     { "id": "tt1234567", "type": "movie", "name": "Example Movie", ... }
//!   ],
//!   "hasMore": true
//! }
//! ```

use crate::error::NuvioError;
use crate::stremio_service::fetcher::Fetcher;
use crate::stremio_service::types::{Manifest, StremioMeta};
use serde::{Deserialize, Serialize};

/// Default page size for catalog pagination
const DEFAULT_PAGE_SIZE: u32 = 20;

/// Response structure for catalog endpoints per Stremio protocol
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct CatalogResponse {
    /// Array of meta objects
    pub metas: Vec<StremioMeta>,

    /// Optional flag indicating if more results are available
    #[serde(rename = "hasMore")]
    pub has_more: Option<bool>,
}

/// Parameters for catalog fetching
#[derive(Debug, Clone)]
pub struct CatalogParams {
    /// Content type (e.g., "movie", "series", "tv")
    pub content_type: String,

    /// Catalog identifier (e.g., "top", "trending", "genre.action")
    pub catalog_id: String,

    /// Number of items to skip (for pagination)
    pub skip: u32,

    /// Maximum number of items to return
    pub limit: u32,

    /// Search query (optional)
    pub search: Option<String>,
}

impl CatalogParams {
    /// Creates new CatalogParams with pagination
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::catalog::CatalogParams;
    ///
    /// let params = CatalogParams::new("movie".to_string(), "top".to_string(), 0, 20);
    /// assert_eq!(params.content_type, "movie");
    /// assert_eq!(params.skip, 0);
    /// assert_eq!(params.limit, 20);
    /// ```
    pub fn new(content_type: String, catalog_id: String, skip: u32, limit: u32) -> Self {
        Self {
            content_type,
            catalog_id,
            skip,
            limit,
            search: None,
        }
    }

    /// Sets the search query
    pub fn with_search(mut self, search: String) -> Self {
        self.search = Some(search);
        self
    }

    /// Creates CatalogParams for a specific page (1-indexed)
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::catalog::CatalogParams;
    ///
    /// let params = CatalogParams::for_page("movie".to_string(), "top".to_string(), 1);
    /// assert_eq!(params.skip, 0);
    ///
    /// let params = CatalogParams::for_page("movie".to_string(), "top".to_string(), 2);
    /// assert_eq!(params.skip, 20);
    /// ```
    pub fn for_page(content_type: String, catalog_id: String, page: u32) -> Self {
        let page = page.max(1); // Ensure page is at least 1
        let skip = (page - 1) * DEFAULT_PAGE_SIZE;
        Self {
            content_type,
            catalog_id,
            skip,
            limit: DEFAULT_PAGE_SIZE,
            search: None,
        }
    }

    /// Creates CatalogParams for the first page
    pub fn first_page(content_type: String, catalog_id: String) -> Self {
        Self::for_page(content_type, catalog_id, 1)
    }
}

/// Fetches a catalog from a Stremio addon with pagination support.
///
/// # Arguments
///
/// * `fetcher` - HTTP fetcher instance for making requests
/// * `manifest` - Addon manifest containing base URL and configuration
/// * `params` - Catalog parameters including type, ID, and pagination
///
/// # Returns
///
/// A `CatalogResponse` containing metas and hasMore flag, or an error
///
/// # Errors
///
/// Returns `NuvioError` if:
/// - Manifest URL is missing
/// - HTTP request fails
/// - Response JSON is invalid
/// - Response structure doesn't match protocol
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::catalog::{fetch_catalog, CatalogParams};
/// use nuvio_core::stremio_service::fetcher::Fetcher;
/// use nuvio_core::stremio_service::types::Manifest;
///
/// async fn example() {
///     let fetcher = Fetcher::new().unwrap();
///     let mut manifest = Manifest::new(
///         "com.example".to_string(),
///         "Example".to_string(),
///         "1.0.0".to_string(),
///         "Test".to_string(),
///     );
///     manifest.url = Some("https://example.com".to_string());
///
///     let params = CatalogParams::first_page("movie".to_string(), "top".to_string());
///     // let response = fetch_catalog(&fetcher, &manifest, &params).await;
/// }
/// ```
pub async fn fetch_catalog(
    fetcher: &Fetcher,
    manifest: &Manifest,
    params: &CatalogParams,
) -> Result<CatalogResponse, NuvioError> {
    // Extract base URL from manifest
    let base_url = manifest
        .url
        .as_ref()
        .ok_or_else(|| NuvioError::validation("Manifest URL is missing"))?;

    // Clean base URL - remove trailing /manifest.json or /
    let base_url = base_url
        .trim_end_matches("manifest.json")
        .trim_end_matches('/');

    // Build catalog URL per Stremio protocol
    let catalog_url = build_catalog_url(base_url, params, manifest.query_params.as_deref());

    // Fetch catalog JSON
    let response_text = fetcher.fetch_with_retry(&catalog_url).await?;

    // Parse response
    let catalog_response: CatalogResponse = serde_json::from_str(&response_text).map_err(|e| {
        NuvioError::serialization(format!("Failed to parse catalog response: {}", e))
    })?;

    Ok(catalog_response)
}

/// Builds the catalog URL according to Stremio protocol.
///
/// Tries to build a URL that's compatible with the Stremio catalog endpoint format.
/// Uses query parameters for pagination (skip/limit).
///
/// # Arguments
///
/// * `base_url` - Base URL of the addon (without trailing slash)
/// * `params` - Catalog parameters
/// * `query_params` - Optional query parameters from manifest
///
/// # Returns
///
/// Formatted catalog URL string
fn build_catalog_url(base_url: &str, params: &CatalogParams, query_params: Option<&str>) -> String {
    let mut url = format!(
        "{}/catalog/{}/{}.json",
        base_url,
        urlencoding::encode(&params.content_type),
        urlencoding::encode(&params.catalog_id)
    );

    // Prepare extra args for path parameter (Stremio v3 style: /catalog/type/id/skip=20&limit=20.json)
    let mut extras_parts = Vec::new();

    // Search
    if let Some(ref search) = params.search {
        if !search.is_empty() {
            extras_parts.push(format!("search={}", urlencoding::encode(search)));
        }
    }

    // Pagination
    if params.skip > 0 {
        extras_parts.push(format!("skip={}", params.skip));
    }
    if params.limit != DEFAULT_PAGE_SIZE {
        extras_parts.push(format!("limit={}", params.limit));
    }

    // Reconstruction of URL if extras exist
    if !extras_parts.is_empty() {
        // Remove the .json suffix added earlier
        url.truncate(url.len() - 5); 
        // Append extras and .json
        url.push('/');
        url.push_str(&extras_parts.join("&"));
        url.push_str(".json");
    }

    // Add manifest query params if present (appended as ?foo=bar)
    let mut query_parts = Vec::new();

    // Add manifest query params if present
    if let Some(qp) = query_params {
        if !qp.is_empty() {
            query_parts.push(qp.to_string());
        }
    }

    if !query_parts.is_empty() {
        url.push('?');
        url.push_str(&query_parts.join("&"));
    }

    url
}

/// Fetches multiple pages of a catalog until all results are retrieved or max pages reached.
///
/// # Arguments
///
/// * `fetcher` - HTTP fetcher instance
/// * `manifest` - Addon manifest
/// * `content_type` - Content type to fetch
/// * `catalog_id` - Catalog identifier
/// * `max_pages` - Maximum number of pages to fetch (prevents infinite loops)
///
/// # Returns
///
/// Vector of all fetched Meta objects across all pages
///
/// # Errors
///
/// Returns error if any page fetch fails
pub async fn fetch_catalog_all_pages(
    fetcher: &Fetcher,
    manifest: &Manifest,
    content_type: String,
    catalog_id: String,
    max_pages: u32,
) -> Result<Vec<StremioMeta>, NuvioError> {
    let mut all_metas = Vec::new();
    let mut page = 1;

    loop {
        if page > max_pages {
            break;
        }

        let params = CatalogParams::for_page(content_type.clone(), catalog_id.clone(), page);
        let response = fetch_catalog(fetcher, manifest, &params).await?;

        // If no metas returned, we're done
        if response.metas.is_empty() {
            break;
        }

        all_metas.extend(response.metas);

        // Check if there are more pages
        match response.has_more {
            Some(true) => {
                page += 1;
            }
            Some(false) | None => {
                // No more pages indicated, or hasMore not provided
                break;
            }
        }
    }

    Ok(all_metas)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_catalog_params_new() {
        let params = CatalogParams::new("movie".to_string(), "top".to_string(), 0, 20);
        assert_eq!(params.content_type, "movie");
        assert_eq!(params.catalog_id, "top");
        assert_eq!(params.skip, 0);
        assert_eq!(params.limit, 20);
    }

    #[test]
    fn test_catalog_params_for_page() {
        // Page 1 should have skip=0
        let params = CatalogParams::for_page("movie".to_string(), "trending".to_string(), 1);
        assert_eq!(params.skip, 0);
        assert_eq!(params.limit, DEFAULT_PAGE_SIZE);

        // Page 2 should have skip=20
        let params = CatalogParams::for_page("series".to_string(), "popular".to_string(), 2);
        assert_eq!(params.skip, 20);
        assert_eq!(params.limit, DEFAULT_PAGE_SIZE);

        // Page 3 should have skip=40
        let params = CatalogParams::for_page("movie".to_string(), "top".to_string(), 3);
        assert_eq!(params.skip, 40);
        assert_eq!(params.limit, DEFAULT_PAGE_SIZE);

        // Page 0 should be treated as page 1
        let params = CatalogParams::for_page("movie".to_string(), "top".to_string(), 0);
        assert_eq!(params.skip, 0);
        assert_eq!(params.limit, DEFAULT_PAGE_SIZE);
    }

    #[test]
    fn test_catalog_params_first_page() {
        let params = CatalogParams::first_page("tv".to_string(), "new".to_string());
        assert_eq!(params.content_type, "tv");
        assert_eq!(params.catalog_id, "new");
        assert_eq!(params.skip, 0);
        assert_eq!(params.limit, DEFAULT_PAGE_SIZE);
    }

    #[test]
    fn test_build_catalog_url_simple() {
        let params = CatalogParams::new("movie".to_string(), "top".to_string(), 0, 20);
        let url = build_catalog_url("https://example.com", &params, None);

        // With default skip=0 and limit=20, no query params should be added
        assert_eq!(url, "https://example.com/catalog/movie/top.json");
    }

    #[test]
    fn test_build_catalog_url_with_pagination() {
        let params = CatalogParams::new("series".to_string(), "trending".to_string(), 20, 20);
        let url = build_catalog_url("https://example.com", &params, None);

        assert!(url.contains("skip=20"));
        // Limit is default (20) so it shouldn't be in URL
        assert!(!url.contains("limit=20"));
        assert!(url.starts_with("https://example.com/catalog/series/trending.json?"));
    }

    #[test]
    fn test_build_catalog_url_with_custom_limit() {
        let params = CatalogParams::new("movie".to_string(), "top".to_string(), 0, 50);
        let url = build_catalog_url("https://example.com", &params, None);

        // Skip is 0 so it shouldn't be in URL
        assert!(!url.contains("skip=0"));
        assert!(url.contains("limit=50"));
    }

    #[test]
    fn test_build_catalog_url_with_query_params() {
        let params = CatalogParams::new("movie".to_string(), "top".to_string(), 0, 20);
        let url = build_catalog_url("https://example.com", &params, Some("key=value&foo=bar"));

        assert!(url.contains("key=value"));
        assert!(url.contains("foo=bar"));
    }

    #[test]
    fn test_build_catalog_url_encoding() {
        let params = CatalogParams::new("movie".to_string(), "genre.sci-fi".to_string(), 0, 20);
        let url = build_catalog_url("https://example.com", &params, None);

        // Should URL encode the catalog ID
        assert!(url.contains("genre.sci-fi") || url.contains("genre%2Esci-fi"));
    }

    #[test]
    fn test_catalog_response_serde() {
        let json = r#"{
            "metas": [
                {
                    "id": "tt1234567",
                    "content_type": "movie",
                    "name": "Test Movie"
                }
            ],
            "hasMore": true
        }"#;

        let response: CatalogResponse = serde_json::from_str(json).expect("Failed to parse");
        assert_eq!(response.metas.len(), 1);
        assert_eq!(response.has_more, Some(true));
        assert_eq!(response.metas[0].id, "tt1234567");
        assert_eq!(response.metas[0].name, "Test Movie");
    }

    #[test]
    fn test_catalog_response_serde_no_has_more() {
        let json = r#"{
            "metas": [
                {
                    "id": "tt9999999",
                    "content_type": "series",
                    "name": "Test Series"
                }
            ]
        }"#;

        let response: CatalogResponse = serde_json::from_str(json).expect("Failed to parse");
        assert_eq!(response.metas.len(), 1);
        assert_eq!(response.has_more, None);
    }

    #[test]
    fn test_catalog_response_serde_empty() {
        let json = r#"{
            "metas": [],
            "hasMore": false
        }"#;

        let response: CatalogResponse = serde_json::from_str(json).expect("Failed to parse");
        assert_eq!(response.metas.len(), 0);
        assert_eq!(response.has_more, Some(false));
    }

    #[tokio::test]
    async fn test_fetch_catalog_missing_url() {
        let fetcher = Fetcher::new().expect("Failed to create fetcher");
        let manifest = Manifest::new(
            "com.test".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
            "Test manifest".to_string(),
        );
        // manifest.url is None

        let params = CatalogParams::first_page("movie".to_string(), "top".to_string());
        let result = fetch_catalog(&fetcher, &manifest, &params).await;

        assert!(result.is_err());
        match result {
            Err(NuvioError::ValidationError { .. }) => {
                // Expected error type
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    #[tokio::test]
    async fn test_fetch_catalog_invalid_json() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/catalog/movie/top.json"))
            .respond_with(ResponseTemplate::new(200).set_body_string("invalid json"))
            .mount(&mock_server)
            .await;

        let fetcher = Fetcher::new().expect("Failed to create fetcher");
        let mut manifest = Manifest::new(
            "com.test".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
            "Test".to_string(),
        );
        manifest.url = Some(mock_server.uri());

        let params = CatalogParams::first_page("movie".to_string(), "top".to_string());
        let result = fetch_catalog(&fetcher, &manifest, &params).await;

        assert!(result.is_err());
        match result {
            Err(NuvioError::SerializationError { .. }) => {
                // Expected error type
            }
            _ => panic!("Expected SerializationError, got: {:?}", result),
        }
    }

    #[tokio::test]
    async fn test_fetch_catalog_success() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        let response_json = r#"{
            "metas": [
                {
                    "id": "tt1234567",
                    "content_type": "movie",
                    "name": "Test Movie 1"
                },
                {
                    "id": "tt2345678",
                    "content_type": "movie",
                    "name": "Test Movie 2"
                }
            ],
            "hasMore": true
        }"#;

        Mock::given(method("GET"))
            .and(path("/catalog/movie/top.json"))
            .respond_with(ResponseTemplate::new(200).set_body_string(response_json))
            .mount(&mock_server)
            .await;

        let fetcher = Fetcher::new().expect("Failed to create fetcher");
        let mut manifest = Manifest::new(
            "com.test".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
            "Test".to_string(),
        );
        manifest.url = Some(mock_server.uri());

        let params = CatalogParams::first_page("movie".to_string(), "top".to_string());
        let result = fetch_catalog(&fetcher, &manifest, &params).await;

        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response.metas.len(), 2);
        assert_eq!(response.has_more, Some(true));
        assert_eq!(response.metas[0].id, "tt1234567");
        assert_eq!(response.metas[1].id, "tt2345678");
    }

    #[tokio::test]
    async fn test_fetch_catalog_empty_results() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        let response_json = r#"{
            "metas": [],
            "hasMore": false
        }"#;

        Mock::given(method("GET"))
            .and(path("/catalog/series/trending.json"))
            .respond_with(ResponseTemplate::new(200).set_body_string(response_json))
            .mount(&mock_server)
            .await;

        let fetcher = Fetcher::new().expect("Failed to create fetcher");
        let mut manifest = Manifest::new(
            "com.test".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
            "Test".to_string(),
        );
        manifest.url = Some(mock_server.uri());

        let params = CatalogParams::first_page("series".to_string(), "trending".to_string());
        let result = fetch_catalog(&fetcher, &manifest, &params).await;

        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response.metas.len(), 0);
        assert_eq!(response.has_more, Some(false));
    }

    #[tokio::test]
    async fn test_fetch_catalog_pagination() {
        use wiremock::matchers::{method, path, query_param};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        // Page 1
        let page1_json = r#"{
            "metas": [
                {"id": "tt1111111", "content_type": "movie", "name": "Movie 1"}
            ],
            "hasMore": true
        }"#;

        Mock::given(method("GET"))
            .and(path("/catalog/movie/top.json"))
            .and(query_param("skip", "20"))
            .and(query_param("skip", "20"))
            // limit is default so not sent
            // .and(query_param("limit", "20"))
            .respond_with(ResponseTemplate::new(200).set_body_string(page1_json))
            .mount(&mock_server)
            .await;

        let fetcher = Fetcher::new().expect("Failed to create fetcher");
        let mut manifest = Manifest::new(
            "com.test".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
            "Test".to_string(),
        );
        manifest.url = Some(mock_server.uri());

        // Fetch page 2 (skip=20)
        let params = CatalogParams::for_page("movie".to_string(), "top".to_string(), 2);
        let result = fetch_catalog(&fetcher, &manifest, &params).await;

        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response.metas.len(), 1);
        assert_eq!(response.has_more, Some(true));
    }

    #[tokio::test]
    async fn test_fetch_catalog_all_pages() {
        use wiremock::matchers::{method, path, query_param};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        // Page 1 (no query params since skip=0 and limit=DEFAULT_PAGE_SIZE)
        let page1_json = r#"{
            "metas": [
                {"id": "tt1111111", "content_type": "movie", "name": "Movie 1"},
                {"id": "tt2222222", "content_type": "movie", "name": "Movie 2"}
            ],
            "hasMore": true
        }"#;

        Mock::given(method("GET"))
            .and(path("/catalog/movie/top.json"))
            .respond_with(ResponseTemplate::new(200).set_body_string(page1_json))
            .up_to_n_times(1)
            .mount(&mock_server)
            .await;

        // Page 2 (with skip=20 query param)
        let page2_json = r#"{
            "metas": [
                {"id": "tt3333333", "content_type": "movie", "name": "Movie 3"}
            ],
            "hasMore": false
        }"#;

        Mock::given(method("GET"))
            .and(path("/catalog/movie/top.json"))
            .and(query_param("skip", "20"))
            .respond_with(ResponseTemplate::new(200).set_body_string(page2_json))
            .mount(&mock_server)
            .await;

        let fetcher = Fetcher::new().expect("Failed to create fetcher");
        let mut manifest = Manifest::new(
            "com.test".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
            "Test".to_string(),
        );
        manifest.url = Some(mock_server.uri());

        let result = fetch_catalog_all_pages(
            &fetcher,
            &manifest,
            "movie".to_string(),
            "top".to_string(),
            10,
        )
        .await;

        assert!(result.is_ok());
        let all_metas = result.unwrap();
        assert_eq!(all_metas.len(), 3);
        assert_eq!(all_metas[0].id, "tt1111111");
        assert_eq!(all_metas[1].id, "tt2222222");
        assert_eq!(all_metas[2].id, "tt3333333");
    }

    #[tokio::test]
    async fn test_fetch_catalog_all_pages_stops_on_empty() {
        use wiremock::matchers::{method, path, query_param};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        // Page 1 - with results (no query params)
        let page1_json = r#"{
            "metas": [
                {"id": "tt1111111", "content_type": "movie", "name": "Movie 1"}
            ],
            "hasMore": true
        }"#;

        Mock::given(method("GET"))
            .and(path("/catalog/movie/top.json"))
            .respond_with(ResponseTemplate::new(200).set_body_string(page1_json))
            .up_to_n_times(1)
            .mount(&mock_server)
            .await;

        // Page 2 - empty results (with skip=20)
        let page2_json = r#"{
            "metas": []
        }"#;

        Mock::given(method("GET"))
            .and(path("/catalog/movie/top.json"))
            .and(query_param("skip", "20"))
            .respond_with(ResponseTemplate::new(200).set_body_string(page2_json))
            .mount(&mock_server)
            .await;

        let fetcher = Fetcher::new().expect("Failed to create fetcher");
        let mut manifest = Manifest::new(
            "com.test".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
            "Test".to_string(),
        );
        manifest.url = Some(mock_server.uri());

        let result = fetch_catalog_all_pages(
            &fetcher,
            &manifest,
            "movie".to_string(),
            "top".to_string(),
            10,
        )
        .await;

        assert!(result.is_ok());
        let all_metas = result.unwrap();
        // Should only have page 1 results, stopped at empty page 2
        assert_eq!(all_metas.len(), 1);
    }
}
