//! Profile type - represents a user profile in the Nuvio Streaming TV platform.
//!
//! This type represents a user profile with personalization settings including
//! avatar, parental controls, language preferences, and viewing settings. Each
//! account can have multiple profiles for different family members.

use serde::{Deserialize, Serialize};
use uniffi;
use chrono;

#[derive(uniffi::Enum, Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum ProfileType {
    Admin,
    Standard,
    Kids,
}

#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct ProfilePreferences {
    pub language: String,
    pub subtitles_enabled: bool,
    pub subtitle_styling: String,
    pub autoplay_next: bool,
    pub quality_preference: String,
}

/// A user profile with personalization settings
#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Profile {
    /// Unique identifier for this profile
    pub id: String,

    /// Display name of the profile
    pub name: String,

    /// Type of profile (Admin, Standard, Kids)
    pub profile_type: ProfileType,

    /// Avatar identifier
    pub avatar_id: String,

    /// Maximum age rating (e.g., "G", "PG", "PG-13", "R")
    pub max_age_rating: String,

    /// Whether the profile is protected by a PIN
    pub is_pin_protected: bool,

    /// Whether the profile has admin privileges
    pub is_admin: bool,

    /// Profile preferences
    pub preferences: ProfilePreferences,

    /// Creation timestamp
    pub created_at: i64,

    /// Last update timestamp
    pub updated_at: i64,
}

#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct WatchedItem {
    pub id: String,
    pub title: String,
    pub poster: String,
    pub progress: f64,
    pub duration: f64,
    pub last_watched_at: i64,
}

#[derive(uniffi::Record, Debug, Clone)]
pub struct CreateProfileInput {
    pub name: String,
    pub profile_type: ProfileType,
    pub avatar_id: Option<String>,
    pub max_age_rating: Option<String>,
    pub pin: Option<String>,
}

#[derive(uniffi::Record, Debug, Clone)]
pub struct UpdateProfileInput {
    pub name: Option<String>,
    pub avatar_id: Option<String>,
    pub max_age_rating: Option<String>,
    pub preferences: Option<ProfilePreferences>,
}

impl Profile {
    pub fn new(id: String, name: String, profile_type: ProfileType) -> Self {
        let now = chrono::Utc::now().timestamp();
        Self {
            id,
            name,
            profile_type,
            avatar_id: "default".to_string(),
            max_age_rating: "R".to_string(),
            is_pin_protected: false,
            is_admin: false,
            preferences: ProfilePreferences {
                language: "en".to_string(),
                subtitles_enabled: true,
                subtitle_styling: "{}".to_string(),
                autoplay_next: true,
                quality_preference: "Auto".to_string(),
            },
            created_at: now,
            updated_at: now,
        }
    }
}
