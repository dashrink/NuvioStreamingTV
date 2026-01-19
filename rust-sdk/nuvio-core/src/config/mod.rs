//! SDK Configuration Module
//!
//! This module provides the foundational configuration management for the Nuvio SDK.
//! It supports multiple configuration sources including:
//! - Default values
//! - Environment variables
//! - Programmatic configuration via builder pattern
//!
//! # Architecture
//!
//! The configuration system is designed to be:
//! - **FFI-safe**: All configuration types can cross language boundaries via UniFFI
//! - **Flexible**: Multiple configuration sources with sensible precedence
//! - **Type-safe**: Strongly typed configuration values
//! - **Extensible**: Easy to add new configuration options
//!
//! # Example
//!
//! ```rust
//! use nuvio_core::config::{SdkConfig, LogLevel, Environment};
//!
//! // Use default configuration
//! let config = SdkConfig::default();
//!
//! // Or use the builder for custom configuration
//! let config = SdkConfig::builder()
//!     .environment(Environment::Production)
//!     .log_level(LogLevel::Info)
//!     .app_name("MyApp")
//!     .app_version("1.0.0")
//!     .build();
//! ```

mod sdk_config;
mod environment;
mod log_level;

pub use sdk_config::{SdkConfig, SdkConfigBuilder};
pub use environment::Environment;
pub use log_level::LogLevel;
