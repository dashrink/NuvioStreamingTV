//! Addon discovery, manifest parsing, and validation.
//!
//! This module provides functionality for:
//! - Parsing and validating Stremio addon manifests
//! - Discovering addons from URLs
//! - Managing addon configuration (enable/disable, priority)
//! - Health checking addon availability
//!
//! The manifest is the primary discovery mechanism for Stremio addons,
//! describing their capabilities, supported content types, and available resources.

use crate::error::NuvioError;
use crate::stremio_service::types::{Addon, Manifest};
use reqwest;
use std::time::Duration;

/// Parses a manifest from a JSON string and validates required fields.
///
/// This function deserializes the JSON and ensures all required fields
/// (id, name, version, description) are present and non-empty.
///
/// # Arguments
///
/// * `json` - JSON string containing the manifest data
///
/// # Returns
///
/// A validated `Manifest` instance, or an error if parsing or validation fails
///
/// # Errors
///
/// Returns a `NuvioError` if:
/// - JSON parsing fails (invalid syntax)
/// - Required fields are missing or empty
/// - Manifest structure is invalid
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::addon::parse_manifest;
///
/// let json = r#"{
///     "id": "com.example.addon",
///     "name": "Example Addon",
///     "version": "1.0.0",
///     "description": "An example Stremio addon"
/// }"#;
///
/// let manifest = parse_manifest(json).expect("Failed to parse manifest");
/// assert_eq!(manifest.id, "com.example.addon");
/// assert_eq!(manifest.name, "Example Addon");
/// ```
pub fn parse_manifest(json: &str) -> Result<Manifest, NuvioError> {
    // Parse JSON into Manifest struct
    let manifest: Manifest = serde_json::from_str(json)
        .map_err(|e| NuvioError::validation(format!("JSON parse error: {}", e)))?;

    // Validate required fields
    validate_manifest(&manifest)?;

    Ok(manifest)
}

/// Validates that a manifest contains all required fields with valid values.
///
/// # Arguments
///
/// * `manifest` - The manifest to validate
///
/// # Returns
///
/// `Ok(())` if the manifest is valid, or an error describing the validation failure
///
/// # Errors
///
/// Returns a `NuvioError::InvalidManifest` if:
/// - `id` is empty
/// - `name` is empty
/// - `version` is empty
/// - `description` is empty
fn validate_manifest(manifest: &Manifest) -> Result<(), NuvioError> {
    // Validate id field
    if manifest.id.trim().is_empty() {
        return Err(NuvioError::validation(
            "Manifest 'id' field is required and cannot be empty",
        ));
    }

    // Validate name field
    if manifest.name.trim().is_empty() {
        return Err(NuvioError::validation(
            "Manifest 'name' field is required and cannot be empty",
        ));
    }

    // Validate version field
    if manifest.version.trim().is_empty() {
        return Err(NuvioError::validation(
            "Manifest 'version' field is required and cannot be empty",
        ));
    }

    // Validate description field
    if manifest.description.trim().is_empty() {
        return Err(NuvioError::validation(
            "Manifest 'description' field is required and cannot be empty",
        ));
    }

    Ok(())
}

/// Creates an Addon instance from a validated manifest.
///
/// # Arguments
///
/// * `manifest` - The validated manifest
/// * `manifest_url` - URL where the manifest was fetched from
///
/// # Returns
///
/// A new `Addon` instance configured from the manifest
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::addon::{parse_manifest, create_addon_from_manifest};
///
/// let json = r#"{
///     "id": "com.example.addon",
///     "name": "Example Addon",
///     "version": "1.0.0",
///     "description": "An example addon"
/// }"#;
///
/// let manifest = parse_manifest(json).expect("Failed to parse");
/// let addon = create_addon_from_manifest(&manifest, "https://example.com/manifest.json");
///
/// assert_eq!(addon.id, "com.example.addon");
/// assert_eq!(addon.name, "Example Addon");
/// assert_eq!(addon.manifest_url, "https://example.com/manifest.json");
/// assert!(addon.enabled);
/// ```
pub fn create_addon_from_manifest(manifest: &Manifest, manifest_url: &str) -> Addon {
    let mut addon = Addon::new(
        manifest.id.clone(),
        manifest_url.to_string(),
        manifest.name.clone(),
        manifest.version.clone(),
    );

    // Set original_url if present in manifest
    addon.original_url = manifest.original_url.clone();

    addon
}

/// Enables an addon, allowing it to provide content.
///
/// # Arguments
///
/// * `addon` - Mutable reference to the addon to enable
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::addon::enable_addon;
/// use nuvio_core::stremio_service::types::Addon;
///
/// let mut addon = Addon::new(
///     "com.example.addon".to_string(),
///     "https://example.com/manifest.json".to_string(),
///     "Example Addon".to_string(),
///     "1.0.0".to_string(),
/// );
///
/// addon.enabled = false;
/// enable_addon(&mut addon);
/// assert!(addon.enabled);
/// ```
pub fn enable_addon(addon: &mut Addon) {
    addon.enabled = true;
}

/// Disables an addon, preventing it from providing content.
///
/// # Arguments
///
/// * `addon` - Mutable reference to the addon to disable
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::addon::disable_addon;
/// use nuvio_core::stremio_service::types::Addon;
///
/// let mut addon = Addon::new(
///     "com.example.addon".to_string(),
///     "https://example.com/manifest.json".to_string(),
///     "Example Addon".to_string(),
///     "1.0.0".to_string(),
/// );
///
/// disable_addon(&mut addon);
/// assert!(!addon.enabled);
/// ```
pub fn disable_addon(addon: &mut Addon) {
    addon.enabled = false;
}

/// Sets the priority of an addon for conflict resolution.
///
/// Higher priority values take precedence when multiple addons provide
/// the same content. Priority can be any i32 value, including negative numbers.
///
/// # Arguments
///
/// * `addon` - Mutable reference to the addon to configure
/// * `priority` - The priority value to set (higher = more priority)
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::addon::set_addon_priority;
/// use nuvio_core::stremio_service::types::Addon;
///
/// let mut addon = Addon::new(
///     "com.example.addon".to_string(),
///     "https://example.com/manifest.json".to_string(),
///     "Example Addon".to_string(),
///     "1.0.0".to_string(),
/// );
///
/// set_addon_priority(&mut addon, 10);
/// assert_eq!(addon.priority, 10);
/// ```
pub fn set_addon_priority(addon: &mut Addon, priority: i32) {
    addon.priority = priority;
}

/// Discovers an addon from a URL by fetching and parsing its manifest.
///
/// This function:
/// 1. Normalizes the URL to ensure it ends with `manifest.json`
/// 2. Fetches the manifest from the URL via HTTP GET
/// 3. Parses and validates the manifest
/// 4. Creates an Addon instance from the manifest
///
/// # Arguments
///
/// * `url` - The URL of the addon manifest (may or may not end with `manifest.json`)
///
/// # Returns
///
/// A new `Addon` instance created from the fetched manifest
///
/// # Errors
///
/// Returns a `NuvioError` if:
/// - Network request fails (DNS, connection, timeout, etc.)
/// - HTTP request returns an error status code
/// - Response body is not valid JSON
/// - Manifest validation fails (missing required fields)
///
/// # Examples
///
/// ```no_run
/// use nuvio_core::stremio_service::addon::discover_addon;
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// // Discover an addon from a URL
/// let addon = discover_addon("https://example.com/manifest.json").await?;
/// assert!(!addon.id.is_empty());
/// assert!(!addon.name.is_empty());
/// # Ok(())
/// # }
/// ```
pub async fn discover_addon(url: &str) -> Result<Addon, NuvioError> {
    // Normalize URL - ensure it ends with manifest.json
    let manifest_url = if url.ends_with("manifest.json") {
        url.to_string()
    } else {
        // Remove trailing slash if present, then append /manifest.json
        format!("{}/manifest.json", url.trim_end_matches('/'))
    };

    // Fetch manifest from URL
    let response = reqwest::get(&manifest_url).await.map_err(|e| {
        NuvioError::network_error(format!(
            "Failed to fetch manifest from {}: {}",
            manifest_url, e
        ))
    })?;

    // Check for HTTP errors
    if !response.status().is_success() {
        return Err(NuvioError::network_error(format!(
            "HTTP error fetching manifest from {}: {}",
            manifest_url,
            response.status()
        )));
    }

    // Get response body as text
    let body = response.text().await.map_err(|e| {
        NuvioError::network_error(format!(
            "Failed to read response body from {}: {}",
            manifest_url, e
        ))
    })?;

    // Parse manifest from JSON
    let manifest = parse_manifest(&body)?;

    // Create and return Addon instance
    Ok(create_addon_from_manifest(&manifest, &manifest_url))
}

/// Maximum number of consecutive failures before marking addon as unhealthy
const MAX_CONSECUTIVE_FAILURES: u32 = 3;

/// Timeout for health check requests (shorter than normal requests)
const HEALTH_CHECK_TIMEOUT: Duration = Duration::from_secs(5);

/// Checks the health of an addon by attempting to fetch its manifest.
///
/// A health check succeeds if the manifest URL responds with a successful HTTP status
/// within the health check timeout period. This function uses a shorter timeout than
/// normal requests to quickly detect unresponsive addons.
///
/// # Arguments
///
/// * `addon` - Mutable reference to the addon to check
///
/// # Returns
///
/// `Ok(true)` if the addon is healthy, `Ok(false)` if unhealthy, or an error if the check fails
///
/// # Side Effects
///
/// This function updates the addon's health status:
/// - On success: Resets `consecutive_failures` to 0 and sets `healthy` to true
/// - On failure: Increments `consecutive_failures` and may set `healthy` to false
///
/// # Examples
///
/// ```no_run
/// use nuvio_core::stremio_service::addon::check_addon_health;
/// use nuvio_core::stremio_service::types::Addon;
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// let mut addon = Addon::new(
///     "com.example.addon".to_string(),
///     "https://example.com/manifest.json".to_string(),
///     "Example Addon".to_string(),
///     "1.0.0".to_string(),
/// );
///
/// let is_healthy = check_addon_health(&mut addon).await?;
/// assert!(is_healthy || !addon.healthy);
/// # Ok(())
/// # }
/// ```
pub async fn check_addon_health(addon: &mut Addon) -> Result<bool, NuvioError> {
    // Create a client with a short timeout for health checks
    let client = reqwest::Client::builder()
        .timeout(HEALTH_CHECK_TIMEOUT)
        .build()
        .map_err(|e| NuvioError::network_error(format!("Failed to create HTTP client: {}", e)))?;

    // Attempt to fetch the manifest URL with HEAD request (faster than GET)
    let result = client.head(&addon.manifest_url).send().await;

    match result {
        Ok(response) if response.status().is_success() => {
            // Health check succeeded - reset failure count and mark as healthy
            addon.consecutive_failures = 0;
            addon.healthy = true;
            Ok(true)
        }
        Ok(_response) => {
            // HTTP error response - mark as failure
            addon.consecutive_failures += 1;
            if addon.consecutive_failures >= MAX_CONSECUTIVE_FAILURES {
                addon.healthy = false;
            }
            Ok(addon.healthy)
        }
        Err(_) => {
            // Network error - mark as failure
            addon.consecutive_failures += 1;
            if addon.consecutive_failures >= MAX_CONSECUTIVE_FAILURES {
                addon.healthy = false;
            }
            Ok(addon.healthy)
        }
    }
}

/// Checks the health of multiple addons in parallel.
///
/// This function performs health checks on all provided addons concurrently,
/// updating their health status based on the results.
///
/// # Arguments
///
/// * `addons` - Mutable slice of addons to check
///
/// # Returns
///
/// A vector of results, one per addon, indicating whether each addon is healthy
///
/// # Examples
///
/// ```no_run
/// use nuvio_core::stremio_service::addon::check_addons_health;
/// use nuvio_core::stremio_service::types::Addon;
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// let mut addons = vec![
///     Addon::new(
///         "com.example.addon1".to_string(),
///         "https://example1.com/manifest.json".to_string(),
///         "Addon 1".to_string(),
///         "1.0.0".to_string(),
///     ),
///     Addon::new(
///         "com.example.addon2".to_string(),
///         "https://example2.com/manifest.json".to_string(),
///         "Addon 2".to_string(),
///         "1.0.0".to_string(),
///     ),
/// ];
///
/// let results = check_addons_health(&mut addons).await;
/// assert_eq!(results.len(), 2);
/// # Ok(())
/// # }
/// ```
pub async fn check_addons_health(addons: &mut [Addon]) -> Vec<Result<bool, NuvioError>> {
    use futures::future::join_all;

    // Create tasks for parallel health checks
    // We need to clone the addons because we're moving them into async blocks
    let mut addon_clones: Vec<Addon> = addons.to_vec();
    let tasks: Vec<_> = addon_clones.iter_mut().map(check_addon_health).collect();

    // Wait for all health checks to complete
    let results = join_all(tasks).await;

    // Update the original addons with the health status from clones
    for (i, addon_clone) in addon_clones.iter().enumerate() {
        addons[i].healthy = addon_clone.healthy;
        addons[i].consecutive_failures = addon_clone.consecutive_failures;
    }

    results
}

/// Resets the health status of an addon to healthy.
///
/// This function clears the consecutive failure count and marks the addon as healthy.
/// Useful when manually recovering an addon or after configuration changes.
///
/// # Arguments
///
/// * `addon` - Mutable reference to the addon to reset
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::addon::reset_addon_health;
/// use nuvio_core::stremio_service::types::Addon;
///
/// let mut addon = Addon::new(
///     "com.example.addon".to_string(),
///     "https://example.com/manifest.json".to_string(),
///     "Example Addon".to_string(),
///     "1.0.0".to_string(),
/// );
///
/// // Simulate failures
/// addon.healthy = false;
/// addon.consecutive_failures = 5;
///
/// // Reset health
/// reset_addon_health(&mut addon);
/// assert!(addon.healthy);
/// assert_eq!(addon.consecutive_failures, 0);
/// ```
pub fn reset_addon_health(addon: &mut Addon) {
    addon.healthy = true;
    addon.consecutive_failures = 0;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_manifest() {
        let json = r#"{
            "id": "com.example.addon",
            "name": "Example Addon",
            "version": "1.0.0",
            "description": "An example Stremio addon"
        }"#;

        let result = parse_manifest(json);
        assert!(result.is_ok());

        let manifest = result.unwrap();
        assert_eq!(manifest.id, "com.example.addon");
        assert_eq!(manifest.name, "Example Addon");
        assert_eq!(manifest.version, "1.0.0");
        assert_eq!(manifest.description, "An example Stremio addon");
    }

    #[test]
    fn test_parse_manifest_with_optional_fields() {
        let json = r#"{
            "id": "org.stremio.test",
            "name": "Test Addon",
            "version": "2.0.0",
            "description": "Test addon with optional fields",
            "url": "https://example.com",
            "catalogs": [
                {
                    "content_type": "movie",
                    "id": "top",
                    "name": "Top Movies"
                }
            ],
            "resources": [
                {
                    "name": "stream",
                    "types": ["movie", "series"]
                }
            ]
        }"#;

        let result = parse_manifest(json);
        assert!(result.is_ok());

        let manifest = result.unwrap();
        assert_eq!(manifest.id, "org.stremio.test");
        assert_eq!(manifest.url, Some("https://example.com".to_string()));
        assert!(manifest.catalogs.is_some());
        assert!(manifest.resources.is_some());
    }

    #[test]
    fn test_parse_manifest_invalid_json() {
        let json = r#"{invalid json syntax}"#;

        let result = parse_manifest(json);
        assert!(result.is_err());

        match result {
            Err(NuvioError::InvalidManifest { msg }) => {
                assert!(msg.contains("JSON parse error"));
            }
            _ => panic!("Expected InvalidManifest error"),
        }
    }

    #[test]
    fn test_parse_manifest_missing_id() {
        let json = r#"{
            "name": "Test Addon",
            "version": "1.0.0",
            "description": "Missing id field"
        }"#;

        let result = parse_manifest(json);
        assert!(result.is_err());

        // This will fail at JSON parsing because id is a required field in the struct
        match result {
            Err(NuvioError::InvalidManifest { msg }) => {
                assert!(msg.contains("JSON parse error") || msg.contains("missing field"));
            }
            _ => panic!("Expected InvalidManifest error"),
        }
    }

    #[test]
    fn test_parse_manifest_empty_id() {
        let json = r#"{
            "id": "",
            "name": "Test Addon",
            "version": "1.0.0",
            "description": "Empty id field"
        }"#;

        let result = parse_manifest(json);
        assert!(result.is_err());

        match result {
            Err(NuvioError::InvalidManifest { msg }) => {
                assert!(msg.contains("'id' field is required"));
            }
            _ => panic!("Expected InvalidManifest error"),
        }
    }

    #[test]
    fn test_parse_manifest_empty_name() {
        let json = r#"{
            "id": "com.test",
            "name": "",
            "version": "1.0.0",
            "description": "Empty name field"
        }"#;

        let result = parse_manifest(json);
        assert!(result.is_err());

        match result {
            Err(NuvioError::InvalidManifest { msg }) => {
                assert!(msg.contains("'name' field is required"));
            }
            _ => panic!("Expected InvalidManifest error"),
        }
    }

    #[test]
    fn test_parse_manifest_empty_version() {
        let json = r#"{
            "id": "com.test",
            "name": "Test",
            "version": "",
            "description": "Empty version field"
        }"#;

        let result = parse_manifest(json);
        assert!(result.is_err());

        match result {
            Err(NuvioError::InvalidManifest { msg }) => {
                assert!(msg.contains("'version' field is required"));
            }
            _ => panic!("Expected InvalidManifest error"),
        }
    }

    #[test]
    fn test_parse_manifest_empty_description() {
        let json = r#"{
            "id": "com.test",
            "name": "Test",
            "version": "1.0.0",
            "description": ""
        }"#;

        let result = parse_manifest(json);
        assert!(result.is_err());

        match result {
            Err(NuvioError::InvalidManifest { msg }) => {
                assert!(msg.contains("'description' field is required"));
            }
            _ => panic!("Expected InvalidManifest error"),
        }
    }

    #[test]
    fn test_parse_manifest_whitespace_only_fields() {
        let json = r#"{
            "id": "   ",
            "name": "Test",
            "version": "1.0.0",
            "description": "Test"
        }"#;

        let result = parse_manifest(json);
        assert!(result.is_err());

        match result {
            Err(NuvioError::InvalidManifest { msg }) => {
                assert!(msg.contains("'id' field is required"));
            }
            _ => panic!("Expected InvalidManifest error"),
        }
    }

    #[test]
    fn test_create_addon_from_manifest() {
        let json = r#"{
            "id": "com.example.addon",
            "name": "Example Addon",
            "version": "1.0.0",
            "description": "An example addon"
        }"#;

        let manifest = parse_manifest(json).expect("Failed to parse manifest");
        let addon = create_addon_from_manifest(&manifest, "https://example.com/manifest.json");

        assert_eq!(addon.id, "com.example.addon");
        assert_eq!(addon.name, "Example Addon");
        assert_eq!(addon.version, "1.0.0");
        assert_eq!(addon.manifest_url, "https://example.com/manifest.json");
        assert!(addon.enabled);
        assert_eq!(addon.priority, 0);
        assert_eq!(addon.original_url, None);
    }

    #[test]
    fn test_create_addon_from_manifest_with_original_url() {
        let json = r#"{
            "id": "org.stremio.test",
            "name": "Test Addon",
            "version": "2.0.0",
            "description": "Test addon",
            "original_url": "https://original.com/manifest.json"
        }"#;

        let manifest = parse_manifest(json).expect("Failed to parse manifest");
        let addon = create_addon_from_manifest(&manifest, "https://redirect.com/manifest.json");

        assert_eq!(addon.id, "org.stremio.test");
        assert_eq!(addon.manifest_url, "https://redirect.com/manifest.json");
        assert_eq!(
            addon.original_url,
            Some("https://original.com/manifest.json".to_string())
        );
    }

    #[test]
    fn test_validate_manifest_success() {
        let manifest = Manifest::new(
            "com.test".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
            "Description".to_string(),
        );

        let result = validate_manifest(&manifest);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_manifest_empty_fields() {
        let mut manifest = Manifest::new(
            "".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
            "Description".to_string(),
        );

        assert!(validate_manifest(&manifest).is_err());

        manifest.id = "com.test".to_string();
        manifest.name = "".to_string();
        assert!(validate_manifest(&manifest).is_err());

        manifest.name = "Test".to_string();
        manifest.version = "".to_string();
        assert!(validate_manifest(&manifest).is_err());

        manifest.version = "1.0.0".to_string();
        manifest.description = "".to_string();
        assert!(validate_manifest(&manifest).is_err());
    }

    #[test]
    fn test_parse_manifest_complex() {
        // Test a more complex manifest with all optional fields
        let json = r#"{
            "id": "org.stremio.complex",
            "name": "Complex Addon",
            "version": "3.2.1",
            "description": "A complex addon with all features",
            "url": "https://addon.example.com",
            "original_url": "https://original.example.com",
            "catalogs": [
                {
                    "content_type": "movie",
                    "id": "top",
                    "name": "Top Movies",
                    "extra_supported": ["genre", "skip"],
                    "item_count": 100
                },
                {
                    "content_type": "series",
                    "id": "popular",
                    "name": "Popular Series"
                }
            ],
            "resources": [
                {
                    "name": "catalog",
                    "types": ["movie", "series"],
                    "id_prefixes": ["tt"]
                },
                {
                    "name": "stream",
                    "types": ["movie", "series"]
                },
                {
                    "name": "meta",
                    "types": ["movie"]
                }
            ],
            "types": ["movie", "series"],
            "id_prefixes": ["tt", "tmdb"],
            "manifest_version": "2.0.0",
            "query_params": "api_key=test123"
        }"#;

        let result = parse_manifest(json);
        assert!(result.is_ok());

        let manifest = result.unwrap();
        assert_eq!(manifest.id, "org.stremio.complex");
        assert_eq!(manifest.name, "Complex Addon");
        assert_eq!(manifest.version, "3.2.1");
        assert_eq!(manifest.description, "A complex addon with all features");
        assert_eq!(manifest.url, Some("https://addon.example.com".to_string()));
        assert_eq!(
            manifest.original_url,
            Some("https://original.example.com".to_string())
        );
        assert_eq!(manifest.manifest_version, Some("2.0.0".to_string()));
        assert_eq!(manifest.query_params, Some("api_key=test123".to_string()));

        // Verify catalogs
        let catalogs = manifest.catalogs.unwrap();
        assert_eq!(catalogs.len(), 2);
        assert_eq!(catalogs[0].content_type, "movie");
        assert_eq!(catalogs[0].id, "top");
        assert_eq!(catalogs[0].item_count, Some(100));

        // Verify resources
        let resources = manifest.resources.unwrap();
        assert_eq!(resources.len(), 3);
        assert_eq!(resources[0].name, "catalog");
        assert_eq!(resources[0].types, vec!["movie", "series"]);
        assert_eq!(resources[0].id_prefixes, Some(vec!["tt".to_string()]));

        // Verify types and id_prefixes
        assert_eq!(
            manifest.types,
            Some(vec!["movie".to_string(), "series".to_string()])
        );
        assert_eq!(
            manifest.id_prefixes,
            Some(vec!["tt".to_string(), "tmdb".to_string()])
        );
    }

    #[tokio::test]
    async fn test_discover() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        // Start a mock server
        let mock_server: MockServer = MockServer::start().await;

        // Create a valid manifest response
        let manifest_json = r#"{
            "id": "com.example.test",
            "name": "Test Addon",
            "version": "1.0.0",
            "description": "Test addon for discovery",
            "url": "https://example.com",
            "catalogs": [
                {
                    "content_type": "movie",
                    "id": "top",
                    "name": "Top Movies"
                }
            ],
            "resources": [
                {
                    "name": "stream",
                    "types": ["movie", "series"]
                }
            ]
        }"#;

        // Set up the mock to respond with the manifest
        Mock::given(method("GET"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(200).set_body_string(manifest_json))
            .mount(&mock_server)
            .await;

        // Test discovering addon from URL without manifest.json suffix
        let base_url = mock_server.uri();
        let result = discover_addon(&base_url).await;

        assert!(
            result.is_ok(),
            "Failed to discover addon: {:?}",
            result.err()
        );

        let addon = result.unwrap();
        assert_eq!(addon.id, "com.example.test");
        assert_eq!(addon.name, "Test Addon");
        assert_eq!(addon.version, "1.0.0");
        assert_eq!(addon.manifest_url, format!("{}/manifest.json", base_url));
        assert!(addon.enabled);
        assert_eq!(addon.priority, 0);

        // Test discovering addon from URL with manifest.json suffix
        let manifest_url = format!("{}/manifest.json", base_url);
        let result2 = discover_addon(&manifest_url).await;

        assert!(
            result2.is_ok(),
            "Failed to discover addon with manifest.json suffix: {:?}",
            result2.err()
        );

        let addon2 = result2.unwrap();
        assert_eq!(addon2.id, "com.example.test");
        assert_eq!(addon2.name, "Test Addon");
        assert_eq!(addon2.manifest_url, manifest_url);
    }

    #[tokio::test]
    async fn test_discover_invalid_manifest() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        // Set up the mock to respond with invalid JSON
        Mock::given(method("GET"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(200).set_body_string("{invalid json}"))
            .mount(&mock_server)
            .await;

        let result = discover_addon(&mock_server.uri()).await;
        assert!(result.is_err());

        match result {
            Err(NuvioError::InvalidManifest { msg }) => {
                assert!(msg.contains("JSON parse error"));
            }
            _ => panic!("Expected InvalidManifest error"),
        }
    }

    #[tokio::test]
    async fn test_discover_http_error() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        // Set up the mock to respond with 404
        Mock::given(method("GET"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&mock_server)
            .await;

        let result = discover_addon(&mock_server.uri()).await;
        assert!(result.is_err());

        match result {
            Err(NuvioError::NetworkError { msg }) => {
                assert!(msg.contains("HTTP error"));
                assert!(msg.contains("404"));
            }
            _ => panic!("Expected NetworkError"),
        }
    }

    #[tokio::test]
    async fn test_discover_missing_required_fields() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        // Set up the mock to respond with manifest missing name
        let invalid_manifest = r#"{
            "id": "com.example.test",
            "name": "",
            "version": "1.0.0",
            "description": "Test"
        }"#;

        Mock::given(method("GET"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(200).set_body_string(invalid_manifest))
            .mount(&mock_server)
            .await;

        let result = discover_addon(&mock_server.uri()).await;
        assert!(result.is_err());

        match result {
            Err(NuvioError::InvalidManifest { msg }) => {
                assert!(msg.contains("'name' field is required"));
            }
            _ => panic!("Expected InvalidManifest error"),
        }
    }

    #[test]
    fn test_config() {
        // Test enabling addon
        let mut addon = Addon::new(
            "com.test.addon".to_string(),
            "https://test.com/manifest.json".to_string(),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        // Addon should be enabled by default
        assert!(addon.enabled);
        assert_eq!(addon.priority, 0);

        // Test disabling addon
        disable_addon(&mut addon);
        assert!(!addon.enabled, "Addon should be disabled");
        assert_eq!(addon.priority, 0, "Priority should remain unchanged");

        // Test enabling addon
        enable_addon(&mut addon);
        assert!(addon.enabled, "Addon should be enabled");
        assert_eq!(addon.priority, 0, "Priority should remain unchanged");

        // Test setting priority
        set_addon_priority(&mut addon, 10);
        assert_eq!(addon.priority, 10, "Priority should be set to 10");
        assert!(addon.enabled, "Enabled status should remain unchanged");

        // Test setting negative priority
        set_addon_priority(&mut addon, -5);
        assert_eq!(addon.priority, -5, "Priority should be set to -5");

        // Test setting zero priority
        set_addon_priority(&mut addon, 0);
        assert_eq!(addon.priority, 0, "Priority should be set to 0");

        // Test that changes persist (values remain after multiple operations)
        disable_addon(&mut addon);
        set_addon_priority(&mut addon, 100);
        assert!(!addon.enabled, "Disabled state should persist");
        assert_eq!(addon.priority, 100, "Priority should persist");

        // Verify other fields are not affected by configuration changes
        assert_eq!(addon.id, "com.test.addon");
        assert_eq!(addon.name, "Test Addon");
        assert_eq!(addon.version, "1.0.0");
        assert_eq!(addon.manifest_url, "https://test.com/manifest.json");
    }

    #[tokio::test]
    async fn test_health_check_success() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        // Start a mock server
        let mock_server: MockServer = MockServer::start().await;

        // Set up mock to respond successfully to HEAD request
        Mock::given(method("HEAD"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(200))
            .mount(&mock_server)
            .await;

        // Create addon pointing to mock server
        let mut addon = Addon::new(
            "com.test.addon".to_string(),
            format!("{}/manifest.json", mock_server.uri()),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        // Initially healthy
        assert!(addon.healthy);
        assert_eq!(addon.consecutive_failures, 0);

        // Perform health check
        let result = check_addon_health(&mut addon).await;
        assert!(result.is_ok());
        assert!(result.unwrap());

        // Should remain healthy with no failures
        assert!(addon.healthy);
        assert_eq!(addon.consecutive_failures, 0);
    }

    #[tokio::test]
    async fn test_health_check_single_failure() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        // Set up mock to respond with 500 error
        Mock::given(method("HEAD"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(500))
            .mount(&mock_server)
            .await;

        let mut addon = Addon::new(
            "com.test.addon".to_string(),
            format!("{}/manifest.json", mock_server.uri()),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        // Perform health check
        let result = check_addon_health(&mut addon).await;
        assert!(result.is_ok());

        // Should still be healthy after single failure (threshold is 3)
        assert!(
            addon.healthy,
            "Addon should still be healthy after 1 failure"
        );
        assert_eq!(addon.consecutive_failures, 1);
    }

    #[tokio::test]
    async fn test_health_check_multiple_failures() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        // Set up mock to respond with 404 error
        Mock::given(method("HEAD"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&mock_server)
            .await;

        let mut addon = Addon::new(
            "com.test.addon".to_string(),
            format!("{}/manifest.json", mock_server.uri()),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        // Perform 3 health checks (reaching threshold)
        for i in 1..=3 {
            let result = check_addon_health(&mut addon).await;
            assert!(result.is_ok());
            assert_eq!(addon.consecutive_failures, i);

            if i < 3 {
                assert!(addon.healthy, "Should be healthy before threshold");
            } else {
                assert!(!addon.healthy, "Should be unhealthy after 3 failures");
            }
        }

        // Final state
        assert!(!addon.healthy);
        assert_eq!(addon.consecutive_failures, 3);
    }

    #[tokio::test]
    async fn test_health_check_recovery() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        let mut addon = Addon::new(
            "com.test.addon".to_string(),
            format!("{}/manifest.json", mock_server.uri()),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        // First, cause failures to make addon unhealthy
        for _ in 0..3 {
            Mock::given(method("HEAD"))
                .and(path("/manifest.json"))
                .respond_with(ResponseTemplate::new(500))
                .up_to_n_times(1)
                .mount(&mock_server)
                .await;
        }

        for _ in 0..3 {
            let _ = check_addon_health(&mut addon).await;
        }

        assert!(!addon.healthy);
        assert_eq!(addon.consecutive_failures, 3);

        // Now make it succeed
        Mock::given(method("HEAD"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(200))
            .mount(&mock_server)
            .await;

        // Health check should succeed and reset status
        let result = check_addon_health(&mut addon).await;
        assert!(result.is_ok());
        assert!(result.unwrap());

        // Should be healthy again with failures reset
        assert!(addon.healthy, "Addon should recover after successful check");
        assert_eq!(addon.consecutive_failures, 0);
    }

    #[tokio::test]
    async fn test_health_check_timeout() {
        use std::time::Duration;
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server: MockServer = MockServer::start().await;

        // Set up mock with a long delay (longer than health check timeout)
        Mock::given(method("HEAD"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(200).set_delay(Duration::from_secs(10)))
            .mount(&mock_server)
            .await;

        let mut addon = Addon::new(
            "com.test.addon".to_string(),
            format!("{}/manifest.json", mock_server.uri()),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        // Health check should timeout and count as failure
        let result = check_addon_health(&mut addon).await;
        assert!(result.is_ok());

        // Should increment failure count
        assert_eq!(addon.consecutive_failures, 1);
    }

    #[tokio::test]
    async fn test_check_multiple_addons_health() {
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        // Create two mock servers
        let mock_server1: MockServer = MockServer::start().await;
        let mock_server2: MockServer = MockServer::start().await;

        // First server responds successfully
        Mock::given(method("HEAD"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(200))
            .mount(&mock_server1)
            .await;

        // Second server responds with error
        Mock::given(method("HEAD"))
            .and(path("/manifest.json"))
            .respond_with(ResponseTemplate::new(500))
            .mount(&mock_server2)
            .await;

        let mut addons = vec![
            Addon::new(
                "com.test.addon1".to_string(),
                format!("{}/manifest.json", mock_server1.uri()),
                "Test Addon 1".to_string(),
                "1.0.0".to_string(),
            ),
            Addon::new(
                "com.test.addon2".to_string(),
                format!("{}/manifest.json", mock_server2.uri()),
                "Test Addon 2".to_string(),
                "1.0.0".to_string(),
            ),
        ];

        // Check health of all addons
        let results = check_addons_health(&mut addons).await;

        // Verify we got results for both addons
        assert_eq!(results.len(), 2);

        // First addon should be healthy
        assert!(results[0].is_ok());
        assert!(results[0].as_ref().unwrap());
        assert!(addons[0].healthy);
        assert_eq!(addons[0].consecutive_failures, 0);

        // Second addon should have a failure but still healthy (threshold is 3)
        assert!(results[1].is_ok());
        assert!(addons[1].healthy); // Still healthy after 1 failure
        assert_eq!(addons[1].consecutive_failures, 1);
    }

    #[test]
    fn test_reset_addon_health() {
        let mut addon = Addon::new(
            "com.test.addon".to_string(),
            "https://test.com/manifest.json".to_string(),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        // Simulate failures
        addon.healthy = false;
        addon.consecutive_failures = 5;

        // Reset health
        reset_addon_health(&mut addon);

        // Verify reset
        assert!(addon.healthy, "Addon should be marked healthy");
        assert_eq!(
            addon.consecutive_failures, 0,
            "Consecutive failures should be reset"
        );
    }

    #[test]
    fn test_addon_health_fields_default() {
        let addon = Addon::new(
            "com.test.addon".to_string(),
            "https://test.com/manifest.json".to_string(),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        // Verify health fields have correct defaults
        assert!(addon.healthy, "New addon should be healthy by default");
        assert_eq!(
            addon.consecutive_failures, 0,
            "New addon should have 0 consecutive failures"
        );
    }
}
