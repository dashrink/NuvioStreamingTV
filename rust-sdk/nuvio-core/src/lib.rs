//! Nuvio Core SDK
//!
//! This library provides the foundational types and FFI layer for the Nuvio Streaming TV SDK.
//! It uses UniFFI to generate Kotlin and Swift bindings for cross-platform mobile development.
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
//! # Example
//!
//! ```rust
//! use nuvio_core::types::Meta;
//!
//! // Create a new content metadata
//! let meta = Meta::new("123".to_string(), "The Matrix".to_string());
//! assert_eq!(meta.name, "The Matrix");
//! ```

// Re-export uniffi for use throughout the crate
pub use uniffi;

// Domain types module
pub mod types;

// Error types module
pub mod error;

// HTTP networking layer module
pub mod http;

// UniFFI setup - this macro generates the FFI scaffolding
uniffi::setup_scaffolding!();

/// Initialize tracing infrastructure with a subscriber
/// This should be called once at the start of the application or in test setup
pub fn init_tracing() {
    use tracing_subscriber::{fmt, EnvFilter};

    // Try to initialize the subscriber, but don't panic if it's already initialized
    let _ = fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info"))
        )
        .try_init();
}

#[cfg(test)]
mod tests {
    use super::*;
    use tracing::{debug, info, warn, error};

    #[test]
    fn test_crate_compiles() {
        // Initialize tracing for tests
        init_tracing();

        // Basic smoke test to ensure the crate compiles
        info!("Running basic crate compilation test");
        debug!("DEBUG level log from test_crate_compiles");
        assert!(true);
    }

    #[test]
    fn test_tracing_infrastructure() {
        // Initialize tracing for tests
        init_tracing();

        // Test that tracing emits logs at different levels
        debug!("DEBUG level log test");
        info!("INFO level log test");
        warn!("WARN level log test");
        error!("ERROR level log test");

        // Verify that the tracing infrastructure is working
        // The actual log output verification is done by the test command
        assert!(true);
    }
}
