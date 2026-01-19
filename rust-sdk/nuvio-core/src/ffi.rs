//! FFI Initialization Module
//!
//! This module provides the entry points for initializing the Nuvio SDK from
//! foreign languages (Kotlin and Swift) via UniFFI.
//!
//! # Architecture
//!
//! The FFI layer is designed to be:
//! - **Thread-safe**: Safe to call from any thread
//! - **Idempotent**: Safe to call multiple times
//! - **Simple**: Minimal API surface for easy integration
//!
//! # Usage from Kotlin
//!
//! ```kotlin
//! import uniffi.nuvio_core.*
//!
//! // Initialize with defaults
//! nuvioInitialize()
//!
//! // Or with custom configuration
//! val config = SdkConfig(
//!     environment = Environment.DEVELOPMENT,
//!     logLevel = LogLevel.DEBUG,
//!     appName = "MyApp",
//!     appVersion = "1.0.0"
//! )
//! nuvioInitializeWithConfig(config)
//!
//! // Access SDK singleton
//! val sdk = NuvioSdk.getInstance()
//! ```
//!
//! # Usage from Swift
//!
//! ```swift
//! import nuvio_core
//!
//! // Initialize with defaults
//! nuvioInitialize()
//!
//! // Or with custom configuration
//! let config = SdkConfig(
//!     environment: .development,
//!     logLevel: .debug,
//!     appName: "MyApp",
//!     appVersion: "1.0.0"
//! )
//! nuvioInitializeWithConfig(config)
//!
//! // Access SDK singleton
//! let sdk = NuvioSdk.getInstance()
//! ```

use crate::config::SdkConfig;
use crate::logging::{init_logging, LoggingConfig};
use parking_lot::RwLock;
use std::sync::Arc;
use tracing::info;
use uniffi;

/// Global SDK instance.
static SDK_INSTANCE: RwLock<Option<Arc<NuvioSdk>>> = RwLock::new(None);

/// The main Nuvio SDK singleton.
///
/// This struct provides access to SDK functionality and maintains the SDK state.
/// It should be initialized once at application startup using [`nuvio_initialize`]
/// or [`nuvio_initialize_with_config`].
///
/// # FFI Safety
///
/// This struct is exported via UniFFI and can be used from Kotlin and Swift.
///
/// # Thread Safety
///
/// The SDK is thread-safe and can be accessed from multiple threads concurrently.
#[derive(uniffi::Object, Debug)]
pub struct NuvioSdk {
    config: SdkConfig,
    initialized_at: i64,
}

#[uniffi::export]
impl NuvioSdk {
    /// Returns the SDK configuration.
    pub fn config(&self) -> SdkConfig {
        self.config.clone()
    }
    
    /// Returns the timestamp when the SDK was initialized (Unix epoch milliseconds).
    pub fn initialized_at(&self) -> i64 {
        self.initialized_at
    }
    
    /// Returns the SDK version.
    pub fn version(&self) -> String {
        env!("CARGO_PKG_VERSION").to_string()
    }
    
    /// Returns whether the SDK is running in debug mode.
    pub fn is_debug(&self) -> bool {
        self.config.debug_mode
    }
    
    /// Returns the current environment name.
    pub fn environment_name(&self) -> String {
        self.config.environment.as_str().to_string()
    }
}

impl NuvioSdk {
    /// Creates a new SDK instance with the given configuration.
    fn new(config: SdkConfig) -> Self {
        Self {
            config,
            initialized_at: chrono::Utc::now().timestamp_millis(),
        }
    }
    
    /// Returns the global SDK instance if initialized.
    pub fn instance() -> Option<Arc<NuvioSdk>> {
        SDK_INSTANCE.read().clone()
    }
}

/// Initializes the Nuvio SDK with default configuration.
///
/// This function should be called once at application startup. If called
/// multiple times, subsequent calls are ignored and the existing instance
/// is returned.
///
/// # Returns
///
/// The initialized SDK instance.
///
/// # Example (Rust)
///
/// ```rust
/// use nuvio_core::ffi::nuvio_initialize;
///
/// let sdk = nuvio_initialize();
/// println!("SDK version: {}", sdk.version());
/// ```
///
/// # FFI Note
///
/// This function is exported via UniFFI and can be called from Kotlin and Swift.
#[uniffi::export]
pub fn nuvio_initialize() -> Arc<NuvioSdk> {
    nuvio_initialize_with_config(SdkConfig::default())
}

/// Initializes the Nuvio SDK with custom configuration.
///
/// This function should be called once at application startup. If called
/// multiple times, subsequent calls are ignored and the existing instance
/// is returned.
///
/// # Arguments
///
/// * `config` - The SDK configuration to use.
///
/// # Returns
///
/// The initialized SDK instance.
///
/// # Example (Rust)
///
/// ```rust
/// use nuvio_core::config::{SdkConfig, Environment, LogLevel};
/// use nuvio_core::ffi::nuvio_initialize_with_config;
///
/// let config = SdkConfig::builder()
///     .environment(Environment::Development)
///     .log_level(LogLevel::Debug)
///     .build();
///
/// let sdk = nuvio_initialize_with_config(config);
/// println!("SDK initialized in {} mode", sdk.environment_name());
/// ```
///
/// # FFI Note
///
/// This function is exported via UniFFI and can be called from Kotlin and Swift.
#[uniffi::export]
pub fn nuvio_initialize_with_config(config: SdkConfig) -> Arc<NuvioSdk> {
    // Check if already initialized
    {
        let guard = SDK_INSTANCE.read();
        if let Some(ref sdk) = *guard {
            return Arc::clone(sdk);
        }
    }
    
    // Initialize under write lock
    let mut guard = SDK_INSTANCE.write();
    
    // Double-check after acquiring write lock
    if let Some(ref sdk) = *guard {
        return Arc::clone(sdk);
    }
    
    // Initialize logging
    let logging_config = LoggingConfig::builder()
        .level(config.effective_log_level())
        .show_target(config.debug_mode)
        .show_file(config.debug_mode)
        .show_line(config.debug_mode)
        .build();
    init_logging(Some(logging_config));
    
    // Create SDK instance
    let sdk = Arc::new(NuvioSdk::new(config));
    
    info!(
        version = %sdk.version(),
        environment = %sdk.environment_name(),
        debug = sdk.is_debug(),
        "Nuvio SDK initialized"
    );
    
    *guard = Some(Arc::clone(&sdk));
    
    sdk
}

/// Returns the global SDK instance.
///
/// This function returns the SDK instance if it has been initialized,
/// or None if [`nuvio_initialize`] has not been called yet.
///
/// # Returns
///
/// The SDK instance, or None if not initialized.
///
/// # Example
///
/// ```rust
/// use nuvio_core::ffi::{nuvio_get_instance, nuvio_initialize};
///
/// // Before initialization
/// assert!(nuvio_get_instance().is_none());
///
/// // After initialization
/// nuvio_initialize();
/// assert!(nuvio_get_instance().is_some());
/// ```
///
/// # FFI Note
///
/// This function is exported via UniFFI and can be called from Kotlin and Swift.
#[uniffi::export]
pub fn nuvio_get_instance() -> Option<Arc<NuvioSdk>> {
    NuvioSdk::instance()
}

/// Checks if the SDK has been initialized.
///
/// # Returns
///
/// True if the SDK has been initialized, false otherwise.
///
/// # FFI Note
///
/// This function is exported via UniFFI and can be called from Kotlin and Swift.
#[uniffi::export]
pub fn nuvio_is_initialized() -> bool {
    SDK_INSTANCE.read().is_some()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Environment, LogLevel};

    // Note: These tests need to be careful about global state.
    // In a real test suite, you'd want to reset the global state between tests.
    
    #[test]
    fn test_sdk_initialization() {
        let sdk = nuvio_initialize();
        
        assert!(!sdk.version().is_empty());
        assert!(sdk.initialized_at() > 0);
    }

    #[test]
    fn test_sdk_config_access() {
        let config = SdkConfig::builder()
            .app_name("TestApp")
            .app_version("1.0.0")
            .build();
        
        let sdk = nuvio_initialize_with_config(config);
        let retrieved_config = sdk.config();
        
        // Note: Due to global state, this might return the first initialization's config
        assert!(!retrieved_config.app_name.is_empty());
    }

    #[test]
    fn test_sdk_is_initialized() {
        nuvio_initialize();
        assert!(nuvio_is_initialized());
    }

    #[test]
    fn test_sdk_get_instance() {
        nuvio_initialize();
        let instance = nuvio_get_instance();
        assert!(instance.is_some());
    }

    #[test]
    fn test_sdk_idempotent_initialization() {
        let sdk1 = nuvio_initialize();
        let sdk2 = nuvio_initialize();
        
        // Both should return the same instance (same Arc)
        assert!(Arc::ptr_eq(&sdk1, &sdk2));
    }

    #[test]
    fn test_nuvio_sdk_debug() {
        let sdk = nuvio_initialize();
        let debug_str = format!("{:?}", sdk);
        
        assert!(debug_str.contains("NuvioSdk"));
    }
}
