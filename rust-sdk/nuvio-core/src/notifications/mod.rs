//! Notification system module
//!
//! This module provides the notification management system for Nuvio Streaming TV.
//! It handles scheduling, managing, and syncing notifications for TV shows and movies.
//!
//! # Platform Integration
//!
//! The notification system uses platform-specific implementations via bridge callbacks:
//! - iOS: UserNotifications framework
//! - Android: NotificationManager
//!
//! # Example
//! ```no_run
//! use std::sync::Arc;
//! use nuvio_core::notifications::{NotificationManager, NotificationSettings};
//!
//! let settings = NotificationSettings::default();
//! let manager = NotificationManager::new(settings);
//! ```

pub mod models;
pub mod manager;
pub mod storage;

pub use models::*;
pub use manager::NotificationManager;
pub use storage::NotificationStorage;
