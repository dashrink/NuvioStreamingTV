//! Error types for the Trakt module.
//!
//! This module defines UniFFI-compatible error types for all Trakt operations.

use thiserror::Error;
use uniffi;

/// Error types that can occur during Trakt API operations.
///
/// All variants use named fields to ensure compatibility with UniFFI's FFI layer.
/// These errors can be safely propagated across language boundaries to Kotlin and Swift.
#[derive(uniffi::Error, Debug, Error, Clone)]
pub enum TraktError {
    /// OAuth2 authentication error
    #[error("OAuth2 error: {message}")]
    OAuth2Error { message: String },

    /// Network or HTTP error
    #[error("Network error: {message}")]
    NetworkError { message: String },

    /// Storage/persistence error
    #[error("Storage error: {message}")]
    StorageError { message: String },

    /// Invalid token error
    #[error("Invalid token: {message}")]
    InvalidToken { message: String },

    /// API error from Trakt service
    #[error("API error: {message}")]
    ApiError { message: String },

    /// Input validation error
    #[error("Validation error: {message}")]
    ValidationError { message: String },

    /// Rate limit exceeded
    #[error("Rate limit exceeded: {message}")]
    RateLimitExceeded { message: String },

    /// Resource not found (404)
    #[error("Not found: {message}")]
    NotFound { message: String },

    /// Unknown or unexpected error
    #[error("Unknown error: {message}")]
    Unknown { message: String },
}

impl TraktError {
    /// Creates a new OAuth2Error with the given message
    pub fn oauth2(msg: impl Into<String>) -> Self {
        Self::OAuth2Error {
            message: msg.into(),
        }
    }

    /// Creates a new NetworkError with the given message
    pub fn network(msg: impl Into<String>) -> Self {
        Self::NetworkError {
            message: msg.into(),
        }
    }

    /// Creates a new StorageError with the given message
    pub fn storage(msg: impl Into<String>) -> Self {
        Self::StorageError {
            message: msg.into(),
        }
    }

    /// Creates a new InvalidToken error with the given message
    pub fn invalid_token(msg: impl Into<String>) -> Self {
        Self::InvalidToken {
            message: msg.into(),
        }
    }

    /// Creates a new ApiError with the given message
    pub fn api(msg: impl Into<String>) -> Self {
        Self::ApiError {
            message: msg.into(),
        }
    }

    /// Creates a new ValidationError with the given message
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::ValidationError {
            message: msg.into(),
        }
    }

    /// Creates a new RateLimitExceeded error with the given message
    pub fn rate_limit(msg: impl Into<String>) -> Self {
        Self::RateLimitExceeded {
            message: msg.into(),
        }
    }

    /// Creates a new NotFound error with the given message
    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound {
            message: msg.into(),
        }
    }

    /// Creates a new Unknown error with the given message
    pub fn unknown(msg: impl Into<String>) -> Self {
        Self::Unknown {
            message: msg.into(),
        }
    }
}

/// Helper conversions from String
impl From<String> for TraktError {
    fn from(msg: String) -> Self {
        Self::Unknown { message: msg }
    }
}

impl From<&str> for TraktError {
    fn from(msg: &str) -> Self {
        Self::Unknown {
            message: msg.to_string(),
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
