//! Notification storage module
//!
//! Handles persistence of notifications and settings.
//! Platform-specific storage implementations should be provided via callbacks.

use super::models::{NotificationItem, NotificationSettings};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use tracing::{debug, error, info};

/// Storage for notification data
///
/// This provides an in-memory storage layer with serialization support.
/// Platform implementations should save/load via MMKV or similar.
#[derive(uniffi::Object)]
pub struct NotificationStorage {
    /// Current settings
    settings: Arc<RwLock<NotificationSettings>>,
    /// Scheduled notifications keyed by notification ID
    scheduled: Arc<RwLock<HashMap<String, NotificationItem>>>,
    /// Download notification tracking (title -> progress value when last notified)
    download_notifications: Arc<RwLock<HashMap<String, i32>>>,
}

#[uniffi::export]
impl NotificationStorage {
    /// Creates a new notification storage instance
    #[uniffi::constructor]
    pub fn new() -> Self {
        info!("Creating NotificationStorage");
        Self {
            settings: Arc::new(RwLock::new(NotificationSettings::default())),
            scheduled: Arc::new(RwLock::new(HashMap::new())),
            download_notifications: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Load settings from JSON string
    ///
    /// Platform should call this with data from MMKV or similar storage
    pub fn load_settings(&self, json: String) -> Result<NotificationSettings, crate::error::NuvioError> {
        debug!("Loading notification settings from JSON");

        let settings: NotificationSettings = serde_json::from_str(&json)?;

        if let Ok(mut current) = self.settings.write() {
            *current = settings.clone();
            info!("Loaded notification settings successfully");
        } else {
            error!("Failed to acquire write lock for settings");
            return Err(crate::error::NuvioError::unknown(
                "Failed to acquire write lock for settings",
            ));
        }

        Ok(settings)
    }

    /// Save settings to JSON string
    ///
    /// Platform should persist this to MMKV or similar storage
    pub fn save_settings(&self) -> Result<String, crate::error::NuvioError> {
        debug!("Saving notification settings to JSON");

        let settings = self.settings.read()
            .map_err(|e| crate::error::NuvioError::unknown(format!("Failed to read settings: {}", e)))?
            .clone();

        let json = serde_json::to_string(&settings)?;
        info!("Saved notification settings successfully");

        Ok(json)
    }

    /// Get current settings
    pub fn get_settings(&self) -> Result<NotificationSettings, crate::error::NuvioError> {
        self.settings.read()
            .map(|s| s.clone())
            .map_err(|e| crate::error::NuvioError::unknown(format!("Failed to read settings: {}", e)))
    }

    /// Update settings
    pub fn update_settings(&self, settings: NotificationSettings) -> Result<NotificationSettings, crate::error::NuvioError> {
        debug!("Updating notification settings");

        if let Ok(mut current) = self.settings.write() {
            *current = settings.clone();
            info!("Updated notification settings successfully");
            Ok(settings)
        } else {
            error!("Failed to acquire write lock for settings");
            Err(crate::error::NuvioError::unknown(
                "Failed to acquire write lock for settings",
            ))
        }
    }

    /// Load scheduled notifications from JSON string
    pub fn load_scheduled(&self, json: String) -> Result<Vec<NotificationItem>, crate::error::NuvioError> {
        debug!("Loading scheduled notifications from JSON");

        let items: Vec<NotificationItem> = serde_json::from_str(&json)?;

        if let Ok(mut scheduled) = self.scheduled.write() {
            scheduled.clear();
            for item in &items {
                scheduled.insert(item.id.clone(), item.clone());
            }
            info!("Loaded {} scheduled notifications", items.len());
        } else {
            error!("Failed to acquire write lock for scheduled notifications");
            return Err(crate::error::NuvioError::unknown(
                "Failed to acquire write lock for scheduled notifications",
            ));
        }

        Ok(items)
    }

    /// Save scheduled notifications to JSON string
    pub fn save_scheduled(&self) -> Result<String, crate::error::NuvioError> {
        debug!("Saving scheduled notifications to JSON");

        let items: Vec<NotificationItem> = self.scheduled.read()
            .map_err(|e| crate::error::NuvioError::unknown(format!("Failed to read scheduled: {}", e)))?
            .values()
            .cloned()
            .collect();

        let json = serde_json::to_string(&items)?;
        info!("Saved {} scheduled notifications", items.len());

        Ok(json)
    }

    /// Get all scheduled notifications
    pub fn get_scheduled(&self) -> Result<Vec<NotificationItem>, crate::error::NuvioError> {
        self.scheduled.read()
            .map(|s| s.values().cloned().collect())
            .map_err(|e| crate::error::NuvioError::unknown(format!("Failed to read scheduled: {}", e)))
    }

    /// Add a scheduled notification
    pub fn add_scheduled(&self, item: NotificationItem) -> Result<(), crate::error::NuvioError> {
        debug!("Adding scheduled notification: {}", item.id);

        if let Ok(mut scheduled) = self.scheduled.write() {
            scheduled.insert(item.id.clone(), item);
            Ok(())
        } else {
            error!("Failed to acquire write lock for scheduled notifications");
            Err(crate::error::NuvioError::unknown(
                "Failed to acquire write lock for scheduled notifications",
            ))
        }
    }

    /// Remove a scheduled notification by ID
    pub fn remove_scheduled(&self, id: String) -> Result<(), crate::error::NuvioError> {
        debug!("Removing scheduled notification: {}", id);

        if let Ok(mut scheduled) = self.scheduled.write() {
            scheduled.remove(&id);
            Ok(())
        } else {
            error!("Failed to acquire write lock for scheduled notifications");
            Err(crate::error::NuvioError::unknown(
                "Failed to acquire write lock for scheduled notifications",
            ))
        }
    }

    /// Clear all scheduled notifications
    pub fn clear_scheduled(&self) -> Result<(), crate::error::NuvioError> {
        info!("Clearing all scheduled notifications");

        if let Ok(mut scheduled) = self.scheduled.write() {
            scheduled.clear();
            Ok(())
        } else {
            error!("Failed to acquire write lock for scheduled notifications");
            Err(crate::error::NuvioError::unknown(
                "Failed to acquire write lock for scheduled notifications",
            ))
        }
    }

    /// Track that a download notification was sent
    pub fn mark_download_notified(&self, title: String, progress: i32) -> Result<(), crate::error::NuvioError> {
        debug!("Marking download notification sent: {} at {}%", title, progress);

        if let Ok(mut downloads) = self.download_notifications.write() {
            downloads.insert(title, progress);
            Ok(())
        } else {
            error!("Failed to acquire write lock for download notifications");
            Err(crate::error::NuvioError::unknown(
                "Failed to acquire write lock for download notifications",
            ))
        }
    }

    /// Check if a download notification was already sent at this progress
    pub fn was_download_notified(&self, title: String, progress: i32) -> Result<bool, crate::error::NuvioError> {
        let downloads = self.download_notifications.read()
            .map_err(|e| crate::error::NuvioError::unknown(format!("Failed to read download notifications: {}", e)))?;

        Ok(downloads.get(&title).is_some_and(|&p| p >= progress))
    }

    /// Clear download notification tracking for a title
    pub fn clear_download_notification(&self, title: String) -> Result<(), crate::error::NuvioError> {
        debug!("Clearing download notification tracking: {}", title);

        if let Ok(mut downloads) = self.download_notifications.write() {
            downloads.remove(&title);
            Ok(())
        } else {
            error!("Failed to acquire write lock for download notifications");
            Err(crate::error::NuvioError::unknown(
                "Failed to acquire write lock for download notifications",
            ))
        }
    }
}

impl Default for NotificationStorage {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_creation() {
        let storage = NotificationStorage::new();
        let settings = storage.get_settings().unwrap();
        assert!(settings.enabled);
    }

    #[test]
    fn test_settings_save_load() {
        let storage = NotificationStorage::new();

        // Update settings
        let mut settings = NotificationSettings::default();
        settings.enabled = false;
        settings.time_before_airing = 48;

        storage.update_settings(settings.clone()).unwrap();

        // Save to JSON
        let json = storage.save_settings().unwrap();
        assert!(json.contains("\"enabled\":false"));
        assert!(json.contains("48"));

        // Create new storage and load
        let storage2 = NotificationStorage::new();
        let loaded = storage2.load_settings(json).unwrap();

        assert!(!loaded.enabled);
        assert_eq!(loaded.time_before_airing, 48);
    }

    #[test]
    fn test_scheduled_operations() {
        let storage = NotificationStorage::new();

        let item = NotificationItem {
            id: "test-123".to_string(),
            series_id: "tt1234567".to_string(),
            series_name: "Test Show".to_string(),
            episode_title: "Pilot".to_string(),
            season: 1,
            episode: 1,
            release_date: "2024-01-15T20:00:00Z".to_string(),
            notified: false,
            poster: None,
        };

        // Add notification
        storage.add_scheduled(item.clone()).unwrap();

        // Get all
        let items = storage.get_scheduled().unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].id, "test-123");

        // Remove notification
        storage.remove_scheduled("test-123".to_string()).unwrap();
        let items = storage.get_scheduled().unwrap();
        assert_eq!(items.len(), 0);
    }

    #[test]
    fn test_scheduled_save_load() {
        let storage = NotificationStorage::new();

        let item1 = NotificationItem {
            id: "test-1".to_string(),
            series_id: "tt111".to_string(),
            series_name: "Show 1".to_string(),
            episode_title: "Episode 1".to_string(),
            season: 1,
            episode: 1,
            release_date: "2024-01-15T20:00:00Z".to_string(),
            notified: false,
            poster: None,
        };

        let item2 = NotificationItem {
            id: "test-2".to_string(),
            series_id: "tt222".to_string(),
            series_name: "Show 2".to_string(),
            episode_title: "Episode 2".to_string(),
            season: 1,
            episode: 2,
            release_date: "2024-01-16T20:00:00Z".to_string(),
            notified: false,
            poster: None,
        };

        storage.add_scheduled(item1).unwrap();
        storage.add_scheduled(item2).unwrap();

        // Save to JSON
        let json = storage.save_scheduled().unwrap();

        // Load into new storage
        let storage2 = NotificationStorage::new();
        let items = storage2.load_scheduled(json).unwrap();

        assert_eq!(items.len(), 2);
    }

    #[test]
    fn test_download_notifications() {
        let storage = NotificationStorage::new();

        let title = "Test Download".to_string();

        // Initially not notified
        assert!(!storage.was_download_notified(title.clone(), 50).unwrap());

        // Mark as notified at 50%
        storage.mark_download_notified(title.clone(), 50).unwrap();

        // Should be marked
        assert!(storage.was_download_notified(title.clone(), 50).unwrap());
        assert!(storage.was_download_notified(title.clone(), 40).unwrap()); // Lower progress also returns true

        // Clear tracking
        storage.clear_download_notification(title.clone()).unwrap();

        // Should be reset
        assert!(!storage.was_download_notified(title, 50).unwrap());
    }

    #[test]
    fn test_clear_scheduled() {
        let storage = NotificationStorage::new();

        let item = NotificationItem {
            id: "test-123".to_string(),
            series_id: "tt1234567".to_string(),
            series_name: "Test Show".to_string(),
            episode_title: "Pilot".to_string(),
            season: 1,
            episode: 1,
            release_date: "2024-01-15T20:00:00Z".to_string(),
            notified: false,
            poster: None,
        };

        storage.add_scheduled(item).unwrap();
        assert_eq!(storage.get_scheduled().unwrap().len(), 1);

        storage.clear_scheduled().unwrap();
        assert_eq!(storage.get_scheduled().unwrap().len(), 0);
    }
}
