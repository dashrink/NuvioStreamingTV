//! Local media scanning and management module
//!
//! This module provides functionality for scanning local directories for media files,
//! detecting their types, and extracting basic metadata.

use std::path::Path;
use std::time::SystemTime;
use walkdir::WalkDir;
use serde::{Deserialize, Serialize};
use uniffi;
use tracing::info;
use crate::error::NuvioError;

/// Represents a media file found on the local file system
#[derive(uniffi::Record, Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct LocalMediaFile {
    /// Absolute path to the file
    pub path: String,
    
    /// File name
    pub name: String,
    
    /// File size in bytes
    pub size: i64,
    
    /// MIME type (e.g., "video/mp4", "audio/mpeg")
    pub mime_type: Option<String>,
    
    /// Last modification timestamp (seconds since epoch)
    pub modified_at: i64,
}

/// Scanner for local media files
#[derive(uniffi::Object)]
pub struct LocalMediaScanner {}

#[uniffi::export]
impl LocalMediaScanner {
    /// Creates a new LocalMediaScanner
    #[uniffi::constructor]
    pub fn new() -> Self {
        Self {}
    }

    /// Scans a directory for media files
    ///
    /// This function traverses the directory recursively and returns a list of
    /// supported media files with their metadata.
    pub fn scan_directory(&self, root_path: String) -> Result<Vec<LocalMediaFile>, NuvioError> {
        info!("Scanning directory: {}", root_path);
        
        let path = Path::new(&root_path);
        if !path.exists() {
            return Err(NuvioError::Unknown { 
                msg: format!("Directory does not exist: {}", root_path) 
            });
        }

        let mut media_files = Vec::new();

        // Walk through the directory
        for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            
            // Skip directories
            if path.is_dir() {
                continue;
            }

            // Check if it's a media file based on mime type or extension
            if let Some(mime_type) = self.detect_mime_type(path) {
                if self.is_supported_media_type(&mime_type) {
                    if let Ok(metadata) = entry.metadata() {
                        let size = metadata.len() as i64;
                        let modified_at = metadata.modified()
                            .unwrap_or(SystemTime::UNIX_EPOCH)
                            .duration_since(SystemTime::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs() as i64;

                        let name = path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("unknown")
                            .to_string();

                        let path_str = path.to_str()
                            .unwrap_or("")
                            .to_string();

                        media_files.push(LocalMediaFile {
                            path: path_str,
                            name,
                            size,
                            mime_type: Some(mime_type),
                            modified_at,
                        });
                    }
                }
            }
        }

        info!("Found {} media files in {}", media_files.len(), root_path);
        Ok(media_files)
    }
}

impl LocalMediaScanner {
    /// Detects MIME type using 'infer' crate (checks file header) or extension fallback
    fn detect_mime_type(&self, path: &Path) -> Option<String> {
        // Try to infer from file content (magic numbers)
        if let Ok(Some(kind)) = infer::get_from_path(path) {
            return Some(kind.mime_type().to_string());
        }
        
        // Fallback to extension if infer fails
        if let Some(extension) = path.extension().and_then(|e| e.to_str()) {
            match extension.to_lowercase().as_str() {
                "mp4" | "m4v" => Some("video/mp4".to_string()),
                "mkv" => Some("video/x-matroska".to_string()),
                "avi" => Some("video/x-msvideo".to_string()),
                "mov" => Some("video/quicktime".to_string()),
                "webm" => Some("video/webm".to_string()),
                "mp3" => Some("audio/mpeg".to_string()),
                "aac" => Some("audio/aac".to_string()),
                "flac" => Some("audio/flac".to_string()),
                "wav" => Some("audio/wav".to_string()),
                _ => None,
            }
        } else {
            None
        }
    }

    /// Checks if the mime type is a supported media type
    fn is_supported_media_type(&self, mime_type: &str) -> bool {
        mime_type.starts_with("video/") || mime_type.starts_with("audio/")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_scan_directory() {
        let scanner = LocalMediaScanner::new();
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_video.mp4");
        
        let mut file = File::create(&file_path).unwrap();
        file.write_all(b"dummy content").unwrap();

        let results = scanner.scan_directory(dir.path().to_str().unwrap().to_string()).unwrap();
        
        // Should find it now because of extension fallback
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "test_video.mp4");
        assert_eq!(results[0].mime_type, Some("video/mp4".to_string()));
    }
}
