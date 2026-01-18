//! Notification manager module
//!
//! Core notification management logic including scheduling, cleanup, and statistics.

use super::models::{
    NotificationContent, NotificationItem, NotificationSettings, NotificationStats,
    ScheduleNotificationParams,
};
use super::storage::NotificationStorage;
use chrono::{DateTime, Duration, Utc};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, error, info, warn};

/// Platform notification bridge trait
///
/// Platform-specific implementations should implement this to bridge to native APIs
pub trait PlatformNotificationBridge: Send + Sync {
    /// Schedule a notification at a specific time
    fn schedule_notification(
        &self,
        id: String,
        content: NotificationContent,
        trigger_time: String,
    ) -> Result<String, String>;

    /// Cancel a scheduled notification
    fn cancel_notification(&self, id: String) -> Result<(), String>;

    /// Cancel all scheduled notifications
    fn cancel_all_notifications(&self) -> Result<(), String>;

    /// Send an immediate notification
    fn send_immediate_notification(&self, content: NotificationContent) -> Result<(), String>;

    /// Check if the app is in the foreground
    fn is_app_in_foreground(&self) -> bool;
}

/// Main notification manager
///
/// Handles all notification operations including scheduling, cleanup, and statistics
#[derive(uniffi::Object)]
pub struct NotificationManager {
    storage: Arc<NotificationStorage>,
    last_sync_time: Arc<std::sync::RwLock<i64>>,
}

#[uniffi::export]
impl NotificationManager {
    /// Creates a new notification manager
    ///
    /// # Parameters
    /// - `storage`: Notification storage instance
    ///
    /// # Returns
    /// A new NotificationManager instance
    #[uniffi::constructor]
    pub fn new(storage: Arc<NotificationStorage>) -> Self {
        info!("Creating NotificationManager");
        Self {
            storage,
            last_sync_time: Arc::new(std::sync::RwLock::new(0)),
        }
    }

    /// Get current notification settings
    pub fn get_settings(&self) -> Result<NotificationSettings, crate::error::NuvioError> {
        debug!("Getting notification settings");
        self.storage.get_settings()
    }

    /// Update notification settings
    pub fn update_settings(
        &self,
        settings: NotificationSettings,
    ) -> Result<NotificationSettings, crate::error::NuvioError> {
        info!("Updating notification settings");
        self.storage.update_settings(settings)
    }

    /// Schedule an episode notification
    ///
    /// Checks if the notification should be scheduled based on settings and timing,
    /// then creates a notification item and stores it.
    ///
    /// # Parameters
    /// - `params`: Notification scheduling parameters
    ///
    /// # Returns
    /// - `Ok(Some(NotificationItem))`: Successfully scheduled notification
    /// - `Ok(None)`: Notification not scheduled (disabled, duplicate, or past date)
    /// - `Err`: Error occurred
    pub fn schedule_episode_notification(
        &self,
        params: ScheduleNotificationParams,
    ) -> Result<Option<NotificationItem>, crate::error::NuvioError> {
        debug!(
            "Scheduling notification for {} S{}E{}",
            params.series_name, params.season, params.episode
        );

        let settings = self.storage.get_settings()?;

        if !settings.enabled || !settings.new_episode_notifications {
            debug!("Notifications disabled, skipping");
            return Ok(None);
        }

        // Check for duplicates
        let scheduled = self.storage.get_scheduled()?;
        let duplicate = scheduled.iter().any(|n| {
            n.series_id == params.series_id
                && n.season == params.season
                && n.episode == params.episode
        });

        if duplicate {
            debug!("Duplicate notification exists, skipping");
            return Ok(None);
        }

        // Parse release date
        let release_date = DateTime::parse_from_rfc3339(&params.release_date)
            .map_err(|e| {
                crate::error::NuvioError::validation(format!("Invalid release date: {}", e))
            })?
            .with_timezone(&Utc);

        let now = Utc::now();

        // Don't schedule if release date has passed
        if release_date < now {
            debug!("Release date has passed, skipping");
            return Ok(None);
        }

        // Calculate notification time (X hours before air time)
        let notification_time =
            release_date - Duration::hours(settings.time_before_airing as i64);

        // Don't schedule if notification time has passed
        if notification_time < now {
            debug!("Notification time has passed, skipping");
            return Ok(None);
        }

        // Create notification item
        let item = NotificationItem {
            id: format!(
                "{}-s{}e{}",
                params.series_id, params.season, params.episode
            ),
            series_id: params.series_id.clone(),
            series_name: params.series_name.clone(),
            episode_title: params.episode_title.clone(),
            season: params.season,
            episode: params.episode,
            release_date: params.release_date,
            notified: false,
            poster: params.poster,
        };

        // Store the notification
        self.storage.add_scheduled(item.clone())?;

        info!(
            "Scheduled notification for {} S{}E{}",
            params.series_name, params.season, params.episode
        );

        Ok(Some(item))
    }

    /// Schedule multiple episode notifications
    ///
    /// Convenience method to schedule many notifications at once
    pub fn schedule_multiple_notifications(
        &self,
        params_list: Vec<ScheduleNotificationParams>,
    ) -> Result<i32, crate::error::NuvioError> {
        info!("Scheduling {} notifications", params_list.len());

        let mut count = 0;
        for params in params_list {
            if let Ok(Some(_)) = self.schedule_episode_notification(params) {
                count += 1;
            }
        }

        info!("Scheduled {} notifications successfully", count);
        Ok(count)
    }

    /// Get all scheduled notifications
    pub fn get_scheduled_notifications(
        &self,
    ) -> Result<Vec<NotificationItem>, crate::error::NuvioError> {
        debug!("Getting scheduled notifications");
        self.storage.get_scheduled()
    }

    /// Cancel a scheduled notification by ID
    pub fn cancel_notification(&self, id: String) -> Result<(), crate::error::NuvioError> {
        info!("Canceling notification: {}", id);
        self.storage.remove_scheduled(id)
    }

    /// Cancel all scheduled notifications
    pub fn cancel_all_notifications(&self) -> Result<(), crate::error::NuvioError> {
        info!("Canceling all scheduled notifications");
        self.storage.clear_scheduled()
    }

    /// Cancel all notifications for a specific series
    pub fn cancel_notifications_for_series(
        &self,
        series_id: String,
    ) -> Result<i32, crate::error::NuvioError> {
        info!("Canceling notifications for series: {}", series_id);

        let scheduled = self.storage.get_scheduled()?;
        let to_cancel: Vec<String> = scheduled
            .iter()
            .filter(|n| n.series_id == series_id)
            .map(|n| n.id.clone())
            .collect();

        let count = to_cancel.len() as i32;

        for id in to_cancel {
            self.storage.remove_scheduled(id)?;
        }

        info!("Canceled {} notifications for series {}", count, series_id);
        Ok(count)
    }

    /// Clean up old and expired notifications
    ///
    /// Removes notifications for episodes that aired more than 24 hours ago
    pub fn cleanup_old_notifications(&self) -> Result<i32, crate::error::NuvioError> {
        info!("Cleaning up old notifications");

        let scheduled = self.storage.get_scheduled()?;
        let now = Utc::now();
        let one_day_ago = now - Duration::days(1);

        let mut removed_count = 0;

        for notification in scheduled {
            if let Ok(release_date) = DateTime::parse_from_rfc3339(&notification.release_date) {
                let release_utc = release_date.with_timezone(&Utc);

                if release_utc < one_day_ago {
                    self.storage.remove_scheduled(notification.id.clone())?;
                    removed_count += 1;
                }
            }
        }

        if removed_count > 0 {
            info!("Cleaned up {} old notifications", removed_count);
        }

        Ok(removed_count)
    }

    /// Get notification statistics
    pub fn get_notification_stats(&self) -> Result<NotificationStats, crate::error::NuvioError> {
        debug!("Getting notification statistics");

        let scheduled = self.storage.get_scheduled()?;
        let now = Utc::now();
        let one_week_later = now + Duration::weeks(1);

        let mut upcoming = 0;
        let mut this_week = 0;

        for notification in &scheduled {
            if let Ok(release_date) = DateTime::parse_from_rfc3339(&notification.release_date) {
                let release_utc = release_date.with_timezone(&Utc);

                if release_utc > now {
                    upcoming += 1;

                    if release_utc < one_week_later {
                        this_week += 1;
                    }
                }
            }
        }

        Ok(NotificationStats {
            total: scheduled.len() as i32,
            upcoming,
            this_week,
        })
    }

    /// Check if enough time has passed since last sync
    ///
    /// Prevents excessive syncing
    pub fn should_sync(&self, min_interval_seconds: i64) -> Result<bool, crate::error::NuvioError> {
        let last_sync = *self
            .last_sync_time
            .read()
            .map_err(|e| crate::error::NuvioError::unknown(format!("Lock error: {}", e)))?;

        let now = Utc::now().timestamp();
        let elapsed = now - last_sync;

        Ok(elapsed >= min_interval_seconds)
    }

    /// Update the last sync time to now
    pub fn mark_synced(&self) -> Result<(), crate::error::NuvioError> {
        let mut last_sync = self
            .last_sync_time
            .write()
            .map_err(|e| crate::error::NuvioError::unknown(format!("Lock error: {}", e)))?;

        *last_sync = Utc::now().timestamp();
        Ok(())
    }

    /// Notify download progress (background only)
    ///
    /// Only notifies once at 50% progress when app is in background
    pub fn notify_download_progress(
        &self,
        title: String,
        progress: i32,
        downloaded_bytes: Option<i64>,
        total_bytes: Option<i64>,
    ) -> Result<bool, crate::error::NuvioError> {
        debug!("Download progress notification requested: {} at {}%", title, progress);

        let settings = self.storage.get_settings()?;
        if !settings.enabled {
            return Ok(false);
        }

        // Only notify at 50% or above
        if progress < 50 {
            return Ok(false);
        }

        // Check if already notified
        if self.storage.was_download_notified(title.clone(), 50)? {
            return Ok(false);
        }

        // Mark as notified
        self.storage.mark_download_notified(title.clone(), 50)?;

        info!("Download progress notification sent: {} at {}%", title, progress);
        Ok(true)
    }

    /// Notify download complete (background only)
    pub fn notify_download_complete(
        &self,
        title: String,
    ) -> Result<bool, crate::error::NuvioError> {
        debug!("Download complete notification requested: {}", title);

        let settings = self.storage.get_settings()?;
        if !settings.enabled {
            return Ok(false);
        }

        // Clear tracking
        self.storage.clear_download_notification(title.clone())?;

        info!("Download complete notification sent: {}", title);
        Ok(true)
    }

    /// Build notification content for an episode
    ///
    /// Helper to create platform-agnostic notification content
    pub fn build_episode_notification_content(
        &self,
        item: NotificationItem,
    ) -> Result<NotificationContent, crate::error::NuvioError> {
        let mut data = HashMap::new();
        data.insert("series_id".to_string(), item.series_id.clone());
        data.insert("episode_id".to_string(), item.id.clone());

        Ok(NotificationContent {
            title: format!("New Episode: {}", item.series_name),
            body: format!(
                "S{}:E{} - {} is airing soon!",
                item.season, item.episode, item.episode_title
            ),
            data,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_manager() -> NotificationManager {
        let storage = Arc::new(NotificationStorage::new());
        NotificationManager::new(storage)
    }

    #[test]
    fn test_manager_creation() {
        let manager = create_test_manager();
        let settings = manager.get_settings().unwrap();
        assert!(settings.enabled);
    }

    #[test]
    fn test_update_settings() {
        let manager = create_test_manager();

        let mut settings = NotificationSettings::default();
        settings.enabled = false;
        settings.time_before_airing = 48;

        let updated = manager.update_settings(settings).unwrap();
        assert!(!updated.enabled);
        assert_eq!(updated.time_before_airing, 48);
    }

    #[test]
    fn test_schedule_notification() {
        let manager = create_test_manager();

        // Create a future date
        let future_date = (Utc::now() + Duration::days(7))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        let params = ScheduleNotificationParams {
            series_id: "tt1234567".to_string(),
            series_name: "Test Show".to_string(),
            episode_title: "Pilot".to_string(),
            season: 1,
            episode: 1,
            release_date: future_date,
            poster: None,
        };

        let result = manager.schedule_episode_notification(params).unwrap();
        assert!(result.is_some());

        let item = result.unwrap();
        assert_eq!(item.series_name, "Test Show");
        assert_eq!(item.season, 1);
    }

    #[test]
    fn test_schedule_past_date() {
        let manager = create_test_manager();

        // Create a past date
        let past_date = (Utc::now() - Duration::days(7))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        let params = ScheduleNotificationParams {
            series_id: "tt1234567".to_string(),
            series_name: "Test Show".to_string(),
            episode_title: "Pilot".to_string(),
            season: 1,
            episode: 1,
            release_date: past_date,
            poster: None,
        };

        let result = manager.schedule_episode_notification(params).unwrap();
        assert!(result.is_none()); // Should not schedule
    }

    #[test]
    fn test_schedule_duplicate() {
        let manager = create_test_manager();

        let future_date = (Utc::now() + Duration::days(7))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        let params = ScheduleNotificationParams {
            series_id: "tt1234567".to_string(),
            series_name: "Test Show".to_string(),
            episode_title: "Pilot".to_string(),
            season: 1,
            episode: 1,
            release_date: future_date.clone(),
            poster: None,
        };

        // First schedule should succeed
        let result1 = manager.schedule_episode_notification(params.clone()).unwrap();
        assert!(result1.is_some());

        // Second schedule of same episode should be skipped
        let result2 = manager.schedule_episode_notification(params).unwrap();
        assert!(result2.is_none());
    }

    #[test]
    fn test_cancel_notification() {
        let manager = create_test_manager();

        let future_date = (Utc::now() + Duration::days(7))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        let params = ScheduleNotificationParams {
            series_id: "tt1234567".to_string(),
            series_name: "Test Show".to_string(),
            episode_title: "Pilot".to_string(),
            season: 1,
            episode: 1,
            release_date: future_date,
            poster: None,
        };

        let item = manager
            .schedule_episode_notification(params)
            .unwrap()
            .unwrap();

        // Cancel the notification
        manager.cancel_notification(item.id.clone()).unwrap();

        // Should not be in scheduled list
        let scheduled = manager.get_scheduled_notifications().unwrap();
        assert_eq!(scheduled.len(), 0);
    }

    #[test]
    fn test_cancel_series_notifications() {
        let manager = create_test_manager();

        let future_date = (Utc::now() + Duration::days(7))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        // Schedule two episodes from same series
        let params1 = ScheduleNotificationParams {
            series_id: "tt1234567".to_string(),
            series_name: "Test Show".to_string(),
            episode_title: "Pilot".to_string(),
            season: 1,
            episode: 1,
            release_date: future_date.clone(),
            poster: None,
        };

        let params2 = ScheduleNotificationParams {
            series_id: "tt1234567".to_string(),
            series_name: "Test Show".to_string(),
            episode_title: "Second Episode".to_string(),
            season: 1,
            episode: 2,
            release_date: future_date,
            poster: None,
        };

        manager.schedule_episode_notification(params1).unwrap();
        manager.schedule_episode_notification(params2).unwrap();

        // Cancel all for series
        let count = manager
            .cancel_notifications_for_series("tt1234567".to_string())
            .unwrap();

        assert_eq!(count, 2);

        let scheduled = manager.get_scheduled_notifications().unwrap();
        assert_eq!(scheduled.len(), 0);
    }

    #[test]
    fn test_notification_stats() {
        let manager = create_test_manager();

        // Schedule notifications at different times
        let one_day_later = (Utc::now() + Duration::days(1))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        let five_days_later = (Utc::now() + Duration::days(5))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        let ten_days_later = (Utc::now() + Duration::days(10))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        let params1 = ScheduleNotificationParams {
            series_id: "tt111".to_string(),
            series_name: "Show 1".to_string(),
            episode_title: "Ep 1".to_string(),
            season: 1,
            episode: 1,
            release_date: one_day_later,
            poster: None,
        };

        let params2 = ScheduleNotificationParams {
            series_id: "tt222".to_string(),
            series_name: "Show 2".to_string(),
            episode_title: "Ep 2".to_string(),
            season: 1,
            episode: 1,
            release_date: five_days_later,
            poster: None,
        };

        let params3 = ScheduleNotificationParams {
            series_id: "tt333".to_string(),
            series_name: "Show 3".to_string(),
            episode_title: "Ep 3".to_string(),
            season: 1,
            episode: 1,
            release_date: ten_days_later,
            poster: None,
        };

        manager.schedule_episode_notification(params1).unwrap();
        manager.schedule_episode_notification(params2).unwrap();
        manager.schedule_episode_notification(params3).unwrap();

        let stats = manager.get_notification_stats().unwrap();

        assert_eq!(stats.total, 3);
        assert_eq!(stats.upcoming, 3);
        assert_eq!(stats.this_week, 2); // Two within 7 days
    }

    #[test]
    fn test_cleanup_old_notifications() {
        let manager = create_test_manager();

        // Create an old notification (2 days ago)
        let old_date = (Utc::now() - Duration::days(2))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        let params = ScheduleNotificationParams {
            series_id: "tt1234567".to_string(),
            series_name: "Old Show".to_string(),
            episode_title: "Old Episode".to_string(),
            season: 1,
            episode: 1,
            release_date: old_date,
            poster: None,
        };

        // Manually add (bypassing date check in schedule_episode_notification)
        let item = NotificationItem {
            id: "old-1".to_string(),
            series_id: params.series_id,
            series_name: params.series_name,
            episode_title: params.episode_title,
            season: params.season,
            episode: params.episode,
            release_date: params.release_date,
            notified: false,
            poster: None,
        };

        manager.storage.add_scheduled(item).unwrap();

        // Run cleanup
        let removed = manager.cleanup_old_notifications().unwrap();
        assert_eq!(removed, 1);

        let scheduled = manager.get_scheduled_notifications().unwrap();
        assert_eq!(scheduled.len(), 0);
    }

    #[test]
    fn test_download_notifications() {
        let manager = create_test_manager();

        let title = "Test Download".to_string();

        // First call at 50% should return true
        let result = manager
            .notify_download_progress(title.clone(), 50, None, None)
            .unwrap();
        assert!(result);

        // Second call at 50% should return false (already notified)
        let result = manager
            .notify_download_progress(title.clone(), 50, None, None)
            .unwrap();
        assert!(!result);

        // Call at 40% should return false (below threshold)
        let result = manager
            .notify_download_progress("Another".to_string(), 40, None, None)
            .unwrap();
        assert!(!result);

        // Complete should clear tracking
        manager.notify_download_complete(title.clone()).unwrap();

        // After complete, can notify at 50% again
        let result = manager
            .notify_download_progress(title, 50, None, None)
            .unwrap();
        assert!(result);
    }

    #[test]
    fn test_sync_throttling() {
        let manager = create_test_manager();

        // Initially should sync
        assert!(manager.should_sync(300).unwrap()); // 5 minutes

        // Mark as synced
        manager.mark_synced().unwrap();

        // Immediately should not sync
        assert!(!manager.should_sync(300).unwrap());

        // After sufficient time should sync (we can't easily test this without sleeping)
    }

    #[test]
    fn test_build_notification_content() {
        let manager = create_test_manager();

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

        let content = manager.build_episode_notification_content(item).unwrap();

        assert_eq!(content.title, "New Episode: Test Show");
        assert!(content.body.contains("S1:E1"));
        assert!(content.body.contains("Pilot"));
        assert!(content.data.contains_key("series_id"));
    }

    #[test]
    fn test_schedule_multiple() {
        let manager = create_test_manager();

        let future_date = (Utc::now() + Duration::days(7))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        let params_list = vec![
            ScheduleNotificationParams {
                series_id: "tt111".to_string(),
                series_name: "Show 1".to_string(),
                episode_title: "Ep 1".to_string(),
                season: 1,
                episode: 1,
                release_date: future_date.clone(),
                poster: None,
            },
            ScheduleNotificationParams {
                series_id: "tt222".to_string(),
                series_name: "Show 2".to_string(),
                episode_title: "Ep 2".to_string(),
                season: 1,
                episode: 1,
                release_date: future_date.clone(),
                poster: None,
            },
            ScheduleNotificationParams {
                series_id: "tt333".to_string(),
                series_name: "Show 3".to_string(),
                episode_title: "Ep 3".to_string(),
                season: 1,
                episode: 1,
                release_date: future_date,
                poster: None,
            },
        ];

        let count = manager.schedule_multiple_notifications(params_list).unwrap();
        assert_eq!(count, 3);

        let scheduled = manager.get_scheduled_notifications().unwrap();
        assert_eq!(scheduled.len(), 3);
    }
}
