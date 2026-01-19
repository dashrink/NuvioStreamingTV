//! Error types for the Nuvio Core SDK.
//!
//! This module defines error types that can safely cross FFI boundaries using UniFFI.
//! All error variants use named fields (no tuple variants) as required by UniFFI.

use thiserror::Error;
use uniffi;

/// Result type alias for the Nuvio SDK using NuvioError.
pub type NuvioResult<T> = Result<T, NuvioError>;

/// Error types that can occur in the Nuvio Core SDK.
///
/// All variants use named fields to ensure compatibility with UniFFI's FFI layer.
/// These errors can be safely propagated across language boundaries to Kotlin and Swift.
#[derive(uniffi::Error, Debug, Error)]
pub enum NuvioError {
    /// Error occurred during serialization or deserialization
    #[error("Serialization error: {msg}")]
    SerializationError {
        /// Detailed error message describing what went wrong
        msg: String,
    },

    /// Error occurred during validation of input data
    #[error("Validation error: {msg}")]
    ValidationError {
        /// Detailed error message describing the validation failure
        msg: String,
    },

    /// Network-level error (DNS, connection, etc.)
    #[error("Network error: {msg}")]
    NetworkError {
        /// Detailed error message describing the network failure
        msg: String,
    },

    /// Request or connection timeout
    #[error("Timeout error: {msg}")]
    TimeoutError {
        /// Detailed error message describing the timeout
        msg: String,
    },

    /// Storage/IO error
    #[error("Storage error: {msg}")]
    StorageError {
        /// Detailed error message describing the storage failure
        msg: String,
    },

    /// Security-related error (encryption, authentication, etc.)
    #[error("Security error: {msg}")]
    SecurityError {
        /// Detailed error message describing the security failure
        msg: String,
    },

    /// Addon not found error
    #[error("Addon not found: {msg}")]
    AddonNotFoundError {
        /// Detailed error message describing which addon was not found
        msg: String,
    },

    /// Response too large error
    #[error("Response too large: {msg}")]
    ResponseTooLargeError {
        /// Detailed error message describing the size limit exceeded
        msg: String,
    },

    /// Unknown or unexpected error occurred
    #[error("Unknown error: {msg}")]
    Unknown {
        /// Detailed error message describing the error
        msg: String,
    },
}

impl NuvioError {
    /// Creates a new SerializationError with the given message
    pub fn serialization(msg: impl Into<String>) -> Self {
        Self::SerializationError { msg: msg.into() }
    }

    /// Creates a new ValidationError with the given message
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::ValidationError { msg: msg.into() }
    }

    /// Creates a new NetworkError with the given message
    pub fn network_error(msg: impl Into<String>) -> Self {
        Self::NetworkError { msg: msg.into() }
    }

    /// Creates a new TimeoutError with the given message
    pub fn timeout(msg: impl Into<String>) -> Self {
        Self::TimeoutError { msg: msg.into() }
    }

    /// Creates a new StorageError with the given message
    pub fn storage(msg: impl Into<String>) -> Self {
        Self::StorageError { msg: msg.into() }
    }

    /// Creates a new SecurityError with the given message
    pub fn security(msg: impl Into<String>) -> Self {
        Self::SecurityError { msg: msg.into() }
    }

    /// Creates a new AddonNotFoundError with the given message
    pub fn addon_not_found(msg: impl Into<String>) -> Self {
        Self::AddonNotFoundError { msg: msg.into() }
    }

    /// Creates a new ResponseTooLargeError with the given message
    pub fn response_too_large(msg: impl Into<String>) -> Self {
        Self::ResponseTooLargeError { msg: msg.into() }
    }

    /// Creates a new Unknown error with the given message
    pub fn unknown(msg: impl Into<String>) -> Self {
        Self::Unknown { msg: msg.into() }
    }

    /// Lowers a more detailed error to a simpler form (alias for network_error for compatibility)
    pub fn lower_error(msg: impl Into<String>) -> Self {
        Self::NetworkError { msg: msg.into() }
    }
}

impl From<serde_json::Error> for NuvioError {
    fn from(err: serde_json::Error) -> Self {
        Self::SerializationError {
            msg: err.to_string(),
        }
    }
}

impl From<std::io::Error> for NuvioError {
    fn from(err: std::io::Error) -> Self {
        Self::StorageError {
            msg: err.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialization_error() {
        let error = NuvioError::serialization("Failed to parse JSON");

        match error {
            NuvioError::SerializationError { msg } => {
                assert_eq!(msg, "Failed to parse JSON");
            }
            _ => panic!("Expected SerializationError"),
        }
    }

    #[test]
    fn test_validation_error() {
        let error = NuvioError::validation("Invalid email format");

        match error {
            NuvioError::ValidationError { msg } => {
                assert_eq!(msg, "Invalid email format");
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    #[test]
    fn test_network_error() {
        let error = NuvioError::network_error("Connection refused");

        match error {
            NuvioError::NetworkError { msg } => {
                assert_eq!(msg, "Connection refused");
            }
            _ => panic!("Expected NetworkError"),
        }
    }

    #[test]
    fn test_timeout_error() {
        let error = NuvioError::timeout("Request timed out after 30s");

        match error {
            NuvioError::TimeoutError { msg } => {
                assert_eq!(msg, "Request timed out after 30s");
            }
            _ => panic!("Expected TimeoutError"),
        }
    }

    #[test]
    fn test_storage_error() {
        let error = NuvioError::storage("Failed to write file");

        match error {
            NuvioError::StorageError { msg } => {
                assert_eq!(msg, "Failed to write file");
            }
            _ => panic!("Expected StorageError"),
        }
    }

    #[test]
    fn test_security_error() {
        let error = NuvioError::security("Invalid password");

        match error {
            NuvioError::SecurityError { msg } => {
                assert_eq!(msg, "Invalid password");
            }
            _ => panic!("Expected SecurityError"),
        }
    }

    #[test]
    fn test_addon_not_found_error() {
        let error = NuvioError::addon_not_found("addon.example");

        match error {
            NuvioError::AddonNotFoundError { msg } => {
                assert_eq!(msg, "addon.example");
            }
            _ => panic!("Expected AddonNotFoundError"),
        }
    }

    #[test]
    fn test_response_too_large_error() {
        let error = NuvioError::response_too_large("Response exceeded 10MB limit");

        match error {
            NuvioError::ResponseTooLargeError { msg } => {
                assert_eq!(msg, "Response exceeded 10MB limit");
            }
            _ => panic!("Expected ResponseTooLargeError"),
        }
    }

    #[test]
    fn test_unknown_error() {
        let error = NuvioError::unknown("Something went wrong");

        match error {
            NuvioError::Unknown { msg } => {
                assert_eq!(msg, "Something went wrong");
            }
            _ => panic!("Expected Unknown error"),
        }
    }

    #[test]
    fn test_error_display() {
        let serialization_error = NuvioError::serialization("JSON parse error");
        assert_eq!(
            format!("{}", serialization_error),
            "Serialization error: JSON parse error"
        );

        let validation_error = NuvioError::validation("Field required");
        assert_eq!(
            format!("{}", validation_error),
            "Validation error: Field required"
        );

        let unknown_error = NuvioError::unknown("Unexpected state");
        assert_eq!(
            format!("{}", unknown_error),
            "Unknown error: Unexpected state"
        );
    }

    #[test]
    fn test_error_debug() {
        let error = NuvioError::serialization("Debug test");
        let debug_string = format!("{:?}", error);

        assert!(debug_string.contains("SerializationError"));
        assert!(debug_string.contains("Debug test"));
    }

    #[test]
    fn test_from_serde_json_error() {
        let json = "{invalid json}";
        let result: Result<serde_json::Value, _> = serde_json::from_str(json);

        match result {
            Err(serde_error) => {
                let nuvio_error: NuvioError = serde_error.into();
                match nuvio_error {
                    NuvioError::SerializationError { msg } => {
                        assert!(!msg.is_empty());
                    }
                    _ => panic!("Expected SerializationError from serde_json::Error conversion"),
                }
            }
            Ok(_) => panic!("Expected JSON parsing to fail"),
        }
    }

    #[test]
    fn test_error_variants_construct() {
        let serialization = NuvioError::SerializationError {
            msg: "test".to_string(),
        };
        let validation = NuvioError::ValidationError {
            msg: "test".to_string(),
        };
        let unknown = NuvioError::Unknown {
            msg: "test".to_string(),
        };

        assert!(matches!(
            serialization,
            NuvioError::SerializationError { .. }
        ));
        assert!(matches!(validation, NuvioError::ValidationError { .. }));
        assert!(matches!(unknown, NuvioError::Unknown { .. }));
    }

    #[test]
    fn test_helper_methods() {
        let error1 = NuvioError::serialization("test1");
        let error2 = NuvioError::validation("test2");
        let error3 = NuvioError::unknown("test3");
        let error4 = NuvioError::network_error("test4");
        let error5 = NuvioError::timeout("test5");
        let error6 = NuvioError::storage("test6");
        let error7 = NuvioError::security("test7");
        let error8 = NuvioError::addon_not_found("test8");
        let error9 = NuvioError::response_too_large("test9");

        assert!(matches!(error1, NuvioError::SerializationError { .. }));
        assert!(matches!(error2, NuvioError::ValidationError { .. }));
        assert!(matches!(error3, NuvioError::Unknown { .. }));
        assert!(matches!(error4, NuvioError::NetworkError { .. }));
        assert!(matches!(error5, NuvioError::TimeoutError { .. }));
        assert!(matches!(error6, NuvioError::StorageError { .. }));
        assert!(matches!(error7, NuvioError::SecurityError { .. }));
        assert!(matches!(error8, NuvioError::AddonNotFoundError { .. }));
        assert!(matches!(error9, NuvioError::ResponseTooLargeError { .. }));
    }

    #[test]
    fn test_string_conversion() {
        let error1 = NuvioError::serialization("string slice");
        let error2 = NuvioError::serialization(String::from("owned string"));

        match error1 {
            NuvioError::SerializationError { msg } => assert_eq!(msg, "string slice"),
            _ => panic!("Expected SerializationError"),
        }

        match error2 {
            NuvioError::SerializationError { msg } => assert_eq!(msg, "owned string"),
            _ => panic!("Expected SerializationError"),
        }
    }
}
