use serde::{Deserialize, Serialize};
use uniffi;

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Enum, PartialEq)]
pub enum ProfileType {
    Admin,
    Adult,
    Teen,
    Kids,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record, PartialEq)]
pub struct ProfilePreferences {
    pub language: String,
    pub subtitles_enabled: bool,
    pub subtitle_styling: String,
    pub autoplay_next: bool,
    pub quality_preference: String,
}

#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub profile_type: ProfileType,
    pub avatar_id: String,
    pub max_age_rating: String,
    pub is_pin_protected: bool,
    pub is_admin: bool,
    pub preferences: ProfilePreferences,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct WatchedItem {
    pub id: String,
    pub title: String,
    pub poster: String,
    pub progress: f64,
    pub duration: f64,
    pub last_watched_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct CreateProfileInput {
    pub name: String,
    pub profile_type: ProfileType,
    pub avatar_id: Option<String>,
    pub max_age_rating: Option<String>,
    pub pin: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct UpdateProfileInput {
    pub name: Option<String>,
    pub avatar_id: Option<String>,
    pub max_age_rating: Option<String>,
    pub preferences: Option<ProfilePreferences>,
}
