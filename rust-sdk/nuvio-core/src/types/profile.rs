//! Profile type - represents a user profile in the Nuvio Streaming TV platform.
//!
//! This type represents a user profile with personalization settings including
//! avatar, parental controls, language preferences, and viewing settings. Each
//! account can have multiple profiles for different family members.

use serde::{Deserialize, Serialize};
use uniffi;

/// A user profile with personalization settings
///
/// All fields use UniFFI-compatible types (no lifetimes, no generics) to ensure
/// safe FFI export to Kotlin and Swift.
#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Profile {
    /// Unique identifier for this profile
    pub id: String,

    /// Display name of the profile (e.g., "John", "Kids")
    pub name: String,

    /// Optional URL to profile avatar image
    pub avatar_url: Option<String>,

    /// Whether this is a kids profile (affects content filtering)
    pub is_kids: bool,

    /// Optional PIN code for profile access protection
    pub pin: Option<String>,

    /// Optional preferred language code (e.g., "en", "es", "fr")
    pub language: Option<String>,

    /// Optional autoplay next episode setting
    pub autoplay_next: Option<bool>,

    /// Optional maturity rating limit (e.g., "G", "PG", "PG-13", "R")
    pub maturity_rating: Option<String>,
}

impl Profile {
    /// Creates a new Profile instance with required fields
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::types::profile::Profile;
    ///
    /// let profile = Profile::new("profile-123".to_string(), "John".to_string());
    /// assert_eq!(profile.id, "profile-123");
    /// assert_eq!(profile.name, "John");
    /// assert_eq!(profile.is_kids, false);
    /// ```
    pub fn new(id: String, name: String) -> Self {
        Self {
            id,
            name,
            avatar_url: None,
            is_kids: false,
            pin: None,
            language: None,
            autoplay_next: None,
            maturity_rating: None,
        }
    }

    /// Creates a kids Profile instance with appropriate defaults
    ///
    /// # Examples
    ///
    /// ```
    /// use nuvio_core::types::profile::Profile;
    ///
    /// let profile = Profile::new_kids("profile-456".to_string(), "Kids".to_string());
    /// assert_eq!(profile.id, "profile-456");
    /// assert_eq!(profile.name, "Kids");
    /// assert_eq!(profile.is_kids, true);
    /// assert_eq!(profile.maturity_rating, Some("G".to_string()));
    /// ```
    pub fn new_kids(id: String, name: String) -> Self {
        Self {
            id,
            name,
            avatar_url: None,
            is_kids: true,
            pin: None,
            language: None,
            autoplay_next: Some(true),
            maturity_rating: Some("G".to_string()),
        }
    }

    /// Creates a Profile instance with all fields specified
    #[allow(clippy::too_many_arguments)]
    pub fn with_details(
        id: String,
        name: String,
        avatar_url: Option<String>,
        is_kids: bool,
        pin: Option<String>,
        language: Option<String>,
        autoplay_next: Option<bool>,
        maturity_rating: Option<String>,
    ) -> Self {
        Self {
            id,
            name,
            avatar_url,
            is_kids,
            pin,
            language,
            autoplay_next,
            maturity_rating,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_profile_new() {
        let profile = Profile::new("test-profile".to_string(), "Test User".to_string());
        assert_eq!(profile.id, "test-profile");
        assert_eq!(profile.name, "Test User");
        assert_eq!(profile.avatar_url, None);
        assert_eq!(profile.is_kids, false);
        assert_eq!(profile.pin, None);
        assert_eq!(profile.language, None);
        assert_eq!(profile.autoplay_next, None);
        assert_eq!(profile.maturity_rating, None);
    }

    #[test]
    fn test_profile_new_kids() {
        let profile = Profile::new_kids("kids-profile".to_string(), "Kids".to_string());
        assert_eq!(profile.id, "kids-profile");
        assert_eq!(profile.name, "Kids");
        assert_eq!(profile.is_kids, true);
        assert_eq!(profile.autoplay_next, Some(true));
        assert_eq!(profile.maturity_rating, Some("G".to_string()));
    }

    #[test]
    fn test_profile_with_details() {
        let profile = Profile::with_details(
            "john-profile".to_string(),
            "John Doe".to_string(),
            Some("https://example.com/avatars/john.jpg".to_string()),
            false,
            Some("1234".to_string()),
            Some("en".to_string()),
            Some(true),
            Some("R".to_string()),
        );

        assert_eq!(profile.id, "john-profile");
        assert_eq!(profile.name, "John Doe");
        assert_eq!(
            profile.avatar_url,
            Some("https://example.com/avatars/john.jpg".to_string())
        );
        assert_eq!(profile.is_kids, false);
        assert_eq!(profile.pin, Some("1234".to_string()));
        assert_eq!(profile.language, Some("en".to_string()));
        assert_eq!(profile.autoplay_next, Some(true));
        assert_eq!(profile.maturity_rating, Some("R".to_string()));
    }

    #[test]
    fn test_profile_serde_roundtrip() {
        // Test serialization and deserialization with all fields populated
        let original = Profile::with_details(
            "profile-789".to_string(),
            "Jane Smith".to_string(),
            Some("https://example.com/avatars/jane.jpg".to_string()),
            false,
            Some("5678".to_string()),
            Some("es".to_string()),
            Some(false),
            Some("PG-13".to_string()),
        );

        // Serialize to JSON
        let json = serde_json::to_string(&original).expect("Failed to serialize Profile");

        // Deserialize back
        let deserialized: Profile =
            serde_json::from_str(&json).expect("Failed to deserialize Profile");

        // Verify no data loss
        assert_eq!(original, deserialized);
        assert_eq!(deserialized.id, "profile-789");
        assert_eq!(deserialized.name, "Jane Smith");
        assert_eq!(deserialized.language, Some("es".to_string()));
        assert_eq!(deserialized.maturity_rating, Some("PG-13".to_string()));
    }

    #[test]
    fn test_profile_serde_roundtrip_minimal() {
        // Test serialization with only required fields
        let original = Profile::new("minimal-profile".to_string(), "Minimal User".to_string());

        // Serialize to JSON
        let json = serde_json::to_string(&original).expect("Failed to serialize Profile");

        // Deserialize back
        let deserialized: Profile =
            serde_json::from_str(&json).expect("Failed to deserialize Profile");

        // Verify no data loss
        assert_eq!(original, deserialized);
        assert_eq!(deserialized.id, "minimal-profile");
        assert_eq!(deserialized.name, "Minimal User");
        assert_eq!(deserialized.is_kids, false);
        assert_eq!(deserialized.avatar_url, None);
        assert_eq!(deserialized.pin, None);
    }

    #[test]
    fn test_profile_optional_fields() {
        // Test that Option<T> fields handle None correctly
        let profile = Profile::new("test".to_string(), "Test".to_string());

        assert!(profile.avatar_url.is_none());
        assert!(profile.pin.is_none());
        assert!(profile.language.is_none());
        assert!(profile.autoplay_next.is_none());
        assert!(profile.maturity_rating.is_none());
    }

    #[test]
    fn test_profile_clone() {
        // Verify Clone trait works correctly
        let original = Profile::with_details(
            "clone-test".to_string(),
            "Clone Test".to_string(),
            Some("https://example.com/avatar.jpg".to_string()),
            true,
            Some("9999".to_string()),
            Some("fr".to_string()),
            Some(true),
            Some("PG".to_string()),
        );

        let cloned = original.clone();
        assert_eq!(original, cloned);
        assert_eq!(cloned.is_kids, true);
        assert_eq!(cloned.language, Some("fr".to_string()));
    }

    #[test]
    fn test_profile_debug() {
        // Verify Debug trait works correctly
        let profile = Profile::new("debug-test".to_string(), "Debug Test".to_string());
        let debug_string = format!("{:?}", profile);

        assert!(debug_string.contains("Profile"));
        assert!(debug_string.contains("debug-test"));
        assert!(debug_string.contains("Debug Test"));
    }

    #[test]
    fn test_profile_partial_eq() {
        // Verify PartialEq trait works correctly
        let profile1 = Profile::new("id1".to_string(), "User1".to_string());
        let profile2 = Profile::new("id1".to_string(), "User1".to_string());
        let profile3 = Profile::new("id2".to_string(), "User2".to_string());

        assert_eq!(profile1, profile2);
        assert_ne!(profile1, profile3);
    }

    #[test]
    fn test_profile_kids_vs_adult() {
        // Test difference between kids and adult profiles
        let adult = Profile::new("adult".to_string(), "Adult User".to_string());
        let kids = Profile::new_kids("kids".to_string(), "Kids User".to_string());

        assert_eq!(adult.is_kids, false);
        assert_eq!(kids.is_kids, true);
        assert_eq!(adult.maturity_rating, None);
        assert_eq!(kids.maturity_rating, Some("G".to_string()));
    }

    #[test]
    fn test_profile_pin_protection() {
        // Test PIN protection functionality
        let with_pin = Profile::with_details(
            "protected".to_string(),
            "Protected User".to_string(),
            None,
            false,
            Some("1234".to_string()),
            None,
            None,
            None,
        );
        assert_eq!(with_pin.pin, Some("1234".to_string()));

        let without_pin = Profile::new("unprotected".to_string(), "Unprotected User".to_string());
        assert!(without_pin.pin.is_none());
    }

    #[test]
    fn test_profile_language_preferences() {
        // Test different language preferences
        let english = Profile::with_details(
            "en-user".to_string(),
            "English User".to_string(),
            None,
            false,
            None,
            Some("en".to_string()),
            None,
            None,
        );
        assert_eq!(english.language, Some("en".to_string()));

        let spanish = Profile::with_details(
            "es-user".to_string(),
            "Spanish User".to_string(),
            None,
            false,
            None,
            Some("es".to_string()),
            None,
            None,
        );
        assert_eq!(spanish.language, Some("es".to_string()));

        let french = Profile::with_details(
            "fr-user".to_string(),
            "French User".to_string(),
            None,
            false,
            None,
            Some("fr".to_string()),
            None,
            None,
        );
        assert_eq!(french.language, Some("fr".to_string()));
    }

    #[test]
    fn test_profile_autoplay_settings() {
        // Test autoplay preferences
        let autoplay_on = Profile::with_details(
            "autoplay-on".to_string(),
            "Autoplay On".to_string(),
            None,
            false,
            None,
            None,
            Some(true),
            None,
        );
        assert_eq!(autoplay_on.autoplay_next, Some(true));

        let autoplay_off = Profile::with_details(
            "autoplay-off".to_string(),
            "Autoplay Off".to_string(),
            None,
            false,
            None,
            None,
            Some(false),
            None,
        );
        assert_eq!(autoplay_off.autoplay_next, Some(false));

        let autoplay_default = Profile::new("default".to_string(), "Default".to_string());
        assert!(autoplay_default.autoplay_next.is_none());
    }

    #[test]
    fn test_profile_maturity_ratings() {
        // Test various maturity rating levels
        let g_rated = Profile::with_details(
            "g".to_string(),
            "G User".to_string(),
            None,
            true,
            None,
            None,
            None,
            Some("G".to_string()),
        );
        assert_eq!(g_rated.maturity_rating, Some("G".to_string()));

        let pg_rated = Profile::with_details(
            "pg".to_string(),
            "PG User".to_string(),
            None,
            false,
            None,
            None,
            None,
            Some("PG".to_string()),
        );
        assert_eq!(pg_rated.maturity_rating, Some("PG".to_string()));

        let pg13_rated = Profile::with_details(
            "pg13".to_string(),
            "PG-13 User".to_string(),
            None,
            false,
            None,
            None,
            None,
            Some("PG-13".to_string()),
        );
        assert_eq!(pg13_rated.maturity_rating, Some("PG-13".to_string()));

        let r_rated = Profile::with_details(
            "r".to_string(),
            "R User".to_string(),
            None,
            false,
            None,
            None,
            None,
            Some("R".to_string()),
        );
        assert_eq!(r_rated.maturity_rating, Some("R".to_string()));
    }

    #[test]
    fn test_profile_avatar_url() {
        // Test avatar URL handling
        let with_avatar = Profile::with_details(
            "avatar-user".to_string(),
            "Avatar User".to_string(),
            Some("https://example.com/avatars/user123.png".to_string()),
            false,
            None,
            None,
            None,
            None,
        );
        assert_eq!(
            with_avatar.avatar_url,
            Some("https://example.com/avatars/user123.png".to_string())
        );

        let without_avatar = Profile::new("no-avatar".to_string(), "No Avatar".to_string());
        assert!(without_avatar.avatar_url.is_none());
    }
}
