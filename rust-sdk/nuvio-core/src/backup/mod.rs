//! Backup and restore functionality for Nuvio Streaming TV SDK
//!
//! This module provides comprehensive backup and restore capabilities for user data,
//! including settings, library, watch progress, addons, downloads, and more.
//!
//! # Features
//!
//! - Local backup creation and restoration
//! - Cloud backup integration
//! - Compression using flate2 (gzip)
//! - Secure serialization with serde_json
//! - Data validation and integrity checks
//! - Selective backup/restore with options
//!
//! # Example
//!
//! ```no_run
//! use nuvio_core::backup::{BackupManager, BackupOptions};
//!
//! let manager = BackupManager::new();
//! let options = BackupOptions::default();
//! let backup_path = manager.create_backup(options).await.unwrap();
//! ```

pub mod error;
pub mod manager;
pub mod models;
pub mod compression;
pub mod storage;

pub use error::BackupError;
pub use manager::BackupManager;
pub use models::*;
pub use compression::CompressionManager;
pub use storage::BackupStorage;
