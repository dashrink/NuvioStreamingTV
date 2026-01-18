//! Error types for backup and restore operations

use thiserror::Error;
use uniffi;

/// Errors that can occur during backup and restore operations
#[derive(uniffi::Error, Debug, Error)]
pub enum BackupError {
    /// Error occurred during serialization or deserialization
    #[error("Serialization error: {msg}")]
    SerializationError {
        /// Detailed error message
        msg: String,
    },

    /// Error occurred during compression or decompression
    #[error("Compression error: {msg}")]
    CompressionError {
        /// Detailed error message
        msg: String,
    },

    /// Error occurred during file I/O operations
    #[error("I/O error: {msg}")]
    IoError {
        /// Detailed error message
        msg: String,
    },

    /// Error occurred during data validation
    #[error("Validation error: {msg}")]
    ValidationError {
        /// Detailed error message
        msg: String,
    },

    /// Backup file not found
    #[error("Backup not found: {msg}")]
    BackupNotFound {
        /// Detailed error message
        msg: String,
    },

    /// Unsupported backup version
    #[error("Unsupported backup version: {msg}")]
    UnsupportedVersion {
        /// Detailed error message
        msg: String,
    },

    /// Cloud backup operation failed
    #[error("Cloud backup error: {msg}")]
    CloudBackupError {
        /// Detailed error message
        msg: String,
    },

    /// Storage error
    #[error("Storage error: {msg}")]
    StorageError {
        /// Detailed error message
        msg: String,
    },

    /// Unknown error
    #[error("Unknown error: {msg}")]
    Unknown {
        /// Detailed error message
        msg: String,
    },
}

impl BackupError {
    /// Creates a new SerializationError
    pub fn serialization(msg: impl Into<String>) -> Self {
        Self::SerializationError { msg: msg.into() }
    }

    /// Creates a new CompressionError
    pub fn compression(msg: impl Into<String>) -> Self {
        Self::CompressionError { msg: msg.into() }
    }

    /// Creates a new IoError
    pub fn io(msg: impl Into<String>) -> Self {
        Self::IoError { msg: msg.into() }
    }

    /// Creates a new ValidationError
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::ValidationError { msg: msg.into() }
    }

    /// Creates a new BackupNotFound error
    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::BackupNotFound { msg: msg.into() }
    }

    /// Creates a new UnsupportedVersion error
    pub fn unsupported_version(msg: impl Into<String>) -> Self {
        Self::UnsupportedVersion { msg: msg.into() }
    }

    /// Creates a new CloudBackupError
    pub fn cloud(msg: impl Into<String>) -> Self {
        Self::CloudBackupError { msg: msg.into() }
    }

    /// Creates a new StorageError
    pub fn storage(msg: impl Into<String>) -> Self {
        Self::StorageError { msg: msg.into() }
    }

    /// Creates a new Unknown error
    pub fn unknown(msg: impl Into<String>) -> Self {
        Self::Unknown { msg: msg.into() }
    }
}

impl From<serde_json::Error> for BackupError {
    fn from(err: serde_json::Error) -> Self {
        Self::SerializationError {
            msg: err.to_string(),
        }
    }
}

impl From<std::io::Error> for BackupError {
    fn from(err: std::io::Error) -> Self {
        Self::IoError {
            msg: err.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_constructors() {
        let error = BackupError::serialization("test");
        assert!(matches!(error, BackupError::SerializationError { .. }));

        let error = BackupError::compression("test");
        assert!(matches!(error, BackupError::CompressionError { .. }));

        let error = BackupError::io("test");
        assert!(matches!(error, BackupError::IoError { .. }));

        let error = BackupError::validation("test");
        assert!(matches!(error, BackupError::ValidationError { .. }));

        let error = BackupError::not_found("test");
        assert!(matches!(error, BackupError::BackupNotFound { .. }));

        let error = BackupError::unsupported_version("test");
        assert!(matches!(error, BackupError::UnsupportedVersion { .. }));

        let error = BackupError::cloud("test");
        assert!(matches!(error, BackupError::CloudBackupError { .. }));

        let error = BackupError::storage("test");
        assert!(matches!(error, BackupError::StorageError { .. }));

        let error = BackupError::unknown("test");
        assert!(matches!(error, BackupError::Unknown { .. }));
    }

    #[test]
    fn test_error_display() {
        let error = BackupError::serialization("JSON parse error");
        assert_eq!(
            format!("{}", error),
            "Serialization error: JSON parse error"
        );
    }

    #[test]
    fn test_from_serde_json_error() {
        let json = "{invalid}";
        let result: Result<serde_json::Value, _> = serde_json::from_str(json);
        match result {
            Err(serde_error) => {
                let backup_error: BackupError = serde_error.into();
                assert!(matches!(backup_error, BackupError::SerializationError { .. }));
            }
            Ok(_) => panic!("Expected error"),
        }
    }
}
