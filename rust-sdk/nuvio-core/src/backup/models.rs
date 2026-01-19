//! Data models for backup and restore operations

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uniffi;

/// Backup options to control what data to include in backup
#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, Default)]
pub struct BackupOptions {
    /// Include library data
    pub include_library: bool,

    /// Include watch progress data
    pub include_watch_progress: bool,

    /// Include downloads data
    pub include_downloads: bool,

    /// Include addons data
    pub include_addons: bool,

    /// Include settings data
    pub include_settings: bool,

    /// Include Trakt data
    pub include_trakt_data: bool,

    /// Include local scrapers
    pub include_local_scrapers: bool,

    /// Include API keys
    pub include_api_keys: bool,

    /// Include catalog settings
    pub include_catalog_settings: bool,

    /// Include user preferences
    pub include_user_preferences: bool,

    /// Enable compression
    pub enable_compression: bool,
}

impl BackupOptions {
    /// Create backup options with all features enabled
    pub fn all() -> Self {
        Self {
            include_library: true,
            include_watch_progress: true,
            include_downloads: true,
            include_addons: true,
            include_settings: true,
            include_trakt_data: true,
            include_local_scrapers: true,
            include_api_keys: true,
            include_catalog_settings: true,
            include_user_preferences: true,
            enable_compression: true,
        }
    }

    /// Create minimal backup options
    pub fn minimal() -> Self {
        Self {
            include_library: true,
            include_settings: true,
            ..Default::default()
        }
    }
}

/// Backup metadata
#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, Default)]
pub struct BackupMetadata {
    /// Total number of items in backup
    pub total_items: u32,

    /// Number of library items
    pub library_count: u32,

    /// Number of watch progress items
    pub watch_progress_count: u32,

    /// Number of downloads
    pub downloads_count: u32,

    /// Number of addons
    pub addons_count: u32,

    /// Number of scrapers
    pub scrapers_count: u32,
}

/// Subtitle settings
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SubtitleSettings {
    pub subtitle_size: Option<u32>,
    pub subtitle_background: Option<bool>,
    pub subtitle_text_color: Option<String>,
    pub subtitle_bg_opacity: Option<f32>,
    pub subtitle_text_shadow: Option<bool>,
    pub subtitle_outline: Option<bool>,
    pub subtitle_outline_color: Option<String>,
    pub subtitle_outline_width: Option<f32>,
    pub subtitle_align: Option<String>,
    pub subtitle_bottom_offset: Option<f32>,
    pub subtitle_letter_spacing: Option<f32>,
    pub subtitle_line_height_multiplier: Option<f32>,
    pub subtitle_offset_sec: Option<f32>,
    #[serde(flatten)]
    pub additional: HashMap<String, serde_json::Value>,
}

/// Catalog UI preferences
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CatalogUiPreferences {
    pub mobile_columns: Option<String>,
    pub show_titles: Option<String>,
}

/// API keys
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ApiKeys {
    pub mdblist_api_key: Option<String>,
    pub openrouter_api_key: Option<String>,
}

/// Local scrapers data
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct LocalScrapers {
    pub scrapers: HashMap<String, serde_json::Value>,
    pub repository_url: Option<String>,
    pub repositories: HashMap<String, serde_json::Value>,
    pub current_repository: Option<String>,
    pub scraper_settings: HashMap<String, serde_json::Value>,
    pub scraper_code: HashMap<String, String>,
}

/// Backup data container
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BackupData {
    /// Backup format version
    pub version: String,

    /// Timestamp when backup was created
    pub timestamp: i64,

    /// Application version
    pub app_version: String,

    /// Platform (ios, android)
    pub platform: String,

    /// User scope identifier
    pub user_scope: String,

    /// Backup metadata
    pub metadata: BackupMetadata,

    /// Application settings (JSON)
    pub settings: Option<serde_json::Value>,

    /// Library items (JSON array)
    pub library: Option<serde_json::Value>,

    /// Watch progress data
    pub watch_progress: Option<HashMap<String, serde_json::Value>>,

    /// Addons data (JSON array)
    pub addons: Option<serde_json::Value>,

    /// Downloads data (JSON array)
    pub downloads: Option<serde_json::Value>,

    /// Subtitle settings
    pub subtitles: Option<SubtitleSettings>,

    /// Tombstones
    pub tombstones: Option<HashMap<String, i64>>,

    /// Continue watching removed items
    pub continue_watching_removed: Option<HashMap<String, i64>>,

    /// Content duration data
    pub content_duration: Option<HashMap<String, i64>>,

    /// Sync queue (JSON array)
    pub sync_queue: Option<serde_json::Value>,

    /// Trakt settings (JSON)
    pub trakt_settings: Option<serde_json::Value>,

    /// Local scrapers
    pub local_scrapers: Option<LocalScrapers>,

    /// API keys
    pub api_keys: Option<ApiKeys>,

    /// Catalog settings (JSON)
    pub catalog_settings: Option<serde_json::Value>,

    /// Addon order
    pub addon_order: Option<Vec<String>>,

    /// Removed addons
    pub removed_addons: Option<Vec<String>>,

    /// Global season view mode
    pub global_season_view_mode: Option<String>,

    /// Has completed onboarding
    pub has_completed_onboarding: Option<bool>,

    /// Show login hint toast once
    pub show_login_hint_toast_once: Option<bool>,

    /// Watched status markers
    pub watched_status: Option<HashMap<String, bool>>,

    /// Catalog UI preferences
    pub catalog_ui_preferences: Option<CatalogUiPreferences>,
}

impl BackupData {
    /// Create a new backup data container
    pub fn new(user_scope: String, platform: String) -> Self {
        Self {
            version: "1.0.0".to_string(),
            timestamp: chrono::Utc::now().timestamp(),
            app_version: "1.0.0".to_string(),
            platform,
            user_scope,
            metadata: BackupMetadata::default(),
            settings: None,
            library: None,
            watch_progress: None,
            addons: None,
            downloads: None,
            subtitles: None,
            tombstones: None,
            continue_watching_removed: None,
            content_duration: None,
            sync_queue: None,
            trakt_settings: None,
            local_scrapers: None,
            api_keys: None,
            catalog_settings: None,
            addon_order: None,
            removed_addons: None,
            global_season_view_mode: None,
            has_completed_onboarding: None,
            show_login_hint_toast_once: None,
            watched_status: None,
            catalog_ui_preferences: None,
        }
    }

    /// Validate backup data format
    pub fn validate(&self) -> Result<(), String> {
        if self.version.is_empty() {
            return Err("Backup version is empty".to_string());
        }

        if self.timestamp <= 0 {
            return Err("Invalid backup timestamp".to_string());
        }

        if self.user_scope.is_empty() {
            return Err("User scope is empty".to_string());
        }

        Ok(())
    }

    /// Calculate and update metadata
    pub fn update_metadata(&mut self) {
        let mut metadata = BackupMetadata::default();

        if let Some(library) = &self.library {
            if let Some(arr) = library.as_array() {
                metadata.library_count = arr.len() as u32;
            }
        }

        if let Some(watch_progress) = &self.watch_progress {
            metadata.watch_progress_count = watch_progress.len() as u32;
        }

        if let Some(downloads) = &self.downloads {
            if let Some(arr) = downloads.as_array() {
                metadata.downloads_count = arr.len() as u32;
            }
        }

        if let Some(addons) = &self.addons {
            if let Some(arr) = addons.as_array() {
                metadata.addons_count = arr.len() as u32;
            }
        }

        if let Some(local_scrapers) = &self.local_scrapers {
            metadata.scrapers_count = local_scrapers.scrapers.len() as u32;
        }

        metadata.total_items = metadata.library_count
            + metadata.watch_progress_count
            + metadata.downloads_count
            + metadata.addons_count
            + metadata.scrapers_count;

        self.metadata = metadata;
    }
}

/// Backup information (minimal metadata without full data)
#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone)]
pub struct BackupInfo {
    /// Backup file path
    pub file_path: String,

    /// Backup format version
    pub version: String,

    /// Timestamp when backup was created
    pub timestamp: i64,

    /// Application version
    pub app_version: String,

    /// Platform (ios, android)
    pub platform: String,

    /// User scope identifier
    pub user_scope: String,

    /// Backup metadata
    pub metadata: BackupMetadata,

    /// File size in bytes (if available)
    pub file_size: Option<u64>,
}

/// Backup preview (counts without creating backup)
#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, Default)]
pub struct BackupPreview {
    /// Number of library items
    pub library: u32,

    /// Number of watch progress items
    pub watch_progress: u32,

    /// Number of addons
    pub addons: u32,

    /// Number of downloads
    pub downloads: u32,

    /// Number of scrapers
    pub scrapers: u32,

    /// Number of watched status items
    pub watched_status: u32,

    /// Total number of items
    pub total: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backup_options_all() {
        let options = BackupOptions::all();
        assert!(options.include_library);
        assert!(options.include_settings);
        assert!(options.enable_compression);
    }

    #[test]
    fn test_backup_options_minimal() {
        let options = BackupOptions::minimal();
        assert!(options.include_library);
        assert!(options.include_settings);
        assert!(!options.include_trakt_data);
    }

    #[test]
    fn test_backup_data_validation() {
        let mut backup = BackupData::new("local".to_string(), "android".to_string());
        assert!(backup.validate().is_ok());

        backup.version = "".to_string();
        assert!(backup.validate().is_err());
    }

    #[test]
    fn test_backup_data_update_metadata() {
        let mut backup = BackupData::new("local".to_string(), "android".to_string());
        backup.library = Some(serde_json::json!(["item1", "item2"]));
        backup.update_metadata();
        assert_eq!(backup.metadata.library_count, 2);
    }
}
