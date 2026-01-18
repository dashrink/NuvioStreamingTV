//! Notification data models
//!
//! This module defines all the data types used in the notification system.
//! All types are UniFFI-compatible and can be used from Kotlin and Swift.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Notification settings for the user
///
/// Controls how and when notifications are delivered
#[derive(uniffi::Record, Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    /// Master toggle for all notifications
    pub enabled: bool,
    /// Enable notifications for new episodes
    pub new_episode_notifications: bool,
    /// Enable reminder notifications
    pub reminder_notifications: bool,
    /// Enable notifications for upcoming shows
    pub upcoming_shows_notifications: bool,
    /// How many hours before airing to send notification (default: 24)
    pub time_before_airing: i32,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            new_episode_notifications: true,
            reminder_notifications: true,
            upcoming_shows_notifications: true,
            time_before_airing: 24,
        }
    }
}

/// A scheduled notification item for an episode
///
/// Represents a single notification that will be sent to the user
#[derive(uniffi::Record, Debug, Clone, Serialize, Deserialize)]
pub struct NotificationItem {
    /// Unique identifier for this notification
    pub id: String,
    /// Series IMDB or TMDB ID
    pub series_id: String,
    /// Name of the series
    pub series_name: String,
    /// Title of the episode
    pub episode_title: String,
    /// Season number
    pub season: i32,
    /// Episode number
    pub episode: i32,
    /// ISO 8601 release date string
    pub release_date: String,
    /// Whether the notification has been sent
    pub notified: bool,
    /// Optional poster URL
    pub poster: Option<String>,
}

/// Statistics about scheduled notifications
///
/// Provides a summary of notification counts for the UI
#[derive(uniffi::Record, Debug, Clone)]
pub struct NotificationStats {
    /// Total number of scheduled notifications
    pub total: i32,
    /// Number of upcoming notifications (not yet sent)
    pub upcoming: i32,
    /// Number of notifications scheduled for this week
    pub this_week: i32,
}

/// Notification content to be displayed
///
/// Platform-agnostic notification content structure
#[derive(uniffi::Record, Debug, Clone)]
pub struct NotificationContent {
    /// Notification title
    pub title: String,
    /// Notification body text
    pub body: String,
    /// Additional data as key-value pairs
    pub data: HashMap<String, String>,
}

/// Parameters for scheduling an episode notification
///
/// Used when creating new notifications from external data
#[derive(uniffi::Record, Debug, Clone)]
pub struct ScheduleNotificationParams {
    /// Series ID
    pub series_id: String,
    /// Series name
    pub series_name: String,
    /// Episode title
    pub episode_title: String,
    /// Season number
    pub season: i32,
    /// Episode number
    pub episode: i32,
    /// ISO 8601 release date
    pub release_date: String,
    /// Optional poster URL
    pub poster: Option<String>,
}

/// Download notification type
///
/// Used for tracking download progress notifications
#[derive(Debug, Clone)]
pub enum DownloadNotificationType {
    /// Progress notification (sent once at 50%)
    Progress {
        /// Download title
        title: String,
        /// Progress percentage (0-100)
        progress: i32,
        /// Downloaded bytes
        downloaded_bytes: Option<i64>,
        /// Total bytes
        total_bytes: Option<i64>,
    },
    /// Completion notification
    Complete {
        /// Download title
        title: String,
    },
}

/// Sync source for notifications
///
/// Tracks where notification data came from
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum NotificationSource {
    /// From local library
    Library,
    /// From Trakt watchlist
    TraktWatchlist,
    /// From Trakt continue watching
    TraktContinueWatching,
    /// From Trakt watched shows
    TraktWatched,
    /// From Trakt collection
    TraktCollection,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let settings = NotificationSettings::default();
        assert!(settings.enabled);
        assert!(settings.new_episode_notifications);
        assert_eq!(settings.time_before_airing, 24);
    }

    #[test]
    fn test_notification_item_creation() {
        let item = NotificationItem {
            id: "test-123".to_string(),
            series_id: "tt1234567".to_string(),
            series_name: "Test Show".to_string(),
            episode_title: "Pilot".to_string(),
            season: 1,
            episode: 1,
            release_date: "2024-01-15T20:00:00Z".to_string(),
            notified: false,
            poster: Some("https://example.com/poster.jpg".to_string()),
        };

        assert_eq!(item.id, "test-123");
        assert_eq!(item.series_name, "Test Show");
        assert!(!item.notified);
    }

    #[test]
    fn test_notification_stats() {
        let stats = NotificationStats {
            total: 10,
            upcoming: 8,
            this_week: 3,
        };

        assert_eq!(stats.total, 10);
        assert_eq!(stats.upcoming, 8);
        assert_eq!(stats.this_week, 3);
    }

    #[test]
    fn test_notification_content() {
        let mut data = HashMap::new();
        data.insert("series_id".to_string(), "tt1234567".to_string());

        let content = NotificationContent {
            title: "New Episode".to_string(),
            body: "Test Show S1E1 is airing soon!".to_string(),
            data,
        };

        assert_eq!(content.title, "New Episode");
        assert!(content.data.contains_key("series_id"));
    }

    #[test]
    fn test_schedule_params() {
        let params = ScheduleNotificationParams {
            series_id: "tt1234567".to_string(),
            series_name: "Test Show".to_string(),
            episode_title: "Pilot".to_string(),
            season: 1,
            episode: 1,
            release_date: "2024-01-15T20:00:00Z".to_string(),
            poster: None,
        };

        assert_eq!(params.series_id, "tt1234567");
        assert_eq!(params.season, 1);
    }

    #[test]
    fn test_notification_source() {
        let source = NotificationSource::Library;
        assert_eq!(source, NotificationSource::Library);

        let source2 = NotificationSource::TraktWatchlist;
        assert_ne!(source, source2);
    }
}
