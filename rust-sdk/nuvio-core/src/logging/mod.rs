//! Logging Module
//!
//! This module provides structured logging infrastructure for the Nuvio SDK.
//! It builds on the `tracing` crate to provide:
//!
//! - Configurable log levels
//! - Structured logging with spans and events
//! - Environment-based configuration
//! - FFI-safe logging initialization
//!
//! # Architecture
//!
//! The logging system is designed to be:
//! - **FFI-safe**: Can be initialized from Kotlin and Swift via UniFFI
//! - **Configurable**: Log levels can be set via environment or programmatically
//! - **Structured**: Supports structured logging with key-value pairs
//! - **Thread-safe**: Safe to use from multiple threads
//!
//! # Example
//!
//! ```rust
//! use nuvio_core::logging::{init_logging, LoggingConfig};
//! use nuvio_core::config::LogLevel;
//!
//! // Initialize with default settings
//! init_logging(None);
//!
//! // Or with custom configuration
//! let config = LoggingConfig::builder()
//!     .level(LogLevel::Debug)
//!     .show_target(true)
//!     .build();
//! init_logging(Some(config));
//! ```

mod logging_config;

pub use logging_config::{LoggingConfig, LoggingConfigBuilder, init_logging, init_logging_with_config};
