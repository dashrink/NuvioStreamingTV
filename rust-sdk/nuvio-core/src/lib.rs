//! Nuvio Core SDK
//!
//! This library provides the foundational types, configuration management, logging,
//! and FFI layer for the Nuvio Streaming TV SDK. It uses UniFFI to generate
//! Kotlin and Swift bindings for cross-platform mobile development.
//!
//! # Architecture
//!
//! The SDK is organized into several core modules:
//!
//! - [`config`] - SDK configuration management with environment support
//! - [`logging`] - Structured logging infrastructure with FFI-safe initialization
//! - [`error`] - Error types that can cross FFI boundaries
//! - [`types`] - Core domain types (Meta, Stream, Catalog, Profile)
//! - [`ffi`] - FFI initialization and SDK singleton
//! - [`prelude`] - Convenient re-exports for common imports
//!
//! # Getting Started
//!
//! The easiest way to get started is to use the prelude and initialize the SDK:
//!
//! ```rust
//! use nuvio_core::prelude::*;
//!
//! // Initialize SDK with defaults
//! let sdk = nuvio_initialize();
//!
//! // Or with custom configuration
//! let config = SdkConfig::builder()
//!     .environment(Environment::Development)
//!     .log_level(LogLevel::Debug)
//!     .app_name("MyApp")
//!     .build();
//! let sdk = nuvio_initialize_with_config(config);
//! ```
//!
//! # Core Types
//!
//! The SDK provides four main domain types:
//! - [`types::Meta`] - Metadata for content items (movies, TV shows)
//! - [`types::Stream`] - Video stream information (URL, quality, format)
//! - [`types::Catalog`] - Collections of content items
//! - [`types::Profile`] - User profile with personalization settings
//!
//! # Error Handling
//!
//! All errors are represented by [`error::NuvioError`], which is FFI-safe and can
//! cross language boundaries to Kotlin and Swift.
//!
//! # Configuration
//!
//! SDK configuration can be provided in multiple ways:
//! - Programmatically via [`config::SdkConfig`] builder
//! - From environment variables via [`config::SdkConfig::from_env()`]
//! - Using sensible defaults
//!
//! ## Environment Variables
//!
//! The following environment variables are recognized:
//! - `NUVIO_ENV` / `NUVIO_ENVIRONMENT` - Runtime environment (dev, staging, prod)
//! - `NUVIO_LOG_LEVEL` - Log level (trace, debug, info, warn, error)
//! - `NUVIO_APP_NAME` - Application name
//! - `NUVIO_APP_VERSION` - Application version
//! - `NUVIO_DATA_DIR` - Custom data directory
//! - `NUVIO_DEBUG` - Enable debug mode (true/false)
//! - `NUVIO_ANALYTICS` - Enable analytics (true/false)
//!
//! # Logging
//!
//! The SDK uses the `tracing` crate for structured logging. Initialize logging
//! explicitly for control over output format:
//!
//! ```rust
//! use nuvio_core::logging::{init_logging, LoggingConfig};
//! use nuvio_core::config::LogLevel;
//!
//! let config = LoggingConfig::builder()
//!     .level(LogLevel::Debug)
//!     .show_target(true)
//!     .build();
//! init_logging(Some(config));
//! ```
//!
//! # FFI / Cross-Platform
//!
//! The SDK is designed for cross-platform use via UniFFI. All public types
//! marked with `#[uniffi::*]` attributes can be used from Kotlin and Swift.
//!
//! ## Kotlin Example
//!
//! ```kotlin
//! import uniffi.nuvio_core.*
//!
//! // Initialize SDK
//! val sdk = nuvioInitialize()
//! println("SDK version: ${sdk.version()}")
//!
//! // Create metadata
//! val meta = Meta(
//!     id = "tt0133093",
//!     name = "The Matrix"
//! )
//! ```
//!
//! ## Swift Example
//!
//! ```swift
//! import nuvio_core
//!
//! // Initialize SDK
//! let sdk = nuvioInitialize()
//! print("SDK version: \(sdk.version())")
//!
//! // Create metadata
//! let meta = Meta(
//!     id: "tt0133093",
//!     name: "The Matrix"
//! )
//! ```

// Re-export uniffi for use throughout the crate
pub use uniffi;

// Configuration module - SDK configuration management
pub mod config;

// Logging module - Structured logging infrastructure
pub mod logging;

// Error types module - FFI-safe error types
pub mod error;

// Domain types module - Core domain types
pub mod types;

// FFI module - SDK initialization and singleton
pub mod ffi;

// Prelude module - Convenient re-exports
pub mod prelude;

// Trakt.tv API integration module
pub mod trakt;

<<<<<<< HEAD
<<<<<<< HEAD
// HTTP client module
pub mod http;

// Cache management module
pub mod cache;

// Profile management module (if not already exported)
pub mod profile;

// Stremio service module (if not already exported)
pub mod stremio_service;

// Backup and restore module
pub mod backup;

// Notification management module
pub mod notifications;
=======
// HTTP networking module
pub mod http;

// Profile management module
pub mod profile;

// Stremio addon service module
pub mod stremio_service;

// TMDB API integration module
pub mod tmdb;
>>>>>>> feature/main-1768751034241-zo2o
=======
// Local media scanning module
pub mod local_media;
>>>>>>> feature/main-1768737525994-h2p9

// UniFFI setup - this macro generates the FFI scaffolding
uniffi::setup_scaffolding!();

/// Initialize tracing infrastructure with a subscriber.
///
/// This is a legacy function maintained for backward compatibility.
/// For new code, prefer using [`logging::init_logging`] or
/// [`ffi::nuvio_initialize`] which handles logging automatically.
///
/// This should be called once at the start of the application or in test setup.
///
/// # Example
///
/// ```rust
/// use nuvio_core::init_tracing;
///
/// // Initialize tracing with default settings
/// init_tracing();
/// ```
#[deprecated(
    since = "0.2.0",
    note = "Use logging::init_logging() or ffi::nuvio_initialize() instead"
)]
pub fn init_tracing() {
    use tracing_subscriber::{fmt, EnvFilter};

    // Try to initialize the subscriber, but don't panic if it's already initialized
    let _ = fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .try_init();
}

#[cfg(test)]
mod tests {
    use super::*;
    use tracing::{debug, error, info, warn};

    #[test]
    fn test_crate_compiles() {
        // Initialize logging for tests
        logging::init_logging(None);

        // Basic smoke test to ensure the crate compiles
        info!("Running basic crate compilation test");
        debug!("DEBUG level log from test_crate_compiles");
        assert!(true);
    }

    #[test]
    fn test_tracing_infrastructure() {
        // Initialize logging for tests
        logging::init_logging(None);

        // Test that tracing emits logs at different levels
        debug!("DEBUG level log test");
        info!("INFO level log test");
        warn!("WARN level log test");
        error!("ERROR level log test");

        // Verify that the tracing infrastructure is working
        // The actual log output verification is done by the test command
        assert!(true);
    }

    #[test]
    fn test_prelude_imports() {
        // Verify that prelude exports work
        use crate::prelude::*;

        let _config = SdkConfig::default();
        let _env = Environment::Production;
        let _level = LogLevel::Info;
    }

    #[test]
    fn test_sdk_initialization() {
        use crate::ffi::nuvio_initialize;

        let sdk = nuvio_initialize();
        assert!(!sdk.version().is_empty());
    }
}
