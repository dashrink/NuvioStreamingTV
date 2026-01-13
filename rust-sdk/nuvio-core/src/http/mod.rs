//! HTTP networking layer module
//!
//! This module provides a production-grade HTTP client with connection pooling,
//! timeout configuration, and thread-safe access patterns. It uses reqwest as the
//! underlying HTTP client and is designed to support cross-platform FFI via UniFFI.
//!
//! # Core Components
//!
//! - [`client`] - HTTP client implementation with connection pooling
//! - [`config`] - HTTP client configuration builder
//! - [`middleware`] - Request/response interceptor implementations
//! - [`retry`] - Retry logic with exponential backoff for transient failures
//! - [`cookies`] - Cookie jar management for OAuth flows
//! - [`tls`] - TLS configuration and certificate pinning
//!
//! # Connection Pooling
//!
//! The HTTP client uses a singleton pattern to ensure connection pooling works correctly.
//! **CRITICAL**: Only ONE client instance should exist throughout the application lifetime.
//! The client maintains an internal connection pool with configurable settings:
//! - `pool_idle_timeout` - How long idle connections are kept alive (default: 90s)
//! - `pool_max_idle_per_host` - Maximum idle connections per host (default: 10)
//!
//! # Thread Safety
//!
//! The HTTP client is thread-safe and can be safely shared across threads using Arc.
//! The internal connection pool is designed for concurrent access.
//!
//! # Example
//!
//! ```rust
//! use nuvio_core::http::client::get_client;
//! use nuvio_core::http::config::HttpClientConfig;
//! use std::time::Duration;
//!
//! // Get the global HTTP client instance (uses default configuration)
//! let client = get_client();
//!
//! // Or create a custom configuration for future use
//! let config = HttpClientConfig::builder()
//!     .request_timeout(Duration::from_secs(60))
//!     .pool_max_idle_per_host(20)
//!     .build();
//!
//! // The client is reused for all requests, enabling connection pooling
//! // This is async code - must be run in a tokio runtime
//! ```

// HTTP client module
pub mod client;

// HTTP client configuration module
pub mod config;

// Request/response middleware module
pub mod middleware;

// Retry logic with exponential backoff module
pub mod retry;

// Cookie jar management module
pub mod cookies;

// TLS configuration and certificate pinning module
pub mod tls;

// Re-export core types
pub use client::{create_client_with_config, get_client, get_client_with_middleware};
pub use config::{HttpClientConfig, HttpClientConfigBuilder};
pub use cookies::has_cookie_store_enabled;
pub use middleware::{HeaderInjectionMiddleware, LoggingMiddleware};
pub use retry::{
    create_custom_retry_middleware, create_retry_middleware, is_transient_status,
    DEFAULT_MAX_BACKOFF, DEFAULT_MAX_RETRIES, DEFAULT_MIN_BACKOFF,
};
pub use tls::{create_default_tls_config, TlsConfigBuilder, TlsConfigError};
