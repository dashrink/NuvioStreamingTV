//! Backup manager - main interface for backup and restore operations

use crate::backup::compression::CompressionManager;
use crate::backup::error::BackupError;
use crate::backup::models::{BackupData, BackupInfo, BackupOptions, BackupPreview};
use crate::backup::storage::BackupStorage;
use parking_lot::RwLock;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tracing::{debug, info};

/// Callback trait for storage operations
pub trait StorageCallback: Send + Sync {
    /// Get a value from storage
    fn get_item(&self, key: String) -> Option<String>;

    /// Set a value in storage
    fn set_item(&self, key: String, value: String) -> Result<(), String>;

    /// Get all storage keys
    fn get_all_keys(&self) -> Vec<String>;

    /// Get multiple items from storage
    fn multi_get(&self, keys: Vec<String>) -> Vec<(String, Option<String>)>;

    /// Set multiple items in storage
    fn multi_set(&self, pairs: Vec<(String, String)>) -> Result<(), String>;
}

/// Main backup manager
pub struct BackupManager {
    storage: Arc<BackupStorage>,
    storage_callback: Arc<RwLock<Option<Arc<dyn StorageCallback>>>>,
}

impl BackupManager {
    /// Create a new backup manager
    pub fn new(storage_dir: PathBuf) -> Result<Self, BackupError> {
        let storage = Arc::new(BackupStorage::new(storage_dir)?);

        Ok(Self {
            storage,
            storage_callback: Arc::new(RwLock::new(None)),
        })
    }

    /// Set the storage callback
    pub fn set_storage_callback(&self, callback: Arc<dyn StorageCallback>) {
        let mut cb = self.storage_callback.write();
        *cb = Some(callback);
    }

    /// Create a backup with the given options
    pub fn create_backup(
        &self,
        options: BackupOptions,
        user_scope: String,
        platform: String,
    ) -> Result<String, BackupError> {
        info!("Starting backup creation...");

        let callback_guard = self.storage_callback.read();
        let callback = callback_guard.as_ref().ok_or_else(|| {
            BackupError::storage("Storage callback not set".to_string())
        })?;

        // Create backup data container
        let mut backup = BackupData::new(user_scope.clone(), platform);

        // Collect data based on options
        if options.include_settings {
            backup.settings = self.get_settings(callback.as_ref(), &user_scope);
        }

        if options.include_library {
            backup.library = self.get_library(callback.as_ref(), &user_scope);
        }

        if options.include_watch_progress {
            backup.watch_progress = self.get_watch_progress(callback.as_ref(), &user_scope);
        }

        if options.include_addons {
            backup.addons = self.get_addons(callback.as_ref(), &user_scope);
        }

        if options.include_downloads {
            backup.downloads = self.get_downloads(callback.as_ref());
        }

        backup.subtitles = self.get_subtitle_settings(callback.as_ref(), &user_scope);
        backup.tombstones = self.get_tombstones(callback.as_ref(), &user_scope);
        backup.continue_watching_removed = self.get_continue_watching_removed(callback.as_ref(), &user_scope);
        backup.content_duration = self.get_content_duration(callback.as_ref(), &user_scope);
        backup.sync_queue = self.get_sync_queue(callback.as_ref());

        if options.include_trakt_data {
            backup.trakt_settings = self.get_trakt_settings(callback.as_ref());
        }

        if options.include_local_scrapers {
            backup.local_scrapers = self.get_local_scrapers(callback.as_ref());
        }

        if options.include_api_keys {
            backup.api_keys = self.get_api_keys(callback.as_ref());
        }

        if options.include_catalog_settings {
            backup.catalog_settings = self.get_catalog_settings(callback.as_ref());
        }

        if options.include_user_preferences {
            backup.addon_order = self.get_addon_order(callback.as_ref(), &user_scope);
            backup.removed_addons = self.get_removed_addons(callback.as_ref());
            backup.global_season_view_mode = self.get_global_season_view_mode(callback.as_ref());
            backup.has_completed_onboarding = self.get_has_completed_onboarding(callback.as_ref());
            backup.show_login_hint_toast_once = self.get_show_login_hint_toast_once(callback.as_ref());
        }

        if options.include_watch_progress {
            backup.watched_status = self.get_watched_status(callback.as_ref());
        }

        if options.include_settings {
            backup.catalog_ui_preferences = self.get_catalog_ui_preferences(callback.as_ref());
        }

        // Update metadata
        backup.update_metadata();

        // Validate backup data
        backup.validate().map_err(BackupError::validation)?;

        // Serialize to JSON
        let json_data = serde_json::to_string_pretty(&backup)?;

        // Compress if enabled
        let final_data = if options.enable_compression {
            debug!("Compressing backup data...");
            CompressionManager::compress(json_data.as_bytes())?
        } else {
            json_data.into_bytes()
        };

        // Generate filename and save
        let filename = if options.enable_compression {
            format!("{}.gz", self.storage.generate_filename(backup.timestamp))
        } else {
            self.storage.generate_filename(backup.timestamp)
        };

        let path = self.storage.write_backup(&filename, &final_data)?;

        info!(
            "Backup created successfully: {} ({} items)",
            filename, backup.metadata.total_items
        );

        Ok(path.to_string_lossy().to_string())
    }

    /// Restore backup from a file
    pub fn restore_backup(
        &self,
        file_path: String,
        options: BackupOptions,
    ) -> Result<(), BackupError> {
        info!("Starting backup restore from: {}", file_path);

        let path = Path::new(&file_path);
        let data = self.storage.read_backup(path)?;

        // Check if compressed and decompress if needed
        let json_data = if CompressionManager::is_compressed(&data) {
            debug!("Decompressing backup data...");
            let decompressed = CompressionManager::decompress(&data)?;
            String::from_utf8(decompressed)
                .map_err(|e| BackupError::serialization(format!("Invalid UTF-8: {}", e)))?
        } else {
            String::from_utf8(data)
                .map_err(|e| BackupError::serialization(format!("Invalid UTF-8: {}", e)))?
        };

        // Parse backup data
        let backup: BackupData = serde_json::from_str(&json_data)?;

        // Validate backup
        backup.validate().map_err(BackupError::validation)?;

        info!(
            "Restoring backup from {} ({} items)",
            backup.timestamp, backup.metadata.total_items
        );

        let callback_guard = self.storage_callback.read();
        let callback = callback_guard.as_ref().ok_or_else(|| {
            BackupError::storage("Storage callback not set".to_string())
        })?;

        // Restore data based on options
        if options.include_settings && backup.settings.is_some() {
            self.restore_settings(callback.as_ref(), &backup.user_scope, backup.settings.as_ref().unwrap())?;
        }

        if options.include_library && backup.library.is_some() {
            self.restore_library(callback.as_ref(), &backup.user_scope, backup.library.as_ref().unwrap())?;
        }

        if options.include_watch_progress && backup.watch_progress.is_some() {
            self.restore_watch_progress(callback.as_ref(), backup.watch_progress.as_ref().unwrap())?;
        }

        if options.include_addons && backup.addons.is_some() {
            self.restore_addons(callback.as_ref(), &backup.user_scope, backup.addons.as_ref().unwrap())?;
        }

        if options.include_downloads && backup.downloads.is_some() {
            self.restore_downloads(callback.as_ref(), backup.downloads.as_ref().unwrap())?;
        }

        if let Some(subtitles) = &backup.subtitles {
            self.restore_subtitle_settings(callback.as_ref(), &backup.user_scope, subtitles)?;
        }

        if let Some(tombstones) = &backup.tombstones {
            self.restore_tombstones(callback.as_ref(), &backup.user_scope, tombstones)?;
        }

        if let Some(removed) = &backup.continue_watching_removed {
            self.restore_continue_watching_removed(callback.as_ref(), &backup.user_scope, removed)?;
        }

        if let Some(duration) = &backup.content_duration {
            self.restore_content_duration(callback.as_ref(), duration)?;
        }

        if let Some(sync_queue) = &backup.sync_queue {
            self.restore_sync_queue(callback.as_ref(), sync_queue)?;
        }

        if options.include_trakt_data && backup.trakt_settings.is_some() {
            self.restore_trakt_settings(callback.as_ref(), backup.trakt_settings.as_ref().unwrap())?;
        }

        if options.include_local_scrapers && backup.local_scrapers.is_some() {
            self.restore_local_scrapers(callback.as_ref(), backup.local_scrapers.as_ref().unwrap())?;
        }

        if options.include_api_keys && backup.api_keys.is_some() {
            self.restore_api_keys(callback.as_ref(), backup.api_keys.as_ref().unwrap())?;
        }

        if options.include_catalog_settings && backup.catalog_settings.is_some() {
            self.restore_catalog_settings(callback.as_ref(), backup.catalog_settings.as_ref().unwrap())?;
        }

        if options.include_user_preferences {
            if let Some(addon_order) = &backup.addon_order {
                self.restore_addon_order(callback.as_ref(), &backup.user_scope, addon_order)?;
            }
            if let Some(removed_addons) = &backup.removed_addons {
                self.restore_removed_addons(callback.as_ref(), removed_addons)?;
            }
            if let Some(view_mode) = &backup.global_season_view_mode {
                self.restore_global_season_view_mode(callback.as_ref(), view_mode)?;
            }
            if let Some(onboarding) = backup.has_completed_onboarding {
                self.restore_has_completed_onboarding(callback.as_ref(), onboarding)?;
            }
            if let Some(hint) = backup.show_login_hint_toast_once {
                self.restore_show_login_hint_toast_once(callback.as_ref(), hint)?;
            }
        }

        if let Some(watched_status) = &backup.watched_status {
            self.restore_watched_status(callback.as_ref(), watched_status)?;
        }

        if let Some(ui_prefs) = &backup.catalog_ui_preferences {
            self.restore_catalog_ui_preferences(callback.as_ref(), ui_prefs)?;
        }

        info!("Backup restore completed successfully");
        Ok(())
    }

    /// Get backup information
    pub fn get_backup_info(&self, file_path: String) -> Result<BackupInfo, BackupError> {
        let path = Path::new(&file_path);
        let data = self.storage.read_backup(path)?;

        // Check if compressed and decompress if needed
        let json_data = if CompressionManager::is_compressed(&data) {
            let decompressed = CompressionManager::decompress(&data)?;
            String::from_utf8(decompressed)
                .map_err(|e| BackupError::serialization(format!("Invalid UTF-8: {}", e)))?
        } else {
            String::from_utf8(data)
                .map_err(|e| BackupError::serialization(format!("Invalid UTF-8: {}", e)))?
        };

        let backup: BackupData = serde_json::from_str(&json_data)?;
        self.storage.get_backup_info(path, &backup)
    }

    /// List all backups
    pub fn list_backups(&self) -> Result<Vec<String>, BackupError> {
        let backups = self.storage.list_backups()?;
        Ok(backups
            .iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect())
    }

    /// Delete a backup
    pub fn delete_backup(&self, file_path: String) -> Result<(), BackupError> {
        let path = Path::new(&file_path);
        self.storage.delete_backup(path)
    }

    /// Get backup preview
    pub fn get_backup_preview(&self) -> Result<BackupPreview, BackupError> {
        let callback_guard = self.storage_callback.read();
        let callback = callback_guard.as_ref().ok_or_else(|| {
            BackupError::storage("Storage callback not set".to_string())
        })?;

        let user_scope = self.get_user_scope(callback.as_ref());

        let library = self.get_library(callback.as_ref(), &user_scope);
        let watch_progress = self.get_watch_progress(callback.as_ref(), &user_scope);
        let addons = self.get_addons(callback.as_ref(), &user_scope);
        let downloads = self.get_downloads(callback.as_ref());
        let local_scrapers = self.get_local_scrapers(callback.as_ref());
        let watched_status = self.get_watched_status(callback.as_ref());

        let library_count = library
            .and_then(|l| l.as_array().map(|a| a.len() as u32))
            .unwrap_or(0);
        let watch_progress_count = watch_progress.map(|w| w.len() as u32).unwrap_or(0);
        let addons_count = addons
            .and_then(|a| a.as_array().map(|a| a.len() as u32))
            .unwrap_or(0);
        let downloads_count = downloads
            .and_then(|d| d.as_array().map(|a| a.len() as u32))
            .unwrap_or(0);
        let scrapers_count = local_scrapers
            .map(|s| s.scrapers.len() as u32)
            .unwrap_or(0);
        let watched_status_count = watched_status.map(|w| w.len() as u32).unwrap_or(0);

        Ok(BackupPreview {
            library: library_count,
            watch_progress: watch_progress_count,
            addons: addons_count,
            downloads: downloads_count,
            scrapers: scrapers_count,
            watched_status: watched_status_count,
            total: library_count
                + watch_progress_count
                + addons_count
                + downloads_count
                + scrapers_count
                + watched_status_count,
        })
    }

    // Helper methods for data collection
    fn get_user_scope(&self, callback: &dyn StorageCallback) -> String {
        callback
            .get_item("@user:current".to_string())
            .unwrap_or_else(|| "local".to_string())
    }

    fn get_settings(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
    ) -> Option<serde_json::Value> {
        let key = format!("@user:{}:app_settings", user_scope);
        callback
            .get_item(key)
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_library(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
    ) -> Option<serde_json::Value> {
        let key = format!("@user:{}:stremio-library", user_scope);
        callback
            .get_item(key)
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_watch_progress(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
    ) -> Option<HashMap<String, serde_json::Value>> {
        let prefix = format!("@user:{}:@watch_progress:", user_scope);
        let all_keys = callback.get_all_keys();
        let watch_keys: Vec<String> = all_keys
            .into_iter()
            .filter(|k| k.starts_with(&prefix))
            .collect();

        if watch_keys.is_empty() {
            return None;
        }

        let pairs = callback.multi_get(watch_keys);
        let mut result = HashMap::new();

        for (key, value) in pairs {
            if let Some(v) = value {
                if let Ok(json) = serde_json::from_str(&v) {
                    result.insert(key, json);
                }
            }
        }

        if result.is_empty() {
            None
        } else {
            Some(result)
        }
    }

    fn get_addons(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
    ) -> Option<serde_json::Value> {
        let key = format!("@user:{}:stremio-addons", user_scope);
        callback
            .get_item(key)
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_downloads(&self, callback: &dyn StorageCallback) -> Option<serde_json::Value> {
        callback
            .get_item("downloads_state_v1".to_string())
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_subtitle_settings(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
    ) -> Option<crate::backup::models::SubtitleSettings> {
        let key = format!("@user:{}:@subtitle_settings", user_scope);
        callback
            .get_item(key)
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_tombstones(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
    ) -> Option<HashMap<String, i64>> {
        let key = format!("@user:{}:@wp_tombstones", user_scope);
        callback
            .get_item(key)
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_continue_watching_removed(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
    ) -> Option<HashMap<String, i64>> {
        let key = format!("@user:{}:@continue_watching_removed", user_scope);
        callback
            .get_item(key)
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_content_duration(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
    ) -> Option<HashMap<String, i64>> {
        let prefix = format!("@user:{}:@content_duration:", user_scope);
        let all_keys = callback.get_all_keys();
        let duration_keys: Vec<String> = all_keys
            .into_iter()
            .filter(|k| k.starts_with(&prefix))
            .collect();

        if duration_keys.is_empty() {
            return None;
        }

        let pairs = callback.multi_get(duration_keys);
        let mut result = HashMap::new();

        for (key, value) in pairs {
            if let Some(v) = value {
                if let Ok(duration) = serde_json::from_str(&v) {
                    result.insert(key, duration);
                }
            }
        }

        if result.is_empty() {
            None
        } else {
            Some(result)
        }
    }

    fn get_sync_queue(&self, callback: &dyn StorageCallback) -> Option<serde_json::Value> {
        callback
            .get_item("@sync_queue".to_string())
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_trakt_settings(&self, callback: &dyn StorageCallback) -> Option<serde_json::Value> {
        callback
            .get_item("trakt_settings".to_string())
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_local_scrapers(
        &self,
        callback: &dyn StorageCallback,
    ) -> Option<crate::backup::models::LocalScrapers> {
        let scrapers = callback
            .get_item("local-scrapers".to_string())
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();

        let repository_url = callback.get_item("scraper-repository-url".to_string());
        let repositories = callback
            .get_item("scraper-repositories".to_string())
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        let current_repository = callback.get_item("current-repository-id".to_string());
        let scraper_settings = callback
            .get_item("scraper-settings".to_string())
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();

        let all_keys = callback.get_all_keys();
        let code_keys: Vec<String> = all_keys
            .into_iter()
            .filter(|k| k.starts_with("scraper-code-"))
            .collect();

        let mut scraper_code = HashMap::new();
        for (key, value) in callback.multi_get(code_keys) {
            if let Some(v) = value {
                scraper_code.insert(key, v);
            }
        }

        Some(crate::backup::models::LocalScrapers {
            scrapers,
            repository_url,
            repositories,
            current_repository,
            scraper_settings,
            scraper_code,
        })
    }

    fn get_api_keys(
        &self,
        callback: &dyn StorageCallback,
    ) -> Option<crate::backup::models::ApiKeys> {
        let mdblist_api_key = callback.get_item("mdblist_api_key".to_string());
        let openrouter_api_key = callback.get_item("openrouter_api_key".to_string());

        Some(crate::backup::models::ApiKeys {
            mdblist_api_key,
            openrouter_api_key,
        })
    }

    fn get_catalog_settings(&self, callback: &dyn StorageCallback) -> Option<serde_json::Value> {
        callback
            .get_item("catalog_settings".to_string())
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_addon_order(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
    ) -> Option<Vec<String>> {
        let key = format!("@user:{}:stremio-addon-order", user_scope);
        callback
            .get_item(key)
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_removed_addons(&self, callback: &dyn StorageCallback) -> Option<Vec<String>> {
        callback
            .get_item("user_removed_addons".to_string())
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn get_global_season_view_mode(&self, callback: &dyn StorageCallback) -> Option<String> {
        callback.get_item("global_season_view_mode".to_string())
    }

    fn get_has_completed_onboarding(&self, callback: &dyn StorageCallback) -> Option<bool> {
        callback
            .get_item("hasCompletedOnboarding".to_string())
            .and_then(|s| match s.as_str() {
                "true" => Some(true),
                "false" => Some(false),
                _ => None,
            })
    }

    fn get_show_login_hint_toast_once(&self, callback: &dyn StorageCallback) -> Option<bool> {
        callback
            .get_item("showLoginHintToastOnce".to_string())
            .and_then(|s| match s.as_str() {
                "true" => Some(true),
                "false" => Some(false),
                _ => None,
            })
    }

    fn get_watched_status(
        &self,
        callback: &dyn StorageCallback,
    ) -> Option<HashMap<String, bool>> {
        let all_keys = callback.get_all_keys();
        let watched_keys: Vec<String> = all_keys
            .into_iter()
            .filter(|k| k.starts_with("watched:"))
            .collect();

        if watched_keys.is_empty() {
            return None;
        }

        let pairs = callback.multi_get(watched_keys);
        let mut result = HashMap::new();

        for (key, value) in pairs {
            if let Some(v) = value {
                result.insert(key, v == "true");
            }
        }

        if result.is_empty() {
            None
        } else {
            Some(result)
        }
    }

    fn get_catalog_ui_preferences(
        &self,
        callback: &dyn StorageCallback,
    ) -> Option<crate::backup::models::CatalogUiPreferences> {
        let mobile_columns = callback.get_item("catalog_mobile_columns".to_string());
        let show_titles = callback.get_item("catalog_show_titles".to_string());

        Some(crate::backup::models::CatalogUiPreferences {
            mobile_columns,
            show_titles,
        })
    }

    // Helper methods for data restoration
    fn restore_settings(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
        settings: &serde_json::Value,
    ) -> Result<(), BackupError> {
        let key = format!("@user:{}:app_settings", user_scope);
        let value = serde_json::to_string(settings)?;
        callback
            .set_item(key, value)
            .map_err(BackupError::storage)?;
        info!("Settings restored");
        Ok(())
    }

    fn restore_library(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
        library: &serde_json::Value,
    ) -> Result<(), BackupError> {
        let key = format!("@user:{}:stremio-library", user_scope);
        let value = serde_json::to_string(library)?;
        callback
            .set_item(key, value)
            .map_err(BackupError::storage)?;
        info!("Library restored");
        Ok(())
    }

    fn restore_watch_progress(
        &self,
        callback: &dyn StorageCallback,
        watch_progress: &HashMap<String, serde_json::Value>,
    ) -> Result<(), BackupError> {
        let pairs: Vec<(String, String)> = watch_progress
            .iter()
            .filter_map(|(k, v)| serde_json::to_string(v).ok().map(|s| (k.clone(), s)))
            .collect();

        callback
            .multi_set(pairs)
            .map_err(BackupError::storage)?;
        info!("Watch progress restored");
        Ok(())
    }

    fn restore_addons(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
        addons: &serde_json::Value,
    ) -> Result<(), BackupError> {
        let key = format!("@user:{}:stremio-addons", user_scope);
        let value = serde_json::to_string(addons)?;
        callback
            .set_item(key, value)
            .map_err(BackupError::storage)?;
        info!("Addons restored");
        Ok(())
    }

    fn restore_downloads(
        &self,
        callback: &dyn StorageCallback,
        downloads: &serde_json::Value,
    ) -> Result<(), BackupError> {
        let value = serde_json::to_string(downloads)?;
        callback
            .set_item("downloads_state_v1".to_string(), value)
            .map_err(BackupError::storage)?;
        info!("Downloads restored");
        Ok(())
    }

    fn restore_subtitle_settings(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
        subtitles: &crate::backup::models::SubtitleSettings,
    ) -> Result<(), BackupError> {
        let key = format!("@user:{}:@subtitle_settings", user_scope);
        let value = serde_json::to_string(subtitles)?;
        callback
            .set_item(key, value)
            .map_err(BackupError::storage)?;
        info!("Subtitle settings restored");
        Ok(())
    }

    fn restore_tombstones(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
        tombstones: &HashMap<String, i64>,
    ) -> Result<(), BackupError> {
        let key = format!("@user:{}:@wp_tombstones", user_scope);
        let value = serde_json::to_string(tombstones)?;
        callback
            .set_item(key, value)
            .map_err(BackupError::storage)?;
        info!("Tombstones restored");
        Ok(())
    }

    fn restore_continue_watching_removed(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
        removed: &HashMap<String, i64>,
    ) -> Result<(), BackupError> {
        let key = format!("@user:{}:@continue_watching_removed", user_scope);
        let value = serde_json::to_string(removed)?;
        callback
            .set_item(key, value)
            .map_err(BackupError::storage)?;
        info!("Continue watching removed restored");
        Ok(())
    }

    fn restore_content_duration(
        &self,
        callback: &dyn StorageCallback,
        content_duration: &HashMap<String, i64>,
    ) -> Result<(), BackupError> {
        let pairs: Vec<(String, String)> = content_duration
            .iter()
            .filter_map(|(k, v)| serde_json::to_string(v).ok().map(|s| (k.clone(), s)))
            .collect();

        callback
            .multi_set(pairs)
            .map_err(BackupError::storage)?;
        info!("Content duration restored");
        Ok(())
    }

    fn restore_sync_queue(
        &self,
        callback: &dyn StorageCallback,
        sync_queue: &serde_json::Value,
    ) -> Result<(), BackupError> {
        let value = serde_json::to_string(sync_queue)?;
        callback
            .set_item("@sync_queue".to_string(), value)
            .map_err(BackupError::storage)?;
        info!("Sync queue restored");
        Ok(())
    }

    fn restore_trakt_settings(
        &self,
        callback: &dyn StorageCallback,
        trakt_settings: &serde_json::Value,
    ) -> Result<(), BackupError> {
        let value = serde_json::to_string(trakt_settings)?;
        callback
            .set_item("trakt_settings".to_string(), value)
            .map_err(BackupError::storage)?;
        info!("Trakt settings restored");
        Ok(())
    }

    fn restore_local_scrapers(
        &self,
        callback: &dyn StorageCallback,
        local_scrapers: &crate::backup::models::LocalScrapers,
    ) -> Result<(), BackupError> {
        let mut pairs = Vec::new();

        pairs.push((
            "local-scrapers".to_string(),
            serde_json::to_string(&local_scrapers.scrapers)?,
        ));

        if let Some(url) = &local_scrapers.repository_url {
            pairs.push(("scraper-repository-url".to_string(), url.clone()));
        }

        pairs.push((
            "scraper-repositories".to_string(),
            serde_json::to_string(&local_scrapers.repositories)?,
        ));

        if let Some(current) = &local_scrapers.current_repository {
            pairs.push(("current-repository-id".to_string(), current.clone()));
        }

        pairs.push((
            "scraper-settings".to_string(),
            serde_json::to_string(&local_scrapers.scraper_settings)?,
        ));

        for (key, value) in &local_scrapers.scraper_code {
            pairs.push((key.clone(), value.clone()));
        }

        callback
            .multi_set(pairs)
            .map_err(BackupError::storage)?;
        info!("Local scrapers restored");
        Ok(())
    }

    fn restore_api_keys(
        &self,
        callback: &dyn StorageCallback,
        api_keys: &crate::backup::models::ApiKeys,
    ) -> Result<(), BackupError> {
        let mut pairs = Vec::new();

        if let Some(key) = &api_keys.mdblist_api_key {
            pairs.push(("mdblist_api_key".to_string(), key.clone()));
        }

        if let Some(key) = &api_keys.openrouter_api_key {
            pairs.push(("openrouter_api_key".to_string(), key.clone()));
        }

        if !pairs.is_empty() {
            callback
                .multi_set(pairs)
                .map_err(BackupError::storage)?;
        }

        info!("API keys restored");
        Ok(())
    }

    fn restore_catalog_settings(
        &self,
        callback: &dyn StorageCallback,
        catalog_settings: &serde_json::Value,
    ) -> Result<(), BackupError> {
        let value = serde_json::to_string(catalog_settings)?;
        callback
            .set_item("catalog_settings".to_string(), value)
            .map_err(BackupError::storage)?;
        info!("Catalog settings restored");
        Ok(())
    }

    fn restore_addon_order(
        &self,
        callback: &dyn StorageCallback,
        user_scope: &str,
        addon_order: &[String],
    ) -> Result<(), BackupError> {
        let key = format!("@user:{}:stremio-addon-order", user_scope);
        let value = serde_json::to_string(addon_order)?;
        callback
            .set_item(key, value)
            .map_err(BackupError::storage)?;
        info!("Addon order restored");
        Ok(())
    }

    fn restore_removed_addons(
        &self,
        callback: &dyn StorageCallback,
        removed_addons: &[String],
    ) -> Result<(), BackupError> {
        let value = serde_json::to_string(removed_addons)?;
        callback
            .set_item("user_removed_addons".to_string(), value)
            .map_err(BackupError::storage)?;
        info!("Removed addons restored");
        Ok(())
    }

    fn restore_global_season_view_mode(
        &self,
        callback: &dyn StorageCallback,
        view_mode: &str,
    ) -> Result<(), BackupError> {
        callback
            .set_item("global_season_view_mode".to_string(), view_mode.to_string())
            .map_err(BackupError::storage)?;
        info!("Global season view mode restored");
        Ok(())
    }

    fn restore_has_completed_onboarding(
        &self,
        callback: &dyn StorageCallback,
        value: bool,
    ) -> Result<(), BackupError> {
        callback
            .set_item(
                "hasCompletedOnboarding".to_string(),
                value.to_string(),
            )
            .map_err(BackupError::storage)?;
        info!("Has completed onboarding restored");
        Ok(())
    }

    fn restore_show_login_hint_toast_once(
        &self,
        callback: &dyn StorageCallback,
        value: bool,
    ) -> Result<(), BackupError> {
        callback
            .set_item(
                "showLoginHintToastOnce".to_string(),
                value.to_string(),
            )
            .map_err(BackupError::storage)?;
        info!("Show login hint toast once restored");
        Ok(())
    }

    fn restore_watched_status(
        &self,
        callback: &dyn StorageCallback,
        watched_status: &HashMap<String, bool>,
    ) -> Result<(), BackupError> {
        let pairs: Vec<(String, String)> = watched_status
            .iter()
            .map(|(k, v)| (k.clone(), v.to_string()))
            .collect();

        if !pairs.is_empty() {
            callback
                .multi_set(pairs)
                .map_err(BackupError::storage)?;
        }

        info!("Watched status restored");
        Ok(())
    }

    fn restore_catalog_ui_preferences(
        &self,
        callback: &dyn StorageCallback,
        ui_prefs: &crate::backup::models::CatalogUiPreferences,
    ) -> Result<(), BackupError> {
        let mut pairs = Vec::new();

        if let Some(columns) = &ui_prefs.mobile_columns {
            pairs.push(("catalog_mobile_columns".to_string(), columns.clone()));
        }

        if let Some(titles) = &ui_prefs.show_titles {
            pairs.push(("catalog_show_titles".to_string(), titles.clone()));
        }

        if !pairs.is_empty() {
            callback
                .multi_set(pairs)
                .map_err(BackupError::storage)?;
        }

        info!("Catalog UI preferences restored");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::env;
    use std::sync::RwLock as StdRwLock;

    struct MockStorageCallback {
        storage: Arc<StdRwLock<HashMap<String, String>>>,
    }

    impl MockStorageCallback {
        fn new() -> Self {
            Self {
                storage: Arc::new(StdRwLock::new(HashMap::new())),
            }
        }
    }

    impl StorageCallback for MockStorageCallback {
        fn get_item(&self, key: String) -> Option<String> {
            self.storage.read().unwrap().get(&key).cloned()
        }

        fn set_item(&self, key: String, value: String) -> Result<(), String> {
            self.storage.write().unwrap().insert(key, value);
            Ok(())
        }

        fn get_all_keys(&self) -> Vec<String> {
            self.storage.read().unwrap().keys().cloned().collect()
        }

        fn multi_get(&self, keys: Vec<String>) -> Vec<(String, Option<String>)> {
            let storage = self.storage.read().unwrap();
            keys.into_iter()
                .map(|k| {
                    let v = storage.get(&k).cloned();
                    (k, v)
                })
                .collect()
        }

        fn multi_set(&self, pairs: Vec<(String, String)>) -> Result<(), String> {
            let mut storage = self.storage.write().unwrap();
            for (k, v) in pairs {
                storage.insert(k, v);
            }
            Ok(())
        }
    }

    fn get_temp_dir() -> PathBuf {
        let mut path = env::temp_dir();
        path.push(format!("nuvio_backup_manager_test_{}", std::process::id()));
        path
    }

    fn cleanup_temp_dir(dir: &Path) {
        if dir.exists() {
            let _ = std::fs::remove_dir_all(dir);
        }
    }

    #[test]
    fn test_backup_manager_creation() {
        let temp_dir = get_temp_dir();
        let manager = BackupManager::new(temp_dir.clone()).unwrap();
        assert!(temp_dir.exists());
        cleanup_temp_dir(&temp_dir);
    }

    #[test]
    fn test_create_and_restore_backup() {
        let temp_dir = get_temp_dir();
        let manager = BackupManager::new(temp_dir.clone()).unwrap();

        let callback = Arc::new(MockStorageCallback::new());
        manager.set_storage_callback(callback.clone());

        // Set some test data
        callback
            .set_item(
                "@user:local:app_settings".to_string(),
                r#"{"theme":"dark"}"#.to_string(),
            )
            .unwrap();
        callback
            .set_item("@user:current".to_string(), "local".to_string())
            .unwrap();

        // Create backup
        let options = BackupOptions {
            include_settings: true,
            ..Default::default()
        };

        let backup_path = manager
            .create_backup(options.clone(), "local".to_string(), "android".to_string())
            .unwrap();

        assert!(Path::new(&backup_path).exists());

        // Clear storage
        callback.storage.write().unwrap().clear();

        // Restore backup
        manager.restore_backup(backup_path.clone(), options).unwrap();

        // Verify restoration
        let settings = callback
            .get_item("@user:local:app_settings".to_string())
            .unwrap();
        assert!(settings.contains("dark"));

        cleanup_temp_dir(&temp_dir);
    }
}
