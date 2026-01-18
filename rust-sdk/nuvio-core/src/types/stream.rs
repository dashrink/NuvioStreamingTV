//! Stream type - represents a video stream in the Nuvio Streaming TV platform.
//!
//! This type contains metadata about a specific video stream including URL, quality,
//! format, bitrate, and other streaming-specific attributes. It is designed to support
//! various streaming protocols (HLS, DASH, MP4) and quality levels.

use serde::{Deserialize, Serialize};
use uniffi;

/// Represents a video stream with quality and format information
///
/// All fields use UniFFI-compatible types (no lifetimes, no generics) to ensure
/// safe FFI export to Kotlin and Swift.
#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Stream {
    /// Unique identifier for this stream
    pub id: String,

    /// URL to the stream content
    pub url: String,

    /// Optional quality level (e.g., "1080p", "720p", "4K")
    pub quality: Option<String>,

    /// Optional format/protocol (e.g., "hls", "dash", "mp4")
    pub format: Option<String>,

    /// Optional bitrate in kbps
    pub bitrate: Option<i32>,

    /// Optional video codec (e.g., "h264", "h265", "vp9")
    pub codec: Option<String>,

    /// Optional audio language code (e.g., "en", "es", "fr")
    pub language: Option<String>,

    /// Optional URL to subtitle/caption file
    pub subtitle_url: Option<String>,
}

impl Stream {
    /// Creates a new Stream instance with required fields
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::types::stream::Stream;
    ///
    /// let stream = Stream::new(
    ///     "stream-123".to_string(),
    ///     "https://example.com/stream.m3u8".to_string()
    /// );
    /// assert_eq!(stream.id, "stream-123");
    /// assert_eq!(stream.url, "https://example.com/stream.m3u8");
    /// ```
    pub fn new(id: String, url: String) -> Self {
        Self {
            id,
            url,
            quality: None,
            format: None,
            bitrate: None,
            codec: None,
            language: None,
            subtitle_url: None,
        }
    }

    /// Creates a Stream instance with all fields specified
    #[allow(clippy::too_many_arguments)]
    pub fn with_details(
        id: String,
        url: String,
        quality: Option<String>,
        format: Option<String>,
        bitrate: Option<i32>,
        codec: Option<String>,
        language: Option<String>,
        subtitle_url: Option<String>,
    ) -> Self {
        Self {
            id,
            url,
            quality,
            format,
            bitrate,
            codec,
            language,
            subtitle_url,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stream_new() {
        let stream = Stream::new(
            "test-stream".to_string(),
            "https://example.com/video.m3u8".to_string(),
        );
        assert_eq!(stream.id, "test-stream");
        assert_eq!(stream.url, "https://example.com/video.m3u8");
        assert_eq!(stream.quality, None);
        assert_eq!(stream.format, None);
        assert_eq!(stream.bitrate, None);
        assert_eq!(stream.codec, None);
        assert_eq!(stream.language, None);
        assert_eq!(stream.subtitle_url, None);
    }

    #[test]
    fn test_stream_with_details() {
        let stream = Stream::with_details(
            "hd-stream".to_string(),
            "https://example.com/hd/stream.m3u8".to_string(),
            Some("1080p".to_string()),
            Some("hls".to_string()),
            Some(5000),
            Some("h264".to_string()),
            Some("en".to_string()),
            Some("https://example.com/subtitles/en.vtt".to_string()),
        );

        assert_eq!(stream.id, "hd-stream");
        assert_eq!(stream.url, "https://example.com/hd/stream.m3u8");
        assert_eq!(stream.quality, Some("1080p".to_string()));
        assert_eq!(stream.format, Some("hls".to_string()));
        assert_eq!(stream.bitrate, Some(5000));
        assert_eq!(stream.codec, Some("h264".to_string()));
        assert_eq!(stream.language, Some("en".to_string()));
        assert_eq!(
            stream.subtitle_url,
            Some("https://example.com/subtitles/en.vtt".to_string())
        );
    }

    #[test]
    fn test_stream_serde_roundtrip() {
        // Test serialization and deserialization with all fields populated
        let original = Stream::with_details(
            "4k-stream".to_string(),
            "https://example.com/4k/video.mpd".to_string(),
            Some("4K".to_string()),
            Some("dash".to_string()),
            Some(15000),
            Some("h265".to_string()),
            Some("es".to_string()),
            Some("https://example.com/subtitles/es.vtt".to_string()),
        );

        // Serialize to JSON
        let json = serde_json::to_string(&original).expect("Failed to serialize Stream");

        // Deserialize back
        let deserialized: Stream =
            serde_json::from_str(&json).expect("Failed to deserialize Stream");

        // Verify no data loss
        assert_eq!(original, deserialized);
        assert_eq!(deserialized.id, "4k-stream");
        assert_eq!(deserialized.quality, Some("4K".to_string()));
        assert_eq!(deserialized.bitrate, Some(15000));
    }

    #[test]
    fn test_stream_serde_roundtrip_minimal() {
        // Test serialization with only required fields
        let original = Stream::new(
            "minimal-stream".to_string(),
            "https://example.com/video.mp4".to_string(),
        );

        // Serialize to JSON
        let json = serde_json::to_string(&original).expect("Failed to serialize Stream");

        // Deserialize back
        let deserialized: Stream =
            serde_json::from_str(&json).expect("Failed to deserialize Stream");

        // Verify no data loss
        assert_eq!(original, deserialized);
        assert_eq!(deserialized.id, "minimal-stream");
        assert_eq!(deserialized.url, "https://example.com/video.mp4");
        assert_eq!(deserialized.quality, None);
        assert_eq!(deserialized.bitrate, None);
    }

    #[test]
    fn test_stream_optional_fields() {
        // Test that Option<T> fields handle None correctly
        let stream = Stream::new("test".to_string(), "https://test.com/stream".to_string());

        assert!(stream.quality.is_none());
        assert!(stream.format.is_none());
        assert!(stream.bitrate.is_none());
        assert!(stream.codec.is_none());
        assert!(stream.language.is_none());
        assert!(stream.subtitle_url.is_none());
    }

    #[test]
    fn test_stream_clone() {
        // Verify Clone trait works correctly
        let original = Stream::with_details(
            "clone-test".to_string(),
            "https://example.com/test.m3u8".to_string(),
            Some("720p".to_string()),
            Some("hls".to_string()),
            Some(3000),
            None,
            Some("fr".to_string()),
            None,
        );

        let cloned = original.clone();
        assert_eq!(original, cloned);
    }

    #[test]
    fn test_stream_debug() {
        // Verify Debug trait works correctly
        let stream = Stream::new(
            "debug-test".to_string(),
            "https://test.com/video".to_string(),
        );
        let debug_string = format!("{:?}", stream);
        assert!(debug_string.contains("debug-test"));
        assert!(debug_string.contains("https://test.com/video"));
    }

    #[test]
    fn test_stream_partial_eq() {
        // Verify PartialEq trait works correctly
        let stream1 = Stream::new("id1".to_string(), "url1".to_string());
        let stream2 = Stream::new("id1".to_string(), "url1".to_string());
        let stream3 = Stream::new("id2".to_string(), "url2".to_string());

        assert_eq!(stream1, stream2);
        assert_ne!(stream1, stream3);
    }

    #[test]
    fn test_stream_bitrate_values() {
        // Test various bitrate values
        let low_quality = Stream::with_details(
            "low".to_string(),
            "url".to_string(),
            Some("480p".to_string()),
            None,
            Some(1500),
            None,
            None,
            None,
        );
        assert_eq!(low_quality.bitrate, Some(1500));

        let high_quality = Stream::with_details(
            "high".to_string(),
            "url".to_string(),
            Some("4K".to_string()),
            None,
            Some(25000),
            None,
            None,
            None,
        );
        assert_eq!(high_quality.bitrate, Some(25000));
    }

    #[test]
    fn test_stream_different_formats() {
        // Test different streaming formats
        let hls = Stream::with_details(
            "hls".to_string(),
            "stream.m3u8".to_string(),
            None,
            Some("hls".to_string()),
            None,
            None,
            None,
            None,
        );
        assert_eq!(hls.format, Some("hls".to_string()));

        let dash = Stream::with_details(
            "dash".to_string(),
            "stream.mpd".to_string(),
            None,
            Some("dash".to_string()),
            None,
            None,
            None,
            None,
        );
        assert_eq!(dash.format, Some("dash".to_string()));

        let mp4 = Stream::with_details(
            "mp4".to_string(),
            "video.mp4".to_string(),
            None,
            Some("mp4".to_string()),
            None,
            None,
            None,
            None,
        );
        assert_eq!(mp4.format, Some("mp4".to_string()));
    }
}
