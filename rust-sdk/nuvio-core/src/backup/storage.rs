//! Storage layer for backup files

use crate::backup::error::BackupError;
use crate::backup::models::{BackupData, BackupInfo};
use std::fs;
use std::path::{Path, PathBuf};

/// Backup storage manager
pub struct BackupStorage {
    storage_dir: PathBuf,
}

impl BackupStorage {
    /// Create a new backup storage manager
    pub fn new(storage_dir: PathBuf) -> Result<Self, BackupError> {
        // Create storage directory if it doesn't exist
        if !storage_dir.exists() {
            fs::create_dir_all(&storage_dir).map_err(|e| {
                BackupError::storage(format!("Failed to create storage directory: {}", e))
            })?;
        }

        Ok(Self { storage_dir })
    }

    /// Get the storage directory path
    pub fn storage_dir(&self) -> &Path {
        &self.storage_dir
    }

    /// Generate a unique backup filename
    pub fn generate_filename(&self, timestamp: i64) -> String {
        format!("nuvio_backup_{}.json", timestamp)
    }

    /// Get full path for a backup file
    pub fn get_backup_path(&self, filename: &str) -> PathBuf {
        self.storage_dir.join(filename)
    }

    /// Write backup data to file
    pub fn write_backup(&self, filename: &str, data: &[u8]) -> Result<PathBuf, BackupError> {
        let path = self.get_backup_path(filename);
        fs::write(&path, data)
            .map_err(|e| BackupError::io(format!("Failed to write backup file: {}", e)))?;
        Ok(path)
    }

    /// Read backup data from file
    pub fn read_backup(&self, path: &Path) -> Result<Vec<u8>, BackupError> {
        if !path.exists() {
            return Err(BackupError::not_found(format!(
                "Backup file not found: {}",
                path.display()
            )));
        }

        fs::read(path).map_err(|e| BackupError::io(format!("Failed to read backup file: {}", e)))
    }

    /// Delete a backup file
    pub fn delete_backup(&self, path: &Path) -> Result<(), BackupError> {
        if !path.exists() {
            return Err(BackupError::not_found(format!(
                "Backup file not found: {}",
                path.display()
            )));
        }

        fs::remove_file(path)
            .map_err(|e| BackupError::io(format!("Failed to delete backup file: {}", e)))
    }

    /// List all backup files
    pub fn list_backups(&self) -> Result<Vec<PathBuf>, BackupError> {
        let entries = fs::read_dir(&self.storage_dir)
            .map_err(|e| BackupError::io(format!("Failed to read storage directory: {}", e)))?;

        let mut backups = Vec::new();
        for entry in entries {
            let entry =
                entry.map_err(|e| BackupError::io(format!("Failed to read directory entry: {}", e)))?;
            let path = entry.path();

            if path.is_file() {
                if let Some(filename) = path.file_name() {
                    let filename_str = filename.to_string_lossy();
                    if filename_str.starts_with("nuvio_backup_") && filename_str.ends_with(".json") {
                        backups.push(path);
                    }
                }
            }
        }

        // Sort by modification time (newest first)
        backups.sort_by(|a, b| {
            let a_time = fs::metadata(a).and_then(|m| m.modified()).ok();
            let b_time = fs::metadata(b).and_then(|m| m.modified()).ok();
            b_time.cmp(&a_time)
        });

        Ok(backups)
    }

    /// Get file size
    pub fn get_file_size(&self, path: &Path) -> Result<u64, BackupError> {
        let metadata = fs::metadata(path)
            .map_err(|e| BackupError::io(format!("Failed to read file metadata: {}", e)))?;
        Ok(metadata.len())
    }

    /// Get backup info without loading full data
    pub fn get_backup_info(&self, path: &Path, data: &BackupData) -> Result<BackupInfo, BackupError> {
        let file_size = self.get_file_size(path).ok();

        Ok(BackupInfo {
            file_path: path.to_string_lossy().to_string(),
            version: data.version.clone(),
            timestamp: data.timestamp,
            app_version: data.app_version.clone(),
            platform: data.platform.clone(),
            user_scope: data.user_scope.clone(),
            metadata: data.metadata.clone(),
            file_size,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::backup::models::BackupData;
    use std::env;

    fn get_temp_dir() -> PathBuf {
        let mut path = env::temp_dir();
        path.push(format!("nuvio_backup_test_{}", std::process::id()));
        path
    }

    fn cleanup_temp_dir(dir: &Path) {
        if dir.exists() {
            let _ = fs::remove_dir_all(dir);
        }
    }

    #[test]
    fn test_storage_creation() {
        let temp_dir = get_temp_dir();
        let storage = BackupStorage::new(temp_dir.clone()).unwrap();
        assert!(storage.storage_dir().exists());
        cleanup_temp_dir(&temp_dir);
    }

    #[test]
    fn test_generate_filename() {
        let temp_dir = get_temp_dir();
        let storage = BackupStorage::new(temp_dir.clone()).unwrap();
        let filename = storage.generate_filename(1234567890);
        assert_eq!(filename, "nuvio_backup_1234567890.json");
        cleanup_temp_dir(&temp_dir);
    }

    #[test]
    fn test_write_read_backup() {
        let temp_dir = get_temp_dir();
        let storage = BackupStorage::new(temp_dir.clone()).unwrap();

        let test_data = b"Test backup data";
        let filename = "test_backup.json";

        let path = storage.write_backup(filename, test_data).unwrap();
        assert!(path.exists());

        let read_data = storage.read_backup(&path).unwrap();
        assert_eq!(test_data, read_data.as_slice());

        cleanup_temp_dir(&temp_dir);
    }

    #[test]
    fn test_delete_backup() {
        let temp_dir = get_temp_dir();
        let storage = BackupStorage::new(temp_dir.clone()).unwrap();

        let test_data = b"Test backup data";
        let filename = "test_backup.json";

        let path = storage.write_backup(filename, test_data).unwrap();
        assert!(path.exists());

        storage.delete_backup(&path).unwrap();
        assert!(!path.exists());

        cleanup_temp_dir(&temp_dir);
    }

    #[test]
    fn test_list_backups() {
        let temp_dir = get_temp_dir();
        let storage = BackupStorage::new(temp_dir.clone()).unwrap();

        // Create some backup files
        storage.write_backup("nuvio_backup_1.json", b"data1").unwrap();
        storage.write_backup("nuvio_backup_2.json", b"data2").unwrap();
        storage.write_backup("other_file.txt", b"data3").unwrap();

        let backups = storage.list_backups().unwrap();
        assert_eq!(backups.len(), 2);

        cleanup_temp_dir(&temp_dir);
    }

    #[test]
    fn test_get_file_size() {
        let temp_dir = get_temp_dir();
        let storage = BackupStorage::new(temp_dir.clone()).unwrap();

        let test_data = b"Test backup data";
        let filename = "test_backup.json";

        let path = storage.write_backup(filename, test_data).unwrap();
        let size = storage.get_file_size(&path).unwrap();
        assert_eq!(size, test_data.len() as u64);

        cleanup_temp_dir(&temp_dir);
    }
}
