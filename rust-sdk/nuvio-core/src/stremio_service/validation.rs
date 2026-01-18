//! Response validation and sanitization for Stremio addon responses.
//!
//! This module provides validation and sanitization functionality for addon responses:
//! - Response size limits (5MB default) to prevent memory exhaustion
//! - Schema validation for manifests, catalogs, streams, and metadata
//! - HTML/script tag sanitization from text fields
//! - Malformed response detection
//!
//! All validation errors are returned as specific NuvioError variants for proper
//! error handling across FFI boundaries.

use crate::error::NuvioError;
use crate::stremio_service::types::{Manifest, Meta, StremioStream, Subtitle};
use serde::de::DeserializeOwned;

/// Maximum response size (5MB) to prevent memory exhaustion from addon responses
pub const MAX_RESPONSE_SIZE: u64 = 5 * 1024 * 1024;

/// Validates that a response does not exceed the maximum size limit.
///
/// # Arguments
///
/// * `data` - The response data (as bytes or string)
/// * `max_size` - Maximum allowed size in bytes (defaults to MAX_RESPONSE_SIZE if None)
///
/// # Returns
///
/// Ok(()) if the response is within limits, or ResponseTooLarge error
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::validation::validate_response_size;
///
/// let small_response = "small data";
/// assert!(validate_response_size(small_response.as_bytes(), None).is_ok());
///
/// let large_response = vec![0u8; 6 * 1024 * 1024]; // 6MB
/// assert!(validate_response_size(&large_response, None).is_err());
/// ```
pub fn validate_response_size(data: &[u8], max_size: Option<u64>) -> Result<(), NuvioError> {
    let limit = max_size.unwrap_or(MAX_RESPONSE_SIZE);
    let size = data.len() as u64;

    if size > limit {
        return Err(NuvioError::response_too_large(size, limit));
    }

    Ok(())
}

/// Validates and parses a JSON response with size checking.
///
/// # Arguments
///
/// * `json_str` - The JSON response string
/// * `max_size` - Optional maximum size override
///
/// # Returns
///
/// Parsed object of type T, or an error if validation or parsing fails
///
/// # Errors
///
/// - ResponseTooLarge if the response exceeds size limits
/// - SerializationError if JSON parsing fails
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::validation::validate_and_parse_json;
/// use nuvio_core::stremio_service::types::Manifest;
///
/// let json = r#"{"id":"test","name":"Test","version":"1.0.0","description":"Test"}"#;
/// let manifest: Manifest = validate_and_parse_json(json, None).unwrap();
/// assert_eq!(manifest.id, "test");
/// ```
pub fn validate_and_parse_json<T: DeserializeOwned>(
    json_str: &str,
    max_size: Option<u64>,
) -> Result<T, NuvioError> {
    // First validate size
    validate_response_size(json_str.as_bytes(), max_size)?;

    // Then parse JSON
    serde_json::from_str(json_str)
        .map_err(|e| NuvioError::serialization(format!("Failed to parse JSON response: {}", e)))
}

/// Validates that a Manifest has all required fields.
///
/// # Arguments
///
/// * `manifest` - The manifest to validate
///
/// # Returns
///
/// Ok(()) if valid, or InvalidManifest error describing the issue
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::types::Manifest;
/// use nuvio_core::stremio_service::validation::validate_manifest;
///
/// let manifest = Manifest::new(
///     "com.example.addon".to_string(),
///     "Test Addon".to_string(),
///     "1.0.0".to_string(),
///     "Test description".to_string(),
/// );
/// assert!(validate_manifest(&manifest).is_ok());
/// ```
pub fn validate_manifest(manifest: &Manifest) -> Result<(), NuvioError> {
    if manifest.id.is_empty() {
        return Err(NuvioError::invalid_manifest("Manifest id is required"));
    }

    if manifest.name.is_empty() {
        return Err(NuvioError::invalid_manifest("Manifest name is required"));
    }

    if manifest.version.is_empty() {
        return Err(NuvioError::invalid_manifest("Manifest version is required"));
    }

    if manifest.description.is_empty() {
        return Err(NuvioError::invalid_manifest(
            "Manifest description is required",
        ));
    }

    Ok(())
}

/// Validates a stream object has at least one source.
///
/// # Arguments
///
/// * `stream` - The stream to validate
///
/// # Returns
///
/// Ok(()) if valid, or ValidationError describing the issue
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::types::StremioStream;
/// use nuvio_core::stremio_service::validation::validate_stream;
///
/// let stream = StremioStream::new_url("https://example.com/video.mp4".to_string());
/// assert!(validate_stream(&stream).is_ok());
///
/// let empty_stream = StremioStream::new_url("".to_string());
/// // Empty URL should fail validation when we add URL format validation
/// ```
pub fn validate_stream(stream: &StremioStream) -> Result<(), NuvioError> {
    // Check that at least one source is provided
    let has_source = stream.url.is_some()
        || stream.yt_id.is_some()
        || stream.info_hash.is_some()
        || stream.external_url.is_some()
        || stream.nzb_url.is_some()
        || stream.rar_urls.is_some()
        || stream.zip_urls.is_some()
        || stream.seven_zip_urls.is_some()
        || stream.tgz_urls.is_some()
        || stream.tar_urls.is_some();

    if !has_source {
        return Err(NuvioError::validation(
            "Stream must have at least one source (url, ytId, infoHash, etc.)",
        ));
    }

    Ok(())
}

/// Validates a Meta object has required fields.
///
/// # Arguments
///
/// * `meta` - The metadata to validate
///
/// # Returns
///
/// Ok(()) if valid, or ValidationError describing the issue
pub fn validate_meta(meta: &Meta) -> Result<(), NuvioError> {
    if meta.id.is_empty() {
        return Err(NuvioError::validation("Meta id is required"));
    }

    if meta.content_type.is_empty() {
        return Err(NuvioError::validation("Meta type is required"));
    }

    if meta.name.is_empty() {
        return Err(NuvioError::validation("Meta name is required"));
    }

    Ok(())
}

/// Sanitizes a string by removing potentially dangerous HTML and script tags,
/// and escaping HTML entities in remaining text.
///
/// This function performs two sanitization steps:
/// 1. Strips `<script>`, `<iframe>`, and other potentially dangerous tags
/// 2. Escapes HTML entities (`&`, `<`, `>`, `"`, `'`) in the remaining text
///
/// For production use, consider using a proper HTML sanitization library.
///
/// # Arguments
///
/// * `text` - The text to sanitize
///
/// # Returns
///
/// Sanitized text with dangerous tags removed and HTML entities escaped
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::validation::sanitize_html;
///
/// let dirty = "Hello <script>alert('xss')</script> World";
/// let clean = sanitize_html(dirty);
/// assert!(!clean.contains("<script>"));
/// assert!(clean.contains("Hello"));
/// assert!(clean.contains("World"));
///
/// let with_entities = "A < B & C > D";
/// let escaped = sanitize_html(with_entities);
/// assert!(escaped.contains("&lt;"));
/// assert!(escaped.contains("&amp;"));
/// assert!(escaped.contains("&gt;"));
/// ```
pub fn sanitize_html(text: &str) -> String {
    let mut result = text.to_string();

    // List of dangerous tags to remove (case-insensitive)
    let dangerous_tags = [
        "script", "iframe", "object", "embed", "applet", "meta", "link", "style", "form",
    ];

    for tag in &dangerous_tags {
        // Remove opening tags (e.g., <script>, <script src="...">)
        let pattern_open = format!("<{}", tag);
        while let Some(start) = result.to_lowercase().find(&pattern_open) {
            if let Some(end) = result[start..].find('>') {
                result.replace_range(start..start + end + 1, "");
            } else {
                break;
            }
        }

        // Remove closing tags (e.g., </script>)
        let pattern_close = format!("</{}>", tag);
        result = result.replace(&pattern_close, "");
        result = result.replace(&pattern_close.to_uppercase(), "");
        result = result.replace(&format!("</{}>", tag.to_uppercase()), "");
    }

    // Escape HTML entities in the remaining text
    escape_html_entities(&result)
}

/// Escapes HTML entities in a string.
///
/// Converts special characters to their HTML entity equivalents:
/// - & -> &amp;
/// - < -> &lt;
/// - > -> &gt;
/// - " -> &quot;
/// - ' -> &#x27;
///
/// # Arguments
///
/// * `text` - The text to escape
///
/// # Returns
///
/// Text with HTML entities escaped
fn escape_html_entities(text: &str) -> String {
    text.chars()
        .map(|c| match c {
            '&' => "&amp;".to_string(),
            '<' => "&lt;".to_string(),
            '>' => "&gt;".to_string(),
            '"' => "&quot;".to_string(),
            '\'' => "&#x27;".to_string(),
            _ => c.to_string(),
        })
        .collect()
}

/// Sanitizes all text fields in a Meta object.
///
/// # Arguments
///
/// * `meta` - The metadata to sanitize
///
/// # Returns
///
/// A new Meta object with sanitized fields
pub fn sanitize_meta(meta: Meta) -> Meta {
    Meta {
        id: meta.id,
        content_type: meta.content_type,
        name: sanitize_html(&meta.name),
        poster: meta.poster,
        poster_shape: meta.poster_shape,
        background: meta.background,
        logo: meta.logo,
        description: meta.description.map(|d| sanitize_html(&d)),
        release_info: meta.release_info.map(|r| sanitize_html(&r)),
        imdb_rating: meta.imdb_rating,
        year: meta.year,
        genres: meta.genres,
        runtime: meta.runtime,
        cast: meta.cast,
        director: meta.director,
        writer: meta.writer,
        certification: meta.certification,
        country: meta.country,
        imdb_id: meta.imdb_id,
        slug: meta.slug,
        released: meta.released,
        behavior_hints: meta.behavior_hints,
    }
}

/// Sanitizes all text fields in a Stream object.
///
/// # Arguments
///
/// * `stream` - The stream to sanitize
///
/// # Returns
///
/// A new Stream object with sanitized fields
pub fn sanitize_stream(stream: StremioStream) -> StremioStream {
    StremioStream {
        url: stream.url,
        yt_id: stream.yt_id,
        info_hash: stream.info_hash,
        external_url: stream.external_url,
        nzb_url: stream.nzb_url,
        rar_urls: stream.rar_urls,
        zip_urls: stream.zip_urls,
        seven_zip_urls: stream.seven_zip_urls,
        tgz_urls: stream.tgz_urls,
        tar_urls: stream.tar_urls,
        file_idx: stream.file_idx,
        file_must_include: stream.file_must_include,
        servers: stream.servers,
        name: stream.name.map(|n| sanitize_html(&n)),
        title: stream.title.map(|t| sanitize_html(&t)),
        description: stream.description.map(|d| sanitize_html(&d)),
        addon: stream.addon,
        addon_id: stream.addon_id,
        addon_name: stream.addon_name.map(|n| sanitize_html(&n)),
        size: stream.size,
        is_free: stream.is_free,
        is_debrid: stream.is_debrid,
        quality: stream.quality,
        headers: stream.headers,
        subtitles: stream
            .subtitles
            .map(|subs| subs.into_iter().map(sanitize_subtitle).collect()),
        sources: stream.sources,
        behavior_hints: stream.behavior_hints,
    }
}

/// Sanitizes a Subtitle object.
///
/// # Arguments
///
/// * `subtitle` - The subtitle to sanitize
///
/// # Returns
///
/// A new Subtitle object with sanitized fields
pub fn sanitize_subtitle(subtitle: Subtitle) -> Subtitle {
    Subtitle {
        id: subtitle.id,
        url: subtitle.url,
        lang: subtitle.lang,
        fps: subtitle.fps,
        addon: subtitle.addon,
        addon_name: subtitle.addon_name.map(|n| sanitize_html(&n)),
        format: subtitle.format,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_size_limit() {
        // Small response should pass
        let small_data = vec![0u8; 1024]; // 1KB
        assert!(validate_response_size(&small_data, None).is_ok());

        // Response at limit should pass
        let at_limit = vec![0u8; MAX_RESPONSE_SIZE as usize];
        assert!(validate_response_size(&at_limit, None).is_ok());

        // Response exceeding limit should fail
        let too_large = vec![0u8; (MAX_RESPONSE_SIZE + 1) as usize];
        let result = validate_response_size(&too_large, None);
        assert!(result.is_err());

        match result {
            Err(NuvioError::ResponseTooLarge { size, max_size }) => {
                assert_eq!(size, MAX_RESPONSE_SIZE + 1);
                assert_eq!(max_size, MAX_RESPONSE_SIZE);
            }
            _ => panic!("Expected ResponseTooLarge error"),
        }
    }

    #[test]
    fn test_size_limit_custom() {
        let custom_limit = 1024u64; // 1KB custom limit
        let data = vec![0u8; 2048]; // 2KB data

        let result = validate_response_size(&data, Some(custom_limit));
        assert!(result.is_err());

        match result {
            Err(NuvioError::ResponseTooLarge { size, max_size }) => {
                assert_eq!(size, 2048);
                assert_eq!(max_size, custom_limit);
            }
            _ => panic!("Expected ResponseTooLarge error"),
        }
    }

    #[test]
    fn test_validate_and_parse_json_success() {
        let json = r#"{"id":"test","name":"Test","version":"1.0.0","description":"Test addon"}"#;
        let result: Result<Manifest, NuvioError> = validate_and_parse_json(json, None);

        assert!(result.is_ok());
        let manifest = result.unwrap();
        assert_eq!(manifest.id, "test");
        assert_eq!(manifest.name, "Test");
    }

    #[test]
    fn test_validate_and_parse_json_too_large() {
        // Create a JSON string that exceeds 5MB
        let large_json = "x".repeat((MAX_RESPONSE_SIZE + 1) as usize);
        let result: Result<Manifest, NuvioError> = validate_and_parse_json(&large_json, None);

        assert!(result.is_err());
        match result {
            Err(NuvioError::ResponseTooLarge { .. }) => {}
            _ => panic!("Expected ResponseTooLarge error"),
        }
    }

    #[test]
    fn test_validate_and_parse_json_invalid() {
        let invalid_json = "{invalid json}";
        let result: Result<Manifest, NuvioError> = validate_and_parse_json(invalid_json, None);

        assert!(result.is_err());
        match result {
            Err(NuvioError::SerializationError { .. }) => {}
            _ => panic!("Expected SerializationError"),
        }
    }

    #[test]
    fn test_validate_manifest_success() {
        let manifest = Manifest::new(
            "com.example.addon".to_string(),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
            "Test description".to_string(),
        );

        assert!(validate_manifest(&manifest).is_ok());
    }

    #[test]
    fn test_validate_manifest_missing_id() {
        let manifest = Manifest::new(
            "".to_string(),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
            "Test description".to_string(),
        );

        let result = validate_manifest(&manifest);
        assert!(result.is_err());
        match result {
            Err(NuvioError::InvalidManifest { msg }) => {
                assert!(msg.contains("id"));
            }
            _ => panic!("Expected InvalidManifest error"),
        }
    }

    #[test]
    fn test_validate_manifest_missing_name() {
        let manifest = Manifest::new(
            "com.example.addon".to_string(),
            "".to_string(),
            "1.0.0".to_string(),
            "Test description".to_string(),
        );

        let result = validate_manifest(&manifest);
        assert!(result.is_err());
        match result {
            Err(NuvioError::InvalidManifest { msg }) => {
                assert!(msg.contains("name"));
            }
            _ => panic!("Expected InvalidManifest error"),
        }
    }

    #[test]
    fn test_validate_stream_with_url() {
        let stream = StremioStream::new_url("https://example.com/video.mp4".to_string());
        assert!(validate_stream(&stream).is_ok());
    }

    #[test]
    fn test_validate_stream_with_youtube() {
        let stream = StremioStream::new_youtube("dQw4w9WgXcQ".to_string());
        assert!(validate_stream(&stream).is_ok());
    }

    #[test]
    fn test_validate_stream_with_torrent() {
        let stream = StremioStream::new_torrent("a1b2c3d4e5f6".to_string());
        assert!(validate_stream(&stream).is_ok());
    }

    #[test]
    fn test_validate_stream_no_source() {
        let stream = StremioStream {
            url: None,
            yt_id: None,
            info_hash: None,
            external_url: None,
            nzb_url: None,
            rar_urls: None,
            zip_urls: None,
            seven_zip_urls: None,
            tgz_urls: None,
            tar_urls: None,
            file_idx: None,
            file_must_include: None,
            servers: None,
            name: Some("Test".to_string()),
            title: None,
            description: None,
            addon: None,
            addon_id: None,
            addon_name: None,
            size: None,
            is_free: None,
            is_debrid: None,
            quality: None,
            headers: None,
            subtitles: None,
            sources: None,
            behavior_hints: None,
        };

        let result = validate_stream(&stream);
        assert!(result.is_err());
        match result {
            Err(NuvioError::ValidationError { msg }) => {
                assert!(msg.contains("source"));
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    #[test]
    fn test_validate_meta_success() {
        let meta = Meta::new(
            "tt1234567".to_string(),
            "movie".to_string(),
            "Test Movie".to_string(),
        );

        assert!(validate_meta(&meta).is_ok());
    }

    #[test]
    fn test_validate_meta_missing_id() {
        let meta = Meta::new(
            "".to_string(),
            "movie".to_string(),
            "Test Movie".to_string(),
        );

        let result = validate_meta(&meta);
        assert!(result.is_err());
        match result {
            Err(NuvioError::ValidationError { msg }) => {
                assert!(msg.contains("id"));
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    #[test]
    fn test_sanitize() {
        // Test 1: Script tag removal
        let with_script = "Hello <script>alert('xss')</script> World";
        let cleaned = sanitize_html(with_script);
        assert!(!cleaned.contains("<script>"), "Should remove <script> tags");
        assert!(
            !cleaned.contains("</script>"),
            "Should remove </script> tags"
        );
        assert!(cleaned.contains("Hello"), "Should preserve safe text");
        assert!(cleaned.contains("World"), "Should preserve safe text");

        // Test 2: HTML entity escaping
        let with_entities = "A < B & C > D";
        let escaped = sanitize_html(with_entities);
        assert!(escaped.contains("&lt;"), "Should escape < to &lt;");
        assert!(escaped.contains("&amp;"), "Should escape & to &amp;");
        assert!(escaped.contains("&gt;"), "Should escape > to &gt;");
        assert_eq!(escaped, "A &lt; B &amp; C &gt; D");

        // Test 3: Quote escaping
        let with_quotes = r#"Say "hello" and 'goodbye'"#;
        let escaped_quotes = sanitize_html(with_quotes);
        assert!(
            escaped_quotes.contains("&quot;"),
            "Should escape double quotes"
        );
        assert!(
            escaped_quotes.contains("&#x27;"),
            "Should escape single quotes"
        );

        // Test 4: Combined script removal and entity escaping
        let complex = r#"<script>alert("xss")</script>A < B & C"#;
        let sanitized = sanitize_html(complex);
        assert!(!sanitized.contains("<script>"), "Should remove script tags");
        assert!(
            sanitized.contains("&lt;"),
            "Should escape < in remaining text"
        );
        assert!(
            sanitized.contains("&amp;"),
            "Should escape & in remaining text"
        );
        assert!(
            sanitized.contains("&quot;"),
            "Should escape quotes in remaining text"
        );

        // Test 5: Multiple dangerous tags
        let multi_tags = "<script>bad</script>Text<iframe></iframe><object></object>";
        let cleaned_multi = sanitize_html(multi_tags);
        assert!(
            !cleaned_multi.contains("<script>"),
            "Should remove all script tags"
        );
        assert!(
            !cleaned_multi.contains("<iframe>"),
            "Should remove all iframe tags"
        );
        assert!(
            !cleaned_multi.contains("<object>"),
            "Should remove all object tags"
        );
        assert!(
            cleaned_multi.contains("Text"),
            "Should preserve text content"
        );

        // Test 6: Case insensitive tag removal
        let mixed_case = "Test <SCRIPT>alert()</SCRIPT> <Script>bad</Script>";
        let cleaned_case = sanitize_html(mixed_case);
        assert!(
            !cleaned_case.to_lowercase().contains("<script>"),
            "Should handle mixed case tags"
        );
        assert!(cleaned_case.contains("Test"), "Should preserve text");

        // Test 7: Empty string
        let empty = sanitize_html("");
        assert_eq!(empty, "", "Should handle empty strings");

        // Test 8: Iframe tags
        let with_iframe = "Content <iframe src='evil.com'></iframe> here";
        let cleaned_iframe = sanitize_html(with_iframe);
        assert!(
            !cleaned_iframe.contains("<iframe"),
            "Should remove iframe opening tags"
        );
        assert!(
            !cleaned_iframe.contains("</iframe>"),
            "Should remove iframe closing tags"
        );
        assert!(
            cleaned_iframe.contains("Content"),
            "Should preserve content"
        );
    }

    #[test]
    fn test_sanitize_html_script_tags() {
        let dirty = "Hello <script>alert('xss')</script> World";
        let clean = sanitize_html(dirty);

        assert!(!clean.contains("<script>"));
        assert!(!clean.contains("</script>"));
        assert!(clean.contains("Hello"));
        assert!(clean.contains("World"));
    }

    #[test]
    fn test_sanitize_html_iframe() {
        let dirty = "Content <iframe src='evil.com'></iframe> here";
        let clean = sanitize_html(dirty);

        assert!(!clean.contains("<iframe"));
        assert!(!clean.contains("</iframe>"));
        assert!(clean.contains("Content"));
        assert!(clean.contains("here"));
    }

    #[test]
    fn test_sanitize_html_multiple_tags() {
        let dirty = "<script>bad</script>Text<iframe></iframe><object></object>";
        let clean = sanitize_html(dirty);

        assert!(!clean.contains("<script>"));
        assert!(!clean.contains("<iframe>"));
        assert!(!clean.contains("<object>"));
        assert!(clean.contains("Text"));
    }

    #[test]
    fn test_sanitize_html_case_insensitive() {
        let dirty = "Test <SCRIPT>alert()</SCRIPT> <Script>bad</Script>";
        let clean = sanitize_html(dirty);

        assert!(!clean.to_lowercase().contains("<script>"));
        assert!(clean.contains("Test"));
    }

    #[test]
    fn test_sanitize_meta() {
        let meta = Meta {
            id: "tt123".to_string(),
            content_type: "movie".to_string(),
            name: "Test <script>alert()</script> Movie".to_string(),
            description: Some("Description <iframe></iframe> text".to_string()),
            poster: None,
            poster_shape: None,
            background: None,
            logo: None,
            release_info: Some("2024 <script>bad</script>".to_string()),
            imdb_rating: None,
            year: Some(2024),
            genres: None,
            runtime: None,
            cast: None,
            director: None,
            writer: None,
            certification: None,
            country: None,
            imdb_id: None,
            slug: None,
            released: None,
            behavior_hints: None,
        };

        let clean = sanitize_meta(meta);

        assert!(!clean.name.contains("<script>"));
        assert!(clean.name.contains("Test"));
        assert!(clean.name.contains("Movie"));

        assert!(clean.description.is_some());
        let desc = clean.description.unwrap();
        assert!(!desc.contains("<iframe>"));
        assert!(desc.contains("Description"));

        assert!(clean.release_info.is_some());
        let release = clean.release_info.unwrap();
        assert!(!release.contains("<script>"));
        assert!(release.contains("2024"));
    }

    #[test]
    fn test_sanitize_stream() {
        let stream = StremioStream {
            url: Some("https://example.com/video.mp4".to_string()),
            name: Some("1080p <script>bad</script>".to_string()),
            title: Some("Title <iframe></iframe>".to_string()),
            description: Some("Desc <object></object>".to_string()),
            addon_name: Some("Addon <script>evil</script> Name".to_string()),
            yt_id: None,
            info_hash: None,
            external_url: None,
            nzb_url: None,
            rar_urls: None,
            zip_urls: None,
            seven_zip_urls: None,
            tgz_urls: None,
            tar_urls: None,
            file_idx: None,
            file_must_include: None,
            servers: None,
            addon: None,
            addon_id: None,
            size: None,
            is_free: None,
            is_debrid: None,
            quality: None,
            headers: None,
            subtitles: None,
            sources: None,
            behavior_hints: None,
        };

        let clean = sanitize_stream(stream);

        assert!(clean.name.is_some());
        assert!(!clean.name.unwrap().contains("<script>"));

        assert!(clean.title.is_some());
        assert!(!clean.title.unwrap().contains("<iframe>"));

        assert!(clean.description.is_some());
        assert!(!clean.description.unwrap().contains("<object>"));

        assert!(clean.addon_name.is_some());
        assert!(!clean.addon_name.unwrap().contains("<script>"));
    }

    #[test]
    fn test_sanitize_subtitle() {
        let subtitle = Subtitle {
            id: "sub-1".to_string(),
            url: "https://example.com/sub.vtt".to_string(),
            lang: "en".to_string(),
            fps: None,
            addon: None,
            addon_name: Some("Addon <script>bad</script> Name".to_string()),
            format: None,
        };

        let clean = sanitize_subtitle(subtitle);

        assert!(clean.addon_name.is_some());
        let addon_name = clean.addon_name.unwrap();
        assert!(!addon_name.contains("<script>"));
        assert!(addon_name.contains("Addon"));
        assert!(addon_name.contains("Name"));
    }

    #[test]
    fn test_max_response_size_constant() {
        assert_eq!(MAX_RESPONSE_SIZE, 5 * 1024 * 1024);
    }

    #[test]
    fn test_validate_manifest_all_fields_empty() {
        let manifest = Manifest::new(
            "".to_string(),
            "".to_string(),
            "".to_string(),
            "".to_string(),
        );

        // Should fail on first empty field check (id)
        let result = validate_manifest(&manifest);
        assert!(result.is_err());
    }

    #[test]
    fn test_sanitize_html_escapes_all_html() {
        let safe = "This is <b>bold</b> and <i>italic</i> text";
        let result = sanitize_html(safe);

        // After sanitization, all HTML tags (including safe ones) are escaped
        // This is intentional - we escape all HTML entities after removing dangerous tags
        assert!(result.contains("&lt;b&gt;"), "Should escape <b> tags");
        assert!(result.contains("&lt;/b&gt;"), "Should escape </b> tags");
        assert!(result.contains("&lt;i&gt;"), "Should escape <i> tags");
        assert!(result.contains("&lt;/i&gt;"), "Should escape </i> tags");
        assert!(result.contains("bold"), "Should preserve text content");
        assert!(result.contains("italic"), "Should preserve text content");
    }

    #[test]
    fn test_sanitize_html_empty_string() {
        let result = sanitize_html("");
        assert_eq!(result, "");
    }

    #[test]
    fn test_validate_stream_with_multiple_sources() {
        // Stream with multiple sources should still be valid
        let stream = StremioStream {
            url: Some("https://example.com/video.mp4".to_string()),
            yt_id: Some("abc123".to_string()),
            info_hash: None,
            external_url: None,
            nzb_url: None,
            rar_urls: None,
            zip_urls: None,
            seven_zip_urls: None,
            tgz_urls: None,
            tar_urls: None,
            file_idx: None,
            file_must_include: None,
            servers: None,
            name: Some("Test".to_string()),
            title: None,
            description: None,
            addon: None,
            addon_id: None,
            addon_name: None,
            size: None,
            is_free: None,
            is_debrid: None,
            quality: None,
            headers: None,
            subtitles: None,
            sources: None,
            behavior_hints: None,
        };

        assert!(validate_stream(&stream).is_ok());
    }
}
