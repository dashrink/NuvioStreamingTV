//! Prelude module for convenient imports.
//!
//! This module re-exports the most commonly used types from the Nuvio SDK
//! for easy importing in application code.
//!
//! # Usage
//!
//! Instead of importing individual types from their modules:
//!
//! ```rust,ignore
//! use nuvio_core::types::Meta;
//! use nuvio_core::types::Stream;
//! use nuvio_core::error::NuvioError;
//! use nuvio_core::config::SdkConfig;
//! ```
//!
//! You can use the prelude:
//!
//! ```rust,ignore
//! use nuvio_core::prelude::*;
//! ```
//!
//! This brings all commonly needed types into scope with a single import.

// Core domain types
pub use crate::types::{Catalog, Meta, Profile, Stream};

// Error types
pub use crate::error::NuvioError;

// Configuration types
pub use crate::config::{Environment, LogLevel, SdkConfig};

// Logging types and functions
pub use crate::logging::{init_logging, LoggingConfig};

// FFI initialization
pub use crate::ffi::{nuvio_initialize, nuvio_initialize_with_config, NuvioSdk};

// Result type alias for convenience
/// A Result type alias using NuvioError as the error type.
pub type NuvioResult<T> = Result<T, NuvioError>;
