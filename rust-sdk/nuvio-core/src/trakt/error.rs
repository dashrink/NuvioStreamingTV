//! Error types for the Trakt module.
//!
//! This module defines UniFFI-compatible error types for all Trakt operations.

use thiserror::Error;
use uniffi;

/// Error types that can occur during Trakt API operations.
///
/// All variants use named fields to ensure compatibility with UniFFI's FFI layer.
/// These errors can be safely propagated across language boundaries to Kotlin and Swift.
/// Note: Field is named `msg` (not `message`) to avoid conflict with Kotlin Exception.message
#[derive(uniffi::Error, Debug, Error, Clone)]
pub enum TraktError {
    /// OAuth2 authentication error
    #[error("OAuth2 error: {msg}")]
    OAuth2Error { msg: String },

    /// Network or HTTP error
    #[error("Network error: {msg}")]
    NetworkError { msg: String },

    /// Storage/persistence error
    #[error("Storage error: {msg}")]
    StorageError { msg: String },

    /// Invalid token error
    #[error("Invalid token: {msg}")]
    InvalidToken { msg: String },

    /// API error from Trakt service
    #[error("API error: {msg}")]
    ApiError { msg: String },

    /// Input validation error
    #[error("Validation error: {msg}")]
    ValidationError { msg: String },

    /// Rate limit exceeded
    #[error("Rate limit exceeded: {msg}")]
    RateLimitExceeded { msg: String },

    /// Resource not found (404)
    #[error("Not found: {msg}")]
    NotFound { msg: String },

    /// Unknown or unexpected error
    #[error("Unknown error: {msg}")]
    Unknown { msg: String },
}

impl TraktError {
    /// Creates a new OAuth2Error with the given message
    pub fn oauth2(m: impl Into<String>) -> Self {
        Self::OAuth2Error {
            msg: m.into(),
        }
    }

    /// Creates a new NetworkError with the given message
    pub fn network(m: impl Into<String>) -> Self {
        Self::NetworkError {
            msg: m.into(),
        }
    }

    /// Creates a new StorageError with the given message
    pub fn storage(m: impl Into<String>) -> Self {
        Self::StorageError {
            msg: m.into(),
        }
    }

    /// Creates a new InvalidToken error with the given message
    pub fn invalid_token(m: impl Into<String>) -> Self {
        Self::InvalidToken {
            msg: m.into(),
        }
    }

    /// Creates a new ApiError with the given message
    pub fn api(m: impl Into<String>) -> Self {
        Self::ApiError {
            msg: m.into(),
        }
    }

    /// Creates a new ValidationError with the given message
    pub fn validation(m: impl Into<String>) -> Self {
        Self::ValidationError {
            msg: m.into(),
        }
    }

    /// Creates a new RateLimitExceeded error with the given message
    pub fn rate_limit(m: impl Into<String>) -> Self {
        Self::RateLimitExceeded {
            msg: m.into(),
        }
    }

    /// Creates a new NotFound error with the given message
    pub fn not_found(m: impl Into<String>) -> Self {
        Self::NotFound {
            msg: m.into(),
        }
    }

    /// Creates a new Unknown error with the given message
    pub fn unknown(m: impl Into<String>) -> Self {
        Self::Unknown {
            msg: m.into(),
        }
    }
}

/// Helper conversions from String
impl From<String> for TraktError {
    fn from(m: String) -> Self {
        Self::Unknown { msg: m }
    }
}

impl From<&str> for TraktError {
    fn from(m: &str) -> Self {
        Self::Unknown {
            msg: m.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let err = TraktError::validation("Invalid input");
        assert!(matches!(err, TraktError::ValidationError { .. }));
        assert_eq!(err.to_string(), "Validation error: Invalid input");
    }

    #[test]
    fn test_from_string() {
        let err = TraktError::from("test error");
        assert!(matches!(err, TraktError::Unknown { .. }));
    }

    #[test]
    fn test_all_variants() {
        let errors = vec![
            TraktError::oauth2("oauth2"),
            TraktError::network("network"),
            TraktError::storage("storage"),
            TraktError::invalid_token("token"),
            TraktError::api("api"),
            TraktError::validation("validation"),
            TraktError::rate_limit("rate"),
            TraktError::not_found("notfound"),
            TraktError::unknown("unknown"),
        ];

        for err in errors {
            // Verify they all display correctly
            assert!(!err.to_string().is_empty());
        }
    }
}
