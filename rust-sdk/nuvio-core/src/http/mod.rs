//! HTTP networking layer module
//!
//! This module provides a production-grade HTTP client with connection pooling,
//! timeout configuration, and thread-safe access patterns. It uses reqwest as the
//! underlying HTTP client and is designed to support cross-platform FFI via UniFFI.
//!
//! # Core Components
//!
//! - [`client`] - HTTP client implementation with connection pooling
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
//!
//! // Get the global HTTP client instance
//! let client = get_client();
//!
//! // The client is reused for all requests, enabling connection pooling
//! // This is async code - must be run in a tokio runtime
//! ```

// HTTP client module
pub mod client;

// Re-export core client types
pub use client::get_client;
