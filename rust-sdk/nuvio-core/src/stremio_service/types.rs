//! Stremio domain types for addon integration.
//!
//! This module defines the core data structures used for Stremio addon protocol,
//! including manifests, catalogs, streams, metadata, and subtitles. These types
//! represent the Stremio protocol schema and support JSON serialization via serde.
//! They are internal types that will be converted to/from Nuvio's main types when
//! exposed via FFI.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Default value for healthy field (true)
fn default_healthy() -> bool {
    true
}

/// Represents a Stremio addon with its configuration and metadata.
///
/// An addon is a remote service that provides content catalogs, metadata, and streams.
/// Each addon has a manifest that describes its capabilities and supported content types.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Addon {
    /// Unique identifier for this addon
    pub id: String,

    /// URL to the addon's manifest
    pub manifest_url: String,

    /// Display name of the addon
    pub name: String,

    /// Addon version string
    pub version: String,

    /// Whether this addon is currently enabled
    pub enabled: bool,

    /// Priority for conflict resolution (higher = more priority)
    pub priority: i32,

    /// Original URL before any redirects or transformations
    pub original_url: Option<String>,

    /// Whether this addon is currently healthy (responds to requests)
    #[serde(default = "default_healthy")]
    pub healthy: bool,

    /// Number of consecutive health check failures
    #[serde(default)]
    pub consecutive_failures: u32,
}

impl Addon {
    /// Creates a new Addon instance with required fields.
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::types::Addon;
    ///
    /// let addon = Addon::new(
    ///     "com.example.addon".to_string(),
    ///     "https://example.com/manifest.json".to_string(),
    ///     "Example Addon".to_string(),
    ///     "1.0.0".to_string(),
    /// );
    /// assert_eq!(addon.id, "com.example.addon");
    /// assert!(addon.enabled);
    /// assert_eq!(addon.priority, 0);
    /// ```
    pub fn new(id: String, manifest_url: String, name: String, version: String) -> Self {
        Self {
            id,
            manifest_url,
            name,
            version,
            enabled: true,
            priority: 0,
            original_url: None,
            healthy: true,
            consecutive_failures: 0,
        }
    }

    /// Creates an Addon instance with all fields specified.
    #[allow(clippy::too_many_arguments)]
    pub fn with_details(
        id: String,
        manifest_url: String,
        name: String,
        version: String,
        enabled: bool,
        priority: i32,
        original_url: Option<String>,
    ) -> Self {
        Self {
            id,
            manifest_url,
            name,
            version,
            enabled,
            priority,
            original_url,
            healthy: true,
            consecutive_failures: 0,
        }
    }
}

/// Represents a catalog extra property for filtering.
///
/// Extra properties allow filtering catalog results by genre, search query, etc.
/// Per Stremio protocol specification.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct CatalogExtra {
    /// Property name (e.g., "genre", "search", "skip")
    pub name: String,

    /// If true, this property must always be provided
    pub is_required: Option<bool>,

    /// Available options for this property (e.g., genre list)
    pub options: Option<Vec<String>>,

    /// Maximum number of selections allowed (default 1)
    pub options_limit: Option<i32>,
}

impl CatalogExtra {
    /// Creates a new CatalogExtra with just a name.
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::types::CatalogExtra;
    ///
    /// let extra = CatalogExtra::new("search".to_string());
    /// assert_eq!(extra.name, "search");
    /// assert_eq!(extra.is_required, None);
    /// ```
    pub fn new(name: String) -> Self {
        Self {
            name,
            is_required: None,
            options: None,
            options_limit: None,
        }
    }

    /// Creates a CatalogExtra with options.
    pub fn with_options(
        name: String,
        is_required: Option<bool>,
        options: Option<Vec<String>>,
        options_limit: Option<i32>,
    ) -> Self {
        Self {
            name,
            is_required,
            options,
            options_limit,
        }
    }
}

/// Represents a catalog in a Stremio addon.
///
/// Catalogs provide collections of content organized by type (movie, series, etc.)
/// with optional filtering via extra properties.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Catalog {
    /// Content type (e.g., "movie", "series", "tv", "channel")
    pub content_type: String,

    /// Unique catalog identifier
    pub id: String,

    /// Display name of the catalog
    pub name: String,

    /// Extra properties supported for filtering
    pub extra_supported: Option<Vec<String>>,

    /// Extra properties that must be provided
    pub extra_required: Option<Vec<String>>,

    /// Total number of items in this catalog
    pub item_count: Option<i32>,

    /// Detailed extra property definitions
    pub extra: Option<Vec<CatalogExtra>>,
}

impl Catalog {
    /// Creates a new Catalog with required fields.
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::types::Catalog;
    ///
    /// let catalog = Catalog::new(
    ///     "movie".to_string(),
    ///     "top".to_string(),
    ///     "Top Movies".to_string(),
    /// );
    /// assert_eq!(catalog.content_type, "movie");
    /// assert_eq!(catalog.id, "top");
    /// ```
    pub fn new(content_type: String, id: String, name: String) -> Self {
        Self {
            content_type,
            id,
            name,
            extra_supported: None,
            extra_required: None,
            item_count: None,
            extra: None,
        }
    }
}

/// Represents a resource type supported by an addon.
///
/// Resources define what operations an addon supports (catalog, meta, stream, subtitles).
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct ResourceObject {
    /// Resource name (e.g., "catalog", "meta", "stream", "subtitles")
    pub name: String,

    /// Content types supported by this resource
    pub types: Vec<String>,

    /// ID prefixes this resource handles (deprecated in favor of id_prefixes)
    pub id_prefix: Option<Vec<String>>,

    /// ID prefixes this resource handles
    pub id_prefixes: Option<Vec<String>>,
}

impl ResourceObject {
    /// Creates a new ResourceObject.
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::types::ResourceObject;
    ///
    /// let resource = ResourceObject::new(
    ///     "stream".to_string(),
    ///     vec!["movie".to_string(), "series".to_string()],
    /// );
    /// assert_eq!(resource.name, "stream");
    /// assert_eq!(resource.types.len(), 2);
    /// ```
    pub fn new(name: String, types: Vec<String>) -> Self {
        Self {
            name,
            types,
            id_prefix: None,
            id_prefixes: None,
        }
    }
}

/// Represents a Stremio addon manifest.
///
/// The manifest describes an addon's capabilities, supported content types,
/// available catalogs, and resources. This is the primary discovery mechanism
/// for Stremio addons.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Manifest {
    /// Unique addon identifier (reverse domain notation recommended)
    pub id: String,

    /// Display name of the addon
    pub name: String,

    /// Semantic version string
    pub version: String,

    /// Human-readable description
    pub description: String,

    /// Base URL of the addon (optional)
    pub url: Option<String>,

    /// Original URL before redirects (optional)
    pub original_url: Option<String>,

    /// Catalogs provided by this addon
    pub catalogs: Option<Vec<Catalog>>,

    /// Resources supported by this addon
    pub resources: Option<Vec<ResourceObject>>,

    /// Content types supported (legacy field)
    pub types: Option<Vec<String>>,

    /// ID prefixes handled by this addon
    pub id_prefixes: Option<Vec<String>>,

    /// Manifest version (protocol version)
    pub manifest_version: Option<String>,

    /// Query parameters to append to requests
    pub query_params: Option<String>,

    /// Behavior hints for the addon
    pub behavior_hints: Option<HashMap<String, String>>,
}

impl Manifest {
    /// Creates a new Manifest with required fields.
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::types::Manifest;
    ///
    /// let manifest = Manifest::new(
    ///     "com.example.addon".to_string(),
    ///     "Example Addon".to_string(),
    ///     "1.0.0".to_string(),
    ///     "An example Stremio addon".to_string(),
    /// );
    /// assert_eq!(manifest.id, "com.example.addon");
    /// assert_eq!(manifest.name, "Example Addon");
    /// ```
    pub fn new(id: String, name: String, version: String, description: String) -> Self {
        Self {
            id,
            name,
            version,
            description,
            url: None,
            original_url: None,
            catalogs: None,
            resources: None,
            types: None,
            id_prefixes: None,
            manifest_version: None,
            query_params: None,
            behavior_hints: None,
        }
    }
}

/// Represents a subtitle track for video content.
///
/// Subtitles can be provided directly via URL or embedded in stream responses.
/// Supports multiple formats (SRT, VTT, ASS, SSA).
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Subtitle {
    /// Unique identifier for this subtitle
    pub id: String,

    /// Direct URL to the subtitle file
    pub url: String,

    /// Language code (ISO 639-1 or 639-2)
    pub lang: String,

    /// Frames per second (for timing adjustment)
    pub fps: Option<f64>,

    /// Addon ID that provided this subtitle
    pub addon: Option<String>,

    /// Display name of the addon
    #[serde(rename = "addonName")]
    pub addon_name: Option<String>,

    /// Subtitle format
    pub format: Option<String>,
}

impl Subtitle {
    /// Creates a new Subtitle with required fields.
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::types::Subtitle;
    ///
    /// let subtitle = Subtitle::new(
    ///     "sub-123".to_string(),
    ///     "https://example.com/subtitles/en.vtt".to_string(),
    ///     "en".to_string(),
    /// );
    /// assert_eq!(subtitle.id, "sub-123");
    /// assert_eq!(subtitle.lang, "en");
    /// assert_eq!(subtitle.format, None);
    /// ```
    pub fn new(id: String, url: String, lang: String) -> Self {
        Self {
            id,
            url,
            lang,
            fps: None,
            addon: None,
            addon_name: None,
            format: None,
        }
    }

    /// Creates a Subtitle with all fields specified.
    #[allow(clippy::too_many_arguments)]
    pub fn with_details(
        id: String,
        url: String,
        lang: String,
        fps: Option<f64>,
        addon: Option<String>,
        addon_name: Option<String>,
        format: Option<String>,
    ) -> Self {
        Self {
            id,
            url,
            lang,
            fps,
            addon,
            addon_name,
            format,
        }
    }
}

/// Source object for archive streams (RAR, ZIP, 7z, etc.).
///
/// Used when streams are contained in archive files that need extraction.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct SourceObject {
    /// URL to the archive file
    pub url: String,

    /// Size in bytes (optional)
    pub bytes: Option<i64>,
}

impl SourceObject {
    /// Creates a new SourceObject.
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::types::SourceObject;
    ///
    /// let source = SourceObject::new("https://example.com/archive.rar".to_string());
    /// assert_eq!(source.url, "https://example.com/archive.rar");
    /// assert_eq!(source.bytes, None);
    /// ```
    pub fn new(url: String) -> Self {
        Self { url, bytes: None }
    }

    /// Creates a SourceObject with size specified.
    pub fn with_size(url: String, bytes: i64) -> Self {
        Self {
            url,
            bytes: Some(bytes),
        }
    }
}

/// Represents a video stream source.
///
/// Streams can come from various sources: direct HTTP URLs, YouTube, BitTorrent,
/// Usenet, or archive files. The stream object contains all necessary information
/// to resolve and play the content.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct StremioStream {
    // Primary stream sources (one must be provided)
    /// Direct HTTP(S)/FTP(S)/RTMP URL
    pub url: Option<String>,

    /// YouTube video ID
    #[serde(rename = "ytId")]
    pub yt_id: Option<String>,

    /// BitTorrent info hash
    #[serde(rename = "infoHash")]
    pub info_hash: Option<String>,

    /// External URL to open in browser
    #[serde(rename = "externalUrl")]
    pub external_url: Option<String>,

    /// Usenet NZB file URL
    #[serde(rename = "nzbUrl")]
    pub nzb_url: Option<String>,

    // Archive sources
    /// RAR archive files
    #[serde(rename = "rarUrls")]
    pub rar_urls: Option<Vec<SourceObject>>,

    /// ZIP archive files
    #[serde(rename = "zipUrls")]
    pub zip_urls: Option<Vec<SourceObject>>,

    /// 7z archive files
    #[serde(rename = "7zipUrls")]
    pub seven_zip_urls: Option<Vec<SourceObject>>,

    /// TGZ archive files
    #[serde(rename = "tgzUrls")]
    pub tgz_urls: Option<Vec<SourceObject>>,

    /// TAR archive files
    #[serde(rename = "tarUrls")]
    pub tar_urls: Option<Vec<SourceObject>>,

    // Stream selection
    /// File index in archive/torrent
    #[serde(rename = "fileIdx")]
    pub file_idx: Option<i32>,

    /// Regex for file matching in archives
    #[serde(rename = "fileMustInclude")]
    pub file_must_include: Option<String>,

    /// NNTP servers for nzbUrl
    pub servers: Option<Vec<String>>,

    // Display information
    /// Stream name (usually quality)
    pub name: Option<String>,

    /// Stream title/description (deprecated for description)
    pub title: Option<String>,

    /// Stream description
    pub description: Option<String>,

    // Addon identification
    /// Addon URL
    pub addon: Option<String>,

    /// Addon unique identifier
    #[serde(rename = "addonId")]
    pub addon_id: Option<String>,

    /// Addon display name
    #[serde(rename = "addonName")]
    pub addon_name: Option<String>,

    // Stream properties
    /// Stream size in bytes
    pub size: Option<i64>,

    /// Whether this is a free stream
    #[serde(rename = "isFree")]
    pub is_free: Option<bool>,

    /// Whether this is a debrid stream
    #[serde(rename = "isDebrid")]
    pub is_debrid: Option<bool>,

    /// Quality indicator
    pub quality: Option<String>,

    /// Custom HTTP headers
    pub headers: Option<HashMap<String, String>>,

    /// Embedded subtitles
    pub subtitles: Option<Vec<Subtitle>>,

    /// Additional tracker/DHT sources
    pub sources: Option<Vec<String>>,

    /// Behavior hints (free-form map)
    #[serde(rename = "behaviorHints")]
    pub behavior_hints: Option<HashMap<String, String>>,
}

impl StremioStream {
    /// Creates a new StremioStream with a direct URL.
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::types::StremioStream;
    ///
    /// let stream = StremioStream::new_url("https://example.com/video.mp4".to_string());
    /// assert_eq!(stream.url, Some("https://example.com/video.mp4".to_string()));
    /// ```
    pub fn new_url(url: String) -> Self {
        Self {
            url: Some(url),
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
            name: None,
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
        }
    }

    /// Creates a new StremioStream with a YouTube ID.
    pub fn new_youtube(yt_id: String) -> Self {
        Self {
            url: None,
            yt_id: Some(yt_id),
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
            name: None,
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
        }
    }

    /// Creates a new StremioStream with a BitTorrent info hash.
    pub fn new_torrent(info_hash: String) -> Self {
        Self {
            url: None,
            yt_id: None,
            info_hash: Some(info_hash),
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
            name: None,
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
        }
    }
}

/// Represents content metadata from a Stremio addon.
///
/// Meta objects contain information about movies, series, TV shows, or other content
/// including posters, descriptions, cast, ratings, etc.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Meta {
    /// Unique identifier (usually IMDb ID or similar)
    pub id: String,

    /// Content type (movie, series, tv, channel, etc.)
    pub content_type: String,

    /// Content title/name
    pub name: String,

    /// Poster image URL
    pub poster: Option<String>,

    /// Poster aspect ratio shape
    pub poster_shape: Option<String>,

    /// Background image URL
    pub background: Option<String>,

    /// Logo image URL
    pub logo: Option<String>,

    /// Long-form description
    pub description: Option<String>,

    /// Release information string
    pub release_info: Option<String>,

    /// IMDb rating
    pub imdb_rating: Option<String>,

    /// Release year
    pub year: Option<i32>,

    /// Genre tags
    pub genres: Option<Vec<String>>,

    /// Runtime string (e.g., "120 min")
    pub runtime: Option<String>,

    /// Cast member names
    pub cast: Option<Vec<String>>,

    /// Director name(s)
    pub director: Option<Vec<String>>,

    /// Writer name(s)
    pub writer: Option<Vec<String>>,

    /// Age certification (e.g., "PG-13", "R")
    pub certification: Option<String>,

    /// Country of origin
    pub country: Option<String>,

    /// IMDb ID
    pub imdb_id: Option<String>,

    /// URL slug
    pub slug: Option<String>,

    /// Release date string
    pub released: Option<String>,

    /// Behavior hints (free-form map)
    pub behavior_hints: Option<HashMap<String, String>>,
}

impl Meta {
    /// Creates a new Meta with required fields.
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::stremio_service::types::Meta;
    ///
    /// let meta = Meta::new(
    ///     "tt1234567".to_string(),
    ///     "movie".to_string(),
    ///     "Example Movie".to_string(),
    /// );
    /// assert_eq!(meta.id, "tt1234567");
    /// assert_eq!(meta.content_type, "movie");
    /// assert_eq!(meta.name, "Example Movie");
    /// ```
    pub fn new(id: String, content_type: String, name: String) -> Self {
        Self {
            id,
            content_type,
            name,
            poster: None,
            poster_shape: None,
            background: None,
            logo: None,
            description: None,
            release_info: None,
            imdb_rating: None,
            year: None,
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
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_addon_new() {
        let addon = Addon::new(
            "com.test.addon".to_string(),
            "https://test.com/manifest.json".to_string(),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
        );

        assert_eq!(addon.id, "com.test.addon");
        assert_eq!(addon.manifest_url, "https://test.com/manifest.json");
        assert_eq!(addon.name, "Test Addon");
        assert_eq!(addon.version, "1.0.0");
        assert!(addon.enabled);
        assert_eq!(addon.priority, 0);
        assert_eq!(addon.original_url, None);
    }

    #[test]
    fn test_addon_with_details() {
        let addon = Addon::with_details(
            "com.test.addon".to_string(),
            "https://test.com/manifest.json".to_string(),
            "Test Addon".to_string(),
            "2.0.0".to_string(),
            false,
            10,
            Some("https://original.com/manifest.json".to_string()),
        );

        assert_eq!(addon.id, "com.test.addon");
        assert!(!addon.enabled);
        assert_eq!(addon.priority, 10);
        assert_eq!(
            addon.original_url,
            Some("https://original.com/manifest.json".to_string())
        );
    }

    #[test]
    fn test_addon_serde_roundtrip() {
        let original = Addon::with_details(
            "com.example".to_string(),
            "https://example.com/manifest.json".to_string(),
            "Example".to_string(),
            "1.0.0".to_string(),
            true,
            5,
            None,
        );

        let json = serde_json::to_string(&original).expect("Failed to serialize Addon");
        let deserialized: Addon = serde_json::from_str(&json).expect("Failed to deserialize Addon");

        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_manifest_new() {
        let manifest = Manifest::new(
            "com.test.addon".to_string(),
            "Test Addon".to_string(),
            "1.0.0".to_string(),
            "A test addon".to_string(),
        );

        assert_eq!(manifest.id, "com.test.addon");
        assert_eq!(manifest.name, "Test Addon");
        assert_eq!(manifest.version, "1.0.0");
        assert_eq!(manifest.description, "A test addon");
        assert_eq!(manifest.catalogs, None);
        assert_eq!(manifest.resources, None);
    }

    #[test]
    fn test_manifest_serde_roundtrip() {
        let mut manifest = Manifest::new(
            "com.test".to_string(),
            "Test".to_string(),
            "1.0.0".to_string(),
            "Test manifest".to_string(),
        );

        manifest.catalogs = Some(vec![Catalog::new(
            "movie".to_string(),
            "top".to_string(),
            "Top Movies".to_string(),
        )]);

        let json = serde_json::to_string(&manifest).expect("Failed to serialize Manifest");
        let deserialized: Manifest =
            serde_json::from_str(&json).expect("Failed to deserialize Manifest");

        assert_eq!(manifest, deserialized);
    }

    #[test]
    fn test_subtitle_new() {
        let subtitle = Subtitle::new(
            "sub-123".to_string(),
            "https://example.com/sub.vtt".to_string(),
            "en".to_string(),
        );

        assert_eq!(subtitle.id, "sub-123");
        assert_eq!(subtitle.url, "https://example.com/sub.vtt");
        assert_eq!(subtitle.lang, "en");
        assert_eq!(subtitle.fps, None);
        assert_eq!(subtitle.format, None);
    }

    #[test]
    fn test_subtitle_with_details() {
        let subtitle = Subtitle::with_details(
            "sub-456".to_string(),
            "https://example.com/sub.srt".to_string(),
            "es".to_string(),
            Some(23.976),
            Some("com.addon".to_string()),
            Some("Addon Name".to_string()),
            Some("srt".to_string()),
        );

        assert_eq!(subtitle.id, "sub-456");
        assert_eq!(subtitle.lang, "es");
        assert_eq!(subtitle.fps, Some(23.976));
        assert_eq!(subtitle.format, Some("srt".to_string()));
    }

    #[test]
    fn test_subtitle_serde_roundtrip() {
        let original = Subtitle::with_details(
            "sub-789".to_string(),
            "https://example.com/sub.vtt".to_string(),
            "fr".to_string(),
            Some(25.0),
            Some("addon-id".to_string()),
            Some("Addon".to_string()),
            Some("vtt".to_string()),
        );

        let json = serde_json::to_string(&original).expect("Failed to serialize Subtitle");
        let deserialized: Subtitle =
            serde_json::from_str(&json).expect("Failed to deserialize Subtitle");

        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_stremio_stream_new_url() {
        let stream = StremioStream::new_url("https://example.com/video.mp4".to_string());

        assert_eq!(
            stream.url,
            Some("https://example.com/video.mp4".to_string())
        );
        assert_eq!(stream.yt_id, None);
        assert_eq!(stream.info_hash, None);
    }

    #[test]
    fn test_stremio_stream_new_youtube() {
        let stream = StremioStream::new_youtube("dQw4w9WgXcQ".to_string());

        assert_eq!(stream.url, None);
        assert_eq!(stream.yt_id, Some("dQw4w9WgXcQ".to_string()));
        assert_eq!(stream.info_hash, None);
    }

    #[test]
    fn test_stremio_stream_new_torrent() {
        let stream = StremioStream::new_torrent("a1b2c3d4e5f6g7h8i9j0".to_string());

        assert_eq!(stream.url, None);
        assert_eq!(stream.yt_id, None);
        assert_eq!(stream.info_hash, Some("a1b2c3d4e5f6g7h8i9j0".to_string()));
    }

    #[test]
    fn test_stremio_stream_serde_roundtrip() {
        let mut original = StremioStream::new_url("https://test.com/video.mp4".to_string());
        original.name = Some("1080p".to_string());
        original.quality = Some("FHD".to_string());
        original.size = Some(1024 * 1024 * 1024);

        let json = serde_json::to_string(&original).expect("Failed to serialize StremioStream");
        let deserialized: StremioStream =
            serde_json::from_str(&json).expect("Failed to deserialize StremioStream");

        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_meta_new() {
        let meta = Meta::new(
            "tt1234567".to_string(),
            "movie".to_string(),
            "Test Movie".to_string(),
        );

        assert_eq!(meta.id, "tt1234567");
        assert_eq!(meta.content_type, "movie");
        assert_eq!(meta.name, "Test Movie");
        assert_eq!(meta.poster, None);
        assert_eq!(meta.year, None);
    }

    #[test]
    fn test_meta_serde_roundtrip() {
        let mut original = Meta::new(
            "tt9999999".to_string(),
            "series".to_string(),
            "Test Series".to_string(),
        );
        original.year = Some(2024);
        original.genres = Some(vec!["Action".to_string(), "Drama".to_string()]);
        original.imdb_rating = Some("8.5".to_string());

        let json = serde_json::to_string(&original).expect("Failed to serialize Meta");
        let deserialized: Meta = serde_json::from_str(&json).expect("Failed to deserialize Meta");

        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_catalog_new() {
        let catalog = Catalog::new(
            "movie".to_string(),
            "trending".to_string(),
            "Trending Movies".to_string(),
        );

        assert_eq!(catalog.content_type, "movie");
        assert_eq!(catalog.id, "trending");
        assert_eq!(catalog.name, "Trending Movies");
        assert_eq!(catalog.extra_supported, None);
    }

    #[test]
    fn test_catalog_serde_roundtrip() {
        let mut catalog = Catalog::new(
            "series".to_string(),
            "top".to_string(),
            "Top Series".to_string(),
        );
        catalog.extra_supported = Some(vec!["genre".to_string(), "skip".to_string()]);
        catalog.item_count = Some(100);

        let json = serde_json::to_string(&catalog).expect("Failed to serialize Catalog");
        let deserialized: Catalog =
            serde_json::from_str(&json).expect("Failed to deserialize Catalog");

        assert_eq!(catalog, deserialized);
    }

    #[test]
    fn test_catalog_extra_new() {
        let extra = CatalogExtra::new("search".to_string());

        assert_eq!(extra.name, "search");
        assert_eq!(extra.is_required, None);
        assert_eq!(extra.options, None);
    }

    #[test]
    fn test_catalog_extra_with_options() {
        let extra = CatalogExtra::with_options(
            "genre".to_string(),
            Some(false),
            Some(vec!["Action".to_string(), "Drama".to_string()]),
            Some(3),
        );

        assert_eq!(extra.name, "genre");
        assert_eq!(extra.is_required, Some(false));
        assert_eq!(extra.options_limit, Some(3));
    }

    #[test]
    fn test_resource_object_new() {
        let resource = ResourceObject::new(
            "stream".to_string(),
            vec!["movie".to_string(), "series".to_string()],
        );

        assert_eq!(resource.name, "stream");
        assert_eq!(resource.types.len(), 2);
        assert_eq!(resource.id_prefixes, None);
    }

    #[test]
    fn test_source_object_new() {
        let source = SourceObject::new("https://example.com/file.rar".to_string());

        assert_eq!(source.url, "https://example.com/file.rar");
        assert_eq!(source.bytes, None);
    }

    #[test]
    fn test_source_object_with_size() {
        let source = SourceObject::with_size("https://example.com/file.zip".to_string(), 1024000);

        assert_eq!(source.url, "https://example.com/file.zip");
        assert_eq!(source.bytes, Some(1024000));
    }
}
