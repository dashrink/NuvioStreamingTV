//! Error types for the Nuvio Core SDK.
//!
//! This module defines error types that can safely cross FFI boundaries using UniFFI.
//! All error variants use named fields (no tuple variants) as required by UniFFI.

use thiserror::Error;
use uniffi;

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

    /// Creates a new Unknown error with the given message
    pub fn unknown(msg: impl Into<String>) -> Self {
        Self::Unknown { msg: msg.into() }
    }
}

impl From<serde_json::Error> for NuvioError {
    fn from(err: serde_json::Error) -> Self {
        Self::SerializationError {
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
        // Test that the error messages display correctly using thiserror
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
        // Verify Debug trait works correctly
        let error = NuvioError::serialization("Debug test");
        let debug_string = format!("{:?}", error);

        assert!(debug_string.contains("SerializationError"));
        assert!(debug_string.contains("Debug test"));
    }

    #[test]
    fn test_from_serde_json_error() {
        // Test conversion from serde_json::Error
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
        // Test that all error variants can be constructed with named fields
        let serialization = NuvioError::SerializationError {
            msg: "test".to_string(),
        };
        let validation = NuvioError::ValidationError {
            msg: "test".to_string(),
        };
        let unknown = NuvioError::Unknown {
            msg: "test".to_string(),
        };

        // Verify they're the correct variant
        assert!(matches!(
            serialization,
            NuvioError::SerializationError { .. }
        ));
        assert!(matches!(validation, NuvioError::ValidationError { .. }));
        assert!(matches!(unknown, NuvioError::Unknown { .. }));
    }

    #[test]
    fn test_helper_methods() {
        // Test that helper methods create the correct variants
        let error1 = NuvioError::serialization("test1");
        let error2 = NuvioError::validation("test2");
        let error3 = NuvioError::unknown("test3");

        assert!(matches!(error1, NuvioError::SerializationError { .. }));
        assert!(matches!(error2, NuvioError::ValidationError { .. }));
        assert!(matches!(error3, NuvioError::Unknown { .. }));
    }

    #[test]
    fn test_string_conversion() {
        // Test that &str and String both work with helper methods
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
